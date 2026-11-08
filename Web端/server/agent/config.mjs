/** Agent 配置解析：环境变量优先，createApp 注入的 llm 覆盖同名项。 */

const isObj = v => typeof v === 'object' && v !== null && !Array.isArray(v);

function boolOf(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return !['false', '0', 'off', 'no'].includes(String(value).trim().toLowerCase());
}
function intOf(value, fallback, { min = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min) return fallback;
  return n;
}
function numOf(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function textOf(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

/**
 * @param {Record<string,string|undefined>} env
 * @param {object} overrides createApp({llm}) 注入的配置
 */
export function resolveAgentConfig(env = process.env, overrides = {}) {
  const o = isObj(overrides) ? overrides : {};
  const pick = (key, envKey, fallback) => (o[key] !== undefined ? o[key] : env[envKey] !== undefined && env[envKey] !== '' ? env[envKey] : fallback);

  const baseUrl = textOf(pick('baseUrl', 'LLM_BASE_URL', ''));
  const model = textOf(pick('model', 'LLM_MODEL', ''));
  const apiKey = textOf(pick('apiKey', 'LLM_API_KEY', ''));
  const timeoutMs = intOf(pick('timeoutMs', 'LLM_TIMEOUT_MS', 30000), 30000, { min: 1 });
  const temperature = numOf(pick('temperature', 'LLM_TEMPERATURE', 0.2), 0.2);
  const maxTokens = intOf(pick('maxTokens', 'LLM_MAX_TOKENS', 1600), 1600, { min: 1 });
  const maxRetries = intOf(pick('maxRetries', 'LLM_MAX_RETRIES', 1), 1, { min: 0 });

  // 注入配置且未显式写 enabled 时，视为主动启用；否则读环境变量，默认 true。
  const injected = o.baseUrl !== undefined || o.model !== undefined;
  const enabledFlag = o.enabled !== undefined ? boolOf(o.enabled, true) : injected ? true : boolOf(env.AGENT_ENABLED, true);

  return {
    enabled: enabledFlag && !!baseUrl && !!model,
    baseUrl,
    model,
    apiKey,
    timeoutMs,
    temperature,
    maxTokens,
    maxRetries,
  };
}
