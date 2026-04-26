import {
  _decorator,
  Color,
  Component,
  EventTouch,
  Graphics,
  Label,
  Layers,
  Node,
  Sprite,
  UITransform,
  Vec3,
} from 'cc';

import {
  GameSession,
  type SessionEvent,
  type SessionStateSnapshot,
} from '../game/session/GameSession';
import { SpriteFrameLoader } from '../infra/SpriteFrameLoader';

const { ccclass } = _decorator;

const OVERLAY_WIDTH = 750;
const OVERLAY_HEIGHT = 1334;
const PANEL_WIDTH = 520;
const PANEL_HEIGHT = 468;

interface GraphicsNodeRefs {
  node: Node;
  graphics: Graphics | null;
}

@ccclass('SettlementOverlayView')
export class SettlementOverlayView extends Component {
  private readonly spriteFrameLoader = new SpriteFrameLoader();
  private scaffoldReady = false;
  private session: GameSession | null = null;
  private unsubscribe: (() => void) | null = null;
  private restartHandler: (() => Promise<void>) | null = null;
  private nextLevelHandler: (() => Promise<void>) | null = null;
  private backdrop: Graphics | null = null;
  private panel: Graphics | null = null;
  private headerBadge: Graphics | null = null;
  private titleLabel: Label | null = null;
  private summaryLabel: Label | null = null;
  private detailLabel: Label | null = null;
  private recordLabel: Label | null = null;
  private primaryLabel: Label | null = null;
  private secondaryLabel: Label | null = null;
  private starSprites: Sprite[] = [];
  private primaryButton: Node | null = null;
  private secondaryButton: Node | null = null;

  protected onLoad(): void {
    this.ensureScaffold();
    this.node.active = false;
  }

  protected onDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  public bind(
    session: GameSession,
    restartHandler: () => Promise<void>,
    nextLevelHandler: () => Promise<void>,
  ): void {
    this.session = session;
    this.restartHandler = restartHandler;
    this.nextLevelHandler = nextLevelHandler;
    this.ensureScaffold();
    this.unsubscribe?.();
    this.unsubscribe = session.subscribe((event) => this.handleSessionEvent(event));
    this.render(session.getSnapshot());
  }

  private handleSessionEvent(event: SessionEvent): void {
    this.render(event.snapshot);
  }

  private ensureScaffold(): void {
    if (this.scaffoldReady) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);

    const backdropRefs = this.bindOrCreateGraphicsNode(this.node, 'SettlementBackdrop', Vec3.ZERO, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    this.backdrop = backdropRefs.graphics;

    const panelRefs = this.bindOrCreateGraphicsNode(this.node, 'SettlementPanel', Vec3.ZERO, PANEL_WIDTH, PANEL_HEIGHT);
    const panelNode = panelRefs.node;
    this.panel = panelRefs.graphics;

    const headerRefs = this.bindOrCreateGraphicsNode(panelNode, 'SettlementHeaderBadge', new Vec3(0, 156, 0), 220, 54);
    this.headerBadge = headerRefs.graphics;

    this.titleLabel = this.createLabel('SettlementTitle', panelNode, new Vec3(0, 92, 0), 34, 42, PANEL_WIDTH - 80, 60);
    this.summaryLabel = this.createLabel('SettlementSummary', panelNode, new Vec3(0, 44, 0), 18, 24, PANEL_WIDTH - 110, 54);

    const starsNode = new Node('SettlementStars');
    starsNode.layer = Layers.Enum.UI_2D;
    starsNode.parent = panelNode;
    starsNode.setPosition(new Vec3(0, -8, 0));
    const starsTransform = starsNode.addComponent(UITransform);
    starsTransform.setContentSize(160, 30);
    this.starSprites = Array.from({ length: 3 }, (_, index) => {
      const starNode = new Node(`SettlementStar-${index}`);
      starNode.layer = Layers.Enum.UI_2D;
      starNode.parent = starsNode;
      starNode.setPosition(new Vec3((index - 1) * 34, 0, 0));
      const starTransform = starNode.addComponent(UITransform);
      starTransform.setContentSize(24, 24);
      const sprite = starNode.addComponent(Sprite);
      sprite.type = Sprite.Type.SIMPLE;
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      this.applySprite(sprite, 'ui/header_star');
      return sprite;
    });

    this.detailLabel = this.createLabel('SettlementDetail', panelNode, new Vec3(0, -64, 0), 22, 28, PANEL_WIDTH - 120, 64);
    this.recordLabel = this.createLabel('SettlementRecord', panelNode, new Vec3(0, -124, 0), 16, 22, PANEL_WIDTH - 120, 52);

    this.primaryButton = this.createButton(panelNode, 'SettlementPrimary', new Vec3(-118, -190, 0), new Color(220, 151, 72, 255));
    this.primaryButton.on(Node.EventType.TOUCH_END, this.handleRestartTap, this);
    this.primaryLabel = this.createLabel('SettlementPrimaryLabel', this.primaryButton, Vec3.ZERO, 24, 30, 180, 52);
    this.primaryLabel.string = '重新开始';

    this.secondaryButton = this.createButton(panelNode, 'SettlementSecondary', new Vec3(118, -190, 0), new Color(189, 128, 59, 255));
    this.secondaryButton.on(Node.EventType.TOUCH_END, this.handleNextLevelTap, this);
    this.secondaryLabel = this.createLabel('SettlementSecondaryLabel', this.secondaryButton, Vec3.ZERO, 24, 30, 180, 52);
    this.secondaryLabel.string = '下一关';

    this.drawBackdrop();
    this.drawPanel();
    this.scaffoldReady = true;
  }

