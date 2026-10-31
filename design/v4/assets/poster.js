/*
 * 潮信 · 晚潮海报复刻（落地页展示用；海报署名仍为 KZG 期权 Pro）
 * 版块与样式按 KZG 期权 Pro 日报（kzg-option-brief/src/poster.js、docs/poster-style.md）：
 * 标题区 → 三个大数字 → 热点事件 → AI 链重点 → AI 环节热度 → 全市场分时 → 页脚
 * 全部为虚构示例数据。renderPoster() 返回 1080 宽的海报 HTML，每个版块带 data-sec 序号，供"拆开日报"使用。
 */
(function () {
  const { mix } = ISO;
  const W = '#ffffff', K = '#000000';
  const deep = c => mix(c, K, 0.18);
  const CATS = ['#5b4cff', '#1296f0', '#ff6b2c', '#00a8c6', '#a04cf5', '#f0347f'];
  const BULL = '#0fb57b', BEAR = '#e8364a';
  const L = t => CL.byT[t] ? CL.byT[t].logo : '';
  const badge = (t, size, color) => `<span class="badge" style="--bs:${size}px;--c:${deep(color)};--ring:${mix(color, W, .7)}"><i>${t[0]}</i>${L(t) ? `<img src="${L(t)}" alt="" crossorigin="anonymous" onerror="this.remove()">` : ''}</span>`;
  const pill = (dir, sm) => `<span class="kp-pill ${/偏多|偏乐观/.test(dir) ? 'bull' : /偏空|偏谨慎/.test(dir) ? 'bear' : 'flat'}${sm ? ' sm' : ''}">${dir}</span>`;
  const dots = c => { const n = { 高: 3, 中: 2, 低: 1 }[c]; return `<span class="kp-dots">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}<em>可信度${c}</em></span>`; };
  const tone = (c, d) => `linear-gradient(${d || '90deg'},${mix(c, W, .32)},${c})`;
  function dev(v) {
    const w = Math.min(Math.abs(v) / .6, 1) * 50, up = v > 0;
    return `<div class="kp-dev"><div class="kp-track"><span class="tick" style="left:20%"></span><span class="tick" style="left:80%"></span>
      <span class="fill" style="${up ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`};background:${up ? tone(BULL) : tone(BEAR, '270deg')}"></span><span class="mid"></span></div>
      <b style="color:${deep(up ? BULL : BEAR)}">${up ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%</b></div>`;
  }
  const SEG = { '光模块': CATS[0], 'GPU/加速器': CATS[1], 'AI服务器': CATS[2], '存储': CATS[3], '电力/散热': CATS[4], 'GPU/算力云': CATS[5] };

  const picks = [
    { t: 'LITE', seg: '光模块', dir: '偏多', conf: '高', rank: 18, vx: 2.8, px: 3.1, cp: .68, leap: 'LEAP Call 占比连续 3 天上升', why: '光模块龙头上调季度指引，Call 成交集中在远月合约。', hot: 'Call 25 · 26/01/16 到期 · 远月' },
    { t: 'NVDA', seg: 'GPU/加速器', dir: '偏多', conf: '中', rank: 1, vx: 1.4, px: 1.6, cp: .22, leap: 'LEAP 持平', why: '新一代平台量产时间表公布，成交量为 20 日均值的 1.4 倍。', hot: 'Call 190 · 11/07 到期' },
    { t: 'SMCI', seg: 'AI服务器', dir: '偏空', conf: '中', rank: 27, vx: 2.1, px: 2.4, cp: -.35, leap: 'LEAP Put 占比上升', why: '财报日前 Put 成交放大，CP 明显低于常态。', hot: 'Put 30 · 11/07 到期' },
  ];
  const heat = [['光模块', 2.3, 'LITE COHR CIEN', .21], ['GPU/加速器', 1.8, 'NVDA AMD', .12], ['存储', 1.7, 'MU SNDK WDC', .08], ['电力/散热', 1.6, 'VRT ETN', -.05], ['GPU/算力云', 1.5, 'CRWV IREN NBIS', .1], ['AI服务器', 1.3, 'SMCI DELL', -.18]];
  const intra = [[.62, .84], [.95, .91], [.74, .88], [.58, .86], [.52, .83], [.49, .9], [.55, .92], [.6, .95], [.57, .89], [.66, .94], [.78, .97], [.88, 1.02], [1, 1.05]];

  window.renderPoster = function () {
    const maxHeat = 2.3;
    return `<div class="kp">
      <div class="kp-bgobj">${(() => { const B = new ISO.Iso(); const q = { body: { t: mix('#5b4cff', W, .95), l: mix('#5b4cff', W, .9), r: mix('#5b4cff', W, .84) }, core: { t: mix('#5b4cff', W, .88), l: mix('#5b4cff', W, .8), r: mix('#5b4cff', W, .72) }, pin: { t: mix('#5b4cff', W, .91), l: mix('#5b4cff', W, .85), r: mix('#5b4cff', W, .79) }, inner: mix('#5b4cff', W, .84), dark3: { t: mix('#5b4cff', W, .78), l: mix('#5b4cff', W, .7), r: mix('#5b4cff', W, .62) } }; ISO.DRAW.switches.fn(B, q); return `<svg viewBox="-150 -170 380 300" width="620">${B.out()}</svg>`; })()}</div>
      <section class="kp-sec" data-sec="0">
        <div class="kp-eyebrow"><span>KZG 期权 Pro · 日报</span><span class="kp-etag">美东 10月30日 周四</span></div>
        <h1 class="kp-title"><span class="t1">10月30日 · 大盘偏乐观</span><span class="t2">光模块 Call 集中放量</span>
        <span class="t3">全市场 CP 高于常态 15%，资金集中在网络与光、芯片两层；LITE、COHR 成交量超过常态 2 倍。</span></h1>
      </section>
      <section class="kp-sec kp-kpis" data-sec="1">
        <div class="kp-card kpi"><div class="l">全市场情绪</div><div class="v">0.90 ${pill('偏乐观')}</div>${dev(.15)}<div class="d">CP 对比 20 日常态 <b>0.78</b></div></div>
        <div class="kp-card kpi"><div class="l">最强信号</div><div class="v">${badge('LITE', 52, SEG['光模块'])}LITE ${pill('偏多')}</div>${dots('高')}<div class="d">量 <b>2.8x</b> · 权利金 <b>3.1x</b></div></div>
        <div class="kp-card kpi"><div class="l">最热 AI 环节</div><div class="v" style="color:${deep(SEG['光模块'])}">2.3x</div><div class="logos">${'LITE COHR CIEN'.split(' ').map(t => badge(t, 38, SEG['光模块'])).join('')}</div><div class="d">光模块 · 在榜 3 只</div></div>
      </section>
      <section class="kp-sec kp-card" data-sec="2">
        <div class="kp-h"><h3>热点事件</h3><span class="kp-sub">消息面</span></div>
        <div class="kp-ev"><span class="no">1</span><p>光模块龙头上调季度营收指引，称数据中心 800G 需求超预期<span class="src">公司公告</span><span class="chip">LITE</span><span class="chip">COHR</span></p></div>
        <div class="kp-ev"><span class="no">2</span><p>新一代 GPU 平台公布量产时间表<span class="src">示例媒体</span><span class="chip">NVDA</span></p></div>
      </section>
      <section class="kp-sec kp-card" data-sec="3">
        <div class="kp-h"><h3>AI 链重点</h3><span class="kp-sub">期权数据面 + 消息面</span></div>
        ${picks.map(p => `<div class="kp-pick">
          <div class="ph">${badge(p.t, 64, SEG[p.seg])}<div><b class="sym">${p.t}</b><span class="kp-seg" style="background:${SEG[p.seg]}">${p.seg}</span><div class="rk">成交排名 #${p.rank}</div></div><div class="pr">${pill(p.dir)}${dots(p.conf)}</div></div>
          <div class="nums"><span>量 <b>${p.vx}x</b></span><span>权利金 <b>${p.px}x</b></span><span>${p.leap}</span></div>
          <div class="cp"><span>CP 对比常态</span>${dev(p.cp)}</div>
          <div class="hot">最热合约 <b>${p.hot}</b></div>
          <p class="why">${p.why}</p></div>`).join('')}
      </section>
      <section class="kp-sec kp-card" data-sec="4">
        <div class="kp-h"><h3>AI 环节热度</h3><span class="kp-sub">热度 = 成员量倍数中位数</span></div>
        ${heat.map(([s, h, ts, d]) => `<div class="kp-rk"><span class="kp-seg" style="background:${SEG[s]}">${s}</span><div class="bar"><i style="width:${h / maxHeat * 100}%;background:${tone(SEG[s])}"></i></div>
          <div class="logos">${ts.split(' ').map(t => badge(t, 34, SEG[s])).join('')}</div><div class="rv"><b>${h}x</b><small class="${d >= 0 ? 'up' : 'down'}">CP ${d >= 0 ? '+' : '−'}${Math.round(Math.abs(d) * 100)}%</small></div></div>`).join('')}
      </section>
      <section class="kp-sec kp-card" data-sec="5">
        <div class="kp-h"><h3>大盘 CP 与全市场分时</h3><span class="kp-sub">每 30 分钟一根 · 绿 = 高于全天 CP</span></div>
        <div class="kp-intra">${intra.map(([v, cp], i) => `<div><span>${cp.toFixed(2)}</span><i style="height:${v * 150}px;background:${cp > .9 ? tone(BULL, '0deg') : tone('#b8bdc8', '0deg')}"></i><em>${['9:30', '', '10:30', '', '11:30', '', '12:30', '', '13:30', '', '14:30', '', '15:30'][i]}</em></div>`).join('')}</div>
      </section>
      <section class="kp-sec kp-foot" data-sec="6">
        <div>数据：KZG Option House 每日成交前 100 · 对比 20 日常态<br>消息：公司公告、主流媒体 · 徽标仅用于识别</div>
        <div class="mark">示例样张<br><b>KZG 期权 Pro</b></div>
        <div class="warn">期权数据面倾向，不构成任何投资建议。</div>
      </section>
    </div>`;
  };
})();
