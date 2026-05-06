import { _decorator, BlockInputEvents, Node, Prefab, instantiate } from 'cc';
import { UIMgr } from '../common/UIMgr';
import { TweenFadeInType, TweenUtils } from '../utils/TweenUtils';
import { Controller } from './Controller';
const { ccclass, property } = _decorator;

enum DialogEventType {
    OnClose = 'OnClose',
    OnDestroy = 'OnDestroy',
}

@ccclass('DialogController')
export class DialogController extends Controller {
    /** 遮罩节点 */
    @property(Node)
    mask: Node | null = null;

    /** 内容节点（动画目标） */
    @property(Node)
    content: Node | null = null;

    /** 事件类型枚举 */
    static EventType = DialogEventType;

    /** 渐入动画类型，null 表示不使用动画 */
    protected _fadeInAnim: TweenFadeInType | null = 'fromSmall';

    /** 遮罩透明度 */
    protected _maskOpacity = 180;

    /**
     * 静态创建弹窗实例
     */
    static show<T extends DialogController>(
        this: new (...args: unknown[]) => T,
        ...args: unknown[]
    ): T {
        const thisCtor = this as typeof DialogController & { _getPrefab?: () => Prefab | null };
        const prefab = thisCtor._getPrefab?.() ?? null;

        let node: Node;
        if (prefab) {
            node = instantiate(prefab);
        } else {
            node = new Node();
        }
        node.parent = UIMgr.instance.dialogParent;

        let comp = node.getComponent(DialogController) as T | null;

        if (!comp) {
            comp = node.addComponent(DialogController) as unknown as T;
        }

        if (!node.getComponent(BlockInputEvents)) {
            node.addComponent(BlockInputEvents);
        }

        if (comp) {
            comp.open(...args);
        }

        return comp!;
    }

    /**
     * 获取关联的 Prefab（子类重写）
     */
    protected static _getPrefab(): Prefab | null {
        return null;
    }

    /**
     * 打开弹窗（子类实现初始化逻辑）
     */
    protected _open(...args: unknown[]): void {
        // 子类实现
    }

    /**
     * 打开弹窗（外部调用）
     */
    open(...args: unknown[]): void {
        if (this._fadeInAnim !== null && this.content) {
            TweenUtils.fadeIn(this.content, this._fadeInAnim, null, 0.5);
        }
        this._open(...args);
    }

    /**
     * 关闭弹窗
     */
    close(): void {
        this.node.emit(DialogController.EventType.OnClose);

        if (this.mask) {
            TweenUtils.fadeOut(this.mask, null, 0.1);
        }

        if (this._fadeInAnim !== null && this.content) {
            TweenUtils.fadeOut(this.content, () => {
                this.node.emit(DialogController.EventType.OnDestroy);
                this.node.destroy();
            }, 0.15);
        } else {
            this.node.emit(DialogController.EventType.OnDestroy);
            this.node.destroy();
        }
    }

    /**
     * 显示遮罩
     */
    showMask(opacity = 180): void {
        if (!this.mask) return;
        this._maskOpacity = opacity;
        this.mask.opacity = 0;
        TweenUtils.modifyOpacity(this.mask, 0, opacity, null, 0.2);
    }

    /**
     * 隐藏遮罩
     */
    hideMask(): void {
        if (!this.mask) return;
        TweenUtils.fadeOut(this.mask, null, 0.1);
    }

    /**
     * 设置动画类型
     */
    setFadeInAnim(anim: TweenFadeInType | null): void {
        this._fadeInAnim = anim;
    }
}
