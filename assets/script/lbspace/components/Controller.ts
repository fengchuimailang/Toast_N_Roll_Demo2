/**
 * 🎮 Controller - Cocos 组件基类
 * 借鉴自 ref_project/dlspace/components/Controller
 *
 * 功能：
 * - 提供统一的组件生命周期管理
 * - unuse() 方法用于对象池归还时的清理
 *
 * 使用方式：
 * ```typescript
 * import { _decorator, Component } from 'cc';
 * import { Controller } from '../lbspace';
 *
 * const { ccclass, property } = _decorator;
 *
 * @ccclass('MyController')
 * export class MyController extends Controller {
 *     unuse(): void {
 *         // 清理定时器、事件监听等
 *         this.unscheduleAllCallbacks();
 *         // 注意：不自动清理事件，手动用 MsgMgr.off()
 *     }
 * }
 * ```
 */

import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

@ccclass('Controller')
export class Controller extends Component {
    /**
     * 对象池归还时调用
     * 子类可重写进行清理
     */
    unuse(): void {
        this.unscheduleAllCallbacks();
    }
}
