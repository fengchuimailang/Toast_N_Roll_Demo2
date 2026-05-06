import {
  _decorator,
  Color,
  EventTouch,
  Graphics,
  Label,
  Layers,
  Node,
  Prefab,
  UITransform,
  Vec3,
} from 'cc';

import type { AppSettings } from '../infra/SettingsStore';
import { DialogController } from '../lbspace/components/DialogController';
import { create9SliceButtonAsync } from '../lbspace/utils/ButtonFactory';

const { ccclass } = _decorator;

export type SettingsOverlayMode = 'settings' | 'pause';

interface SettingsOverlayBindings {
  onClose: () => void;
  onResume: () => Promise<void>;
  onExit: () => Promise<void>;
  onRestart: () => Promise<void>;
  onSettingsChanged: (patch: Partial<AppSettings>) => AppSettings;
}

interface ToggleRefs {
  key: keyof AppSettings;
  buttonNode: Node;
  track: Graphics;
  knobNode: Node;
  label: Label;
  value: boolean;
}

const OVERLAY_WIDTH = 750;
const OVERLAY_HEIGHT = 1334;
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 540;

@ccclass('SettingsOverlayController')
export class SettingsOverlayController extends DialogController {
  private mode: SettingsOverlayMode = 'settings';
  private callbacks: SettingsOverlayBindings | null = null;
  private settings: AppSettings = {
    musicEnabled: true,
    sfxEnabled: true,
    vibrationEnabled: true,
  };
  private readonly toggles = new Map<keyof AppSettings, ToggleRefs>();
  private titleLabel: Label | null = null;
  private primaryButton: Node | null = null;
  private secondaryButton: Node | null = null;
  private tertiaryButton: Node | null = null;
  private primaryLabel: Label | null = null;
  private secondaryLabel: Label | null = null;
  private tertiaryLabel: Label | null = null;
  private closeButton: Node | null = null;
  private backdropNode: Node | null = null;
  private panelNode: Node | null = null;
  private isBusy = false;

  protected static _getPrefab(): Prefab | null {
    return null;
  }

  protected onLoad(): void {
    this.ensureScaffold();
  }

  public bind(callbacks: SettingsOverlayBindings): void {
    this.callbacks = callbacks;
  }

  public open(mode: SettingsOverlayMode, settings: AppSettings): void {
    this.mode = mode;
    this.settings = { ...settings };
    this.isBusy = false;
    this.ensureScaffold();
    this.refresh();
    super.open();
  }

  protected _open(): void {
    // 由父类处理动画，子类只需要更新内容
  }

  public close(): void {
    this.callbacks?.onClose();
    super.close();
  }

  private ensureScaffold(): void {
    if (
      this.titleLabel
      && this.primaryButton
      && this.secondaryButton
      && this.tertiaryButton
      && this.primaryLabel
      && this.secondaryLabel
      && this.tertiaryLabel
      && this.closeButton
      && this.toggles.size === 3
    ) {
      return;
    }

    this.node.layer = Layers.Enum.UI_2D;
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);

