/** OpenAI 兼容 Chat Completions 客户端，仅用 Node 内置模块。 */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function chatCompletionsUrl(baseUrl) {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('未配置 LLM_BASE_URL');
  if (/\/chat\/completions$/i.test(base)) return base;
  // 以 /v1 结尾或普通地址，都补上 /chat/completions。
  return `${base}/chat/completions`;
}

function readableNetworkError(error, timeoutMs) {
  const name = error?.name || '';
  if (name === 'TimeoutError' || name === 'AbortError' || error?.code === 'ABORT_ERR') {
    return new Error(`模型请求超时（${timeoutMs}ms）`);
  }
  return new Error(`无法连接模型服务：${error?.message || String(error)}`);
}

/**
 * @param {{baseUrl:string,model:string,apiKey?:string,timeoutMs?:number,temperature?:number,maxTokens?:number,maxRetries?:number}} config
 */
export function createLlmClient(config = {}) {
  const endpoint = chatCompletionsUrl(config.baseUrl);
  const timeoutMs = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : 30000;
  const maxRetries = Number.isInteger(config.maxRetries) && config.maxRetries >= 0 ? config.maxRetries : 1;
  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  async function complete(messages) {
    const started = Date.now();
    for (let attempt = 0; ; attempt += 1) {
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: config.temperature ?? 0.2,
            max_tokens: config.maxTokens ?? 1600,
            stream: false,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (attempt < maxRetries) {
          await sleep(300 * 2 ** attempt);
          continue;
        }
        throw readableNetworkError(error, timeoutMs);
      }

      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          await sleep(300 * 2 ** attempt);
          continue;
        }
        const error = new Error(`上游模型请求失败（HTTP ${response.status}）`);
        error.status = response.status;
        error.upstreamStatus = response.status;
        throw error;
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('模型返回格式不符合 Chat Completions 协议');
      }
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('模型返回格式不符合 Chat Completions 协议');
      }
      return { content, model: data.model || config.model, usage: data.usage || null, latencyMs: Date.now() - started };
    }
  }

  return { config, complete };
}
