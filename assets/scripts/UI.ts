import { Node, Label, UITransform, Color, Graphics, Layers } from 'cc';

export const W = 960;
export const H = 640;

export const C = {
    bg: new Color(9, 10, 12, 255),
    panel: new Color(17, 19, 23, 255),
    panel2: new Color(24, 27, 32, 255),
    line: new Color(52, 56, 64, 255),
    text: new Color(228, 229, 232, 255),
    dim: new Color(132, 137, 146, 255),
    gold: new Color(201, 168, 104, 255),
    danger: new Color(190, 72, 60, 255),
    ok: new Color(126, 190, 152, 255),
};

export function mkNode(name: string, parent: Node, w = 0, h = 0): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    const t = n.addComponent(UITransform);
    t.setContentSize(w, h);
    parent.addChild(n);
    return n;
}

export interface LabelOpt {
    size?: number;
    color?: Color;
    width?: number;
    align?: 'left' | 'center' | 'right';
    anchorX?: number;
    anchorY?: number;
    lineHeight?: number;
    bold?: boolean;
}

export function mkLabel(parent: Node, text: string, x: number, y: number, opt: LabelOpt = {}): Label {
    const size = opt.size || 18;
    const lineHeight = opt.lineHeight || Math.round(size * 1.55);
    const n = mkNode('label', parent);
    const t = n.getComponent(UITransform)!;
    const l = n.addComponent(Label);
    l.fontSize = size;
    l.lineHeight = lineHeight;
    l.color = opt.color || C.text;
    l.fontFamily = 'Microsoft YaHei, PingFang SC, Hiragino Sans GB, sans-serif';
    l.isBold = !!opt.bold;
    l.enableWrapText = true;
    l.verticalAlign = Label.VerticalAlign.TOP;
    l.horizontalAlign = opt.align === 'center' ? Label.HorizontalAlign.CENTER
        : opt.align === 'right' ? Label.HorizontalAlign.RIGHT
            : Label.HorizontalAlign.LEFT;
    l.string = text;

    if (opt.width) {
        const perLine = Math.max(1, Math.floor(opt.width / size));
        let lines = 0;
        for (const seg of text.split('\n')) {
            lines += Math.max(1, Math.ceil(seg.length / perLine));
        }
        t.setContentSize(opt.width, lines * lineHeight + 6);
        l.overflow = Label.Overflow.CLAMP;
    } else {
        l.overflow = Label.Overflow.NONE;
    }

    t.setAnchorPoint(opt.anchorX === undefined ? 0.5 : opt.anchorX,
        opt.anchorY === undefined ? 0.5 : opt.anchorY);
    n.setPosition(x, y);
    return l;
}

export function mkRect(parent: Node, x: number, y: number, w: number, h: number,
    color: Color, radius = 0, stroke?: Color): Node {
    const n = mkNode('rect', parent, w, h);
    const g = n.addComponent(Graphics);
    g.fillColor = color;
    if (radius > 0) g.roundRect(-w / 2, -h / 2, w, h, radius);
    else g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    if (stroke) {
        g.lineWidth = 1;
        g.strokeColor = stroke;
        if (radius > 0) g.roundRect(-w / 2, -h / 2, w, h, radius);
        else g.rect(-w / 2, -h / 2, w, h);
        g.stroke();
    }
    n.setPosition(x, y);
    return n;
}

export function mkButton(parent: Node, text: string, x: number, y: number,
    w: number, h: number, onClick: () => void, size = 18): Node {
    const n = mkRect(parent, x, y, w, h, C.panel2, 6, C.line);
    mkLabel(n, text, 0, 0, { size, align: 'center', color: C.text });
    n.on(Node.EventType.TOUCH_END, () => onClick());
    return n;
}

export function resetView(view: Node): void {
    const kids = view.children.slice();
    view.removeAllChildren();
    for (const k of kids) k.destroy();
}
