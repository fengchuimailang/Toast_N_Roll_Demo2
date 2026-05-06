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
import { SpriteFrameLoader } from '../infra/SpriteFrameLoader';

const { ccclass } = _decorator;

const OVERLAY_WIDTH = 750;
const OVERLAY_HEIGHT = 1334;
const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 280;
const BAR_WIDTH = 276;
const BAR_HEIGHT = 22;
const DEFAULT_DURATION_MS = 3000;

const LOADING_TIPS = [
  '正在准备食材...',
  '烤箱预热中...',
  '面团发酵中...',
  '面包烘焙中...',
  '香气四溢中...',
  '即将出炉...',
] as const;

@ccclass('LoadingOverlayController')
export class LoadingOverlayController extends Component {
  private readonly spriteFrameLoader = new SpriteFrameLoader();
  private background: Graphics | null = null;
  private backgroundSprite: Sprite | null = null;
  private panel: Graphics | null = null;
  private progressTrack: Graphics | null = null;
  private progressFill: Graphics | null = null;
  private titleLabel: Label | null = null;
  private subtitleLabel: Label | null = null;
  private progressLabel: Label | null = null;
  private tipLabel: Label | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;
  private completionResolver: (() => void) | null = null;
  private currentProgress = 0;
  private isReady = false;
  private isProgressFinished = false;

  protected onLoad(): void {
    this.ensureScaffold();
    this.node.active = false;
  }

  protected onDestroy(): void {
    this.clearTimers();
    this.completionResolver = null;
  }

  public async play(task: () => Promise<void>): Promise<void> {
    this.ensureScaffold();
    this.resetState();
    this.node.active = true;
    this.startFakeProgress();

    try {
      await task();
      this.markReady();
      await new Promise<void>((resolve) => {
        this.completionResolver = resolve;
        this.maybeComplete();
      });
    } catch (error) {
      this.clearTimers();
      if (this.tipLabel) {
        this.tipLabel.string = '加载失败，请检查资源';
      }
      throw error;
    }
  }

  private ensureScaffold(): void {
    if (
      this.background
      && this.panel
      && this.progressTrack
      && this.progressFill
      && this.titleLabel
      && this.subtitleLabel
      && this.progressLabel
      && this.tipLabel
    ) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);

