/**
 * 🍞 SaveProp - 装饰器式数据持久化
 * 基于参考项目 dlspace/SaveProp 改进
 * 
 * 使用方式：
 * ```typescript
 * import { SaveProp } from '../lbspace';
 * 
 * class UserData {
 *     constructor() {
 *         SaveProp.initObject(this);
 *     }
 * 
 *     @SaveProp.decorator(0)
 *     gold: number;
 * 
 *     @SaveProp.decorator(1)
 *     level: number;
 * }
 * ```
 */

interface ISavePropItem {
    propertyKey: string;
    defaultValue: unknown;
    value?: unknown;
}

export class SaveProp {
    /** localStorage key 前缀 */
    private static _name = 'ToastNRoll';

    /** 存储所有被装饰属性的元数据 */
    private static _params: Map<unknown, ISavePropItem[]> = new Map();

    /**
     * 设置存储命名空间（通常在游戏启动时调用一次）
     */
    static setNamespace(name: string): void {
        this._name = name;
    }

    /**
     * 属性装饰器工厂
     * @param defaultValue - 属性默认值
     */
    static decorator(defaultValue: unknown): PropertyDecorator {
        return (target, propertyKey) => {
            const item: ISavePropItem = {
                propertyKey: String(propertyKey),
                defaultValue,
            };
            const key = target.constructor;
            let arr = this._params.get(key) ?? this._params.set(key, []).get(key);
            arr!.push(item);
        };
    }

    /**
     * 初始化对象的可持久化属性
     * @param target - 要初始化的对象
     * @param tag - 可选标签，用于区分同一类的不同实例（如每日数据）
     */
    static initObject(target: object, tag?: string): void {
        const key = target.constructor;
        const arr = this._params.get(key);
        if (!arr) return;

        const className = target.constructor.name;
        for (const item of arr) {
            const { propertyKey, defaultValue } = item;

            const keyParts = [this._name, className];
            if (tag) keyParts.push(tag);
            keyParts.push(propertyKey);
            const storageKey = keyParts.join('_');

            item.value = this._getItem(storageKey, defaultValue);

            Object.defineProperty(target, propertyKey, {
                set(v: unknown) {
                    SaveProp._setItem(storageKey, v);
                    item.value = v;
                },
                get() {
                    return item.value;
                },
                enumerable: true,
                configurable: true,
            });
        }
    }

    /**
     * 清除对象在 localStorage 中的所有数据
     * @param target - 要清除的对象
     * @param tag - 可选标签
     */
    static removeObject(target: object, tag?: string): void {
        const className = target.constructor.name;
        const keyParts = [this._name, className];
        if (tag) keyParts.push(tag);
        const keyHead = keyParts.join('_');

        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith(keyHead)) {
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * 获取指定 key 的存储值
     */
    private static _getItem(key: string, defaultValue: unknown): unknown {
        try {
            const json = localStorage.getItem(key);
            if (!json || json.length === 0) {
                return defaultValue;
            }
            const parsed = JSON.parse(json);
            return parsed.value ?? defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * 设置指定 key 的存储值
     */
    private static _setItem(key: string, value: unknown): void {
        try {
            const json = JSON.stringify({ value });
            localStorage.setItem(key, json);
        } catch (error) {
            console.warn('[SaveProp] Failed to save:', key, error);
        }
    }

    /**
     * 手动将一个属性标记为已修改（用于触发存储）
     * 如果属性值是对象，推荐直接修改其内部属性后调用此方法
     */
    static touch(target: object, propertyKey: string): void {
        const key = target.constructor;
        const arr = this._params.get(key);
        if (!arr) return;

        const item = arr.find((i) => i.propertyKey === propertyKey);
        if (item) {
            this._setItem(
                [
                    this._name,
                    key.name,
                    propertyKey,
                ].join('_'),
                item.value,
            );
        }
    }
}
