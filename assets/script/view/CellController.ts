import { _decorator, Color, Component, Node, Sprite, SpriteFrame, UITransform, UIOpacity, Vec3, resources } from 'cc';
import type { TrayVariant, Direction } from '../domain/core/tray-manager';
import { TrayRenderer } from './TrayRenderer';

const { ccclass } = _decorator;

// Pre-allocated constants to avoid GC pressure
const VEC3_SELECTED = new Vec3(1.08, 1.08, 1);
const VEC3_NORMAL = new Vec3(1, 1, 1);
const COLOR_SELECTED = new Color(255, 239, 204, 255);

@ccclass('CellController')
export class CellController extends Component {
    private sprite: Sprite | null = null;
    private opacity: UIOpacity | null = null;
    private badgeNode: Node | null = null;
    private badgeSprite: Sprite | null = null;
    private trayNode: Node | null = null;
    private trayRenderer: TrayRenderer | null = null;

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

    /**
     * 设置口味徽章
     */
    public setFlavorBadge(badgePath: string | null): void {
        this.ensureComponents();

        if (!badgePath) {
            if (this.badgeNode) {
                this.badgeNode.active = false;
            }
            return;
        }

        this.ensureBadgeNode();

        resources.load(badgePath + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (err || !spriteFrame) {
                if (this.badgeNode) {
                    this.badgeNode.active = false;
                }
                return;
            }
            if (this.badgeSprite && this.badgeNode) {
                this.badgeSprite.spriteFrame = spriteFrame;
                this.badgeNode.active = true;
            }
        });
    }

    /**
     * 设置 Tray 显示
     */
    public setTray(
        variant: TrayVariant,
        tier: number,
        rotation: number,
        connections: Record<Direction, boolean>,
        isSameTypeConnection: Record<Direction, boolean>
    ): void {
        this.ensureComponents();

        if (variant === 'none') {
            if (this.trayRenderer) {
                this.trayRenderer.hideTray();
            }
            return;
        }

        this.ensureTrayRenderer();

        if (this.trayRenderer) {
            this.trayRenderer.setTray(variant, tier, rotation, connections, isSameTypeConnection);
        }
    }

    /**
     * 隐藏 Tray
     */
    public hideTray(): void {
        if (this.trayRenderer) {
            this.trayRenderer.hideTray();
        }
    }

    public setSelected(selected: boolean): void {
        this.ensureComponents();
        if (!this.sprite) {
            return;
        }

        this.node.setScale(selected ? VEC3_SELECTED : VEC3_NORMAL);
        this.sprite.color = selected ? COLOR_SELECTED : Color.WHITE;
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
        this.setFlavorBadge(null);
        this.hideTray();
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

    /**
     * 确保徽章节点存在
     */
    private ensureBadgeNode(): void {
        if (this.badgeNode) return;

        this.badgeNode = this.node.getChildByName('FlavorBadge');
        if (!this.badgeNode) {
            this.badgeNode = new Node('FlavorBadge');
            this.badgeNode.parent = this.node;

            const badgeTransform = this.badgeNode.addComponent(UITransform);
            badgeTransform.setContentSize(36, 36);

            this.badgeNode.setPosition(new Vec3(22, -22, 0));

            this.badgeSprite = this.badgeNode.addComponent(Sprite);
            this.badgeSprite.type = Sprite.Type.SIMPLE;
            this.badgeSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        } else {
            this.badgeSprite = this.badgeNode.getComponent(Sprite);
        }

        this.badgeNode.active = false;
    }

    /**
     * 确保 TrayRenderer 存在
     */
    private ensureTrayRenderer(): void {
        if (this.trayRenderer) return;

        this.trayNode = this.node.getChildByName('TrayOverlay');
        if (!this.trayNode) {
            this.trayNode = new Node('TrayOverlay');
            // 设置为第一个子节点（在食材图片下面）
            this.trayNode.parent = this.node;
            this.trayNode.setSiblingIndex(0);

            const trayTransform = this.trayNode.addComponent(UITransform);
            trayTransform.setContentSize(128, 136);

            this.trayRenderer = this.trayNode.addComponent(TrayRenderer);
        } else {
            this.trayRenderer = this.trayNode.getComponent(TrayRenderer);
        }
    }
}
