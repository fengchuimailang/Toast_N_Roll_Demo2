/**
 * lbspace - Toast N Roll 通用框架
 * 借鉴自 ref_project/dlspace，为 Cocos Creator 项目提供基础组件
 *
 * 包含模块：
 * - components/: 组件基类 (Controller, DialogController, TopController, VirtualList)
 * - utils/: 工具类 (TweenUtils, Utils, SaveProp, ButtonFactory)
 * - common/: 通用管理器 (UIMgr, MsgMgr, AudioMgr, LoadMgr, NodePoolMgr, PrefabLoader)
 * - GameMsgTypes: 游戏消息类型定义
 */

// components
export { Controller } from './components/Controller';
export { DialogController, DialogEventType } from './components/DialogController';
export { TopController } from './components/TopController';
export {
    VirtualList,
    VirtualListLayoutType,
    VirtualListSetRectCall,
    VirtualListSetCellCall,
    VirtualListCellClickCall,
    VRect,
    ScrollPositionType,
} from './components/VirtualList';

// utils
export { TweenUtils } from './utils/TweenUtils';
export type { TweenFadeInType } from './utils/TweenUtils';
export { SaveProp } from './utils/SaveProp';

// common
export { UIMgr } from './common/UIMgr';
export { MsgMgr } from './common/MsgMgr';
export { AudioMgr } from './common/AudioMgr';
export { LoadMgr } from './common/LoadMgr';
export { NodePoolMgr } from './common/NodePoolMgr';
export { PrefabLoader } from './common/PrefabLoader';

// game msg types (no move)
export { GameMsg, GameMsgTypes } from './GameMsgTypes';
export type { SessionEndReason, GamePhase, ToolType } from './GameMsgTypes';
