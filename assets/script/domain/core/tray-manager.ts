/**
 * TrayManager - 检测相邻同阶食材并决定 Tray 变体
 * 
 * 当同阶食材相邻时，它们会合并显示为一个更大的 Tray。
 * 根据相邻方向选择不同的变体：
 * - Horizontal: 左右相邻
 * - Vertical: 上下相邻
 * - Bend: 拐角（L型）
 * - Fold: T型或十字
 * - pressed: 按下状态（单块）
 */

import type { GridPosition } from '../types';

// Tray 变体类型
export type TrayVariant = 
    | 'none'       // 无 Tray（单块显示）
    | 'horizontal' // 左右相邻
    | 'vertical'   // 上下相邻
    | 'bend'       // 拐角（L型）
    | 'fold'       // T型或十字
    | 'pressed';   // 按下状态

// 相邻方向
export type Direction = 'top' | 'bottom' | 'left' | 'right';

// 单元格的 Tray 信息
export interface TrayInfo {
    variant: TrayVariant;
    rotation: number;  // 旋转角度（0, 90, 180, 270）
    isConnected: Record<Direction, boolean>;  // 与哪些方向连接
    isSameType: Record<Direction, boolean>;  // 连接的是否为同种食材
}

// 简化的单元格快照（用于 Tray 计算）
interface CellSnapshot {
    ingredient: {
        tier: number;
        type: string;
    } | null;
}

export class TrayManager {
    private rows: number = 0;
    private cols: number = 0;

