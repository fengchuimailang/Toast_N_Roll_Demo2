import { _decorator, Color, Component, Sprite, SpriteFrame, UITransform, UIOpacity, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('CellView')
export class CellView extends Component {
  private sprite: Sprite | null = null;
  private opacity: UIOpacity | null = null;

  protected onLoad(): void {
    this.ensureComponents();
  }

  public configure(size: number): void {
    this.ensureComponents();
    const transform = this.node.getComponent(UITransform);
    transform?.setContentSize(size, size);
  }

  public setSpriteFrame(frame: SpriteFrame | null): void {
    this.ensureComponents();
    if (this.sprite) {
      this.sprite.spriteFrame = frame;
    }
  }

  public setSelected(selected: boolean): void {
    this.ensureComponents();
    if (!this.sprite) {
      return;
    }

    this.node.setScale(selected ? new Vec3(1.08, 1.08, 1) : new Vec3(1, 1, 1));
    this.sprite.color = selected
      ? new Color(255, 239, 204, 255)
      : Color.WHITE;
  }

  public setOpacity(value: number): void {
    this.ensureComponents();
    if (this.opacity) {
      this.opacity.opacity = value;
    }
  }

  public resetViewState(): void {
    this.ensureComponents();
    this.node.setScale(new Vec3(1, 1, 1));
    this.node.setPosition(new Vec3(0, 0, 0));
    this.setOpacity(255);
    this.setSelected(false);
    this.setSpriteFrame(null);
    this.node.active = true;
  }

  private ensureComponents(): void {
    this.sprite = this.node.getComponent(Sprite) ?? this.node.addComponent(Sprite);
    this.opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    this.node.active = true;

    this.sprite.type = Sprite.Type.SIMPLE;
    this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.sprite.color = Color.WHITE;
  }
}
