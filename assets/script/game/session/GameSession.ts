import { GameBoard } from '../../domain/core/board';
import { CustomerSystem } from '../../domain/core/customer';
import { flavorManager } from '../../domain/core/flavor-manager';
import { advanceIngredientWithFlavor, isGiftBox } from '../../domain/core/ingredient';
import { MatchDetector } from '../../domain/core/match-detector';
import type { Cell, Customer, GridPosition, Ingredient } from '../../domain/types';
import type { LevelConfig } from '../../domain/types/level';
import { GameMsg } from '../../lbspace/GameMsgTypes';
import { MsgMgr } from '../../lbspace/MsgMgr';
import { CocosResourceLoader } from '../../infra/CocosResourceLoader';
import { LevelProgressStore } from '../../infra/LevelProgressStore';

export interface SessionIngredientSnapshot {
  id: string;
  tier: number;
  type: Ingredient['type'];
  flavor: Ingredient['flavor'];
  image: string;
  name: string;
}

export interface SessionCellSnapshot {
  position: GridPosition;
  ingredient: SessionIngredientSnapshot | null;
}

export interface SessionCustomerSnapshot {
  id: string;
  avatar: string;
  demand: Customer['demand'];
  patience: number;
  maxPatience: number;
  reward: number;
}

export type SessionPhase = 'playing' | 'gameOver' | 'levelComplete';
export type SessionToolMode = 'remove' | 'magnet' | null;

export interface SessionStateSnapshot {
  levelId: number | null;
  levelName: string;
  phase: SessionPhase;
  toolMode: SessionToolMode;
  toolSelection: GridPosition | null;
  gridSize: number;
  cells: SessionCellSnapshot[][];
  customers: SessionCustomerSnapshot[];
  stats: {
    served: number;
    missed: number;
    remaining: number;
    total: number;
  };
  result: {
    score: number;
    earnedStars: number;
    bestScore: number;
    bestStars: number;
    hasNextLevel: boolean;
    totalLevels: number;
  };
}

export interface SessionHomeSummary {
  currentLevel: number;
  currentLevelName: string;
  unlockedCount: number;
  totalLevels: number;
  totalStars: number;
  maxStars: number;
  totalCoins: number;
  totalGifts: number;
  energy: {
    current: number;
    max: number;
  };
}

export interface SessionLevelSummary {
  levelId: number;
  levelName: string;
  unlocked: boolean;
  isCurrent: boolean;
  stars: number;
  score: number;
}

export interface SessionCascadeStep {
  matchedIds: string[];
  beforeRemove: SessionStateSnapshot;
  afterMerge: SessionStateSnapshot;
  afterFill: SessionStateSnapshot;
}

export interface SessionSwapTimeline {
  from: GridPosition;
  to: GridPosition;
  beforeSwap: SessionStateSnapshot;
  afterSwap: SessionStateSnapshot;
  cascades: SessionCascadeStep[];
  finalSnapshot: SessionStateSnapshot;
}

export type SessionEvent =
  | { type: 'bootstrapped'; snapshot: SessionStateSnapshot }
  | { type: 'stateChanged'; snapshot: SessionStateSnapshot; reason: 'stateSync' }
  | { type: 'swapResolved'; snapshot: SessionStateSnapshot; timeline: SessionSwapTimeline }
  | { type: 'invalidSwap'; snapshot: SessionStateSnapshot; from: GridPosition; to: GridPosition }
  | { type: 'notice'; snapshot: SessionStateSnapshot; message: string; durationMs?: number };

type SessionListener = (event: SessionEvent) => void;

/**
 * Thin application layer for the Cocos host.
 * Existing pure game rules from the Vite prototype should be moved under `domain/`
 * and orchestrated here instead of being embedded in scene components.
 */
export class GameSession {
  private readonly board = new GameBoard();
  private readonly matchDetector = new MatchDetector();
  private readonly customerSystem = new CustomerSystem();
  private readonly resourceLoader = new CocosResourceLoader();
  private readonly levelProgressStore = new LevelProgressStore();
  private readonly listeners = new Set<SessionListener>();
  private levelConfig: LevelConfig | null = null;
  private requestedLevelId = this.levelProgressStore.getCurrentLevel();
  private totalLevelsCache: number | null = null;
  private readonly levelNameCache = new Map<number, string>();
  private phase: SessionPhase = 'playing';
  private toolMode: SessionToolMode = null;
  private toolSelection: GridPosition | null = null;