    /**
     * 计算整个棋盘的 Tray 信息
     */
    calculateTrayMap(grid: CellSnapshot[][]): Map<string, TrayInfo> {
        const trayMap = new Map<string, TrayInfo>();
        
        if (!grid || grid.length === 0) return trayMap;
        
        this.rows = grid.length;
        this.cols = grid[0]?.length ?? 0;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = grid[row]?.[col];
                if (!cell?.ingredient) continue;

                const pos: GridPosition = { row, col };
                const tier = cell.ingredient.tier;
                const type = cell.ingredient.type;
                
                // 检测四个方向的相邻同阶食材
                const connections = this.detectConnections(grid, pos, tier);
                const isSameType = this.detectSameTypeConnections(grid, pos, type);
                const connectionCount = Object.values(connections).filter(Boolean).length;
                
                // 根据连接数和方向决定 Tray 变体
                const trayInfo = this.determineTrayVariant(connections, isSameType, connectionCount);
                
                const key = this.posToKey(pos);
                trayMap.set(key, trayInfo);
            }
        }

        return trayMap;
    }

    /**
     * 检测四个方向的相邻同种食材
     */
    private detectSameTypeConnections(
        grid: CellSnapshot[][],
        pos: GridPosition,
        type: string
    ): Record<Direction, boolean> {
        const connections: Record<Direction, boolean> = {
            top: false,
            bottom: false,
            left: false,
            right: false,
        };

        // 上
        if (pos.row > 0) {
            const topCell = grid[pos.row - 1]?.[pos.col];
            if (topCell?.ingredient?.type === type) {
                connections.top = true;
            }
        }

        // 下
        if (pos.row < this.rows - 1) {
            const bottomCell = grid[pos.row + 1]?.[pos.col];
            if (bottomCell?.ingredient?.type === type) {
                connections.bottom = true;
            }
        }

        // 左
        if (pos.col > 0) {
            const leftCell = grid[pos.row]?.[pos.col - 1];
            if (leftCell?.ingredient?.type === type) {
                connections.left = true;
            }
        }

        // 右
        if (pos.col < this.cols - 1) {
            const rightCell = grid[pos.row]?.[pos.col + 1];
            if (rightCell?.ingredient?.type === type) {
                connections.right = true;
            }
        }

        return connections;
    }

    /**
     * 检测四个方向的相邻同阶食材
     */
    private detectConnections(
        grid: CellSnapshot[][],
        pos: GridPosition,
        tier: number
    ): Record<Direction, boolean> {
        const connections: Record<Direction, boolean> = {
            top: false,
            bottom: false,
            left: false,
            right: false,
        };

        // 上
        if (pos.row > 0) {
            const topCell = grid[pos.row - 1]?.[pos.col];
            if (topCell?.ingredient?.tier === tier) {
                connections.top = true;
            }
        }

        // 下
        if (pos.row < this.rows - 1) {
            const bottomCell = grid[pos.row + 1]?.[pos.col];
            if (bottomCell?.ingredient?.tier === tier) {
                connections.bottom = true;
            }
        }

        // 左
        if (pos.col > 0) {
            const leftCell = grid[pos.row]?.[pos.col - 1];
            if (leftCell?.ingredient?.tier === tier) {
                connections.left = true;
            }
        }

        // 右
        if (pos.col < this.cols - 1) {
            const rightCell = grid[pos.row]?.[pos.col + 1];
            if (rightCell?.ingredient?.tier === tier) {
                connections.right = true;
            }
        }

        return connections;
    }

    /**
     * 根据连接方向决定 Tray 变体
     */
    private determineTrayVariant(
        connections: Record<Direction, boolean>,
        isSameType: Record<Direction, boolean>,
        connectionCount: number
    ): TrayInfo {
        const { top, bottom, left, right } = connections;

        // 无连接：单块显示
        if (connectionCount === 0) {
            return {
                variant: 'none',
                rotation: 0,
                isConnected: connections,
                isSameType: isSameType,
            };
        }

        // 单连接
        if (connectionCount === 1) {
            if (left || right) {
                return {
                    variant: 'horizontal',
                    rotation: 0,
                    isConnected: connections,
                    isSameType: isSameType,
                };
            }
            if (top || bottom) {
                return {
                    variant: 'vertical',
                    rotation: 0,
                    isConnected: connections,
                    isSameType: isSameType,
                };
            }
        }

        // 双连接 - 直线
        if (connectionCount === 2) {
            // 水平直线
            if (left && right) {
                return {
                    variant: 'horizontal',
                    rotation: 0,
                    isConnected: connections,
                    isSameType: isSameType,
                };
            }
            // 垂直直线
            if (top && bottom) {
                return {
                    variant: 'vertical',
                    rotation: 0,
                    isConnected: connections,
                    isSameType: isSameType,
                };
            }
            // L型拐角
            return {
                variant: 'bend',
                rotation: this.calculateBendRotation(connections),
                isConnected: connections,
                isSameType: isSameType,
            };
        }

        // 三连接 - T型
        if (connectionCount === 3) {
            return {
                variant: 'fold',
                rotation: this.calculateFoldRotation(connections),
                isConnected: connections,
                isSameType: isSameType,
            };
        }

        // 四连接 - 十字
        return {
            variant: 'fold',
            rotation: 0,
            isConnected: connections,
            isSameType: isSameType,
        };
    }

    /**
     * 计算 Bend 变体的旋转角度
     */
    private calculateBendRotation(connections: Record<Direction, boolean>): number {
        const { top, bottom, left, right } = connections;

        // 右+下 → 0°
        if (right && bottom) return 0;
        // 下+左 → 90°
        if (bottom && left) return 90;
        // 左+上 → 180°
        if (left && top) return 180;
        // 上+右 → 270°
        if (top && right) return 270;

        return 0;
    }

    /**
     * 计算 Fold 变体的旋转角度
     */
    private calculateFoldRotation(connections: Record<Direction, boolean>): number {
        const { top, bottom, left, right } = connections;

        // 缺上 → 0° (开口朝上)
        if (!top && left && right && bottom) return 0;
        // 缺右 → 90° (开口朝右)
        if (!right && top && bottom && left) return 90;
        // 缺下 → 180° (开口朝下)
        if (!bottom && left && right && top) return 180;
        // 缺左 → 270° (开口朝左)
        if (!left && top && bottom && right) return 270;

        // 十字 → 0°
        return 0;
    }

    /**
     * 位置转 key
     */
    private posToKey(pos: GridPosition): string {
        return `${pos.row}_${pos.col}`;
    }

    /**
     * 获取指定位置的 Tray 信息
     */
    getTrayInfo(trayMap: Map<string, TrayInfo>, pos: GridPosition): TrayInfo | null {
        const key = this.posToKey(pos);
        return trayMap.get(key) ?? null;
    }
}

export const trayManager = new TrayManager();
