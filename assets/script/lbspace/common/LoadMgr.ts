/**
 * 📦 LoadMgr - 资源加载管理器
 * 借鉴自 ref_project/dlspace/LoadMgr
 *
 * 功能：
 * - 资源缓存，避免重复加载
 * - 请求合并，相同资源同时加载返回同一 Promise
 * - 自动引用计数
 *
 * 使用方式：
 * ```typescript
 * import { LoadMgr } from '../lbspace';
 *
 * // 加载场景（预加载）
 * await LoadMgr.loadScene('GameScene');
 *
 * // 加载 Bundle
 * const bundle = await LoadMgr.loadBundle('resources');
 *
 * // 加载单个资源
 * const sp = await LoadMgr.loadSpriteFrame(bundle, 'textures/player');
 *
 * // 加载目录
 * const sprites = await LoadMgr.loadDir(bundle, 'textures/', SpriteFrame);
 * ```
 */

import {
    Asset,
    AssetManager,
    assetManager,
    director,
    SceneAsset,
    SpriteFrame,
} from 'cc';

type Constructor<T> = new (...args: unknown[]) => T;

class LoadMgrClass {
    private static _loadedAssets: Map<string, Asset> = new Map();
    private static _pendingRequests: Map<string, Promise<unknown>> = new Map();

    /**
     * 预加载场景（不切换）
     * @param name - 场景名称
     */
    static loadScene(name: string): Promise<SceneAsset> {
        return new Promise((resolve, reject) => {
            director.preloadScene(name, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * 加载 AssetBundle
     * @param name - Bundle 名称
     */
    static loadBundle(name: string): Promise<AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            assetManager.loadBundle(name, (err, bundle) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(bundle);
                }
            });
        });
    }

    /**
     * 加载目录下所有指定类型的资源
     * @param bundle - AssetBundle
     * @param dir - 目录路径（相对于 Bundle 根目录）
     * @param type - 资源类型
     */
    static loadDir<T extends Asset>(
        bundle: AssetManager.Bundle,
        dir: string,
        type: Constructor<T>,
    ): Promise<T[]> {
        return new Promise((resolve, reject) => {
            bundle.loadDir(dir, type, (err, assets) => {
                if (err) {
                    reject(err);
                } else {
                    for (const asset of assets) {
                        asset.addRef();
                    }
                    resolve(assets);
                }
            });
        });
    }

    /**
     * 加载单个资源（带缓存和请求合并）
     * @param bundle - AssetBundle
     * @param path - 资源路径（相对于 Bundle 根目录）
     * @param type - 资源类型
     */
    static load<T extends Asset>(
        bundle: AssetManager.Bundle,
        path: string,
        type: Constructor<T>,
    ): Promise<T> {
        const key = `@${bundle.name}@${path}`;

        if (this._loadedAssets.has(key)) {
            return Promise.resolve(this._loadedAssets.get(key) as T);
        }

        if (this._pendingRequests.has(key)) {
            return this._pendingRequests.get(key) as Promise<T>;
        }

        const requestPromise = new Promise<T>((resolve, reject) => {
            bundle.load(path, type, (err, asset) => {
                this._pendingRequests.delete(key);
                if (err) {
                    reject(err);
                } else {
                    asset.name = path;
                    asset.addRef();
                    this._loadedAssets.set(key, asset);
                    resolve(asset);
                }
            });
        });

        this._pendingRequests.set(key, requestPromise);
        return requestPromise;
    }

    /**
     * 加载 SpriteFrame（自动拼接 /spriteFrame 后缀）
     * @param bundle - AssetBundle
     * @param path - 图片路径（不含 /spriteFrame 后缀）
     */
    static loadSpriteFrame(
        bundle: AssetManager.Bundle,
        path: string,
    ): Promise<SpriteFrame> {
        return this.load(bundle, path + '/spriteFrame', SpriteFrame);
    }

    /**
     * 释放指定资源（减少引用计数）
     * @param bundle - AssetBundle
     * @param path - 资源路径
     */
    static release(
        bundle: AssetManager.Bundle,
        path: string,
    ): void {
        const key = `@${bundle.name}@${path}`;
        const asset = this._loadedAssets.get(key);
        if (asset) {
            asset.decRef();
            this._loadedAssets.delete(key);
        }
    }

    /**
     * 清空所有缓存（慎用）
     */
    static clearCache(): void {
        for (const asset of this._loadedAssets.values()) {
            asset.decRef();
        }
        this._loadedAssets.clear();
        this._pendingRequests.clear();
    }
}

export const LoadMgr = LoadMgrClass;
