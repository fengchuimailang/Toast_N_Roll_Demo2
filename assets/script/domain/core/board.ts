/**
 * 游戏板管理
 * 支持动态网格大小的格子矩阵管理
 */

import type { Cell, GridPosition, Ingredient, FlavorType, IngredientType } from '../types';
import type { FlavorDistribution, IngredientSpawnConfig, DifficultyScaling, PresetIngredientConfig } from '../types/level';
import { createIngredient } from './ingredient';
// 注意：Board类使用自己的isValidPosition方法，支持动态网格大小

// 食材类型映射（按 tier）
const TIER_TO_TYPE: IngredientType[] = ['wheat', 'flour', 'dough', 'baking', 'toast', 'gift'];

export class GameBoard {
  private grid: Cell[][] = [];
  private flavorDistribution: FlavorDistribution | null = null;
  private initialSpawnConfig: IngredientSpawnConfig | null = null;
  private refillSpawnConfig: IngredientSpawnConfig | null = null;
  private gridSize: number = 7;  // 默认7x7
  private difficultyScaling: DifficultyScaling | null = null;
  private presetBoard: PresetIngredientConfig[][] | null = null;

  constructor() {
    this.initializeGrid();
  }

  /**
   * 设置网格大小
   */
  setGridSize(size: number): void {
    this.gridSize = size;
    this.initializeGrid();
  }

  /**
   * 获取当前网格大小
   */
  getGridSize(): number {
    return this.gridSize;
  }

  /**
   * 设置难度缩放配置
   */
  setDifficultyScaling(scaling: DifficultyScaling | null): void {
    this.difficultyScaling = scaling;
  }

  /**
   * 设置口味分布配置
   */
  setFlavorDistribution(distribution: FlavorDistribution | null): void {
    this.flavorDistribution = distribution;
  }

  /**
   * 设置初始食材生成配置
   */
  setInitialSpawnConfig(config: IngredientSpawnConfig | null): void {
    this.initialSpawnConfig = config;
  }

  /**
   * 设置补充食材生成配置
   */
  setRefillSpawnConfig(config: IngredientSpawnConfig | null): void {
    this.refillSpawnConfig = config;
  }

  /**
   * 设置固定初始棋盘配置
   */
  setPresetBoard(presetBoard: PresetIngredientConfig[][] | null): void {
    this.presetBoard = presetBoard;
  }

