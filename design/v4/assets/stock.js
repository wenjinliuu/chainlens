/*
 * 潮信 · 看盘工具页（个股）
 * - 行情、期权、研报、新闻全部是【虚构示例】：按代码做种子生成，刷新后不变
 * - 指标计算复用 design/v2/assets/indicators.js（window.IND）；公司、环节、颜色、logo 复用 design/v3/assets/data.js（window.CL）
 * - 期权数据面（CP 偏离、量倍数、LEAP 趋势、数据面倾向）按期权日报（kzg-option-brief）的口径虚构；
 *   正式版直接读取期权日报的计算结果，不在本站重算
 * - 图表：TradingView Lightweight Charts v5，保留 TradingView 署名（attributionLogo）
 * - 普通脚本，不用 ES module，设计稿可以直接双击用 file:// 打开
 */
(function () {
  'use strict';
  const LC = window.LightweightCharts;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const { mix } = ISO;
  const deep = c => mix(c, '#000000', .18);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const END = '2026-10-30', NBARS = 520;
  const FONT = '"Plus Jakarta Sans", "Noto Sans SC", -apple-system, sans-serif';
  // 绿涨红跌：图形用主色，文字用加 18% 黑
  const UP = '#0fb57b', DN = '#e8364a', UPD = '#0c9465', DND = '#be2c3d';
  // 指标线用分类色（避开涨跌红绿）
  const COL = { ma5: '#f5a314', ma10: '#00a8c6', ma20: '#d23fd8', ma60: '#2b6cf2', boll: '#a04cf5', tgt: '#1296f0', cp: '#5b4cff', vma: '#8e91a7', k: '#f5a314', d: '#00a8c6', j: '#d23fd8' };
  // 事件：期权 = 期权日报靛紫，研报 = 研报天蓝，新闻 = 珊瑚橙
  const EV = { o: { c: '#5b4cff', n: '期权', l: '期' }, r: { c: '#1296f0', n: '研报', l: '研' }, n: { c: '#ff6b2c', n: '新闻', l: '闻' }, e: { c: '#f5a314', n: '财报', l: '财' } };

  const fmt = (v, d = 2) => v == null || !isFinite(v) ? '—' : v.toFixed(d);
  const sgn = v => v > 0 ? '+' : v < 0 ? '−' : '';
  const pct = (v, d = 2) => v == null || !isFinite(v) ? '—' : sgn(v) + Math.abs(v).toFixed(d) + '%';
  const dirc = v => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  const big = v => v >= 1e12 ? (v / 1e12).toFixed(2) + '万亿' : v >= 1e10 ? Math.round(v / 1e8) + '亿' : v >= 1e8 ? (v / 1e8).toFixed(2) + '亿' : v >= 1e4 ? (v / 1e4).toFixed(1) + '万' : String(Math.round(v));
  const md = s => s.slice(5);
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const seedOf = t => [...t].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);

  const badge = (c, size, ring) => `<span class="badge" style="--bs:${size}px;--c:${deep(CL.layers[c.li].color)};--ring:${mix(CL.layers[c.li].color, '#ffffff', .55)};--bw:${ring || 2}px"><i>${c.t[0]}</i>${c.logo ? `<img src="${c.logo}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  const layerTag = L => `<span class="tag seg-tag" style="--c:${L.color}">${String(CL.layers.indexOf(L) + 1).padStart(2, '0')} ${L.name}</span>`;
  const segTag = (L, seg) => `<span class="tag" style="--tc-deep:${deep(L.color)};--tc-bg:${mix(L.color, '#ffffff', .9)}">${seg}</span>`;

  // ---------------------------------------------------------------- 静态资料（示意）
  // 交易所（示意，以交易所公开信息为准）
  const NYSE = new Set('TSM FCX SCCO MP VST GEV OKLO CCJ BE ORCL ANET DELL HPE VRT ETN DLR BABA SNOW NOW COHR CIEN'.split(' '));

  // 上下游关系：[上游, 下游, 关系]，只作示意；正式版以手工维护的关系表为准
  const EDGES = [
    ['ASML', 'TSM', '光刻机'], ['AMAT', 'TSM', '前道设备'], ['LRCX', 'TSM', '刻蚀'], ['KLAC', 'TSM', '量测'], ['ASML', 'INTC', '光刻机'],
    ['AMAT', 'MU', '前道设备'], ['LRCX', 'MU', '刻蚀'], ['KLAC', 'MU', '量测'], ['LRCX', 'SNDK', '刻蚀'],
    ['TSM', 'NVDA', '代工 · 先进封装'], ['TSM', 'AMD', '代工'], ['TSM', 'AVGO', '代工'], ['TSM', 'MRVL', '代工'], ['TSM', 'QCOM', '代工'], ['TSM', 'AAPL', '代工'], ['TSM', 'ALAB', '代工'],
    ['ARM', 'NVDA', '架构授权'], ['ARM', 'QCOM', '架构授权'], ['ARM', 'AAPL', '架构授权'], ['ARM', 'AMZN', '架构授权'],
    ['MU', 'NVDA', 'HBM'], ['MU', 'AMD', 'HBM'], ['SNDK', 'DELL', 'SSD'], ['WDC', 'EQIX', '硬盘'], ['WDC', 'DLR', '硬盘'],
    ['NVDA', 'DELL', 'GPU'], ['NVDA', 'SMCI', 'GPU'], ['NVDA', 'HPE', 'GPU'], ['AMD', 'DELL', 'GPU'], ['NVDA', 'CRWV', 'GPU'], ['NVDA', 'NBIS', 'GPU'],
    ['NVDA', 'ORCL', 'GPU'], ['NVDA', 'MSFT', 'GPU'], ['NVDA', 'META', 'GPU'], ['NVDA', 'TSLA', 'GPU'], ['INTC', 'DELL', 'CPU'],
    ['AVGO', 'GOOGL', 'TPU 定制'], ['AVGO', 'META', '定制芯片'], ['MRVL', 'AMZN', '定制芯片'], ['AVGO', 'ANET', '交换芯片'],
    ['COHR', 'NVDA', '光模块'], ['LITE', 'GOOGL', '光器件'], ['CIEN', 'MSFT', '光传输'], ['CRDO', 'AMZN', '有源电缆'], ['ALAB', 'NVDA', '互连芯片'], ['COHR', 'ANET', '光模块'],
    ['ANET', 'MSFT', '交换机'], ['ANET', 'META', '交换机'], ['CSCO', 'EQIX', '网络设备'],
    ['DELL', 'CRWV', '服务器'], ['SMCI', 'CRWV', '服务器'], ['HPE', 'IREN', '服务器'], ['SMCI', 'APLD', '服务器'],
    ['VRT', 'EQIX', '电源 · 液冷'], ['VRT', 'DLR', '电源 · 液冷'], ['ETN', 'DLR', '配电'], ['ETN', 'CRWV', '配电'], ['VRT', 'CRWV', '液冷'],
    ['FCX', 'ETN', '铜'], ['SCCO', 'ETN', '铜'], ['FCX', 'VRT', '铜'], ['MP', 'TSLA', '稀土磁材'], ['GEV', 'VST', '燃机'], ['CCJ', 'CEG', '铀燃料'],
    ['CEG', 'MSFT', '长期购电'], ['TLN', 'AMZN', '长期购电'], ['VST', 'EQIX', '电力'], ['BE', 'ORCL', '现场供电'], ['OKLO', 'DLR', '电力'], ['CEG', 'IREN', '电力'],
    ['CRWV', 'MSFT', '算力租赁'], ['NBIS', 'MSFT', '算力租赁'], ['IREN', 'MSFT', '算力租赁'], ['CORZ', 'CRWV', '托管'], ['APLD', 'CRWV', '托管'], ['CIFR', 'AMZN', '托管'], ['WULF', 'GOOGL', '托管'],
    ['EQIX', 'ORCL', '托管'], ['DLR', 'GOOGL', '托管'], ['DLR', 'META', '托管'],
    ['MSFT', 'PLTR', '云'], ['AMZN', 'PLTR', '云'], ['AMZN', 'SNOW', '云'], ['QCOM', 'AAPL', '基带芯片'],
  ].filter(e => CL.byT[e[0]] && CL.byT[e[1]]);

  // 研报要点与新闻标题：虚构、脱敏，不对应任何真实研报或报道
  const RP_POINTS = {
    raw: ['铜价假设上调，单位成本假设不变', '新矿区产量爬坡节奏与此前披露一致', '电网与数据中心相关需求占比提升', '资本开支计划小幅上调'],
    energy: ['长期购电协议覆盖率提升', '新增装机时间表提前', '电价假设小幅上调', '数据中心客户签约规模扩大'],
    chip: ['数据中心相关收入占比继续提升', '新平台量产节奏早于此前披露', '毛利率假设上调 1 个百分点', '先进封装产能约束有所缓解'],
    net: ['高速光模块出货量假设上调', '云厂商网络资本开支占比提升', '新一代交换平台进入客户验证', '单价假设维持不变'],
    dc: ['液冷相关订单能见度延长', '交付周期缩短', '在手订单同比增长', '毛利率受产品结构影响小幅波动'],
    compute: ['新签算力合同期限拉长', '上架 GPU 数量假设上调', '融资成本假设下调', '电力容量储备增加'],
    cloud: ['云业务增速假设上调', 'AI 相关收入开始单独披露', '资本开支指引上调', '自研芯片部署规模扩大'],
    app: ['AI 相关订阅收入占比提升', '大客户续约率保持高位', '端侧 AI 功能纳入换机假设', '运营费用率假设下调'],
  };
  const NEWS = {
    raw: ['新矿区项目获得环评批复', '公司更新年度产量指引区间'],
    energy: ['与云厂商签署长期供电协议（以公司公告为准）', '新机组并网时间表更新'],
    chip: ['新一代数据中心平台公布量产时间表', '与亚洲代工厂扩大先进封装合作'],
    net: ['新一代高速光模块开始向客户送样', '公布海外产线扩建计划'],
    dc: ['液冷机柜新产线投产', '获得大型数据中心整机订单（以公司公告为准）'],
    compute: ['新数据中心园区完成首期上架', '签署多年期 GPU 算力租赁合同（以公司公告为准）'],
    cloud: ['云业务上线新的 AI 推理实例', '公布新一代自研芯片部署进度'],
    app: ['发布新版 AI 助手功能', '与行业客户签署平台合作'],
  };
  const NEWS_COMMON = ['公司公布下一季度业绩发布日期', '管理层出席行业会议，介绍产品路线图', '董事会成员变动', '季度业绩电话会要点整理'];
  const isFiling = t => /公布|公告|董事会|并网|批复|指引/.test(t);

  // ---------------------------------------------------------------- 示例数据
  const dailyCache = {};
  const dailyOf = t => dailyCache[t] || (dailyCache[t] = IND.genDaily(t, NBARS, END));
  const stockCache = {};

  function stockData(t) {
    if (stockCache[t]) return stockCache[t];
    const co = CL.byT[t], L = CL.layers[co.li], sig = co.signals;
    const daily = dailyOf(t), n = daily.length, seed = seedOf(t);
    const r = rng(seed * 7 + 13);
    const idx = Object.fromEntries(daily.map((b, i) => [b.time, i]));

    // ---- 期权（虚构）：每日 Call / Put 成交、LEAP Call / Put、权利金 ----
    const oDir = t === 'SMCI' ? -1 : 1;      // 与落地页样张一致：SMCI 偏空，其余有异动的票偏多
    const cp0 = .9 + r() * 1.2, lp0 = 1.1 + r() * 1.3;
    const vol0 = Math.round((Math.sqrt(co.cap) * 9000 + 30000) * (.8 + r() * .4));
    let ar = 0, la = 0;
    const raw = daily.map((b, i) => {
      ar = .35 * ar + gauss(r) * .1; la = .82 * la + gauss(r) * .07;
      return { lnCP: Math.log(cp0) + Math.sin(i / 41 + cp0 * 9) * .1 + ar, vx: Math.exp(gauss(r) * .2 + Math.abs(b.close / b.open - 1) * 9), lnL: Math.log(lp0) + Math.sin(i / 63 + lp0) * .1 + la, pm: Math.exp(gauss(r) * .18) };
    });
    // 历史上的几次异动；今天有没有异动与 data.js 的 signals 保持一致
    const spikes = [[30 + (r() * 20 | 0), -1], [80 + (r() * 30 | 0), 1], [150 + (r() * 40 | 0), r() < .5 ? 1 : -1], [260 + (r() * 60 | 0), 1]];
    if (sig.includes('o')) spikes.push([0, oDir]); else spikes.push([5 + (r() * 12 | 0), r() < .7 ? 1 : -1]);
    // 异动当天：CP 相对前 20 日常态偏离约 3～5 个标准分（期权日报门槛是 2.5σ 且偏离 ≥ ±20%）
    spikes.forEach(([ago, s]) => {
      const i = n - 1 - ago, pv = raw.slice(i - 20, i).map(x => x.lnCP), nm = median(pv), sd = Math.max(median(pv.map(x => Math.abs(x - nm))) * 1.4826, .05);
      raw[i].lnCP = nm + s * Math.max(.3, sd * (3 + r() * 1.6)); raw[i].vx *= 1.5 + r() * .8; raw[i].pm *= 1.1 + r() * .5;
    });
    if (!sig.includes('o')) { const pv = raw.slice(n - 21, n - 1).map(x => x.lnCP); raw[n - 1].lnCP = median(pv) + gauss(r) * .04; }
    if (sig.includes('o')) for (let k = 0; k < 4; k++) raw[n - 1 - k].lnL += oDir * (.42 - k * .06);
    const opt = raw.map((o, i) => {
      const cp = Math.exp(o.lnCP), v = vol0 * o.vx, c = v * cp / (1 + cp);
      const lr = Math.exp(o.lnL), lv = v * (.05 + r() * .03), lc = lv * lr / (1 + lr);
      return { time: daily[i].time, c, p: v - c, v, lc, lp: lv - lc, prem: v * daily[i].close * .018 * o.pm };
    });

    // ---- 研报（虚构）：4 家机构的评级与目标价；区间 = 已覆盖机构最新目标价的最低 / 最高 / 均值 ----
    const RT = ['减持', '中性', '增持'];
    const hasR = sig.includes('r'), lastR = hasR ? 0 : 4 + (r() * 14 | 0);
    // 时间正序：4 家先后首次覆盖，近几个月各自更新一次，最近一条是机构 A
    const plan = [
      [360 + (r() * 30 | 0), '机构 A', 1], [300 + (r() * 30 | 0), '机构 B', 2], [240 + (r() * 30 | 0), '机构 C', 2], [180 + (r() * 30 | 0), '机构 D', 1],
      [110 + (r() * 25 | 0), '机构 C', 2], [60 + (r() * 25 | 0), '机构 D', r() < .5 ? 1 : 2], [lastR + 18 + (r() * 15 | 0), '机构 B', 2], [lastR, '机构 A', hasR ? 2 : 1],
    ];
    const st = {}, pool = RP_POINTS[L.id];
    const reports = plan.map(([ago, inst, rt], k) => {
      const i = n - 1 - ago, px = daily[i].close, prev = st[inst];
      const tp = Math.round(px * (prev ? 1.06 + r() * .14 : 1.08 + r() * .16));
      const action = !prev ? `首次覆盖 · ${RT[rt]}` : prev.rt !== rt ? `${RT[prev.rt]} → ${RT[rt]}` : `维持 ${RT[rt]}`;
      st[inst] = { rt, tp };
      const pts = [0, 1, 2].map(j => pool[(k + j) % pool.length]).slice(0, k % 2 ? 2 : 3);   // 每条 ≤3 个要点
      return { i, date: daily[i].time, inst, action, rt, tp, from: prev ? prev.tp : null, pts };
    });
    const tgt = new Array(n).fill(null), cov = {};
    for (let i = 0, k = 0; i < n; i++) {
      while (k < reports.length && reports[k].i <= i) { cov[reports[k].inst] = reports[k].tp; k++; }
      const v = Object.values(cov);
      if (v.length) tgt[i] = { lo: Math.min(...v), hi: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length };
    }

    // ---- 新闻（虚构）：标题与来源 ----
    const npool = (NEWS[L.id] || []).concat(NEWS_COMMON);
    const nAgos = [sig.includes('n') ? 0 : 1 + (r() * 3 | 0), 6 + (r() * 5 | 0), 14 + (r() * 8 | 0), 31 + (r() * 10 | 0), 55 + (r() * 12 | 0)];
    const news = nAgos.map((ago, k) => {
      const i = n - 1 - ago, title = npool[(k + (sig.includes('n') ? 0 : seed)) % npool.length], kind = isFiling(title) ? '公告' : '媒体';
      const hh = String(6 + (r() * 14 | 0)).padStart(2, '0'), mm = String(r() * 60 | 0).padStart(2, '0');
      return { i, date: daily[i].time, tm: `${hh}:${mm}`, title, kind, src: kind === '公告' ? '公司公告' : '示例媒体' };
    });

    // ---- 财报日（虚构）：每季一次，日期按代码固定；最近 4 次 + 下一次 ----
    const fq = seed % 3; // 财季截止月偏移：0 = 1/4/7/10 月，1 = 2/5/8/11，2 = 3/6/9/12
    const earn = [];
    for (let m = -14; m <= 3; m++) {
      const d = new Date(Date.UTC(2026, 10 + m, 1)); if (((d.getUTCMonth() + 12 - fq) % 3) !== 0) continue;
      d.setUTCDate(18 + (seed % 9)); const wd = d.getUTCDay(); if (wd === 6) d.setUTCDate(d.getUTCDate() + 2); if (wd === 0) d.setUTCDate(d.getUTCDate() + 1);
      earn.push(d.toISOString().slice(0, 10));
    }
    const lastDay = daily[n - 1].time;
    const earnPast = earn.filter(x => x <= lastDay).map(x => { let i = idx[x]; if (i == null) { i = daily.findIndex(b => b.time >= x); if (i < 0) i = n - 1; } return { i, date: daily[i].time, bmo: seed % 2 === 0 }; }).slice(-4);
    const earnNext = earn.find(x => x > lastDay) || null;
    // 最热合约（虚构）：每日成交最多的一张合约，格式同期权日报（Call/Put 行权价 · 到期）
    const hot = daily.map((b, i) => {
      const o = raw[i], call = Math.exp(o.lnCP) >= 1, k = Math.round(b.close * (call ? 1.02 + r() * .08 : .9 + r() * .08) / 5) * 5;
      const dte = r() < .35 ? 1 + (r() * 6 | 0) : r() < .6 ? 8 + (r() * 22 | 0) : 31 + (r() * 160 | 0);
      const exp = new Date(b.time + 'T00:00:00Z'); exp.setUTCDate(exp.getUTCDate() + dte);
      return { call, k, dte, exp: exp.toISOString().slice(5, 10).replace('-', '/'), share: .06 + r() * .1 };
    });
    const S = { t, co, L, daily, idx, opt, reports, tgt, news, earnPast, earnNext, hot };
    S.od = optStats(daily, S, 'D');

    // ---- 事件：期权异动按期权日报规则（|标准分| ≥ 2.5 且偏离至少 ±20%）由代码判定 ----
    const events = [];
    S.od.forEach((o, i) => { if (isSig(o)) events.push({ i, k: 'o', title: `期权异动 · CP 比 ${fmt(o.cp)}`, detail: `常态 ${fmt(o.norm)}，${sgn(o.z)}${Math.abs(o.z).toFixed(1)}σ` }); });
    reports.forEach(x => events.push({ i: x.i, k: 'r', title: `${x.inst} ${x.action}`, detail: `目标价 ${x.from ? x.from + ' → ' : ''}${x.tp}` }));
    news.forEach(x => events.push({ i: x.i, k: 'n', title: x.title, detail: x.src }));
    earnPast.forEach(x => events.push({ i: x.i, k: 'e', title: `财报发布 · ${x.bmo ? '盘前' : '盘后'}`, detail: `季度业绩${x.bmo ? '盘前' : '盘后'}公布，当日期权成交 ${fmt(S.od[x.i].vx, 1)}x` }));
    S.events = events.sort((a, b) => a.i - b.i);
    return (stockCache[t] = S);
  }
  const isSig = o => o.z != null && Math.abs(o.z) >= 2.5 && Math.abs(o.dev) >= .2;

  // 期权统计：按周期聚合后，对比前 W 期（日 20 / 周 12 / 月 6）的常态
  function optStats(bars, S, period) {
    const W = { D: 20, W: 12, M: 6 }[period];
    let agg = S.opt;
    if (period !== 'D') {
      agg = []; let j = 0;
      bars.forEach(b => { const a = { time: b.time, c: 0, p: 0, v: 0, lc: 0, lp: 0, prem: 0 };
        while (j < S.opt.length && S.opt[j].time <= b.time) { const o = S.opt[j++]; a.c += o.c; a.p += o.p; a.v += o.v; a.lc += o.lc; a.lp += o.lp; a.prem += o.prem; }
        agg.push(a); });
    }
    const cp = agg.map(a => a.c / a.p);
    const l5 = agg.map((_, i) => { let c = 0, p = 0; for (let k = Math.max(0, i - 4); k <= i; k++) { c += agg[k].lc; p += agg[k].lp; } return c / p; });
    return agg.map((a, i) => {
      const o = { time: a.time, cp: cp[i], l5: l5[i], v: a.v };
      if (i >= W) {
        const prev = cp.slice(i - W, i), norm = median(prev);
        const sd = Math.max(median(prev.map(x => Math.abs(Math.log(x / norm)))) * 1.4826, .05);
        const mv = agg.slice(i - W, i), avgV = mv.reduce((s, x) => s + x.v, 0) / W, avgP = mv.reduce((s, x) => s + x.prem, 0) / W;
        Object.assign(o, { norm, sd, lo: norm * Math.exp(-sd), hi: norm * Math.exp(sd), z: Math.log(cp[i] / norm) / sd, dev: cp[i] / norm - 1, vx: a.v / avgV, px: a.prem / avgP });
      }
      if (i >= W + 4) {
        const prev = l5.slice(i - W, i), nm = median(prev), sd = Math.max(median(prev.map(x => Math.abs(Math.log(x / nm)))) * 1.4826, .03);
        Object.assign(o, { lNorm: nm, lTrend: l5[i] / nm - 1, lz: Math.log(l5[i] / nm) / sd });
      }
      return o;
    });
  }

  // 数据面倾向（示例，按期权日报口径）：CP 信号 + LEAP 信号，同向或只有一个 → 偏多 / 偏空；相反 → 分歧
  function eveJudge(S) {
    const o = S.od[S.od.length - 1];
    const cpS = isSig(o) ? Math.sign(o.z) : 0;
    const lS = o.lz != null && Math.abs(o.lz) >= 2 && Math.abs(o.lTrend) >= .2 ? Math.sign(o.lz) : 0;
    let dir = cpS || lS, split = cpS && lS && cpS !== lS, conf = 1;
    if (split) { dir = 0; conf = 0; }
    else if (!dir) conf = 0;
    else {
      if (cpS && lS) conf++;
      if (o.vx >= 1.5 && o.px >= 1.5) conf++;
      if (o.vx >= 1.5 && o.px < 1.2) conf--;
      conf = clamp(conf, 0, 2);
    }
    const label = split ? '分歧' : dir > 0 ? '偏多' : dir < 0 ? '偏空' : '方向不明';
    return { o, cpS, lS, dir, split, conf, label };
  }

  // ---------------------------------------------------------------- 色带插件（Lightweight Charts v5 series primitive）
  // 在两条价格之间填色：研报目标价区间（阶梯）、BOLL 通道、CP 常态 ±1σ；画在 K 线和折线下面
  // 竖线图元：财报日（虚线 + 顶部小标签）
  class VLines {
    constructor(items, o) { this.items = items; this.o = o; const self = this; this.views = [{ zOrder: () => 'bottom', renderer: () => ({ draw: t => self.draw(t) }) }]; }
    attached(p) { this.chart = p.chart; } detached() { this.chart = null; } paneViews() { return this.views; }
    draw(target) {
      if (!this.chart) return; const ts = this.chart.timeScale(), o = this.o;
      target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
        this.items.forEach(it => {
          const x = ts.logicalToCoordinate(it.i); if (x == null || x < 0 || x > mediaSize.width) return;
          ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mediaSize.height); ctx.stroke(); ctx.setLineDash([]);
          const w = ctx.measureText(it.label).width + 10; ctx.font = '700 10px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
          ctx.fillStyle = o.color; ctx.beginPath(); ctx.roundRect(x - w / 2, 4, w, 16, 5); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.label, x, 12);
        });
      });
    }
  }
  class Band {
    constructor(pts, o) {
      this.pts = pts; this.o = o;
      const self = this;
      this.views = [{ zOrder: () => 'bottom', renderer: () => ({ draw: t => self.draw(t) }) }];
    }
    attached(p) { this.chart = p.chart; this.series = p.series; }
    detached() { this.chart = this.series = null; }
    paneViews() { return this.views; }
    autoscaleInfo(a, b) {
      if (!this.o.autoscale) return null;
      let mn = Infinity, mx = -Infinity;
      for (let i = Math.max(0, Math.floor(a)); i <= Math.min(this.pts.length - 1, Math.ceil(b)); i++) { const p = this.pts[i]; if (p) { mn = Math.min(mn, p.lo); mx = Math.max(mx, p.hi); } }
      return mn < mx ? { priceRange: { minValue: mn, maxValue: mx } } : null;
    }
    draw(target) {
      if (!this.chart) return;
      const ts = this.chart.timeScale(), s = this.series, o = this.o, pts = this.pts;
      const vr = ts.getVisibleLogicalRange(); if (!vr) return;
      const i0 = Math.max(0, Math.floor(vr.from) - 1), i1 = Math.min(pts.length - 1, Math.ceil(vr.to) + 1);
      const xa = ts.logicalToCoordinate(i0), xb = ts.logicalToCoordinate(i0 + 1);
      const half = xa != null && xb != null ? (xb - xa) / 2 : 3;
      target.useMediaCoordinateSpace(({ context: ctx }) => {
        let seg = [];
        const path = key => seg.forEach((p, k) => k ? ctx.lineTo(p.x, p[key]) : ctx.moveTo(p.x, p[key]));
        const flush = () => {
          if (seg.length > 1) {
            ctx.beginPath(); path('a');
            for (let k = seg.length - 1; k >= 0; k--) ctx.lineTo(seg[k].x, seg[k].b);
            ctx.closePath(); ctx.fillStyle = o.fill; ctx.fill();
            if (o.edge) {
              ctx.strokeStyle = o.edge; ctx.lineWidth = 1; ctx.setLineDash(o.dash || []);
              ctx.beginPath(); path('a'); ctx.stroke(); ctx.beginPath(); path('b'); ctx.stroke(); ctx.setLineDash([]);
            }
          }
          seg = [];
        };
        for (let i = i0; i <= i1; i++) {
          const p = pts[i]; if (!p) { flush(); continue; }
          const x = ts.logicalToCoordinate(i), a = s.priceToCoordinate(p.hi), b = s.priceToCoordinate(p.lo);
          if (x == null || a == null || b == null) { flush(); continue; }
          if (o.step) seg.push({ x: x - half, a, b }, { x: x + half, a, b }); else seg.push({ x, a, b });
        }
        flush();
      });
    }
  }

  // ---------------------------------------------------------------- 状态
  const state = { period: 'D', main: new Set(['MA', 'TGT', 'EARN']), sub: ['VOL', 'MACD', 'CP'], ev: new Set(['o', 'r', 'n', 'e']) };
  const SUBS = ['VOL', 'MACD', 'KDJ', 'RSI', 'CP'];
  let S = null, chart = null, isMobile = innerWidth < 640, lastPx = null;

  const fromURL = () => (new URLSearchParams(location.search).get('t') || 'NVDA').toUpperCase();
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); }

  // ---------------------------------------------------------------- 左侧：AI 链公司
  function quoteOf(t) { const d = dailyOf(t), a = d[d.length - 1], b = d[d.length - 2]; return { close: a.close, chg: (a.close / b.close - 1) * 100 }; }
  function renderWatch() {
    $('#wlCount').textContent = CL.companies.length;
    $('#wlList').innerHTML = CL.layers.map((L, li) => `<div class="wl-g" style="--c:${L.color}">
      <div class="wl-gh"><i></i><span class="no">${String(li + 1).padStart(2, '0')}</span>${L.name}<span class="heat" title="环节热度 = 成员期权量倍数中位数">热度 ${L.heat[6].toFixed(1)}x</span></div>
      ${L.members.map(c => { const q = quoteOf(c.t); return `<a class="wl-row" href="?t=${c.t}" data-t="${c.t}">
        ${badge(c, 30)}<span class="tx"><b>${c.t}${c.signals.length ? `<span class="sg">${c.signals.map(k => `<i style="--d:${EV[k].c}" title="今日有${EV[k].n}"></i>`).join('')}</span>` : ''}</b><small>${c.name} · ${c.seg}</small></span>
        <span class="pr"><b>${fmt(q.close)}</b><em class="${dirc(q.chg)}">${pct(q.chg)}</em></span></a>`; }).join('')}
    </div>`).join('') + '<div class="wl-empty" hidden>没有匹配的公司</div>';
    $$('.wl-row').forEach(a => { a.dataset.q = (a.dataset.t + ' ' + CL.byT[a.dataset.t].name).toLowerCase(); a.onclick = e => { e.preventDefault(); select(a.dataset.t, true); }; });
    $('#wlSearch').oninput = e => {
      const q = e.target.value.trim().toLowerCase(); let any = false;
      $$('.wl-g').forEach(g => { let n = 0; $$('.wl-row', g).forEach(a => { const ok = !q || a.dataset.q.includes(q); a.hidden = !ok; n += ok; }); g.hidden = !n; any = any || n > 0; });
      $('.wl-empty').hidden = any;
    };
    $('#wlSearch').onkeydown = e => { if (e.key === 'Enter') { const a = $$('.wl-row').find(x => !x.hidden); if (a) select(a.dataset.t, true); } };
    $$('[data-open-wl]').forEach(b => b.onclick = () => document.body.classList.add('wl-open'));
    $$('[data-close-wl]').forEach(b => b.onclick = () => document.body.classList.remove('wl-open'));
    addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('wl-open'); });
  }
  function markWatch() {
    $$('.wl-row').forEach(a => a.classList.toggle('on', a.dataset.t === S.t));
    // 让当前公司所在的那一组从列表顶部开始；组太长放不下时再把当前行居中
    const on = $('.wl-row.on'), list = $('#wlList');
    if (!on || !list) return;
    let y = on.closest('.wl-g').offsetTop;
    if (on.offsetTop + on.offsetHeight - y > list.clientHeight) y = on.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2;
    list.scrollTop = Math.max(0, y);
  }

  // ---------------------------------------------------------------- 面包屑与报价区
  function renderCrumb() {
    const { co, L } = S;
    $('#crumb').innerHTML = `<a class="c-far" href="index.html">潮信</a><span class="sep c-far">/</span><span class="c-far">看盘</span><span class="sep c-far">/</span><span>${L.name}</span><span class="sep">/</span><span>${co.seg}</span><span class="sep">/</span><b>${co.t}</b>
      <span class="st"><i></i>已收盘 · 美东 10-30 16:00 · 示例数据（正式版行情延迟 15 分钟以上）</span>
      <button class="mini wl-open-btn no-shot" type="button" data-open-wl>☰ 切换股票</button>
      <button class="mini dl no-shot" type="button" id="dlBtn" title="把本页导出为 2 倍高清 PNG">↓ 高清图</button>`;
    $$('#crumb [data-open-wl]').forEach(b => b.onclick = () => document.body.classList.add('wl-open'));
    $('#dlBtn').onclick = () => download($('#dlBtn'));
  }

  // 最热合约（期权日报格式）：近 60 日里期权成交最大的 6 天
  function renderHot() {
    const n = S.daily.length, days = S.daily.map((b, i) => ({ i, v: S.opt[i].v })).slice(n - 60).sort((a, b) => b.v - a.v).slice(0, 6).sort((a, b) => a.i - b.i);
    const el = $('#hotStrip'); if (!el) return;
    el.innerHTML = `<div class="hs-h"><b>最热合约</b><span>近 60 日期权成交最大的 6 天 · 当天成交最多的那张合约 · 示例</span></div><div class="hs-row">` + days.map(({ i, v }) => {
      const h = S.hot[i], tier = h.dte <= 7 ? ['短线', 'flat'] : h.dte <= 30 ? [h.call ? 'Call' : 'Put', h.call ? 'bull' : 'bear'] : [(h.call ? 'Call' : 'Put') + ' · 远月', h.call ? 'bull' : 'bear'];
      const dt = S.daily[i].time, link = window.ARCHIVE && ARCHIVE.byDate[dt];
      return `<${link ? `a href="daily.html?col=eve&d=${dt}" title="看 ${md(dt)} 的期权日报"` : 'div'} class="hs-c${link ? ' link' : ''}"><span class="d num">${md(dt)}${link ? ' ↗' : ''}</span><b class="num">${h.call ? 'Call' : 'Put'} ${h.k}</b><span class="x">${h.exp} 到期 · ${h.dte} 天</span><span class="pill ${tier[1]}">${tier[0]}</span><span class="s">成交 ${big(v)} 张 · 占 ${(h.share * 100).toFixed(0)}%</span></${link ? 'a' : 'div'}>`;
    }).join('') + `</div>`;
  }
  function renderQuote() {
    const { co, L, daily } = S, n = daily.length, a = daily[n - 1], b = daily[n - 2];
    const ch = a.close - b.close, chp = ch / b.close * 100;
    const y1 = daily.slice(-252), hi = Math.max(...y1.map(x => x.high)), lo = Math.min(...y1.map(x => x.low));
    const vr = a.volume / (daily.slice(n - 6, n - 1).reduce((s, x) => s + x.volume, 0) / 5);
    const ov = S.opt[n - 1].v;
    const pos = (a.close - lo) / (hi - lo);
    $('#quote').innerHTML = `
      <div class="q-id">${badge(co, 64, 3)}
        <div><div class="q-t"><b>${co.t}</b><span class="q-ex">${NYSE.has(co.t) ? 'NYSE' : 'NASDAQ'}</span></div>
          <div class="q-n">${co.name}</div>
          <div class="q-tags">${layerTag(L)}${segTag(L, co.seg)}</div></div></div>
      <div class="q-px"><div class="px" id="px">${fmt(a.close)}</div>
        <div class="q-chg"><span class="pill ${chp >= 0 ? 'bull' : 'bear'}">${pct(chp)}</span><b class="${dirc(ch)}">${sgn(ch)}${Math.abs(ch).toFixed(2)}</b><span>USD</span></div>
        <div class="q-time">收盘价 · 美东 ${md(a.time)} 16:00</div></div>
      <div class="q-stats">
        <div><span>开盘</span><b>${fmt(a.open)}</b></div><div><span>最高</span><b>${fmt(a.high)}</b></div><div><span>最低</span><b>${fmt(a.low)}</b></div>
        <div><span>昨收</span><b>${fmt(b.close)}</b></div><div class="c-far"><span>振幅</span><b>${((a.high - a.low) / b.close * 100).toFixed(2)}%</b></div>
        <div><span>成交量</span><b>${big(a.volume)}</b></div><div><span>成交额</span><b>${big(a.volume * a.close)}</b></div>
        <div><span>市值（量级）</span><b>${big(co.cap * 1e9)}</b></div><div><span>量比</span><b>${vr.toFixed(2)}</b></div>
        <div><span>期权成交</span><b>${big(ov)}张</b></div>
        <div class="c-earn"><span>下次财报</span><b>${S.earnNext ? md(S.earnNext) + ' <small>· ' + Math.max(0, Math.round((Date.parse(S.earnNext) - Date.parse(a.time)) / 864e5)) + ' 天后</small>' : '—'}</b></div>
      </div>
      <div class="q-52"><span>52 周区间</span>
        <div class="rbar"><i class="fill" data-w="${(pos * 100).toFixed(1)}"></i><i class="cur" data-l="${(pos * 100).toFixed(1)}"></i></div>
        <span class="lab"><span><b>${fmt(lo)}</b> — <b>${fmt(hi)}</b></span><span>距高点 ${pct((a.close / hi - 1) * 100, 1)}</span></span></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const r = $('#quote .rbar'); $('.fill', r).style.width = $('.fill', r).dataset.w + '%'; $('.cur', r).style.left = $('.cur', r).dataset.l + '%'; }));
    // 价格从上一只票滚动到这一只（动效表达"价格更新了"）
    const el = $('#px'), from = lastPx == null ? a.close * .9 : lastPx, to = a.close; lastPx = to;
    if (calm) return;
    const t0 = performance.now();
    (function f(now) { const k = Math.min((now - t0) / 700, 1), e = 1 - Math.pow(1 - k, 4); el.textContent = (from + (to - from) * e).toFixed(2); if (k < 1) requestAnimationFrame(f); })(t0);
  }

  // ---------------------------------------------------------------- 期权日报 / 研报日报：四个数字
  function spark(vals, opts) {
    const w = 240, h = 36, ok = vals.filter(v => v != null), mn = Math.min(...ok, opts.base != null ? opts.base : Infinity), mx = Math.max(...ok, opts.base != null ? opts.base : -Infinity);
    const X = i => i / (vals.length - 1) * w, Y = v => h - 3 - (v - mn) / ((mx - mn) || 1) * (h - 6);
    const d = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${opts.base != null ? `<line x1="0" x2="${w}" y1="${Y(opts.base)}" y2="${Y(opts.base)}" stroke="#b4b7c8" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>` : ''}
      <path d="${d} L${w} ${h} L0 ${h}Z" fill="${rgba(opts.c, .1)}"/>
      <path d="${d}" fill="none" stroke="${opts.c}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${X(vals.length - 1)}" cy="${Y(vals[vals.length - 1])}" r="3.5" fill="#fff" stroke="${opts.c}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function bars20(vals) {
    const w = 240, h = 36, mx = Math.max(2.2, ...vals), bw = w / vals.length;
    const Y = v => h - v / mx * h;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${vals.map((v, i) => `<rect x="${(i * bw + 1.5).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${(h - Y(v)).toFixed(1)}" rx="2" fill="${i === vals.length - 1 ? '#5b4cff' : v >= 1.5 ? '#a59cff' : '#dcd8ff'}"/>`).join('')}
      <line x1="0" x2="${w}" y1="${Y(1)}" y2="${Y(1)}" stroke="#8e91a7" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function devBar(dev) {
    const k = clamp(dev / .6, -1, 1) * 50, c = dev >= 0 ? UP : DN;
    const g = `linear-gradient(${dev >= 0 ? 90 : 270}deg, ${mix(c, '#ffffff', .32)}, ${c})`;
    return `<div class="dev"><i class="b" style="left:${dev >= 0 ? 50 : 50 + k}%;width:${Math.abs(k)}%;background:${g}"></i>
      <span class="t" style="left:25%">−30%</span><span class="t" style="left:50%">常态</span><span class="t" style="left:75%">+30%</span></div>`;
  }
  const volTag = v => v >= 2 ? ['强异动', '#c27a00', '#fff4dc'] : v >= 1.5 ? ['温和放大', '#4b3ed1', '#efedff'] : v <= .6 ? ['降温', '#6f7487', '#eef0f4'] : ['常态', '#6f7487', '#eef0f4'];

  function renderKpis() {
    const o = S.od[S.od.length - 1], n = S.daily.length, last = S.daily[n - 1];
    const cpS = isSig(o), zp = `${sgn(o.z)}${Math.abs(o.z).toFixed(1)}σ`;
    const vt = volTag(o.vx);
    const lS = o.lz != null && Math.abs(o.lz) >= 2 && Math.abs(o.lTrend) >= .2;
    const tg = S.tgt[n - 1];
    const lo = Math.min(tg.lo, last.close) * .96, hi = Math.max(tg.hi, last.close) * 1.04, P = v => ((v - lo) / (hi - lo) * 100).toFixed(1) + '%';
    $('#kpis').innerHTML = `
      <div class="card kpi" style="--k:${COL.cp}"><div class="l"><i></i>期权 CP 比<span class="src">期权日报</span></div>
        <div class="v">${fmt(o.cp)}<span class="pill ${cpS ? (o.z > 0 ? 'bull' : 'bear') : 'flat'}">${zp}</span></div>
        ${devBar(o.dev)}<div class="d">常态 <b>${fmt(o.norm)}</b> · 偏离 <b>${pct(o.dev * 100, 0)}</b> · 对比前 20 日</div></div>
      <div class="card kpi" style="--k:${COL.cp}"><div class="l"><i></i>期权量倍数<span class="src">期权日报</span></div>
        <div class="v">${fmt(o.vx, 1)}x<span class="tag" style="--tc-deep:${vt[1]};--tc-bg:${vt[2]}">${vt[0]}</span></div>
        ${bars20(S.od.slice(-20).map(x => x.vx))}<div class="d">权利金 <b>${fmt(o.px, 1)}x</b> · 近 20 日，虚线 = 1x</div></div>
      <div class="card kpi" style="--k:${COL.cp}"><div class="l"><i></i>LEAP 趋势<span class="src">期权日报</span></div>
        <div class="v">${pct(o.lTrend * 100, 0)}<span class="pill ${lS ? (o.lz > 0 ? 'bull' : 'bear') : 'flat'}">${sgn(o.lz)}${Math.abs(o.lz).toFixed(1)}σ</span></div>
        ${spark(S.od.slice(-60).map(x => x.l5), { c: COL.cp, base: o.lNorm })}<div class="d">近 5 日 LEAP Call/Put <b>${fmt(o.l5)}</b> · 常态 <b>${fmt(o.lNorm)}</b></div></div>
      <div class="card kpi" style="--k:${COL.tgt}"><div class="l"><i></i>研报目标价<span class="src">研报 · ${tg.n} 家</span></div>
        <div class="v">${Math.round(tg.lo)}–${Math.round(tg.hi)}</div>
        <div class="tgt-bar"><i class="band" style="left:${P(tg.lo)};width:calc(${P(tg.hi)} - ${P(tg.lo)})"></i><i class="avg" style="left:${P(tg.avg)}"></i><i class="cur" style="left:${P(last.close)}"></i></div>
        <div class="d">均值 <b>${fmt(tg.avg)}</b> · ${tg.n} 家机构 · ●&nbsp;为现价</div></div>`;
  }

  // ---------------------------------------------------------------- K 线与多窗格指标
  function build(keepRange) {
    if (!LC) return;
    const range = keepRange && chart ? chart.timeScale().getVisibleLogicalRange() : null;
    if (chart) { chart.remove(); chart = null; }
    const P = state.period, bars = P === 'D' ? S.daily : IND.aggregate(S.daily, P);
    const X = IND.compute(bars), O = optStats(bars, S, P);
    const subs = SUBS.filter(s => state.sub.includes(s));
    const m = isMobile = innerWidth < 640;
    const MAIN = m ? 270 : 400, SUBH = m ? { VOL: 76, MACD: 90, KDJ: 86, RSI: 86, CP: 116 } : { VOL: 100, MACD: 116, KDJ: 108, RSI: 108, CP: 140 };
    $('#cw').style.height = (MAIN + subs.reduce((s, k) => s + SUBH[k], 0)) + 'px';

    chart = LC.createChart($('#chart'), {
      autoSize: true,
      layout: { background: { type: 'solid', color: '#ffffff' }, textColor: '#8e91a7', fontFamily: FONT, fontSize: m ? 10 : 11, attributionLogo: true,
        panes: { separatorColor: '#eceef5', separatorHoverColor: 'rgba(91,76,255,.14)', enableResize: true } },
      grid: { vertLines: { color: '#f3f4f8' }, horzLines: { color: '#f3f4f8' } },
      crosshair: { mode: LC.CrosshairMode.Normal,
        vertLine: { color: 'rgba(22,23,42,.3)', width: 1, style: LC.LineStyle.Dashed, labelBackgroundColor: '#16172a' },
        horzLine: { color: 'rgba(22,23,42,.3)', width: 1, style: LC.LineStyle.Dashed, labelBackgroundColor: '#16172a' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: m ? .08 : .16, bottom: .05 } },
      timeScale: { borderColor: '#eceef5', rightOffset: m ? 3 : 6, minBarSpacing: 1.5 },
      handleScroll: { vertTouchDrag: false },
      localization: { locale: 'zh-CN', dateFormat: 'yyyy-MM-dd' },
    });
    const T = bars.map(b => b.time);
    const line = (pane, color, vals, extra) => {
      const s = chart.addSeries(LC.LineSeries, { color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, ...extra }, pane);
      s.setData(vals.map((v, i) => v == null ? { time: T[i] } : { time: T[i], value: v }));
      return s;
    };
    const guide = (s, p) => s.createPriceLine({ price: p, color: '#d5d8e3', lineStyle: LC.LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });

    // ---- 主图 ----
    const candle = chart.addSeries(LC.CandlestickSeries, { upColor: UP, downColor: DN, wickUpColor: UP, wickDownColor: DN, borderVisible: false, priceLineStyle: LC.LineStyle.Dashed }, 0);
    candle.setData(bars.map(b => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close })));
    const map0 = new Array(S.daily.length);
    for (let i = 0, k = 0; i < S.daily.length; i++) { while (k < bars.length - 1 && bars[k].time < S.daily[i].time) k++; map0[i] = k; }
    const tg = bars.map(b => S.tgt[S.idx[b.time]]);
    if (state.main.has('TGT')) {
      candle.attachPrimitive(new Band(tg.map(x => x && { lo: x.lo, hi: x.hi }), { fill: rgba(COL.tgt, .07), edge: rgba(COL.tgt, .55), dash: [4, 3], step: true, autoscale: true }));
      line(0, COL.tgt, tg.map(x => x && x.avg), { lineWidth: 1.5, lineType: LC.LineType.WithSteps, lineStyle: LC.LineStyle.LargeDashed, lastValueVisible: !m, title: m ? '' : '研报均值' });
    }
    if (state.main.has('EARN')) {
      const items = S.earnPast.map(x => ({ i: map0[x.i], label: '财报' }));
      candle.attachPrimitive(new VLines(items, { color: '#ff6b2c' }));
    }
    if (state.main.has('BOLL')) {
      candle.attachPrimitive(new Band(X.boll.map(x => x && { lo: x.dn, hi: x.up }), { fill: rgba(COL.boll, .06) }));
      line(0, rgba(COL.boll, .75), X.boll.map(x => x && x.up), { lineWidth: 1 });
      line(0, COL.boll, X.boll.map(x => x && x.mid), { lineWidth: 1, lineStyle: LC.LineStyle.Dotted });
      line(0, rgba(COL.boll, .75), X.boll.map(x => x && x.dn), { lineWidth: 1 });
    }
    if (state.main.has('MA')) { line(0, COL.ma5, X.ma5); line(0, COL.ma10, X.ma10); line(0, COL.ma20, X.ma20); line(0, COL.ma60, X.ma60); }

    // 事件标记：日 K 直接挂在当天；周 K / 月 K 挂在包含该日的那根 K 线上
    const map = new Array(S.daily.length);
    for (let i = 0, k = 0; i < S.daily.length; i++) { while (k < bars.length - 1 && bars[k].time < S.daily[i].time) k++; map[i] = k; }
    const evAt = {};
    S.events.filter(e => state.ev.has(e.k)).forEach(e => { const k = map[e.i]; (evAt[k] = evAt[k] || []).push(e); });
    const marks = [];
    Object.keys(evAt).map(Number).sort((a, b) => a - b).forEach(k => {
      ['r', 'n', 'o', 'e'].forEach(kind => { if (evAt[k].some(e => e.k === kind) && EV[kind]) marks.push({ time: T[k], position: kind === 'o' ? 'belowBar' : 'aboveBar', color: EV[kind].c, shape: kind === 'e' ? 'square' : 'circle', text: EV[kind].l, size: { D: 1, W: .7, M: .4 }[P] }); });
    });
    LC.createSeriesMarkers(candle, marks);

    // ---- 副图 ----
    subs.forEach((s, si) => {
      const pane = si + 1;
      if (s === 'VOL') {
        const v = chart.addSeries(LC.HistogramSeries, { priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false }, pane);
        v.setData(bars.map(b => ({ time: b.time, value: b.volume, color: b.close >= b.open ? rgba(UP, .5) : rgba(DN, .5) })));
        line(pane, COL.vma, X.vma20, { lineWidth: 1.2 });
      }
      if (s === 'MACD') {
        const h = chart.addSeries(LC.HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
        h.setData(X.macd.map((x, i) => ({ time: T[i], value: x.hist, color: x.hist >= 0 ? rgba(UP, i && x.hist >= X.macd[i - 1].hist ? .8 : .4) : rgba(DN, i && x.hist <= X.macd[i - 1].hist ? .8 : .4) })));
        line(pane, COL.d, X.macd.map(x => x.dif), { lineWidth: 1.3 }); line(pane, COL.k, X.macd.map(x => x.dea), { lineWidth: 1.3 });
      }
      if (s === 'KDJ') {
        const k = line(pane, COL.k, X.kdj.map(x => x.k), { lineWidth: 1.3 }); line(pane, COL.d, X.kdj.map(x => x.d), { lineWidth: 1.3 }); line(pane, COL.j, X.kdj.map(x => x.j), { lineWidth: 1.3 });
        guide(k, 20); guide(k, 80);
      }
      if (s === 'RSI') {
        const r = line(pane, COL.k, X.rsi6, { lineWidth: 1.3 }); line(pane, COL.d, X.rsi12, { lineWidth: 1.3 }); line(pane, COL.j, X.rsi24, { lineWidth: 1.3 });
        guide(r, 30); guide(r, 70);
      }
      if (s === 'CP') {
        // CP 比 + 该股自身常态 ±1σ 色带；|标准分| ≥ 2.5 且偏离 ≥ ±20% 的点标出来（绿 = 高于常态，红 = 低于常态）
        const cpl = line(pane, COL.cp, O.map(x => x.cp), { lineWidth: 1.8, lastValueVisible: true, priceFormat: { type: 'price', precision: 2, minMove: .01 }, crosshairMarkerVisible: true, crosshairMarkerRadius: 3 });
        cpl.attachPrimitive(new Band(O.map(x => x.lo != null ? { lo: x.lo, hi: x.hi } : null), { fill: rgba(COL.cp, .1), autoscale: true }));
        line(pane, rgba(COL.cp, .6), O.map(x => x.norm), { lineWidth: 1, lineStyle: LC.LineStyle.Dotted });
        LC.createSeriesMarkers(cpl, O.map((x, i) => isSig(x) ? { time: T[i], position: 'inBar', color: x.z > 0 ? UP : DN, shape: 'circle', size: { D: .6, W: .45, M: .3 }[P] } : null).filter(Boolean));
      }
    });
    const sizePanes = () => { const ps = chart.panes(); ps[0].setStretchFactor(MAIN); subs.forEach((s, i) => ps[i + 1] && ps[i + 1].setStretchFactor(SUBH[s])); };
    sizePanes();

    const len = bars.length, show = { D: m ? 70 : 130, W: m ? 50 : 90, M: len }[P];
    if (range) chart.timeScale().setVisibleLogicalRange(range);
    else chart.timeScale().setVisibleLogicalRange({ from: Math.max(-1, len - show), to: len + (m ? 2 : 4) });

    // ---- 十字光标：逐窗格数值图例 ----
    const unit = { D: '日 K', W: '周 K', M: '月 K' }[P];
    const sp = (k, v, c, d) => `<span><span class="k">${k}</span><b style="color:${c}">${fmt(v, d)}</b></span>`;
    const box = $('#legends'), top = $('#lgTop');
    // 手机：主图图例放在图表上方固定 3 行，不压住 K 线
    function mobileMain(i) {
      const b = bars[i], p = bars[i - 1] || b, ch = (b.close / p.close - 1) * 100, cc = b.close >= b.open ? UPD : DND;
      let r3 = '';
      if (state.main.has('TGT') && tg[i]) r3 += `<span><span class="k cn">研报目标价</span><b style="color:${deep(COL.tgt)}">${Math.round(tg[i].lo)}–${Math.round(tg[i].hi)}</b></span>`;
      if (evAt[i]) r3 += evAt[i].map(e => `<span class="lg-ev" style="--d:${EV[e.k].c}"><i></i>${e.title}</span>`).join('');
      let r2 = '';
      if (state.main.has('MA')) r2 += sp('MA5', X.ma5[i], COL.ma5) + sp('10', X.ma10[i], COL.ma10) + sp('20', X.ma20[i], COL.ma20) + sp('60', X.ma60[i], COL.ma60);
      if (state.main.has('BOLL') && X.boll[i]) r2 += sp('BOLL', X.boll[i].mid, COL.boll) + sp('UP', X.boll[i].up, COL.boll) + sp('DN', X.boll[i].dn, COL.boll);
      top.innerHTML = `<div class="lg"><span class="sym">${S.t} · <span class="cn">${unit}</span></span><span>${P === 'M' ? b.time.slice(0, 7) : md(b.time)}</span>${sp('收', b.close, cc)}<b style="color:${ch >= 0 ? UPD : DND}">${pct(ch)}</b>${sp('高', b.high, cc)}${sp('低', b.low, cc)}${sp('开', b.open, cc)}</div>
        <div class="lg">${r2 || '<span class="cn">主图未叠加指标</span>'}</div><div class="lg">${r3 || '<span class="k cn">十字光标所在 K 线没有事件</span>'}</div>`;
    }
    function render(i) {
      const b = bars[i], p = bars[i - 1] || b, ch = (b.close / p.close - 1) * 100, cc = b.close >= b.open ? UPD : DND;
      let main = `<div class="lg"><span class="sym">${S.t} · <span class="cn">${unit}</span></span><span>${b.time}</span>` +
        sp('开', b.open, cc) + sp('高', b.high, cc) + sp('低', b.low, cc) + sp('收', b.close, cc) + `<b style="color:${ch >= 0 ? UPD : DND}">${pct(ch)}</b></div>`;
      let l2 = '';
      if (state.main.has('MA')) l2 += sp('MA5', X.ma5[i], COL.ma5) + sp('MA10', X.ma10[i], COL.ma10) + sp('MA20', X.ma20[i], COL.ma20) + sp('MA60', X.ma60[i], COL.ma60);
      if (state.main.has('BOLL') && X.boll[i]) l2 += sp('BOLL', X.boll[i].mid, COL.boll) + sp('UP', X.boll[i].up, COL.boll) + sp('DN', X.boll[i].dn, COL.boll);
      if (state.main.has('TGT') && tg[i]) l2 += `<span><span class="k cn">研报目标价</span><b style="color:${deep(COL.tgt)}">${Math.round(tg[i].lo)}–${Math.round(tg[i].hi)}</b><span class="k cn" style="margin-left:6px">均值</span><b style="color:${deep(COL.tgt)}">${fmt(tg[i].avg)}</b></span>`;
      if (l2) main += `<div class="lg">${l2}</div>`;
      if (evAt[i]) main += `<div class="lg">${evAt[i].slice(0, m ? 2 : 4).map(e => `<span class="lg-ev" style="--d:${EV[e.k].c}"><i></i>${e.title}<span style="color:var(--ink3);font-weight:600">${e.detail ? ' · ' + e.detail : ''}</span></span>`).join('')}</div>`;
      let html = m ? '' : `<div class="lgb" style="top:6px">${main}</div>`;
      if (m) mobileMain(i); else top.innerHTML = '';
      const top0 = box.getBoundingClientRect().top, ps = chart.panes();
      subs.forEach((s, si) => {
        const pe = ps[si + 1] && ps[si + 1].getHTMLElement();
        const top = pe ? pe.getBoundingClientRect().top - top0 : 0;
        let t = '';
        if (s === 'VOL') t = `<span><span class="k">VOL</span><b style="color:${b.close >= b.open ? UPD : DND}">${big(b.volume)}</b></span>` + `<span><span class="k">MA20</span><b style="color:${COL.vma}">${X.vma20[i] ? big(X.vma20[i]) : '—'}</b></span>`;
        if (s === 'MACD') t = `<span class="k">MACD(12,26,9)</span>` + sp('DIF', X.macd[i].dif, COL.d) + sp('DEA', X.macd[i].dea, COL.k) + sp('MACD', X.macd[i].hist, X.macd[i].hist >= 0 ? UPD : DND);
        if (s === 'KDJ') t = `<span class="k">KDJ(9,3,3)</span>` + sp('K', X.kdj[i].k, COL.k) + sp('D', X.kdj[i].d, COL.d) + sp('J', X.kdj[i].j, COL.j);
        if (s === 'RSI') t = sp('RSI6', X.rsi6[i], COL.k) + sp('RSI12', X.rsi12[i], COL.d) + sp('RSI24', X.rsi24[i], COL.j);
        if (s === 'CP') { const o = O[i]; t = `<span class="k cn">期权 CP 偏离</span>` + sp('CP', o.cp, COL.cp) + (o.norm != null ? sp('常态', o.norm, rgba(COL.cp, .7)) + `<span><span class="k">±1σ</span><b style="color:${rgba(COL.cp, .7)}">${fmt(o.lo)}–${fmt(o.hi)}</b></span>` + `<b style="color:${isSig(o) ? (o.z > 0 ? UPD : DND) : 'var(--ink2)'}">${pct(o.dev * 100, 0)} · ${sgn(o.z)}${Math.abs(o.z).toFixed(1)}σ</b>` : `<span class="k cn">常态计算中</span>`); }
        html += `<div class="lgb" style="top:${top + 4}px"><div class="lg">${t}</div></div>`;
      });
      box.innerHTML = html;
    }
    const idx = Object.fromEntries(T.map((t, i) => [t, i]));
    render(len - 1);
    requestAnimationFrame(() => { sizePanes(); requestAnimationFrame(() => render(len - 1)); });
    chart.subscribeCrosshairMove(p => render(p.time != null && idx[p.time] != null ? idx[p.time] : len - 1));
    build.render = () => render(len - 1);
  }

  // ---------------------------------------------------------------- 技术指标状态（IND.describe：只陈述数值位置）
  const TA_TICKS = {
    '均线': [[0, '0'], [.25, '1'], [.5, '2'], [.75, '3'], [1, '4']],
    'BOLL': [[0, '下轨'], [.5, '中轨'], [1, '上轨']],
    'MACD': [[.5, '0']],
    'KDJ': [[0, '0'], [.2, '20'], [.8, '80'], [1, '100']],
    'RSI(14)': [[.3, '30'], [.5, '50'], [.7, '70']],
    '量能': [[0, '0'], [1 / 3, '1×'], [2 / 3, '2×'], [1, '3×']],
  };
  function renderTA() {
    const rows = IND.describe(S.daily, IND.compute(S.daily));
    $('#ta').innerHTML = rows.map(r => {
      const ticks = (TA_TICKS[r.key] || []).map(([z, l]) => `<i class="z${z === 0 || z === 1 ? ' end' : ''}" style="left:${z * 100}%"><em>${l}</em></i>`).join('');
      const from = r.key === 'MACD' ? .5 : 0;
      return `<div class="ta"><div class="ta-h"><b>${r.key}</b><span>${r.value}</span></div>
        <div class="mt"><i class="f" data-a="${Math.min(from, r.meter) * 100}" data-w="${Math.abs(r.meter - from) * 100}"></i>${ticks}<i class="m" data-l="${r.meter * 100}"></i></div>
        <p>${r.text}</p></div>`;
    }).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => $$('#ta .mt').forEach(m => {
      const f = $('.f', m), k = $('.m', m);
      f.style.left = f.dataset.a + '%'; f.style.width = f.dataset.w + '%'; k.style.left = k.dataset.l + '%';
    })));
  }

  // ---------------------------------------------------------------- 期权日报数据面
  function renderEve() {
    const J = eveJudge(S), o = J.o, n = S.daily.length, px = S.daily[n - 1].close;
    const cls = J.dir > 0 ? 'bull' : J.dir < 0 ? 'bear' : 'flat';
    const confT = ['低', '中', '高'][J.conf];
    const why = [];
    why.push(`CP 偏离 ${pct(o.dev * 100, 0)}（${sgn(o.z)}${Math.abs(o.z).toFixed(1)}σ）${J.cpS ? '达到门槛' : '未达门槛'}`);
    why.push(`LEAP 趋势 ${pct(o.lTrend * 100, 0)}（${sgn(o.lz)}${Math.abs(o.lz).toFixed(1)}σ）${J.lS ? '达到门槛' : '未达门槛'}`);
    // 最热合约（示例）：按 CP 偏离方向取 Call / Put，行权价取整到 5
    const call = o.dev >= 0, strike = Math.max(5, Math.round(px * (call ? 1.12 : .88) / 5) * 5);
    const far = J.conf >= 1, hotC = call ? UPD : DND, hotBg = call ? '#e2f6ef' : '#fce7e9';
    const hot = `${call ? 'Call' : 'Put'} ${strike} · ${far ? '27/01/15' : '11/07'} 到期`;
    $('#eve').innerHTML = `
      <div class="c-head"><div><h3>期权日报<em>数据面</em></h3><p>美东 ${md(S.daily[n - 1].time)} · 期权成交结构 · 示例</p></div><span class="tag">期权日报</span></div>
      <div class="eve-dir"><span class="pill ${cls}">${J.label}</span><span class="lab">期权数据面倾向</span>
        <span class="conf">可信度 ${[0, 1, 2].map(k => `<i class="${k <= J.conf && J.dir ? 'on' : ''}"></i>`).join('')} ${J.dir ? confT : '低'}</span></div>
      <div class="eve-rows">
        <div class="eve-row"><span class="k">依据</span><span>${why.join('；')}</span><span></span></div>
        <div class="eve-row"><span class="k">量 / 权利金</span><span>对比前 20 个交易日均值</span><span class="v">${fmt(o.vx, 1)}x / ${fmt(o.px, 1)}x</span></div>
        <div class="eve-row"><span class="k">最热合约</span><span class="num" style="font-weight:800">${hot}</span><span class="hot">${far ? `<span class="far" style="color:${hotC};background:${hotBg}">远月</span>` : '<span class="far" style="color:#6f7487;background:#eef0f4">短线</span>'}</span></div>
      </div>
      <div class="dline"><span>报告数据行（代码生成，写报告的 AI 只能原样引用）</span>量${fmt(o.vx, 1)}x 权利金${fmt(o.px, 1)}x｜CP ${fmt(o.cp)}（常态${fmt(o.norm)}）｜LEAP趋势${pct(o.lTrend * 100, 0).replace('−', '-')}</div>
      <p class="note">"偏多 / 偏空"是期权成交结构的数据面倾向，不构成买卖建议。数据面对方向的预测力有限，正式版直接引用期权日报的计算结果。</p>`;
  }

  // ---------------------------------------------------------------- 研报 / 新闻 / 产业链
  function renderReports() {
    const n = S.daily.length, tg = S.tgt[n - 1], last = S.reports.slice(-3).reverse();
    $('#reports').innerHTML = `
      <div class="c-head"><div><h3>研报<em>目标价与摘要</em></h3><p>已收录 ${tg.n} 家机构 · 最近 3 条 · 每条不超过 3 个要点</p></div><span class="ai-tag">AI 整理</span></div>
      <div class="tgt-sum"><span>目标价区间 <b>${Math.round(tg.lo)}–${Math.round(tg.hi)}</b></span><span class="s">均值 <b class="num">${fmt(tg.avg)}</b></span><span class="s">现价 <b class="num">${fmt(S.daily[n - 1].close)}</b></span></div>
      ${last.map(x => { const d = x.from == null ? 0 : x.tp - x.from; return `<div class="rp">
        <div class="rp-h"><span class="d">${x.date}</span><span class="f">${x.inst}</span><span class="tag" style="--tc-deep:#0b77c0;--tc-bg:#e7f4fe">${x.action}</span>
          <span class="tp">目标价 ${x.from != null ? x.from + ' → ' : ''}<b class="${dirc(d)}">${x.tp}</b></span></div>
        <ul>${x.pts.map(p => `<li>${p}</li>`).join('')}</ul></div>`; }).join('')}
      <p class="note">机构名已脱敏为"机构 A/B/C/D"。只展示机构、日期、评级、目标价与要点摘要，不转载研报原文；目标价为机构观点，仅作信息展示。</p>`;
  }
  function renderNews() {
    $('#news').innerHTML = `
      <div class="c-head"><div><h3>最新<em>消息</em></h3><p>公司公告与媒体报道 · 只列标题与来源</p></div></div>
      ${S.news.map((x, k) => `<a class="nw${k === 0 && x.i === S.daily.length - 1 ? ' new' : ''}" href="#" onclick="return false"><span class="tm">${md(x.date)}<small>${x.tm}</small></span>
        <span class="tt">${x.title}</span><span class="src"><span class="kd">${x.kind}</span>${x.src} · 美东时间</span></a>`).join('')}
      <p class="note">标题为虚构示例；正式版每条注明来源并链接原文，重要消息以公司公告为准。</p>`;
  }
  function renderChain() {
    const { co, L } = S, li = co.li, t = co.t;
    const pick = (list, k) => list.slice(0, k);
    let up = EDGES.filter(e => e[1] === t).map(e => [e[0], e[2]]), down = EDGES.filter(e => e[0] === t).map(e => [e[1], e[2]]);
    const byCap = arr => arr.slice().sort((a, b) => b.cap - a.cap);
    if (!up.length && li > 0) up = byCap(CL.layers[li - 1].members).slice(0, 2).map(c => [c.t, '上游环节']);
    if (!down.length && li < CL.layers.length - 1) down = byCap(CL.layers[li + 1].members).slice(0, 2).map(c => [c.t, '下游环节']);
    const it = ([tk, rel]) => { const c = CL.byT[tk], q = quoteOf(tk); return `<a class="ch-it" href="?t=${tk}" data-go="${tk}">${badge(c, 26)}<span class="tx"><b>${tk}</b><small>${rel}</small></span><em class="${dirc(q.chg)}">${pct(q.chg, 1)}</em></a>`; };
    const peers = byCap(L.members.filter(c => c.seg === co.seg && c.t !== t)).concat(byCap(L.members.filter(c => c.seg !== co.seg))).slice(0, 6);
    $('#chain').innerHTML = `
      <div class="c-head"><div><h3>产业链<em>上下游</em></h3><p>第 ${li + 1} 层 / 共 8 层 · 关系为示意</p></div><a class="lnk" href="index.html#island">产业镇 →</a></div>
      <div class="ch-strip">${CL.layers.map((x, i) => `<i class="${i === li ? 'on' : ''}" style="--c:${x.color}" title="${x.name}"></i>`).join('')}</div>
      <div class="ch-strip-l"><span>上游 · 原材料</span><span style="color:${deep(L.color)}">${L.name}</span><span>应用与端侧 · 下游</span></div>
      <div class="ch-flow">
        <div class="ch-col"><span class="ch-k">上游</span>${pick(up, 4).map(it).join('') || '<span class="note" style="margin:0">—</span>'}</div>
        <div class="ch-self"><span class="arr">→</span>${badge(co, 40, 3)}<b>${t}</b><span class="arr">→</span></div>
        <div class="ch-col"><span class="ch-k">下游</span>${pick(down, 4).map(it).join('') || '<span class="note" style="margin:0">—</span>'}</div>
      </div>
      <div class="ch-peers"><span class="ch-k">同层</span>${peers.map(c => `<a href="?t=${c.t}" data-go="${c.t}">${badge(c, 22)}${c.t}</a>`).join('')}</div>`;
    $$('#chain [data-go]').forEach(a => a.onclick = e => { e.preventDefault(); select(a.dataset.go, true); scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }); });
  }

  // ---------------------------------------------------------------- 高清图下载（html-to-image，按需加载）
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('加载失败')); document.head.appendChild(s); });
  async function download(btn) {
    const label = btn.textContent; btn.textContent = '生成中…'; btn.disabled = true;
    try {
      if (!window.htmlToImage) await loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
      const blob = await window.htmlToImage.toBlob($('#shot'), { pixelRatio: 2, skipFonts: true, backgroundColor: '#f7f8fc', filter: el => !(el.classList && el.classList.contains('no-shot')) });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      // 文件名用 ASCII：部分浏览器会把中文文件名换成 "download"
      a.href = url; a.download = `chaoxin-stock-${S.t}-${END}.png`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { console.warn(e); toast('高清图生成失败，请检查网络后重试'); }
    finally { btn.textContent = label; btn.disabled = false; }
  }

  // ---------------------------------------------------------------- 切换股票
  function select(t, push) {
    const want = (t || '').toUpperCase();
    if (!CL.byT[want]) { toast(`${want || '该代码'} 不在 AI 链名单内，已显示 NVDA`); t = 'NVDA'; } else t = want;
    S = stockData(t);
    document.title = `${t} ${S.co.name} · 看盘 · 潮信`;
    if (push) { try { history.pushState({ t }, '', '?t=' + t); } catch (e) { /* file:// 下个别浏览器不允许改地址，忽略 */ } }
    renderCrumb(); renderQuote(); renderHot(); renderKpis(); build(false); renderTA(); renderEve(); renderReports(); renderNews(); renderChain(); markWatch();
    document.body.classList.remove('wl-open');
    if (!calm) $$('#quote, #kpis, .chart-card, .rail > *, .sk-bottom > *').forEach(el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); });
  }

  // ---------------------------------------------------------------- 工具栏与全局事件
  function bindToolbar() {
    $$('#period button').forEach(b => b.onclick = () => { state.period = b.dataset.p; $$('#period button').forEach(x => x.classList.toggle('on', x === b)); build(false); });
    $$('[data-main]').forEach(b => b.onclick = () => { const k = b.dataset.main; state.main.has(k) ? state.main.delete(k) : state.main.add(k); b.classList.toggle('on'); build(true); });
    $$('[data-sub]').forEach(b => b.onclick = () => { const k = b.dataset.sub; state.sub = state.sub.includes(k) ? state.sub.filter(x => x !== k) : [...state.sub, k]; b.classList.toggle('on'); build(true); });
    $$('[data-ev]').forEach(b => b.onclick = () => { const k = b.dataset.ev; state.ev.has(k) ? state.ev.delete(k) : state.ev.add(k); b.classList.toggle('on'); build(true); });
  }
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if ((innerWidth < 640) !== isMobile) build(true); else if (build.render) build.render(); }, 160); });
  addEventListener('popstate', () => select(fromURL(), false));
  addEventListener('scroll', () => $('#nav').classList.toggle('scrolled', scrollY > 10), { passive: true });

  if (!LC) { document.querySelector('#cw').innerHTML = '<div class="note" style="padding:40px;text-align:center">图表组件未加载，请检查网络（需要访问 cdn.jsdelivr.net）</div>'; }
  renderWatch(); bindToolbar();
  select(fromURL(), false);
  // 网页字体加载完后让图表按新字体重排一次刻度
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (chart) { chart.applyOptions({ layout: { fontFamily: FONT } }); if (build.render) build.render(); } });
})();
