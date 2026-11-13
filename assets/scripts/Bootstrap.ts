import { _decorator, Component, Node, director, Director, Color, profiler } from 'cc';
import { PERSONAS, PROLOGUE, TALK, Line } from './Data';
import { llmEnabled, generateDialogueLines } from './LLM';
import { W, H, C, mkNode, mkRect, mkLabel, mkButton, resetView } from './UI';

const { ccclass } = _decorator;

type State = 'title' | 'prologue' | 'talk' | 'pick' | 'reveal' | 'kill' | 'dead' | 'perfect' | 'end';

interface Entry {
    id: string;
    name: string;
    pick: number;
    dist: number;
}

let booted = false;
let view: Node = null!;
let content: Node = null!;

let state: State = 'title';
let lineIdx = 0;
let round = 1;
let scores: Record<string, number> = {};
let entries: Entry[] = [];
let target = 0;
let allTied = false;
let playerPick = 50;
let winnerId = '';
let deadId = '';
let note = '';
let perfectFlag = false;
let talkLines: Line[] = TALK;
let talkLoading = false;
let llmTried = false;

function ids(): string[] {
    return ['me'].concat(PERSONAS.map(p => p.id));
}

function nameOf(id: string): string {
    if (id === 'me') {
        return '我';
    }
    const p = PERSONAS.find(x => x.id === id);
    return p ? p.short : id;
}

function clampNum(v: number): number {
    return Math.max(0, Math.min(100, Math.round(v)));
}

function resetGame(): void {
    round = 1;
    scores = {};
    entries = [];
    target = 0;
    allTied = false;
    playerPick = 50;
    winnerId = '';
    deadId = '';
    note = '';
    perfectFlag = false;
    lineIdx = 0;
    talkLines = TALK;
    talkLoading = false;
    llmTried = false;
    for (const id of ids()) {
        scores[id] = 0;
    }
}

function distOf(id: string): number {
    const e = entries.find(x => x.id === id);
    return e ? e.dist : 0;
}

function runRound(): void {
    const picks: Record<string, number> = {};
    picks['me'] = playerPick;

    const cooperate = round === 1 || allTied;
    PERSONAS.forEach((p, i) => {
        if (cooperate) {
            picks[p.id] = p.cooperate;
        } else {
            const jitter = ((round * 7 + i * 13) % 5) - 2;
            picks[p.id] = clampNum(Math.round(target) + p.offset + jitter);
        }
    });

    const all = ids();
    let sum = 0;
    for (const id of all) {
        sum += picks[id];
    }
    const avg = sum / all.length;
    const t = avg * 0.8;

    const list: Entry[] = all.map(id => ({
        id,
        name: nameOf(id),
        pick: picks[id],
        dist: Math.abs(picks[id] - t),
    }));

    let minD = Infinity;
    for (const e of list) {
        if (e.dist < minD) {
            minD = e.dist;
        }
    }
    const winners = list.filter(e => Math.abs(e.dist - minD) < 1e-9);
    allTied = winners.length === all.length;
    for (const w of winners) {
        scores[w.id] = (scores[w.id] || 0) + 1;
    }

    entries = list.slice().sort((a, b) => a.dist - b.dist);
    target = t;
    note = allTied ? '七人并列，每人一分。' : (winners[0].name + ' 得分。');

    const reached = all.filter(id => scores[id] >= 3);
    winnerId = '';
    perfectFlag = false;

    if (reached.length === all.length) {
        perfectFlag = true;
    } else if (reached.length === 1) {
        winnerId = reached[0];
    } else if (reached.length > 1) {
        reached.sort((a, b) => distOf(a) - distOf(b));
        winnerId = reached[0];
        note += ' 多人同时三分，加赛判定 ' + nameOf(winnerId) + ' 胜出。';
    }
}

function confirmPick(): void {
    runRound();
    state = perfectFlag ? 'perfect' : 'reveal';
    render();
}

