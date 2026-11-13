import { llmConfig } from './LLMConfig';
import { Line } from './Data';

const PERSONA_TEXT = [
    '苏晚（主角女友，28，文案）：短句，很少超过十五个字。紧张时重复上一个词。绝不说「我爱你」「我害怕」。她在护着他，但从不说破。',
    '老K（主角发小，35，跑运输）：命令句，带脏字，喜欢打断别人。绝不说「我怕」「对不起」。他讲义气，但只会用拳头。',
    '阿哲（旧同事，29，网管）：长句，爱分析。绝不说「我不知道」。他想得比谁都多，但不敢全说出来。',
    '周总（老板，52）：说话慢，喜欢用「我们」开头，用模糊的词代替具体的事。绝不认错。',
    '李姐（安全员，41）：半句话，经常说一半就停。紧张时反复道歉。',
    '路人：三到六个字。回答常是「随便」「都行」。从不解释。',
].join('\n');

const SYSTEM_PROMPT = [
    '你是《第七关》的对话引擎。',
    '',
    '场景：七个人刚在焊死的椅子上醒来，听完广播。规则是：每人从 0 到 100 选一个整数；',
    '所有人选完，系统取平均值乘以 0.8；离这个数最近的人得一分；先得三分的人，可以指定一个人去死。',
    '现在有十分钟自由发言。七个人里有老板、同事、发小、情侣、一个不说话的陌生人。',
    '',
    '硬性要求：',
    '1. 只输出 JSON 数组，不要解释，不要代码块。每一项形如 {"who":"名字","text":"台词"}。',
    '2. 每句 8 到 35 个汉字，像真人说话：可以有停顿、改口、废话、没说完的半句。',
    '3. 绝对不能提出「所有人选同一个数」「我们一起过关」这类方案，也不能报出任何具体数字。',
    '   可以试探、暗示、撒谎、威胁、拉拢，但谁都不许把答案说破。',
    '4. 不能出现「作为 AI」「规则设计」「玩家」「系统提示」这类词。',
    '5. 不要写旁白。需要动作时，用括号写在台词前面，例如「（停了很久）……没什么。」',
    '6. 这个房间里没有真正的团结。每个人都在算，只是有人算得体面一点。',
    '',
    '人物（说话必须能分出谁是谁）：',
    PERSONA_TEXT,
].join('\n');

interface ChatMessage {
    role: string;
    content: string;
}

export function llmEnabled(): boolean {
    const c = llmConfig();
    return !!(c.enabled && c.endpoint);
}

function parseLines(text: string): Line[] | null {
    if (!text) {
        return null;
    }
    let s = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = s.indexOf('[');
    const end = s.lastIndexOf(']');
    if (start < 0 || end <= start) {
        return null;
    }
    s = s.slice(start, end + 1);

    try {
        const arr = JSON.parse(s);
        if (!Array.isArray(arr)) {
            return null;
        }
        const out: Line[] = [];
        for (let i = 0; i < arr.length && out.length < 12; i++) {
            const it = arr[i];
            if (!it || typeof it.who !== 'string' || typeof it.text !== 'string') {
                continue;
            }
            const body = it.text.trim();
            if (!body) {
                continue;
            }
            out.push({ who: it.who.trim(), text: body });
        }
        return out.length ? out : null;
    } catch (e) {
        return null;
    }
}

/** 生成第一关自由发言。失败或超时返回 null，由调用方退回脚本对话。 */
export function generateDialogueLines(count: number): Promise<Line[] | null> {
    const cfg = llmConfig();
    const g: any = globalThis as any;

    return new Promise(resolve => {
        if (!g.fetch) {
            resolve(null);
            return;
        }

        const controller = g.AbortController ? new g.AbortController() : null;
        const timer = setTimeout(() => {
            if (controller) {
                controller.abort();
            }
        }, cfg.timeoutMs);

        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: '请写出这十分钟里最可能发生的 ' + count
                    + ' 句话。只返回 JSON 数组，不要任何其它文字。',
            },
        ];

        const body = JSON.stringify({
            model: cfg.model,
            temperature: cfg.temperature,
            max_tokens: cfg.maxTokens,
            messages,
        });

        g.fetch(cfg.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller ? controller.signal : undefined,
        }).then((res: any) => res.json())
            .then((data: any) => {
                clearTimeout(timer);
                const choice = data && data.choices && data.choices[0];
                const content = choice && choice.message ? choice.message.content : '';
                resolve(parseLines(String(content || '')));
            })
            .catch(() => {
                clearTimeout(timer);
                resolve(null);
            });
    });
}
