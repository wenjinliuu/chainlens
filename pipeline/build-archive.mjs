#!/usr/bin/env node
/*
 * 潮信 · 汇总静态 JSON（M1 契约见 docs/m1-plan.md 第 4 节）
 * 输入：一个数据目录（默认 data/samples），里面按文件放每天的期权日报、研报日报、每周周报、每篇专栏：
 *   daily/YYYY-MM-DD.json  rr/YYYY-MM-DD.json  weekly/<周一>.json  columns/<id>.json  companies.json
 * 输出（写回同一目录）：
 *   archive.json        前端一次性读取的汇总包：{ days[], rr{}, weeks[], columns[] }（去掉每个文件的 v / gen / disclaimer 壳）
 *   daily/index.json    日历用的索引
 *   search-index.json   ⌘K 用的索引
 *   meta.json           最新日期
 * M2 接真实数据时，fetch-kzg / fetch-reports 只负责往目录里放单日文件，再跑这一步即可。
 * 用法：node pipeline/build-archive.mjs [目录]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(ROOT, process.argv[2] || 'data/samples');
const readDir = sub => existsSync(join(DIR, sub)) ? readdirSync(join(DIR, sub)).filter(f => f.endsWith('.json') && f !== 'index.json').sort() : [];
const load = (sub, f) => { const { v, gen, disclaimer, ...rest } = JSON.parse(readFileSync(join(DIR, sub, f), 'utf8')); return rest; };
const GEN = new Date().toISOString();
const DISC = '本站内容为公开信息整理，不构成任何投资建议。市场有风险，投资需谨慎。';
const wrap = o => ({ v: 1, gen: GEN, disclaimer: DISC, ...o });
const write = (f, o) => { mkdirSync(dirname(join(DIR, f)), { recursive: true }); writeFileSync(join(DIR, f), JSON.stringify(o) + '\n'); };

const days = readDir('daily').map(f => load('daily', f)).sort((a, b) => a.date < b.date ? -1 : 1);
const rr = Object.fromEntries(readDir('rr').map(f => { const R = load('rr', f); return [R.date, R]; }));
const weeks = readDir('weekly').map(f => load('weekly', f)).sort((a, b) => a.mon < b.mon ? -1 : 1);
const columns = readDir('columns').map(f => load('columns', f)).sort((a, b) => a.date < b.date ? 1 : -1);
const companies = existsSync(join(DIR, 'companies.json')) ? load('.', 'companies.json') : { layers: [], companies: [] };
if (!days.length) { console.error('没有找到 daily/*.json'); process.exit(1); }

// 校验：每天的 picks 方向、可信度只能是枚举值；数字字段是数字
const DIRS = ['偏多', '偏空'], CONFS = ['低', '中', '高'], MOODS = ['偏乐观', '中性', '偏谨慎'];
const errors = [];
for (const d of days) {
  if (!MOODS.includes(d.mood)) errors.push(`${d.date} mood=${d.mood}`);
  for (const p of d.picks || []) { if (!DIRS.includes(p.dir)) errors.push(`${d.date} ${p.t} dir=${p.dir}`); if (!CONFS.includes(p.conf)) errors.push(`${d.date} ${p.t} conf=${p.conf}`); for (const k of ['vx', 'px', 'cp']) if (typeof p[k] !== 'number') errors.push(`${d.date} ${p.t} ${k} 不是数字`); }
  if (typeof d.cp !== 'number' || typeof d.dev !== 'number') errors.push(`${d.date} cp/dev 不是数字`);
}
if (errors.length) { console.error('校验失败：\n' + errors.join('\n')); process.exit(1); }

const weekOf = date => weeks.find(w => date >= w.mon && date <= w.sun);
write('archive.json', wrap({ days, rr, weeks, columns }));
write('daily/index.json', wrap({ days: days.map(d => ({ date: d.date, wd: d.wd, mood: d.mood, h2: d.h2, hasRR: !!rr[d.date], weekMon: (weekOf(d.date) || {}).mon || null, dataOnly: !!d.dataOnly, hasColumn: columns.some(c => c.date === d.date) })) }));
const layerName = Object.fromEntries((companies.layers || []).map(l => [l.id, l.name]));
write('search-index.json', wrap({ items: [
  ...(companies.companies || []).map(c => ({ g: '公司', t: c.t, sub: `${c.name} · ${layerName[c.layer] || c.layer} / ${c.seg}`, href: `/company.html?t=${c.t}` })),
  ...(companies.layers || []).map((l, i) => ({ g: '产业镇', t: `${l.name}街区`, sub: `第 ${i + 1} 层`, href: `/index.html#island?station=${l.id}` })),
  ...columns.map(c => ({ g: '专栏报告', t: c.title, sub: `${c.kind} · ${c.date}`, href: `/column.html?id=${c.id}` })),
  ...days.slice().reverse().map(d => ({ g: '期权日报归档', t: `${d.md} ${d.wd}`, sub: `大盘${d.mood} · ${d.h2}`, href: `/daily.html?col=eve&d=${d.date}` })),
] }));
// 镇上数据：最新一份复制成 town/latest.json（前端固定读这个名字）
const towns = readDir('town').filter(f => f !== 'latest.json');
if (towns.length) { const t = load('town', towns[towns.length - 1]); if (!['sunny', 'cloudy', 'rain'].includes(t.weather)) { console.error(`town weather=${t.weather} 不是 sunny / cloudy / rain`); process.exit(1); } write('town/latest.json', wrap(t)); }
const last = days[days.length - 1];
write('meta.json', wrap({ latest: last.date, latestRR: Object.keys(rr).sort().pop() || null, latestWeek: weeks.length ? weeks[weeks.length - 1].mon : null, latestColumn: columns[0] ? columns[0].date : null, delay: '期权数据为收盘后汇总；行情为延迟数据', rulesVersion: last.source ? last.source.rulesVersion : null }));
const kb = f => (readFileSync(join(DIR, f)).length / 1024).toFixed(0);
console.log(`archive.json ${kb('archive.json')} KB（${days.length} 天、${Object.keys(rr).length} 份研报日报、${weeks.length} 周、${columns.length} 篇专栏）；daily/index.json、search-index.json、meta.json 已更新`);
