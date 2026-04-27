import { _decorator, Color, Component, Graphics, Label, Layers, Node, Prefab, Sprite, SpriteFrame, UITransform, Vec3, director, instantiate, resources, view } from 'cc';
import { GameSession } from '../game/session/GameSession';
import { PrefabLoader } from '../lbspace/PrefabLoader';
import { CocosAssetWarmup } from '../infra/CocosAssetWarmup';
import { LevelProgressStore } from '../infra/LevelProgressStore';
import { SettingsStore } from '../infra/SettingsStore';
import { BoardView } from '../view/BoardView';
import { HomeOverlayView } from '../view/HomeOverlayView';
import { HudView } from '../view/HudView';
import { LevelSelectOverlayView } from '../view/LevelSelectOverlayView';
import { LoadingOverlayView } from '../view/LoadingOverlayView';
import { MessageOverlayView } from '../view/MessageOverlayView';
import { SettingsOverlayView, type SettingsOverlayMode } from '../view/SettingsOverlayView';
import { SettlementOverlayView } from '../view/SettlementOverlayView';
import { ToolBarView } from '../view/ToolBarView';
import { TutorialOverlayView } from '../view/TutorialOverlayView';

const { ccclass } = _decorator;

type SceneMode = 'home' | 'gameplay' | 'levelSelect';
type RuntimeScene = 'Loading' | 'Lobby' | 'Game';

const SCENE_NAMES: Record<RuntimeScene, RuntimeScene> = {
  Loading: 'Loading',
  Lobby: 'Lobby',
  Game: 'Game',
};

const HUD_SIZE = { width: 660, height: 216 };
const BOARD_SIZE = { width: 660, height: 676 };
const TOOLBAR_SIZE = { width: 660, height: 168 };

interface FloatingActionButtonSpec {
  fillColor: Color;
  label: string;
  nodeName: string;
  position: Vec3;
}

@ccclass('GameScene')
export class GameScene extends Component {
  private readonly assetWarmup = new CocosAssetWarmup();
  private readonly settingsStore = new SettingsStore();
  private readonly levelProgressStore = new LevelProgressStore();
  private session: GameSession | null = null;
  private boardView: BoardView | null = null;
  private hudView: HudView | null = null;
  private toolBarView: ToolBarView | null = null;
  private settlementOverlayView: SettlementOverlayView | null = null;
  private messageOverlayView: MessageOverlayView | null = null;
  private levelSelectOverlayView: LevelSelectOverlayView | null = null;
  private homeOverlayView: HomeOverlayView | null = null;
  private loadingOverlayView: LoadingOverlayView | null = null;
  private settingsOverlayView: SettingsOverlayView | null = null;
  private tutorialOverlayView: TutorialOverlayView | null = null;
  private levelButtonNode: Node | null = null;
  private homeButtonNode: Node | null = null;
  private pauseButtonNode: Node | null = null;
  private backgroundNode: Node | null = null;
  private mode: SceneMode = 'home';
  private levelSelectReturnMode: SceneMode = 'home';

  onEnable(): void {
    view.on('canvas-resize', this.refreshLayout, this);
  }

  onDisable(): void {
    view.off('canvas-resize', this.refreshLayout, this);
  }

  onLoad(): void {
    this.session = new GameSession();
  }

  async start(): Promise<void> {
    const runtimeScene = this.getRuntimeScene();

    if (runtimeScene === 'Loading') {
      await this.startLoadingScene();
      return;
    }

    await this.assetWarmup.preloadCriticalAssets();

    if (runtimeScene === 'Lobby') {
      await this.startLobbyScene();
      return;
    }

    await this.startGameScene();
  }

  private getRuntimeScene(): RuntimeScene {
    const sceneName = director.getScene()?.name;
    if (sceneName === SCENE_NAMES.Loading) {
      return 'Loading';
    }
    if (sceneName === SCENE_NAMES.Lobby) {
      return 'Lobby';
    }
    return 'Game';
  }