  private bindOrCreateGraphicsNode(
    parent: Node,
    name: string,
    position: Vec3,
    width: number,
    height: number,
  ): GraphicsNodeRefs {
    const existingNode = parent.getChildByName(name);
    const node = existingNode ?? new Node(name);
    if (!node.parent) {
      node.parent = parent;
    }
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(position);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const graphics = node.getComponent(Graphics) ?? (existingNode ? null : node.addComponent(Graphics));
    return { node, graphics };
  }

  private createButton(parent: Node, name: string, position: Vec3, color: Color): Node {
    const refs = this.bindOrCreateGraphicsNode(parent, name, position, 196, 68);
    if (refs.graphics) {
      refs.graphics.clear();
      refs.graphics.fillColor = color;
      refs.graphics.roundRect(-98, -34, 196, 68, 26);
      refs.graphics.fill();
    }
    return refs.node;
  }

  private createLabel(
    name: string,
    parent: Node,
    position: Vec3,
    fontSize: number,
    lineHeight: number,
    width = PANEL_WIDTH - 80,
    height = 80,
  ): Label {
    const node = parent.getChildByName(name) ?? new Node(name);
    if (!node.parent) {
      node.parent = parent;
    }
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(position);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const label = node.getComponent(Label) ?? node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = lineHeight;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
  }

  private drawBackdrop(): void {
    if (!this.backdrop) {
      return;
    }

    this.backdrop.clear();
    this.backdrop.fillColor = new Color(67, 43, 26, 148);
    this.backdrop.rect(-OVERLAY_WIDTH / 2, -OVERLAY_HEIGHT / 2, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    this.backdrop.fill();
  }

  private drawPanel(): void {
    if (!this.panel || !this.headerBadge) {
      return;
    }

    this.panel.clear();
    this.panel.fillColor = new Color(255, 249, 240, 255);
    this.panel.roundRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 34);
    this.panel.fill();
    this.panel.fillColor = new Color(233, 204, 164, 255);
    this.panel.roundRect(-PANEL_WIDTH / 2 + 12, -PANEL_HEIGHT / 2 + 12, PANEL_WIDTH - 24, PANEL_HEIGHT - 24, 28);
    this.panel.fill();
    this.panel.fillColor = new Color(255, 244, 226, 255);
    this.panel.roundRect(-PANEL_WIDTH / 2 + 30, 8, PANEL_WIDTH - 60, 164, 28);
    this.panel.fill();

    this.headerBadge.clear();
    this.headerBadge.fillColor = new Color(255, 238, 208, 255);
    this.headerBadge.roundRect(-110, -27, 220, 54, 22);
    this.headerBadge.fill();
  }

