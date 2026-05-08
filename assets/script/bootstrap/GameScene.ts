import { _decorator, Component, Layers, Node, Prefab, Sprite, SpriteFrame, UITransform, Vec3, director, instantiate, resources, view } from 'cc';
import { GameSession } from '../game/session/GameSession';
import { PrefabLoader } from '../lbspace/common/PrefabLoader';
import { Utils } from '../lbspace/utils/Utils';
import { CocosAssetWarmup } from '../infra/CocosAssetWarmup';
import { LevelProgressStore } from '../infra/LevelProgressStore';
import { SettingsStore } from '../infra/SettingsStore';
import { BoardController } from '../view/BoardController';
import { HomeOverlayController } from '../view/HomeOverlayController';
import { HudController } from '../view/HudController';
import { LevelSelectOverlayController } from '../view/LevelSelectOverlayController';
import { LoadingOverlayController } from '../view/LoadingOverlayController';
import { MessageOverlayController } from '../view/MessageOverlayController';
import { SettingsOverlayController, type SettingsOverlayMode } from '../view/SettingsOverlayController';
import { SettlementOverlayController } from '../view/SettlementOverlayController';
import { StatusBarController } from '../view/StatusBarController';
import { ToolBarController } from '../view/ToolBarController';
import { TutorialOverlayController } from '../view/TutorialOverlayController';

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

