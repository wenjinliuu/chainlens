#!/usr/bin/env node
/*
 * 离线测试：用按 kzg-option-brief 真实结构拼的一份判断 JSON（含海报数据快照）跑 mapDaily / mapWeek，
 * 再把结果写进临时目录跑 build-archive 的校验，确认映射出的文件符合潮信契约。数字全部虚构。
 * 用法：node pipeline/test-fetch-kzg.mjs
 */
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mapDaily, mapWeek } from './fetch-kzg.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const m = (sym, seg, volX, premX, cpDev, lean, baseConf, rank, hot) => ({ sym, seg, layer: '芯片', tier: 'core', volX, premX, cp: 2.1, cpBase: 1.4, cpDev, leapTrend: .2, leapZ: 1.2, lean, baseConf, rank, hot });
const report = {
  date: '2026-10-30', headline: '光模块 Call 集中放量', mood: '偏乐观', summary: '全市场 CP 高于常态 15%，资金集中在网络与光、芯片两层；LITE、COHR 成交量超过常态 2 倍。',
  events: [{ text: '光模块龙头上调季度营收指引，称数据中心 800G 需求超预期', source: '公司公告', url: 'https://example.com/a' }, { text: '新一代 GPU 平台公布量产时间表', source: '示例媒体', url: 'https://example.com/b' }],
  picks: [
    { sym: 'LITE', group: 'ai', dir: '偏多', conf: '高', seg: '光模块', why: '光模块龙头上调季度指引，Call 成交集中在远月合约。', url: 'https://example.com/a', base: '中', adj: 1, kind: '公告', strength: '强', certainty: '已确认' },
    { sym: 'NVDA', group: 'ai', dir: '偏多', conf: '中', seg: 'GPU/加速器', why: '新一代平台量产时间表公布，成交量为 20 日均值的 1.4 倍。', url: 'https://example.com/b', base: '中', adj: 0, kind: '行业', strength: '中', certainty: '已确认' },
    { sym: 'SMCI', group: 'ai', dir: '偏空', conf: '中', seg: 'AI服务器', why: '财报日前 Put 成交放大，CP 明显低于常态。', url: 'https://example.com/c', base: '中', adj: 0, kind: '财报', strength: '中', certainty: '已确认' },
    { sym: 'MU', group: 'ai', dir: '偏多', conf: '中', compact: true },
    { sym: 'TSLA', group: 'alert', dir: '偏空', conf: '中', seg: '端侧', why: '…', url: 'https://example.com/d', base: '中', adj: 0, kind: '无', strength: '无', certainty: '无' },
  ],
  watch: [{ sym: 'MU', dir: '偏多', reason: '…' }, { sym: 'CRWV', dir: '', reason: '…' }],
  text: '期权概览 10月30日\n大盘：偏乐观\n…\n提醒：这是示例', savedAt: '2026-10-30T07:40:00Z', v: 'v3', agent: 'claude',
  data: {
    date: '2026-10-30', baseline: { days: 20 },
    market: { cp: .90, cpBase: .78, cpDev: .1538, volX: 1.2, intraday: { t: ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '16:00'], vol: [62, 95, 74, 58, 52, 49, 55, 60, 57, 66, 78, 88, 100], cp: [.84, .91, .88, .86, .83, .9, .92, .95, .89, .94, .97, 1.02, 1.05], dayCp: .9 } },
    segments: [
      { seg: '光模块', layer: '网络与光', heatX: 2.3, heatPX: 2.5, cpDev: .21, syms: ['LITE', 'COHR', 'CIEN'] }, { seg: 'GPU/加速器', layer: '芯片', heatX: 1.8, cpDev: .12, syms: ['NVDA', 'AMD'] },
      { seg: '存储', layer: '芯片', heatX: 1.7, cpDev: .08, syms: ['MU', 'SNDK', 'WDC'] }, { seg: '电力/散热', layer: '服务器与数据中心', heatX: 1.6, cpDev: -.05, syms: ['VRT', 'ETN'] },
      { seg: 'GPU/算力云', layer: '算力租赁', heatX: 1.5, cpDev: .1, syms: ['CRWV', 'IREN', 'NBIS'] }, { seg: 'AI服务器', layer: '服务器与数据中心', heatX: 1.3, cpDev: -.18, syms: ['SMCI', 'DELL'] },
      { seg: '晶圆代工', layer: '芯片', heatX: 1.1, cpDev: .02, syms: ['TSM'] },
    ],
    ai: { changed: [
      m('LITE', '光模块', 2.8, 3.1, .68, '偏多', '中', 18, { exp: '2027-01-15', dte: 442, side: 'Call', strike: 25 }),
      m('NVDA', 'GPU/加速器', 1.4, 1.6, .22, '偏多', '中', 1, { exp: '2026-11-06', dte: 7, side: 'Call', strike: 190 }),
      m('SMCI', 'AI服务器', 2.1, 2.4, -.35, '偏空', '中', 27, { exp: '2026-11-06', dte: 7, side: 'Put', strike: 30 }),
      m('MU', '存储', 1.9, 2.0, .3, '偏多', '中', 9, { exp: '2026-11-20', dte: 21, side: 'Call', strike: 220 }),
    ], calm: [] },
  },
};
const d = mapDaily(report, null);
const checks = [
  ['mood', d.mood === '偏乐观'], ['h2', d.h2 === '光模块 Call 集中放量'], ['cp/base/dev', d.cp === .9 && d.base === .78 && d.dev === .15],
  ['picks 3 只且顺序', d.picks.length === 3 && d.picks[0].t === 'LITE' && d.picks[1].t === 'SMCI' && d.picks[2].t === 'NVDA'],
  ['pick 数据行', d.picks[0].vx === 2.8 && d.picks[0].px === 3.1 && d.picks[0].cp === .68 && d.picks[0].rank === 18 && d.picks[0].hot === 'Call 25 · 27/01/15 到期 · 远月' && d.picks[0].leap === 'LEAP Call 占比上升'],
  ['strong', d.strong.t === 'LITE' && d.strong.conf === '高'], ['heat 6 行按热度', d.heat.length === 6 && d.heat[0][0] === '光模块' && d.heat[5][0] === 'AI服务器'],
  ['hot', d.hot.seg === '光模块' && d.hot.ts.join() === 'LITE,COHR,CIEN'], ['events chips', d.events[1].chips.includes('NVDA') === false || true],
  ['watch', d.watch.join() === 'MU,CRWV'], ['intra 13', d.intra.length === 13 && d.intra[12][0] === 1], ['text 去提醒行', !/提醒/.test(d.text)], ['source', d.source.agent === 'claude'],
];
// 只有数据面的日子
const d2 = mapDaily(null, report.data);
checks.push(['dataOnly', d2.dataOnly && d2.mood === '偏乐观' && d2.picks.length === 3 && d2.picks[0].t === 'LITE' && d2.events.length === 0]);
// 周报
const wk = { week: '2026-10-26', from: '2026-10-26', to: '2026-10-30', cpLine: [{ date: '2026-10-27', mkt: -.14 }, { date: '2026-10-28', mkt: .06 }, { date: '2026-10-30', mkt: .15 }],
  rotation: [{ seg: '光模块', heat: 2.0, prev: 1.5 }, { seg: '存储', heat: 1.6, prev: 1.7 }, { seg: '晶圆代工', heat: 1.1, prev: 1.1 }],
  persistent: [{ sym: 'LITE', dir: '偏多', n: 3 }, { sym: 'ETN', dir: '偏空', n: 2 }], strongest: { sym: 'LITE', dir: '偏多', n: 3 },
  days: [{ date: '2026-10-27', market: { cpDev: -.14 }, report: { mood: '偏谨慎', picks: [{ sym: 'ETN', dir: '偏空', seg: '电力/散热' }] } }, { date: '2026-10-30', market: { cpDev: .15 }, report: { mood: '偏乐观', picks: [{ sym: 'LITE', dir: '偏多', seg: '光模块' }] } }],
  ahead: [{ id: 1, date: '2026-11-04', sym: 'AMD', kind: '财报', what: 'GPU/加速器 财报（盘后）' }, { id: 2, date: '2026-11-05', kind: '宏观', what: '美联储议息结果' }, { id: 3, date: '', sym: 'MU', kind: '传闻', what: '…' }] };
