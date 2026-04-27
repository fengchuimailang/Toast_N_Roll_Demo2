/**
 * 📡 MsgMgr - 全局消息/事件系统
 * 借鉴自 ref_project/dlspace/MsgMgr
 *
 * 功能：
 * - 发布/订阅模式，解耦模块间通信
 * - 支持带 target 的精确移除
 *
 * 使用方式：
 * ```typescript
 * import { MsgMgr } from '../lbspace';
 *
 * // 订阅
 * MsgMgr.on('PlayerDead', this._onPlayerDead, this);
 *
 * // 发布
 * MsgMgr.emit('PlayerDead', playerId, score);
 *
 * // 取消订阅（必须与订阅时的 target 相同）
 * MsgMgr.off('PlayerDead', this._onPlayerDead, this);
 * ```
 */

/**
 * 消息回调函数类型
 */
export type MsgCall = (...params: unknown[]) => void;

/**
 * 消息回调包装
 */
interface IMsgMgrCall {
    target: unknown;
    func: MsgCall;
}

/**
 * 全局消息管理器
 */
export class MsgMgr {
    private static _map: Map<string, IMsgMgrCall[]> = new Map();

    /**
     * 订阅消息
     * @param key - 消息标识
     * @param func - 回调函数
     * @param target - 回调绑定的 this 对象（用于精确移除）
     */
    static on(key: string, func: MsgCall, target: unknown): void {
        let calls = this._map.get(key);
        if (!calls) {
            calls = [];
            this._map.set(key, calls);
        }
        calls.push({
            target,
            func,
        });
    }

    /**
     * 取消订阅
     * @param key - 消息标识
     * @param func - 回调函数
     * @param target - 回调绑定的 this 对象
     */
    static off(key: string, func: MsgCall, target: unknown): void {
        let calls = this._map.get(key);
        if (calls) {
            let call = calls.find((c) => c.target === target && c.func === func);
            call && calls.splice(calls.indexOf(call), 1);
        }
    }

    /**
     * 发布消息
     * @param key - 消息标识
     * @param params - 传递给回调的参数
     */
    static emit(key: string, ...params: unknown[]): void {
        let calls = this._map.get(key);
        if (calls) {
            for (const c of calls) {
                c.func.call(c.target, ...params);
            }
        }
    }

    /**
     * 移除指定 target 的所有订阅
     * @param target - 要移除的订阅者
     */
    static offTarget(target: unknown): void {
        for (const calls of this._map.values()) {
            for (let i = calls.length - 1; i >= 0; i--) {
                if (calls[i].target === target) {
                    calls.splice(i, 1);
                }
            }
        }
    }

    /**
     * 清空所有消息订阅（慎用）
     */
    static clear(): void {
        this._map.clear();
    }

    /**
     * 检查指定消息是否有订阅者
     */
    static hasListener(key: string): boolean {
        const calls = this._map.get(key);
        return calls != null && calls.length > 0;
    }
}
