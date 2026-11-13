/**
 * 大模型配置
 *
 * 打开方式二选一：
 *   1. 把 enabled 改成 true，重新构建
 *   2. 不改代码，在 index.html 的 <head> 里加：
 *      <script>window.__LLM__ = { enabled: true };</script>
 *
 * 注意：浏览器不直接持有密钥。endpoint 指向本机的 llm_proxy.py。
 * 模型名以 llm.proxy.json 里的 model 为准，这里只是兜底。
 */
export const LLM_CONFIG = {
    /** 是否启用大模型生成对话 */
    enabled: true,

    /** 本地代理地址（见 tools/llm_proxy.py） */
    endpoint: 'http://127.0.0.1:8787/v1/chat/completions',

    /** 兜底模型名；代理配置里填了 model 时会覆盖它 */
    model: 'deepseek-v4.1-flash',

    /** 采样温度：越高越像人，越容易跑偏 */
    temperature: 0.95,

    /** 单次生成的最大 token。注意推理模型会先消耗思维链 */
    maxTokens: 1600,

    /** 超时（毫秒），超时后自动退回脚本对话 */
    timeoutMs: 45000,
};

/** 支持运行时覆盖，便于不重新构建就切换 */
export function llmConfig(): typeof LLM_CONFIG {
    const g: any = globalThis as any;
    if (g.__LLM__ && typeof g.__LLM__ === 'object') {
        return Object.assign({}, LLM_CONFIG, g.__LLM__);
    }
    return LLM_CONFIG;
}
