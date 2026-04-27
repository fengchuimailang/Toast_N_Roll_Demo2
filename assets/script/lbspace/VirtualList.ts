/**
 * 📜 VirtualList - 虚拟列表
 * 借鉴自 ref_project/dlspace/components/VirtualList
 *
 * 功能：
 * - 垂直/水平/网格布局
 * - 节点池复用，节省内存
 * - 惯性滚动
 * - 点击缩放效果
 *
 * 使用方式：
 * ```typescript
 * // 1. 在节点上添加 VirtualList 组件
 * // 2. 将 cell 模板拖入 VirtualList 的第一个子节点位置
 * // 3. 代码初始化
 *
 * const virtualList = this.getComponent(VirtualList);
 * virtualList.init(
 *     (rect, index) => { rect.width = 110; rect.height = 102; },  // 设置尺寸
 *     (node, index) => { node.getComponent(Label).string = `关卡${index}`; },  // 设置内容
 *     (node, index) => { console.log('点击', index); }  // 点击回调
 * );
 * virtualList.num = 50;  // 设置数据数量
 * ```
 */

import {
    _decorator,
    ccenum,
    EventTouch,
    instantiate,
    Mask,
    Node,
    NodePool,
    rect,
    Rect,
    Size,
    tween,
    Tween,
    UITransform,
    v2,
    v3,
    Vec2,
    Vec3,
} from 'cc';
import { Controller } from './Controller';

const { ccclass, property } = _decorator;

const VirtualListDefaultConfig = {
    zoomScale: 1.1,
    zoomTime: 0.2,
    inertiaTime: 1,
};

export class VRect extends Rect {
    cellIndex = 0;
    offsetX = 0;
    offsetY = 0;
    priority = 0;
}

export enum ScrollPositionType {
    Start = 0,
    Center,
    End,
}

export type VirtualListSetRectCall = (rect: VRect, index: number) => void;
export type VirtualListSetCellCall = (node: Node, index: number) => void;
export type VirtualListCellClickCall = (node: Node, index: number) => void;

export enum VirtualListLayoutType {
    ListVertical,
    ListHorizontal,
    GridVertical,
    GridHorizontal,
    Custom,
}
ccenum(VirtualListLayoutType);

const v2_1 = v2();
const v2_2 = v2();
const v2_3 = v2();
const v2_4 = v2();
const v2_5 = v2();
const v2_6 = v2();
const DrawRect = rect();

@ccclass('VirtualList')
export class VirtualList extends Controller {
    @property({ type: VirtualListLayoutType, displayName: '布局' })
    layoutType = VirtualListLayoutType.ListVertical;

    @property({ visible() { return this.layoutType !== VirtualListLayoutType.Custom && this.layoutType !== VirtualListLayoutType.ListHorizontal } })
    paddingTop = 0;

    @property({ visible() { return this.layoutType !== VirtualListLayoutType.Custom && this.layoutType !== VirtualListLayoutType.ListHorizontal } })
    paddingBottom = 0;

    @property({ visible() { return this.layoutType !== VirtualListLayoutType.Custom && this.layoutType !== VirtualListLayoutType.ListVertical } })
    paddingLeft = 0;

    @property({ visible() { return this.layoutType !== VirtualListLayoutType.Custom && this.layoutType !== VirtualListLayoutType.ListVertical } })
    paddingRight = 0;

    @property({ visible() { return this.layoutType !== VirtualListLayoutType.Custom && this.layoutType !== VirtualListLayoutType.ListVertical } })
    spacingX = 0;

    @property({ visible() { return this.layoutType !== VirtualListLayoutType.Custom && this.layoutType !== VirtualListLayoutType.ListHorizontal } })
    spacingY = 0;

    zoomScale = VirtualListDefaultConfig.zoomScale;
    zoomTime = VirtualListDefaultConfig.zoomTime;
    inertiaTime = VirtualListDefaultConfig.inertiaTime;

