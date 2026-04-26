/**
 * 🎨 UIMgr - 统一 UI 层级管理器
 * 基于参考项目 dlspace/UIMgr 改进
 * 
 * 功能：
 * - 统一管理 UI 节点层级（dialog / top / persist）
 * - 提供场景切换时自动清理非持久化节点的能力
 * 
 * 使用方式：
 * ```typescript
 * import { UIMgr } from '../lbspace';
 * 
 * // 在场景中创建对话框
 * UIMgr.dialogParent.addChild(dialogNode);
 * 
 * // 创建持久化节点（如底部 TabBar）
 * UIMgr.persistParent.addChild(tabBarNode);
 * ```
 */

import { _decorator, director, Layers, Node, NodeEventType, RenderRoot2D, Widget } from 'cc';

const { ccclass } = _decorator;

@ccclass('UIMgr')
export class UIMgr {
    private static _instance: UIMgr;
    static get instance(): UIMgr {
        if (!this._instance) {
            this._instance = new UIMgr();
        }
        return this._instance;
    }

    /** 对话框/弹窗层 */
    readonly dialogParent: Node;

    /** 顶部提示/Toast 层 */
    readonly topParent: Node;

    /** 持久化层（跨场景保留） */
    readonly persistParent: Node;

    private _root: Node;

    private constructor() {
        this._root = this._createNode('UI-Root', true);
        this.dialogParent = this._createNode('UI-Dialog');
        this.topParent = this._createNode('UI-Top');
        this.persistParent = this._createNode('UI-Persist');

        this._root.on(NodeEventType.SCENE_CHANGED_FOR_PERSISTS, this._onSceneChanged, this);
    }

    /**
     * 创建一个 UI 节点，自动设置 UI_2D 层和全屏对齐
     */
    private _createNode(name: string, persist = false): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;

        if (persist) {
            director.addPersistRootNode(node);
            node.addComponent(RenderRoot2D);
        } else {
            node.parent = this._root;
        }

        const widget = node.addComponent(Widget);
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;

        return node;
    }

    /**
     * 场景切换时自动清理非持久化节点
     */
    private _onSceneChanged(): void {
        for (const child of this.dialogParent.children) {
            child.destroy();
        }
        for (const child of this.topParent.children) {
            child.destroy();
        }
    }

    /**
     * 显示一个 Toast 提示（位于 topParent）
     * @param message - 提示文本
     * @param duration - 显示时长（毫秒），默认 2000
     */
    showToast(message: string, duration = 2000): void {
        console.warn('[UIMgr] showToast not implemented yet:', message);
    }
}