  private async startLoadingScene(): Promise<void> {
    await this.ensureLoadingOverlayView();
    await this.loadingOverlayView?.play(async () => {
      await this.assetWarmup.preloadCriticalAssets();
    });
    director.loadScene(SCENE_NAMES.Lobby);
  }

  private async startLobbyScene(): Promise<void> {
    await Promise.all([
      this.ensureHomeOverlayView(),
      this.ensureLevelSelectOverlayView(),
      this.ensureSettingsOverlayView(),
      this.ensureTutorialOverlayView(),
    ]);

    this.bindSharedViews();

    if (this.homeOverlayView) {
      this.homeOverlayView.bind(async () => {
        await this.enterGameplay(this.levelProgressStore.getCurrentLevel());
      }, () => {
        void this.openLevelSelect('home');
      }, async () => {
        await this.openTutorial();
      }, () => {
        this.openSettings('settings');
      });
    }

    if (this.settingsOverlayView) {
      this.settingsOverlayView.bind({
        onClose: () => {},
        onResume: async () => {
          this.settingsOverlayView?.close();
        },
        onExit: async () => {
          this.settingsOverlayView?.close();
          await this.openHome();
        },
        onRestart: async () => {
          this.settingsOverlayView?.close();
        },
        onSettingsChanged: (patch) => this.settingsStore.updateSettings(patch),
      });
    }

    if (this.tutorialOverlayView) {
      this.tutorialOverlayView.bind(async () => {
        this.tutorialOverlayView?.close();
        await this.enterGameplay(this.levelProgressStore.getCurrentLevel());
      }, async () => {
        this.tutorialOverlayView?.close();
        await this.enterGameplay(this.levelProgressStore.getCurrentLevel());
      });
    }

    this.setMode('home');
    await this.openHome();
  }

  private async startGameScene(): Promise<void> {
    await Promise.all([
      this.ensureBackground(),
      this.ensureHudView(),
      this.ensureBoardView(),
      this.ensureToolBarView(),
      this.ensureSettlementOverlayView(),
      this.ensureMessageOverlayView(),
      this.ensureLevelSelectOverlayView(),
      this.ensureSettingsOverlayView(),
      this.ensureLevelButton(),
    ]);

    this.bindSharedViews();

    if (this.hudView && this.session) {
      this.hudView.bind(this.session);
    }
    if (this.boardView && this.session) {
      this.boardView.bind(this.session);
    }
    if (this.toolBarView && this.session) {
      this.toolBarView.bind(this.session);
    }
    if (this.messageOverlayView && this.session) {
      this.messageOverlayView.bind(this.session);
    }
    if (this.settlementOverlayView && this.session) {
      this.settlementOverlayView.bind(this.session, async () => {
        await this.session?.restart();
        this.setMode('gameplay');
      }, async () => {
        const hasNextLevel = await this.session?.loadNextLevel();
        if (hasNextLevel) {
          this.setMode('gameplay');
        }
      });
    }
    if (this.settingsOverlayView) {
      this.settingsOverlayView.bind({
        onClose: () => {},
        onResume: async () => {
          this.settingsOverlayView?.close();
        },
        onExit: async () => {
          this.settingsOverlayView?.close();
          director.loadScene(SCENE_NAMES.Lobby);
        },
        onRestart: async () => {
          this.settingsOverlayView?.close();
          await this.session?.restart();
          this.setMode('gameplay');
        },
        onSettingsChanged: (patch) => this.settingsStore.updateSettings(patch),
      });
    }

    this.refreshLayout();
    await this.startGameplay(this.levelProgressStore.getCurrentLevel());
  }

  private bindSharedViews(): void {
    if (this.levelSelectOverlayView) {
      this.levelSelectOverlayView.bind(async (levelId) => {
        await this.enterGameplay(levelId);
      }, () => {
        this.handleLevelSelectClosed();
      });
    }
  }