    private _cloneNode: Node | null = null;
    private _content: Node | null = null;
    private _nodePool: NodePool = new NodePool();

    private _num = 0;

    private _containerOffset = new Vec3();
    private _drawRect = new Rect();
    private _scrollOffset = new Vec2();
    private _scrollMaxOffset = new Vec2();
    private _contentSize = new Size();
    private _rects: VRect[] = [];

    private _isTouching = false;
    private _isScrolling = false;
    private _touchNode: Node | null = null;
    private _movingInertia = v2();

    private _autoMoveTween: Tween<unknown> | null = null;
    private _zoomScaleTween: Tween<Node> | null = null;

    private _map: Map<VRect, Node> = new Map();
    private _map2: Map<Node, VRect> = new Map();

    private _setRectCall: VirtualListSetRectCall | null = null;
    private _setCellCall: VirtualListSetCellCall | null = null;
    private _cellClickCall: VirtualListCellClickCall | null = null;

    onLoad(): void {
        this.node.addComponent(Mask);

        this._cloneNode = this.node.children[0] ?? null;
        if (this._cloneNode) {
            this._cloneNode.parent = null;
        }

        this._content = new Node();
        this._content.parent = this.node;
        const transform = this._content.addComponent(UITransform);
        transform.setAnchorPoint(0, 1);
        this._onSizeChanged();
    }

    /**
     * 初始化
     * @param setRectCall 设置 cell 的尺寸
     * @param setCellCall 设置 cell 节点上的内容
     * @param cellClickCall cell 的点击回调
     */
    init(
        setRectCall?: VirtualListSetRectCall,
        setCellCall?: VirtualListSetCellCall,
        cellClickCall?: VirtualListCellClickCall,
    ): void {
        this._setRectCall = setRectCall ?? null;
        this._setCellCall = setCellCall ?? null;
        this._cellClickCall = cellClickCall ?? null;
    }

    /**
     * 设置数据数量
     */
    set num(value: number) {
        this._num = value;
        this.reload();
    }

    get num(): number {
        return this._num;
    }

    /**
     * 获取内容尺寸
     */
    get contentSize_(): Size {
        return this._contentSize;
    }

    /**
     * 当前滚动的偏移量
     */
    get scrollOffset(): Vec2 {
        return this._scrollOffset;
    }

    /**
     * 最大可滚动的偏移量
     */
    get scrollMaxOffset(): Vec2 {
        return this._scrollMaxOffset;
    }

    /**
     * 是否手势滚动中
     */
    get isTouching(): boolean {
        return this._isTouching;
    }

    /**
     * 滚动到顶部
     * @param duration 默认动画时间 1s，如果是 null 则禁止动画
     */
    scrollToTop(duration = 1): void {
        this.scrollTo(Vec2.ZERO, duration);
    }

    /**
     * 滚动到底部
     */
    scrollToBottom(duration = 1): void {
        this.scrollTo(this._scrollMaxOffset, duration);
    }

    /**
     * 滚动到指定下标
     */
    scrollToIndex(index: number, type = ScrollPositionType.Start, duration = 1): void {
        const rect = this._rects[index];
        if (!rect) return;

        const offset = v2();
        if (type === ScrollPositionType.Start) {
            offset.set(rect.x, rect.y);
            offset.subtract2f(this.spacingX / 2, this.spacingY / 2);
        } else if (type === ScrollPositionType.Center) {
            offset.set(
                rect.x - (this._drawRect.width - rect.width) / 2,
                rect.y - (this._drawRect.height - rect.height) / 2,
            );
        } else if (type === ScrollPositionType.End) {
            offset.set(
                rect.x - (this._drawRect.width - rect.width),
                rect.y - (this._drawRect.height - rect.height),
            );
            offset.add2f(this.spacingX / 2, this.spacingY / 2);
        }
        this.scrollTo(offset, duration);
    }

