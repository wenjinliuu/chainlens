/*
 * 潮信 · ⌘K 全局搜索：公司、产业镇站点、栏目 / 页面、归档日期（归档页和首页有 ARCHIVE 时）
 * 自动往导航右侧插一个"搜索 ⌘K"按钮；⌘K / Ctrl+K 或按 / 打开，↑↓ 选，Enter 打开，Esc 关。
 * 只依赖 data.js（CL）；没有后端，纯前端子串匹配。
 */
(function () {
  const $ = s => document.querySelector(s);
  const { mix } = ISO;
  const deep = c => mix(c, '#000000', .18);
  const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const badge = c => `<span class="badge" style="--bs:32px;--c:${deep(CL.layers[c.li].color)};--ring:${mix(CL.layers[c.li].color, '#ffffff', .55)}"><i>${c.t[0]}</i>${c.logo ? `<img src="${c.logo}" alt="" onerror="this.remove()">` : ''}</span>`;
  const here = location.pathname.split('/').pop() || 'index.html';
  // 同一页内的锚点直接滚过去，不整页刷新
  const go = href => {
    const [file, rest] = href.split('#');
    if (file === here && rest) { location.hash = rest; dispatchEvent(new Event('hashchange')); close(); return; }
    location.href = href;
  };

  // ---------- 索引 ----------
  const items = [];
  CL.companies.forEach(c => { const L = CL.layers[c.li]; items.push({ g: '公司', t: c.t, sub: `${c.name} · ${L.name} / ${c.seg}`, ic: badge(c), href: `company.html?t=${c.t}`, alt: ['看盘', `stock.html?t=${c.t}`], k: `${c.t} ${c.name} ${L.name} ${c.seg}`.toLowerCase(), pri: c.cap }); });
  CL.layers.forEach((l, i) => items.push({ g: '产业镇', t: `${l.name}街区`, sub: `第 ${i + 1} 层 · ${Object.keys(l.segs).join(' / ')}`, ic: `<span class="ic dot" style="--c:${l.color}">${i + 1}</span>`, href: `index.html#island?station=${l.id}`, k: `${l.name} ${Object.keys(l.segs).join(' ')} 产业镇 街区 ${l.id}`.toLowerCase(), pri: 50 }));
  [['期权日报', '收盘后 · 海报 + 文字版，可翻以前的', '📊', 'daily.html?col=eve', '期权 日报 海报 归档 晚'],
    ['研报日报', '每个交易日 · 只放摘要，不放原文', '📑', 'daily.html?col=rr', '研报 评级 目标价 归档'],
    ['周报', '周日上午 · 本周方向与环节轮动', '📆', 'daily.html?col=week', '周报 每周'],
    ['盘前汇总', '开盘前 · 即将上线', '🌅', 'daily.html?col=morn', '盘前 早 汇总 隔夜'],
    ['日报归档', '日历 + 时间回放', '🗓️', 'daily.html', '归档 日历 回放 历史'],
    ['AI 产业镇', '8 个环节在运转，点进去逛', '🏭', 'index.html#island', '产业镇 小镇 岛 3d'],
    ['公司档案', '按公司查：3D 信息星图、近 60 日行情 + 事件', '🏢', 'company.html', '公司 档案 星图'],
    ['看盘工具', 'K 线 + 指标 + 潮信数据（财报日、最热合约）', '📈', 'stock.html', '看盘 k线 指标 boll macd kdj rsi'],
    ['研报卡片环', '今天谁被上调、下调', '🪪', 'index.html#research', '研报 卡片'],
    ['拆开日报', '海报每个版块怎么读', '🧩', 'index.html#inside', '拆开 海报 版块'],
    ['免费订阅', '填邮箱，明天起每天收到', '✉️', 'index.html#subscribe', '订阅 邮箱 免费'],
    ['管理订阅偏好', '栏目、关注公司、送达时间', '⚙️', 'subscribe.html?state=prefs', '偏好 设置 管理'],
    ['退订', '一键退订，不用登录', '🚪', 'unsubscribe.html', '退订 取消'],
    ['常见问题', '', '❓', 'index.html#faq', 'faq 问题 帮助'],
  ].forEach(([t, sub, ic, href, k]) => items.push({ g: '页面', t, sub, ic: `<span class="ic">${ic}</span>`, href, k: `${t} ${k}`.toLowerCase(), pri: 40 }));
  if (window.ARCHIVE) ARCHIVE.days.forEach(d => items.push({ g: '期权日报归档', t: `${d.md} ${d.wd}`, sub: `大盘${d.mood} · ${d.h2}`, ic: `<span class="ic">${d.mood === '偏乐观' ? '🟢' : d.mood === '偏谨慎' ? '🔴' : '⚪'}</span>`, href: `daily.html?col=eve&d=${d.date}`, k: `${d.date} ${d.date.slice(5).replace('-', '')} ${d.md} ${d.mood} ${d.h2} ${d.strong.t} ${d.hot.seg}`.toLowerCase(), pri: 10, date: true }));
  if (window.CX_THEME) items.push({ g: '操作', t: '切换深色 / 浅色模式', sub: '实验性；海报与 3D 场景保持浅色', ic: '<span class="ic">🌗</span>', fn: () => CX_THEME.toggle(), k: '深色 浅色 主题 dark light theme 模式', pri: 30 });
  if (window.LP && LP.setNight) items.push({ g: '操作', t: '切换白天 / 夜晚模式', sub: '首屏和产业镇一起变', ic: '<span class="ic">🌙</span>', fn: () => LP.setNight(!$('#hero').classList.contains('night')), k: '夜晚 白天 模式 night', pri: 30 });

  // ---------- 匹配与排序 ----------
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return quick();
    const toks = q.split(/\s+/);
    return items.map(it => {
      if (!toks.every(t => it.k.includes(t))) return null;
      let s = it.k.startsWith(q) || it.t.toLowerCase().startsWith(q) ? 0 : it.t.toLowerCase().includes(q) ? 1 : 2;
      if (it.date && !/^[\d\-月日]+$/.test(q) && !it.sub.toLowerCase().includes(q)) s += 1; // 日期项只在像日期、或命中标题时靠前
      return { it, s };
    }).filter(Boolean).sort((a, b) => a.s - b.s || b.it.pri - a.it.pri).slice(0, 18).map(x => x.it);
  }
  const RECENT = 'cx-recent';
  const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT) || '[]'); } catch { return []; } };
  const remember = it => { if (!it.href) return; const r = recent().filter(x => x !== it.href); r.unshift(it.href); localStorage.setItem(RECENT, JSON.stringify(r.slice(0, 5))); };
  function quick() {
    const rec = recent().map(h => items.find(i => i.href === h)).filter(Boolean).map(i => Object.assign({}, i, { g: '最近' }));
    return rec.concat(items.filter(i => i.g === '产业镇').slice(0, 4), items.filter(i => i.g === '页面').slice(0, 5), items.filter(i => i.g === '公司').slice(0, 3));
  }

  // ---------- 面板 ----------
  const root = document.createElement('div'); root.className = 'ck'; root.innerHTML = `<div class="ck-box" role="dialog" aria-label="搜索">
    <div class="ck-in"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="ckIn" placeholder="搜公司、环节、栏目、日期…  如 LITE、光模块、10-28" autocomplete="off"><span class="esc" id="ckEsc">Esc</span></div>
    <div class="ck-list" id="ckList"></div>
    <div class="ck-foot"><span><kbd>↑↓</kbd> 选择</span><span><kbd>Enter</kbd> 打开</span><span><kbd>Tab</kbd> 看盘 / 档案切换</span><span><kbd>Esc</kbd> 关闭</span></div></div>`;
  document.body.appendChild(root);
  const input = $('#ckIn'), list = $('#ckList');
  let cur = [], sel = 0, altMode = false;
  const hi = (t, q) => { if (!q) return esc(t); const i = t.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<em>' + esc(t.slice(i, i + q.length)) + '</em>' + esc(t.slice(i + q.length)); };
  function render() {
    const q = input.value.trim(); cur = search(q); sel = Math.min(sel, Math.max(0, cur.length - 1));
    if (!cur.length) { list.innerHTML = `<div class="ck-empty">没找到「${esc(q)}」。试试公司代码（NVDA）、中文名（美光）、环节（光模块）或日期（10-28）。</div>`; return; }
    let g = '', h = '';
    cur.forEach((it, i) => { if (it.g !== g) { g = it.g; h += `<div class="ck-g">${g}</div>`; }
      h += `<a class="ck-it${i === sel ? ' on' : ''}" data-i="${i}" href="${it.href || '#'}">${it.ic.startsWith('<span class="badge') ? `<span class="ic" style="background:transparent">${it.ic}</span>` : it.ic}<span class="tx"><b>${hi(it.t, q)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.alt ? `<span class="alt" data-alt="${i}">${it.alt[0]} →</span>` : ''}<span class="ret">${i === sel ? '↵' : ''}</span></a>`; });
    list.innerHTML = h;
    list.querySelectorAll('.ck-it').forEach(a => { a.onclick = e => { e.preventDefault(); open_(cur[+a.dataset.i]); }; a.onmousemove = () => { if (sel !== +a.dataset.i) { sel = +a.dataset.i; mark(); } }; });
    list.querySelectorAll('.alt').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const it = cur[+b.dataset.alt]; remember(it); go(it.alt[1]); });
    const on = list.querySelector('.on'); on && on.scrollIntoView({ block: 'nearest' });
  }
  function mark() { list.querySelectorAll('.ck-it').forEach((a, i) => { a.classList.toggle('on', i === sel); a.querySelector('.ret').textContent = i === sel ? '↵' : ''; }); }
  function open_(it) { if (!it) return; remember(it); if (it.fn) { close(); it.fn(); return; } go(altMode && it.alt ? it.alt[1] : it.href); }
  function open() { root.classList.add('open'); input.value = ''; sel = 0; altMode = false; render(); setTimeout(() => input.focus(), 30); document.body.style.overflow = 'hidden'; }
  function close() { root.classList.remove('open'); document.body.style.overflow = ''; }
  root.addEventListener('click', e => { if (e.target === root) close(); });
  $('#ckEsc').onclick = close;
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % cur.length; mark(); list.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + cur.length) % cur.length; mark(); list.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); open_(cur[sel]); }
    else if (e.key === 'Tab') { e.preventDefault(); altMode = !altMode; const it = cur[sel]; if (it && it.alt) input.placeholder = altMode ? `Enter 打开 ${it.t} 的看盘` : '搜公司、环节、栏目、日期…'; }
    else if (e.key === 'Escape') close();
  });
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.classList.contains('open') ? close() : open(); }
    else if (e.key === '/' && !/INPUT|TEXTAREA/.test(e.target.tagName) && !root.classList.contains('open')) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && root.classList.contains('open')) close();
  });

  // 导航右侧的按钮（手机上只剩图标）
  const nr = $('.nav-right');
  if (nr) { const b = document.createElement('button'); b.type = 'button'; b.className = 'nav-search'; b.title = '搜索（⌘K）'; b.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span>搜索</span><kbd>⌘K</kbd>'; b.onclick = open; nr.prepend(b); }
  window.CX_SEARCH = { open, close };
})();
