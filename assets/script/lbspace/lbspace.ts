/**
 * lbspace - Toast N Roll 通用框架
 * 借鉴自 ref_project/dlspace，为 Cocos Creator 项目提供基础组件
 *
 * 包含模块：
 * - MsgMgr: 全局消息/事件系统
 * - GameMsgTypes: 游戏消息类型定义
 * - NodePoolMgr: 对象池管理器
 * - LoadMgr: 资源加载管理器
 * - PrefabLoader: Prefab 资源加载器
 * - AudioMgr: 音频管理器
 * - Controller: 组件基类
 * - DialogController: 弹窗基类
 * - TopController: 顶部提示基类
 * - VirtualList: 虚拟列表
 * - TweenUtils: 缓动动画工具
 * - SaveProp: 装饰器式数据持久化
 * - UIMgr: UI 层级管理器
 */

export { MsgMgr } from './MsgMgr';
export { GameMsg, GameMsgTypes } from './GameMsgTypes';
export type { SessionEndReason, GamePhase, ToolType } from './GameMsgTypes';
export { NodePoolMgr } from './NodePoolMgr';
export { LoadMgr } from './LoadMgr';
export { PrefabLoader } from './PrefabLoader';
export { AudioMgr } from './AudioMgr';
export { Controller } from './Controller';
export { DialogController } from './DialogController';
export { DialogEventType } from './DialogController';
export { TopController } from './TopController';
export { VirtualList } from './VirtualList';
export {
    VirtualListLayoutType,
    VirtualListSetRectCall,
    VirtualListSetCellCall,
    VirtualListCellClickCall,
    VRect,
    ScrollPositionType,
} from './VirtualList';
export { TweenUtils } from './TweenUtils';
export type { TweenFadeInType } from './TweenUtils';

export { SaveProp } from './SaveProp';
export { UIMgr } from './UIMgr';