function nextAfterReveal(): void {
    if (winnerId) {
        if (winnerId === 'me') {
            state = 'kill';
            render();
            return;
        }
        deadId = pickAiVictim(winnerId);
        state = 'dead';
        render();
        return;
    }
    round++;
    playerPick = clampNum(Math.round(target));
    state = 'pick';
    render();
}

function pickAiVictim(by: string): string {
    const p = PERSONAS.find(x => x.id === by);
    const alive = ids().filter(id => id !== by && id !== deadId);
    if (!p || alive.length === 0) {
        return alive[0];
    }
    for (const id of p.killOrder) {
        if (alive.indexOf(id) >= 0 && p.never.indexOf(id) < 0) {
            return id;
        }
    }
    return alive[0];
}

function enterTalk(): void {
    state = 'talk';
    lineIdx = 0;
    talkLines = TALK;
    talkLoading = false;
    render();

    if (!llmEnabled() || llmTried) {
        return;
    }

    llmTried = true;
    talkLoading = true;
    render();

    generateDialogueLines(6).then(lines => {
        if (lines && lines.length) {
            talkLines = lines.concat([
                { who: '', text: '没有人再说话。' },
                { who: '', text: '轮到你。所有人都在等你先开口。' },
            ]);
        }
        talkLoading = false;
        lineIdx = 0;
        render();
    }).catch(() => {
        talkLoading = false;
        talkLines = TALK;
        lineIdx = 0;
        render();
    });
}

function onTap(): void {
    if (state === 'title') {
        lineIdx = 0;
        state = 'prologue';
        render();
        return;
    }
    if (state === 'prologue') {
        lineIdx++;
        if (lineIdx >= PROLOGUE.length) {
            enterTalk();
            return;
        }
        render();
        return;
    }
    if (state === 'talk') {
        if (talkLoading) {
            return;
        }
        lineIdx++;
        if (lineIdx >= talkLines.length) {
            lineIdx = 0;
            state = 'pick';
        }
        render();
    }
}

function renderTitle(): void {
    mkLabel(content, '第 七 关', 0, 130, { size: 66, align: 'center', bold: true, color: C.text });
    mkLabel(content, '七个人。七道题。一个答案。', 0, 55, { size: 20, align: 'center', color: C.dim });
    mkLabel(content, '点 击 开 始', 0, -110, { size: 18, align: 'center', color: C.gold });
    mkLabel(content, '原型 · 第一关', 0, -285, { size: 14, align: 'center', color: C.dim });
}

function renderLines(arr: Line[], title: string): void {
    const line = arr[Math.min(lineIdx, arr.length - 1)];
    const isNarr = !line.who;

    mkLabel(content, title, -430, 285, { size: 15, color: C.dim, anchorX: 0, anchorY: 1 });

    if (!isNarr) {
        mkLabel(content, line.who, 0, 210, { size: 20, align: 'center', color: C.gold });
    }

    mkLabel(content, line.text, 0, 165, {
        size: isNarr ? 22 : 24,
        width: 760,
        align: 'center',
        anchorY: 1,
        lineHeight: isNarr ? 38 : 40,
        color: isNarr ? C.dim : C.text,
    });

    mkLabel(content, (lineIdx + 1) + ' / ' + arr.length, 0, -245, { size: 14, align: 'center', color: C.dim });
    mkLabel(content, '点击继续', 0, -278, { size: 14, align: 'center', color: C.gold });
}

function renderScores(): void {
    let x = -400;
    for (const id of ids()) {
        mkLabel(content, nameOf(id) + ' ' + scores[id], x, 218, {
            size: 14,
            color: id === 'me' ? C.gold : C.dim,
            anchorX: 0,
            anchorY: 0.5,
        });
        x += 118;
    }
}

