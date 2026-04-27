/**
 * 🎯 PrefabLoader - Prefab 资源加载器
 * 基于 LoadMgr 思想，统一管理 Prefab 加载和缓存
 *
 * 功能：
 * - 缓存已加载的 Prefab
 * - 请求合并（同时请求返回同一 Promise）
 * - 统一的错误处理
 *
 * 使用方式：
 * ```typescript
 * import { PrefabLoader } from '../lbspace';
 *
 * // 加载 Prefab
 * const prefab = await PrefabLoader.load('prefabs/Cell');
 *
 * // 实例化
 * const node = instantiate(prefab);
 * ```
 */

import { Prefab, resources } from 'cc';

type PrefabCallback = (prefab: Prefab | null) => void;

class PrefabLoaderClass {
    private static _cache = new Map<string, Prefab>();
    private static _pending = new Map<string, Promise<Prefab | null>>();
    private static _pendingCallbacks = new Map<string, PrefabCallback[]>();

    /**
     * 异步加载 Prefab（Promise 风格）
     * @param key - 资源路径（不含扩展名）
     */
    static load(key: string): Promise<Prefab | null> {
        if (this._cache.has(key)) {
            return Promise.resolve(this._cache.get(key));
        }

        if (this._pending.has(key)) {
            return this._pending.get(key)!;
        }

        const promise = new Promise<Prefab | null>((resolve) => {
            resources.load(key, Prefab, (error, asset) => {
                this._pending.delete(key);

                if (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    const isMissing = message.includes(`doesn't contain ${key}`);
                    if (!isMissing) {
                        console.warn(`[PrefabLoader] Failed to load: ${key}`, error);
                    }
                    resolve(null);
                    return;
                }

                if (asset) {
                    this._cache.set(key, asset);
                }
                resolve(asset ?? null);

                const callbacks = this._pendingCallbacks.get(key) ?? [];
                this._pendingCallbacks.delete(key);
                callbacks.forEach((cb) => cb(asset ?? null));
            });
        });

        this._pending.set(key, promise);
        return promise;
    }

    /**
     * 异步加载 Prefab（Callback 风格）
     * @param key - 资源路径
     * @param callback - 加载完成回调
     */
    static loadWithCallback(key: string, callback: PrefabCallback): void {
        if (this._cache.has(key)) {
            callback(this._cache.get(key));
            return;
        }

        if (this._pendingCallbacks.has(key)) {
            this._pendingCallbacks.get(key)!.push(callback);
            return;
        }

        this._pendingCallbacks.set(key, [callback]);

        resources.load(key, Prefab, (error, asset) => {
            this._pendingCallbacks.delete(key);

            if (error) {
                const message = error instanceof Error ? error.message : String(error);
                const isMissing = message.includes(`doesn't contain ${key}`);
                if (!isMissing) {
                    console.warn(`[PrefabLoader] Failed to load: ${key}`, error);
                }
                callback(null);
                return;
            }

            if (asset) {
                this._cache.set(key, asset);
            }
            callback(asset ?? null);
        });
    }

    /**
     * 预加载 Prefab（不返回实例）
     * @param keys - 资源路径数组
     */
    static preload(keys: string[]): Promise<void> {
        return Promise.all(keys.map((key) => this.load(key))).then(() => undefined);
    }

    /**
     * 获取已缓存的 Prefab（不触发加载）
     */
    static get(key: string): Prefab | undefined {
        return this._cache.get(key);
    }

    /**
     * 是否已缓存
     */
    static has(key: string): boolean {
        return this._cache.has(key);
    }

    /**
     * 释放指定 Prefab
     */
    static release(key: string): void {
        this._cache.delete(key);
    }

    /**
     * 清空所有缓存
     */
    static clear(): void {
        this._cache.clear();
        this._pending.clear();
        this._pendingCallbacks.clear();
    }
}

export const PrefabLoader = PrefabLoaderClass;