  private render(snapshot: SessionStateSnapshot): void {
    if (
      !this.titleLabel
      || !this.summaryLabel
      || !this.detailLabel
      || !this.recordLabel
      || !this.primaryLabel
      || !this.secondaryLabel
      || !this.secondaryButton
    ) {
      return;
    }

    if (snapshot.phase === 'playing') {
      this.node.active = false;
      return;
    }

    this.node.active = true;
    this.titleLabel.color = new Color(90, 58, 35, 255);
    this.summaryLabel.color = new Color(120, 77, 47, 255);
    this.detailLabel.color = new Color(97, 65, 42, 255);
    this.recordLabel.color = new Color(144, 99, 61, 255);
    this.primaryLabel.color = Color.WHITE;
    this.secondaryLabel.color = Color.WHITE;

    const earnedStars = snapshot.phase === 'levelComplete' ? snapshot.result.earnedStars : snapshot.result.bestStars;
    this.renderStars(earnedStars);

    if (snapshot.phase === 'levelComplete') {
      this.titleLabel.string = '通关成功';
      this.summaryLabel.string = `${snapshot.levelName}\n完成 ${snapshot.stats.served}/${snapshot.stats.total}  流失 ${snapshot.stats.missed}`;
      this.detailLabel.string = `本局分数 ${snapshot.result.score}\n累计星级 ${this.formatStars(snapshot.result.earnedStars)}`;
      this.recordLabel.string = `最佳分数 ${Math.max(snapshot.result.bestScore, snapshot.result.score)}  最佳星级 ${this.formatStars(Math.max(snapshot.result.bestStars, snapshot.result.earnedStars))}`;
      this.primaryLabel.string = '重新开始';
      this.secondaryLabel.string = snapshot.result.hasNextLevel ? '下一关' : '已通关';
      this.secondaryButton.active = snapshot.result.hasNextLevel;
      return;
    }

    this.titleLabel.string = '没有可移动步骤';
    this.summaryLabel.string = `${snapshot.levelName}\n已完成 ${snapshot.stats.served}/${snapshot.stats.total}  剩余 ${snapshot.stats.remaining}`;
    this.detailLabel.string = `本局分数 ${snapshot.result.score}\n还差 ${snapshot.stats.remaining} 位顾客`;
    this.recordLabel.string = `最佳分数 ${snapshot.result.bestScore}  最佳星级 ${this.formatStars(snapshot.result.bestStars)}`;
    this.primaryLabel.string = '重新开始';
    this.secondaryLabel.string = '再洗一局';
    this.secondaryButton.active = true;
  }

  private renderStars(stars: number): void {
    const clampedStars = Math.max(0, Math.min(3, Math.floor(stars)));
    this.starSprites.forEach((sprite, index) => {
      sprite.color = index < clampedStars ? Color.WHITE : new Color(220, 200, 170, 255);
    });
  }

  private formatStars(stars: number): string {
    const clampedStars = Math.max(0, Math.min(3, Math.floor(stars)));
    return `${clampedStars}/3`;
  }

  private applySprite(sprite: Sprite, key: string): void {
    const cached = this.spriteFrameLoader.get(key);
    if (cached !== undefined) {
      sprite.spriteFrame = cached;
      return;
    }

    sprite.spriteFrame = null;
    this.spriteFrameLoader.load(key, (frame) => {
      if (!frame) {
        console.warn('[SettlementOverlayView] Failed to load sprite', key);
        return;
      }

      sprite.spriteFrame = frame;
    });
  }

  private async handleRestartTap(event: EventTouch): Promise<void> {
    event.propagationStopped = true;
    if (!this.restartHandler) {
      return;
    }

    await this.restartHandler();
  }

  private async handleNextLevelTap(event: EventTouch): Promise<void> {
    event.propagationStopped = true;
    if (!this.session || !this.nextLevelHandler) {
      return;
    }

    if (this.session.getSnapshot().phase === 'levelComplete') {
      await this.nextLevelHandler();
      return;
    }

    await this.restartHandler?.();
  }
}