@ccclass('GameScene')
export class GameScene extends Component {
  private readonly assetWarmup = new CocosAssetWarmup();
  private readonly settingsStore = new SettingsStore();
  private readonly levelProgressStore = new LevelProgressStore();
  private session: GameSession | null = null;
  private boardView: BoardController | null = null;
  private hudView: HudController | null = null;
  private toolBarView: ToolBarController | null = null;
  private settlementOverlayView: SettlementOverlayController | null = null;
  private messageOverlayView: MessageOverlayController | null = null;
  private levelSelectOverlayView: LevelSelectOverlayController | null = null;
  private homeOverlayView: HomeOverlayController | null = null;
  private loadingOverlayView: LoadingOverlayController | null = null;
  private settingsOverlayView: SettingsOverlayController | null = null;
  private tutorialOverlayView: TutorialOverlayController | null = null;
  private statusBarView: StatusBarController | null = null;
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
    await this.ensureLoadingOverlayController();
    await this.loadingOverlayView?.play(async () => {
      await this.assetWarmup.preloadCriticalAssets();
    });
    director.loadScene(SCENE_NAMES.Lobby);
  }

  private async startLobbyScene(): Promise<void> {
    await Promise.all([
      this.ensureHomeOverlayController(),
      this.ensureLevelSelectOverlayController(),
      this.ensureSettingsOverlayController(),
      this.ensureTutorialOverlayController(),
      this.ensureStatusBarController(),
    ]);

    this.bindSharedViews();

    if (this.statusBarView && this.session) {
      this.statusBarView.bind(this.session);
      this.statusBarView.setShowEnergy(true);
      this.statusBarView.onSettingsClick = () => this.openSettings('settings');
    }

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
      this.ensureStatusBarController(),
      this.ensureHudController(),
      this.ensureBoardController(),
      this.ensureToolBarController(),
      this.ensureSettlementOverlayController(),
      this.ensureMessageOverlayController(),
      this.ensureLevelSelectOverlayController(),
      this.ensureSettingsOverlayController(),
    ]);

    this.bindSharedViews();

    if (this.statusBarView && this.session) {
      this.statusBarView.bind(this.session);
      this.statusBarView.setShowEnergy(false);
      this.statusBarView.onSettingsClick = () => this.openSettings('pause');
    }
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

  private async ensureLoadingOverlayController(): Promise<void> {
    if (this.loadingOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/LoadingOverlayRoot', 'ProgrammaticLoadingOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.loadingOverlayView = viewNode.addComponent(LoadingOverlayController);
  }

  private async ensureSettingsOverlayController(): Promise<void> {
    if (this.settingsOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/SettingsOverlayRoot', 'ProgrammaticSettingsOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.settingsOverlayView = viewNode.addComponent(SettingsOverlayController);
  }

  private async ensureTutorialOverlayController(): Promise<void> {
    if (this.tutorialOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/TutorialOverlayRoot', 'ProgrammaticTutorialOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.tutorialOverlayView = viewNode.addComponent(TutorialOverlayController);
  }

  private async ensureStatusBarController(): Promise<void> {
    if (this.statusBarView) {
      return;
    }

    const safeAreaTop = Utils.getSafeArea().top
    const barHeight = Math.max(safeAreaTop, 44)

    const viewNode = new Node('ProgrammaticStatusBar')
    viewNode.layer = Layers.Enum.UI_2D
    viewNode.parent = this.node
    viewNode.addComponent(UITransform).setContentSize(750, barHeight)
    this.statusBarView = viewNode.addComponent(StatusBarController)
    this.refreshLayout()
  }

  private async ensureHudController(): Promise<void> {
    if (this.hudView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/HudRoot', 'ProgrammaticHudController', new Vec3(0, 500, 0), HUD_SIZE);
    this.hudView = viewNode.addComponent(HudController);
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

  private async ensureBoardController(): Promise<void> {
    if (this.boardView) {
      return;
    }

    const viewNode = new Node('ProgrammaticBoardController');
    viewNode.layer = Layers.Enum.UI_2D;
    viewNode.parent = this.node;
    viewNode.setPosition(new Vec3(0, 10, 0));
    viewNode.addComponent(UITransform);

    this.boardView = viewNode.addComponent(BoardController);
    this.refreshLayout();
  }

  private async ensureToolBarController(): Promise<void> {
    if (this.toolBarView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/ToolBarRoot', 'ProgrammaticToolBarController', new Vec3(0, -470, 0), TOOLBAR_SIZE);
    this.toolBarView = viewNode.addComponent(ToolBarController);
    this.refreshLayout();
  }

  private async ensureSettlementOverlayController(): Promise<void> {
    if (this.settlementOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/SettlementOverlayRoot', 'ProgrammaticSettlementOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.settlementOverlayView = viewNode.addComponent(SettlementOverlayController);
  }

  private async ensureMessageOverlayController(): Promise<void> {
    if (this.messageOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/MessageOverlayRoot', 'ProgrammaticMessageOverlay', new Vec3(0, -278, 0), { width: 520, height: 72 });
    this.messageOverlayView = viewNode.addComponent(MessageOverlayController);
  }

  private async ensureLevelSelectOverlayController(): Promise<void> {
    if (this.levelSelectOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/LevelSelectOverlayRoot', 'ProgrammaticLevelSelectOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.levelSelectOverlayView = viewNode.addComponent(LevelSelectOverlayController);
  }

  private async ensureHomeOverlayController(): Promise<void> {
    if (this.homeOverlayView) {
      return;
    }

    const viewNode = await this.instantiateUiRoot('prefabs/HomeOverlayRoot', 'ProgrammaticHomeOverlay', Vec3.ZERO, { width: 750, height: 1334 });
    this.homeOverlayView = viewNode.addComponent(HomeOverlayController);
  }

  private refreshLayout(): void {
    const canvasTransform = this.node.getComponent(UITransform);
    const canvasSize = canvasTransform?.contentSize;
    if (!canvasSize) {
      return;
    }

    const top = canvasSize.height / 2;
    const bottom = -canvasSize.height / 2;
    const safeAreaTop = Utils.getSafeArea().top;
    const adjustedTop = top - safeAreaTop;

    const hudHalf = HUD_SIZE.height / 2;
    const boardHalf = BOARD_SIZE.height / 2;
    const toolbarHalf = TOOLBAR_SIZE.height / 2;

    const statusBarHeight = Math.max(safeAreaTop, 44);
    this.statusBarView?.node.setPosition(0, top - statusBarHeight / 2, 0);

    const hudY = adjustedTop - hudHalf - 42;
    const toolbarY = bottom + toolbarHalf + 44;
    const boardTopLimit = hudY - hudHalf - 28 - boardHalf;
    const boardBottomLimit = toolbarY + toolbarHalf + 28 + boardHalf;
    const boardY = boardBottomLimit <= boardTopLimit
      ? Math.max(boardBottomLimit, Math.min(-8, boardTopLimit))
      : (boardTopLimit + boardBottomLimit) / 2;

    this.hudView?.node.setPosition(0, hudY, 0);
    this.boardView?.node.setPosition(0, boardY, 0);
    this.toolBarView?.node.setPosition(0, toolbarY, 0);
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
