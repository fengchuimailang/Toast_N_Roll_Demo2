import {
  _decorator,
  Color,
  Graphics,
  Label,
  Layers,
  Node,
  UITransform,
  Vec3,
} from 'cc';

import { DialogController } from '../lbspace/components/DialogController';
import { GameSession, type SessionEvent } from '../game/session/GameSession';

const { ccclass } = _decorator;

const MESSAGE_WIDTH = 520;
const MESSAGE_HEIGHT = 88;

type NoticeTone = 'neutral' | 'success' | 'warning';

@ccclass('MessageOverlayController')
export class MessageOverlayController extends DialogController {
  private unsubscribe: (() => void) | null = null;
  private background: Graphics | null = null;
  private accent: Graphics | null = null;
  private titleLabel: Label | null = null;
  private messageLabel: Label | null = null;

  protected _fadeInAnim = 'fromTop' as const;

  protected static _getPrefab(): null {
    return null;
  }

  protected onLoad(): void {
    this.ensureScaffold();
  }

  protected onDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  public bind(session: GameSession): void {
    this.ensureScaffold();
    this.unsubscribe?.();
    this.unsubscribe = session.subscribe((event) => this.handleSessionEvent(event));
  }

  private handleSessionEvent(event: SessionEvent): void {
    if (event.type !== 'notice') {
      return;
    }

    this.showMessage(event.message, event.durationMs);
  }

  private ensureScaffold(): void {
    if (this.background && this.accent && this.titleLabel && this.messageLabel) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(MESSAGE_WIDTH, MESSAGE_HEIGHT);

    this.background = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);

    const accentNode = new Node('MessageAccent');
    accentNode.layer = Layers.Enum.UI_2D;
    accentNode.parent = this.node;
    accentNode.setPosition(new Vec3(-MESSAGE_WIDTH / 2 + 12, 0, 0));
    const accentTransform = accentNode.addComponent(UITransform);
    accentTransform.setContentSize(12, MESSAGE_HEIGHT - 18);
    this.accent = accentNode.addComponent(Graphics);

    const titleNode = new Node('MessageTitle');
    titleNode.layer = Layers.Enum.UI_2D;
    titleNode.parent = this.node;
    titleNode.setPosition(new Vec3(-178, 18, 0));
    const titleTransform = titleNode.addComponent(UITransform);
    titleTransform.setContentSize(120, 24);
    this.titleLabel = titleNode.addComponent(Label);
    this.titleLabel.fontSize = 18;
    this.titleLabel.lineHeight = 22;
    this.titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.titleLabel.verticalAlign = Label.VerticalAlign.CENTER;

    const messageNode = new Node('MessageLabel');
    messageNode.layer = Layers.Enum.UI_2D;
    messageNode.parent = this.node;
    messageNode.setPosition(new Vec3(16, -10, 0));
    const messageTransform = messageNode.addComponent(UITransform);
    messageTransform.setContentSize(MESSAGE_WIDTH - 92, 42);
    this.messageLabel = messageNode.addComponent(Label);
    this.messageLabel.fontSize = 22;
    this.messageLabel.lineHeight = 28;
    this.messageLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    this.messageLabel.verticalAlign = Label.VerticalAlign.CENTER;

    this.drawBackground('neutral');
  }

  protected _open(message: string, durationMs?: number): void {
    const tone = this.resolveTone(message);
    this.drawBackground(tone);
    this.titleLabel!.string = this.getTitleByTone(tone);
    this.messageLabel!.string = message;

    const duration = (durationMs ?? 2000) / 1000;
    this.scheduleOnce(() => {
      this.close();
    }, duration);
  }

  public showMessage(message: string, durationMs?: number): void {
    if (!this.titleLabel || !this.messageLabel) {
      return;
    }

    this.open(message, durationMs);
  }

  private resolveTone(message: string): NoticeTone {
    if (message.includes('完成') || message.includes('成功') || message.includes('已切换') || message.includes('已重新洗牌')) {
      return 'success';
    }

    if (message.includes('无法') || message.includes('不能') || message.includes('没有') || message.includes('取消') || message.includes('未解锁')) {
      return 'warning';
    }

    return 'neutral';
  }

  private getTitleByTone(tone: NoticeTone): string {
    switch (tone) {
      case 'success':
        return '进展更新';
      case 'warning':
        return '操作提示';
      default:
        return '当前状态';
    }
  }

  private drawBackground(tone: NoticeTone): void {
    if (!this.background || !this.accent || !this.titleLabel || !this.messageLabel) {
      return;
    }

    const palette = this.getTonePalette(tone);

    this.background.clear();
    this.background.fillColor = palette.background;
    this.background.roundRect(-MESSAGE_WIDTH / 2, -MESSAGE_HEIGHT / 2, MESSAGE_WIDTH, MESSAGE_HEIGHT, 30);
    this.background.fill();
    this.background.fillColor = palette.inner;
    this.background.roundRect(-MESSAGE_WIDTH / 2 + 8, -MESSAGE_HEIGHT / 2 + 8, MESSAGE_WIDTH - 16, MESSAGE_HEIGHT - 16, 24);
    this.background.fill();
    this.background.fillColor = palette.accent;
    this.background.roundRect(-6, -(MESSAGE_HEIGHT - 18) / 2, 12, MESSAGE_HEIGHT - 18, 6);
    this.background.fill();

    this.titleLabel.color = palette.title;
    this.messageLabel.color = palette.message;
  }

  private getTonePalette(tone: NoticeTone): {
    background: Color;
    inner: Color;
    accent: Color;
    title: Color;
    message: Color;
  } {
    switch (tone) {
      case 'success':
        return {
          background: new Color(114, 86, 54, 220),
          inner: new Color(255, 247, 231, 255),
          accent: new Color(93, 166, 102, 255),
          title: new Color(102, 121, 57, 255),
          message: new Color(93, 63, 39, 255),
        };
      case 'warning':
        return {
          background: new Color(102, 72, 49, 220),
          inner: new Color(255, 242, 228, 255),
          accent: new Color(219, 142, 74, 255),
          title: new Color(170, 96, 37, 255),
          message: new Color(104, 63, 35, 255),
        };
      default:
        return {
          background: new Color(81, 54, 31, 224),
          inner: new Color(255, 246, 235, 255),
          accent: new Color(189, 128, 59, 255),
          title: new Color(140, 92, 48, 255),
          message: new Color(94, 60, 33, 255),
        };
    }
  }
}