function renderPick(): void {
    mkLabel(content, '第一关 · 第 ' + round + ' 轮', -430, 285, { size: 15, color: C.dim, anchorX: 0, anchorY: 1 });
    renderScores();

    mkLabel(content, '你选的数', 0, 150, { size: 15, align: 'center', color: C.dim });
    mkLabel(content, String(playerPick), 0, 55, { size: 76, align: 'center', bold: true, color: C.text });

    mkButton(content, '-10', -225, -55, 110, 54, () => { playerPick = clampNum(playerPick - 10); render(); });
    mkButton(content, '-1', -90, -55, 100, 54, () => { playerPick = clampNum(playerPick - 1); render(); });
    mkButton(content, '+1', 90, -55, 100, 54, () => { playerPick = clampNum(playerPick + 1); render(); });
    mkButton(content, '+10', 225, -55, 110, 54, () => { playerPick = clampNum(playerPick + 10); render(); });

    mkButton(content, '确 认', 0, -150, 260, 58, confirmPick, 20);

    const hint = round === 1
        ? '没有人再说话。'
        : '上一轮的目标值是 ' + target.toFixed(1) + '。';
    mkLabel(content, hint, 0, -215, { size: 15, align: 'center', color: C.dim });
}

function renderReveal(): void {
    mkLabel(content, '开 牌', -430, 285, { size: 15, color: C.dim, anchorX: 0, anchorY: 1 });
    mkLabel(content, '第 ' + round + ' 轮', 430, 285, { size: 15, color: C.dim, anchorX: 1, anchorY: 1, align: 'right' });

    mkLabel(content, '目标值 ' + target.toFixed(1), 0, 240, { size: 20, align: 'center', color: C.gold });

    mkLabel(content, '名字', -380, 196, { size: 13, color: C.dim, anchorX: 0, anchorY: 1 });
    mkLabel(content, '所选', 60, 196, { size: 13, color: C.dim, anchorX: 1, anchorY: 1, align: 'right' });
    mkLabel(content, '距离', 220, 196, { size: 13, color: C.dim, anchorX: 1, anchorY: 1, align: 'right' });
    mkLabel(content, '分', 380, 196, { size: 13, color: C.dim, anchorX: 1, anchorY: 1, align: 'right' });

    let rowY = 160;
    for (const e of entries) {
        const isClosest = Math.abs(e.dist - entries[0].dist) < 1e-9;
        if (isClosest) {
            mkRect(content, 0, rowY, 786, 34, new Color(30, 34, 40, 255), 4, C.line);
        }
        const col = e.id === 'me' ? C.gold : C.text;
        mkLabel(content, e.name, -380, rowY, { size: 16, color: col, anchorX: 0, anchorY: 0.5 });
        mkLabel(content, String(e.pick), 60, rowY, { size: 16, color: col, anchorX: 1, anchorY: 0.5, align: 'right' });
        mkLabel(content, e.dist.toFixed(1), 220, rowY, { size: 16, color: C.dim, anchorX: 1, anchorY: 0.5, align: 'right' });
        mkLabel(content, String(scores[e.id]), 380, rowY, { size: 16, color: col, anchorX: 1, anchorY: 0.5, align: 'right' });
        rowY -= 38;
    }

    mkLabel(content, note, 0, -140, { size: 16, align: 'center', color: C.text });
    if (winnerId) {
        mkLabel(content, nameOf(winnerId) + ' 已到三分。', 0, -175, { size: 16, align: 'center', color: C.danger });
    }

    mkButton(content, '继续', 0, -245, 220, 56, nextAfterReveal, 18);
}

function renderKill(): void {
    const isMe = winnerId === 'me';
    mkLabel(content, isMe ? '你有权指定一个人' : nameOf(winnerId) + ' 有权指定一个人', 0, 250, { size: 26, align: 'center' });
    mkLabel(content, '被指定的人，死。', 0, 205, { size: 15, align: 'center', color: C.dim });

    const alive = ids().filter(id => id !== winnerId);
    alive.forEach((id, i) => {
        const x = i % 2 === 0 ? -160 : 160;
        const y = 110 - Math.floor(i / 2) * 80;
        mkButton(content, nameOf(id), x, y, 280, 62, () => {
            deadId = id;
            state = 'dead';
            render();
        }, 20);
    });

    mkLabel(content, '无论选谁，这一轮都会结束。', 0, -215, { size: 14, align: 'center', color: C.dim });
}

