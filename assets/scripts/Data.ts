export interface Persona {
    id: string;
    name: string;
    short: string;
    cooperate: number;
    offset: number;
    killOrder: string[];
    never: string[];
    voice: string;
    lastWords: string;
}

export interface Line {
    who: string;
    text: string;
}

export const PLAYER_ID = 'me';

export const PERSONAS: Persona[] = [
    {
        id: 'zhou', name: '周建国', short: '周总',
        cooperate: 50, offset: 6,
        killOrder: ['k', 'zhe', 'lu', 'li', 'su', 'me'],
        never: ['li'],
        voice: '我们一起出去。',
        lastWords: '你们以后都会记得我。',
    },
    {
        id: 'li', name: '李慧兰', short: '李姐',
        cooperate: 50, offset: 2,
        killOrder: ['zhe', 'su', 'me', 'lu', 'k'],
        never: ['zhou'],
        voice: '我……我听你们的。',
        lastWords: '我不想的。可我不举手，下一个就是我。',
    },
    {
        id: 'k', name: '老K', short: '老K',
        cooperate: 50, offset: 0,
        killOrder: ['zhou', 'zhe', 'li', 'lu'],
        never: ['me', 'su'],
        voice: '有我在，谁也别想动你们。',
        lastWords: '……我背过你们。',
    },
    {
        id: 'zhe', name: '阿哲', short: '阿哲',
        cooperate: 50, offset: -2,
        killOrder: ['zhou', 'k', 'su', 'li', 'lu', 'me'],
        never: [],
        voice: '我算过。',
        lastWords: '我算错了。',
    },
    {
        id: 'lu', name: '路人', short: '路人',
        cooperate: 50, offset: 1,
        killOrder: ['li', 'zhou', 'zhe', 'k', 'su'],
        never: ['me'],
        voice: '随便。',
        lastWords: '我上回也坐你这个位置。',
    },
    {
        id: 'su', name: '苏晚', short: '苏晚',
        cooperate: 50, offset: -5,
        killOrder: ['zhou', 'zhe', 'li', 'k', 'lu'],
        never: ['me'],
        voice: '别管他们。',
        lastWords: '记得吃饭。',
    },
];

export const PROLOGUE: Line[] = [
    { who: '', text: '椅子摩擦地面的声音，七下。然后是很长的安静。' },
    { who: '', text: '你睁眼。七把椅子焊死在地上，围成半圈。头顶一盏灯。' },
    { who: '老K', text: '谁他妈干的？' },
    { who: '老K', text: '放我出去！' },
    { who: '李姐', text: '我……我怎么在这儿……' },
    { who: '李姐', text: '我明明在加班……' },
    { who: '阿哲', text: '别喊了。' },
    { who: '阿哲', text: '三个问题。我们怎么进来的、这里有几个出口、谁最想让我们死。' },
    { who: '周总', text: '大家别慌。' },
    { who: '周总', text: '这件事我来协调。' },
    { who: '苏晚', text: '你醒了。' },
    { who: '苏晚', text: '林深。林深，你看着我。' },
    { who: '老K', text: '嫂子你别晃他，先看看有没有伤。' },
    { who: '李姐', text: '你们……认识？' },
    { who: '苏晚', text: '他是我男朋友。' },
    { who: '苏晚', text: '别动，先看有没有绳子。' },
    { who: '苏晚', text: '我们这是怎么了？这是哪儿？' },
    { who: '', text: '没有人回答。' },
    { who: '', text: '灯亮。所有人同时眯眼。' },
    { who: '广播', text: '请安静。' },
    { who: '广播', text: '你们七个人，都做过同一件事。' },
    { who: '广播', text: '接下来的七关，每一关结束之前，必须有一个人死。' },
    { who: '广播', text: '死一个人，下一关就会开始。' },
    { who: '广播', text: '七关之后，还活着的人可以离开。' },
    { who: '广播', text: '祝你们好运。' },
    { who: '', text: '七把椅子的锁同时弹开。' },
    { who: '', text: '老K 站起来，走了两步。他沿着光圈的边缘走了一圈，回来。' },
    { who: '老K', text: '没路。' },
    { who: '阿哲', text: '她刚才说的是「每一关」。不是说这间屋子。' },
    { who: '广播', text: '第一关。' },
    { who: '广播', text: '每人从 0 到 100 之间，选一个整数。' },
    { who: '广播', text: '所有人选完，系统取平均值，乘以 0.8。' },
    { who: '广播', text: '离这个数最近的人，得一分。' },
    { who: '广播', text: '先得三分的人，可以指定一个人去死。' },
    { who: '广播', text: '十分钟后开始。' },
];

export const TALK: Line[] = [
    { who: '周总', text: '好。都听我说一句。' },
    { who: '周总', text: '现在最怕的是乱。三件事：这是哪儿、谁干的、怎么出去。' },
    { who: '周总', text: '这三件我一件都不知道。但我知道一件——从现在起，我们七个人是一根绳上的。' },
    { who: '周总', text: '我们一起出去。' },
    { who: '老K', text: '周总这话在理。' },
    { who: '老K', text: '有我在，谁也别想动你们。' },
    { who: '阿哲', text: '先别急着表态。' },
    { who: '阿哲', text: '我关心的是规则里那个 0.8。' },
    { who: '李姐', text: '我……我听你们的。' },
    { who: '李姐', text: '我家里还有个孩子。' },
    { who: '苏晚', text: '你别说话。先看。' },
    { who: '周总', text: '0.8 怎么了。' },
    { who: '阿哲', text: '这个数不是算出来的，是猜出来的。' },
    { who: '阿哲', text: '七个人里，只要有人想得比别人多一层，他就会赢。' },
    { who: '周总', text: '那我们就都别多想。' },
    { who: '阿哲', text: '别多想的人，永远只是别人的一层。' },
    { who: '周总', text: '你到底想说什么。' },
    { who: '阿哲', text: '（停了很久）……没什么。' },
    { who: '老K', text: '你们烦不烦。' },
    { who: '李姐', text: '别吵了……求你们别吵了。' },
    { who: '', text: '没有人再说话。' },
    { who: '', text: '轮到你。所有人都在等你先开口。' },
];
