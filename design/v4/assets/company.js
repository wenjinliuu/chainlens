/*
 * 潮信 · 公司档案页：数据与页面逻辑
 * 全部为虚构示例：按代码做种子生成，保证同一家公司每次打开一致。
 * 上下游关系为示意，正式版以人工维护的 chain.json 为准。
 */
(function () {
  const { mix } = ISO;
  const W = '#ffffff', deep = c => mix(c, '#000000', .18);
  const $ = s => document.querySelector(s);
  const pct = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%';
  const dirCls = v => v > 0 ? 'bull' : v < 0 ? 'bear' : 'flat';
  const badge = (c, size, color) => `<span class="badge" style="--bs:${size}px;--c:${deep(color)};--ring:${mix(color, W, .55)}"><i>${c.t[0]}</i>${c.logo ? `<img src="${c.logo}" alt="" onerror="this.remove()">` : ''}</span>`;

  // ---------- 上下游关系（示意） ----------
  const REL = [
    ['ASML', 'TSM', '光刻机'], ['AMAT', 'TSM', '前道设备'], ['LRCX', 'TSM', '刻蚀'], ['KLAC', 'TSM', '量测'], ['ASML', 'INTC', '光刻机'], ['LRCX', 'MU', '刻蚀'], ['AMAT', 'MU', '前道设备'],
    ['TSM', 'NVDA', '代工 · CoWoS'], ['TSM', 'AMD', '代工'], ['TSM', 'AVGO', '代工'], ['TSM', 'MRVL', '代工'], ['TSM', 'ARM', '代工'], ['INTC', 'ARM', 'CPU 代工'],
    ['MU', 'NVDA', 'HBM'], ['MU', 'AMD', 'HBM'], ['SNDK', 'DELL', 'SSD'], ['WDC', 'EQIX', 'HDD'],
    ['NVDA', 'DELL', 'GPU'], ['NVDA', 'SMCI', 'GPU'], ['NVDA', 'HPE', 'GPU'], ['AMD', 'DELL', 'GPU'], ['NVDA', 'CRWV', 'GPU'], ['NVDA', 'MSFT', 'GPU'], ['NVDA', 'ORCL', 'GPU'],
    ['AVGO', 'GOOGL', 'TPU'], ['AVGO', 'META', 'ASIC'], ['MRVL', 'AMZN', 'ASIC'], ['AVGO', 'ANET', '交换芯片'], ['ARM', 'AMZN', '架构授权'],
    ['COHR', 'NVDA', '光模块'], ['LITE', 'GOOGL', '光器件'], ['CRDO', 'AMZN', '有源电缆'], ['COHR', 'ANET', '光模块'], ['CIEN', 'MSFT', '光传输'], ['ALAB', 'NVDA', '互连芯片'],
    ['ANET', 'MSFT', '交换机'], ['ANET', 'META', '交换机'], ['CSCO', 'EQIX', '网络设备'],
    ['DELL', 'CRWV', '服务器'], ['SMCI', 'CRWV', '服务器'], ['HPE', 'IREN', '服务器'], ['SMCI', 'CORZ', '服务器'],
    ['VRT', 'EQIX', '电源 · 液冷'], ['VRT', 'DLR', '电源 · 液冷'], ['ETN', 'DLR', '配电'], ['ETN', 'CRWV', '配电'],
    ['FCX', 'ETN', '铜'], ['SCCO', 'VRT', '铜'], ['MP', 'ETN', '稀土磁材'], ['GEV', 'VST', '燃机'], ['BE', 'ORCL', '燃料电池'],
    ['CEG', 'MSFT', '长期购电'], ['TLN', 'AMZN', '长期购电'], ['VST', 'EQIX', '电力'], ['OKLO', 'DLR', '电力'], ['CCJ', 'CEG', '铀燃料'],
    ['CRWV', 'MSFT', '算力租赁'], ['NBIS', 'MSFT', '算力租赁'], ['IREN', 'MSFT', '算力租赁'], ['CORZ', 'CRWV', '托管'], ['CIFR', 'AMZN', '托管'], ['WULF', 'GOOGL', '托管'], ['APLD', 'CRWV', '托管'],
    ['EQIX', 'ORCL', '托管'], ['DLR', 'GOOGL', '托管'], ['DLR', 'META', '托管'],
    ['MSFT', 'PLTR', '云'], ['AMZN', 'PLTR', '云'], ['AMZN', 'SNOW', '云'], ['MSFT', 'NOW', '云'], ['GOOGL', 'CRWD', '云'], ['QCOM', 'AAPL', '芯片'], ['TSM', 'AAPL', '代工'], ['NVDA', 'TSLA', 'GPU'], ['BABA', 'BABA', ''],
  ].filter(([a, b]) => a !== b && CL.byT[a] && CL.byT[b]);

  // ---------- 虚构数据生成 ----------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const seedOf = t => [...t].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const NEWS = {
    raw: ['铜价创阶段新高，矿企扩产计划公布', '稀土出口政策出现新变化', '新矿区产能爬坡进度披露'],
    energy: ['与云厂商签署长期供电协议', '核电机组延寿申请获批', '新增燃机订单交付时间表公布'],
    chip: ['新一代产品量产时间表公布', '先进封装产能扩张计划披露', '季度业绩电话会要点'],
    net: ['800G 光模块出货量环比增加', '数据中心交换机新品发布', '大客户订单指引更新'],
    dc: ['液冷机柜订单储备创新高', '新数据中心园区开工', 'AI 服务器交付周期缩短'],
    compute: ['与大模型公司签署算力租约', '新 GPU 集群上线', '融资用于扩建算力中心'],
    cloud: ['资本开支指引上调', '新大模型版本发布', '云业务收入增速披露'],
    app: ['企业客户数量季度增长', '新 AI 功能上线', '端侧 AI 设备出货数据披露'],
  };
  const FIRMS = ['机构 A', '机构 B', '机构 C', '机构 D', '机构 E', '机构 F'];
  function build(t) {
    const c = CL.byT[t], L = CL.layers[c.li], r = rng(seedOf(t));
    // 60 日 K 线
    const days = [], K = []; const d0 = new Date('2026-10-30T00:00:00Z');
    for (const d = new Date(d0); days.length < 60; d.setUTCDate(d.getUTCDate() - 1)) { const w = d.getUTCDay(); if (w && w !== 6) days.unshift(d.toISOString().slice(5, 10)); }
    let p = 30 + (seedOf(t) % 400);
    days.forEach((d, i) => { const o = p * (1 + (r() - .5) * .01), cl = o * (1 + .002 + (r() - .5) * .05); K.push({ d, o, c: cl, h: Math.max(o, cl) * (1 + r() * .015), l: Math.min(o, cl) * (1 - r() * .015), v: .4 + r() }); p = cl; });
    // 最后一根 K 线的涨跌与列表里的当日涨跌（data.js）保持一致
    { const pv = K[58], lk = K[59]; lk.c = pv.c * (1 + c.chg[6] / 100); lk.h = Math.max(lk.h, lk.o, lk.c); lk.l = Math.min(lk.l, lk.o, lk.c); }
    const last = K[59], prev = K[58];
    // CP 偏离（相对 20 日常态）近 20 日；有期权信号的票，最近一天给一个尖峰
    const dev = Array.from({ length: 20 }, (_, i) => +((r() - .5) * .5).toFixed(2));
    if (c.signals.includes('o')) dev[19] = c.chg[6] >= 0 ? .62 : -.48;
    const cp = K.map((k, i) => 1.1 + Math.sin(i / 7) * .2 + (r() - .5) * .25 + (i >= 40 ? dev[i - 40] * .8 : 0));
    // 研报
    const nRep = 2 + Math.floor(r() * 3) + (c.signals.includes('r') ? 1 : 0);
    let tp = last.c * (.92 + r() * .1);
    const reports = Array.from({ length: nRep }, (_, i) => {
      const di = Math.min(59, Math.floor(10 + i * (48 / nRep) + r() * 6)), old = Math.round(tp), up = r() > .3;
      tp = tp * (up ? 1.03 + r() * .06 : .93 + r() * .04);
      const r0 = ['中性', '增持', '增持', '中性'][Math.floor(r() * 4)], r1 = up && r0 === '中性' && r() > .5 ? '增持' : !up && r0 === '增持' && r() > .5 ? '中性' : r0;
      return { di, d: days[di], firm: FIRMS[Math.floor(r() * FIRMS.length)], r0, r1, p0: old, p1: Math.round(tp), pts: [['收入结构持续优化', '新产品周期带动需求', '盈利预测上调'][i % 3], ['产能扩张进度符合预期', '客户集中度下降', '估值反映部分预期'][(i + 1) % 3]] };
    });
    if (c.signals.includes('r')) { const lr = reports[reports.length - 1]; lr.di = 59; lr.d = days[59]; }
    reports.sort((a, b) => a.di - b.di);
    const tps = reports.map(x => x.p1), tLo = Math.min(...tps), tHi = Math.max(...tps), tAvg = tps.reduce((a, b) => a + b, 0) / tps.length;
    // 新闻
    const nNews = 3 + Math.floor(r() * 3);
    const news = Array.from({ length: nNews }, (_, i) => ({ di: Math.min(59, 59 - Math.floor(i * 9 + r() * 6)), title: NEWS[L.id][i % 3], src: r() > .6 ? '公司公告' : '示例媒体' })).map(n => ({ ...n, d: days[n.di] }));
    // 期权事件
    const opts = dev.map((v, i) => ({ di: 40 + i, v })).filter(x => Math.abs(x.v) > .3).map(x => ({ ...x, d: days[x.di] }));
    const events = [...opts.map(o => ({ k: 'o', di: o.di, d: o.d, title: `CP 偏离 ${o.v > 0 ? '+' : '−'}${Math.round(Math.abs(o.v) * 100)}%`, sub: '晚潮 · 期权数据面' })),
      ...reports.map(x => ({ k: 'r', di: x.di, d: x.d, title: `${x.firm} ${x.r0 === x.r1 ? '维持' + x.r1 : x.r0 + '→' + x.r1}`, sub: `目标价 ${x.p0} → ${x.p1}` })),
      ...news.map(n => ({ k: 'n', di: n.di, d: n.d, title: n.title, sub: n.src }))].sort((a, b) => a.di - b.di);
    const ups = REL.filter(e => e[1] === t).map(e => ({ c: CL.byT[e[0]], rel: e[2] }));
    const downs = REL.filter(e => e[0] === t).map(e => ({ c: CL.byT[e[1]], rel: e[2] }));
    return { c, L, days, K, last, prev, chg: (last.c / prev.c - 1) * 100, dev, cp, reports, tLo, tHi, tAvg, news, events, ups, downs,
      vx: c.vx[6], px: +(c.vx[6] * (1.05 + r() * .4)).toFixed(1), leap: ['LEAP Call 占比上升', 'LEAP 持平', 'LEAP Put 占比上升'][Math.floor(r() * 3)],
      hot: `${c.chg[6] >= 0 ? 'Call' : 'Put'} ${Math.round(last.c * (c.chg[6] >= 0 ? 1.08 : .92))} · 11/21 到期`, conf: ['低', '中', '高'][Math.min(2, Math.floor(Math.abs(dev[19]) * 4))] };
  }
  window.CO = { build, REL, badge, pct, dirCls, deep };

  // ---------- 页面 ----------
  const T0 = (new URLSearchParams(location.search).get('t') || 'NVDA').toUpperCase();
  let cur = CL.byT[T0] ? T0 : 'NVDA';
  const SIG = { o: ['var(--violet)', '晚潮'], r: ['var(--sky)', '研报'], n: ['var(--amber)', '新闻'] };

  function renderList(q) {
    q = (q || '').trim().toLowerCase();
    $('#coList').innerHTML = CL.layers.map(L => {
      const ms = L.members.filter(c => !q || c.t.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
      if (!ms.length) return '';
      return `<div class="cl-grp"><div class="cl-h"><i style="background:${L.color}"></i>${L.name}<span>${ms.length}</span></div>
        ${ms.map(c => `<a class="cl-row${c.t === cur ? ' on' : ''}" href="?t=${c.t}" data-t="${c.t}">${badge(c, 28, L.color)}<b class="num">${c.t}</b><small>${c.name}</small>
          <span class="sd">${c.signals.map(s => `<i style="background:${SIG[s][0]}"></i>`).join('')}</span><span class="pill ${dirCls(c.chg[6])}">${pct(c.chg[6])}</span></a>`).join('')}</div>`;
    }).join('') || '<div class="cl-empty">没有找到这家公司</div>';
    document.querySelectorAll('.cl-row').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.t); });
  }
  $('#coSearch').addEventListener('input', e => renderList(e.target.value));

  const devBar = v => { const w = Math.min(Math.abs(v) / .6, 1) * 50; return `<div class="dv"><div class="dv-t"><span class="dv-f ${v >= 0 ? 'up' : 'dn'}" style="${v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></span><span class="dv-m"></span></div><b class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%</b></div>`; };
  function render(D) {
    const { c, L } = D;
    document.title = `${c.t} ${c.name} · 公司档案 · 潮信`;
    history.replaceState(null, '', '?t=' + c.t);
    $('#coHead').style.setProperty('--c', L.color);
    $('#coHead').innerHTML = `<div class="ch-top">
      <div class="ch-id">${badge(c, 76, L.color)}<div><div class="ch-t"><b class="num">${c.t}</b><span class="tag seg-tag" style="--c:${L.color}">${L.name}</span><span class="tag" style="--tc-deep:${deep(L.color)};--tc-bg:${mix(L.color, W, .9)}">${c.seg}</span></div>
        <div class="ch-n">${c.name} · 市值约 ${c.cap >= 1000 ? (c.cap / 1000).toFixed(1) + ' 万亿' : c.cap + ' 十亿'} 美元（示意）</div></div></div>
      <div class="ch-px"><b class="num">${D.last.c.toFixed(2)}</b><span class="pill ${dirCls(D.chg)}">${pct(D.chg)}</span><small>USD · 10-30 收盘 · 延迟数据</small></div>
      <div class="ch-act"><a class="btn ghost" href="stock.html?t=${c.t}">看盘工具 →</a><button class="btn accent" id="followBtn">关注这家公司</button></div></div>
      <div class="ch-kpi">
        <div><span>晚潮 · CP 偏离</span><b class="num ${D.dev[19] >= 0 ? 'up' : 'down'}">${D.dev[19] >= 0 ? '+' : '−'}${Math.round(Math.abs(D.dev[19]) * 100)}%</b><small>对比 20 日常态</small></div>
        <div><span>研报目标价</span><b class="num">${Math.round(D.tLo)}–${Math.round(D.tHi)}</b><small>${D.reports.length} 条 · 均值 ${Math.round(D.tAvg)}</small></div>
        <div><span>近 60 日新闻</span><b class="num">${D.news.length}</b><small>公告与媒体</small></div>
        <div><span>上游 / 下游</span><b class="num">${D.ups.length} / ${D.downs.length}</b><small>示意关系</small></div>
      </div>`;
    $('#followBtn').onclick = e => { e.target.textContent = '✓ 已关注（演示）'; e.target.classList.remove('accent'); };
    // 期权
    $('#pOpt').innerHTML = `<div class="ph"><h3><span class="dot" style="background:var(--violet)"></span>晚潮 · 期权数据面</h3><span class="disclaimer">来源：期权日报 · 示例</span></div>
      <div class="opt-grid"><div><span>量倍数</span><b class="num">${D.vx}x</b></div><div><span>权利金倍数</span><b class="num">${D.px}x</b></div><div><span>可信度</span><b class="dots3">${[1, 2, 3].map(i => `<i class="${i <= ({ 低: 1, 中: 2, 高: 3 })[D.conf] ? 'on' : ''}"></i>`).join('')}<em>${D.conf}</em></b></div></div>
      <div class="opt-row"><span>CP 对比常态</span>${devBar(D.dev[19])}</div>
      <div class="opt-row"><span>LEAP 趋势</span><b>${D.leap}</b></div>
      <div class="opt-row"><span>最热合约</span><b class="num">${D.hot}</b></div>
      <div class="spark20">${D.dev.map((v, i) => `<i class="${v >= 0 ? 'up' : 'dn'}${i === 19 ? ' last' : ''}" style="height:${8 + Math.abs(v) * 90}px" title="${D.days[40 + i]} ${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%"></i>`).join('')}</div>
      <div class="disclaimer">近 20 日 CP 偏离；方向为期权成交结构的数据面倾向，不构成投资建议。</div>`;
    // 研报
    const P = v => ((v - D.tLo * .85) / (D.tHi * 1.1 - D.tLo * .85) * 100).toFixed(1) + '%';
    $('#pRep').innerHTML = `<div class="ph"><h3><span class="dot" style="background:var(--sky)"></span>研报</h3><span class="ai-tag">AI 整理</span></div>
      <div class="tbar"><span class="seg" style="left:${P(D.tLo)};width:calc(${P(D.tHi)} - ${P(D.tLo)})"></span><span class="avg" style="left:${P(D.tAvg)}"></span><span class="now" style="left:${P(D.last.c)}"><em>现价 ${D.last.c.toFixed(0)}</em></span></div>
      <div class="tlab"><span>低 ${Math.round(D.tLo)}</span><span>均 ${Math.round(D.tAvg)}</span><span>高 ${Math.round(D.tHi)}</span></div>
      ${D.reports.slice().reverse().map(x => `<div class="rp" data-di="${x.di}"><div class="rp-h"><b>${x.firm}</b><span>${x.d}</span><span>${x.r0 === x.r1 ? '维持 ' + x.r1 : x.r0 + ' → ' + x.r1}</span><span class="num rp-tp">${x.p0} → <b>${x.p1}</b></span></div><ul>${x.pts.map(p => `<li>${p}</li>`).join('')}</ul></div>`).join('')}`;
    // 新闻
    $('#pNews').innerHTML = `<div class="ph"><h3><span class="dot" style="background:var(--amber)"></span>新闻</h3><span class="disclaimer">示例</span></div>
      ${D.news.map(n => `<div class="nw" data-di="${n.di}"><span class="nw-d num">${n.d}</span><div><b>${n.title}</b><small>${n.src}</small></div></div>`).join('')}`;
    // 产业链
    const rel = (arr, lab) => `<div class="rel-col"><div class="rel-h">${lab}</div>${arr.length ? arr.map(x => `<a class="rel" href="?t=${x.c.t}" data-t="${x.c.t}">${badge(x.c, 30, CL.layers[x.c.li].color)}<b class="num">${x.c.t}</b><small>${x.rel}</small><span class="pill ${dirCls(x.c.chg[6])}">${pct(x.c.chg[6])}</span></a>`).join('') : '<div class="rel-none">暂无（示意）</div>'}</div>`;
    $('#pChain').innerHTML = `<div class="ph"><h3><span class="dot" style="background:${L.color}"></span>产业链位置</h3><a class="disclaimer" href="index.html#island">在产业岛上看 →</a></div>
      <div class="rel-wrap">${rel(D.ups, '上游 · 供应方')}<div class="rel-me">${badge(c, 44, L.color)}<b class="num">${c.t}</b><small>${L.name}</small></div>${rel(D.downs, '下游 · 客户')}</div>`;
    document.querySelectorAll('#pChain .rel').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.t); });
    // 出现记录
    $('#pSeen').innerHTML = `<div class="ph"><h3>在潮信里出现过</h3></div>
      ${D.events.slice().reverse().slice(0, 8).map(e => `<div class="seen" data-di="${e.di}"><span class="seen-k" style="--k:${SIG[e.k][0]}">${SIG[e.k][1]}</span><span class="num">${e.d}</span><b>${e.title}</b><small>${e.sub}</small></div>`).join('')}`;
  }

  let star = null, line = null;
  function go(t) {
    cur = t; const D = build(t);
    renderList($('#coSearch').value); render(D);
    star && star.load(D); line && line.load(D);
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.CO.start = (initStar, initLine) => {
    const tip = $('#coTip');
    const ui = {
      tip(html, x, y) { if (!html) { tip.classList.remove('show'); return; } tip.innerHTML = html; tip.style.left = x + 14 + 'px'; tip.style.top = y - 12 + 'px'; tip.classList.add('show'); },
      go,
      focusDay(di) { document.querySelectorAll('[data-di]').forEach(el => el.classList.toggle('hl', +el.dataset.di === di)); },
    };
    star = initStar($('#starCanvas'), ui, $('#starLabels'));
    line = initLine($('#lineCanvas'), ui);
    go(cur);
  };
  renderList('');
  render(build(cur));
})();
