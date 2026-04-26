import {
  _decorator,
  Color,
  Component,
  EventTouch,
  Graphics,
  Label,
  Layers,
  Node,
  Tween,
  tween,
  UITransform,
  Vec3,
} from 'cc';

const { ccclass } = _decorator;

interface TutorialStep {
  id: number;
  description: string;
  gridSize: { rows: number; cols: number };
  initialGrid: number[][];
  fingerGuide: {
    from: { row: number; col: number };
    to: { row: number; col: number };
  };
  matchPositions: { row: number; col: number }[];
  mergePosition: { row: number; col: number };
  newIngredientsFromBottom: number[];
}

interface TutorialCellRefs {
  node: Node;
  background: Graphics;
  label: Label;
  row: number;
  col: number;
  level: number;
}

const OVERLAY_WIDTH = 750;
const OVERLAY_HEIGHT = 1334;
const PANEL_WIDTH = 580;
const PANEL_HEIGHT = 860;
const BASE_CELL_SIZE = 70;
const CELL_GAP = 10;
const STEPS: TutorialStep[] = [
  {
    id: 1,
    description: '拖动相邻的食材，让3个相同的连在一起',
    gridSize: { rows: 2, cols: 3 },
    initialGrid: [
      [1, 1, 2],
      [2, 3, 1],
    ],
    fingerGuide: {
      from: { row: 1, col: 2 },
      to: { row: 0, col: 2 },
    },
    matchPositions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
    mergePosition: { row: 0, col: 1 },
    newIngredientsFromBottom: [2, 3, 1],
  },
  {
    id: 2,
    description: '继续交换，制造消除',
    gridSize: { rows: 2, cols: 3 },
    initialGrid: [
      [2, 3, 2],
      [2, 3, 3],
    ],
    fingerGuide: {
      from: { row: 0, col: 0 },
      to: { row: 1, col: 0 },
    },
    matchPositions: [{ row: 0, col: 0 }, { row: 1, col: 0 }],
    mergePosition: { row: 0, col: 0 },
    newIngredientsFromBottom: [1, 2, 3],
  },
  {
    id: 3,
    description: '地图扩大了，继续消除食材',
    gridSize: { rows: 3, cols: 3 },
    initialGrid: [
      [2, 3, 3],
      [1, 1, 2],
      [3, 2, 1],
    ],
    fingerGuide: {
      from: { row: 1, col: 1 },
      to: { row: 1, col: 2 },
    },
    matchPositions: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }],
    mergePosition: { row: 0, col: 2 },
    newIngredientsFromBottom: [2, 1, 3],
  },
  {
    id: 4,
    description: '消除后会生成更高等级的食材',
    gridSize: { rows: 3, cols: 3 },
    initialGrid: [
      [2, 4, 3],
      [1, 1, 2],
      [2, 3, 1],
    ],
    fingerGuide: {
      from: { row: 1, col: 0 },
      to: { row: 1, col: 1 },
    },
    matchPositions: [{ row: 1, col: 0 }, { row: 1, col: 1 }],
    mergePosition: { row: 1, col: 0 },
    newIngredientsFromBottom: [3, 2, 1],
  },
  {
    id: 5,
    description: '合成更高级的食材',
    gridSize: { rows: 3, cols: 3 },
    initialGrid: [
      [2, 4, 3],
      [1, 3, 2],
      [2, 3, 1],
    ],
    fingerGuide: {
      from: { row: 1, col: 2 },
      to: { row: 2, col: 2 },
    },
    matchPositions: [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
    mergePosition: { row: 1, col: 1 },
    newIngredientsFromBottom: [1, 2, 3],
  },
  {
    id: 6,
    description: '地图再次扩大，注意上浮补位',
    gridSize: { rows: 3, cols: 4 },
    initialGrid: [
      [2, 4, 3, 1],
      [1, 3, 2, 4],
      [3, 4, 1, 3],
    ],
    fingerGuide: {
      from: { row: 2, col: 1 },
      to: { row: 1, col: 1 },
    },
    matchPositions: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
    mergePosition: { row: 0, col: 1 },
    newIngredientsFromBottom: [1, 2, 3, 1],
  },
  {
    id: 7,
    description: '制造连锁反应，获得更高分数',
    gridSize: { rows: 3, cols: 4 },
    initialGrid: [
      [2, 5, 3, 1],
      [1, 3, 2, 4],
      [3, 4, 1, 3],
    ],
    fingerGuide: {
      from: { row: 0, col: 3 },
      to: { row: 1, col: 3 },
    },
    matchPositions: [{ row: 0, col: 3 }, { row: 1, col: 3 }],
    mergePosition: { row: 0, col: 3 },
    newIngredientsFromBottom: [2, 1, 3, 2],
  },
  {
    id: 8,
    description: '最后一课，合成吐司礼盒送给顾客',
    gridSize: { rows: 4, cols: 5 },
    initialGrid: [
      [4, 5, 1, 6, 4],
      [1, 2, 1, 3, 1],
      [3, 3, 2, 3, 1],
      [1, 4, 1, 4, 2],
    ],
    fingerGuide: {
      from: { row: 2, col: 0 },
      to: { row: 2, col: 1 },
    },
    matchPositions: [{ row: 2, col: 0 }, { row: 2, col: 1 }],
    mergePosition: { row: 2, col: 0 },
    newIngredientsFromBottom: [2, 3, 1, 2, 1],
  },
];