    /**
     * 滚动到指定位置
     */
    scrollTo(offset: Vec2, duration = 1): void {
        this._cancelTouchEvent();

        const endOffset = offset.clone();
        endOffset.clampf(Vec2.ZERO, this._scrollMaxOffset);

        if (duration === null) {
            this._scrollOffset.set(endOffset);
            return;
        }

        const startOffset = this._scrollOffset.clone();
        const tweenObj = { t: 0 };
        this._autoMoveTween = tween(tweenObj)
            .to(duration, { t: 1 }, {
                easing: 'linear',
                onUpdate: () => {
                    Vec2.lerp(v2_4, startOffset, endOffset, tweenObj.t);
                    this._scrollOffset.set(v2_4);
                },
            })
            .call(() => {
                this._movingInertia.set(0, 0);
                this._autoMoveTween = null;
            })
            .start();
    }

    /**
     * 刷新并重新布局
     */
    reload(): void {
        this._cancelTouchEvent();

        for (const node of this._map.values()) {
            this._putNode(node);
        }
        this._map.clear();
        this._map2.clear();
        this._rects.length = 0;

        if (this.layoutType === VirtualListLayoutType.ListVertical) {
            this._layoutForListVertical();
        } else if (this.layoutType === VirtualListLayoutType.ListHorizontal) {
            this._layoutForListHorizontal();
        } else if (this.layoutType === VirtualListLayoutType.GridVertical) {
            this._layoutForGridVertical();
        } else if (this.layoutType === VirtualListLayoutType.GridHorizontal) {
            this._layoutForGridHorizontal();
        } else if (this.layoutType === VirtualListLayoutType.Custom) {
            this._layoutForCustom();
        }

        this._scrollOffset.clampf(Vec2.ZERO, this._scrollMaxOffset);
    }

    /**
     * 刷新指定下标的内容（不更新尺寸）
     */
    reloadWithIndex(index: number): void {
        const rect = this._rects[index];
        if (!rect) return;

        const node = this._map.get(rect);
        if (!node) return;

        this._setCellCall?.(node, rect.cellIndex);
    }

    /**
     * 获取 cell 的下标，找不到返回 -1
     */
    getCellIndex(cell: Node): number {
        return this._map2.get(cell)?.cellIndex ?? -1;
    }

