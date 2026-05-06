import { _decorator, instantiate, Prefab } from 'cc';
import { UIMgr } from '../common/UIMgr';
import { Controller } from './Controller';
const { ccclass } = _decorator;

@ccclass('TopController')
export class TopController extends Controller {

    static show(...args: unknown[]) {
        const prefab = (this as unknown as { _getPrefab: () => Prefab | null })._getPrefab?.() ?? null;
        const node = prefab ? instantiate(prefab) : new Node();
        node.parent = UIMgr.instance.topParent;

        const comp = node.getComponent(TopController);
        if (comp) {
            comp.open(...args);
        }

        return comp;
    }

    open(...args: unknown[]) {
        this._open(...args);
    }

    close() {
        this.node.destroy();
    }

    protected static _getPrefab(): Prefab | null {
        return null;
    }

    protected _open(...args: unknown[]) {
        // 子类实现
    }
}
