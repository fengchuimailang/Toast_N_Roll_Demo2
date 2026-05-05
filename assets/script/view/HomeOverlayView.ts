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

import type { SessionHomeSummary } from '../game/session/GameSession';
import { SpriteFrameLoader } from '../infra/SpriteFrameLoader';
import { create9SliceButtonAsync } from '../lbspace/ButtonFactory';

const { ccclass } = _decorator;

const OVERLAY_WIDTH = 750;
const OVERLAY_HEIGHT = 1334;
const AREA_COUNT = 6;

interface AreaTheme {
  key: string;
  title: string;
  flavor: string;
  description: string;
  unlockPrice: number;
  accent: Color;
  surface: Color;
  backgroundUnlocked: string;
  backgroundLocked: string;
  unlockLevel: number;
}

interface ResourceChipRefs {
  value: Label;
}

interface DotRefs {
  node: Node;
  graphics: Graphics;
  label: Label;
}

const AREA_THEMES: AreaTheme[] = [
  {
    key: 'origin',
    title: '吐司店',
    flavor: '原味吐司',
    description: '暖炉起步，经典麦香',
    unlockPrice: 0,
    accent: new Color(235, 162, 70, 255),
    surface: new Color(255, 241, 214, 255),
    backgroundUnlocked: 'bg/bg_origin',
    backgroundLocked: 'bg/bg_origin',
    unlockLevel: 1,
  },
  {
    key: 'savanna',
    title: '稀树草原',
    flavor: '芒果风味',
    description: '热风草浪，果香偏亮',
    unlockPrice: 5000,
    accent: new Color(220, 171, 64, 255),
    surface: new Color(247, 232, 188, 255),
    backgroundUnlocked: 'bg/bg_savanna_unlocked',
    backgroundLocked: 'bg/bg_savanna_locked',
    unlockLevel: 9,
  },
  {
    key: 'glacier',
    title: '冰川区',
    flavor: '刨冰风味',
    description: '冷冽高亮，空气清透',
    unlockPrice: 10000,
    accent: new Color(108, 173, 214, 255),
    surface: new Color(220, 240, 250, 255),
    backgroundUnlocked: 'bg/bg_glacier_unlocked',
    backgroundLocked: 'bg/bg_glacier_locked',
    unlockLevel: 17,
  },
  {
    key: 'rainforest',
    title: '热带雨林',
    flavor: '百香果风味',
    description: '层层叶幕，颜色饱满',
    unlockPrice: 20000,
    accent: new Color(96, 161, 86, 255),
    surface: new Color(220, 242, 210, 255),
    backgroundUnlocked: 'bg/bg_rainforest_unlocked',
    backgroundLocked: 'bg/bg_rainforest_locked',
    unlockLevel: 25,
  },
  {
    key: 'desert',
    title: '沙漠区',
    flavor: '沙棘果风味',
    description: '高温金砂，轮廓干净',
    unlockPrice: 40000,
    accent: new Color(201, 133, 74, 255),
    surface: new Color(247, 223, 190, 255),
    backgroundUnlocked: 'bg/bg_desert_unlocked',
    backgroundLocked: 'bg/bg_desert_locked',
    unlockLevel: 33,
  },
  {
    key: 'bamboo',
    title: '川渝竹林',
    flavor: '麻辣风味',
    description: '纵深竹影，辣味收尾',
    unlockPrice: 80000,
    accent: new Color(89, 150, 86, 255),
    surface: new Color(221, 240, 214, 255),
    backgroundUnlocked: 'bg/bg_bamboo_unlocked',
    backgroundLocked: 'bg/bg_bamboo_locked',
    unlockLevel: 41,
  },
];

@ccclass('HomeOverlayView')
export class HomeOverlayView extends Component {
  private readonly spriteFrameLoader = new SpriteFrameLoader();

  private summary: SessionHomeSummary | null = null;
  private selectedAreaIndex = 0;

  private backgroundSprite: Sprite | null = null;
  private titleLabel: Label | null = null;
  private subtitleLabel: Label | null = null;
  private areaTagLabel: Label | null = null;
  private flavorTagLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private currentLevelLabel: Label | null = null;
  private currentLevelNameLabel: Label | null = null;
  private unlockedLabel: Label | null = null;
  private starsLabel: Label | null = null;
  private startButtonLabel: Label | null = null;
  private levelButtonLabel: Label | null = null;
  private tutorialButtonLabel: Label | null = null;
  private settingsButtonLabel: Label | null = null;
  private bakerySignLabel: Label | null = null;
  private bakeryFlavorLabel: Label | null = null;

