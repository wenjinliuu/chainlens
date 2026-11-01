/*
 * 潮信 · Cloudflare Worker：静态站 + 订阅 API（免费额度：Workers 请求 + D1）
 * /api/subscribe   POST {email, cols[], watch[], hp}   → 记 pending、发确认邮件（double opt-in）
 * /api/resend      POST {email}                        → 重发确认邮件（10 分钟内只发一次）
 * /api/confirm     GET  ?token=                        → 确认订阅，跳 /subscribe?state=confirmed
 * /api/prefs       GET  ?token= / POST {token, cols, watch, deliverAt, format}
 * /api/unsubscribe GET  ?token= （邮件里的一键退订）/ POST {token, keep?: cols[]}（只保留部分栏目）
 * 其它路径交给静态资源。邮箱只存在 D1，不进日志；没有 RESEND_KEY 时邮件只记日志不发（本地开发用）。
 */
const COLS = ['eve', 'rr', 'morn', 'week', 'col'];
const COL_NAME = { eve: '期权日报', rr: '研报日报', morn: '盘前汇总', week: '周报', col: '专栏报告' };
const CONFIRM_TTL = 24 * 3600e3, RESEND_GAP = 10 * 60e3;

const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const redirect = (url, status = 302) => new Response(null, { status, headers: { location: url, 'cache-control': 'no-store' } });
const now = () => new Date().toISOString();
const isEmail = s => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const token = () => { const b = new Uint8Array(24); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const cleanCols = v => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => String(x).trim()).filter(x => COLS.includes(x));
const cleanWatch = v => (Array.isArray(v) ? v : String(v || '').split(',')).map(x => String(x).trim().toUpperCase()).filter(x => /^[A-Z][A-Z.]{0,6}$/.test(x)).slice(0, 20);
const site = env => (env.SITE_URL || '').replace(/\/$/, '');

async function sendMail(env, to, subject, html) {
  if (!env.RESEND_KEY || !env.MAIL_FROM) { console.log(`[mail 未发送：缺 RESEND_KEY / MAIL_FROM] ${subject}`); return { skipped: true }; }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html }) });
  if (!r.ok) { console.log(`[mail 失败 ${r.status}]`); return { ok: false }; }
  return { ok: true };
}
const confirmMail = (env, tk, cols) => {
  const link = `${site(env)}/api/confirm?token=${tk}`;
  return `<div style="font-family:-apple-system,'PingFang SC','Noto Sans SC',sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#16172a">
  <div style="font-size:22px;font-weight:900;margin-bottom:8px">确认订阅潮信</div>
  <p style="color:#444760;line-height:1.7">点一下下面的按钮，明天起就能收到：${cols.map(c => COL_NAME[c]).join('、')}。链接 24 小时内有效。</p>
  <p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#5b4cff;color:#fff;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:999px">确认订阅</a></p>
  <p style="font-size:12px;color:#8e91a7;line-height:1.7">如果不是你操作的，忽略这封邮件即可，我们不会再发。<br>本站内容为公开信息整理，不构成任何投资建议。市场有风险，投资需谨慎。</p></div>`;
};

