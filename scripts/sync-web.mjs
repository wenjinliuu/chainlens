#!/usr/bin/env node
/*
 * 把设计稿（design/v4）同步成 Astro 站（web/）的输入：
 *   - design/v4/assets、design/v3 的 iso / data / brand、design/v2 的 indicators → web/public/assets（扁平）
 *   - data/samples → web/public/data
 *   - 每个页面：<head> 里的 css / <style> / importmap 抽出来，<body> 原样做路径改写，写成 web/src/partials/<页>.html，
 *     再生成 web/src/pages/<页>.astro（用 Base 布局 + set:html 注入）
 * M1 第 1 步的过渡做法：设计稿仍是唯一的源，改设计稿后跑一次 `pnpm sync` 即可；后续逐个模块迁进 src/lib 后，这里对应的页面就不再生成。
 * 用法：node scripts/sync-web.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..'), W = join(R, 'web');
for (const d of ['public/assets', 'public/data', 'src/layouts', 'src/pages', 'src/partials']) mkdirSync(join(W, d), { recursive: true });

// 静态资源
const v4 = join(R, 'design/v4/assets');
for (const f of readdirSync(v4)) copyFileSync(join(v4, f), join(W, 'public/assets', f));
for (const f of ['iso.js', 'data.js', 'brand.css']) copyFileSync(join(R, 'design/v3/assets', f), join(W, 'public/assets', f));
copyFileSync(join(R, 'design/v2/assets/indicators.js'), join(W, 'public/assets/indicators.js'));
if (existsSync(join(W, 'public/data'))) rmSync(join(W, 'public/data'), { recursive: true });
cpSync(join(R, 'data/samples'), join(W, 'public/data'), { recursive: true });

// 页面
const PAGES = {
  index: ['潮信 · AI 产业链情报 · 免费订阅', '潮信：盘前汇总、期权日报、研报日报、专栏报告，按 8 层 AI 产业链整理，每天准时送达。'],
  company: ['公司档案 · 潮信', ''], stock: ['看盘 · 潮信', ''],
  daily: ['日报归档 · 潮信', '潮信日报归档：按日历翻看过去的期权日报、研报日报、周报和专栏报告。'],
  column: ['专栏报告 · 潮信', ''], subscribe: ['订阅潮信 · 确认与偏好', ''], unsubscribe: ['退订潮信', ''],
  email: ['邮件模板 · 潮信', ''], 'logo-lab': ['Logo 候选 · 潮信', ''],
};
const rewrite = h => h.replace(/\.\.\/v3\/assets\//g, '/assets/').replace(/\.\.\/v2\/assets\//g, '/assets/').replace(/(href|src)="assets\//g, '$1="/assets/');
let n = 0;
for (const [name, [title, desc]] of Object.entries(PAGES)) {
  const s = readFileSync(join(R, 'design/v4', name + '.html'), 'utf8');
  const head = s.match(/<head>([\s\S]*?)<\/head>/)[1], body = s.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  const css = [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => rewrite(m[1]));
  const styles = (head.match(/<style>[\s\S]*?<\/style>/g) || []).join('');
  const importmap = head.includes('type="importmap"');
  writeFileSync(join(W, 'src/partials', name + '.html'), rewrite(styles + body));
  writeFileSync(join(W, 'src/pages', name + '.astro'), `---
// 自动从 design/v4/${name}.html 生成（scripts/sync-web.mjs）：正文原样注入，头部由 Base 统一管理
import Base from '../layouts/Base.astro';
import html from '../partials/${name}.html?raw';
---
<Base title=${JSON.stringify(title)} description=${JSON.stringify(desc)} css={${JSON.stringify(css)}} importmap={${importmap}}>
  <Fragment set:html={html} />
</Base>
`);
  n++;
}
console.log(`同步完成：${n} 个页面，资源 ${readdirSync(join(W, 'public/assets')).length} 个文件`);
