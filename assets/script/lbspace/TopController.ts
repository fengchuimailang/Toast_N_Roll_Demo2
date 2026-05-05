/**
 * 🍞 TopController - 顶部提示基类
 * 借鉴自 ref_project/dlspace/components/TopController
 *
 * 功能：
 * - 顶部滑入提示
 * - 自动消失（默认 2.5 秒）
 * - 可手动关闭
 *
 * 使用方式：
 * ```typescript
 * // 继承方式
 * @ccclass('ToastView')
 * export class ToastView extends TopController {
 *     protected static _getPrefab(): Prefab {
 *         return resources.get('prefabs/Toast') as Prefab;
 *     }
 *
 *     protected _open(message: string): void {
 *         this.showMessage(message);
 *     }
 * }
 *
 * // 静态创建
 * const toast = ToastView.show('操作成功');
 *
 * // MsgMgr 全局提示（更方便）
 * MsgMgr.emit('Toast', '道具不足');
 * ```
 */

import { _decorator, Node, Prefab, instantiate } from 'cc';
import { UIMgr } from './UIMgr';
import { TweenUtils } from './TweenUtils';
import { Controller } from './Controller';

const { ccclass, property } = _decorator;

@ccclass('TopController')
export class TopController extends Controller {
    /** 内容节点 */
    @property(Node)
    content: Node | null = null;

    /** 自动关闭延迟（毫秒） */
    protected _autoCloseDelay = 2500;

    /** 内部定时器 ID */
    private _autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * 静态创建提示实例
     */
    static show<T extends TopController>(
        this: new (...args: unknown[]) => T,
        ...args: unknown[]
    ): T {
        const prefab = (this as typeof TopController & { _getPrefab: () => Prefab | null })._getPrefab?.() ?? null;
        const node = prefab ? instantiate(prefab) : new Node();
        node.parent = UIMgr.instance.topParent;

        const comp = node.getComponent(TopController) as T;
        if (comp) {
            comp.open(...args);
        }

        return comp;
    }

    /**
     * 获取关联的 Prefab（子类重写）
     */
    protected static _getPrefab(): Prefab | null {
        return null;
    }

    /**
     * 打开提示（子类实现初始化逻辑）
     */
    protected _open(...args: unknown[]): void {
        // 子类实现
    }

    /**
     * 打开提示（外部调用）
     */
    open(...args: unknown[]): void {
        this._open(...args);

        if (this._autoCloseDelay > 0) {
            this._startAutoCloseTimer();
        }
    }

    /**
     * 关闭提示
     */
    close(): void {
        this._clearAutoCloseTimer();

        if (this.content) {
            TweenUtils.fadeOut(this.content, () => {
                this.node.active = false;
            }, 0.2);
        } else {
            this.node.active = false;
        }
    }

    /**
     * 设置自动关闭延迟
     * @param delay 延迟时间（毫秒），0 表示不自动关闭
     */
    setAutoCloseDelay(delay: number): void {
        this._autoCloseDelay = delay;
    }

    /**
     * 开始自动关闭计时器
     */
    protected _startAutoCloseTimer(): void {
        this._clearAutoCloseTimer();
        if (this._autoCloseDelay > 0) {
            this._autoCloseTimer = setTimeout(() => {
                this.close();
            }, this._autoCloseDelay);
        }
    }

    /**
     * 清除自动关闭计时器
     */
    private _clearAutoCloseTimer(): void {
        if (this._autoCloseTimer !== null) {
            clearTimeout(this._autoCloseTimer);
            this._autoCloseTimer = null;
        }
    }

    /**
     * 显示内容的默认实现（可被子类重写）
     */
    protected showContent(message: string): void {
        // 子类实现具体内容显示
    }

    unuse(): void {
        super.unuse();
        this._clearAutoCloseTimer();
    }
}