  /**
   * 检查位置是否有效（使用动态网格大小）
   */
  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
  }

  /**
   * 根据 tierWeights 随机选择食材类型
   * @param useRefillConfig 是否使用补充配置（refill），否则使用初始配置（initial）
   */
  private getRandomIngredientType(useRefillConfig: boolean = false): IngredientType {
    // 选择使用哪个配置
    const config = useRefillConfig ? this.refillSpawnConfig : this.initialSpawnConfig;

    // 如果有配置，使用配置的权重
    if (config?.tierWeights) {
      const weights = config.tierWeights;
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      if (totalWeight > 0) {
        let random = Math.random() * totalWeight;
        for (let i = 0; i < weights.length && i < TIER_TO_TYPE.length; i++) {
          random -= weights[i];
          if (random <= 0) {
            return TIER_TO_TYPE[i];
          }
        }
        // 如果权重没有选中，返回最后一个有权重的类型
        for (let i = weights.length - 1; i >= 0; i--) {
          if (weights[i] > 0) {
            return TIER_TO_TYPE[i];
          }
        }
      }
    }

    // 默认返回小麦
    return 'wheat';
  }

  /**
   * 根据口味分布随机选择一个口味
   */
  private getRandomFlavorByDistribution(useRefillConfig: boolean = false): FlavorType {
    const configDistribution = useRefillConfig
      ? this.refillSpawnConfig?.flavorDistribution
      : this.initialSpawnConfig?.flavorDistribution;
    const distribution = configDistribution ?? this.flavorDistribution;

    if (!distribution) {
      return 'original';
    }

    const flavors = Object.keys(distribution);
    const weights = Object.values(distribution);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) {
      return 'original';
    }

    let random = Math.random() * totalWeight;
    for (let i = 0; i < flavors.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return flavors[i] as FlavorType;
      }
    }

    return flavors[flavors.length - 1] as FlavorType;
  }

  /**
   * 初始化空格子矩阵
   */
  private initializeGrid(): void {
    this.grid = [];
    for (let row = 0; row < this.gridSize; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < this.gridSize; col++) {
        rowCells.push({
          position: { row, col },
          ingredient: null,
          isSelected: false,
          isMatched: false,
        });
      }
      this.grid.push(rowCells);
    }
  }

  /**
   * 填充游戏板（初始生成食材）
   * 确保开局没有直接合成（三连）
   */
  fillBoard(): void {
    if (this.presetBoard) {
      if (this.applyPresetBoard()) {
        return;
      }

      console.warn('[Board] 固定棋盘配置无效，回退到随机生成');
    }

    let attempts = 0;
    const maxAttempts = 100;

    do {
      // 清空现有食材
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].ingredient = null;
        }
      }

      // 填充食材
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.grid[row][col].ingredient = this.createSafeIngredient(row, col);
        }
      }

      attempts++;
    } while (this.hasAnyMatches() && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.warn('[Board] 警告：无法生成无匹配的开局，使用最后一次尝试');
    }
  }

  /**
   * 应用固定初始棋盘
   */
  private applyPresetBoard(): boolean {
    if (!this.presetBoard || this.presetBoard.length !== this.gridSize) {
      return false;
    }

    for (const row of this.presetBoard) {
      if (row.length !== this.gridSize) {
        return false;
      }
    }

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const presetIngredient = this.presetBoard[row][col];
        this.grid[row][col].ingredient = createIngredient(presetIngredient.type, presetIngredient.flavor);
      }
    }

    return true;
  }

  /**
   * 检查当前棋盘上是否有任何匹配
   */
  private hasAnyMatches(): boolean {
    // 检查水平方向
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize - 2; col++) {
        const ingredient = this.grid[row][col].ingredient;
        if (ingredient &&
          this.grid[row][col + 1].ingredient?.type === ingredient.type &&
          this.grid[row][col + 2].ingredient?.type === ingredient.type) {
          return true;
        }
      }
    }

    // 检查垂直方向
    for (let row = 0; row < this.gridSize - 2; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const ingredient = this.grid[row][col].ingredient;
        if (ingredient &&
          this.grid[row + 1][col].ingredient?.type === ingredient.type &&
          this.grid[row + 2][col].ingredient?.type === ingredient.type) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 创建不会形成三连的食材
   * @param useRefillConfig 是否使用补充配置（refill），否则使用初始配置（initial）
   */
  private createSafeIngredient(row: number, col: number, useRefillConfig: boolean = false): Ingredient {
    const flavor = this.getRandomFlavorByDistribution(useRefillConfig);
    const type = this.getRandomIngredientType(useRefillConfig);
    let ingredient = createIngredient(type, flavor);
    let attempts = 0;

    // 根据难度配置调整最大尝试次数
    const maxAttempts = this.difficultyScaling ?
      50 + this.difficultyScaling.safeSpawnRange * 10 : 50;

    // 获取安全生成范围
    const safeRange = this.difficultyScaling?.safeSpawnRange ?? 2;

    // 检查是否会形成水平或垂直三连，以及周围是否有相同类型
    while (attempts < maxAttempts && (
      this.wouldCreateMatch(row, col, ingredient) ||
      this.hasNearbySameType(row, col, ingredient.type, safeRange)
    )) {
      const newFlavor = this.getRandomFlavorByDistribution(useRefillConfig);
      const newType = this.getRandomIngredientType(useRefillConfig);
      ingredient = createIngredient(newType, newFlavor);
      attempts++;
    }

    return ingredient;
  }

  /**
   * 检查指定位置周围是否有相同类型的食材
   * @param range 检查范围（曼哈顿距离）
   */
  private hasNearbySameType(row: number, col: number, type: string, range: number): boolean {
    for (let r = Math.max(0, row - range); r <= Math.min(this.gridSize - 1, row + range); r++) {
      for (let c = Math.max(0, col - range); c <= Math.min(this.gridSize - 1, col + range); c++) {
        if (r === row && c === col) continue; // 跳过自身

        const distance = Math.abs(r - row) + Math.abs(c - col);
        if (distance <= range && this.grid[r][c].ingredient?.type === type) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查在指定位置放置食材是否会形成三连
   */
  private wouldCreateMatch(row: number, col: number, ingredient: Ingredient): boolean {
    // 临时放置食材
    const originalIngredient = this.grid[row][col].ingredient;
    this.grid[row][col].ingredient = ingredient;

    // 检查水平方向
    let horizontalCount = 1;
    // 向左检查
    for (let c = col - 1; c >= 0 && this.grid[row][c].ingredient?.type === ingredient.type; c--) {
      horizontalCount++;
    }
    // 向右检查
    for (let c = col + 1; c < this.gridSize && this.grid[row][c].ingredient?.type === ingredient.type; c++) {
      horizontalCount++;
    }

    // 检查垂直方向
    let verticalCount = 1;
    // 向上检查
    for (let r = row - 1; r >= 0 && this.grid[r][col].ingredient?.type === ingredient.type; r--) {
      verticalCount++;
    }
    // 向下检查
    for (let r = row + 1; r < this.gridSize && this.grid[r][col].ingredient?.type === ingredient.type; r++) {
      verticalCount++;
    }

    // 恢复原状
    this.grid[row][col].ingredient = originalIngredient;

    // 如果水平或垂直方向达到3个或以上，会形成匹配
    return horizontalCount >= 3 || verticalCount >= 3;
  }

  /**
   * 获取格子
   */
  getCell(row: number, col: number): Cell | null {
    if (!this.isValidPosition(row, col)) return null;
    return this.grid[row][col];
  }

  /**
   * 获取所有格子
   */
  getAllCells(): Cell[][] {
    return this.grid;
  }

  /**
   * 获取格子中的食材
   */
  getIngredient(row: number, col: number): Ingredient | null {
    const cell = this.getCell(row, col);
    return cell?.ingredient ?? null;
  }

  /**
   * 设置格子中的食材
   */
  setIngredient(row: number, col: number, ingredient: Ingredient | null): void {
    if (!this.isValidPosition(row, col)) return;
    this.grid[row][col].ingredient = ingredient;
  }

  /**
   * 交换两个格子的食材
   */
  swapIngredients(pos1: GridPosition, pos2: GridPosition): boolean {
    if (!this.isValidPosition(pos1.row, pos1.col) || !this.isValidPosition(pos2.row, pos2.col)) {
      return false;
    }

    const temp = this.grid[pos1.row][pos1.col].ingredient;
    this.grid[pos1.row][pos1.col].ingredient = this.grid[pos2.row][pos2.col].ingredient;
    this.grid[pos2.row][pos2.col].ingredient = temp;

    return true;
  }

  /**
   * 设置格子选中状态
   */
  setSelected(row: number, col: number, selected: boolean): void {
    if (!this.isValidPosition(row, col)) return;
    this.grid[row][col].isSelected = selected;
  }

  /**
   * 清除所有选中状态
   */
  clearAllSelected(): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.grid[row][col].isSelected = false;
      }
    }
  }

  /**
   * 获取选中的格子
   */
  getSelectedCell(): Cell | null {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col].isSelected) {
          return this.grid[row][col];
        }
      }
    }
    return null;
  }

  /**
   * 移除格子中的食材
   */
  removeIngredient(row: number, col: number): Ingredient | null {
    if (!this.isValidPosition(row, col)) return null;
    const ingredient = this.grid[row][col].ingredient;
    this.grid[row][col].ingredient = null;
    return ingredient;
  }

  /**
   * 执行补位（食材上浮和生成新食材）
   */
  fillEmptyCells(): void {
    for (let col = 0; col < this.gridSize; col++) {
      this.fillColumn(col);
    }
  }

  /**
   * 补位单列 - 上浮补位
   * 核心逻辑：
   * 1. 从顶部(row=0)向下扫描空格
   * 2. 空位由下方最近的食材向上浮动填补
   * 3. 如果下方没有食材，从底部(row=gridSize下方)生成新食材向上浮动
   */
  private fillColumn(col: number): void {
    // 先收集所有需要生成新食材的位置
    const emptyPositions: number[] = [];

    // 从上往下检查空格
    for (let row = 0; row < this.gridSize; row++) {
      if (this.grid[row][col].ingredient === null) {
        // 查找下方最近的食材
        let found = false;
        for (let belowRow = row + 1; belowRow < this.gridSize; belowRow++) {
          if (this.grid[belowRow][col].ingredient !== null) {
            // 上浮：下方食材移动到当前位置
            this.grid[row][col].ingredient = this.grid[belowRow][col].ingredient;
            this.grid[belowRow][col].ingredient = null;
            found = true;
            break;
          }
        }

        // 如果下方没有食材，记录需要生成新食材的位置
        if (!found) {
          emptyPositions.push(row);
        }
      }
    }

    if (emptyPositions.length === 0) return;

    // 预生成整列的食材（从下到上，因为是从底部生成向上浮动）
    const columnIngredients = this.generateSafeColumn(col, emptyPositions);

    // 放置生成的食材（从底部向上填充）
    for (let i = 0; i < emptyPositions.length; i++) {
      this.grid[emptyPositions[i]][col].ingredient = columnIngredients[i];
    }
  }

  /**
   * 生成安全的整列食材
   * 策略：预生成整列，检查垂直三连，如果不安全则重试
   * 最多重试30次，如果还是不行则使用强制隔离策略
   */
  private generateSafeColumn(col: number, positions: number[]): Ingredient[] {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      // 预生成整列
      const ingredients: Ingredient[] = [];
      for (const _ of positions) {
        ingredients.push(this.createRandomIngredient(true));
      }

      // 检查整列是否安全（不形成垂直三连）
      if (this.isColumnSafe(col, positions, ingredients)) {
        return ingredients;
      }

      retries++;
    }

    // 重试次数用完，使用强制隔离策略
    console.warn(`[Board] 列${col}生成安全食材失败${maxRetries}次，使用强制隔离策略`);
    return this.generateForcedSafeColumn(col, positions);
  }

  /**
   * 检查整列是否安全（不形成垂直三连）
   */
  private isColumnSafe(col: number, positions: number[], ingredients: Ingredient[]): boolean {
    // 构建完整的列状态（已有食材 + 新生成食材）
    const columnTypes: (string | null)[] = [];
    for (let row = 0; row < this.gridSize; row++) {
      const posIndex = positions.indexOf(row);
      if (posIndex >= 0) {
        // 这是待生成的位置
        columnTypes.push(ingredients[posIndex].type);
      } else {
        // 这是已有食材的位置
        columnTypes.push(this.grid[row][col].ingredient?.type ?? null);
      }
    }

    // 检查垂直三连
    for (let i = 0; i < columnTypes.length - 2; i++) {
      const type1 = columnTypes[i];
      const type2 = columnTypes[i + 1];
      const type3 = columnTypes[i + 2];

      if (type1 && type1 === type2 && type2 === type3) {
        return false; // 发现三连
      }
    }

    return true;
  }

  /**
   * 强制隔离策略：确保相邻3个位置类型不同
   * 用于预生成失败时的兜底方案
   * 上浮补位：新食材从底部向上填充，所以检查下方已有食材
   */
  private generateForcedSafeColumn(col: number, positions: number[]): Ingredient[] {
    const ingredients: Ingredient[] = new Array(positions.length);

    // 兜底时从底部往上生成，这样才能读取到“下方最近的两个类型”
    for (let i = positions.length - 1; i >= 0; i--) {
      const row = positions[i];
      const belowTypes: string[] = [];

      const generatedBelow = ingredients[i + 1]?.type;
      if (generatedBelow) {
        belowTypes.push(generatedBelow);
      } else {
        const existingBelow = this.grid[row + 1]?.[col]?.ingredient?.type;
        if (existingBelow) {
          belowTypes.push(existingBelow);
        }
      }

      const generatedBelow2 = ingredients[i + 2]?.type;
      if (generatedBelow2) {
        belowTypes.push(generatedBelow2);
      } else {
        const existingBelow2 = this.grid[row + 2]?.[col]?.ingredient?.type;
        if (existingBelow2) {
          belowTypes.push(existingBelow2);
        }
      }

      ingredients[i] = this.createIngredientExcludingTypes(belowTypes, true);
    }

    return ingredients;
  }

  /**
   * 创建随机食材，排除指定类型
   */
  private createIngredientExcludingTypes(excludeTypes: string[], useRefillConfig: boolean): Ingredient {
    // 获取所有可用类型
    const allTypes: IngredientType[] = ['wheat', 'flour', 'dough', 'baking', 'toast', 'gift'];
    const availableTypes = allTypes.filter(t => !excludeTypes.includes(t));

    // 如果没有可用类型（理论上不会发生，但做兜底）
    if (availableTypes.length === 0) {
      console.warn('[Board] 没有可用类型，随机选择');
      return this.createRandomIngredient(useRefillConfig);
    }

    // 随机选择一个可用类型
    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const flavor = this.getRandomFlavorByDistribution(useRefillConfig);

    return createIngredient(randomType, flavor);
  }

  /**
   * 创建完全随机的食材
   */
  private createRandomIngredient(useRefillConfig: boolean): Ingredient {
    const flavor = this.getRandomFlavorByDistribution(useRefillConfig);
    const type = this.getRandomIngredientType(useRefillConfig);
    return createIngredient(type, flavor);
  }

  /**
   * 检查是否有空格
   */
  hasEmptyCells(): boolean {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col].ingredient === null) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查格子是否满
   */
  isFull(): boolean {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col].ingredient === null) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 洗牌（重新排列所有食材）
   */
  shuffle(): void {
    // 收集所有食材
    const ingredients: Ingredient[] = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col].ingredient) {
          ingredients.push(this.grid[row][col].ingredient!);
        }
      }
    }

    // Fisher-Yates 洗牌
    for (let i = ingredients.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ingredients[i], ingredients[j]] = [ingredients[j], ingredients[i]];
    }

    // 重新放置
    let index = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (index < ingredients.length) {
          this.grid[row][col].ingredient = ingredients[index++];
        } else {
          const flavor = this.getRandomFlavorByDistribution();
          const type = this.getRandomIngredientType();
          this.grid[row][col].ingredient = createIngredient(type, flavor);
        }
      }
    }
  }

  /**
   * 重置游戏板
   */
  reset(): void {
    this.initializeGrid();
    this.fillBoard();
  }
}
