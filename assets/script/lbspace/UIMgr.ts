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

    private _dialogParent: Node | null = null;
    private _topParent: Node | null = null;
    private _persistParent: Node | null = null;

    /** 对话框/弹窗层 */
    get dialogParent(): Node {
        this._ensureInit();
        return this._dialogParent!;
    }

    /** 顶部提示/Toast 层 */
    get topParent(): Node {
        this._ensureInit();
        return this._topParent!;
    }

    /** 持久化层（跨场景保留） */
    get persistParent(): Node {
        this._ensureInit();
        return this._persistParent!;
    }

    private _root: Node | null = null;
    private _initialized = false;

    private _ensureInit(): void {
        if (this._initialized) {
            return;
        }
        this._initialized = true;

        const scene = director.getScene();
        if (!scene) {
            throw new Error('[UIMgr] No scene found when initializing');
        }

        this._root = new Node('UI-Root');
        scene.addChild(this._root);
        director.addPersistRootNode(this._root);
        this._root.addComponent(RenderRoot2D);

        this._dialogParent = new Node('UI-Dialog');
        this._dialogParent.layer = Layers.Enum.UI_2D;
        this._dialogParent.parent = this._root;

        this._topParent = new Node('UI-Top');
        this._topParent.layer = Layers.Enum.UI_2D;
        this._topParent.parent = this._root;

        this._persistParent = new Node('UI-Persist');
        this._persistParent.layer = Layers.Enum.UI_2D;
        this._persistParent.parent = this._root;

        this._root.on(NodeEventType.SCENE_CHANGED_FOR_PERSISTS, this._onSceneChanged, this);
    }

    /**
     * 场景切换时自动清理非持久化节点
     */
    private _onSceneChanged(): void {
        this._dialogParent?.destroy();
        this._topParent?.destroy();
        this._dialogParent = null;
        this._topParent = null;
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
