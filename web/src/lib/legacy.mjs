/*
 * 构建期（Node）里跑设计稿的脚本：iso.js / data.js / poster.js / archive.js 都是写给浏览器的全局脚本，
 * 这里用 vm 起一个假 window 把它们跑起来，拿到 renderPoster() 和 ARCHIVE 的渲染函数，给 Astro 页面在构建时直接出 HTML。
 * 过渡用法：等这些模块迁成 ES module 后删掉这个文件。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// 构建时这个文件会被打包进 dist/.prerender，import.meta.url 不再指向 src，所以从工作目录往上找 astro.config.mjs 定位 web/
const WEB = (() => { let d = process.cwd(); for (let i = 0; i < 5; i++) { if (existsSync(join(d, 'astro.config.mjs'))) return d; d = dirname(d); } return resolve(dirname(fileURLToPath(import.meta.url)), '../..'); })();
const ASSETS = join(WEB, 'public/assets');
let cached = null;
export function legacy() {
  if (cached) return cached;
  const ctx = { window: {}, console, document: { createElement: () => ({ getContext: () => null }) } };
  ctx.window.window = ctx.window; vm.createContext(ctx);
  const run = f => vm.runInContext(readFileSync(join(ASSETS, f), 'utf8'), ctx, { filename: f });
  run('iso.js'); run('data.js'); vm.runInContext('ISO = window.ISO; CL = window.CL;', ctx);
  run('poster.js'); vm.runInContext('POSTER = window.POSTER;', ctx);
  run('archive.js');   // Node 里没有 location，走内置生成器；下面再用 archive.json 覆盖
  const A = ctx.window.ARCHIVE;
  const file = join(WEB, 'public/data/archive.json');
  if (existsSync(file)) A.load(JSON.parse(readFileSync(file, 'utf8')));
  cached = { CL: ctx.window.CL, renderPoster: ctx.window.renderPoster, ARCHIVE: A };
  return cached;
}