async function api(request, env, url) {
  const path = url.pathname, method = request.method;
  const body = method === 'POST' ? await request.json().catch(() => null) : null;
  const debug = env.DEBUG_TOKENS === '1';   // 本地测试：把 token 回给调用方（线上绝不开）
  const DB = env.DB;
  const byToken = tk => tk && /^[A-Za-z0-9_-]{20,40}$/.test(tk) ? DB.prepare('SELECT * FROM subscribers WHERE token = ?').bind(tk).first() : null;
  const pub = r => ({ email: r.email, status: r.status, cols: r.cols.split(',').filter(Boolean), watch: r.watch.split(',').filter(Boolean), deliverAt: r.deliver_at, format: r.format, since: r.created_at.slice(0, 10) });

  if (path === '/api/subscribe' && method === 'POST' || path === '/api/resend' && method === 'POST') {
    if (!body || !isEmail(body.email) || (body.hp && String(body.hp).length)) return json({ ok: false, error: '邮箱格式不对' }, 400);
    const email = body.email.trim().toLowerCase();
    const cols = path === '/api/subscribe' ? (cleanCols(body.cols).length ? cleanCols(body.cols) : ['eve', 'rr']) : null;
    const watch = cleanWatch(body.watch);
    const row = await DB.prepare('SELECT * FROM subscribers WHERE email = ?').bind(email).first();
    if (row && row.status === 'confirmed') return json({ ok: true, state: 'already' });
    if (row && row.confirm_sent_at && Date.now() - Date.parse(row.confirm_sent_at) < RESEND_GAP) return json({ ok: true, state: 'sent', throttled: true });
    const tk = row ? row.token : token(), t = now();
    if (row) await DB.prepare('UPDATE subscribers SET status = ?, cols = COALESCE(?, cols), watch = ?, confirm_sent_at = ?, unsub_at = NULL WHERE id = ?').bind('pending', cols ? cols.join(',') : null, watch.join(','), t, row.id).run();
    else await DB.prepare('INSERT INTO subscribers (email, status, token, cols, watch, created_at, confirm_sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(email, 'pending', tk, (cols || ['eve', 'rr']).join(','), watch.join(','), t, t).run();
    await sendMail(env, email, '确认订阅潮信', confirmMail(env, tk, cols || (row ? row.cols.split(',') : ['eve', 'rr'])));
    return json({ ok: true, state: 'sent', ...(debug ? { token: tk } : {}) });
  }
  if (path === '/api/confirm' && method === 'GET') {
    const r = await byToken(url.searchParams.get('token'));
    if (!r) return redirect(`${site(env)}/subscribe?state=expired`);
    if (r.status !== 'confirmed') {
      if (r.confirm_sent_at && Date.now() - Date.parse(r.confirm_sent_at) > CONFIRM_TTL) return redirect(`${site(env)}/subscribe?state=expired&email=${encodeURIComponent(r.email)}`);
      await DB.prepare('UPDATE subscribers SET status = ?, confirmed_at = ?, unsub_at = NULL WHERE id = ?').bind('confirmed', now(), r.id).run();
    }
    return redirect(`${site(env)}/subscribe?state=confirmed&token=${r.token}&email=${encodeURIComponent(r.email)}`);
  }
  if (path === '/api/prefs' && method === 'GET') {
    const r = await byToken(url.searchParams.get('token')); if (!r) return json({ ok: false, error: '链接失效' }, 404);
    const sent = await DB.prepare('SELECT COUNT(*) AS n FROM sends WHERE sub_id = ? AND status = ?').bind(r.id, 'sent').first();
    return json({ ok: true, ...pub(r), sent: sent ? sent.n : 0 });
  }
  if (path === '/api/prefs' && method === 'POST') {
    const r = await byToken(body && body.token); if (!r) return json({ ok: false, error: '链接失效' }, 404);
    const cols = cleanCols(body.cols), deliverAt = ['close', 'morning'].includes(body.deliverAt) ? body.deliverAt : r.deliver_at, format = ['poster', 'text'].includes(body.format) ? body.format : r.format;
    await DB.prepare('UPDATE subscribers SET cols = ?, watch = ?, deliver_at = ?, format = ? WHERE id = ?').bind((cols.length ? cols : ['eve']).join(','), cleanWatch(body.watch).join(','), deliverAt, format, r.id).run();
    return json({ ok: true, ...pub(await byToken(r.token)) });
  }
  if (path === '/api/unsubscribe' && (method === 'GET' || method === 'POST')) {
    const tk = method === 'GET' ? url.searchParams.get('token') : body && body.token;
    const r = await byToken(tk); if (!r) return method === 'GET' ? redirect(`${site(env)}/unsubscribe?state=expired`) : json({ ok: false, error: '链接失效' }, 404);
    const keep = method === 'POST' ? cleanCols(body.keep) : [];
    if (keep.length) { await DB.prepare('UPDATE subscribers SET cols = ? WHERE id = ?').bind(keep.join(','), r.id).run(); return json({ ok: true, state: 'kept', cols: keep }); }
    await DB.prepare('UPDATE subscribers SET status = ?, unsub_at = ? WHERE id = ?').bind('unsubscribed', now(), r.id).run();
    return method === 'GET' ? redirect(`${site(env)}/unsubscribe?done=1&email=${encodeURIComponent(r.email)}`) : json({ ok: true, state: 'unsubscribed', email: r.email });
  }
  if (path === '/api/health') return json({ ok: true, t: now() });
  return json({ ok: false, error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env, url); }
      catch (e) { console.log('[api error] ' + (e && e.message)); return json({ ok: false, error: '服务器开小差了，稍后再试' }, 500); }
    }
    return env.ASSETS.fetch(request);
  },
};