  async start(levelId = this.requestedLevelId): Promise<void> {
    this.requestedLevelId = Math.max(1, levelId);
    await this.bootstrap();
    this.board.fillBoard();
    this.phase = 'playing';
    this.toolMode = null;
    this.toolSelection = null;

    const matchCount = this.matchDetector.detectMatches(this.board.getAllCells()).matches.length;
    console.log('[GameSession] Bootstrapped', {
      levelId: this.levelConfig?.levelId,
      gridSize: this.board.getGridSize(),
      visibleCustomers: this.customerSystem.getCustomers().length,
      openingMatches: matchCount,
    });

    this.emit({
      type: 'bootstrapped',
      snapshot: this.getSnapshot(),
    });

    MsgMgr.emit(GameMsg.SessionStarted, this.levelConfig?.levelId ?? levelId);
  }

  async restart(): Promise<void> {
    await this.start(this.requestedLevelId);
  }

  async loadNextLevel(): Promise<boolean> {
    const currentLevelId = this.levelConfig?.levelId ?? this.requestedLevelId;
    const totalLevels = await this.getTotalLevels();
    if (currentLevelId >= totalLevels) {
      this.emitNotice('当前已经是最后一关', 2000);
      return false;
    }

    const nextLevelId = currentLevelId + 1;

    try {
      await this.start(nextLevelId);
      if ((this.levelConfig?.levelId ?? 0) !== nextLevelId) {
        await this.restart();
        return false;
      }
      this.levelProgressStore.setCurrentLevel(nextLevelId);
      return true;
    } catch (error) {
      console.warn('[GameSession] Failed to load next level', nextLevelId, error);
      await this.restart();
      return false;
    }
  }

  async loadLevel(levelId: number): Promise<boolean> {
    if (!this.levelProgressStore.isLevelUnlocked(levelId)) {
      this.emitNotice(`关卡 ${levelId} 尚未解锁`, 2000);
      return false;
    }

    try {
      await this.start(levelId);
      if ((this.levelConfig?.levelId ?? 0) !== levelId) {
        await this.restart();
        return false;
      }

      this.levelProgressStore.setCurrentLevel(levelId);
      this.emitNotice(`已切换到关卡 ${levelId}`, 2000);
      return true;
    } catch (error) {
      console.warn('[GameSession] Failed to load level', levelId, error);
      return false;
    }
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): SessionStateSnapshot {
    const levelId = this.levelConfig?.levelId ?? this.requestedLevelId;
    const score = this.calculateScore();
    const earnedStars = this.phase === 'levelComplete' ? this.calculateStars() : 0;
    const totalLevels = this.levelProgressStore.getMaxLevelId();

    return {
      levelId: this.levelConfig?.levelId ?? null,
      levelName: this.levelConfig?.levelName ?? 'Toast N Roll',
      phase: this.phase,
      toolMode: this.toolMode,
      toolSelection: this.toolSelection ? { ...this.toolSelection } : null,
      gridSize: this.board.getGridSize(),
      cells: this.board.getAllCells().map((row) => row.map((cell) => this.cloneCell(cell))),
      customers: this.customerSystem.getCustomers().map((customer) => this.cloneCustomer(customer)),
      stats: {
        served: this.customerSystem.getServedCustomersCount(),
        missed: this.customerSystem.getMissedCustomersCount(),
        remaining: this.customerSystem.getRemainingCustomersToServe(),
        total: this.customerSystem.getTotalCustomersCount(),
      },
      result: {
        score,
        earnedStars,
        bestScore: this.levelProgressStore.getLevelScore(levelId),
        bestStars: this.levelProgressStore.getLevelStars(levelId),
        hasNextLevel: levelId < totalLevels,
        totalLevels,
      },
    };
  }

  getUnlockedLevels(): number[] {
    return this.levelProgressStore.getUnlockedLevels();
  }

  getCurrentLevel(): number {
    return this.levelProgressStore.getCurrentLevel();
  }