    this.backdropNode = this.createGraphicsNode(this.node, 'SettingsBackdrop', Vec3.ZERO, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    const backdropGraphics = this.backdropNode.getComponent(Graphics) ?? this.backdropNode.addComponent(Graphics);
    backdropGraphics.fillColor = new Color(0, 0, 0, 142);
    backdropGraphics.rect(-OVERLAY_WIDTH / 2, -OVERLAY_HEIGHT / 2, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    backdropGraphics.fill();
    this.consumeTouches(this.backdropNode);
    this.mask = this.backdropNode;

    this.panelNode = this.createGraphicsNode(this.node, 'SettingsPanel', Vec3.ZERO, PANEL_WIDTH, PANEL_HEIGHT);
    const panelGraphics = this.panelNode.getComponent(Graphics) ?? this.panelNode.addComponent(Graphics);
    panelGraphics.fillColor = new Color(255, 248, 231, 255);
    panelGraphics.roundRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 34);
    panelGraphics.fill();
    panelGraphics.fillColor = new Color(237, 205, 157, 255);
    panelGraphics.roundRect(-PANEL_WIDTH / 2 + 12, -PANEL_HEIGHT / 2 + 12, PANEL_WIDTH - 24, PANEL_HEIGHT - 24, 28);
    panelGraphics.fill();
    this.consumeTouches(this.panelNode);
    this.content = this.panelNode;

    this.titleLabel = this.createLabel(this.panelNode!, 'SettingsTitle', new Vec3(0, 208, 0), 34, 40, 280, 48);
    this.titleLabel.color = new Color(97, 62, 38, 255);

    this.closeButton = this.createButton(this.panelNode!, 'SettingsCloseButton', new Vec3(180, 208, 0), 52, 52, new Color(189, 128, 59, 255));
    this.closeButton.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      if (this.mode === 'settings') {
        this.close();
      }
    });
    const closeLabel = this.createLabel(this.closeButton, 'SettingsCloseLabel', Vec3.ZERO, 26, 30, 52, 52);
    closeLabel.string = '×';
    closeLabel.color = Color.WHITE;

    this.createToggleRow(this.panelNode!, '背景音乐', 'musicEnabled', new Vec3(0, 108, 0));
    this.createToggleRow(this.panelNode!, '游戏音效', 'sfxEnabled', new Vec3(0, 28, 0));
    this.createToggleRow(this.panelNode!, '手机震动', 'vibrationEnabled', new Vec3(0, -52, 0));

    this.primaryButton = create9SliceButtonAsync(
      this.panelNode!,
      'SettingsPrimaryButton',
      { x: 0, y: -196 },
      236,
      64,
      new Color(220, 151, 72, 255),
      '',
      Color.WHITE
    );
    this.primaryButton.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      void this.handlePrimaryAction();
    });
    this.primaryLabel = this.createLabel(this.primaryButton, 'SettingsPrimaryLabel', Vec3.ZERO, 24, 28, 220, 48);
    this.primaryLabel.color = Color.WHITE;

    this.secondaryButton = create9SliceButtonAsync(
      this.panelNode!,
      'SettingsSecondaryButton',
      { x: -92, y: -126 },
      156,
      54,
      new Color(189, 128, 59, 255),
      '',
      Color.WHITE
    );
    this.secondaryButton.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      void this.handleSecondaryAction();
    });
    this.secondaryLabel = this.createLabel(this.secondaryButton, 'SettingsSecondaryLabel', Vec3.ZERO, 20, 24, 140, 42);
    this.secondaryLabel.color = Color.WHITE;

    this.tertiaryButton = create9SliceButtonAsync(
      this.panelNode!,
      'SettingsTertiaryButton',
      { x: 92, y: -126 },
      156,
      54,
      new Color(151, 104, 57, 255),
      '',
      Color.WHITE
    );
    this.tertiaryButton.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      void this.handleTertiaryAction();
    });
    this.tertiaryLabel = this.createLabel(this.tertiaryButton, 'SettingsTertiaryLabel', Vec3.ZERO, 20, 24, 140, 42);
    this.tertiaryLabel.color = Color.WHITE;
  }

  private refresh(): void {
    if (
      !this.titleLabel
      || !this.primaryButton
      || !this.secondaryButton
      || !this.tertiaryButton
      || !this.primaryLabel
      || !this.secondaryLabel
      || !this.tertiaryLabel
      || !this.closeButton
    ) {
      return;
    }

    this.titleLabel.string = this.mode === 'pause' ? '暂停' : '设置';
    this.closeButton.active = this.mode === 'settings';

    if (this.mode === 'pause') {
      this.primaryLabel.string = '继续游戏';
      this.secondaryLabel.string = '退出大厅';
      this.tertiaryLabel.string = '重新开始';
      this.secondaryButton!.active = true;
      this.tertiaryButton!.active = true;
    } else {
      this.primaryLabel.string = '确定';
      this.secondaryLabel.string = '';
      this.tertiaryLabel.string = '';
      this.secondaryButton!.active = false;
      this.tertiaryButton!.active = false;
    }

    this.toggles.forEach((toggle) => {
      toggle.value = this.settings[toggle.key];
      this.refreshToggle(toggle);
    });
  }

  private createToggleRow(parent: Node, text: string, key: keyof AppSettings, position: Vec3): void {
    if (this.toggles.has(key)) {
      return;
    }

    const row = this.createGraphicsNode(parent, `ToggleRow-${key}`, position, 388, 62);
    const rowGraphics = row.getComponent(Graphics) ?? row.addComponent(Graphics);
    rowGraphics.fillColor = new Color(255, 255, 255, 124);
    rowGraphics.roundRect(-194, -31, 388, 62, 18);
    rowGraphics.fill();

    const label = this.createLabel(row, `ToggleLabel-${key}`, new Vec3(-112, 0, 0), 22, 26, 180, 30);
    label.string = text;
    label.color = new Color(97, 62, 38, 255);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;

    const buttonNode = new Node(`ToggleButton-${key}`);
    buttonNode.layer = Layers.Enum.UI_2D;
    buttonNode.parent = row;
    buttonNode.setPosition(new Vec3(132, 0, 0));
    const buttonTransform = buttonNode.addComponent(UITransform);
    buttonTransform.setContentSize(72, 34);
    this.consumeTouches(buttonNode);

    const trackNode = this.createGraphicsNode(buttonNode, `ToggleTrack-${key}`, Vec3.ZERO, 72, 34);
    const track = trackNode.getComponent(Graphics) ?? trackNode.addComponent(Graphics);

    const knobNode = new Node(`ToggleKnob-${key}`);
    knobNode.layer = Layers.Enum.UI_2D;
    knobNode.parent = buttonNode;
    knobNode.setPosition(new Vec3(-18, 0, 0));
    const knobTransform = knobNode.addComponent(UITransform);
    knobTransform.setContentSize(28, 28);
    const knobGraphics = knobNode.addComponent(Graphics);
    knobGraphics.fillColor = Color.WHITE;
    knobGraphics.circle(0, 0, 14);
    knobGraphics.fill();

    const refs: ToggleRefs = {
      key,
      buttonNode,
      track,
      knobNode,
      label,
      value: this.settings[key],
    };

    buttonNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      event.propagationStopped = true;
      this.toggleSetting(refs);
    });

    this.toggles.set(key, refs);
  }

  private refreshToggle(toggle: ToggleRefs): void {
    toggle.track.clear();
    toggle.track.fillColor = toggle.value ? new Color(126, 211, 33, 255) : new Color(201, 201, 201, 255);
    toggle.track.roundRect(-36, -17, 72, 34, 17);
    toggle.track.fill();
    toggle.knobNode.setPosition(new Vec3(toggle.value ? 18 : -18, 0, 0));
  }

  private toggleSetting(toggle: ToggleRefs): void {
    if (this.isBusy || !this.callbacks) {
      return;
    }

    toggle.value = !toggle.value;
    this.settings = this.callbacks.onSettingsChanged({
      [toggle.key]: toggle.value,
    });
    this.refresh();
  }

  private async handlePrimaryAction(): Promise<void> {
    if (this.isBusy) {
      return;
    }

    if (this.mode === 'pause') {
      this.isBusy = true;
      await this.callbacks?.onResume();
      this.isBusy = false;
      return;
    }

    this.close();
  }

  private async handleSecondaryAction(): Promise<void> {
    if (this.isBusy || this.mode !== 'pause') {
      return;
    }

    this.isBusy = true;
    await this.callbacks?.onExit();
    this.isBusy = false;
  }

  private async handleTertiaryAction(): Promise<void> {
    if (this.isBusy || this.mode !== 'pause') {
      return;
    }

    this.isBusy = true;
    await this.callbacks?.onRestart();
    this.isBusy = false;
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
    graphics.roundRect(-width / 2, -height / 2, width, height, 24);
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
}