  private levelChip: ResourceChipRefs | null = null;
  private coinChip: ResourceChipRefs | null = null;
  private energyChip: ResourceChipRefs | null = null;
  private giftChip: ResourceChipRefs | null = null;

  private startButtonNode: Node | null = null;
  private dotRefs: DotRefs[] = [];
  private leftArrowNode: Node | null = null;
  private rightArrowNode: Node | null = null;
  private bakeryFrameNode: Node | null = null;
  private bakeryFrameGraphics: Graphics | null = null;
  private bakerySignNode: Node | null = null;
  private bakerySignGraphics: Graphics | null = null;
  private bakeryRoofGraphics: Graphics | null = null;
  private bakeryDoorLeftGraphics: Graphics | null = null;
  private bakeryDoorRightGraphics: Graphics | null = null;
  private bakeryBaseGraphics: Graphics | null = null;
  private foregroundLeafGraphics: Graphics | null = null;
  private areaHeaderGraphics: Graphics | null = null;
  private lockRootNode: Node | null = null;
  private lockBodyGraphics: Graphics | null = null;
  private lockShackleGraphics: Graphics | null = null;
  private lockPriceLabel: Label | null = null;
  private lockPriceIcon: Sprite | null = null;

  private startHandler: (() => Promise<void>) | null = null;
  private levelSelectHandler: (() => void) | null = null;
  private tutorialHandler: (() => Promise<void>) | null = null;
  private settingsHandler: (() => void) | null = null;

  protected onLoad(): void {
    this.ensureScaffold();
    this.node.active = false;
  }

  public bind(
    startHandler: () => Promise<void>,
    levelSelectHandler: () => void,
    tutorialHandler: () => Promise<void>,
    settingsHandler: () => void,
  ): void {
    this.startHandler = startHandler;
    this.levelSelectHandler = levelSelectHandler;
    this.tutorialHandler = tutorialHandler;
    this.settingsHandler = settingsHandler;
    this.ensureScaffold();
  }

  public open(summary: SessionHomeSummary): void {
    this.ensureScaffold();
    this.summary = summary;
    this.selectedAreaIndex = this.getCurrentAreaIndex(summary.currentLevel);
    this.render();
    this.node.active = true;
  }

  public close(): void {
    this.node.active = false;
  }

  private ensureScaffold(): void {
    if (this.backgroundSprite && this.titleLabel && this.subtitleLabel && this.startButtonLabel) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);