  async getHomeSummary(): Promise<SessionHomeSummary> {
    const progress = this.levelProgressStore.getProgressSnapshot();
    const totalLevels = await this.getTotalLevels();
    const totalStars = Object.values(progress.levelStars).reduce((sum, value) => sum + value, 0);
    const currentLevel = progress.currentLevel;

    return {
      currentLevel,
      currentLevelName: await this.getLevelName(currentLevel),
      unlockedCount: progress.unlockedLevels.length,
      totalLevels,
      totalStars,
      maxStars: totalLevels * 3,
      totalCoins: this.levelProgressStore.getTotalCoins(),
      totalGifts: this.levelProgressStore.getTotalGifts(),
      energy: {
        current: 5,
        max: 5,
      },
    };
  }

  async getLevelSummaries(): Promise<SessionLevelSummary[]> {
    const progress = this.levelProgressStore.getProgressSnapshot();
    const totalLevels = await this.getTotalLevels();

    return Promise.all(
      Array.from({ length: totalLevels }, async (_, index) => {
        const levelId = index + 1;
        return {
          levelId,
          levelName: await this.getLevelName(levelId),
          unlocked: progress.unlockedLevels.includes(levelId),
          isCurrent: progress.currentLevel === levelId,
          stars: progress.levelStars[levelId] ?? 0,
          score: progress.levelScores[levelId] ?? 0,
        };
      }),
    );
  }

  trySwap(from: GridPosition, to: GridPosition): boolean {
    if (this.phase !== 'playing') {
      return false;
    }

    if (!this.isAdjacent(from, to)) {
      this.emitNotice('只能交换相邻食材', 2000);
      this.emit({
        type: 'invalidSwap',
        snapshot: this.getSnapshot(),
        from,
        to,
      });
      return false;
    }

    const beforeSwap = this.getSnapshot();
    this.matchDetector.setLastSwap(from, to);
    this.board.swapIngredients(from, to);

    const opening = this.matchDetector.detectMatches(this.board.getAllCells());
    if (opening.matches.length === 0) {
      this.board.swapIngredients(from, to);
      this.matchDetector.clearLastSwap();
      this.emitNotice('这样交换不会形成三连', 2000);
      this.emit({
        type: 'invalidSwap',
        snapshot: this.getSnapshot(),
        from,
        to,
      });
      return false;
    }

    const afterSwap = this.getSnapshot();
    const cascades = this.resolveMatchesWithTimeline();
    this.customerSystem.consumeTurn();
    this.matchDetector.clearLastSwap();
    this.toolMode = null;
    this.toolSelection = null;
    this.checkGameState();
    const finalSnapshot = this.getSnapshot();
    this.emit({
      type: 'swapResolved',
      snapshot: finalSnapshot,
      timeline: {
        from,
        to,
        beforeSwap,
        afterSwap,
        cascades,
        finalSnapshot,
      },
    });
    return true;
  }

  activateRemoveTool(): boolean {
    if (this.phase !== 'playing') {
      return false;
    }

    const wasActive = this.toolMode === 'remove';
    this.toolMode = this.toolMode === 'remove' ? null : 'remove';
    this.toolSelection = null;
    this.syncState();
    this.emitNotice(this.toolMode === 'remove' ? '去除模式：点击一个食材立即移除' : '已取消去除模式', 2000);

    if (this.toolMode === 'remove' && !wasActive) {
      MsgMgr.emit(GameMsg.ToolActivated, 'remove');
    }
    return true;
  }

  activateMagnetTool(): boolean {
    if (this.phase !== 'playing') {
      return false;
    }

    const wasActive = this.toolMode === 'magnet';
    this.toolMode = this.toolMode === 'magnet' ? null : 'magnet';
    this.toolSelection = null;
    this.syncState();
    this.emitNotice(this.toolMode === 'magnet' ? '磁力模式：先选一个食材，再选同阶食材' : '已取消磁力模式', 2000);

    if (this.toolMode === 'magnet' && !wasActive) {
      MsgMgr.emit(GameMsg.ToolActivated, 'magnet');
    }
    return true;
  }

  useShuffle(): boolean {
    if (this.phase !== 'playing' && this.phase !== 'gameOver') {
      return false;
    }

    this.toolMode = null;
    this.toolSelection = null;
    const shuffled = this.reshuffleBoardUntilPlayable();
    if (!shuffled) {
      this.emitNotice('当前无法生成新的可玩盘面', 2000);
      return false;
    }

    this.phase = 'playing';
    this.checkGameState();
    this.syncState();
    this.emitNotice('已重新洗牌', 2000);

    MsgMgr.emit(GameMsg.ToolUsed, 'shuffle');
    return true;
  }

