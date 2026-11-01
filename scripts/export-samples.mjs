#!/usr/bin/env node
/*
 * 把设计稿里的虚构归档数据（design/v4/assets/archive.js）导出成 M1 契约格式的示例 JSON，写到 data/samples/。
 * 契约见 docs/m1-plan.md 第 4 节。按文件导出全部交易日；汇总文件由 pipeline/build-archive.mjs 生成。
 * 用法：node scripts/export-samples.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const V4 = 'design/v4/assets', V3 = 'design/v3/assets', OUT = 'data/samples';
const ctx = { window: {}, console }; ctx.window.window = ctx.window; vm.createContext(ctx);
const run = f => vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
run(join(V3, 'iso.js')); run(join(V3, 'data.js')); vm.runInContext('ISO = window.ISO; CL = window.CL;', ctx);
run(join(V4, 'poster.js')); vm.runInContext('POSTER = window.POSTER;', ctx);
run(join(V4, 'archive.js'));
const { CL, ARCHIVE: A } = ctx.window;

const GEN = new Date().toISOString();
const DISC = '本站内容为公开信息整理，不构成任何投资建议。市场有风险，投资需谨慎。示例数据均为虚构。';
const wrap = o => ({ v: 1, gen: GEN, disclaimer: DISC, ...o });
const write = (p, o) => { mkdirSync(join(OUT, p, '..'), { recursive: true }); writeFileSync(join(OUT, p), JSON.stringify(o, null, 2) + '\n'); console.log('写入', join(OUT, p)); };
const strip = html => html.replace(/<li>/g, '\n- ').replace(/<br\s*\/?>/g, '\n').replace(/<\/p>|<\/ol>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const last = A.DATES[A.DATES.length - 1], lastWeek = A.weeks[A.weeks.length - 1];
write('meta.json', wrap({ latest: last, latestRR: last, latestWeek: lastWeek.mon, delay: '期权数据为收盘后汇总；行情为延迟数据', rulesVersion: 'sample' }));
// 每个交易日：期权日报 + 研报日报（各一个文件；汇总 archive.json / daily/index.json 由 pipeline/build-archive.mjs 生成）
for (const date of A.DATES) {
  const d = A.byDate[date];
  write(`daily/${date}.json`, wrap({ ...d, text: strip(A.text(date)), source: { savedAt: GEN, rulesVersion: 'sample', agent: 'sample' } }));
  const R = A.rr(date);
  write(`rr/${date}.json`, wrap({ date, total: R.total, up: R.up, down: R.down, keep: R.keep, items: R.items.map(i => ({ t: i.t, firm: i.firm, act: i.act, rating: i.rating, from: i.from, to: i.to, pts: i.pts.slice(0, 3), src: '机构公开报告（示例）', ai: true })) }));
}
for (const w of A.weeks) write(`weekly/${w.mon}.json`, wrap({ mon: w.mon, fri: w.fri, sun: w.sun, label: w.label, range: w.range, dir: w.dir, avg: w.avg, bullSeg: w.bullSeg, bearSeg: w.bearSeg, segs: w.segs, strongest: w.strongest, persist: w.persist, days: w.days.map(d => ({ date: d.date, mood: d.mood, dev: d.dev })), next: w.next.map(([when, what]) => ({ when, what })), headline: null, summary: null, themes: [] }));
for (const c of A.columns) write(`columns/${c.id}.json`, wrap({ ...c, ai: true }));
// 镇上的自动更新数据（town-plan.md 第 4 节）：天气、环节热度、楼的信号、广告牌、巴士与飞艇文字
const WXOF = { '偏乐观': 'sunny', '中性': 'cloudy', '偏谨慎': 'rain' };
for (const date of [last]) {
  const d = A.byDate[date], wk = A.weekOf(date), R = A.rr(date);
  const towers = {};
  d.picks.forEach(p => { towers[p.t] = { dir: p.dir, conf: p.conf, flag: true, lamp: p.conf === '高' }; });
  R.items.forEach(i => { towers[i.t] = Object.assign(towers[i.t] || {}, { target: i.to > i.from ? 'up' : i.to < i.from ? 'down' : 'flat' }); });
  write(`town/${date}.json`, wrap({ date, weather: WXOF[d.mood], mood: d.mood,
    segHeat: Object.fromEntries(d.heat.map(h => [h[0], h[1]])), towers,
    boards: d.heat.map(h => ({ seg: h[0], t: h[2].split(' ')[0] })),
    bus: wk.segs.slice(0, 3).map(x => x.n), blimp: `本周${wk.dir} · 环节轮动 ${wk.segs.slice(0, 3).map(x => x.n).join(' → ')}`,
    unlisted: CL.unlisted.map(u => ({ t: u.t, name: u.name, layer: u.layer, seg: u.seg })) }));
}
write('companies.json', wrap({ layers: CL.layers.map(l => ({ id: l.id, name: l.name, color: l.color, segs: l.segs })), companies: CL.companies.map(c => ({ t: c.t, name: c.name, cap: c.cap, layer: c.layer, seg: c.seg })) }));
