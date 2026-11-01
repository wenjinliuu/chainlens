/* 潮信 · 专栏报告阅读页：按 ?id= 渲染，目录随滚动高亮，上一篇 / 下一篇 */
(window.ARCHIVE_READY || Promise.resolve()).then(() => { // 等 archive.json（站点）或内置示例（设计稿）就绪
  const $ = s => document.querySelector(s), A = ARCHIVE, { mix } = ISO;
  const id = new URLSearchParams(location.search).get('id');
  const { c, K, html } = A.colPage(id);
  document.title = `${c.title} · 专栏报告 · 潮信`;
  document.documentElement.style.setProperty('--c', K.c);
  $('#cxHead').innerHTML = `<div class="orn"></div><div class="meta">${A.kindTag(c.kind)}<span class="num">${c.date}</span><span>· 读 ${c.readMin} 分钟</span><span>· 潮信研究 · AI 整理</span></div>
    <h1>${c.title}</h1><p class="dek">${c.dek}</p>
    <div class="cx-tags">${c.tags.map(t => `<span>${A.tb(t, 22)}<a href="/company?t=${t}">${t}</a></span>`).join('')}</div>`;
  $('#cxBody').innerHTML = html;
  $('#cxToc').innerHTML = `<h4>目录</h4>` + c.sections.map((s, i) => `<a href="#s${i + 1}" data-i="${i + 1}">${i + 1}. ${s.h}</a>`).join('');
  const day = A.byDate[c.date], prevDay = A.DATES.filter(d => d <= c.date).pop();
  $('#cxRel').innerHTML = `<h4>相关</h4>
    ${day ? `<a href="/daily?col=eve&d=${c.date}">${ICON.svg('bars', 16)}当天的期权日报 · 大盘${day.mood}</a>` : ''}
    ${prevDay ? `<a href="/daily?col=rr&d=${prevDay}">${ICON.svg('doc', 16)}当天的研报日报</a>` : ''}
    <a href="/daily?col=col">${ICON.svg('column', 16)}全部专栏报告</a>
    ${c.tags.slice(0, 3).map(t => `<a href="/company?t=${t}">${ICON.svg('building', 16)}${t} 的公司档案</a>`).join('')}`;
  const i = A.columns.findIndex(x => x.id === c.id), prev = A.columns[i + 1], next = A.columns[i - 1];
  $('#cxNav').innerHTML = `${prev ? `<a class="card" href="/column?id=${prev.id}"><span>← 更早一篇 · ${prev.kind}</span><b>${prev.title}</b></a>` : '<span></span>'}${next ? `<a class="card next" href="/column?id=${next.id}"><span>更新一篇 · ${next.kind} →</span><b>${next.title}</b></a>` : ''}`;
  // 目录随滚动高亮
  const secs = [...document.querySelectorAll('.cx-sec')], links = [...document.querySelectorAll('.cx-toc a')];
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.dataset.i === e.target.id.slice(1))); }); }, { rootMargin: '-20% 0px -70% 0px' });
  secs.forEach(s => io.observe(s));
});