@ccclass('TutorialOverlayView')
export class TutorialOverlayView extends Component {
  private stepIndex = 0;
  private onCompleteHandler: (() => Promise<void>) | null = null;
  private onSkipHandler: (() => Promise<void>) | null = null;
  private titleLabel: Label | null = null;
  private descriptionLabel: Label | null = null;
  private progressLabel: Label | null = null;
  private gridRoot: Node | null = null;
  private fingerNode: Node | null = null;
  private skipButton: Node | null = null;
  private readonly cells = new Map<string, TutorialCellRefs>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private activeFingerTween: Tween<Node> | null = null;
  private busy = false;

  protected onLoad(): void {
    this.ensureScaffold();
    this.node.active = false;
  }

  protected onDestroy(): void {
    this.clearAsyncState();
  }

  public bind(onComplete: () => Promise<void>, onSkip: () => Promise<void>): void {
    this.onCompleteHandler = onComplete;
    this.onSkipHandler = onSkip;
    this.ensureScaffold();
  }

  public open(): void {
    this.ensureScaffold();
    this.stepIndex = 0;
    this.busy = false;
    this.node.active = true;
    this.renderStep();
  }

  public close(): void {
    this.clearAsyncState();
    this.node.active = false;
  }

  private ensureScaffold(): void {
    if (this.titleLabel && this.descriptionLabel && this.progressLabel && this.gridRoot && this.skipButton) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);

