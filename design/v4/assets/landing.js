/* ChainLens v4 · 落地页交互：手机里的日报、拆开日报（滚动爆炸图）、流程、样张、订阅 */
(function () {
  const $ = s => document.querySelector(s);
  const LP = window.LP = {};

  // ---------- 订阅（设计稿演示：只切换状态，不发送） ----------
  LP.subscribe = form => { form.closest('.sub-wrap').classList.add('sub-done'); return false; };
  addEventListener('scroll', () => $('#nav').classList.toggle('scrolled', scrollY > 10), { passive: true });

  // ---------- 手机里自动滚动的日报 ----------
  const feed = $('#feed');
  feed.innerHTML = `<div class="feed-z">${renderPoster()}</div>`;
  const fitFeed = () => feed.style.setProperty('--travel', Math.max(feed.offsetHeight - feed.parentElement.clientHeight + 24, 0) + 'px');
  requestAnimationFrame(fitFeed);
  document.fonts && document.fonts.ready.then(fitFeed);

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

  // ---------- 订阅区插画 ----------
  (() => { const B = new ISO.Iso(); ISO.DRAW.robot.fn(B, ISO.palette('#5b4cff', 'light')); $('#ctaArt').innerHTML = `<svg viewBox="-170 -260 360 360" width="380">${B.out()}</svg>`; })();

  // ---------- 进入视口时淡入 ----------
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); if (e.target.id === 'flow') e.target.style.setProperty('--p', 1); } }), { threshold: .2 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