function renderDead(): void {
    const p = PERSONAS.find(x => x.id === deadId);
    mkLabel(content, '第一关 · 结束', 0, 235, { size: 15, align: 'center', color: C.dim });
    mkLabel(content, nameOf(deadId), 0, 160, { size: 34, align: 'center', color: C.danger });
    mkLabel(content, '「' + (p ? p.lastWords : '……') + '」', 0, 95, {
        size: 20, width: 700, align: 'center', anchorY: 1, color: C.text, lineHeight: 34,
    });
    mkLabel(content, '广播：死一个人，下一关就会开始。', 0, -40, { size: 15, align: 'center', color: C.dim });
    mkButton(content, '继续', 0, -160, 220, 56, () => { state = 'end'; render(); });
}

function renderPerfect(): void {
    mkLabel(content, '全 员 过 关', 0, 140, { size: 46, align: 'center', bold: true, color: C.ok });
    mkLabel(content, '七个人都到了三分。没有人死。', 0, 60, { size: 20, align: 'center', color: C.text });
    mkLabel(content, '规则换了。没有播报，也没有人被抬走。', 0, 10, { size: 16, align: 'center', color: C.dim });
    mkLabel(content, '你抬手数了一下：七个人。', 0, -30, { size: 16, align: 'center', color: C.dim });
    mkButton(content, '继续', 0, -150, 220, 56, () => { state = 'end'; render(); });
}

function renderEnd(): void {
    const aliveCount = ids().filter(id => id !== deadId).length;
    mkLabel(content, '原 型 到 此 为 止', 0, 150, { size: 34, align: 'center', bold: true });
    mkLabel(content, deadId
        ? '第一关结束。死了一个人，场上还有 ' + aliveCount + ' 个人。'
        : '第一关结束。没有人死，场上还是七个人。', 0, 80, { size: 18, align: 'center', color: C.text });
    mkLabel(content, '后面的六关，留给下一次。', 0, 35, { size: 15, align: 'center', color: C.dim });
    mkButton(content, '重新开始', 0, -100, 240, 56, () => { resetGame(); state = 'title'; render(); });
}

function renderLoading(): void {
    mkLabel(content, '第一关 · 0.8', -430, 285, { size: 15, color: C.dim, anchorX: 0, anchorY: 1 });
    mkLabel(content, '……', 0, 60, { size: 34, align: 'center', color: C.dim });
    mkLabel(content, '七个人都在想该说什么', 0, -10, { size: 16, align: 'center', color: C.dim });
}

function render(): void {
    if (!content) {
        return;
    }
    resetView(content);
    switch (state) {
        case 'title': renderTitle(); break;
        case 'prologue': renderLines(PROLOGUE, '序 · 灯亮之前'); break;
        case 'talk':
            if (talkLoading) {
                renderLoading();
            } else {
                renderLines(talkLines, '第一关 · 0.8');
            }
            break;
        case 'pick': renderPick(); break;
        case 'reveal': renderReveal(); break;
        case 'kill': renderKill(); break;
        case 'dead': renderDead(); break;
        case 'perfect': renderPerfect(); break;
        case 'end': renderEnd(); break;
        default: break;
    }
}

export function boot(canvas: Node): void {
    if (booted) {
        return;
    }
    booted = true;
    resetGame();

    profiler.hideStats();

    view = mkNode('GameRoot', canvas, W, H);
    mkRect(view, 0, 0, 3200, 2000, C.bg);

    const click = mkNode('ClickLayer', view, 3200, 2000);
    click.on(Node.EventType.TOUCH_END, onTap);

    content = mkNode('Content', view, W, H);
    render();
}

@ccclass('Bootstrap')
export class Bootstrap extends Component {
    start(): void {
        boot(this.node);
    }
}

director.on(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
    const scene = director.getScene();
    if (!scene) {
        return;
    }
    const canvas = scene.getChildByName('Canvas');
    if (canvas) {
        boot(canvas);
    }
});
