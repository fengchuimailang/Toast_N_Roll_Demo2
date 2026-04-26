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

const BAR_WIDTH = 660;
const BAR_HEIGHT = 168;
const BUTTON_Y = 16;

type ToolType = 'remove' | 'shuffle' | 'magnet';

interface ToolSpec {
  toolType: ToolType;
  imageKey: string;
  centerX: number;
  nodeName: string;
  title: string;
  subtitle: string;
}

interface ToolButtonRefs {
  buttonNode: Node;
  iconSprite: Sprite;
  badgeSprite: Sprite;
  titleLabel: Label;
  subtitleLabel: Label;
  frameGraphics: Graphics;
  shadowGraphics: Graphics;
}

const TOOL_SPECS: ToolSpec[] = [
  {
    toolType: 'remove',
    imageKey: 'tool/tool_remove_badge',
    centerX: -188,
    nodeName: 'ToolButtonRemove',
    title: '去除',
    subtitle: '点选移除',
  },
  {
    toolType: 'shuffle',
    imageKey: 'tool/tool_shuffle_badge',
    centerX: 0,
    nodeName: 'ToolButtonShuffle',
    title: '洗牌',
    subtitle: '重置盘面',
  },
  {
    toolType: 'magnet',
    imageKey: 'tool/tool_attract_badge',
    centerX: 188,
    nodeName: 'ToolButtonMagnet',
    title: '磁力',
    subtitle: '同阶合成',
  },
];

@ccclass('ToolBarView')
export class ToolBarView extends Component {
  private background: Graphics | null = null;
  private readonly spriteFrameLoader = new SpriteFrameLoader();
  private readonly toolButtons = new Map<ToolType, ToolButtonRefs>();
  private session: GameSession | null = null;
  private unsubscribe: (() => void) | null = null;

  protected onLoad(): void {
    this.ensureScaffold();
  }

  protected onDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  public bind(session: GameSession): void {
    this.session = session;
    this.unsubscribe?.();
    this.unsubscribe = session.subscribe((event) => this.handleSessionEvent(event));
    this.ensureScaffold();
    this.render(session.getSnapshot());
  }

  private handleSessionEvent(event: SessionEvent): void {
    this.render(event.snapshot);
  }

  private ensureScaffold(): void {
    if (this.background) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(BAR_WIDTH, BAR_HEIGHT);

    this.background = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
    this.draw();

    TOOL_SPECS.forEach((spec) => this.bindOrCreateToolButton(spec));
  }

  private draw(): void {
    if (!this.background) {
      return;
    }

    this.background.clear();
    this.background.fillColor = new Color(140, 113, 84, 24);
    TOOL_SPECS.forEach((spec) => {
      this.background?.ellipse(spec.centerX, -46, 74, 14);
      this.background?.fill();
    });
  }

