/**
 * ButtonFactory - 统一的按钮创建工具
 * 
 * 使用 9-slice sprite 创建按钮，避免每次用 Graphics 绘制
 */

import { Color, Label, Layers, Node, Sprite, SpriteFrame, UITransform, resources } from 'cc';

// 预加载的 sprite frame 缓存
let _buttonSpriteFrame: SpriteFrame | null = null;
let _loadAttempted = false;

/**
 * 预加载按钮背景 sprite frame
 */
function loadButtonSpriteFrame(callback: (frame: SpriteFrame | null) => void): void {
    if (_buttonSpriteFrame) {
        callback(_buttonSpriteFrame);
        return;
    }

    if (_loadAttempted) {
        callback(null);
        return;
    }

    _loadAttempted = true;
    resources.load('ui/button_bg/spriteFrame', SpriteFrame, (err, frame) => {
        if (err || !frame) {
            console.warn('[ButtonFactory] Failed to load button_bg sprite frame:', err);
            callback(null);
            return;
        }
        _buttonSpriteFrame = frame;
        callback(frame);
    });
}

/**
 * 创建 9-slice 按钮
 * @param parent 父节点
 * @param name 按钮名称
 * @param position 位置
 * @param width 宽度
 * @param height 高度
 * @param color 颜色（用于 tint）
 * @param label 文本
 * @param labelColor 文本颜色
 */
export function create9SliceButton(
    parent: Node,
    name: string,
    position: { x: number; y: number },
    width: number,
    height: number,
    color: Color,
    label: string,
    labelColor: Color = new Color(255, 255, 255, 255)
): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(position.x, position.y, 0);

    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);

    const sprite = node.addComponent(Sprite);
    sprite.type = Sprite.Type.SLICED;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = color;

    // 尝试加载 sprite frame
    loadButtonSpriteFrame((frame) => {
        if (frame) {
            sprite.spriteFrame = frame;
        }
    });

    // 创建文本节点
    if (label) {
        const labelNode = new Node('Label');
        labelNode.layer = Layers.Enum.UI_2D;
        labelNode.parent = node;

        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(width, height);

        const labelComp = labelNode.addComponent(Label);
        labelComp.string = label;
        labelComp.fontSize = Math.min(width, height) * 0.4;
        labelComp.color = labelColor;
        labelComp.horizontalAlign = Label.HorizontalAlign.CENTER;
        labelComp.verticalAlign = Label.VerticalAlign.CENTER;
    }

    return node;
}

/**
 * 创建 9-slice 按钮（异步版本，等待 sprite frame 加载）
 */
export function create9SliceButtonAsync(
    parent: Node,
    name: string,
    position: { x: number; y: number },
    width: number,
    height: number,
    color: Color,
    label: string,
    labelColor: Color = new Color(255, 255, 255, 255),
    callback?: (node: Node) => void
): Node {
    const node = create9SliceButton(parent, name, position, width, height, color, label, labelColor);
    
    // 如果 sprite frame 还没加载完，等待加载
    if (!_buttonSpriteFrame && !_loadAttempted) {
        loadButtonSpriteFrame((frame) => {
            if (frame && node.isValid) {
                const sprite = node.getComponent(Sprite);
                if (sprite) {
                    sprite.spriteFrame = frame;
                }
            }
            callback?.(node);
        });
    } else {
        callback?.(node);
    }

    return node;
}