  useRemoveAt(position: GridPosition): boolean {
    if (this.phase !== 'playing' || this.toolMode !== 'remove') {
      return false;
    }

    const cell = this.board.getCell(position.row, position.col);
    if (!cell?.ingredient) {
      this.emitNotice('这里没有可移除的食材', 2000);
      return false;
    }

    this.board.removeIngredient(position.row, position.col);
    this.board.fillEmptyCells();
    this.resolveMatchesWithTimeline();
    this.customerSystem.consumeTurn();
    this.toolMode = null;
    this.toolSelection = null;
    this.checkGameState();
    this.syncState();
    this.emitNotice('已去除一个食材', 2000);

    MsgMgr.emit(GameMsg.ToolUsed, 'remove');
    return true;
  }

  useMagnetAt(position: GridPosition): boolean {
    if (this.phase !== 'playing' || this.toolMode !== 'magnet') {
      return false;
    }

    const cell = this.board.getCell(position.row, position.col);
    const ingredient = cell?.ingredient;
    if (!ingredient) {
      this.emitNotice('请点击一个有效食材', 2000);
      return false;
    }

    if (!this.toolSelection) {
      this.toolSelection = { ...position };
      this.syncState();
      this.emitNotice('已选择第一个食材，请再选一个同阶食材', 2000);
      return true;
    }

    if (this.toolSelection.row === position.row && this.toolSelection.col === position.col) {
      this.toolSelection = null;
      this.syncState();
      this.emitNotice('已取消当前磁力选择', 2000);
      return true;
    }

    const sourcePosition = { ...this.toolSelection };
    const sourceCell = this.board.getCell(sourcePosition.row, sourcePosition.col);
    const sourceIngredient = sourceCell?.ingredient;
    if (!sourceIngredient || sourceIngredient.tier !== ingredient.tier) {
      this.toolSelection = null;
      this.syncState();
      this.emitNotice('磁力合成要求两个同阶食材', 2000);
      return false;
    }

    const advancedIngredient = advanceIngredientWithFlavor(ingredient, ingredient.flavor);
    if (!advancedIngredient) {
      this.toolSelection = null;
      this.syncState();
      this.emitNotice('该食材已经无法继续升级', 2000);
      return false;
    }

    this.board.removeIngredient(sourcePosition.row, sourcePosition.col);
    this.board.removeIngredient(position.row, position.col);
    this.board.setIngredient(position.row, position.col, advancedIngredient);
    this.tryServeGift(advancedIngredient);
    this.board.fillEmptyCells();
    this.resolveMatchesWithTimeline();
    this.customerSystem.consumeTurn();
    this.toolMode = null;
    this.toolSelection = null;
    this.checkGameState();
    this.syncState();
    this.emitNotice('磁力合成完成', 2000);

    MsgMgr.emit(GameMsg.ToolUsed, 'magnet');
    return true;
  }

  cancelToolMode(): void {
    if (!this.toolMode) {
      return;
    }

    this.toolMode = null;
    this.toolSelection = null;
    this.syncState();
    this.emitNotice('已取消当前道具模式', 2000);
  }

  syncState(): void {
    this.emit({
      type: 'stateChanged',
      snapshot: this.getSnapshot(),
      reason: 'stateSync',
    });
  }

