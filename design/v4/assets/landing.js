/* 潮信 · 落地页交互：手机里的期权日报海报、三个栏目、AI 产业镇 UI、拆开期权日报（滚动爆炸图）、流程、样张、订阅 */
(function () {
  const $ = s => document.querySelector(s);
  const LP = window.LP = {};

  // ---------- 订阅（设计稿演示：只切换状态，不发送） ----------
  LP.subscribe = form => { form.closest('.sub-wrap').classList.add('sub-done'); dispatchEvent(new Event('cl-subscribed')); return false; };
  addEventListener('scroll', () => $('#nav').classList.toggle('scrolled', scrollY > 10), { passive: true });
  const { mix } = ISO;
  const deep = c => mix(c, '#000000', .18);
  const badge = (c, size, color) => `<span class="badge" style="--bs:${size}px;--c:${deep(color)};--ring:${mix(color, '#ffffff', .55)}"><i>${c.t[0]}</i>${c.logo ? `<img src="${c.logo}" alt="" onerror="this.remove()">` : ''}</span>`;

  // ---------- 首屏：卡片从手机屏幕里飞出来 ----------
  const pcs = [...document.querySelectorAll('.pc')];
  pcs.forEach(el => { const box = el.querySelector('.pc-logo'); if (box) { const c = CL.byT[box.dataset.t]; box.insertAdjacentHTML('afterbegin', badge(c, 34, CL.layers[c.li].color)); } });
  pcs.forEach((el, i) => setTimeout(() => el.classList.add('out'), 1400 + i * 380));
  // 每隔一会儿，轮流有一张卡"缩回屏幕再飞出来"，像新的一期送到
  let pcI = 0;
  setInterval(() => { const el = pcs[pcI++ % pcs.length]; el.classList.remove('out'); setTimeout(() => el.classList.add('out'), 900); }, 5200);

  // ---------- 夜晚模式：3D 场景 + 首屏与导览区的底色一起切换 ----------
  let night = false;
  LP.setNight = on => {
    night = !!on;
    $('#hero').classList.toggle('night', night); const isle = $('.isle'); isle && isle.classList.toggle('night', night); const tf = $('.town-full'); tf && tf.classList.toggle('night', night);
    const b1 = $('#nightBtn'); if (b1) b1.innerHTML = night ? '<i>☀️</i><b>白天模式</b>' : '<i>🌙</i><b>夜晚模式</b>';
    const b2 = $('#nightBtn2'); if (b2) b2.textContent = night ? '☀️ 白天' : '🌙 夜晚';
    LP.town && LP.town.setNight(night ? 1 : 0, !!window.__nightNow);
  };
  document.querySelectorAll('#nightBtn, #nightBtn2').forEach(b => b.addEventListener('click', () => LP.setNight(!night)));

  // ---------- 栏目 ----------
  const COLS = [
    { id: 'eve', name: '期权日报', sub: '收盘后', color: '#5b4cff', when: '每个交易日 15:40', status: '每日送达', art: 'moon',
      items: ['大盘情绪：全市场 CP 对比 20 日常态', '最强信号与 AI 链重点个股', '最热环节、全市场分时、观察名单'], desc: '收盘后，把成交量前 100 的期权数据整理成一张海报 + 文字版。海报署名 KZG 期权 Pro。' },
    { id: 'rr', name: '研报日报', sub: '每日', color: '#1296f0', when: '每个交易日', status: '每日送达', art: 'docs',
      items: ['机构评级与目标价的调整', '每篇不超过 3 条要点摘要', '按 8 层产业链归类，标明来源'], desc: '今天谁被上调、谁被下调，一页看完。只放摘要，不放研报原文。' },
    { id: 'morn', name: '盘前汇总', sub: '开盘前', color: '#f5a314', when: '美股开盘前', status: '即将上线', soon: true, art: 'sun',
      items: ['隔夜要闻与公司公告', '盘前异动的 AI 链个股', '当天财报与宏观日程'], desc: '开盘前 5 分钟，知道今天 AI 链上发生了什么、要看什么。' },
  ];
  const check = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="m5 12 5 5 9-10"/></svg>';
  document.querySelectorAll('.col-pick').forEach(box => {
    box.innerHTML = COLS.map(c => `<button type="button" class="cp-chip on" style="--c:${c.color}">${check}<b>${c.name}</b>${c.sub}${c.soon ? '<em>即将上线</em>' : ''}</button>`).join('');
    box.querySelectorAll('.cp-chip').forEach(b => b.onclick = () => b.classList.toggle('on'));
  });
  function colArt(kind, c) {
    const B = new ISO.Iso(), P = ISO.palette(c, 'light', .12);
    if (kind === 'docs') {
      for (let k = 0; k < 4; k++) B.box(k * 10, -k * 8, k * 9, 150, 190, 6, k === 3 ? P.body : P.pin);
      for (let l = 0; l < 5; l++) B.box(52, -10 + l * 30, 42, 80, 10, 2, P.core);
      B.box(52 - 30, -10, 42, 22, 22, 4, P.dark3);
    } else {
      for (let k = 0; k < 12; k++) { const h = 26 + Math.sin(k * .75) * 16 + (k % 3) * 3; B.box(k * 22, 0, 0, 18, 110, h, k % 2 ? P.core : P.body); }
    }
    return `<svg viewBox="${B.viewBox(14)}">${B.out()}</svg>`;
  }
  $('#colCards').innerHTML = COLS.map(c => `<div class="col-card card" style="--c:${c.color};--cs:${mix(c.color, '#ffffff', .9)};--cd:${deep(c.color)}">
      <div class="col-art"><span class="orb ${c.art}"></span>${colArt(c.art, c.color)}</div>
      <div class="col-top"><span class="col-name">${c.name}</span><span class="col-sub">${c.sub}</span><span class="col-st${c.soon ? ' soon' : ''}">${c.status}</span></div>
      <div class="col-when">${c.when}</div>
      <p>${c.desc}</p>
      <ul>${c.items.map(x => `<li>${x}</li>`).join('')}</ul>
      <button type="button" class="col-peek" data-peek="${c.id}">看样张 ↓</button>
    </div>`).join('') + `<div class="col-week card"><b>周报</b><span>每周日上午：本周大盘方向、最热和最冷的环节、持续出现的信号、下周看点。订阅任何一个栏目都会收到。</span><button type="button" class="col-peek" data-peek="week">看样张 ↓</button></div>
    <div class="peek-wrap" id="peekWrap"><div class="peek card" id="peek"></div></div>`;

  // ---------- 样张（虚构）：盘前汇总 / 期权日报 / 研报日报 / 周报 ----------
  const PEEK = ARCHIVE.peek; // 四张样张的渲染在 archive.js（归档页共用）
  let peekOpen = null;
  document.querySelectorAll('.col-peek').forEach(b => b.onclick = () => {
    const id = b.dataset.peek, wrap = $('#peekWrap'), box = $('#peek');
    if (peekOpen === id) { wrap.classList.remove('open'); peekOpen = null; document.querySelectorAll('.col-peek').forEach(x => x.textContent = '看样张 ↓'); return; }
    peekOpen = id; box.innerHTML = PEEK[id]() + `<button type="button" class="pk-x">收起</button>`; wrap.classList.add('open');
    document.querySelectorAll('.col-peek').forEach(x => x.textContent = x.dataset.peek === id ? '收起样张 ↑' : '看样张 ↓');
    box.querySelector('.pk-x').onclick = () => { wrap.classList.remove('open'); peekOpen = null; document.querySelectorAll('.col-peek').forEach(x => x.textContent = '看样张 ↓'); };
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ---------- AI 产业镇 UI ----------
  LP.island = initIsland => {
    const L = CL.layers, sigTk = (Lr, k) => Lr.members.filter(c => c.signals.includes(k));
    $('#isleLabels').innerHTML = L.map((l, i) => `<button class="isle-label" style="--c:${l.color}" data-i="${i}"><i></i>${l.name}<b>${l.heat[6].toFixed(1)}x</b></button>`).join('');
    $('#isleChips').innerHTML = L.map((l, i) => `<button class="isle-chip" style="--c:${l.color}" data-i="${i}"><i></i>${i + 1}. ${l.name}</button>`).join('');
    const panel = $('#islePanel');
    function render(i) {
      document.querySelectorAll('.isle-chip').forEach(c => c.classList.toggle('on', +c.dataset.i === i));
      if (i < 0) {
        panel.style.setProperty('--c', '#5b4cff');
        panel.innerHTML = `<div class="ip-k">AI 产业镇 · 全景</div><h3>8 个环节 · 58 家公司</h3>
          <p>从矿石、电力，到芯片、光模块、服务器，再到云和机器人。潮信每天沿着这条链，看哪里在放量、谁被调评级、发生了什么。</p>
          <div class="ip-leg"><span><i class="lg-pod"></i>底座越高 = 当天期权成交越热</span><span><i class="lg-cube"></i>方块 = 产业链流向</span><span><i class="lg-coin"></i>硬币 = 成员公司</span></div>
          <button class="btn accent" id="ipStart">从「原材料」开始导览 →</button>`;
        $('#ipStart').onclick = () => isl.go(0);
        return;
      }
      const l = L[i], o = sigTk(l, 'o'), r = sigTk(l, 'r'), n = sigTk(l, 'n');
      const tks = a => a.length ? a.map(c => `<span class="num">${c.t}</span>`).join('、') : '暂无';
      panel.style.setProperty('--c', l.color);
      panel.innerHTML = `<div class="ip-k">第 ${i + 1} 站 · ${l.en}</div><h3>${l.name}</h3>
        <div class="ip-segs">${Object.keys(l.segs).map(x => `<span class="tag" style="--tc-deep:${deep(l.color)};--tc-bg:${mix(l.color, '#ffffff', .9)}">${x}</span>`).join('')}</div>
        <div class="ip-h">潮信每天在这里看什么</div>
        <div class="ip-row"><span class="ip-c" style="--k:#5b4cff">期权日报</span><div>期权热度 <b class="num">${l.heat[6].toFixed(1)}x</b> · 信号 ${tks(o)}</div></div>
        <div class="ip-row"><span class="ip-c" style="--k:#1296f0">研报日报</span><div>今日评级 / 目标价调整：${tks(r)}</div></div>
        <div class="ip-row"><span class="ip-c" style="--k:#f5a314">盘前汇总</span><div>盘前要闻：${tks(n)} <em>即将上线</em></div></div>
        <div class="ip-logos">${l.members.slice().sort((a, b) => b.cap - a.cap).slice(0, 8).map(c => `<a href="company.html?t=${c.t}" title="${c.t} ${c.name} · 公司档案">${badge(c, 34, l.color)}</a>`).join('')}</div>
        <div class="ip-more">点 logo 打开公司档案 →</div>`;
    }
    // 点镇里的东西：气泡跟着它走
    const bub = $('#isleBubble'); let followed = null;
    const KIND_ICON = { tower: '🏢', truck: '🚚', flat: '🛻', bus: '🚌', car: '🚗', fork: '🏗️', worker: '👷', arm: '🦾', person: '🚶', bot: '🤖', board: '📢', port: '⚓', light: '🗼', robin: '🐦', blimp: '🎈' };
    const thing = (info, x, y, th) => {
      if (!info) { followed = null; bub.classList.remove('show'); return; }
      followed = th;
      bub.style.setProperty('--c', info.L ? info.L.color : '#5b4cff');
      bub.innerHTML = `<span class="ib-ic">${KIND_ICON[info.kind] || '✨'}</span><div><b>${info.title}</b><p>${info.sub}</p>${info.go ? `<a href="company.html?t=${info.go}">打开 ${info.go} 的公司档案 →</a>` : ''}</div><button class="ib-x" type="button">✕</button>`;
      bub.querySelector('.ib-x').onclick = () => thing(null);
      bub.classList.add('show'); moveThing(x, y, true);
    };
    const moveThing = (x, y, vis) => { bub.style.left = x + 'px'; bub.style.top = y + 'px'; bub.style.opacity = vis ? 1 : 0; };
    const isl = initIsland($('#isleCanvas'), { labels: [...document.querySelectorAll('.isle-label')], select: i => { thing(null); render(i); if (location.hash.startsWith('#island')) history.replaceState(null, '', i >= 0 ? `#island?station=${L[i].id}` : '#island'); }, thing, followThing: () => followed, moveThing });
    LP.town = isl.town;
    document.querySelectorAll('.isle-label, .isle-chip').forEach(b => b.onclick = () => isl.go(+b.dataset.i));
    $('#islePrev').onclick = () => isl.go(isl.focus <= 0 ? L.length - 1 : isl.focus - 1);
    $('#isleNext').onclick = () => isl.go(isl.focus >= L.length - 1 ? 0 : isl.focus + 1);
    $('#isleHome').onclick = () => isl.go(-1);
    render(-1);
    LP.isl = isl;
    // 深链接：#island?station=chip → 滚到产业镇并聚焦那个街区（⌘K 搜索和分享链接都用它）
    const fromHash = first => { const m = location.hash.match(/^#island\?station=([a-z]+)/); if (!m) return; const i = L.findIndex(l => l.id === m[1]); if (i >= 0) { isl.go(i); $('#island').scrollIntoView({ behavior: first === true ? 'instant' : 'smooth', block: 'start' }); } };
    addEventListener('hashchange', () => fromHash(false)); fromHash(true);
  };

  // ---------- 手机里自动滚动的日报 ----------
  const feed = $('#feed');
  feed.innerHTML = `<div class="feed-z">${renderPoster()}</div>`;
  // 手机里的海报：在容器里来回慢慢滚动（停 2 秒 → 13 秒滚到底 → 停 2 秒 → 滚回），鼠标放上去暂停
  let fT = 0, fLast = performance.now(), fHover = false;
  feed.parentElement.addEventListener('pointerenter', () => fHover = true);
  feed.parentElement.addEventListener('pointerleave', () => fHover = false);
  (function scrollFeed(now) {
    const dt = Math.max(0, Math.min((now - fLast) / 1000, .05)); fLast = now;
    if (!fHover) fT += dt;
    const max = feed.scrollHeight - feed.clientHeight, cyc = 30, k = fT % cyc;
    const ph = k < 2 ? 0 : k < 15 ? (k - 2) / 13 : k < 17 ? 1 : 1 - (k - 17) / 13;
    const e = ph < .5 ? 2 * ph * ph : 1 - Math.pow(-2 * ph + 2, 2) / 2;
    if (max > 0) feed.scrollTop = Math.round(max * e);
    requestAnimationFrame(scrollFeed);
  })(fLast);

  // ---------- 研报卡片环 UI ----------
  LP.research = initResearch => {
    const det = $('#rsDetail');
    const blank = () => { det.innerHTML = `<div class="rs-empty"><b>点一张卡片</b>看机构、评级、目标价和要点；潮信每天把这些整理成一页"研报日报"。</div>`; };
    const show = r => {
      const L = CL.layers[r.c.li], d = r.p0 == null ? null : (r.p1 / r.p0 - 1) * 100;
      det.innerHTML = `<div class="rs-h">${badge(r.c, 44, L.color)}<div><b class="num">${r.t}</b><small>${r.c.name} · ${L.name}</small></div>
          ${d == null ? '<span class="pill flat">首次覆盖</span>' : `<span class="pill ${d >= 0 ? 'bull' : 'bear'}">目标价 ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}%</span>`}</div>
        <div class="rs-m"><span>${r.firm} · ${r.date}</span><span>${r.r0 === r.r1 ? '维持 ' + r.r1 : r.r0 === '—' ? '首次覆盖 · ' + r.r1 : r.r0 + ' → ' + r.r1}</span><span class="num">${r.p0 == null ? '' : r.p0 + ' → '}<b>${r.p1}</b></span></div>
        <ul>${r.pts.map(p => `<li>${p}</li>`).join('')}</ul>
        <a class="rs-link" href="company.html?t=${r.t}">看 ${r.t} 的公司档案 →</a>`;
    };
    blank();
    const rs = initResearch($('#rsCanvas'), { select: show });
    document.querySelectorAll('#rsFilter button').forEach(b => b.onclick = () => {
      document.querySelectorAll('#rsFilter button').forEach(x => x.classList.toggle('on', x === b)); if (b.dataset.f === 'all') blank(); rs.setFilter(b.dataset.f);
    });
    LP.rs = rs;
  };

  // ---------- 拆开日报 ----------
  const STEPS = [
    ['标题区：一句话说清今天', '黑色主句是日期和大盘情绪，靛紫大字是今天最重要的一件事，灰色副句补充原因。'],
    ['三个大数字', '全市场情绪（CP 对比 20 日常态）、最强信号、最热 AI 环节，3 秒看完。'],
    ['热点事件', '当天影响 AI 链的公司公告和新闻，每条都标来源。'],
    ['AI 链重点', '每只票：数据面方向、可信度、量和权利金倍数、CP 偏离、最热合约，再加一句消息依据。'],
    ['AI 环节热度', '8 层产业链里谁在放量：热度 = 成员量倍数中位数，附成交最多的公司。'],
    ['大盘 CP 与全市场分时', '全天每 30 分钟的成交量和 CP，看情绪在什么时候转向。'],
    ['页脚：来源与对比基准', '数据来源、对比区间和免责声明；每个数字都写明和什么比。'],
  ];
  $('#exSteps').innerHTML = STEPS.map((s, i) => `<div class="ex-step" data-i="${i}"><span class="n">${i + 1}</span><b>${s[0]}</b><p>${s[1]}</p></div>`).join('');
  const exP = $('#exPoster');
  exP.innerHTML = renderPoster();
  const secs = [...exP.querySelectorAll('.kp-sec')], steps = [...document.querySelectorAll('.ex-step')];
  const exSec = $('#inside');
  let lastActive = -1;
  function explode() {
    const r = exSec.getBoundingClientRect(), total = exSec.offsetHeight - innerHeight;
    const p = Math.min(Math.max(-r.top / total, 0), 1);
    const stageH = exP.parentElement.clientHeight, kp = exP.firstElementChild, H = kp.offsetHeight;
    const S = Math.min(stageH / 1500, .5);
    const e = Math.min(Math.max((p - .02) / .16, 0), 1), ee = 1 - Math.pow(1 - e, 3);
    const rx = 16 + ee * 42, rz = -6 - ee * 28 + p * 8;
    const active = p < .14 ? -1 : Math.min(Math.floor((p - .14) / .84 * STEPS.length), STEPS.length - 1);
    // 镜头跟随：把当前版块平移到画面中央（在海报平面内平移）
    const focus = secs[Math.max(active, 0)], fy = focus.offsetTop + focus.offsetHeight / 2;
    const ty = (H / 2 - fy) * (active < 0 ? ee * .6 : 1);
    exP.style.transform = `translate(-50%, calc(-50% + ${ee * 70}px)) scale(${S}) rotateX(${rx}deg) rotateZ(${rz}deg) translateY(${ty}px)`;
    secs.forEach((s, i) => {
      const lift = ee * i * 90 + (i === active ? 150 : 0);
      s.style.transform = `translateZ(${lift}px)`;
      s.classList.toggle('dim', active >= 0 && i !== active);
      s.classList.toggle('on', i === active);
    });
    if (active !== lastActive) { lastActive = active; steps.forEach((s, i) => s.classList.toggle('on', i === active)); }
  }
  addEventListener('scroll', explode, { passive: true }); addEventListener('resize', explode); explode();
  LP.explodeTo = i => { const total = exSec.offsetHeight - innerHeight; scrollTo(0, exSec.offsetTop + total * (.14 + (i + .5) / STEPS.length * .84)); };

  // ---------- 3D 盘面说明 ----------
  const SIDE = {
    kline: ['个股：K 线 + 期权 CP', '前面的紫色管子是 CP 比（Call / Put 成交比），后面的淡紫色带是这只股票自己的常态区间。管子冲出色带，就是日报里说的"CP 偏离"。', [['#0fb57b', '上涨日'], ['#e8364a', '下跌日'], ['#5b4cff', 'CP 比']]],
    intra: ['全市场分时', '把一天切成 13 个 30 分钟：柱子越高成交越多；绿色表示这半小时的 CP 高于全天，情绪更偏 Call。', [['#0fb57b', 'CP 高于全天'], ['#cfd3df', '低于全天']]],
    heat: ['AI 环节热度', '8 层产业链各一根柱子，柱高 = 热度（成员期权量倍数的中位数），柱顶是日报海报里代表这一层的小物件。', CL.layers.map(L => [L.color, L.name])],
  };
  let onBoard = () => {};
  LP.onBoard = fn => { onBoard = fn; };
  function side(v) {
    const [t, p, lg] = SIDE[v];
    $('#boardSide').innerHTML = `<div class="card"><h3>${t}</h3><p>${p}</p><div class="legend-row">${lg.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div></div>
      <div class="card"><h3>日报里对应的位置</h3><p>${{ kline: '"AI 链重点"里每只票的 CP 偏离条和 LEAP 趋势。', intra: '"大盘 CP 与全市场分时"版块。', heat: '"三个大数字"里的最热环节，以及"AI 环节热度"排行。' }[v]}</p>
      <a class="btn ghost" style="margin-top:14px" href="#inside" onclick="LP.explodeTo(${{ kline: 3, intra: 5, heat: 4 }[v]});return false">在日报里看 →</a></div>`;
  }
  document.querySelectorAll('#boardSeg button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#boardSeg button').forEach(x => x.classList.toggle('on', x === b));
    side(b.dataset.v); onBoard(b.dataset.v);
  });
  side('kline');

  // ---------- 生成流程 ----------
  const FLOW = [
    ['switches', '#00a8c6', '15:00', '源站出数据', '每日期权成交：成交量前 100 的股票，约占全市场 85%'],
    ['chip', '#5b4cff', '15:05', '代码算指标', '20 日对比、CP 偏离、LEAP 趋势、环节热度，数字全部由代码算'],
    ['robot', '#a04cf5', '15:10', 'AI 写解读', '读数据简报、查新闻，写中文短报告；只能引用数字，不能改'],
    ['rack', '#1296f0', '15:30', '自动核对', '检查数字是否原样、方向有没有写反；不通过就重写'],
    ['datacenter', '#ff6b2c', '15:40', '推送到手机', '海报 + 文字版送达；周日上午另发周报'],
  ];
  const isoIcon = (kind, c) => { const B = new ISO.Iso(); ISO.DRAW[kind].fn(B, ISO.palette(c, 'light', .22)); const vb = B.viewBox(10); return `<svg viewBox="${vb}">${B.out()}</svg>`; };
  $('#flow').innerHTML = FLOW.map(([k, c, t, b, p]) => `<div class="fstep" style="--c:${c}"><div class="ico">${isoIcon(k, c)}</div><span class="tm">${t}</span><b>${b}</b><p>${p}</p></div>`).join('');

  // ---------- 样张 ----------
  $('#sampleA').insertAdjacentHTML('afterbegin', renderPoster());
  $('#sampleB').insertAdjacentHTML('afterbegin', `<div style="position:absolute;left:50%;top:40px;transform:translateX(-50%);width:420px;padding:24px 26px;border-radius:26px;background:var(--card);border:1.5px solid var(--line);font-size:14.5px;line-height:1.85;color:var(--ink2)">
    <b style="font-size:17px;color:var(--ink)">📊 期权概览 · 10月30日</b><br>
    大盘：<b style="color:var(--bull)">偏乐观</b>（全市场 CP 0.90，常态 0.78）<br>
    最热环节：光模块 2.3x（LITE、COHR、CIEN）<br><br>
    <b style="color:var(--ink)">AI 链重点</b><br>
    ① <b style="color:var(--ink)">LITE</b> 偏多 · 可信度高 — 量 2.8x，CP 高于常态 68%；光模块龙头上调季度指引<br>
    ② <b style="color:var(--ink)">NVDA</b> 偏多 · 可信度中 — 量 1.4x，CP +22%；新平台量产时间表公布<br>
    ③ <b style="color:var(--ink)">SMCI</b> 偏空 · 可信度中 — 量 2.1x，CP −35%；财报前 Put 放大<br><br>
    观察：MU、CRWV<br>
    <span style="color:var(--ink3)">—— 期权数据面倾向，不构成投资建议</span></div>`);

  const RR = [['NVDA', '机构 A', '中性 → 增持', 145, 165, ['数据中心收入占比继续提升', '新平台量产节奏早于此前披露', '毛利率假设上调 1 个百分点']],
    ['MU', '机构 B', '维持 增持', 135, 160, ['HBM 产能扩建进度加快', '存储价格环比回升']], ['ANET', '机构 C', '增持 → 中性', 140, 128, ['估值已反映多数预期']]];
  $('#sampleC').insertAdjacentHTML('afterbegin', `<div class="rr-sheet"><b class="rr-t">📑 研报日报 · 10月30日</b><div class="rr-s">今日 9 条评级 / 目标价调整，摘录 3 条</div>
    ${RR.map(([t, f, rt, a, b, pts]) => { const c = CL.byT[t], col = CL.layers[c.li].color, up = b >= a; return `<div class="rr-item"><div class="rr-h">${badge(c, 30, col)}<b class="num">${t}</b><span>${f} · ${rt}</span><span class="pill ${up ? 'bull' : 'bear'}">${a} → ${b}</span></div><ul>${pts.map(x => `<li>${x}</li>`).join('')}</ul></div>`; }).join('')}
    <div class="rr-f">摘要整理自机构公开报告，不构成投资建议</div></div>`);


  // ---------- 进入视口时淡入 ----------
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); if (e.target.id === 'flow') e.target.style.setProperty('--p', 1); } }), { threshold: .2 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
