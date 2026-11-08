export interface ApiConfig { mode: 'mock' | 'real'; baseUrl: string; healthPath: string; chatPath: string; timeoutMs: number }
const defaults: ApiConfig = { mode: import.meta.env.VITE_USE_MOCK === 'true' ? 'mock' : 'real', baseUrl: import.meta.env.VITE_API_BASE || '/api/v1', healthPath: import.meta.env.VITE_HEALTH_PATH || '/health', chatPath: import.meta.env.VITE_CHAT_PATH || '/chat', timeoutMs: 60000 };
export function getConfig(): ApiConfig {
  try { const value = JSON.parse(localStorage.getItem('zhixi-api-config-v2') || 'null'); if(value) return validateConfig({...defaults,...value}); } catch { /* fall back to environment */ }
  return { ...defaults };
}
export function validateConfig(c: ApiConfig): ApiConfig {
  const baseUrl = c.baseUrl.trim().replace(/\/+$/, '');
  if (!(baseUrl.startsWith('/') && !baseUrl.startsWith('//')) && !/^https?:\/\//i.test(baseUrl)) throw new Error('后端地址需以 /、http:// 或 https:// 开头');
  if (/^https?:/i.test(baseUrl)) { const u = new URL(baseUrl); if(u.username || u.password || u.search || u.hash) throw new Error('后端地址不能包含凭据、查询参数或锚点'); }
  for(const path of [c.healthPath,c.chatPath]) if(!/^\/(?!\/)[^?#\s]*$/.test(path)) throw new Error('接口路径需以单个 / 开头，不含空格或参数');
  if(!Number.isFinite(c.timeoutMs) || c.timeoutMs < 1000 || c.timeoutMs > 300000) throw new Error('超时时间应为 1–300 秒');
  if(!['mock','real'].includes(c.mode)) throw new Error('无效的连接模式');
  return {...c,baseUrl};
}
export function saveConfig(c: ApiConfig) { const value=validateConfig(c); localStorage.setItem('zhixi-api-config-v2',JSON.stringify(value)); return value; }

