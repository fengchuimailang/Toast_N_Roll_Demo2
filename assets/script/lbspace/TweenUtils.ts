/**
 * ✨ TweenUtils - 缓动动画工具
 * 借鉴自 ref_project/dlspace/TweenUtils
 *
 * 功能：
 * - 统一的渐入渐出动画
 * - 弧线位移动画
 * - 震动效果
 *
 * 使用方式：
 * ```typescript
 * import { TweenUtils } from '../lbspace';
 *
 * // 节点从上方滑入
 * TweenUtils.fadeIn(node, 'fromTop', () => console.log('done'));
 *
 * // 节点淡出并销毁
 * TweenUtils.fadeOut(node, () => node.destroy());
 *
 * // 弧线抛物线运动
 * TweenUtils.modifyPositionByArc(node, targetPos, height, duration, true);
 *
 * // 震动效果
 * TweenUtils.shake(node, () => console.log('shake done'));
 * ```
 */

import { Node, tween, v3, Vec3 } from 'cc';

/**
 * 渐入动画类型
 */
export type TweenFadeInType = 'fromTop' | 'fromBottom' | 'fromBig' | 'fromSmall';

const _tempVec3 = v3();

export class TweenUtils {
    /**
     * 渐入动画
     * @param node - 目标节点
     * @param type - 动画类型
     * @param call - 完成回调
     * @param duration - 动画时长（秒）
     */
    static fadeIn(
        node: Node,
        type: TweenFadeInType,
        call: (() => void) | null = null,
        duration = 0.5,
    ): void {
        if (type === 'fromTop') {
            const startPos = node.position.clone().add3f(0, 100, 0);
            const endPos = node.position.clone();
            node.position = startPos;
            this.modifyOpacity(node, 0, 255, null, duration / 3);
            tween(node)
                .to(duration, { position: endPos }, { easing: 'backOut' })
                .call(call ?? (() => {}))
                .start();
        } else if (type === 'fromBottom') {
            const startPos = node.position.clone().add3f(0, -100, 0);
            const endPos = node.position.clone();
            node.position = startPos;
            this.modifyOpacity(node, 0, 255, null, duration / 3);
            tween(node)
                .to(duration, { position: endPos }, { easing: 'backOut' })
                .call(call ?? (() => {}))
                .start();
        } else if (type === 'fromBig') {
            const startScale = node.scale.clone().multiplyScalar(1.5);
            const endScale = node.scale.clone();
            node.scale = startScale;
            this.modifyOpacity(node, 0, 255, null, duration / 3);
            tween(node)
                .to(duration, { scale: endScale }, { easing: 'backOut' })
                .call(call ?? (() => {}))
                .start();
        } else if (type === 'fromSmall') {
            const startScale = node.scale.clone().multiplyScalar(0.5);
            const endScale = node.scale.clone();
            node.scale = startScale;
            this.modifyOpacity(node, 0, 255, null, duration / 3);
            tween(node)
                .to(duration, { scale: endScale }, { easing: 'backOut' })
                .call(call ?? (() => {}))
                .start();
        }
    }

    /**
     * 渐出动画
     * @param node - 目标节点
     * @param call - 完成回调
     * @param duration - 动画时长（秒）
     */
    static fadeOut(
        node: Node,
        call: (() => void) | null = null,
        duration = 0.1,
    ): void {
        this.modifyOpacity(node, 255, 0, call, duration);
    }

    /**
     * 透明度渐变
     * @param node - 目标节点
     * @param startOpacity - 起始透明度（0-255）
     * @param endOpacity - 结束透明度（0-255）
     * @param call - 完成回调
     * @param duration - 动画时长（秒）
     */
    static modifyOpacity(
        node: Node,
        startOpacity: number,
        endOpacity: number,
        call: (() => void) | null = null,
        duration = 0.2,
    ): void {
        node.opacity = startOpacity;
        tween(node)
            .to(duration, { opacity: endOpacity })
            .call(call ?? (() => {}))
            .start();
    }

    /**
     * 弧线抛物线运动
     * @param node - 目标节点
     * @param position - 终点位置
     * @param height - 弧线高度
     * @param duration - 动画时长（秒）
     * @param needRotate - 是否朝运动方向旋转
     */
    static modifyPositionByArc(
        node: Node,
        position: Vec3,
        height: number,
        duration: number,
        needRotate: boolean,
    ): void {
        const start = v3(node.position);
        const end = v3(position);

        if (needRotate) {
            node.lookAt(end);
        }

        tween({ t: 0 })
            .to(duration, { t: 1 }, {
                onUpdate(target: { t: number }) {
                    const ratio = target.t;
                    Vec3.lerp(_tempVec3, start, end, ratio);
                    _tempVec3.y += Math.sin(ratio * Math.PI) * height;
                    node.setPosition(_tempVec3);
                    if (needRotate) {
                        node.lookAt(end);
                    }
                },
            })
            .start();
    }

    /**
     * 震动效果
     * @param node - 目标节点
     * @param call - 完成回调
     * @param duration - 动画时长（秒）
     * @param angle - 震动角度（默认 30）
     */
    static shake(
        node: Node,
        call: (() => void) | null = null,
        duration = 0.1,
        angle = 30,
    ): void {
        const halfDuration = duration / 5;
        tween(node)
            .to(halfDuration * 2, { angle })
            .to(halfDuration * 2, { angle: -angle })
            .to(halfDuration, { angle: 0 })
            .call(call ?? (() => {}))
            .start();
    }

    /**
     * 缩放弹跳效果
     * @param node - 目标节点
     * @param call - 完成回调
     * @param duration - 动画时长（秒）
     */
    static bounce(
        node: Node,
        call: (() => void) | null = null,
        duration = 0.3,
    ): void {
        const originalScale = node.scale.clone();
        const bigScale = originalScale.clone().multiplyScalar(1.2);

        tween(node)
            .to(duration / 2, { scale: bigScale }, { easing: 'backOut' })
            .to(duration / 2, { scale: originalScale }, { easing: 'quadOut' })
            .call(call ?? (() => {}))
            .start();
    }
}
