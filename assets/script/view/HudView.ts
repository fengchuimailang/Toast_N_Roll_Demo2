import {
  _decorator,
  Color,
  Component,
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
  type SessionCustomerSnapshot,
  type SessionEvent,
  type SessionStateSnapshot,
} from '../game/session/GameSession';
import { SpriteFrameLoader } from '../infra/SpriteFrameLoader';

const { ccclass } = _decorator;

const HUD_WIDTH = 660;
const HUD_HEIGHT = 232;
const PADDING = 24;
const HEADER_PANEL_Y = 28;
const HEADER_PANEL_HEIGHT = 40;
const CUSTOMER_CARD_WIDTH = 184;
const CUSTOMER_CARD_HEIGHT = 82;
const CUSTOMER_CARD_Y = -58;
const CUSTOMER_CARD_CENTERS = [-210, 0, 210];

type FlavorKey = SessionCustomerSnapshot['demand']['type'];

interface CustomerCardRefs {
  avatarSprite: Sprite;
  demandIcon: Sprite;
  demandLabel: Label;
  demandCountLabel: Label;
  rewardLabel: Label;
  rewardIcon: Sprite;
  patienceLabel: Label;
  patienceIcon: Sprite;
  patienceFill: Graphics;
}

const FLAVOR_LABELS: Record<FlavorKey, string> = {
  original: '原味',
  matcha: '抹茶',
  strawberry: '草莓',
};

const FLAVOR_COLORS: Record<FlavorKey, Color> = {
  original: new Color(196, 145, 94, 255),
  matcha: new Color(122, 161, 101, 255),
  strawberry: new Color(214, 120, 128, 255),
};

function imagePathToResourceKey(imagePath: string): string {
  return imagePath
    .replace('/assets/', '')
    .replace(/\.png$/i, '')
    .replace(/\.jpg$/i, '')
    .replace(/\.jpeg$/i, '');
}

function getDemandSpriteKey(flavor: FlavorKey): string {
  return `ingredients/block_toast_${flavor}`;
}

function getPatienceColor(percent: number, fallback: Color): Color {
  if (percent <= 0.34) {
    return new Color(210, 96, 74, 255);
  }

  if (percent <= 0.67) {
    return new Color(223, 164, 74, 255);
  }

  return fallback;
}

@ccclass('HudView')
export class HudView extends Component {
  private session: GameSession | null = null;
  private unsubscribe: (() => void) | null = null;
  private background: Graphics | null = null;
  private titleLabel: Label | null = null;
  private summaryLabel: Label | null = null;
  private customerCards: CustomerCardRefs[] = [];
  private readonly spriteFrameLoader = new SpriteFrameLoader();

  protected onDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  public bind(session: GameSession): void {
    this.session = session;
    this.ensureScaffold();
    this.unsubscribe?.();
    this.unsubscribe = this.session.subscribe((event) => this.handleSessionEvent(event));
    this.render(this.session.getSnapshot());
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
    transform.setContentSize(HUD_WIDTH, HUD_HEIGHT);

    this.background = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
    this.titleLabel = this.bindOrCreateLabelNode('HudTitle', new Vec3(12, 36, 0), 20, 24, Label.HorizontalAlign.CENTER).getComponent(Label);
    this.summaryLabel = this.bindOrCreateLabelNode('HudSummary', new Vec3(0, 8, 0), 12, 16, Label.HorizontalAlign.CENTER).getComponent(Label);

    this.customerCards = CUSTOMER_CARD_CENTERS.map((centerX, index) => this.bindOrCreateCustomerCard(index, centerX));
    this.drawPanel();
  }

