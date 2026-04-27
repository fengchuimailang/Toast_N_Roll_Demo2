/**
 * 📡 GameMsgTypes - 游戏消息类型定义
 *
 * 使用 MsgMgr 进行全局消息通信时，使用这些类型确保类型安全：
 *
 * ```typescript
 * import { GameMsg } from './GameMsgTypes';
 *
 * // 订阅
 * MsgMgr.on(GameMsg.SessionEnded, (levelId, reason, stars, score) => {
 *     console.log(`关卡 ${levelId} 结束: ${reason}`);
 * });
 *
 * // 发射
 * MsgMgr.emit(GameMsg.SessionEnded, 1, 'complete', 3, 1500);
 * ```
 */

/**
 * 游戏消息类型枚举
 */
export enum GameMsg {
    /** 关卡开始 */
    SessionStarted = 'SessionStarted',
    /** 关卡结束 */
    SessionEnded = 'SessionEnded',
    /** 道具激活（玩家点击了道具按钮） */
    ToolActivated = 'ToolActivated',
    /** 道具使用（玩家实际使用了道具） */
    ToolUsed = 'ToolUsed',
    /** 分数变化 */
    ScoreChanged = 'ScoreChanged',
    /** 顾客服务成功 */
    CustomerServed = 'CustomerServed',
    /** 顾客流失 */
    CustomerMissed = 'CustomerMissed',
    /** 游戏阶段变化 */
    PhaseChanged = 'PhaseChanged',
}

/**
 * 关卡结束原因
 */
export type SessionEndReason = 'complete' | 'gameOver';

/**
 * 游戏阶段
 */
export type GamePhase = 'playing' | 'paused' | 'ended';

/**
 * 道具类型
 */
export type ToolType = 'remove' | 'magnet' | 'shuffle';
