import {
  _decorator,
  Color,
  Component,
  EventTouch,
  Graphics,
  Layers,
  Node,
  Prefab,
  instantiate,
  Tween,
  tween,
  UITransform,
  Vec2,
  Vec3,
} from 'cc';

import type { GridPosition } from '../domain/types';
import { COLORS } from '../domain/types';
import {
  GameSession,
  type SessionCellSnapshot,
  type SessionEvent,
  type SessionStateSnapshot,
  type SessionSwapTimeline,
} from '../game/session/GameSession';
import { PrefabLoader } from '../lbspace/PrefabLoader';
import { SpriteFrameLoader } from '../infra/SpriteFrameLoader';
import { CellView } from './CellView';
import { trayManager, type TrayInfo } from '../domain/core/tray-manager';
import { flavorManager } from '../domain/core/flavor-manager';

const { ccclass } = _decorator;

const BOARD_WIDTH = 660;
const BOARD_HEIGHT = 676;
const PADDING = 40;
const DRAG_THRESHOLD_FACTOR = 0.35;

function hexToColor(hex: string): Color {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return new Color(
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
    255,
  );
}

function imagePathToResourceKey(imagePath: string): string {
  return imagePath
    .replace('/assets/', '')
    .replace(/\.png$/i, '')
    .replace(/\.jpg$/i, '')
    .replace(/\.jpeg$/i, '');
}

function areSamePosition(a: GridPosition | null, b: GridPosition | null): boolean {
  return !!a && !!b && a.row === b.row && a.col === b.col;
}

@ccclass('BoardView')
export class BoardView extends Component {
  private session: GameSession | null = null;
  private graphics: Graphics | null = null;
  private selectedCell: GridPosition | null = null;
  private toolSelection: GridPosition | null = null;
  private currentSnapshot: SessionStateSnapshot | null = null;
  private lastGridSize = 0;
  private lastCellSize = 0;
  private lastOriginX = 0;
  private lastOriginY = 0;
  private readonly spriteFrameLoader = new SpriteFrameLoader();
  private cellViews = new Map<string, CellView>();
  private readonly cellPool: CellView[] = [];
  private unsubscribe: (() => void) | null = null;
  private cellPrefab: Prefab | null = null;
  private cellPrefabRequested = false;
  private dragStartCell: GridPosition | null = null;
  private dragStartLocal: Vec2 | null = null;
  private dragResolved = false;
  private isAnimating = false;
  private timelinePlaying = false;

  onDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.node.off(Node.EventType.TOUCH_START, this.handleTouchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.handleTouchMove, this);
    this.node.off(Node.EventType.TOUCH_END, this.handleTouchEnd, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.handleTouchCancel, this);
  }

  bind(session: GameSession): void {
    this.session = session;
    this.ensureScaffold();
    this.preloadPrefabs();
    this.unsubscribe?.();
    this.unsubscribe = session.subscribe((event) => this.handleSessionEvent(event));
    this.applySnapshot(session.getSnapshot(), false);
  }

  private preloadPrefabs(): void {
    if (this.cellPrefab || this.cellPrefabRequested) {
      return;
    }

    this.cellPrefabRequested = true;
    PrefabLoader.loadWithCallback('prefabs/Cell', (asset) => {
      if (!asset) {
        console.warn('[BoardView] Failed to load Cell prefab, falling back to dynamic node creation.');
        return;
      }

      this.cellPrefab = asset;
    });
  }

  private handleSessionEvent(event: SessionEvent): void {
    if (event.type === 'invalidSwap') {
      return;
    }

    if (event.type === 'swapResolved') {
      this.selectedCell = null;
      void this.playSwapTimeline(event.timeline);
      return;
    }

    const shouldAnimate = this.currentSnapshot !== null && event.type !== 'bootstrapped';
    this.selectedCell = null;
    this.applySnapshot(event.snapshot, shouldAnimate);
  }

  private applySnapshot(snapshot: SessionStateSnapshot, animate: boolean): void {
    this.ensureScaffold();
    const previousSnapshot = this.currentSnapshot;

    const gridSize = snapshot.gridSize;
    const cellSize = Math.floor((BOARD_WIDTH - PADDING * 2) / gridSize);
    const boardPixelWidth = cellSize * gridSize;
    const originX = Math.floor((BOARD_WIDTH - boardPixelWidth) / 2);
    const originY = BOARD_HEIGHT / 2 - 40;

    this.lastGridSize = gridSize;
    this.lastCellSize = cellSize;
    this.lastOriginX = originX;
    this.lastOriginY = originY;
    this.toolSelection = snapshot.toolSelection;

    this.drawBackground(gridSize, cellSize, originX, originY);
    this.syncCellViews(snapshot, previousSnapshot, animate);
  }

  private ensureScaffold(): void {
    if (this.graphics) {
      return;
    }

    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(BOARD_WIDTH, BOARD_HEIGHT);
    this.node.layer = Layers.Enum.UI_2D;

    this.graphics = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);

    this.node.on(Node.EventType.TOUCH_START, this.handleTouchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.handleTouchMove, this);
    this.node.on(Node.EventType.TOUCH_END, this.handleTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.handleTouchCancel, this);
  }

  private drawBackground(gridSize: number, cellSize: number, originX: number, originY: number): void {
    if (!this.graphics) {
      return;
    }

    const graphics = this.graphics;
    const boardPixelSize = cellSize * gridSize;

    graphics.clear();

    graphics.fillColor = new Color(255, 250, 244, 255);
    graphics.roundRect(-BOARD_WIDTH / 2, -BOARD_HEIGHT / 2, BOARD_WIDTH, BOARD_HEIGHT, 34);
    graphics.fill();

    graphics.fillColor = new Color(221, 194, 156, 255);
    graphics.roundRect(
      -BOARD_WIDTH / 2 + 12,
      -BOARD_HEIGHT / 2 + 12,
      BOARD_WIDTH - 24,
      BOARD_HEIGHT - 24,
      28,
    );
    graphics.fill();

    graphics.fillColor = new Color(255, 252, 247, 255);
    graphics.roundRect(
      -BOARD_WIDTH / 2 + originX - 12,
      originY - boardPixelSize - 12,
      boardPixelSize + 24,
      boardPixelSize + 24,
      24,
    );
    graphics.fill();

    graphics.fillColor = new Color(242, 226, 203, 255);
    graphics.roundRect(
      -BOARD_WIDTH / 2 + originX - 4,
      originY - boardPixelSize - 4,
      boardPixelSize + 8,
      boardPixelSize + 8,
      18,
    );
    graphics.fill();

    const highlightedCell = this.toolSelection ?? this.selectedCell;
    if (highlightedCell) {
      graphics.fillColor = new Color(255, 205, 120, 120);
      graphics.roundRect(
        -BOARD_WIDTH / 2 + originX + highlightedCell.col * cellSize,
        originY - (highlightedCell.row + 1) * cellSize,
        cellSize,
        cellSize,
        12,
      );
      graphics.fill();
    }

    graphics.lineWidth = 2;
    graphics.strokeColor = new Color(225, 205, 178, 255);
    for (let row = 0; row <= gridSize; row++) {
      const y = originY - row * cellSize;
      graphics.moveTo(-BOARD_WIDTH / 2 + originX, y);
      graphics.lineTo(-BOARD_WIDTH / 2 + originX + boardPixelSize, y);
    }
    for (let col = 0; col <= gridSize; col++) {
      const x = -BOARD_WIDTH / 2 + originX + col * cellSize;
      graphics.moveTo(x, originY);
      graphics.lineTo(x, originY - boardPixelSize);
    }
    graphics.stroke();
  }

  private syncCellViews(
    snapshot: SessionStateSnapshot,
    previousSnapshot: SessionStateSnapshot | null,
    animate: boolean,
  ): void {
    const oldSnapshot = animate ? previousSnapshot : null;
    const oldIngredientPositions = oldSnapshot ? this.buildIngredientPositionMap(oldSnapshot.cells) : new Map<string, GridPosition>();
    const activeIds = new Set<string>();
    const tweenJobs: Promise<void>[] = [];

    // 计算 Tray 映射
    const trayMap = trayManager.calculateTrayMap(snapshot.cells);

    for (const row of snapshot.cells) {
      for (const cell of row) {
        const ingredient = cell.ingredient;
        if (!ingredient) {
          continue;
        }

        activeIds.add(ingredient.id);
        const targetPosition = this.getWorldPosition(cell.position);
        let cellView = this.cellViews.get(ingredient.id);
        if (!cellView) {
          cellView = this.createCellView(ingredient.id);
          this.cellViews.set(ingredient.id, cellView);
          const startPosition = oldIngredientPositions.get(ingredient.id)
            ? this.getWorldPosition(oldIngredientPositions.get(ingredient.id)!)
            : this.getSpawnPosition(cell.position, snapshot.cells);
          cellView.node.setPosition(startPosition);
          cellView.node.setScale(new Vec3(0.72, 0.72, 1));
          cellView.setOpacity(0);
        }

        cellView.configure(this.lastCellSize - 18);
        cellView.setSelected(areSamePosition(this.selectedCell, cell.position));
        this.applyIngredientSprite(cellView, ingredient.image);
        
        // 应用口味徽章（非原味显示徽章）
        const badgePath = flavorManager.getFlavorBadgeImage(ingredient.flavor);
        cellView.setFlavorBadge(badgePath);
        
        // 应用 Tray 合并显示
        const trayInfo = trayManager.getTrayInfo(trayMap, cell.position);
        if (trayInfo && trayInfo.variant !== 'none') {
          cellView.setTray(
            trayInfo.variant,
            ingredient.tier,
            trayInfo.rotation,
            trayInfo.isConnected,
            trayInfo.isSameType
          );
        } else {
          cellView.hideTray();
        }

        if (!animate) {
          cellView.node.setPosition(targetPosition);
          cellView.node.setScale(new Vec3(1, 1, 1));
          cellView.setOpacity(255);
          continue;
        }

        cellView.setOpacity(255);
        tweenJobs.push(this.animateCellView(cellView, targetPosition));
      }
    }

    for (const [ingredientId, cellView] of this.cellViews.entries()) {
      if (activeIds.has(ingredientId)) {
        continue;
      }

      if (!animate) {
        this.releaseCellView(cellView);
        this.cellViews.delete(ingredientId);
        continue;
      }

      tweenJobs.push(new Promise((resolve) => {
        Tween.stopAllByTarget(cellView.node);
        tween(cellView.node)
          .to(0.14, { scale: new Vec3(0.2, 0.2, 1) })
          .call(() => {
            this.releaseCellView(cellView);
            this.cellViews.delete(ingredientId);
            resolve();
          })
          .start();
      }));
    }

    this.currentSnapshot = snapshot;
    if (!animate || tweenJobs.length === 0) {
      this.isAnimating = this.timelinePlaying;
      return;
    }

    this.isAnimating = true;
    void Promise.all(tweenJobs).then(() => {
      this.isAnimating = this.timelinePlaying;
    });
  }

  private animateCellView(cellView: CellView, targetPosition: Vec3): Promise<void> {
    return new Promise((resolve) => {
      Tween.stopAllByTarget(cellView.node);
      tween(cellView.node)
        .parallel(
          tween().to(0.18, { position: targetPosition }, { easing: 'quadOut' }),
          tween().to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }),
        )
        .call(() => {
          cellView.setOpacity(255);
          resolve();
        })
        .start();
    });
  }

  private createCellView(id: string): CellView {
    const cellView = this.cellPool.pop() ?? this.instantiateCellView();
    cellView.node.name = `Cell-${id}`;
    cellView.node.layer = Layers.Enum.UI_2D;
    cellView.node.parent = this.node;
    cellView.resetViewState();
    return cellView;
  }

  private instantiateCellView(): CellView {
    const node = this.cellPrefab ? instantiate(this.cellPrefab) : new Node('CellPooled');
    node.layer = Layers.Enum.UI_2D;
    node.parent = this.node;
    return node.getComponent(CellView) ?? node.addComponent(CellView);
  }

  private releaseCellView(cellView: CellView): void {
    Tween.stopAllByTarget(cellView.node);
    cellView.resetViewState();
    cellView.node.removeFromParent();
    cellView.node.active = false;
    this.cellPool.push(cellView);
  }

  private applyIngredientSprite(cellView: CellView, imagePath: string): void {
    const key = imagePathToResourceKey(imagePath);
    const cached = this.spriteFrameLoader.get(key);
    if (cached !== undefined) {
      cellView.setSpriteFrame(cached);
      return;
    }

    cellView.setSpriteFrame(null);
    this.spriteFrameLoader.load(key, (frame) => {
      if (!frame) {
        console.warn('[BoardView] Failed to load sprite frame', key);
        return;
      }

      cellView.setSpriteFrame(frame);
    });
  }

  private buildIngredientPositionMap(cells: SessionCellSnapshot[][]): Map<string, GridPosition> {
    const map = new Map<string, GridPosition>();
    for (const row of cells) {
      for (const cell of row) {
        if (cell.ingredient) {
          map.set(cell.ingredient.id, cell.position);
        }
      }
    }
    return map;
  }

  private getSpawnPosition(position: GridPosition, cells: SessionCellSnapshot[][]): Vec3 {
    let sameColumnNewItems = 0;
    for (const row of cells) {
      for (const cell of row) {
        if (cell.ingredient && cell.position.col === position.col && cell.position.row >= position.row) {
          sameColumnNewItems++;
        }
      }
    }
    const target = this.getWorldPosition(position);
    return new Vec3(target.x, target.y - this.lastCellSize * Math.max(1, sameColumnNewItems), 0);
  }

  private getWorldPosition(position: GridPosition): Vec3 {
    const x = -BOARD_WIDTH / 2 + this.lastOriginX + position.col * this.lastCellSize + this.lastCellSize / 2;
    const y = this.lastOriginY - position.row * this.lastCellSize - this.lastCellSize / 2;
    return new Vec3(x, y, 0);
  }

  private handleTouchStart(event: EventTouch): void {
    if (this.isAnimating) {
      return;
    }

    const local = this.getLocalTouch(event);
    if (!local) {
      return;
    }

    this.dragStartLocal = local;
    this.dragStartCell = this.getCellAtLocalPosition(local.x, local.y);
    this.dragResolved = false;
  }

  private handleTouchMove(event: EventTouch): void {
    if (!this.dragStartCell || !this.dragStartLocal || this.dragResolved || this.isAnimating) {
      return;
    }

    const local = this.getLocalTouch(event);
    if (!local) {
      return;
    }

    const delta = new Vec2(local.x - this.dragStartLocal.x, local.y - this.dragStartLocal.y);
    const threshold = this.lastCellSize * DRAG_THRESHOLD_FACTOR;
    if (Math.abs(delta.x) < threshold && Math.abs(delta.y) < threshold) {
      return;
    }

    const target = Math.abs(delta.x) > Math.abs(delta.y)
      ? {
          row: this.dragStartCell.row,
          col: this.dragStartCell.col + (delta.x > 0 ? 1 : -1),
        }
      : {
          row: this.dragStartCell.row + (delta.y > 0 ? -1 : 1),
          col: this.dragStartCell.col,
        };

    if (target.row < 0 || target.row >= this.lastGridSize || target.col < 0 || target.col >= this.lastGridSize) {
      return;
    }

    this.dragResolved = true;
    this.selectedCell = null;
    this.performSwap(this.dragStartCell, target);
  }

  private handleTouchEnd(event: EventTouch): void {
    if (this.isAnimating) {
      this.resetTouchState();
      return;
    }

    if (!this.dragResolved) {
      const local = this.getLocalTouch(event);
      const cell = local ? this.getCellAtLocalPosition(local.x, local.y) : null;
      this.handleTap(cell);
    }

    this.resetTouchState();
  }

  private handleTouchCancel(): void {
    this.resetTouchState();
  }

  private handleTap(cell: GridPosition | null): void {
    if (this.currentSnapshot?.toolMode === 'remove') {
      if (cell) {
        this.session?.useRemoveAt(cell);
      } else {
        this.session?.cancelToolMode();
      }
      return;
    }

    if (this.currentSnapshot?.toolMode === 'magnet') {
      if (cell) {
        this.session?.useMagnetAt(cell);
      } else {
        this.session?.cancelToolMode();
      }
      return;
    }

    if (!cell) {
      this.selectedCell = null;
      if (this.currentSnapshot) {
        this.applySnapshot(this.currentSnapshot, false);
      }
      return;
    }

    if (!this.selectedCell) {
      this.selectedCell = cell;
      if (this.currentSnapshot) {
        this.applySnapshot(this.currentSnapshot, false);
      }
      return;
    }

    const first = this.selectedCell;
    this.selectedCell = null;
    this.performSwap(first, cell);
  }

  private performSwap(from: GridPosition, to: GridPosition): void {
    if (!this.session || !this.currentSnapshot) {
      return;
    }

    const fromId = this.currentSnapshot.cells[from.row]?.[from.col]?.ingredient?.id ?? null;
    const toId = this.currentSnapshot.cells[to.row]?.[to.col]?.ingredient?.id ?? null;
    const success = this.session.trySwap(from, to);

    if (success) {
      return;
    }

    if (fromId && toId) {
      void this.animateInvalidSwap(fromId, toId, from, to);
    } else if (this.currentSnapshot) {
      this.applySnapshot(this.currentSnapshot, false);
    }
  }

  private async animateInvalidSwap(
    fromId: string,
    toId: string,
    from: GridPosition,
    to: GridPosition,
  ): Promise<void> {
    const fromView = this.cellViews.get(fromId);
    const toView = this.cellViews.get(toId);
    if (!fromView || !toView) {
      return;
    }

    this.isAnimating = true;
    Tween.stopAllByTarget(fromView.node);
    Tween.stopAllByTarget(toView.node);

    await Promise.all([
      new Promise<void>((resolve) => {
        tween(fromView.node)
          .to(0.08, { position: this.getWorldPosition(to) })
          .to(0.08, { position: this.getWorldPosition(from) })
          .call(resolve)
          .start();
      }),
      new Promise<void>((resolve) => {
        tween(toView.node)
          .to(0.08, { position: this.getWorldPosition(from) })
          .to(0.08, { position: this.getWorldPosition(to) })
          .call(resolve)
          .start();
      }),
    ]);

    this.isAnimating = false;
  }

  private async playSwapTimeline(timeline: SessionSwapTimeline): Promise<void> {
    this.timelinePlaying = true;
    this.isAnimating = true;

    try {
      this.applySnapshot(timeline.beforeSwap, false);
      await this.animateResolvedSwap(timeline);

      for (const cascade of timeline.cascades) {
        this.applySnapshot(cascade.beforeRemove, false);
        await this.animateMatchedIds(cascade.matchedIds);
        this.applySnapshot(cascade.afterMerge, false);
        await this.wait(60);
        this.applySnapshot(cascade.afterFill, true);
        await this.wait(240);
      }

      this.applySnapshot(timeline.finalSnapshot, false);
    } finally {
      this.timelinePlaying = false;
      this.isAnimating = false;
    }
  }

  private async animateResolvedSwap(timeline: SessionSwapTimeline): Promise<void> {
    const fromId = this.getIngredientIdAt(timeline.beforeSwap, timeline.from);
    const toId = this.getIngredientIdAt(timeline.beforeSwap, timeline.to);

    if (!fromId || !toId) {
      this.applySnapshot(timeline.afterSwap, false);
      return;
    }

    const fromView = this.cellViews.get(fromId);
    const toView = this.cellViews.get(toId);
    if (!fromView || !toView) {
      this.applySnapshot(timeline.afterSwap, false);
      return;
    }

    Tween.stopAllByTarget(fromView.node);
    Tween.stopAllByTarget(toView.node);

    await Promise.all([
      new Promise<void>((resolve) => {
        tween(fromView.node)
          .parallel(
            tween().to(0.12, { position: this.getWorldPosition(timeline.to) }, { easing: 'quadOut' }),
            tween().to(0.12, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' }),
          )
          .to(0.06, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
          .call(resolve)
          .start();
      }),
      new Promise<void>((resolve) => {
        tween(toView.node)
          .parallel(
            tween().to(0.12, { position: this.getWorldPosition(timeline.from) }, { easing: 'quadOut' }),
            tween().to(0.12, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' }),
          )
          .to(0.06, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' })
          .call(resolve)
          .start();
      }),
    ]);

    this.applySnapshot(timeline.afterSwap, false);
  }

  private animateMatchedIds(ids: string[]): Promise<void> {
    const animations = ids
      .map((id) => ({ id, view: this.cellViews.get(id) }))
      .filter((entry): entry is { id: string; view: CellView } => !!entry.view)
      .map(({ id, view }) => new Promise<void>((resolve) => {
        Tween.stopAllByTarget(view.node);
        tween(view.node)
          .parallel(
            tween().to(0.14, { scale: new Vec3(0.2, 0.2, 1) }, { easing: 'quadIn' }),
            tween().to(0.14, { position: view.node.position.clone().add3f(0, 20, 0) }, { easing: 'quadOut' }),
          )
          .call(() => {
            view.node.destroy();
            this.cellViews.delete(id);
            resolve();
          })
          .start();
      }));

    if (animations.length === 0) {
      return Promise.resolve();
    }

    return Promise.all(animations).then(() => undefined);
  }

  private getIngredientIdAt(snapshot: SessionStateSnapshot, position: GridPosition): string | null {
    return snapshot.cells[position.row]?.[position.col]?.ingredient?.id ?? null;
  }

  private wait(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  private resetTouchState(): void {
    this.dragStartCell = null;
    this.dragStartLocal = null;
    this.dragResolved = false;
  }

  private getLocalTouch(event: EventTouch): Vec2 | null {
    const transform = this.node.getComponent(UITransform);
    if (!transform) {
      return null;
    }

    const ui = event.getUILocation();
    const local = transform.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));
    return new Vec2(local.x, local.y);
  }

  private getCellAtLocalPosition(x: number, y: number): GridPosition | null {
    const boardLeft = -BOARD_WIDTH / 2 + this.lastOriginX;
    const boardTop = this.lastOriginY;
    const boardRight = boardLeft + this.lastCellSize * this.lastGridSize;
    const boardBottom = boardTop - this.lastCellSize * this.lastGridSize;

    if (x < boardLeft || x > boardRight || y > boardTop || y < boardBottom) {
      return null;
    }

    const col = Math.floor((x - boardLeft) / this.lastCellSize);
    const row = Math.floor((boardTop - y) / this.lastCellSize);

    if (row < 0 || row >= this.lastGridSize || col < 0 || col >= this.lastGridSize) {
      return null;
    }

    return { row, col };
  }
}