  private drawPanel(): void {
    if (!this.background) {
      return;
    }

    this.background.clear();
    this.background.fillColor = new Color(255, 249, 240, 255);
    this.background.roundRect(-HUD_WIDTH / 2, -HUD_HEIGHT / 2, HUD_WIDTH, HUD_HEIGHT, 34);
    this.background.fill();

    this.background.fillColor = new Color(233, 204, 164, 255);
    this.background.roundRect(-HUD_WIDTH / 2 + 10, -HUD_HEIGHT / 2 + 10, HUD_WIDTH - 20, HUD_HEIGHT - 20, 28);
    this.background.fill();

    this.background.fillColor = new Color(255, 248, 236, 255);
    this.background.roundRect(-HUD_WIDTH / 2 + 22, HEADER_PANEL_Y - HEADER_PANEL_HEIGHT / 2, HUD_WIDTH - 44, HEADER_PANEL_HEIGHT, 20);
    this.background.fill();

    this.background.fillColor = new Color(241, 228, 208, 255);
    this.background.roundRect(-108, HEADER_PANEL_Y - 18, 216, 36, 14);
    this.background.fill();

    for (let index = 0; index < CUSTOMER_CARD_CENTERS.length; index++) {
      const x = CUSTOMER_CARD_CENTERS[index] - CUSTOMER_CARD_WIDTH / 2;
      this.background.fillColor = new Color(255, 247, 235, 255);
      this.background.roundRect(x, CUSTOMER_CARD_Y - CUSTOMER_CARD_HEIGHT / 2, CUSTOMER_CARD_WIDTH, CUSTOMER_CARD_HEIGHT, 18);
      this.background.fill();

      this.background.fillColor = new Color(233, 214, 186, 255);
      this.background.roundRect(
        x + 5,
        CUSTOMER_CARD_Y - CUSTOMER_CARD_HEIGHT / 2 + 5,
        CUSTOMER_CARD_WIDTH - 10,
        CUSTOMER_CARD_HEIGHT - 10,
        14,
      );
      this.background.fill();

      this.background.fillColor = new Color(248, 240, 228, 255);
      this.background.circle(CUSTOMER_CARD_CENTERS[index] - 60, CUSTOMER_CARD_Y + 10, 24);
      this.background.fill();
    }
  }

  private render(snapshot: SessionStateSnapshot): void {
    this.ensureScaffold();

    if (this.titleLabel) {
      this.titleLabel.string = `${snapshot.levelName}  Lv.${snapshot.levelId ?? 1}`;
      this.titleLabel.color = new Color(90, 58, 35, 255);
    }

    if (this.summaryLabel) {
      this.summaryLabel.string = `完成 ${snapshot.stats.served}/${snapshot.stats.total}  流失 ${snapshot.stats.missed}  剩余 ${snapshot.stats.remaining}`;
      this.summaryLabel.color = new Color(120, 77, 47, 255);
    }

    this.customerCards.forEach((card, index) => {
      this.renderCustomerCard(card, snapshot.customers[index] ?? null);
    });
  }

  private renderCustomerCard(card: CustomerCardRefs, customer: SessionCustomerSnapshot | null): void {
    if (!customer) {
      card.avatarSprite.spriteFrame = null;
      card.demandIcon.spriteFrame = null;
      card.demandLabel.string = '等待中';
      card.demandCountLabel.string = '';
      card.rewardLabel.string = '';
      card.patienceLabel.string = '';
      card.rewardIcon.spriteFrame = null;
      card.patienceIcon.spriteFrame = null;
      this.drawPatience(card.patienceFill, 0, new Color(199, 180, 154, 255));
      return;
    }

    const patiencePercent = customer.maxPatience > 0
      ? Math.max(0, Math.min(1, customer.patience / customer.maxPatience))
      : 0;
    const flavor = customer.demand.type;
    const patienceColor = getPatienceColor(patiencePercent, FLAVOR_COLORS[flavor]);

    this.applySprite(card.avatarSprite, imagePathToResourceKey(customer.avatar));
    this.applySprite(card.demandIcon, getDemandSpriteKey(flavor));
    this.applySprite(card.rewardIcon, 'ui/header_coin');
    this.applySprite(card.patienceIcon, 'ui/header_hp');
    card.demandLabel.string = FLAVOR_LABELS[flavor];
    card.demandLabel.color = new Color(94, 63, 38, 255);
    card.demandCountLabel.string = `x${customer.demand.count}`;
    card.demandCountLabel.color = FLAVOR_COLORS[flavor];
    card.rewardLabel.string = `${customer.reward}`;
    card.rewardLabel.color = FLAVOR_COLORS[flavor];
    card.patienceLabel.string = `${Math.round(patiencePercent * 100)}%`;
    card.patienceLabel.color = patienceColor;
    this.drawPatience(card.patienceFill, patiencePercent, patienceColor);
  }