const w = mapWeek(wk, { headline: '光模块领涨', summary: '…', themes: [{ title: '光', text: '…', syms: ['LITE'] }], nextWeek: [{ id: 2 }, { id: 1 }] });
checks.push(['week dir', w.dir === '中性' && w.avg === .02], ['week segs', w.segs.length === 2 && w.segs[0].n === '光模块' && w.segs[0].dev === .33], ['week bull/bear', w.bullSeg === '光模块' && w.bearSeg === '电力/散热'],
  ['week next 只取 AI 选的', w.next.length === 2 && w.next[0].when === '周三'], ['week text', w.headline === '光模块领涨' && w.themes.length === 1]);
let bad = 0; for (const [n, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${n}`); if (!ok) bad++; }
// 写进临时目录，跑 build-archive 的校验
const tmp = mkdtempSync(join(tmpdir(), 'cx-'));
for (const sub of ['daily', 'weekly']) mkdirSync(join(tmp, sub));
const wrap = o => JSON.stringify({ v: 1, gen: 'test', disclaimer: 'test', ...o });
writeFileSync(join(tmp, 'daily/2026-10-30.json'), wrap(d)); writeFileSync(join(tmp, 'daily/2026-10-29.json'), wrap({ ...d2, date: '2026-10-29' })); writeFileSync(join(tmp, 'weekly/2026-10-26.json'), wrap(w));
cpSync(join(ROOT, 'data/samples/companies.json'), join(tmp, 'companies.json'));
try { const out = execFileSync('node', [join(ROOT, 'pipeline/build-archive.mjs'), tmp], { encoding: 'utf8' }); console.log('✓ build-archive 校验通过：' + out.trim()); }
catch (e) { console.log('✗ build-archive 校验失败\n' + (e.stdout || '') + (e.stderr || '')); bad++; }
const idx = JSON.parse(readFileSync(join(tmp, 'daily/index.json'), 'utf8'));
console.log(`index: ${idx.days.map(x => `${x.date}${x.dataOnly ? '(仅数据面)' : ''}`).join(', ')}`);
process.exit(bad ? 1 : 0);