    onEnable(): void {
        this.node.on(Node.EventType.SIZE_CHANGED, this._onSizeChanged, this);
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDisable(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this._onSizeChanged, this);
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    update(_dt: number): void {
        if (!this._content) return;

        this._content.setPosition(
            this._containerOffset.x - this._scrollOffset.x,
            this._containerOffset.y + this._scrollOffset.y,
            this._containerOffset.z,
        );
        this._drawRect.x = this._scrollOffset.x;
        this._drawRect.y = this._scrollOffset.y;

        const keys = Array.from(this._map.keys());

        DrawRect.set(this._drawRect);

        for (const rect of keys) {
            if (!DrawRect.intersects(rect)) {
                const node = this._map.get(rect);
                this._map.delete(rect);
                if (node) {
                    this._map2.delete(node);
                    this._putNode(node);
                }
            }
        }

        for (const rect of this._rects) {
            if (DrawRect.intersects(rect)) {
                if (!this._map.has(rect)) {
                    const node = this._getNode();
                    node.setPosition(rect.x + rect.width / 2, -rect.y - rect.height / 2, 0);
                    const nodeTransform = node._uiProps.uiTransformComp;
                    if (nodeTransform) {
                        nodeTransform.setContentSize(rect.width, rect.height);
                    }
                    if (rect.priority !== 0) {
                        const nodeTransform = node._uiProps.uiTransformComp;
                        if (nodeTransform) {
                            nodeTransform.priority = rect.priority;
                        }
                    }
                    this._map.set(rect, node);
                    this._map2.set(node, rect);

                    const index = rect.cellIndex;
                    this._setCellCall?.(node, index);
                }
            }
        }
    }

    private _onSizeChanged(): void {
        if (!this.node._uiProps.uiTransformComp) return;

        const contentSize = this.node._uiProps.uiTransformComp.contentSize;
        this._content?.setPosition(-contentSize.width / 2, contentSize.height / 2, 0);
        this._containerOffset.set(this._content?.position ?? Vec3.ZERO);
        this._drawRect.set(0, 0, contentSize.width, contentSize.height);
    }

    private _cancelTouchEvent(): void {
        this._isTouching = false;
        this._isScrolling = false;
        this._clearAutoMoveTween();
        this._clearZoomScaleTween();
        this._clearMovingInertia();
        if (this._touchNode) {
            this._touchNode.setScale(1, 1, 1);
            this._touchNode = null;
        }
    }

    private _onTouchStart(event: EventTouch): void {
        event.propagationStopped = true;

        this._isTouching = true;
        this._isScrolling = false;
        this._clearAutoMoveTween();
        this._clearZoomScaleTween();
        this._clearMovingInertia();

        if (this._cellClickCall && this._content) {
            const location = event.getLocation(v2_5);
            const windowId = event.windowId;
            for (const child of this._content.children) {
                if ((child as Node & { _uiProps: { uiTransformComp: { hitTest: (loc: Vec2, wid: number) => boolean } } })._uiProps?.uiTransformComp?.hitTest(location, windowId)) {
                    this._touchNode = child as Node;
                    this._zoomScaleTween = tween(this._touchNode)
                        .delay(0.1)
                        .to(this.zoomTime, { scale: v3(1, 1, 1).multiplyScalar(this.zoomScale) })
                        .start();
                    break;
                }
            }
        }
    }

    private _onTouchMove(event: EventTouch): void {
        event.propagationStopped = true;

        if (!this._isTouching) {
            return;
        }

        const delta = event.getUIDelta(v2_1);
        if (!this._isScrolling) {
            const start = event.getUIStartLocation(v2_5);
            const current = event.getUILocation(v2_6);
            const distance = Vec2.distance(start, current);
            if (distance > 10) {
                this._isScrolling = true;
                if (this._touchNode) {
                    this._clearZoomScaleTween();
                    this._zoomScaleTween = tween(this._touchNode)
                        .to(this.zoomTime, { scale: v3(1, 1, 1) })
                        .start();
                    this._touchNode = null;
                }
            }
            return;
        }

        this.unschedule(this._clearMovingInertia);
        Vec2.copy(v2_2, this._scrollOffset);
        this._addOffset(delta.x, delta.y);
        Vec2.copy(this._movingInertia, this._scrollOffset).subtract(v2_2);
        this.scheduleOnce(this._clearMovingInertia, 0.1);
    }

    private _onTouchEnd(event: EventTouch): void {
        event.propagationStopped = true;

        if (!this._isTouching) {
            return;
        }

        if (!this._isScrolling) {
            if (this._touchNode) {
                this._clearZoomScaleTween();
                this._zoomScaleTween = tween(this._touchNode)
                    .to(this.zoomTime, { scale: v3(1, 1, 1) })
                    .start();

                const rect = this._map2.get(this._touchNode);
                if (rect) {
                    this._cellClickCall?.(this._touchNode, rect.cellIndex);
                }
                this._touchNode = null;
            }
            return;
        }

        this.unschedule(this._clearMovingInertia);
        this._isTouching = false;

        if (this._movingInertia.x !== 0 || this._movingInertia.y !== 0) {
            const tweenObj = { t: 1 };
            this._autoMoveTween = tween(tweenObj)
                .to(this.inertiaTime, { t: 0 }, {
                    easing: 'linear',
                    onUpdate: () => {
                        v2_3.set(this._movingInertia).multiplyScalar(tweenObj.t);
                        this._addOffset(-v2_3.x, v2_3.y);
                    },
                })
                .call(() => {
                    this._movingInertia.set(0, 0);
                    this._autoMoveTween = null;
                })
                .start();
        }
    }

    private _clearAutoMoveTween(): void {
        if (this._autoMoveTween) {
            this._autoMoveTween.stop();
            this._autoMoveTween = null;
        }
    }

    private _clearZoomScaleTween(): void {
        if (this._zoomScaleTween) {
            this._zoomScaleTween.stop();
            this._zoomScaleTween = null;
        }
    }

    private _clearMovingInertia(): void {
        this._movingInertia.set(0, 0);
    }

    private _addOffset(x: number, y: number): void {
        const offset = this._scrollOffset;
        offset.add2f(-x, y);
        offset.clampf(Vec2.ZERO, this._scrollMaxOffset);
    }

    private _getNode(): Node {
        let node: Node;
        if (this._nodePool.size() > 0) {
            node = this._nodePool.get()!;
        } else if (this._cloneNode) {
            node = instantiate(this._cloneNode);
        } else {
            node = new Node();
        }
        node.parent = this._content;
        node.active = true;
        node.setScale(1, 1, 1);
        return node;
    }

    private _putNode(node: Node): void {
        node.active = false;
        this._nodePool.put(node);
    }

    private _layoutForListVertical(): void {
        let yOffset = this.paddingTop;
        const cloneNode = this._cloneNode;
        if (!cloneNode || !cloneNode._uiProps.uiTransformComp) return;

        const { width, height } = cloneNode._uiProps.uiTransformComp.contentSize;

        for (let i = 0; i < this._num; i++) {
            const rect = new VRect();
            rect.width = width;
            rect.height = height;
            this._setRectCall?.(rect, i);
            rect.cellIndex = i;
            const xOffset = (this._drawRect.width - rect.width) / 2;
            rect.x = xOffset + rect.offsetX;
            rect.y = yOffset + rect.offsetY;
            this._rects.push(rect);

            yOffset = rect.y + rect.height + this.spacingY;
        }

        let maxY = 0;
        if (this._rects.length > 0) {
            const lastRect = this._rects[this._rects.length - 1];
            maxY = lastRect.y + lastRect.height;
        }

        this._contentSize.set(this._drawRect.width, maxY + this.paddingBottom);
        if (this._content?._uiProps.uiTransformComp) {
            this._content._uiProps.uiTransformComp.setContentSize(this._contentSize.width, this._contentSize.height);
        }
        this._scrollMaxOffset.x = 0;
        this._scrollMaxOffset.y = Math.max(0, this._contentSize.height - this._drawRect.height);
    }

    private _layoutForListHorizontal(): void {
        let xOffset = this.paddingLeft;
        const cloneNode = this._cloneNode;
        if (!cloneNode || !cloneNode._uiProps.uiTransformComp) return;

        const { width, height } = cloneNode._uiProps.uiTransformComp.contentSize;

        for (let i = 0; i < this._num; i++) {
            const rect = new VRect();
            rect.width = width;
            rect.height = height;
            this._setRectCall?.(rect, i);
            rect.cellIndex = i;
            const yOffset = (this._drawRect.height - rect.height) / 2;
            rect.x = xOffset + rect.offsetX;
            rect.y = yOffset + rect.offsetY;
            this._rects.push(rect);

            xOffset = rect.x + rect.width + this.spacingX;
        }

        let maxX = 0;
        if (this._rects.length > 0) {
            const lastRect = this._rects[this._rects.length - 1];
            maxX = lastRect.x + lastRect.width;
        }

        this._contentSize.set(maxX + this.paddingRight, this._drawRect.height);
        if (this._content?._uiProps.uiTransformComp) {
            this._content._uiProps.uiTransformComp.setContentSize(this._contentSize.width, this._contentSize.height);
        }
        this._scrollMaxOffset.x = Math.max(0, this._contentSize.width - this._drawRect.width);
        this._scrollMaxOffset.y = 0;
    }

    private _layoutForGridVertical(): void {
        let xOffset = this.paddingLeft;
        let yOffset = this.paddingTop;
        const cloneNode = this._cloneNode;
        if (!cloneNode || !cloneNode._uiProps.uiTransformComp) return;

        const { width, height } = cloneNode._uiProps.uiTransformComp.contentSize;

        for (let i = 0; i < this._num; i++) {
            const rect = new VRect();
            rect.width = width;
            rect.height = height;
            this._setRectCall?.(rect, i);
            rect.cellIndex = i;
            rect.x += rect.offsetX;
            rect.y += rect.offsetY;

            if (xOffset !== this.paddingLeft && xOffset + rect.width > this._drawRect.width) {
                yOffset += rect.height + this.spacingY;
                xOffset = this.paddingLeft;
            }

            rect.x = xOffset;
            rect.y = yOffset;
            this._rects.push(rect);

            xOffset += rect.width + this.spacingX;
        }

        let maxY = 0;
        if (this._rects.length > 0) {
            const lastRect = this._rects[this._rects.length - 1];
            maxY = lastRect.y + lastRect.height;
        }

        this._contentSize.set(this._drawRect.width, maxY + this.paddingBottom);
        if (this._content?._uiProps.uiTransformComp) {
            this._content._uiProps.uiTransformComp.setContentSize(this._contentSize.width, this._contentSize.height);
        }
        this._scrollMaxOffset.x = 0;
        this._scrollMaxOffset.y = Math.max(0, this._contentSize.height - this._drawRect.height);
    }

    private _layoutForGridHorizontal(): void {
        let xOffset = this.paddingLeft;
        let yOffset = this.paddingTop;
        const cloneNode = this._cloneNode;
        if (!cloneNode || !cloneNode._uiProps.uiTransformComp) return;

        const { width, height } = cloneNode._uiProps.uiTransformComp.contentSize;

        for (let i = 0; i < this._num; i++) {
            const rect = new VRect();
            rect.width = width;
            rect.height = height;
            this._setRectCall?.(rect, i);
            rect.cellIndex = i;
            rect.x += rect.offsetX;
            rect.y += rect.offsetY;

            if (yOffset !== this.paddingTop && yOffset + rect.height > this._drawRect.height) {
                xOffset += rect.width + this.spacingX;
                yOffset = this.paddingTop;
            }

            rect.x = xOffset;
            rect.y = yOffset;
            this._rects.push(rect);

            yOffset += rect.height + this.spacingY;
        }

        let maxX = 0;
        if (this._rects.length > 0) {
            const lastRect = this._rects[this._rects.length - 1];
            maxX = lastRect.x + lastRect.width;
        }

        this._contentSize.set(maxX + this.paddingRight, this._drawRect.height);
        if (this._content?._uiProps.uiTransformComp) {
            this._content._uiProps.uiTransformComp.setContentSize(this._contentSize.width, this._contentSize.height);
        }
        this._scrollMaxOffset.x = Math.max(0, this._contentSize.width - this._drawRect.width);
        this._scrollMaxOffset.y = 0;
    }

    private _layoutForCustom(): void {
        let maxX = 0;
        let maxY = 0;

        for (let i = 0; i < this._num; i++) {
            const rect = new VRect();
            this._setRectCall?.(rect, i);
            rect.cellIndex = i;
            rect.x += rect.offsetX;
            rect.y += rect.offsetY;
            maxX = Math.max(rect.x + rect.width, maxX);
            maxY = Math.max(rect.y + rect.height, maxY);

            this._rects.push(rect);
        }

        this._contentSize.set(maxX, maxY);
        if (this._content?._uiProps.uiTransformComp) {
            this._content._uiProps.uiTransformComp.setContentSize(this._contentSize.width, this._contentSize.height);
        }
        this._scrollMaxOffset.x = Math.max(0, this._contentSize.width - this._drawRect.width);
        this._scrollMaxOffset.y = Math.max(0, this._contentSize.height - this._drawRect.height);
    }
}
