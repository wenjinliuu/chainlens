#!/usr/bin/env node
/*
 * 潮信 · 从 kzg-option-brief（期权日报 Worker）取数据，映射成潮信的静态 JSON（契约见 docs/m1-plan.md 第 4、5 节）
 *
 * 不在这里重算任何指标：数字全部来自 kzg 的判断 JSON（/report.json）和数据面（/brief.json），这里只换字段名、取整、挑前几条。
 * 规则（固定在代码里）：
 *   - picks：判断 JSON 里 group = ai、非 compact 的票，按可信度高 → 中、再按 max(量倍数, 权利金倍数) 排，取前 3
 *   - strong：picks 里排第一的那只
 *   - heat：数据面 segments 里属于海报六个环节的，按热度（成员量倍数中位数）降序
 *   - 没有判断 JSON 的日子（dataOnly）：情绪按全市场 CP 偏离 ±7% 分档，标题用固定模板，重点取数据面方向明确的前 3 只
 *
 * 用法：
 *   KZG_BASE=https://… KZG_KEY=… node pipeline/fetch-kzg.mjs --date 2026-10-30 [--out data/live]
 *   KZG_BASE=… KZG_KEY=… node pipeline/fetch-kzg.mjs --latest [--out data/live]       最新交易日（定时任务用）
 *   KZG_BASE=… KZG_KEY=… node pipeline/fetch-kzg.mjs --week 2026-10-27 [--out data/live]
 *   node pipeline/fetch-kzg.mjs --from report.json brief.json [--out …]     离线：用本地文件
 * 地址与密钥只从环境变量读，不进仓库。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEGS = ['光模块', 'GPU/加速器', 'AI服务器', '存储', '电力/散热', 'GPU/算力云'];   // 海报上的六个环节（名称与 kzg AI_CHAIN 一致）
const CONF = ['低', '中', '高'];
const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const md = s => `${+s.slice(5, 7)}月${+s.slice(8, 10)}日`;
const wd = s => WD[new Date(s + 'T12:00:00Z').getUTCDay()];
const r1 = (v, n = 1) => Number.isFinite(v) ? +v.toFixed(n) : null;
const fin = v => Number.isFinite(v);

// 公司名单（事件里的代码芯片用）：优先 data/samples/companies.json
let COMPANIES = [];
try { COMPANIES = JSON.parse(readFileSync(join(ROOT, 'data/samples/companies.json'), 'utf8')).companies || []; } catch {}
const chipsOf = text => COMPANIES.filter(c => text.includes(c.t) || (c.name && c.name.length >= 2 && text.includes(c.name))).map(c => c.t).slice(0, 3);

// ---------- 单只票的数据行 → 海报字段 ----------
function leapText(m) {
  if (!m || !fin(m.leapTrend)) return 'LEAP 持平';
  if (m.leapTrend >= .15) return `LEAP Call 占比上升`;
  if (m.leapTrend <= -.15) return `LEAP Put 占比上升`;
  return 'LEAP 持平';
}
function hotText(m) {
  const h = m && m.hot; if (!h) return '—';
  const exp = `${h.exp.slice(5, 7)}/${h.exp.slice(8, 10)}`;
  return `${h.side} ${h.strike} · ${h.dte > 180 ? `${h.exp.slice(2, 4)}/${exp}` : exp} 到期${h.dte > 180 ? ' · 远月' : ''}`;
}
function pickRow(p, m) {
  return { t: p.sym, seg: p.seg || (m && m.seg) || '—', dir: p.dir, conf: p.conf, rank: m && m.rank || null,
    vx: r1(m && m.volX) ?? 0, px: r1(m && m.premX) ?? 0, cp: r1(m && m.cpDev, 2) ?? 0, leap: leapText(m), why: p.why || '', hot: hotText(m), url: p.url || null };
}

// ---------- 期权日报：判断 JSON + 数据面 → daily/{date}.json ----------
export function mapDaily(report, brief) {
  const a = (report && report.data) || brief;
  if (!a || !a.market) throw new Error('缺少数据面（report.data 或 brief）');
  const date = (report && report.date) || a.date;
  const mkt = a.market;
  const all = [...(a.ai?.changed || []), ...(a.ai?.calm || []), ...(brief?.ai?.changed || []), ...(brief?.ai?.calm || [])];
  const bySym = {}; for (const m of all) if (!bySym[m.sym]) bySym[m.sym] = m;
  const dev = r1(mkt.cpDev, 2);
  // 环节热度
  const heat = (a.segments || []).filter(s => SEGS.includes(s.seg) && fin(s.heatX)).sort((x, y) => y.heatX - x.heatX)
    .map(s => [s.seg, r1(s.heatX), (s.syms || []).slice(0, 3).join(' '), r1(s.cpDev, 2) ?? 0]);
  // 分时：按最大量归一，13 根
  const it = mkt.intraday;
  const intra = it && it.vol ? it.vol.map((v, i) => [r1(v / Math.max(...it.vol), 2), r1(it.cp[i], 2) ?? 0]).slice(0, 13) : [];
  let mood, h2, t3, picks, watch, text = null, source = null, dataOnly = false;
  if (report && report.mood) {
    mood = report.mood; h2 = report.headline; t3 = report.summary;
    const ai = (report.picks || []).filter(p => p.group === 'ai' && !p.compact);
    ai.sort((x, y) => CONF.indexOf(y.conf) - CONF.indexOf(x.conf) || Math.max(bySym[y.sym]?.volX || 0, bySym[y.sym]?.premX || 0) - Math.max(bySym[x.sym]?.volX || 0, bySym[x.sym]?.premX || 0));
    picks = ai.slice(0, 3).map(p => pickRow(p, bySym[p.sym]));
    watch = (report.watch || []).map(w => w.sym).slice(0, 4);
    text = report.text ? report.text.replace(/\n\s*提醒[:：][^\n]*$/m, '').trim() : null;
    source = { savedAt: report.savedAt || null, rulesVersion: report.v || null, agent: report.agent || null };
  } else {
    // 只有数据面的日子
    dataOnly = true;
    mood = dev > .07 ? '偏乐观' : dev < -.07 ? '偏谨慎' : '中性';
    const lead = (a.ai?.changed || []).filter(m => ['偏多', '偏空'].includes(m.lean)).slice(0, 3);
    picks = lead.map(m => pickRow({ sym: m.sym, seg: m.seg, dir: m.lean, conf: m.baseConf || '中', why: `数据面：量 ${r1(m.volX)}x、CP 对比常态 ${Math.round((m.cpDev || 0) * 100)}%` }, m));
    watch = [];
    h2 = heat[0] ? `${heat[0][0]}${heat[0][3] >= 0 ? ' Call 集中放量' : ' Put 成交放大'}` : '仅数据面';
    t3 = `全市场 CP ${dev >= 0 ? '高于' : '低于'}常态 ${Math.round(Math.abs(dev) * 100)}%；当天没有判断报告，只展示数据面。`;
  }
  const strong = picks[0] ? { t: picks[0].t, seg: picks[0].seg, dir: picks[0].dir, conf: picks[0].conf, vx: picks[0].vx, px: picks[0].px } : null;
  const hot = heat[0] ? { seg: heat[0][0], heat: heat[0][1], ts: heat[0][2].split(' ').filter(Boolean) } : null;
  const events = ((report && report.events) || []).slice(0, 3).map(e => ({ text: e.text, src: e.source, url: e.url || null, chips: chipsOf(e.text || '') }));
  return { date, md: md(date), wd: wd(date), mood, cp: r1(mkt.cp, 2), base: r1(mkt.cpBase, 2), dev, h2, t3, strong, hot, hotDev: hot ? heat[0][3] : 0, events, picks, watch, heat, intra, text, source, dataOnly };
}

// ---------- 周报：weekly.json（素材）+ weekly-report.json（AI 写的文字）→ weekly/{mon}.json ----------
export function mapWeek(wk, rep) {
  const mon = wk.week, fri = wk.to, sun = addDays(mon, 6);
  const devs = (wk.cpLine || []).map(x => x.mkt).filter(fin);
  const avg = devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : 0;
  const dir = avg > .04 ? '偏多' : avg < -.04 ? '偏空' : '中性';
  const segs = (wk.rotation || []).filter(x => SEGS.includes(x.seg) && fin(x.heat)).sort((x, y) => y.heat - x.heat).map(x => ({ n: x.seg, heat: r1(x.heat), dev: fin(x.prev) && x.prev > 0 ? r1(x.heat / x.prev - 1, 2) : 0 }));
  const persist = (wk.persistent || []).slice(0, 3).map(x => ({ t: x.sym, dir: x.dir, n: x.n }));
  const strongest = wk.strongest ? { t: wk.strongest.sym, dir: wk.strongest.dir, n: wk.strongest.n } : null;
  // 最偏多 / 最偏空环节：按持续信号里各环节的方向票数（没有就取热度最高 / 最低）
  const segDir = {}; for (const d of wk.days || []) for (const p of d.report?.picks || []) if (p.seg) segDir[p.seg] = (segDir[p.seg] || 0) + (p.dir === '偏多' ? 1 : p.dir === '偏空' ? -1 : 0);
  const sd = Object.entries(segDir).sort((a, b) => b[1] - a[1]);
  const bullSeg = sd.length && sd[0][1] > 0 ? sd[0][0] : (segs[0] ? segs[0].n : '—'), bearSeg = sd.length && sd[sd.length - 1][1] < 0 ? sd[sd.length - 1][0] : (segs.length ? segs[segs.length - 1].n : '—');
  const chosen = new Set(((rep && rep.nextWeek) || []).map(x => x.id));
  const next = (wk.ahead || []).filter(x => !chosen.size || chosen.has(x.id)).slice(0, 4).map(x => ({ when: x.date ? wd(x.date) : x.kind, what: x.what }));
  const days = (wk.days || []).map(d => ({ date: d.date, mood: d.report?.mood || '中性', dev: r1(d.market?.cpDev, 2) ?? 0 }));
  return { mon, fri, sun, label: `${+mon.slice(5, 7)}月第 ${Math.ceil(+mon.slice(8, 10) / 7)} 周`, range: `${md(mon)} – ${md(fri)}`, dir, avg: r1(avg, 2), bullSeg, bearSeg, segs, strongest, persist, days, next,
    headline: rep?.headline || null, summary: rep?.summary || null, themes: rep?.themes || [] };
}
// ---------- 镇上数据：数据面 + 判断 JSON → town/{date}.json（契约见 docs/town-plan.md 第 4 节） ----------
// layerHeat 用数据面 layers（按层的 segmentStats）；公司当日量倍数用 ai.changed / calm 的 volX；涨跌用 px（{SYM: [[日期, 收盘价]…]}，可选）；
// 信号：进了判断 JSON 的 picks / watch 的票标 o；研报信号由研报 fetcher 另行合并
const WX = { '偏乐观': 'sunny', '中性': 'cloudy', '偏谨慎': 'rain' };
export function mapTown(daily, a, px) {
  const layerHeat = {}; for (const l of a.layers || []) if (fin(l.heatX)) layerHeat[l.layer || l.seg] = r1(l.heatX);
  const companies = {};
  for (const m of [...(a.ai?.changed || []), ...(a.ai?.calm || [])]) {
    let chg = null; const ser = px && px[m.sym]; if (Array.isArray(ser) && ser.length >= 2) { const [, c1] = ser[ser.length - 1], [, c0] = ser[ser.length - 2]; if (c0 > 0) chg = r1((c1 / c0 - 1) * 100, 2); }
    companies[m.sym] = { chg, vx: r1(m.volX), signals: [] };
  }
  const towers = {};
  for (const p of daily.picks || []) { towers[p.t] = { dir: p.dir, conf: p.conf, flag: true, lamp: p.conf === '高' }; if (companies[p.t]) companies[p.t].signals.push('o'); }
  for (const t of daily.watch || []) if (companies[t] && !companies[t].signals.includes('o')) companies[t].signals.push('o');
  return { date: daily.date, weather: WX[daily.mood] || 'cloudy', mood: daily.mood, segHeat: Object.fromEntries(daily.heat.map(h => [h[0], h[1]])), layerHeat, companies, towers,
    boards: daily.heat.map(h => ({ seg: h[0], t: h[2].split(' ')[0] })), bus: [], blimp: '' };
}
const addDays = (s, n) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + n)).toISOString().slice(0, 10);

// ---------- CLI ----------
async function main() {
  const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const out = resolve(ROOT, get('--out') || 'data/live');
  const GEN = new Date().toISOString(), DISC = '本站内容为公开信息整理，不构成任何投资建议。市场有风险，投资需谨慎。';
  const write = (f, o) => { mkdirSync(dirname(join(out, f)), { recursive: true }); writeFileSync(join(out, f), JSON.stringify({ v: 1, gen: GEN, disclaimer: DISC, ...o }, null, 2) + '\n'); console.log('写入', join(out, f)); };
  if (get('--from')) {
    const i = args.indexOf('--from'); const report = JSON.parse(readFileSync(resolve(args[i + 1]), 'utf8')); const brief = args[i + 2] && !args[i + 2].startsWith('--') ? JSON.parse(readFileSync(resolve(args[i + 2]), 'utf8')) : null;
    const d = mapDaily(report.mood ? report : null, brief || report); write(`daily/${d.date}.json`, d); write(`town/${d.date}.json`, mapTown(d, (report.mood ? report.data : null) || brief || report, null)); return;
  }
  const BASE = process.env.KZG_BASE, KEY = process.env.KZG_KEY;
  if (!BASE || !KEY) { console.error('需要环境变量 KZG_BASE、KZG_KEY（或用 --from 本地文件）'); process.exit(1); }
  const fetchJson = async (path, optional) => { const r = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(KEY)}`); if (!r.ok) { if (optional && r.status === 404) return null; throw new Error(`${path} → ${r.status}`); } return r.json(); };
  if (get('--date') || args.includes('--latest')) {
    const brief = get('--date') ? await fetchJson(`/brief.json?date=${get('--date')}`) : await fetchJson('/brief.json');
    const date = get('--date') || brief.date;
    const report = await fetchJson(`/report.json?date=${date}`, true);
    const d = mapDaily(report, brief); write(`daily/${date}.json`, d);
    const px = await fetchJson(`/px.json?syms=${encodeURIComponent(d.picks.map(p => p.t).join(','))}&days=2`, true);
    write(`town/${date}.json`, mapTown(d, (report && report.data) || brief, px));
  } else if (get('--week')) {
    const mon = get('--week');
    const wk = await fetchJson(`/weekly.json?week=${mon}`), rep = await fetchJson(`/weekly-report.json?week=${mon}`, true);
    write(`weekly/${mon}.json`, mapWeek(wk, rep));
  } else { console.error('用法见文件头'); process.exit(1); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