    const backgroundNode = new Node('LoadingBackdrop');
    backgroundNode.layer = Layers.Enum.UI_2D;
    backgroundNode.parent = this.node;
    backgroundNode.setPosition(Vec3.ZERO);
    const backgroundTransform = backgroundNode.addComponent(UITransform);
    backgroundTransform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);
    this.background = backgroundNode.addComponent(Graphics);

    const backgroundImageNode = new Node('LoadingBackdropImage');
    backgroundImageNode.layer = Layers.Enum.UI_2D;
    backgroundImageNode.parent = backgroundNode;
    backgroundImageNode.setPosition(Vec3.ZERO);
    const backgroundImageTransform = backgroundImageNode.addComponent(UITransform);
    backgroundImageTransform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);
    this.backgroundSprite = backgroundImageNode.addComponent(Sprite);
    this.backgroundSprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const glowNode = new Node('LoadingGlow');
    glowNode.layer = Layers.Enum.UI_2D;
    glowNode.parent = this.node;
    glowNode.setPosition(new Vec3(0, 180, 0));
    const glowTransform = glowNode.addComponent(UITransform);
    glowTransform.setContentSize(420, 180);
    const glow = glowNode.addComponent(Graphics);
    glow.fillColor = new Color(255, 222, 174, 24);
    glow.ellipse(0, 0, 210, 90);
    glow.fill();

    const panelNode = new Node('LoadingPanel');
    panelNode.layer = Layers.Enum.UI_2D;
    panelNode.parent = this.node;
    panelNode.setPosition(new Vec3(0, -10, 0));
    const panelTransform = panelNode.addComponent(UITransform);
    panelTransform.setContentSize(PANEL_WIDTH, PANEL_HEIGHT);
    this.panel = panelNode.addComponent(Graphics);

    const breadNode = new Node('LoadingBread');
    breadNode.layer = Layers.Enum.UI_2D;
    breadNode.parent = panelNode;
    breadNode.setPosition(new Vec3(0, 86, 0));
    const breadTransform = breadNode.addComponent(UITransform);
    breadTransform.setContentSize(92, 92);
    const bread = breadNode.addComponent(Graphics);
    bread.fillColor = new Color(255, 232, 197, 255);
    bread.roundRect(-40, -18, 80, 56, 24);
    bread.fill();
    bread.fillColor = new Color(214, 145, 70, 255);
    bread.roundRect(-34, -12, 68, 44, 20);
    bread.fill();

    this.titleLabel = this.createLabel(panelNode, 'LoadingTitle', new Vec3(0, 28, 0), 38, 44, PANEL_WIDTH - 60, 56);
    this.titleLabel.string = 'Toast N Roll';
    this.titleLabel.color = new Color(93, 57, 33, 255);

    this.subtitleLabel = this.createLabel(panelNode, 'LoadingSubtitle', new Vec3(0, -8, 0), 18, 22, PANEL_WIDTH - 80, 28);
    this.subtitleLabel.string = '暖心烘焙消除';
    this.subtitleLabel.color = new Color(152, 101, 57, 255);

    const trackNode = new Node('LoadingProgressTrack');
    trackNode.layer = Layers.Enum.UI_2D;
    trackNode.parent = panelNode;
    trackNode.setPosition(new Vec3(0, -68, 0));
    const trackTransform = trackNode.addComponent(UITransform);
    trackTransform.setContentSize(BAR_WIDTH, BAR_HEIGHT);
    this.progressTrack = trackNode.addComponent(Graphics);

    const fillNode = new Node('LoadingProgressFill');
    fillNode.layer = Layers.Enum.UI_2D;
    fillNode.parent = trackNode;
    fillNode.setPosition(Vec3.ZERO);
    const fillTransform = fillNode.addComponent(UITransform);
    fillTransform.setContentSize(BAR_WIDTH, BAR_HEIGHT);
    this.progressFill = fillNode.addComponent(Graphics);

    this.progressLabel = this.createLabel(panelNode, 'LoadingProgressLabel', new Vec3(0, -104, 0), 18, 22, 120, 26);
    this.progressLabel.color = new Color(105, 69, 42, 255);

    this.tipLabel = this.createLabel(panelNode, 'LoadingTipLabel', new Vec3(0, -144, 0), 16, 20, PANEL_WIDTH - 80, 24);
    this.tipLabel.color = new Color(143, 101, 67, 255);

    this.drawBackground();
    this.applyBackgroundSprite();
    this.drawPanel();
    this.drawProgressTrack();
    this.updateProgress(0);
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

  private drawBackground(): void {
    if (!this.background) {
      return;
    }

    this.background.clear();
    this.background.fillColor = new Color(134, 188, 231, 255);
    this.background.rect(-OVERLAY_WIDTH / 2, -OVERLAY_HEIGHT / 2, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    this.background.fill();
    this.background.fillColor = new Color(245, 222, 179, 255);
    this.background.rect(-OVERLAY_WIDTH / 2, -OVERLAY_HEIGHT / 2, OVERLAY_WIDTH, 420);
    this.background.fill();
  }

  private applyBackgroundSprite(): void {
    if (!this.backgroundSprite) {
      return;
    }

    this.backgroundSprite.spriteFrame = null;
    this.spriteFrameLoader.load('ui/load_bg', (frame) => {
      if (!this.backgroundSprite || !this.backgroundSprite.isValid || !this.node.isValid) {
        return;
      }

      if (!frame) {
        return;
      }

      this.backgroundSprite.spriteFrame = frame;
    });
  }

  private drawPanel(): void {
    if (!this.panel) {
      return;
    }

    this.panel.clear();
    this.panel.fillColor = new Color(255, 249, 240, 255);
    this.panel.roundRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 40);
    this.panel.fill();
    this.panel.fillColor = new Color(233, 204, 164, 255);
    this.panel.roundRect(-PANEL_WIDTH / 2 + 12, -PANEL_HEIGHT / 2 + 12, PANEL_WIDTH - 24, PANEL_HEIGHT - 24, 34);
    this.panel.fill();
  }

  private drawProgressTrack(): void {
    if (!this.progressTrack) {
      return;
    }

    this.progressTrack.clear();
    this.progressTrack.fillColor = new Color(242, 228, 208, 255);
    this.progressTrack.roundRect(-BAR_WIDTH / 2, -BAR_HEIGHT / 2, BAR_WIDTH, BAR_HEIGHT, 11);
    this.progressTrack.fill();
  }

  private drawProgressFill(progress: number): void {
    if (!this.progressFill) {
      return;
    }

    const clamped = Math.max(0, Math.min(1, progress));
    this.progressFill.clear();
    if (clamped <= 0) {
      return;
    }

    const fillWidth = BAR_WIDTH * clamped;
    this.progressFill.fillColor = new Color(255, 188, 88, 255);
    this.progressFill.roundRect(-BAR_WIDTH / 2, -BAR_HEIGHT / 2, fillWidth, BAR_HEIGHT, 11);
    this.progressFill.fill();
  }

  private resetState(): void {
    this.clearTimers();
    this.currentProgress = 0;
    this.isReady = false;
    this.isProgressFinished = false;
    this.completionResolver = null;
    this.updateProgress(0);
    if (this.tipLabel) {
      this.tipLabel.string = LOADING_TIPS[0];
    }
  }

  private startFakeProgress(): void {
    const stepIntervalMs = 30;
    const increment = 1 / (DEFAULT_DURATION_MS / stepIntervalMs);

    this.progressTimer = setInterval(() => {
      const nextProgress = Math.min(1, this.currentProgress + increment);
      this.updateProgress(nextProgress);

      if (nextProgress >= 1) {
        this.isProgressFinished = true;
        if (this.progressTimer) {
          clearInterval(this.progressTimer);
          this.progressTimer = null;
        }

        if (this.tipLabel) {
          this.tipLabel.string = this.isReady ? '准备就绪!' : '资源加载中...';
        }
        this.maybeComplete();
      }
    }, stepIntervalMs);
  }

  private updateProgress(progress: number): void {
    this.currentProgress = Math.max(0, Math.min(1, progress));
    this.drawProgressFill(this.currentProgress);

    if (this.progressLabel) {
      this.progressLabel.string = `${Math.floor(this.currentProgress * 100)}%`;
    }

    if (this.tipLabel && !this.isReady) {
      const tipIndex = Math.min(
        LOADING_TIPS.length - 1,
        Math.floor(this.currentProgress * LOADING_TIPS.length),
      );
      this.tipLabel.string = LOADING_TIPS[tipIndex];
    }
  }

  private markReady(): void {
    this.isReady = true;
    if (this.tipLabel) {
      this.tipLabel.string = this.isProgressFinished ? '准备就绪!' : '资源已加载，正在进入面包店...';
    }
    this.maybeComplete();
  }

  private maybeComplete(): void {
    if (!this.isReady || !this.isProgressFinished || this.completionTimer) {
      return;
    }

    this.completionTimer = setTimeout(() => {
      this.completionTimer = null;
      this.node.active = false;
      const resolver = this.completionResolver;
      this.completionResolver = null;
      resolver?.();
    }, 300);
  }

  private clearTimers(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }

    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
  }
}
