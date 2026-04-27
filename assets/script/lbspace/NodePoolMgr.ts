/**
 * 🎱 NodePoolMgr - 对象池管理器
 * 借鉴自 ref_project/dlspace/NodePoolMgr
 *
 * 功能：
 * - 复用 Node 对象，减少 instantiate/destroy 开销
 * - 自动管理池化节点的 destroy 调用
 * - 配合 Controller.unuse() 进行组件清理
 *
 * 使用方式：
 * ```typescript
 * import { NodePoolMgr } from '../lbspace';
 *
 * // 初始化池（可预热）
 * NodePoolMgr.put(prefab, count);
 *
 * // 获取节点
 * let node = NodePoolMgr.get(prefab);
 *
 * // 归还节点（自动调用 Controller.unuse()）
 * NodePoolMgr.put(node);
 *
 * // 批量归还
 * NodePoolMgr.puts(nodes);
 *
 * // 清空所有池
 * NodePoolMgr.clear();
 * ```
 */

import { instantiate, isValid, Node, NodePool, Prefab } from 'cc';

const MAX_POOL_COUNT = 50;

interface IPoolInfo {
    pool: NodePool;
    source: Node | Prefab;
}

class NodePoolMgrClass {
    private static _pools: Map<Node | Prefab, NodePool> = new Map();

    private static _getPool(source: Node | Prefab): NodePool {
        let pool = this._pools.get(source);
        if (!pool) {
            pool = new NodePool();
            this._pools.set(source, pool);
        }
        return pool;
    }

    /**
     * 预热对象池，批量创建节点
     * @param source - Prefab 或 Node
     * @param count - 预创建数量
     */
    static prewarm(source: Node | Prefab, count: number): void {
        const pool = this._getPool(source);
        for (let i = 0; i < count; i++) {
            const node = this._createNode(source);
            if (node) {
                pool.put(node);
            }
        }
    }

    /**
     * 获取一个池化节点
     * @param source - Prefab 或 Node
     * @returns 节点（已激活）
     */
    static get(source: Node | Prefab): Node {
        const pool = this._getPool(source);
        let node: Node | undefined;

        if (pool.size() > 0) {
            node = pool.get();
        } else {
            node = this._createNode(source);
        }

        if (node) {
            node.active = true;
            this._wrapDestroy(node, source);
        }

        return node as Node;
    }

    /**
     * 批量获取节点
     * @param source - Prefab 或 Node
     * @param count - 数量
     */
    static gets(source: Node | Prefab, count: number): Node[] {
        if (count <= 0) return [];
        const result: Node[] = [];
        for (let i = 0; i < count; i++) {
            result.push(this.get(source));
        }
        return result;
    }

    /**
     * 归还节点到池中
     * @param node - 要归还的节点
     */
    static put(node: Node): void {
        if (!isValid(node, true)) return;

        const pool = node.getValue('__pool') as NodePool;
        if (!pool) {
            node.destroy();
            return;
        }

        this._emitUnuse(node);
        pool.put(node);

        node.destroy = Node.prototype.destroy;
        node._destroyImmediate = Node.prototype._destroyImmediate;
    }

    /**
     * 批量归还节点
     * @param nodes - 节点数组
     */
    static puts(nodes: Node[]): void {
        for (let i = nodes.length - 1; i >= 0; i--) {
            this.put(nodes[i]);
        }
    }

    /**
     * 清空指定池
     * @param source - Prefab 或 Node
     */
    static clearPool(source: Node | Prefab): void {
        const pool = this._pools.get(source);
        if (pool) {
            pool.clear();
        }
    }

    /**
     * 清空所有池
     */
    static clear(): void {
        for (const pool of this._pools.values()) {
            pool.clear();
        }
        this._pools.clear();
    }

    /**
     * 获取指定池的当前大小
     */
    static poolSize(source: Node | Prefab): number {
        const pool = this._pools.get(source);
        return pool ? pool.size() : 0;
    }

    private static _createNode(source: Node | Prefab): Node | null {
        if (source instanceof Node) {
            return instantiate(source);
        } else if (source instanceof Prefab) {
            return instantiate(source);
        }
        return null;
    }

    private static _wrapDestroy(node: Node, source: Node | Prefab): void {
        const pool = this._getPool(source);

        node.destroy = (...args: unknown[]) => {
            if (pool.size() > MAX_POOL_COUNT) {
                this._emitUnuse(node);
                return Node.prototype.destroy.call(node, ...args);
            } else {
                this.put(node);
                return false;
            }
        };

        node._destroyImmediate = (...args: unknown[]) => {
            const pool = this._getPool(source);
            if (pool.size() > MAX_POOL_COUNT) {
                this._emitUnuse(node);
                Node.prototype._destroyImmediate.call(node, ...args);
            } else {
                this.put(node);
            }
        };

        node.setValue('__pool', pool);
    }

    private static _emitUnuse(node: Node): void {
        node.setValue('__pool', null);
        node.active = false;
    }
}

export const NodePoolMgr = NodePoolMgrClass;