  private bindOrCreateToolButton(spec: ToolSpec): void {
    if (this.toolButtons.has(spec.toolType)) {
      return;
    }

    const buttonNode = this.node.getChildByName(spec.nodeName) ?? this.createToolButton(spec);
    buttonNode.layer = Layers.Enum.UI_2D;
    buttonNode.setPosition(new Vec3(spec.centerX, BUTTON_Y, 0));
    const buttonTransform = buttonNode.getComponent(UITransform) ?? buttonNode.addComponent(UITransform);
    buttonTransform.setContentSize(132, 136);

    const shadowNode = buttonNode.getChildByName('Shadow') ?? this.createGraphicsChild(buttonNode, 'Shadow', new Vec3(0, -6, 0), 126, 122);
    const shadowGraphics = shadowNode.getComponent(Graphics) ?? shadowNode.addComponent(Graphics);

    const frameNode = buttonNode.getChildByName('Frame') ?? this.createGraphicsChild(buttonNode, 'Frame', Vec3.ZERO, 126, 122);
    const frameGraphics = frameNode.getComponent(Graphics) ?? frameNode.addComponent(Graphics);

    const iconNode = buttonNode.getChildByName('Icon') ?? this.createSpriteChild(buttonNode, 'Icon', new Vec3(0, 16, 0), 104, 96);
    const iconSprite = iconNode.getComponent(Sprite) ?? iconNode.addComponent(Sprite);
    iconSprite.type = Sprite.Type.SIMPLE;
    iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const badgeNode = buttonNode.getChildByName('Badge') ?? this.createSpriteChild(buttonNode, 'Badge', new Vec3(30, 38, 0), 56, 28);
    const badgeSprite = badgeNode.getComponent(Sprite) ?? badgeNode.addComponent(Sprite);
    badgeSprite.type = Sprite.Type.SIMPLE;
    badgeSprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const titleLabel = this.bindOrCreateLabel(buttonNode, 'Title', new Vec3(0, -24, 0), 20, 24, 110, 28);
    const subtitleLabel = this.bindOrCreateLabel(buttonNode, 'Subtitle', new Vec3(0, -48, 0), 12, 16, 112, 18);
    titleLabel.string = spec.title;
    subtitleLabel.string = spec.subtitle;

    buttonNode.off(Node.EventType.TOUCH_END);
    buttonNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      this.handleToolTap(spec.toolType);
    });

    this.toolButtons.set(spec.toolType, {
      buttonNode,
      iconSprite,
      badgeSprite,
      titleLabel,
      subtitleLabel,
      frameGraphics,
      shadowGraphics,
    });

    this.applySprite(iconSprite, spec.imageKey);
    badgeSprite.node.active = false;
  }

  private createToolButton(spec: ToolSpec): Node {
    const buttonNode = new Node(spec.nodeName);
    buttonNode.layer = Layers.Enum.UI_2D;
    buttonNode.parent = this.node;
    return buttonNode;
  }

  private createGraphicsChild(parent: Node, name: string, position: Vec3, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(position);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    node.addComponent(Graphics);
    return node;
  }

  private createSpriteChild(parent: Node, name: string, position: Vec3, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(position);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    node.addComponent(Sprite);
    return node;
  }

  private bindOrCreateLabel(
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

  private render(snapshot: SessionStateSnapshot): void {
    this.ensureScaffold();
    TOOL_SPECS.forEach((spec) => {
      const refs = this.toolButtons.get(spec.toolType);
      if (!refs) {
        return;
      }

      const isPhaseEnabled = snapshot.phase === 'playing' || (spec.toolType === 'shuffle' && snapshot.phase === 'gameOver');
      const isSelected = snapshot.toolMode === spec.toolType;
      this.drawToolButton(refs, isSelected, isPhaseEnabled);

      refs.buttonNode.scale = isSelected ? new Vec3(1.04, 1.04, 1) : Vec3.ONE;
      refs.buttonNode.opacity = isPhaseEnabled ? 255 : 148;
      refs.iconSprite.color = isPhaseEnabled ? Color.WHITE : new Color(188, 176, 165, 255);
      refs.badgeSprite.color = isPhaseEnabled ? Color.WHITE : new Color(205, 193, 181, 255);
      refs.titleLabel.color = isSelected ? new Color(122, 76, 38, 255) : new Color(104, 71, 45, 255);
      refs.subtitleLabel.color = isSelected ? new Color(171, 108, 44, 255) : new Color(142, 109, 79, 255);
      refs.badgeSprite.node.active = snapshot.phase === 'playing';
    });
  }

  private drawToolButton(refs: ToolButtonRefs, isSelected: boolean, isEnabled: boolean): void {
    refs.shadowGraphics.clear();
    refs.shadowGraphics.fillColor = isEnabled ? new Color(123, 88, 57, 30) : new Color(108, 102, 94, 18);
    refs.shadowGraphics.roundRect(-60, -56, 120, 112, 28);
    refs.shadowGraphics.fill();

    refs.frameGraphics.clear();
    refs.frameGraphics.fillColor = isSelected
      ? new Color(255, 235, 198, 255)
      : isEnabled
        ? new Color(250, 241, 226, 255)
        : new Color(229, 223, 215, 255);
    refs.frameGraphics.roundRect(-63, -61, 126, 122, 30);
    refs.frameGraphics.fill();
    refs.frameGraphics.fillColor = isSelected
      ? new Color(235, 190, 117, 255)
      : isEnabled
        ? new Color(224, 204, 177, 255)
        : new Color(201, 193, 183, 255);
    refs.frameGraphics.roundRect(-55, -53, 110, 106, 26);
    refs.frameGraphics.fill();
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
        console.warn('[ToolBarView] Failed to load tool sprite', key);
        return;
      }

      sprite.spriteFrame = frame;
    });
  }

  private handleToolTap(toolType: ToolType): void {
    if (!this.session) {
      return;
    }

    switch (toolType) {
      case 'remove':
        this.session.activateRemoveTool();
        return;
      case 'shuffle':
        this.session.useShuffle();
        return;
      case 'magnet':
        this.session.activateMagnetTool();
        return;
    }
  }
}
