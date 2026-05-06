import {
  _decorator,
  Color,
  EventTouch,
  Graphics,
  Label,
  Layers,
  Node,
  Prefab,
  Sprite,
  UITransform,
  Vec3,
} from 'cc';

import type { SessionLevelSummary } from '../game/session/GameSession';
import { DialogController } from '../lbspace/components/DialogController';
import { VirtualList, VirtualListLayoutType } from '../lbspace/components/VirtualList';
import { SpriteFrameLoader } from '../infra/SpriteFrameLoader';

const { ccclass } = _decorator;

const OVERLAY_WIDTH = 750;
const OVERLAY_HEIGHT = 1334;
const PANEL_WIDTH = 620;
const PANEL_HEIGHT = 824;

interface GraphicsNodeRefs {
  node: Node;
  graphics: Graphics | null;
}

@ccclass('LevelSelectOverlayController')
export class LevelSelectOverlayController extends DialogController {
  private readonly spriteFrameLoader = new SpriteFrameLoader();
  private scaffoldReady = false;
  private backdrop: Graphics | null = null;
  private panel: Graphics | null = null;
  private titleLabel: Label | null = null;
  private subtitleLabel: Label | null = null;
  private closeLabel: Label | null = null;
  private currentSummaryLabel: Label | null = null;
  private starsSummaryLabel: Label | null = null;
  private closeButton: Node | null = null;
  private listRoot: Node | null = null;
  private virtualList: VirtualList | null = null;
  private levelHandler: ((levelId: number) => Promise<void>) | null = null;
  private closeHandler: (() => void) | null = null;
  private levels: SessionLevelSummary[] = [];

  protected static _getPrefab(): Prefab | null {
    return null;
  }

  protected onLoad(): void {
    this.ensureScaffold();
  }

  public bind(levelHandler: (levelId: number) => Promise<void>, closeHandler: () => void): void {
    this.levelHandler = levelHandler;
    this.closeHandler = closeHandler;
  }

  public open(levels: SessionLevelSummary[]): void {
    this.ensureScaffold();
    this.levels = [...levels].sort((a, b) => a.levelId - b.levelId);
    this.updateSummary();
    this.initVirtualList();
    super.open();
  }

  protected _open(): void {
    // 父类处理动画
  }

  private ensureScaffold(): void {
    if (this.scaffoldReady) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);

    const backdropRefs = this.bindOrCreateGraphicsNode(this.node, 'LevelSelectBackdrop', Vec3.ZERO, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    this.backdrop = backdropRefs.graphics;
    if (this.backdrop) {
      this.backdrop.clear();
      this.backdrop.fillColor = new Color(67, 43, 26, 168);
      this.backdrop.rect(-OVERLAY_WIDTH / 2, -OVERLAY_HEIGHT / 2, OVERLAY_WIDTH, OVERLAY_HEIGHT);
      this.backdrop.fill();
    }
    const backdropNode = backdropRefs.node;
    backdropNode.on(Node.EventType.TOUCH_END, () => this.close());
    this.mask = backdropNode;

    const panelRefs = this.bindOrCreateGraphicsNode(this.node, 'LevelSelectPanel', Vec3.ZERO, PANEL_WIDTH, PANEL_HEIGHT);
    this.panel = panelRefs.graphics;
    const panelNode = panelRefs.node;
    this.content = panelNode;

    if (this.panel) {
      this.panel.clear();
      this.panel.fillColor = new Color(255, 249, 240, 255);
      this.panel.roundRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 34);
      this.panel.fill();
      this.panel.fillColor = new Color(233, 204, 164, 255);
      this.panel.roundRect(-PANEL_WIDTH / 2 + 12, -PANEL_HEIGHT / 2 + 12, PANEL_WIDTH - 24, PANEL_HEIGHT - 24, 28);
      this.panel.fill();
      this.panel.fillColor = new Color(255, 244, 226, 255);
      this.panel.roundRect(-PANEL_WIDTH / 2 + 26, 182, PANEL_WIDTH - 52, 90, 24);
      this.panel.fill();
      this.panel.fillColor = new Color(255, 250, 243, 255);
      this.panel.roundRect(-PANEL_WIDTH / 2 + 26, -PANEL_HEIGHT / 2 + 46, PANEL_WIDTH - 52, 66, 22);
      this.panel.fill();
    }

    this.titleLabel = this.createLabel(panelNode, 'LevelSelectTitle', new Vec3(0, 246, 0), 30, 36, 320, 48);
    this.titleLabel.string = '选择关卡';
    this.titleLabel.color = new Color(90, 58, 35, 255);