  private drawPatience(graphics: Graphics, percent: number, color: Color): void {
    graphics.clear();
    graphics.fillColor = new Color(236, 225, 210, 255);
    graphics.roundRect(-42, -6, 84, 12, 6);
    graphics.fill();

    if (percent <= 0) {
      return;
    }

    graphics.fillColor = color;
    graphics.roundRect(-42, -6, 84 * percent, 12, 6);
    graphics.fill();
  }

  private bindOrCreateLabelNode(
    name: string,
    position: Vec3,
    fontSize: number,
    lineHeight: number,
    align: Label.HorizontalAlign,
  ): Node {
    const labelNode = this.node.getChildByName(name) ?? new Node(name);
    if (!labelNode.parent) {
      labelNode.parent = this.node;
    }
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.setPosition(position);

    const transform = labelNode.getComponent(UITransform) ?? labelNode.addComponent(UITransform);
    transform.setContentSize(HUD_WIDTH - PADDING * 2, 44);

    const label = labelNode.getComponent(Label) ?? labelNode.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = lineHeight;
    label.horizontalAlign = align;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    return labelNode;
  }

  private bindOrCreateCustomerCard(index: number, centerX: number): CustomerCardRefs {
    const root = this.node.getChildByName(`CustomerCard-${index}`) ?? new Node(`CustomerCard-${index}`);
    if (!root.parent) {
      root.parent = this.node;
    }
    root.layer = Layers.Enum.UI_2D;
    root.setPosition(new Vec3(centerX, CUSTOMER_CARD_Y, 0));
    const rootTransform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    rootTransform.setContentSize(CUSTOMER_CARD_WIDTH, CUSTOMER_CARD_HEIGHT);

    const avatarSprite = this.bindOrCreateSprite(root, 'Avatar', new Vec3(-60, 10, 0), 48, 48);
    const demandIcon = this.bindOrCreateSprite(root, 'DemandIcon', new Vec3(-6, 14, 0), 34, 34);
    const demandLabel = this.bindOrCreateCardLabel(root, 'Demand', new Vec3(38, 18, 0), 72, 22, 15, 18, Label.HorizontalAlign.LEFT);
    const demandCountLabel = this.bindOrCreateCardLabel(root, 'DemandCount', new Vec3(42, -2, 0), 68, 20, 16, 18, Label.HorizontalAlign.LEFT);
    const rewardLabel = this.bindOrCreateCardLabel(root, 'Reward', new Vec3(12, -12, 0), 30, 18, 14, 18, Label.HorizontalAlign.LEFT);
    const rewardIcon = this.bindOrCreateSprite(root, 'RewardIcon', new Vec3(-14, -12, 0), 14, 14);
    const patienceLabel = this.bindOrCreateCardLabel(root, 'Patience', new Vec3(50, -12, 0), 34, 18, 12, 16, Label.HorizontalAlign.LEFT);
    const patienceIcon = this.bindOrCreateSprite(root, 'PatienceIcon', new Vec3(24, -12, 0), 14, 14);
    const patienceFill = this.bindOrCreateGraphics(root, 'PatienceBar', new Vec3(18, -30, 0), 92, 12);

    return {
      avatarSprite,
      demandIcon,
      demandLabel,
      demandCountLabel,
      rewardLabel,
      rewardIcon,
      patienceLabel,
      patienceIcon,
      patienceFill,
    };
  }

  private bindOrCreateSprite(parent: Node, name: string, position: Vec3, width: number, height: number): Sprite {
    const node = parent.getChildByName(name) ?? new Node(name);
    if (!node.parent) {
      node.parent = parent;
    }
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(position);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    return sprite;
  }

  private bindOrCreateGraphics(parent: Node, name: string, position: Vec3, width: number, height: number): Graphics {
    const node = parent.getChildByName(name) ?? new Node(name);
    if (!node.parent) {
      node.parent = parent;
    }
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(position);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    return node.getComponent(Graphics) ?? node.addComponent(Graphics);
  }

  private bindOrCreateCardLabel(
    parent: Node,
    name: string,
    position: Vec3,
    width: number,
    height: number,
    fontSize: number,
    lineHeight: number,
    align: Label.HorizontalAlign,
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
    label.horizontalAlign = align;
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
        console.warn('[HudView] Failed to load texture', key);
        return;
      }

      sprite.spriteFrame = frame;
    });
  }
}
