#!/usr/bin/env node
// 离线测试：几张按导出约定拼的研报卡片 → 研报日报 JSON 的 act / rating / 统计是否正确；用法 node pipeline/test-build-rr.mjs
import { buildRR } from './build-rr.mjs';
const cards = [
  { ticker: 'NVDA', firm: '机构 A', date: '2026-10-30', ratingOld: 'Equal-weight', ratingNew: 'Overweight', targetOld: 145, targetNew: 165, points: ['数据中心收入占比继续提升', '新平台量产节奏早于此前披露', '毛利率假设上调 1 个百分点', '第四条会被丢掉'], source: '机构公开报告' },
  { ticker: 'MU', firm: '机构 B', date: '2026-10-30', ratingOld: '增持', ratingNew: '增持', targetOld: 135, targetNew: 160, points: ['HBM 产能扩建进度加快'] },
  { ticker: 'ANET', firm: '机构 C', date: '2026-10-30', ratingOld: 'Buy', ratingNew: 'Hold', targetOld: 140, targetNew: 128, points: ['估值已反映多数预期'] },
  { ticker: 'CRWV', firm: '机构 D', date: '2026-10-30', ratingNew: 'Outperform', targetNew: 120, points: ['这一条要点特别长' + '，'.repeat(40) + '超过四十字会被截断'] },
  { ticker: 'TSM', firm: '机构 E', date: '2026-10-30', ratingOld: 'Buy', ratingNew: 'Buy', targetOld: 280, targetNew: 280, points: [] },
  { ticker: 'ZZZZ', firm: '机构 F', date: '2026-10-30', ratingNew: 'Buy', targetNew: 10, points: ['不在名单内，应被丢弃'] },
  { ticker: 'AMD', firm: '机构 G', date: '2026-10-29', ratingOld: 'Hold', ratingNew: 'Hold', targetOld: 170, targetNew: 160, points: ['只动目标价'] },
];
const allowed = new Set(['NVDA', 'MU', 'ANET', 'CRWV', 'TSM', 'AMD']);
const rr = buildRR(cards, allowed), R = rr['2026-10-30'], by = Object.fromEntries(R.items.map(i => [i.t, i]));
const checks = [
  ['两天', Object.keys(rr).length === 2], ['名单外丢弃', !by.ZZZZ && R.total === 5], ['统计', R.up === 3 && R.down === 1 && R.keep === 1],
  ['评级上调 + 英文别名', by.NVDA.act === '上调评级' && by.NVDA.rating === '中性 → 增持' && by.NVDA.from === 145 && by.NVDA.to === 165],
  ['要点最多 3 条', by.NVDA.pts.length === 3], ['只动目标价', by.MU.act === '上调目标价' && by.MU.rating === '维持 增持'],
  ['评级下调', by.ANET.act === '下调评级' && by.ANET.rating === '买入 → 持有'], ['首次覆盖', by.CRWV.act === '首次覆盖' && by.CRWV.from === 120 && by.CRWV.to === 120],
  ['要点截断 40 字', by.CRWV.pts[0].length === 40 && by.CRWV.pts[0].endsWith('…')], ['维持', by.TSM.act === '维持' && by.TSM.pts.length === 0],
  ['调整的排前面', R.items[R.items.length - 1].t === 'TSM'], ['另一天目标价下调', rr['2026-10-29'].items[0].act === '下调目标价' && rr['2026-10-29'].down === 1],
];
let bad = 0; for (const [n, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${n}`); if (!ok) bad++; }
process.exit(bad ? 1 : 0);