    this.subtitleLabel = this.createLabel(panelNode, 'LevelSelectSubtitle', new Vec3(0, 212, 0), 16, 20, 360, 28);
    this.subtitleLabel.string = '查看进度并切换当前挑战';
    this.subtitleLabel.color = new Color(143, 101, 67, 255);

    const closeRefs = this.bindOrCreateGraphicsNode(panelNode, 'LevelSelectCloseButton', new Vec3(202, 236, 0), 56, 56);
    this.closeButton = closeRefs.node;
    if (closeRefs.graphics) {
      closeRefs.graphics.clear();
      closeRefs.graphics.fillColor = new Color(189, 128, 59, 255);
      closeRefs.graphics.circle(0, 0, 28);
      closeRefs.graphics.fill();
    }
    this.closeButton.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      this.close();
    });

    this.closeLabel = this.createLabel(this.closeButton, 'LevelSelectCloseLabel', Vec3.ZERO, 26, 32, 56, 56);
    this.closeLabel.string = '×';
    this.closeLabel.color = Color.WHITE;

    this.listRoot = panelNode.getChildByName('LevelSelectList') ?? new Node('LevelSelectList');
    if (!this.listRoot.parent) {
      this.listRoot.parent = panelNode;
    }
    this.listRoot.layer = Layers.Enum.UI_2D;
    this.listRoot.setPosition(new Vec3(0, 36, 0));
    const listTransform = this.listRoot.getComponent(UITransform) ?? this.listRoot.addComponent(UITransform);
    listTransform.setContentSize(PANEL_WIDTH - 72, PANEL_HEIGHT - 344);

    this.virtualList = this.listRoot.getComponent(VirtualList) ?? this.listRoot.addComponent(VirtualList);

    const currentFooter = this.createFooterBadge(panelNode, 'LevelSelectCurrentSummary', new Vec3(-130, -372, 0), '当前');
    this.currentSummaryLabel = this.createLabel(currentFooter, 'LevelSelectCurrentSummaryLabel', new Vec3(28, 0, 0), 16, 20, 160, 24);
    this.currentSummaryLabel.color = new Color(116, 79, 48, 255);
    this.currentSummaryLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    const starsFooter = this.createFooterBadge(panelNode, 'LevelSelectStarsSummary', new Vec3(126, -372, 0), '星级');
    this.starsSummaryLabel = this.createLabel(starsFooter, 'LevelSelectStarsSummaryLabel', new Vec3(28, 0, 0), 16, 20, 160, 24);
    this.starsSummaryLabel.color = new Color(171, 108, 44, 255);
    this.starsSummaryLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    this.scaffoldReady = true;
  }

  private initVirtualList(): void {
    if (!this.virtualList) return;

    this.virtualList.layoutType = VirtualListLayoutType.GridVertical;
    this.virtualList.paddingTop = 20;
    this.virtualList.paddingLeft = 24;
    this.virtualList.spacingX = 20;
    this.virtualList.spacingY = 20;
    this.virtualList.paddingBottom = 20;
    this.virtualList.paddingRight = 24;

    this.virtualList.init(
      (rect, index) => {
        rect.width = 110;
        rect.height = 102;
      },
      (node, index) => {
        this.updateLevelButton(node, this.levels[index]);
      },
      (node, index) => {
        this.handleLevelTap(this.levels[index]);
      },
    );

    this.virtualList.num = this.levels.length;
  }

  private updateSummary(): void {
    if (!this.currentSummaryLabel || !this.starsSummaryLabel) return;

    const currentLevel = this.levels.find((level) => level.isCurrent)?.levelId ?? 1;
    const totalStars = this.levels.reduce((sum, level) => sum + level.stars, 0);
    const maxStars = this.levels.length * 3;

    this.currentSummaryLabel.string = `当前: 第${currentLevel}关`;
    this.starsSummaryLabel.string = `${totalStars} / ${maxStars}`;
  }

  private updateLevelButton(node: Node, level: SessionLevelSummary): void {
    node.destroyAllChildren();

    const shadow = node.addComponent(Graphics);
    shadow.fillColor = new Color(111, 82, 55, 24);
    shadow.roundRect(-50, -43, 100, 92, 22);
    shadow.fill();

    const frameNode = new Node('Frame');
    frameNode.layer = Layers.Enum.UI_2D;
    frameNode.parent = node;
    frameNode.setPosition(new Vec3(0, 2, 0));
    const frameTransform = frameNode.addComponent(UITransform);
    frameTransform.setContentSize(104, 96);
    const frameGraphics = frameNode.addComponent(Graphics);
    frameGraphics.fillColor = level.isCurrent
      ? new Color(255, 233, 197, 255)
      : level.unlocked
        ? new Color(248, 238, 226, 255)
        : new Color(220, 213, 206, 255);
    frameGraphics.roundRect(-52, -48, 104, 96, 24);
    frameGraphics.fill();
    frameGraphics.fillColor = level.isCurrent
      ? new Color(220, 151, 72, 255)
      : level.unlocked
        ? new Color(189, 128, 59, 255)
        : new Color(152, 136, 118, 255);
    frameGraphics.roundRect(-46, -42, 92, 84, 20);
    frameGraphics.fill();

    const numberLabel = this.createLabel(node, `LevelButtonLabel-${level.levelId}`, new Vec3(0, 28, 0), 22, 28, 88, 28);
    numberLabel.string = `Lv.${level.levelId}`;
    numberLabel.color = Color.WHITE;

    const nameLabel = this.createLabel(node, `LevelButtonName-${level.levelId}`, new Vec3(0, 4, 0), 11, 15, 88, 26);
    nameLabel.string = level.unlocked ? level.levelName : '未解锁';
    nameLabel.color = new Color(255, 245, 232, 255);

    if (level.unlocked) {
      this.createStarsRow(node, level);
      const scoreLabel = this.createLabel(node, `LevelButtonScore-${level.levelId}`, new Vec3(0, -30, 0), 11, 14, 88, 16);
      scoreLabel.string = `${level.score}`;
      scoreLabel.color = new Color(255, 236, 158, 255);
    } else {
      const metaLabel = this.createLabel(node, `LevelButtonMeta-${level.levelId}`, new Vec3(0, -26, 0), 10, 14, 88, 20);
      metaLabel.string = '需要推进前序';
      metaLabel.color = new Color(231, 220, 204, 255);
    }

    if (level.isCurrent) {
      const currentTag = this.createTag(node, 'CurrentTag', new Vec3(0, 52, 0), 64, 20, new Color(255, 244, 219, 255));
      const currentLabel = this.createLabel(currentTag, 'CurrentTagLabel', Vec3.ZERO, 10, 12, 60, 18);
      currentLabel.string = '当前';
      currentLabel.color = new Color(186, 112, 33, 255);
    }
  }

  private createStarsRow(parent: Node, level: SessionLevelSummary): void {
    const row = new Node(`StarRow-${level.levelId}`);
    row.layer = Layers.Enum.UI_2D;
    row.parent = parent;
    row.setPosition(new Vec3(0, -12, 0));
    const transform = row.addComponent(UITransform);
    transform.setContentSize(88, 16);

    for (let index = 0; index < 3; index++) {
      const starNode = new Node(`Star-${index}`);
      starNode.layer = Layers.Enum.UI_2D;
      starNode.parent = row;
      starNode.setPosition(new Vec3((index - 1) * 18, 0, 0));
      const starTransform = starNode.addComponent(UITransform);
      starTransform.setContentSize(14, 14);
      const sprite = starNode.addComponent(Sprite);
      sprite.type = Sprite.Type.SIMPLE;
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.color = index < level.stars ? Color.WHITE : new Color(216, 186, 144, 255);
      this.applySprite(sprite, 'ui/star');
    }
  }

  private handleLevelTap(level: SessionLevelSummary): void {
    if (!level.unlocked || !this.levelHandler) {
      return;
    }

    void this.levelHandler(level.levelId).then(() => {
      this.close();
    });
  }

  private createTag(parent: Node, name: string, position: Vec3, width: number, height: number, color: Color): Node {
    const refs = this.bindOrCreateGraphicsNode(parent, name, position, width, height);
    if (refs.graphics) {
      refs.graphics.clear();
      refs.graphics.fillColor = color;
      refs.graphics.roundRect(-width / 2, -height / 2, width, height, 10);
      refs.graphics.fill();
    }
    return refs.node;
  }

  private createFooterBadge(parent: Node, name: string, position: Vec3, icon: string): Node {
    const refs = this.bindOrCreateGraphicsNode(parent, name, position, 190, 28);
    const iconLabel = this.createLabel(refs.node, `${name}Icon`, new Vec3(-56, 0, 0), 18, 22, 24, 24);
    iconLabel.string = icon;
    return refs.node;
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

  private createLabel(
    parent: Node,
    name: string,
    position: Vec3,
    fontSize: number,
    lineHeight: number,
    width: number,
    height: number,
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

  private applySprite(sprite: Sprite, key: string): void {
    const cached = this.spriteFrameLoader.get(key);
    if (cached !== undefined) {
      sprite.spriteFrame = cached;
      return;
    }

    sprite.spriteFrame = null;
    this.spriteFrameLoader.load(key, (frame) => {
      if (!frame) {
        console.warn('[LevelSelectOverlayView] Failed to load sprite', key);
        return;
      }

      sprite.spriteFrame = frame;
    });
  }
}
