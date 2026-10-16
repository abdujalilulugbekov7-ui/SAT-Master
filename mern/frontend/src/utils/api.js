const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function token() { return localStorage.getItem('em_token') || ''; }
export function setToken(t) { if (t) localStorage.setItem('em_token', t); else localStorage.removeItem('em_token'); }

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}), ...(opts.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || 'Xatolik');
  return data;
}

export const api = {
  start: (ism, nomer) => req('/api/auth/start', { method: 'POST', body: JSON.stringify({ ism, nomer }) }),
  verify: (nomer, code, ism) => req('/api/auth/verify', { method: 'POST', body: JSON.stringify({ nomer, code, ism }) }),
  me: () => req('/api/auth/me'),
  visit: (type) => req('/api/test/visit', { method: 'POST', body: JSON.stringify({ type }) }).catch(() => ({})),
  saveResult: (type, score, detail) => req('/api/test/result', { method: 'POST', body: JSON.stringify({ type, score, detail }) }).catch(() => ({})),
  daily: (type, correct, heartsLost) => req('/api/test/daily', { method: 'POST', body: JSON.stringify({ type, correct, heartsLost }) }).catch(() => ({})),
  heart: () => req('/api/test/heart', { method: 'POST', body: '{}' }).catch(() => ({})),
  buyPlan: (plan, card, provider) => req('/api/test/plan', { method: 'POST', body: JSON.stringify({ plan, card, provider }) }),
  rating: () => req('/api/test/rating').catch(() => ({ rating: [] })),
  myResults: () => req('/api/test/my').catch(() => ({ results: [] })),
  adminStats: () => req('/api/admin/stats'),
  adminUsers: () => req('/api/admin/users'),
  adminScores: (type) => req('/api/admin/scores' + (type ? '?type=' + type : '')),
  adminPayments: () => req('/api/admin/payments').catch(() => ({ payments: [] })),
  adminRevenue: () => req('/api/admin/revenue').catch(() => null),
  adminChats: (nomer) => req('/api/admin/chats' + (nomer ? '?nomer=' + nomer : '')).catch(() => ({ chats: [] })),
  adminClear: (type) => req('/api/admin/clear', { method: 'DELETE', body: JSON.stringify({ type }) }),
  ai: (message, mode) => req('/api/ai', { method: 'POST', body: JSON.stringify({ message, mode }) }).catch(() => null),
};

export function fmtPhone(p) {
  p = String(p || '').replace(/\D/g, '').slice(0, 9);
  const a = p.slice(0, 2), b = p.slice(2, 5), c = p.slice(5, 7), d = p.slice(7, 9);
  return '+998' + (a ? ' ' + a : '') + (b ? ' ' + b : '') + (c ? ' ' + c : '') + (d ? ' ' + d : '');
}
