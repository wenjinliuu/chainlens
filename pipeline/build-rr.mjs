#!/usr/bin/env node
/*
 * 潮信 · 研报卡片 → 研报日报 JSON（契约见 docs/m1-plan.md 第 4.4、6 节）
 * 输入：研报卡片文件（JSON 数组，或每行一个 JSON 对象的 .jsonl），字段按 ima-knowledge-mcp 的导出约定：
 *   { ticker, firm, date, ratingOld, ratingNew, targetOld, targetNew, currency, points[], source, url? }
 *   拿不到的字段留空即可；导出格式定下来后只改下面的 norm()
 * 规则（固定）：
 *   - act：评级变了 → 上调 / 下调评级（按评级档位顺序）；只动目标价 → 上调 / 下调目标价；没有旧值 → 首次覆盖；都没变 → 维持
 *   - pts 最多 3 条，每条超过 40 字截断；研报原文、PDF 链接一律不进 JSON（合规）
 *   - 不在公司名单（companies.json）里的票先丢弃
 * 用法：node pipeline/build-rr.mjs <卡片文件> [--out data/live]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RANK = ['卖出', '减持', '中性', '持有', '增持', '买入', '强烈推荐'];   // 评级档位（只用来比高低，不出现在页面上）
const RATING_ALIAS = { 'sell': '卖出', 'underweight': '减持', 'underperform': '减持', 'neutral': '中性', 'hold': '持有', 'equal-weight': '中性', 'market perform': '中性', 'overweight': '增持', 'outperform': '增持', 'buy': '买入', 'strong buy': '强烈推荐', '跑赢大盘': '增持', '跑输大盘': '减持', '优于大市': '增持', '弱于大市': '减持', '推荐': '增持', '强推': '强烈推荐' };
const rating = s => { if (!s) return ''; const k = String(s).trim(); return RATING_ALIAS[k.toLowerCase()] || k; };
const rankOf = s => RANK.indexOf(s);
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

export function norm(card) {
  return { t: String(card.ticker || card.sym || '').toUpperCase(), firm: card.firm || card.broker || '机构', date: (card.date || '').slice(0, 10),
    r0: rating(card.ratingOld), r1: rating(card.ratingNew || card.rating), p0: Number(card.targetOld) || null, p1: Number(card.targetNew || card.target) || null,
    pts: (card.points || card.pts || []).map(x => clip(x, 40)).filter(Boolean).slice(0, 3), src: card.source || '机构公开报告', url: card.url || null };
}
export function actOf(c) {
  if (!c.r0 && !c.p0) return ['首次覆盖', `首次覆盖 · ${c.r1 || '—'}`, c.p1 && c.p0 ? Math.sign(c.p1 - c.p0) : 1];
  if (c.r0 && c.r1 && c.r0 !== c.r1 && rankOf(c.r0) >= 0 && rankOf(c.r1) >= 0) { const up = rankOf(c.r1) > rankOf(c.r0); return [up ? '上调评级' : '下调评级', `${c.r0} → ${c.r1}`, up ? 1 : -1]; }
  if (c.p0 && c.p1 && c.p1 !== c.p0) { const up = c.p1 > c.p0; return [up ? '上调目标价' : '下调目标价', `维持 ${c.r1 || c.r0 || '—'}`, up ? 1 : -1]; }
  return ['维持', `维持 ${c.r1 || c.r0 || '—'}`, 0];
}
export function buildRR(cards, allowed) {
  const byDate = {};
  for (const raw of cards) {
    const c = norm(raw); if (!c.t || !c.date) continue; if (allowed && !allowed.has(c.t)) continue;
    const [act, rt, sign] = actOf(c);
    (byDate[c.date] ||= []).push({ t: c.t, firm: c.firm, act, rating: rt, from: c.p0 ?? c.p1, to: c.p1 ?? c.p0, pts: c.pts, src: c.src, url: c.url, ai: false, _sign: sign });
  }
  return Object.fromEntries(Object.entries(byDate).map(([date, items]) => {
    items.sort((a, b) => Math.abs(b._sign) - Math.abs(a._sign));
    const up = items.filter(i => i._sign > 0).length, down = items.filter(i => i._sign < 0).length;
    return [date, { date, total: items.length, up, down, keep: items.length - up - down, items: items.map(({ _sign, ...i }) => i) }];
  }));
}

async function main() {
  const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--')), oi = args.indexOf('--out');
  if (!file) { console.error('用法：node pipeline/build-rr.mjs <卡片文件> [--out data/live]'); process.exit(1); }
  const raw = readFileSync(resolve(file), 'utf8');
  const cards = file.endsWith('.jsonl') ? raw.split('\n').filter(Boolean).map(l => JSON.parse(l)) : JSON.parse(raw);
  const out = resolve(ROOT, oi >= 0 ? args[oi + 1] : 'data/live');
  const compFile = [join(out, 'companies.json'), join(ROOT, 'data/samples/companies.json')].find(existsSync);
  const allowed = compFile ? new Set(JSON.parse(readFileSync(compFile, 'utf8')).companies.map(c => c.t)) : null;
  const GEN = new Date().toISOString(), DISC = '本站内容为公开信息整理，不构成任何投资建议。市场有风险，投资需谨慎。';
  const rr = buildRR(cards, allowed);
  mkdirSync(join(out, 'rr'), { recursive: true });
  for (const [date, R] of Object.entries(rr)) { writeFileSync(join(out, 'rr', `${date}.json`), JSON.stringify({ v: 1, gen: GEN, disclaimer: DISC, ...R }, null, 2) + '\n'); console.log(`写入 rr/${date}.json（${R.items.length} 条，上调 ${R.up} 下调 ${R.down}）`); }
  if (!Object.keys(rr).length) console.log('没有可用的卡片（代码不在名单内或缺日期）');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