  private async ensureLoadingOverlayView(): Promise<void> {
    if (this.loadingOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/LoadingOverlayRoot', 'ProgrammaticLoadingOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.loadingOverlayView = viewNode.addComponent(LoadingOverlayView);
  }

  private async ensureSettingsOverlayView(): Promise<void> {
    if (this.settingsOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/SettingsOverlayRoot', 'ProgrammaticSettingsOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.settingsOverlayView = viewNode.addComponent(SettingsOverlayView);
  }

  private async ensureTutorialOverlayView(): Promise<void> {
    if (this.tutorialOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/TutorialOverlayRoot', 'ProgrammaticTutorialOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.tutorialOverlayView = viewNode.addComponent(TutorialOverlayView);
  }

  private async ensureHudView(): Promise<void> {
    if (this.hudView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/HudRoot', 'ProgrammaticHudView', new Vec3(0, 500, 0), HUD_SIZE);
    this.hudView = viewNode.addComponent(HudView);
    this.refreshLayout();
  }

  private async ensureBackground(): Promise<void> {
    if (this.backgroundNode) {
      return;
    }

    this.backgroundNode = new Node('GameBackground');
    this.backgroundNode.layer = Layers.Enum.UI_2D;
    this.backgroundNode.parent = this.node;
    this.backgroundNode.setPosition(Vec3.ZERO);
    const transform = this.backgroundNode.addComponent(UITransform);
    transform.setContentSize(750, 1334);

    const sprite = this.backgroundNode.addComponent(Sprite);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    transform.setContentSize(750, 1334);

    await new Promise<void>((resolve) => {
      resources.load('ui/game_bg/spriteFrame', SpriteFrame, (error, asset) => {
        if (error) {
          console.warn('[GameScene] Failed to load game_bg', error);
          resolve();
          return;
        }
        sprite.spriteFrame = asset;
        resolve();
      });
    });
  }

  private async ensureBoardView(): Promise<void> {
    if (this.boardView) {
      return;
    }

    const viewNode = new Node('ProgrammaticBoardView');
    viewNode.layer = Layers.Enum.UI_2D;
    viewNode.parent = this.node;
    viewNode.setPosition(new Vec3(0, 10, 0));
    viewNode.addComponent(UITransform);

    this.boardView = viewNode.addComponent(BoardView);
    this.refreshLayout();
  }

  private async ensureToolBarView(): Promise<void> {
    if (this.toolBarView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/ToolBarRoot', 'ProgrammaticToolBarView', new Vec3(0, -470, 0), TOOLBAR_SIZE);
    this.toolBarView = viewNode.addComponent(ToolBarView);
    this.refreshLayout();
  }

  private async ensureSettlementOverlayView(): Promise<void> {
    if (this.settlementOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/SettlementOverlayRoot', 'ProgrammaticSettlementOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.settlementOverlayView = viewNode.addComponent(SettlementOverlayView);
  }

  private async ensureMessageOverlayView(): Promise<void> {
    if (this.messageOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/MessageOverlayRoot', 'ProgrammaticMessageOverlay', new Vec3(0, -278, 0), { width: 520, height: 72 });
    this.messageOverlayView = viewNode.addComponent(MessageOverlayView);
  }

  private async ensureLevelSelectOverlayView(): Promise<void> {
    if (this.levelSelectOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/LevelSelectOverlayRoot', 'ProgrammaticLevelSelectOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.levelSelectOverlayView = viewNode.addComponent(LevelSelectOverlayView);
  }

  private async ensureHomeOverlayView(): Promise<void> {
    if (this.homeOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/HomeOverlayRoot', 'ProgrammaticHomeOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.homeOverlayView = viewNode.addComponent(HomeOverlayView);
  }

  private async ensureLevelButton(): Promise<void> {
    if (this.levelButtonNode) {
      return;
    }

    this.levelButtonNode = this.createFloatingActionButton({
      fillColor: new Color(189, 128, 59, 255),
      label: '关卡',
      nodeName: 'OpenLevelSelectButton',
      position: new Vec3(278, 592, 0),
    });
    this.levelButtonNode.on(Node.EventType.TOUCH_END, async (event) => {
      event.propagationStopped = true;
      await this.openLevelSelect('gameplay');
    });

    this.homeButtonNode = this.createFloatingActionButton({
      fillColor: new Color(151, 104, 57, 255),
      label: '大厅',
      nodeName: 'OpenHomeButton',
      position: new Vec3(186, 592, 0),
    });
    this.homeButtonNode.on(Node.EventType.TOUCH_END, (event) => {
      event.propagationStopped = true;
      director.loadScene(SCENE_NAMES.Lobby);
    });

    this.pauseButtonNode = this.createFloatingActionButton({
      fillColor: new Color(120, 147, 66, 255),
      label: '暂停',
      nodeName: 'OpenPauseButton',
      position: new Vec3(94, 592, 0),
    });
    this.pauseButtonNode.on(Node.EventType.TOUCH_END, (event) => {
      event.propagationStopped = true;
      this.openSettings('pause');
    });

    this.refreshLayout();
  }

  private refreshLayout(): void {
    const canvasTransform = this.node.getComponent(UITransform);
    const canvasSize = canvasTransform?.contentSize;
    if (!canvasSize) {
      return;
    }

    const top = canvasSize.height / 2;
    const bottom = -canvasSize.height / 2;
    const right = canvasSize.width / 2;

    const hudHalf = HUD_SIZE.height / 2;
    const boardHalf = BOARD_SIZE.height / 2;
    const toolbarHalf = TOOLBAR_SIZE.height / 2;

    const hudY = top - hudHalf - 42;
    const toolbarY = bottom + toolbarHalf + 44;
    const boardTopLimit = hudY - hudHalf - 28 - boardHalf;
    const boardBottomLimit = toolbarY + toolbarHalf + 28 + boardHalf;
    const boardY = boardBottomLimit <= boardTopLimit
      ? Math.max(boardBottomLimit, Math.min(-8, boardTopLimit))
      : (boardTopLimit + boardBottomLimit) / 2;

    this.hudView?.node.setPosition(0, hudY, 0);
    this.boardView?.node.setPosition(0, boardY, 0);
    this.toolBarView?.node.setPosition(0, toolbarY, 0);

    const actionButtonY = top - 62;
    const pauseX = right - 64;
    const homeX = pauseX - 92;
    const levelX = homeX - 92;
    this.pauseButtonNode?.setPosition(pauseX, actionButtonY, 0);
    this.homeButtonNode?.setPosition(homeX, actionButtonY, 0);
    this.levelButtonNode?.setPosition(levelX, actionButtonY, 0);
  }

  private createFloatingActionButton(spec: FloatingActionButtonSpec): Node {
    const buttonNode = new Node(spec.nodeName);
    buttonNode.layer = Layers.Enum.UI_2D;
    buttonNode.parent = this.node;
    buttonNode.setPosition(spec.position);
    const buttonTransform = buttonNode.addComponent(UITransform);
    buttonTransform.setContentSize(82, 82);

    const shadowNode = new Node(`${spec.nodeName}Shadow`);
    shadowNode.layer = Layers.Enum.UI_2D;
    shadowNode.parent = buttonNode;
    shadowNode.setPosition(new Vec3(0, -5, 0));
    const shadowTransform = shadowNode.addComponent(UITransform);
    shadowTransform.setContentSize(78, 78);
    const shadowGraphics = shadowNode.addComponent(Graphics);
    shadowGraphics.fillColor = new Color(89, 62, 40, 34);
    shadowGraphics.circle(0, 0, 38);
    shadowGraphics.fill();

    const baseNode = new Node(`${spec.nodeName}Base`);
    baseNode.layer = Layers.Enum.UI_2D;
    baseNode.parent = buttonNode;
    baseNode.setPosition(Vec3.ZERO);
    const baseTransform = baseNode.addComponent(UITransform);
    baseTransform.setContentSize(82, 82);
    const baseGraphics = baseNode.addComponent(Graphics);
    baseGraphics.fillColor = new Color(255, 243, 223, 255);
    baseGraphics.circle(0, 0, 41);
    baseGraphics.fill();
    baseGraphics.fillColor = spec.fillColor;
    baseGraphics.circle(0, 0, 35);
    baseGraphics.fill();

    const labelNode = new Node(`${spec.nodeName}Label`);
    labelNode.layer = Layers.Enum.UI_2D;
    labelNode.parent = buttonNode;
    labelNode.setPosition(Vec3.ZERO);
    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setContentSize(70, 40);
    const label = labelNode.addComponent(Label);
    label.string = spec.label;
    label.fontSize = 20;
    label.lineHeight = 24;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = Color.WHITE;
    return buttonNode;
  }

  private async enterGameplay(levelId: number): Promise<void> {
    this.levelProgressStore.setCurrentLevel(levelId);
    if (this.getRuntimeScene() === 'Game') {
      await this.startGameplay(levelId);
      return;
    }

    director.loadScene(SCENE_NAMES.Game);
  }

  private async startGameplay(levelId: number): Promise<void> {
    if (!this.session) {
      return;
    }

    const loaded = await this.session.loadLevel(levelId);
    if (!loaded) {
      return;
    }

    this.settingsOverlayView?.close();
    this.tutorialOverlayView?.close();
    if (this.levelSelectOverlayView) {
      this.levelSelectOverlayView.node.active = false;
    }
    this.setMode('gameplay');
  }

  private async openLevelSelect(returnMode: SceneMode): Promise<void> {
    if (!this.session || !this.levelSelectOverlayView) {
      return;
    }

    this.levelSelectReturnMode = returnMode;
    this.setMode('levelSelect');
    this.levelSelectOverlayView.open(await this.session.getLevelSummaries());
  }

  private handleLevelSelectClosed(): void {
    if (this.mode !== 'levelSelect') {
      return;
    }

    this.setMode(this.levelSelectReturnMode);
  }

  private async openHome(): Promise<void> {
    if (!this.session || !this.homeOverlayView) {
      return;
    }

    this.settingsOverlayView?.close();
    this.tutorialOverlayView?.close();
    if (this.levelSelectOverlayView) {
      this.levelSelectOverlayView.node.active = false;
    }
    this.homeOverlayView.open(await this.session.getHomeSummary());
    this.setMode('home');
  }

  private setMode(mode: SceneMode): void {
    this.mode = mode;
    const gameplayVisible = mode === 'gameplay';

    if (this.boardView) {
      this.boardView.node.active = gameplayVisible;
    }
    if (this.hudView) {
      this.hudView.node.active = gameplayVisible;
    }
    if (this.toolBarView) {
      this.toolBarView.node.active = gameplayVisible;
    }
    if (this.levelButtonNode) {
      this.levelButtonNode.active = gameplayVisible;
    }
    if (this.homeButtonNode) {
      this.homeButtonNode.active = gameplayVisible;
    }
    if (this.pauseButtonNode) {
      this.pauseButtonNode.active = gameplayVisible;
    }
    if (this.homeOverlayView) {
      this.homeOverlayView.node.active = mode === 'home';
    }
    if (this.levelSelectOverlayView) {
      this.levelSelectOverlayView.node.active = mode === 'levelSelect';
    }
  }

  private openSettings(mode: SettingsOverlayMode): void {
    if (!this.settingsOverlayView) {
      return;
    }

    this.settingsOverlayView.open(mode, this.settingsStore.getSettings());
  }

  private async openTutorial(): Promise<void> {
    if (!this.tutorialOverlayView) {
      return;
    }

    this.tutorialOverlayView.open();
  }

  private async instantiateUiRoot(
    prefabKey: string,
    fallbackName: string,
    position: Vec3,
    size: { width: number; height: number },
  ): Promise<Node> {
    const prefab = await PrefabLoader.load(prefabKey);
    const viewNode = prefab ? instantiate(prefab) : new Node(fallbackName);
    viewNode.name = fallbackName;
    viewNode.layer = Layers.Enum.UI_2D;
    viewNode.parent = this.node;
    viewNode.setPosition(position);
    const transform = viewNode.getComponent(UITransform) ?? viewNode.addComponent(UITransform);
    transform.setContentSize(size.width, size.height);
    return viewNode;
  }
}