    const backgroundNode = this.bindOrCreateSpriteNode(this.node, 'HomeBackground', Vec3.ZERO, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    this.backgroundSprite = backgroundNode.getComponent(Sprite) ?? backgroundNode.addComponent(Sprite);
    this.backgroundSprite.type = Sprite.Type.SIMPLE;
    this.backgroundSprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const overlayShade = this.bindOrCreateGraphicsNode(this.node, 'HomeShade', Vec3.ZERO, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    if (overlayShade.graphics) {
      overlayShade.graphics.clear();
      overlayShade.graphics.fillColor = new Color(41, 28, 18, 26);
      overlayShade.graphics.rect(-OVERLAY_WIDTH / 2, -OVERLAY_HEIGHT / 2, OVERLAY_WIDTH, OVERLAY_HEIGHT);
      overlayShade.graphics.fill();
    }

    const topBarNode = this.bindOrCreateGraphicsNode(this.node, 'HomeTopBar', new Vec3(0, 596, 0), 640, 76);
    if (topBarNode.graphics) {
      topBarNode.graphics.clear();
      topBarNode.graphics.fillColor = new Color(255, 248, 233, 220);
      topBarNode.graphics.roundRect(-320, -38, 640, 76, 28);
      topBarNode.graphics.fill();
    }

    this.levelChip = this.createResourceChip(topBarNode.node, 'HomeLevelChip', new Vec3(-222, 0, 0), '关', new Color(240, 170, 73, 255));
    this.coinChip = this.createResourceChip(topBarNode.node, 'HomeCoinChip', new Vec3(-68, 0, 0), '币', new Color(251, 194, 54, 255));
    this.energyChip = this.createResourceChip(topBarNode.node, 'HomeEnergyChip', new Vec3(82, 0, 0), '力', new Color(119, 198, 87, 255));
    this.giftChip = this.createResourceChip(topBarNode.node, 'HomeGiftChip', new Vec3(232, 0, 0), '礼', new Color(228, 153, 72, 255));

    const areaHeaderNode = this.bindOrCreateGraphicsNode(this.node, 'HomeAreaHeader', new Vec3(0, 486, 0), 520, 116);
    this.areaHeaderGraphics = areaHeaderNode.graphics;
    this.areaTagLabel = this.createLabel(areaHeaderNode.node, 'HomeAreaTag', new Vec3(0, 18, 0), 34, 40, 420, 46);
    this.areaTagLabel.color = new Color(106, 69, 45, 255);
    this.flavorTagLabel = this.createLabel(areaHeaderNode.node, 'HomeFlavorTag', new Vec3(0, -20, 0), 18, 22, 360, 26);
    this.flavorTagLabel.color = new Color(135, 93, 66, 255);
    this.statusLabel = this.createLabel(areaHeaderNode.node, 'HomeStatusTag', new Vec3(0, -56, 0), 16, 20, 360, 24);

    const sideMenuNode = this.createButton(this.node, 'HomeLevelButton', new Vec3(-338, 448, 0), new Color(255, 201, 87, 255), 82, 82, 24);
    sideMenuNode.on(Node.EventType.TOUCH_END, this.handleLevelSelectTap, this);
    this.levelButtonLabel = this.createLabel(sideMenuNode, 'HomeLevelLabel', Vec3.ZERO, 24, 28, 72, 72);
    this.levelButtonLabel.string = '关卡';
    this.levelButtonLabel.color = new Color(117, 69, 31, 255);

    const settingsButton = this.createButton(this.node, 'HomeSettingsButton', new Vec3(312, 448, 0), new Color(189, 128, 59, 255), 58, 58, 20);
    settingsButton.on(Node.EventType.TOUCH_END, this.handleSettingsTap, this);
    this.settingsButtonLabel = this.createLabel(settingsButton, 'HomeSettingsLabel', Vec3.ZERO, 26, 30, 48, 48);
    this.settingsButtonLabel.string = '设';
    this.settingsButtonLabel.color = Color.WHITE;

    this.leftArrowNode = this.createButton(this.node, 'HomePrevAreaButton', new Vec3(-298, 110, 0), new Color(255, 229, 177, 255), 72, 72, 24);
    this.leftArrowNode.on(Node.EventType.TOUCH_END, this.handlePrevAreaTap, this);
    const leftArrowLabel = this.createLabel(this.leftArrowNode, 'HomePrevAreaLabel', Vec3.ZERO, 32, 36, 60, 60);
    leftArrowLabel.string = '‹';
    leftArrowLabel.color = new Color(124, 86, 48, 255);

    this.rightArrowNode = this.createButton(this.node, 'HomeNextAreaButton', new Vec3(298, 110, 0), new Color(255, 229, 177, 255), 72, 72, 24);
    this.rightArrowNode.on(Node.EventType.TOUCH_END, this.handleNextAreaTap, this);
    const rightArrowLabel = this.createLabel(this.rightArrowNode, 'HomeNextAreaLabel', Vec3.ZERO, 32, 36, 60, 60);
    rightArrowLabel.string = '›';
    rightArrowLabel.color = new Color(124, 86, 48, 255);

    const bakeryRoot = this.bindOrCreateGraphicsNode(this.node, 'HomeBakeryRoot', new Vec3(0, 72, 0), 430, 540);
    this.bakeryFrameNode = bakeryRoot.node;

    const bakeryShadow = this.bindOrCreateGraphicsNode(bakeryRoot.node, 'BakeryShadow', new Vec3(0, -212, 0), 280, 44);
    if (bakeryShadow.graphics) {
      bakeryShadow.graphics.clear();
      bakeryShadow.graphics.fillColor = new Color(59, 41, 27, 34);
      bakeryShadow.graphics.ellipse(0, 0, 140, 22);
      bakeryShadow.graphics.fill();
    }

    const bakeryBase = this.bindOrCreateGraphicsNode(bakeryRoot.node, 'BakeryBase', new Vec3(0, -34, 0), 286, 326);
    this.bakeryBaseGraphics = bakeryBase.graphics;

    const bakeryRoof = this.bindOrCreateGraphicsNode(bakeryRoot.node, 'BakeryRoof', new Vec3(0, 56, 0), 310, 104);
    this.bakeryRoofGraphics = bakeryRoof.graphics;

    const bakerySign = this.bindOrCreateGraphicsNode(bakeryRoot.node, 'BakerySign', new Vec3(0, 154, 0), 164, 132);
    this.bakerySignNode = bakerySign.node;
    this.bakerySignGraphics = bakerySign.graphics;
    this.bakerySignLabel = this.createLabel(bakerySign.node, 'BakerySignLabel', new Vec3(0, 10, 0), 34, 40, 136, 44);
    this.bakerySignLabel.color = new Color(140, 89, 42, 255);
    this.bakeryFlavorLabel = this.createLabel(bakerySign.node, 'BakeryFlavorLabel', new Vec3(0, -34, 0), 16, 20, 132, 20);
    this.bakeryFlavorLabel.color = new Color(154, 105, 62, 255);

    const bakeryDoorLeft = this.bindOrCreateGraphicsNode(bakeryRoot.node, 'BakeryDoorLeft', new Vec3(-72, -58, 0), 112, 162);
    this.bakeryDoorLeftGraphics = bakeryDoorLeft.graphics;
    const bakeryDoorRight = this.bindOrCreateGraphicsNode(bakeryRoot.node, 'BakeryDoorRight', new Vec3(72, -58, 0), 112, 162);
    this.bakeryDoorRightGraphics = bakeryDoorRight.graphics;

    const lockRoot = this.bindOrCreateGraphicsNode(this.node, 'HomeLockRoot', new Vec3(0, 86, 0), 240, 280);
    this.lockRootNode = lockRoot.node;

    const shackleNode = this.bindOrCreateGraphicsNode(lockRoot.node, 'HomeLockShackle', new Vec3(0, 52, 0), 108, 108);
    this.lockShackleGraphics = shackleNode.graphics;

    const lockBodyNode = this.bindOrCreateGraphicsNode(lockRoot.node, 'HomeLockBody', new Vec3(0, -8, 0), 176, 150);
    this.lockBodyGraphics = lockBodyNode.graphics;

    const keyholeNode = this.bindOrCreateGraphicsNode(lockRoot.node, 'HomeLockKeyhole', new Vec3(0, -6, 0), 42, 64);
    if (keyholeNode.graphics) {
      keyholeNode.graphics.clear();
      keyholeNode.graphics.fillColor = new Color(154, 96, 45, 255);
      keyholeNode.graphics.circle(0, 14, 12);
      keyholeNode.graphics.fill();
      keyholeNode.graphics.roundRect(-8, -22, 16, 34, 8);
      keyholeNode.graphics.fill();
    }

    const priceIconNode = this.bindOrCreateSpriteNode(lockRoot.node, 'HomeLockPriceIcon', new Vec3(-44, -112, 0), 28, 28);
    this.lockPriceIcon = priceIconNode.getComponent(Sprite) ?? priceIconNode.addComponent(Sprite);
    this.lockPriceIcon.type = Sprite.Type.SIMPLE;
    this.lockPriceIcon.sizeMode = Sprite.SizeMode.CUSTOM;
    this.applySprite(this.lockPriceIcon, 'ui/header_coin');

    this.lockPriceLabel = this.createLabel(lockRoot.node, 'HomeLockPriceLabel', new Vec3(24, -112, 0), 34, 38, 150, 40);
    this.lockPriceLabel.color = Color.WHITE;

    const floorNode = this.bindOrCreateGraphicsNode(this.node, 'HomeFloor', new Vec3(0, -534, 0), OVERLAY_WIDTH, 214);
    this.foregroundLeafGraphics = floorNode.graphics;

    this.titleLabel = this.createLabel(this.node, 'HomeTitle', new Vec3(0, -416, 0), 30, 36, 380, 40);
    this.titleLabel.color = new Color(102, 66, 37, 255);

    this.subtitleLabel = this.createLabel(this.node, 'HomeSubtitle', new Vec3(0, -452, 0), 18, 22, 440, 30);
    this.subtitleLabel.color = new Color(128, 91, 58, 255);

    this.currentLevelLabel = this.createLabel(this.node, 'HomeCurrentLevel', new Vec3(0, -490, 0), 18, 22, 420, 26);
    this.currentLevelLabel.color = new Color(144, 106, 71, 255);

    this.currentLevelNameLabel = this.createLabel(this.node, 'HomeCurrentLevelName', new Vec3(0, -522, 0), 22, 26, 420, 30);
    this.currentLevelNameLabel.color = new Color(108, 74, 47, 255);

    this.startButtonNode = create9SliceButtonAsync(
      this.node,
      'HomeStartButton',
      { x: 0, y: -618 },
      330,
      92,
      new Color(255, 191, 67, 255),
      '',
      new Color(109, 68, 32, 255)
    );
    this.startButtonNode.on(Node.EventType.TOUCH_END, this.handleStartTap, this);
    this.startButtonLabel = this.createLabel(this.startButtonNode, 'HomeStartLabel', Vec3.ZERO, 30, 36, 300, 84);
    this.startButtonLabel.color = new Color(109, 68, 32, 255);

    const tutorialButton = this.createButton(this.node, 'HomeTutorialButton', new Vec3(-294, -616, 0), new Color(244, 176, 76, 255), 92, 92, 24);
    tutorialButton.on(Node.EventType.TOUCH_END, this.handleTutorialTap, this);
    this.tutorialButtonLabel = this.createLabel(tutorialButton, 'HomeTutorialLabel', new Vec3(0, -2, 0), 20, 24, 74, 68);
    this.tutorialButtonLabel.string = '教学';
    this.tutorialButtonLabel.color = new Color(117, 69, 31, 255);

    const unlockedCard = this.bindOrCreateGraphicsNode(this.node, 'UnlockedCard', new Vec3(-150, -686, 0), 136, 48);
    if (unlockedCard.graphics) {
      unlockedCard.graphics.clear();
      unlockedCard.graphics.fillColor = new Color(255, 246, 225, 215);
      unlockedCard.graphics.roundRect(-68, -24, 136, 48, 18);
      unlockedCard.graphics.fill();
    }
    this.unlockedLabel = this.createLabel(unlockedCard.node, 'UnlockedLabel', Vec3.ZERO, 16, 20, 120, 40);
    this.unlockedLabel.color = new Color(112, 80, 52, 255);

    const starsCard = this.bindOrCreateGraphicsNode(this.node, 'StarsCard', new Vec3(150, -686, 0), 136, 48);
    if (starsCard.graphics) {
      starsCard.graphics.clear();
      starsCard.graphics.fillColor = new Color(255, 246, 225, 215);
      starsCard.graphics.roundRect(-68, -24, 136, 48, 18);
      starsCard.graphics.fill();
    }
    this.starsLabel = this.createLabel(starsCard.node, 'StarsLabel', Vec3.ZERO, 16, 20, 120, 40);
    this.starsLabel.color = new Color(135, 95, 47, 255);

    for (let index = 0; index < AREA_COUNT; index += 1) {
      const dotNode = this.bindOrCreateGraphicsNode(this.node, `HomeAreaDot-${index}`, new Vec3(-75 + index * 30, -734, 0), 22, 22);
      const label = this.createLabel(dotNode.node, `HomeAreaDotLabel-${index}`, Vec3.ZERO, 10, 12, 18, 18);
      label.color = new Color(110, 84, 56, 255);
      this.dotRefs.push({
        node: dotNode.node,
        graphics: dotNode.graphics ?? dotNode.node.addComponent(Graphics),
        label,
      });
      dotNode.node.on(Node.EventType.TOUCH_END, () => {
        this.selectArea(index);
      });
    }
  }

  private render(): void {
    if (!this.summary || !this.backgroundSprite || !this.areaTagLabel || !this.flavorTagLabel || !this.statusLabel || !this.titleLabel || !this.subtitleLabel || !this.currentLevelLabel || !this.currentLevelNameLabel || !this.startButtonLabel || !this.startButtonNode || !this.unlockedLabel || !this.starsLabel || !this.bakerySignLabel || !this.bakeryFlavorLabel || !this.lockRootNode || !this.lockPriceLabel) {
      return;
    }

    const area = AREA_THEMES[this.selectedAreaIndex];
    const unlocked = this.summary.currentLevel >= area.unlockLevel;
    const currentAreaIndex = this.getCurrentAreaIndex(this.summary.currentLevel);
    const isCurrentArea = this.selectedAreaIndex === currentAreaIndex;

    this.applySprite(this.backgroundSprite, unlocked ? area.backgroundUnlocked : area.backgroundLocked);
    this.drawAreaHeader(area, unlocked, isCurrentArea);
    this.drawBakery(area, unlocked);
    this.drawLock(area, unlocked);
    this.drawForeground(area, unlocked);

    this.areaTagLabel.string = area.title;
    this.flavorTagLabel.string = area.flavor;
    this.statusLabel.string = unlocked
      ? (isCurrentArea ? '当前营业区域' : `已解锁，${area.description}`)
      : `第 ${area.unlockLevel} 关解锁`;
    this.statusLabel.color = unlocked ? area.accent : new Color(160, 128, 96, 255);

    this.titleLabel.string = unlocked ? `${area.title} 烘焙小店` : `${area.title} 等待解锁`;
    this.subtitleLabel.string = area.description;
    this.currentLevelLabel.string = `当前关卡 Lv.${this.summary.currentLevel}/${this.summary.totalLevels}`;
    this.currentLevelNameLabel.string = this.summary.currentLevelName;
    this.startButtonLabel.string = unlocked ? '开始游戏' : `解锁${area.title}`;
    this.startButtonNode.opacity = 255;

    this.bakerySignLabel.string = '吐司\n小店';
    this.bakeryFlavorLabel.string = area.flavor;
    this.lockRootNode.active = !unlocked;
    this.lockPriceLabel.string = `${area.unlockPrice}`;
    if (this.bakeryFrameNode) {
      this.bakeryFrameNode.active = unlocked;
    }

    if (this.levelChip) {
      this.levelChip.value.string = `${this.summary.currentLevel}/${this.summary.totalLevels}`;
    }
    if (this.coinChip) {
      this.coinChip.value.string = `${this.summary.totalCoins}`;
    }
    if (this.energyChip) {
      this.energyChip.value.string = `${this.summary.energy.current}/${this.summary.energy.max}`;
    }
    if (this.giftChip) {
      this.giftChip.value.string = `${this.summary.totalGifts}`;
    }

    this.unlockedLabel.string = `${this.summary.unlockedCount}/${this.summary.totalLevels} 已解锁`;
    this.starsLabel.string = `${this.summary.totalStars}/${this.summary.maxStars} 星级`;

    this.dotRefs.forEach((dot, index) => {
      const dotUnlocked = this.summary ? this.summary.currentLevel >= AREA_THEMES[index].unlockLevel : false;
      dot.graphics.clear();
      if (index === this.selectedAreaIndex) {
        dot.graphics.fillColor = dotUnlocked ? area.accent : new Color(188, 168, 143, 255);
        dot.graphics.circle(0, 0, 10);
        dot.graphics.fill();
        dot.label.string = '';
      } else if (dotUnlocked) {
        dot.graphics.fillColor = new Color(255, 234, 188, 255);
        dot.graphics.circle(0, 0, 7);
        dot.graphics.fill();
        dot.label.string = '';
      } else {
        dot.graphics.fillColor = new Color(234, 221, 204, 255);
        dot.graphics.circle(0, 0, 7);
        dot.graphics.fill();
        dot.label.string = '锁';
      }
    });
  }

  private drawAreaHeader(area: AreaTheme, unlocked: boolean, isCurrentArea: boolean): void {
    if (!this.areaHeaderGraphics) {
      return;
    }

    this.areaHeaderGraphics.clear();
    this.areaHeaderGraphics.fillColor = new Color(255, 248, 234, unlocked ? 238 : 212);
    this.areaHeaderGraphics.roundRect(-260, -58, 520, 116, 34);
    this.areaHeaderGraphics.fill();
    this.areaHeaderGraphics.fillColor = area.surface;
    this.areaHeaderGraphics.roundRect(-244, -42, 488, 84, 28);
    this.areaHeaderGraphics.fill();

    if (isCurrentArea && unlocked) {
      this.areaHeaderGraphics.fillColor = new Color(area.accent.r, area.accent.g, area.accent.b, 42);
      this.areaHeaderGraphics.roundRect(-244, -42, 488, 84, 28);
      this.areaHeaderGraphics.fill();
    }
  }

  private drawBakery(area: AreaTheme, unlocked: boolean): void {
    if (!this.bakeryBaseGraphics || !this.bakeryRoofGraphics || !this.bakerySignGraphics || !this.bakeryDoorLeftGraphics || !this.bakeryDoorRightGraphics || !this.bakeryFrameNode || !this.bakerySignNode) {
      return;
    }

    const wallColor = new Color(246, 235, 212, 255);
    const trimColor = new Color(230, 200, 158, 255);
    const windowColor = new Color(255, 249, 242, 255);
    const lineColor = new Color(164, 116, 74, 255);
    const roofDark = area.accent;
    const roofLight = new Color(255, 197, 79, 255);

    this.bakeryBaseGraphics.clear();
    this.bakeryBaseGraphics.fillColor = wallColor;
    this.bakeryBaseGraphics.roundRect(-142, -162, 284, 324, 22);
    this.bakeryBaseGraphics.fill();
    this.bakeryBaseGraphics.fillColor = trimColor;
    this.bakeryBaseGraphics.roundRect(-142, 72, 284, 24, 12);
    this.bakeryBaseGraphics.fill();
    this.bakeryBaseGraphics.fillColor = lineColor;
    this.bakeryBaseGraphics.roundRect(-124, -144, 108, 224, 18);
    this.bakeryBaseGraphics.roundRect(16, -144, 108, 224, 18);
    this.bakeryBaseGraphics.fill();

    this.bakeryDoorLeftGraphics.clear();
    this.bakeryDoorLeftGraphics.fillColor = windowColor;
    this.bakeryDoorLeftGraphics.roundRect(-50, -74, 100, 148, 20);
    this.bakeryDoorLeftGraphics.fill();
    this.drawWindowShelves(this.bakeryDoorLeftGraphics);

    this.bakeryDoorRightGraphics.clear();
    this.bakeryDoorRightGraphics.fillColor = windowColor;
    this.bakeryDoorRightGraphics.roundRect(-50, -74, 100, 148, 20);
    this.bakeryDoorRightGraphics.fill();
    this.drawWindowShelves(this.bakeryDoorRightGraphics);

    this.bakeryRoofGraphics.clear();
    this.bakeryRoofGraphics.fillColor = roofDark;
    this.bakeryRoofGraphics.roundRect(-154, -18, 308, 46, 18);
    this.bakeryRoofGraphics.fill();

    const stripeWidth = 38;
    for (let index = 0; index < 8; index += 1) {
      this.bakeryRoofGraphics.fillColor = index % 2 === 0 ? roofLight : new Color(255, 226, 153, 255);
      this.bakeryRoofGraphics.roundRect(-150 + index * stripeWidth, -56, stripeWidth - 4, 58, 10);
      this.bakeryRoofGraphics.fill();
    }

    this.bakerySignGraphics.clear();
    this.bakerySignGraphics.fillColor = new Color(255, 209, 110, 255);
    this.bakerySignGraphics.roundRect(-82, -62, 164, 124, 30);
    this.bakerySignGraphics.fill();
    this.bakerySignGraphics.fillColor = new Color(255, 235, 176, 255);
    this.bakerySignGraphics.roundRect(-68, -48, 136, 96, 24);
    this.bakerySignGraphics.fill();
    this.bakerySignGraphics.fillColor = area.accent;
    this.bakerySignGraphics.roundRect(-62, -42, 124, 84, 22);
    this.bakerySignGraphics.fill();

    this.bakeryFrameNode.scale = Vec3.ONE;
    this.bakeryFrameNode.opacity = 255;
    this.bakerySignNode.angle = -4;
  }

  private drawLock(area: AreaTheme, unlocked: boolean): void {
    if (!this.lockBodyGraphics || !this.lockShackleGraphics || unlocked) {
      return;
    }

    this.lockShackleGraphics.clear();
    this.lockShackleGraphics.fillColor = new Color(255, 255, 255, 255);
    this.lockShackleGraphics.roundRect(-42, -8, 84, 70, 28);
    this.lockShackleGraphics.fill();
    this.lockShackleGraphics.fillColor = new Color(191, 152, 97, 255);
    this.lockShackleGraphics.roundRect(-24, 10, 48, 32, 16);
    this.lockShackleGraphics.fill();

    this.lockBodyGraphics.clear();
    this.lockBodyGraphics.fillColor = new Color(255, 255, 255, 255);
    this.lockBodyGraphics.roundRect(-76, -66, 152, 122, 22);
    this.lockBodyGraphics.fill();
    this.lockBodyGraphics.fillColor = new Color(area.accent.r, area.accent.g, area.accent.b, 40);
    this.lockBodyGraphics.roundRect(-70, -60, 140, 110, 18);
    this.lockBodyGraphics.fill();
  }

  private drawWindowShelves(graphics: Graphics): void {
    graphics.fillColor = new Color(228, 198, 161, 255);
    graphics.roundRect(-44, 10, 88, 8, 4);
    graphics.roundRect(-44, -20, 88, 8, 4);
    graphics.fill();
    graphics.fillColor = new Color(211, 163, 109, 255);
    graphics.circle(-18, 24, 8);
    graphics.circle(8, 24, 7);
    graphics.circle(24, -4, 9);
    graphics.circle(-8, -34, 8);
    graphics.fill();
  }

  private drawForeground(area: AreaTheme, unlocked: boolean): void {
    if (!this.foregroundLeafGraphics) {
      return;
    }

    this.foregroundLeafGraphics.clear();
    this.foregroundLeafGraphics.fillColor = unlocked
      ? new Color(area.accent.r, area.accent.g, area.accent.b, 44)
      : new Color(173, 157, 138, 42);
    this.foregroundLeafGraphics.rect(-OVERLAY_WIDTH / 2, -107, OVERLAY_WIDTH, 214);
    this.foregroundLeafGraphics.fill();

    if (!unlocked) {
      return;
    }

    this.foregroundLeafGraphics.fillColor = new Color(area.accent.r, area.accent.g, area.accent.b, 92);
    this.foregroundLeafGraphics.ellipse(-260, -54, 92, 44);
    this.foregroundLeafGraphics.ellipse(248, -60, 120, 52);
    this.foregroundLeafGraphics.ellipse(110, -92, 98, 40);
    this.foregroundLeafGraphics.fill();
  }

  private createResourceChip(parent: Node, name: string, position: Vec3, accentText: string, accentColor: Color): ResourceChipRefs {
    const refs = this.bindOrCreateGraphicsNode(parent, name, position, 124, 52);
    if (refs.graphics) {
      refs.graphics.clear();
      refs.graphics.fillColor = new Color(255, 255, 255, 228);
      refs.graphics.roundRect(-62, -26, 124, 52, 20);
      refs.graphics.fill();
      refs.graphics.fillColor = accentColor;
      refs.graphics.circle(-34, 0, 15);
      refs.graphics.fill();
    }

    const accentLabel = this.createLabel(refs.node, `${name}Accent`, new Vec3(-34, 0, 0), 12, 14, 24, 18);
    accentLabel.string = accentText;
    accentLabel.color = Color.WHITE;
    const valueLabel = this.createLabel(refs.node, `${name}Value`, new Vec3(16, 0, 0), 16, 20, 78, 22);
    valueLabel.color = new Color(112, 77, 45, 255);
    return {
      value: valueLabel,
    };
  }

  private bindOrCreateGraphicsNode(
    parent: Node,
    name: string,
    position: Vec3,
    width: number,
    height: number,
  ): { node: Node; graphics: Graphics | null } {
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

  private bindOrCreateSpriteNode(parent: Node, name: string, position: Vec3, width: number, height: number): Node {
    const node = parent.getChildByName(name) ?? new Node(name);
    if (!node.parent) {
      node.parent = parent;
    }
    node.layer = Layers.Enum.UI_2D;
    node.setPosition(position);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    return node;
  }

  private createButton(parent: Node, name: string, position: Vec3, color: Color, width: number, height: number, radius: number): Node {
    const refs = this.bindOrCreateGraphicsNode(parent, name, position, width, height);
    const graphics = refs.graphics ?? refs.node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = color;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();
    return refs.node;
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
        console.warn('[HomeOverlayView] Failed to load sprite', key);
        return;
      }

      sprite.spriteFrame = frame;
    });
  }

  private getCurrentAreaIndex(levelId: number): number {
    for (let index = AREA_THEMES.length - 1; index >= 0; index -= 1) {
      if (levelId >= AREA_THEMES[index].unlockLevel) {
        return index;
      }
    }

    return 0;
  }

  private selectArea(index: number): void {
    this.selectedAreaIndex = Math.max(0, Math.min(index, AREA_THEMES.length - 1));
    this.render();
  }

  private async handleStartTap(event: EventTouch): Promise<void> {
    event.propagationStopped = true;
    if (!this.startHandler || !this.summary) {
      return;
    }

    const area = AREA_THEMES[this.selectedAreaIndex];
    if (this.summary.currentLevel < area.unlockLevel) {
      return;
    }

    await this.startHandler();
  }

  private handleLevelSelectTap(event: EventTouch): void {
    event.propagationStopped = true;
    this.levelSelectHandler?.();
  }

  private async handleTutorialTap(event: EventTouch): Promise<void> {
    event.propagationStopped = true;
    if (!this.tutorialHandler) {
      return;
    }

    await this.tutorialHandler();
  }

  private handleSettingsTap(event: EventTouch): void {
    event.propagationStopped = true;
    this.settingsHandler?.();
  }

  private handlePrevAreaTap(event: EventTouch): void {
    event.propagationStopped = true;
    this.selectArea((this.selectedAreaIndex - 1 + AREA_THEMES.length) % AREA_THEMES.length);
  }

  private handleNextAreaTap(event: EventTouch): void {
    event.propagationStopped = true;
    this.selectArea((this.selectedAreaIndex + 1) % AREA_THEMES.length);
  }
}