  private emit(event: SessionEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private emitNotice(message: string, durationMs?: number): void {
    this.emit({
      type: 'notice',
      snapshot: this.getSnapshot(),
      message,
      durationMs,
    });
  }

  private cloneCell(cell: Cell): SessionCellSnapshot {
    return {
      position: { ...cell.position },
      ingredient: cell.ingredient ? this.cloneIngredient(cell.ingredient) : null,
    };
  }

  private cloneIngredient(ingredient: Ingredient): SessionIngredientSnapshot {
    return {
      id: ingredient.id,
      tier: ingredient.tier,
      type: ingredient.type,
      flavor: ingredient.flavor,
      image: ingredient.image,
      name: ingredient.name,
    };
  }

  private async getTotalLevels(): Promise<number> {
    if (this.totalLevelsCache !== null) {
      return this.totalLevelsCache;
    }

    try {
      const config = await this.resourceLoader.loadGameConfig();
      this.totalLevelsCache = Math.max(1, Math.floor(config.totalLevels));
      this.levelProgressStore.configureMaxLevel(this.totalLevelsCache);
    } catch (error) {
      console.warn('[GameSession] Failed to load game config, using fallback level count.', error);
      this.totalLevelsCache = 50;
      this.levelProgressStore.configureMaxLevel(this.totalLevelsCache);
    }

    return this.totalLevelsCache;
  }

  private async getLevelName(levelId: number): Promise<string> {
    const cachedName = this.levelNameCache.get(levelId);
    if (cachedName) {
      return cachedName;
    }

    try {
      const level = await this.resourceLoader.loadLevel(levelId);
      const levelName = level.levelName?.trim() || `关卡 ${levelId}`;
      this.levelNameCache.set(levelId, levelName);
      return levelName;
    } catch (error) {
      console.warn('[GameSession] Failed to load level metadata, using fallback name.', levelId, error);
      const fallbackName = `关卡 ${levelId}`;
      this.levelNameCache.set(levelId, fallbackName);
      return fallbackName;
    }
  }

  private cloneCustomer(customer: Customer): SessionCustomerSnapshot {
    return {
      id: customer.id,
      avatar: customer.avatar,
      demand: { ...customer.demand },
      patience: customer.patience,
      maxPatience: customer.maxPatience,
      reward: customer.reward,
    };
  }

  private async bootstrap(): Promise<void> {
    try {
      const [flavorsData, levelConfig, gameConfig] = await Promise.all([
        this.resourceLoader.loadFlavors(),
        this.resourceLoader.loadLevel(this.requestedLevelId),
        this.resourceLoader.loadGameConfig(),
      ]);

      this.totalLevelsCache = Math.max(1, Math.floor(gameConfig.totalLevels));
      this.levelProgressStore.configureMaxLevel(this.totalLevelsCache);
      flavorManager.loadFromData(flavorsData);
      this.levelConfig = levelConfig;
      this.applyLevelConfig(levelConfig);
    } catch (error) {
      console.error('[GameSession] Failed to bootstrap content, using fallback defaults.', error);
      this.totalLevelsCache = 50;
      this.levelProgressStore.configureMaxLevel(this.totalLevelsCache);
      flavorManager.applyFallbackConfigs();
      this.applyLevelConfig(this.createFallbackLevelConfig());
    }
  }

  private applyLevelConfig(config: LevelConfig): void {
    this.board.setGridSize(config.gridSize?.rows || 7);
    this.board.setDifficultyScaling(config.difficultyScaling || null);
    this.board.setInitialSpawnConfig(config.ingredientSpawn?.initial || null);
    this.board.setRefillSpawnConfig(config.ingredientSpawn?.refill || null);
    this.board.setPresetBoard(config.presetBoard || null);

    const flavorDistribution = config.flavors?.distribution
      || config.ingredientSpawn?.refill?.flavorDistribution
      || { original: 100 };
    this.board.setFlavorDistribution(flavorDistribution);

    this.customerSystem.configureLevel({
      totalCount: config.customers.totalCount,
      basePatience: config.customers.basePatience,
      queuePatienceOffset: config.customers.queuePatienceOffset,
      entryGraceTurns: config.customers.entryGraceTurns,
      demandCountRange: config.customers.demandCountRange,
      allowedFlavors: config.customers.allowedFlavors,
    });
  }

  private resolveMatchesWithTimeline(): SessionCascadeStep[] {
    const cascades: SessionCascadeStep[] = [];

    while (true) {
      const result = this.matchDetector.detectMatches(this.board.getAllCells());
      if (result.matches.length === 0) {
        break;
      }

      const matchedIds = new Set<string>();
      const mergeResults = new Map<string, { position: GridPosition; ingredient: Ingredient }>();
      const beforeRemove = this.getSnapshot();

      for (const group of result.groups) {
        for (const match of group.matches) {
          const ingredient = this.board.getCell(match.row, match.col)?.ingredient;
          if (ingredient) {
            matchedIds.add(ingredient.id);
          }
          this.board.removeIngredient(match.row, match.col);
        }

        if (group.mergePosition && group.advancedIngredient) {
          mergeResults.set(
            this.toKey(group.mergePosition),
            { position: group.mergePosition, ingredient: group.advancedIngredient },
          );
        }
      }

      for (const merge of mergeResults.values()) {
        this.board.setIngredient(merge.position.row, merge.position.col, merge.ingredient);
        this.tryServeGift(merge.ingredient);
      }

      const afterMerge = this.getSnapshot();
      this.board.fillEmptyCells();
      const afterFill = this.getSnapshot();
      cascades.push({
        matchedIds: Array.from(matchedIds),
        beforeRemove,
        afterMerge,
        afterFill,
      });
    }

    return cascades;
  }

  private tryServeGift(ingredient: Ingredient): void {
    if (!isGiftBox(ingredient)) {
      return;
    }

    const customer = this.customerSystem.getCustomerForFlavor(ingredient.flavor);
    if (!customer) {
      return;
    }

    this.customerSystem.serveCustomer(customer.id);
  }

  private isAdjacent(from: GridPosition, to: GridPosition): boolean {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  private toKey(position: GridPosition): string {
    return `${position.row},${position.col}`;
  }

  private checkGameState(): void {
    if (this.customerSystem.getRemainingCustomersToServe() <= 0) {
      if (this.phase !== 'levelComplete') {
        const completedLevelId = this.levelConfig?.levelId ?? this.requestedLevelId;
        const stars = this.calculateStars();
        const score = this.calculateScore();
        this.levelProgressStore.completeLevel(completedLevelId, stars, score);
        this.levelProgressStore.addRunRewards(score, this.customerSystem.getServedCustomersCount());

        MsgMgr.emit(GameMsg.SessionEnded, completedLevelId, 'complete', stars, score);
      }
      this.phase = 'levelComplete';
      return;
    }

    const possibleMoves = this.matchDetector.findPossibleMoves(this.board.getAllCells());
    if (possibleMoves.length === 0 && this.board.isFull()) {
      if (this.phase !== 'gameOver') {
        const failedLevelId = this.levelConfig?.levelId ?? this.requestedLevelId;
        const score = this.calculateScore();
        MsgMgr.emit(GameMsg.SessionEnded, failedLevelId, 'gameOver', 0, score);
      }
      this.phase = 'gameOver';
      return;
    }

    this.phase = 'playing';
  }

  private calculateStars(): number {
    const missed = this.customerSystem.getMissedCustomersCount();
    if (missed <= 0) {
      return 3;
    }
    if (missed === 1) {
      return 2;
    }
    return 1;
  }

  private calculateScore(): number {
    const served = this.customerSystem.getServedCustomersCount();
    const missed = this.customerSystem.getMissedCustomersCount();
    return Math.max(0, served * 100 - missed * 20);
  }

  private reshuffleBoardUntilPlayable(maxAttempts = 60): boolean {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.board.shuffle();

      const hasMatches = this.matchDetector.detectMatches(this.board.getAllCells()).matches.length > 0;
      if (hasMatches) {
        continue;
      }

      const possibleMoves = this.matchDetector.findPossibleMoves(this.board.getAllCells());
      if (possibleMoves.length > 0) {
        return true;
      }
    }

    console.warn('[GameSession] Unable to reshuffle into a playable board');
    return false;
  }

  private createFallbackLevelConfig(): LevelConfig {
    return {
      levelId: 1,
      levelName: 'Fallback Level',
      description: 'Generated fallback config for Cocos bootstrap.',
      unlockCondition: { prevLevel: 0 },
      difficulty: 'tutorial',
      gridSize: { rows: 7, cols: 7 },
      customers: {
        totalCount: 3,
        basePatience: 30,
        queuePatienceOffset: 20,
        entryGraceTurns: 1,
        demandCountRange: [1, 2],
        allowedFlavors: ['original', 'matcha', 'strawberry'],
      },
      starRatings: {
        oneStar: 500,
        twoStars: 1000,
        threeStars: 1500,
      },
      tutorial: {
        enabled: true,
        steps: ['welcome'],
      },
      ingredientSpawn: {
        initial: {
          tierWeights: [65, 35, 0, 0],
          flavorDistribution: { original: 50, matcha: 30, strawberry: 20 },
        },
        refill: {
          tierWeights: [55, 30, 10, 5],
          flavorDistribution: { original: 50, matcha: 30, strawberry: 20 },
        },
      },
      flavors: {
        available: ['original', 'matcha', 'strawberry'],
        distribution: { original: 50, matcha: 30, strawberry: 20 },
      },
    };
  }
}
