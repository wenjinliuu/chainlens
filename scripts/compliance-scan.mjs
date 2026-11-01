#!/usr/bin/env node
/*
 * 文案合规扫描（docs/compliance.md 第 3 节的自检清单，机器能查的那部分）
 * 用法：node scripts/compliance-scan.mjs [目录或文件…]   默认扫 design/v4、data/samples（面向用户的内容）
 * 命中指令性 / 收益承诺措辞即失败；免责声明里的"投资建议""不荐股"等固定搭配除外。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // 从任何目录运行都按仓库根算

const WORDS = /推荐|买入|卖出|看涨|看跌|机会|抄底|稳赚|翻倍|目标位|超买|超卖|建议|荐股|必涨|必跌|牛股|躺赚/g;
const ALLOW = /投资建议|买卖建议|不荐股|不会推荐|不构成.{0,6}建议|不做.{0,4}建议|推荐买入|不给出买入|推荐 \/ 买入|买入 \/ 卖出|买入 \/ 持有 \/ 卖出|买入\s*\/\s*持有|买入\/卖出|不是投资建议/;
const EXT = new Set(['.html', '.js', '.mjs', '.ts', '.astro', '.json', '.md', '.txt', '.css']);
const SKIP = /node_modules|\/\.git\/|design\/v[12]\/|preview\/|compliance-scan\.mjs$|compliance\.md$/;

function* files(p) {
  const st = statSync(p);
  if (st.isDirectory()) { for (const f of readdirSync(p)) yield* files(join(p, f)); }
  else if (EXT.has(extname(p)) && !SKIP.test(p)) yield p;
}
// 默认只扫面向用户的内容（设计稿页面、示例数据）；内部文档可以手动传 docs 扫
const targets = (process.argv.slice(2).length ? process.argv.slice(2) : ['design/v4', 'data/samples']).map(t => resolve(ROOT, t));
let hits = 0, n = 0;
for (const t of targets) for (const f of files(t)) {
  n++;
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    const ms = l.match(WORDS); if (!ms) return;
    // 逐个命中看它周围 12 个字是否属于允许的固定搭配
    for (const m of new Set(ms)) {
      let idx = -1, bad = false;
      while ((idx = l.indexOf(m, idx + 1)) >= 0) { const ctx = l.slice(Math.max(0, idx - 12), idx + m.length + 12); if (!ALLOW.test(ctx)) { bad = true; break; } }
      if (bad) { hits++; console.log(`${f}:${i + 1}  「${m}」  ${l.trim().slice(0, 110)}`); }
    }
  });
}
console.log(hits ? `\n✗ ${hits} 处可能违反合规措辞（共扫 ${n} 个文件）` : `✓ 合规扫描通过（共扫 ${n} 个文件）`);
process.exit(hits ? 1 : 0);