    const backdrop = this.createGraphicsNode(this.node, 'TutorialBackdrop', Vec3.ZERO, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    const backdropGraphics = backdrop.getComponent(Graphics) ?? backdrop.addComponent(Graphics);
    backdropGraphics.fillColor = new Color(57, 36, 20, 214);
    backdropGraphics.rect(-OVERLAY_WIDTH / 2, -OVERLAY_HEIGHT / 2, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    backdropGraphics.fill();
    this.consumeTouches(backdrop);

    const panel = this.createGraphicsNode(this.node, 'TutorialPanel', Vec3.ZERO, PANEL_WIDTH, PANEL_HEIGHT);
    const panelGraphics = panel.getComponent(Graphics) ?? panel.addComponent(Graphics);
    panelGraphics.fillColor = new Color(255, 248, 231, 255);
    panelGraphics.roundRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);
    panelGraphics.fill();
    panelGraphics.fillColor = new Color(237, 205, 157, 255);
    panelGraphics.roundRect(-PANEL_WIDTH / 2 + 12, -PANEL_HEIGHT / 2 + 12, PANEL_WIDTH - 24, PANEL_HEIGHT - 24, 28);
    panelGraphics.fill();
    this.consumeTouches(panel);

    this.progressLabel = this.createLabel(panel, 'TutorialProgressLabel', new Vec3(0, 350, 0), 20, 24, 220, 28);
    this.progressLabel.color = new Color(171, 108, 44, 255);

    this.titleLabel = this.createLabel(panel, 'TutorialTitleLabel', new Vec3(0, 308, 0), 32, 38, PANEL_WIDTH - 80, 44);
    this.titleLabel.color = new Color(97, 62, 38, 255);

    this.descriptionLabel = this.createLabel(panel, 'TutorialDescriptionLabel', new Vec3(0, 258, 0), 20, 26, PANEL_WIDTH - 100, 56);
    this.descriptionLabel.color = new Color(124, 84, 52, 255);

    const frame = this.createGraphicsNode(panel, 'TutorialGridFrame', new Vec3(0, -10, 0), 460, 500);
    const frameGraphics = frame.getComponent(Graphics) ?? frame.addComponent(Graphics);
    frameGraphics.fillColor = new Color(248, 232, 208, 255);
    frameGraphics.roundRect(-230, -250, 460, 500, 28);
    frameGraphics.fill();

    this.gridRoot = new Node('TutorialGridRoot');
    this.gridRoot.layer = Layers.Enum.UI_2D;
    this.gridRoot.parent = frame;
    this.gridRoot.setPosition(new Vec3(0, -10, 0));
    const gridTransform = this.gridRoot.addComponent(UITransform);
    gridTransform.setContentSize(420, 420);

    this.skipButton = this.createButton(this.node, 'TutorialSkipButton', new Vec3(272, 606, 0), 132, 48, new Color(139, 69, 19, 224));
    this.skipButton.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      void this.skip();
    });
    const skipLabel = this.createLabel(this.skipButton, 'TutorialSkipLabel', Vec3.ZERO, 18, 22, 112, 30);
    skipLabel.string = '跳过教学';
    skipLabel.color = Color.WHITE;
  }

  private renderStep(): void {
    if (!this.titleLabel || !this.descriptionLabel || !this.progressLabel || !this.gridRoot) {
      return;
    }

    this.clearAsyncState();
    this.busy = false;
    this.cells.clear();
    this.gridRoot.removeAllChildren();

    const step = STEPS[this.stepIndex];
    this.progressLabel.string = `第 ${step.id} / ${STEPS.length} 课`;
    this.titleLabel.string = '新手教学';
    this.descriptionLabel.string = step.description;

    const cellSize = this.getCellSize(step);
    const totalWidth = step.gridSize.cols * cellSize + (step.gridSize.cols - 1) * CELL_GAP;
    const totalHeight = step.gridSize.rows * cellSize + (step.gridSize.rows - 1) * CELL_GAP;
    const startX = -totalWidth / 2 + cellSize / 2;
    const startY = totalHeight / 2 - cellSize / 2;

    for (let row = 0; row < step.gridSize.rows; row++) {
      for (let col = 0; col < step.gridSize.cols; col++) {
        const level = step.initialGrid[row]?.[col] ?? 0;
        const node = this.createCellNode(row, col, level, cellSize);
        node.parent = this.gridRoot;
        node.setPosition(new Vec3(startX + col * (cellSize + CELL_GAP), startY - row * (cellSize + CELL_GAP), 0));
      }
    }

    this.highlightInteractiveCells(step);
    this.createFingerGuide(step);
  }

  private createCellNode(row: number, col: number, level: number, size: number): Node {
    const cellNode = this.createGraphicsNode(this.gridRoot!, `TutorialCell-${row}-${col}`, Vec3.ZERO, size, size);
    const background = cellNode.getComponent(Graphics) ?? cellNode.addComponent(Graphics);
    const label = this.createLabel(cellNode, `TutorialCellLabel-${row}-${col}`, Vec3.ZERO, Math.max(24, Math.floor(size * 0.46)), Math.max(28, Math.floor(size * 0.5)), size, size);
    label.color = Color.WHITE;
    const refs: TutorialCellRefs = {
      node: cellNode,
      background,
      label,
      row,
      col,
      level,
    };

    cellNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      if (this.busy) {
        return;
      }
      const step = STEPS[this.stepIndex];
      const isInteractive = this.isInteractiveCell(step, row, col);
      if (!isInteractive) {
        return;
      }
      void this.executeStep(step);
    });

    this.cells.set(this.getCellKey(row, col), refs);
    this.renderCell(refs);
    return cellNode;
  }

  private renderCell(cell: TutorialCellRefs): void {
    cell.background.clear();
    cell.background.fillColor = this.getIngredientColor(cell.level);
    cell.background.roundRect(-cell.node.getComponent(UITransform)!.width / 2, -cell.node.getComponent(UITransform)!.height / 2, cell.node.getComponent(UITransform)!.width, cell.node.getComponent(UITransform)!.height, 12);
    cell.background.fill();
    cell.label.string = this.getIngredientLabel(cell.level);
    cell.node.opacity = cell.level > 0 ? 255 : 184;
    cell.node.scale = Vec3.ONE;
  }

  private highlightInteractiveCells(step: TutorialStep): void {
    this.cells.forEach((cell) => {
      const selected = this.isInteractiveCell(step, cell.row, cell.col);
      cell.background.clear();
      cell.background.fillColor = selected ? new Color(255, 215, 117, 255) : this.getIngredientColor(cell.level);
      const width = cell.node.getComponent(UITransform)!.width;
      const height = cell.node.getComponent(UITransform)!.height;
      cell.background.roundRect(-width / 2, -height / 2, width, height, 12);
      cell.background.fill();
      if (selected) {
        cell.background.fillColor = this.getIngredientColor(cell.level);
        cell.background.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 10);
        cell.background.fill();
      }
      cell.label.string = this.getIngredientLabel(cell.level);
    });
  }

  private createFingerGuide(step: TutorialStep): void {
    if (!this.gridRoot) {
      return;
    }

    const fromCell = this.cells.get(this.getCellKey(step.fingerGuide.from.row, step.fingerGuide.from.col));
    const toCell = this.cells.get(this.getCellKey(step.fingerGuide.to.row, step.fingerGuide.to.col));
    if (!fromCell || !toCell) {
      return;
    }

    this.fingerNode = new Node('TutorialFinger');
    this.fingerNode.layer = Layers.Enum.UI_2D;
    this.fingerNode.parent = this.gridRoot;
    this.fingerNode.setPosition(fromCell.node.position.clone());
    const transform = this.fingerNode.addComponent(UITransform);
    transform.setContentSize(44, 44);
    const label = this.fingerNode.addComponent(Label);
    label.string = '滑';
    label.fontSize = 36;
    label.lineHeight = 40;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    this.activeFingerTween = tween(this.fingerNode)
      .repeatForever(
        tween<Node>()
          .to(0.75, { position: toCell.node.position.clone(), scale: new Vec3(0.9, 0.9, 1) })
          .to(0.75, { position: fromCell.node.position.clone(), scale: Vec3.ONE }),
      )
      .start();
  }

  private async executeStep(step: TutorialStep): Promise<void> {
    this.busy = true;
    this.activeFingerTween?.stop();
    this.activeFingerTween = null;
    this.fingerNode?.destroy();
    this.fingerNode = null;

    await this.animateSwap(step);
    await this.animateMatch(step);
    await this.animateMerge(step);
    await this.animateRise(step);
    await this.delay(500);

    if (this.stepIndex < STEPS.length - 1) {
      this.stepIndex += 1;
      this.renderStep();
      return;
    }

    await this.complete();
  }

  private async animateSwap(step: TutorialStep): Promise<void> {
    const fromCell = this.cells.get(this.getCellKey(step.fingerGuide.from.row, step.fingerGuide.from.col));
    const toCell = this.cells.get(this.getCellKey(step.fingerGuide.to.row, step.fingerGuide.to.col));
    if (!fromCell || !toCell) {
      return;
    }

    const fromPosition = fromCell.node.position.clone();
    const toPosition = toCell.node.position.clone();

    await Promise.all([
      this.runTween(fromCell.node, tween(fromCell.node).to(0.2, { position: toPosition, scale: new Vec3(1.12, 1.12, 1) }).to(0.2, { scale: Vec3.ONE })),
      this.runTween(toCell.node, tween(toCell.node).to(0.2, { position: fromPosition, scale: new Vec3(1.12, 1.12, 1) }).to(0.2, { scale: Vec3.ONE })),
    ]);

    fromCell.node.setPosition(fromPosition);
    toCell.node.setPosition(toPosition);

    const fromLevel = fromCell.level;
    fromCell.level = toCell.level;
    toCell.level = fromLevel;
    this.renderCell(fromCell);
    this.renderCell(toCell);
  }

  private async animateMatch(step: TutorialStep): Promise<void> {
    const targets = step.matchPositions
      .map((position) => this.cells.get(this.getCellKey(position.row, position.col)))
      .filter((cell): cell is TutorialCellRefs => !!cell);

    await Promise.all(targets.map((cell) => this.runTween(
      cell.node,
      tween(cell.node).to(0.2, { scale: new Vec3(1.2, 1.2, 1), opacity: 200 }).to(0.2, { scale: Vec3.ZERO, opacity: 0 }),
    )));

    targets.forEach((cell) => {
      cell.level = 0;
      cell.node.scale = Vec3.ONE;
      this.renderCell(cell);
    });
  }

  private async animateMerge(step: TutorialStep): Promise<void> {
    const mergeCell = this.cells.get(this.getCellKey(step.mergePosition.row, step.mergePosition.col));
    if (!mergeCell) {
      return;
    }

    const nextLevel = Math.min(
      6,
      step.matchPositions.reduce((maxLevel, position) => {
        return Math.max(maxLevel, step.initialGrid[position.row]?.[position.col] ?? 0);
      }, 0) + 1,
    );

    mergeCell.level = nextLevel;
    this.renderCell(mergeCell);
    mergeCell.node.opacity = 255;
    mergeCell.node.scale = Vec3.ZERO;
    await this.runTween(
      mergeCell.node,
      tween(mergeCell.node).to(0.18, { scale: new Vec3(1.18, 1.18, 1) }).to(0.22, { scale: Vec3.ONE }),
    );
  }

  private async animateRise(step: TutorialStep): Promise<void> {
    const { rows, cols } = step.gridSize;

    for (let col = 0; col < cols; col++) {
      for (let row = rows - 1; row >= 0; row--) {
        const targetCell = this.cells.get(this.getCellKey(row, col));
        if (!targetCell || targetCell.level > 0) {
          continue;
        }

        let sourceCell: TutorialCellRefs | null = null;
        for (let belowRow = row + 1; belowRow < rows; belowRow++) {
          const candidate = this.cells.get(this.getCellKey(belowRow, col));
          if (candidate && candidate.level > 0) {
            sourceCell = candidate;
            break;
          }
        }

        if (sourceCell) {
          targetCell.level = sourceCell.level;
          sourceCell.level = 0;
          this.renderCell(sourceCell);
        } else {
          targetCell.level = step.newIngredientsFromBottom[col] ?? 0;
        }

        this.renderCell(targetCell);
        targetCell.node.opacity = 0;
        targetCell.node.setPosition(new Vec3(targetCell.node.position.x, targetCell.node.position.y - 24, 0));
        await this.runTween(
          targetCell.node,
          tween(targetCell.node).to(0.22, { position: new Vec3(targetCell.node.position.x, targetCell.node.position.y + 24, 0), opacity: 255 }),
        );
      }
    }
  }

  private async complete(): Promise<void> {
    this.close();
    await this.onCompleteHandler?.();
  }

  private async skip(): Promise<void> {
    this.close();
    await this.onSkipHandler?.();
  }

  private isInteractiveCell(step: TutorialStep, row: number, col: number): boolean {
    const from = step.fingerGuide.from;
    const to = step.fingerGuide.to;
    return (from.row === row && from.col === col) || (to.row === row && to.col === col);
  }

  private getCellSize(step: TutorialStep): number {
    const totalWidth = step.gridSize.cols * BASE_CELL_SIZE + (step.gridSize.cols - 1) * CELL_GAP;
    return Math.floor(BASE_CELL_SIZE * Math.min(1, 360 / totalWidth));
  }

  private getCellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private getIngredientColor(level: number): Color {
    switch (level) {
      case 1:
        return new Color(244, 208, 63, 255);
      case 2:
        return new Color(232, 213, 196, 255);
      case 3:
        return new Color(245, 203, 167, 255);
      case 4:
        return new Color(210, 105, 30, 255);
      case 5:
        return new Color(139, 69, 19, 255);
      case 6:
        return new Color(255, 215, 0, 255);
      default:
        return new Color(245, 245, 245, 255);
    }
  }

  private getIngredientLabel(level: number): string {
    switch (level) {
      case 1:
        return '麦';
      case 2:
        return '粉';
      case 3:
        return '团';
      case 4:
        return '坯';
      case 5:
        return '吐';
      case 6:
        return '礼';
      default:
        return '';
    }
  }

  private createGraphicsNode(parent: Node, name: string, position: Vec3, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(position);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    node.addComponent(Graphics);
    return node;
  }

  private createButton(parent: Node, name: string, position: Vec3, width: number, height: number, color: Color): Node {
    const button = this.createGraphicsNode(parent, name, position, width, height);
    const graphics = button.getComponent(Graphics) ?? button.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.roundRect(-width / 2, -height / 2, width, height, 20);
    graphics.fill();
    return button;
  }

  private createLabel(
    parent: Node,
    name: string,
    position: Vec3,
    fontSize: number,
    lineHeight: number,
    width: number,
    height: number,
  ): Label {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(position);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const label = node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = lineHeight;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
  }

  private consumeTouches(node: Node): void {
    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
      event.propagationStopped = true;
    });
    node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
      event.propagationStopped = true;
    });
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
    });
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
      event.propagationStopped = true;
    });
  }

  private runTween(target: Node, animation: Tween<Node>): Promise<void> {
    return new Promise((resolve) => {
      animation.call(() => resolve()).start();
    });
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, durationMs);
      this.timers.add(timer);
    });
  }

  private clearAsyncState(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.activeFingerTween?.stop();
    this.activeFingerTween = null;
    this.fingerNode?.destroy();
    this.fingerNode = null;
    this.cells.forEach((cell) => {
      Tween.stopAllByTarget(cell.node);
    });
  }
}
