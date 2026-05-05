/**
 * TrayRenderer - 用 Graphics 动态绘制 Tray
 * 
 * 视觉效果：
 * - 圆角边框
 * - 下方阴影
 * - 连接线（同种虚线，不同实线）
 */

import { _decorator, Color, Component, Graphics, Node, UITransform, Vec3 } from 'cc';
import type { TrayVariant, Direction } from '../domain/core/tray-manager';

const { ccclass } = _decorator;

// 等级对应颜色（米白→深棕）
const TIER_COLORS: Record<number, Color> = {
    1: new Color(245, 222, 179, 255),  // wheat: #F5DEB3
    2: new Color(232, 213, 183, 255),  // flour: #E8D5B7
    3: new Color(210, 180, 140, 255),  // dough: #D2B48C
    4: new Color(196, 164, 122, 255),  // bread: #C4A47A
    5: new Color(139, 105, 20, 255),   // toast: #8B6914
    6: new Color(255, 215, 0, 255),    // gift: #FFD700
};

@ccclass('TrayRenderer')
export class TrayRenderer extends Component {
    private graphics: Graphics | null = null;
    private shadowGraphics: Graphics | null = null;
    private currentVariant: TrayVariant = 'none';

    protected onLoad(): void {
        this.ensureComponents();
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
        this.currentVariant = variant;

        if (variant === 'none') {
            this.node.active = false;
            return;
        }

        this.node.active = true;
        this.node.setRotationFromEuler(0, 0, rotation);

        const color = TIER_COLORS[tier] ?? TIER_COLORS[1];

        // 绘制阴影
        this.drawShadow(variant);

        // 绘制边框
        this.drawBorder(variant, color);

        // 绘制连接线
        this.drawConnectionLines(variant, connections, isSameTypeConnection, color);
    }

    /**
     * 隐藏 Tray
     */
    public hideTray(): void {
        if (this.graphics) {
            this.graphics.clear();
        }
        if (this.shadowGraphics) {
            this.shadowGraphics.clear();
        }
        this.node.active = false;
    }

    private ensureComponents(): void {
        // 阴影层
        if (!this.shadowGraphics) {
            let shadowNode = this.node.getChildByName('Shadow');
            if (!shadowNode) {
                shadowNode = new Node('Shadow');
                shadowNode.parent = this.node;
                shadowNode.setPosition(new Vec3(0, -3, 0));
                const st = shadowNode.addComponent(UITransform);
                st.setContentSize(128, 136);
                this.shadowGraphics = shadowNode.addComponent(Graphics);
            } else {
                this.shadowGraphics = shadowNode.getComponent(Graphics) ?? shadowNode.addComponent(Graphics);
            }
        }

        // 边框层
        if (!this.graphics) {
            let borderNode = this.node.getChildByName('Border');
            if (!borderNode) {
                borderNode = new Node('Border');
                borderNode.parent = this.node;
                const bt = borderNode.addComponent(UITransform);
                bt.setContentSize(128, 136);
                this.graphics = borderNode.addComponent(Graphics);
            } else {
                this.graphics = borderNode.getComponent(Graphics) ?? borderNode.addComponent(Graphics);
            }
        }
    }

    /**
     * 绘制阴影
     */
    private drawShadow(variant: TrayVariant): void {
        if (!this.shadowGraphics) return;
        const g = this.shadowGraphics;
        g.clear();

        const shadowColor = new Color(0, 0, 0, 100);
        g.fillColor = shadowColor;

        const w = 128;
        const h = 136;
        const r = 12;

        // 阴影偏移更明显
        g.roundRect(-w / 2 + 3, -h / 2 - 3, w, h, r);
        g.fill();
    }

    /**
     * 绘制边框和背景
     */
    private drawBorder(variant: TrayVariant, color: Color): void {
        if (!this.graphics) return;
        const g = this.graphics;
        g.clear();

        const w = 128;
        const h = 136;
        const r = 12;

        // 绘制半透明背景（更明显）
        const bgColor = new Color(color.r, color.g, color.b, 80);
        g.fillColor = bgColor;
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.fill();

        // 绘制边框
        g.strokeColor = color;
        g.lineWidth = 3;
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.stroke();
    }

    /**
     * 绘制连接线
     */
    private drawConnectionLines(
        variant: TrayVariant,
        connections: Record<Direction, boolean>,
        isSameTypeConnection: Record<Direction, boolean>,
        color: Color
    ): void {
        if (!this.graphics) return;
        const g = this.graphics;

        const w = 128;
        const h = 136;
        const lineColor = new Color(color.r, color.g, color.b, 180);
        g.strokeColor = lineColor;
        g.lineWidth = 2;

        // 绘制连接线
        if (connections.left) {
            if (isSameTypeConnection.left) {
                // 虚线（同种）
                this.drawDashedLine(g, -w / 2, 0, -w / 2 + 20, 0);
            } else {
                // 实线（不同种）
                g.moveTo(-w / 2, 0);
                g.lineTo(-w / 2 + 20, 0);
                g.stroke();
            }
        }

        if (connections.right) {
            if (isSameTypeConnection.right) {
                this.drawDashedLine(g, w / 2, 0, w / 2 - 20, 0);
            } else {
                g.moveTo(w / 2, 0);
                g.lineTo(w / 2 - 20, 0);
                g.stroke();
            }
        }

        if (connections.top) {
            if (isSameTypeConnection.top) {
                this.drawDashedLine(g, 0, h / 2, 0, h / 2 - 20);
            } else {
                g.moveTo(0, h / 2);
                g.lineTo(0, h / 2 - 20);
                g.stroke();
            }
        }

        if (connections.bottom) {
            if (isSameTypeConnection.bottom) {
                this.drawDashedLine(g, 0, -h / 2, 0, -h / 2 + 20);
            } else {
                g.moveTo(0, -h / 2);
                g.lineTo(0, -h / 2 + 20);
                g.stroke();
            }
        }
    }

    /**
     * 绘制虚线
     */
    private drawDashedLine(g: Graphics, x1: number, y1: number, x2: number, y2: number): void {
        const dashLength = 4;
        const gapLength = 4;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const dashCount = Math.floor(length / (dashLength + gapLength));

        for (let i = 0; i < dashCount; i++) {
            const start = i * (dashLength + gapLength);
            const end = start + dashLength;

            const sx = x1 + (dx * start) / length;
            const sy = y1 + (dy * start) / length;
            const ex = x1 + (dx * end) / length;
            const ey = y1 + (dy * end) / length;

            g.moveTo(sx, sy);
            g.lineTo(ex, ey);
            g.stroke();
        }
    }
}
