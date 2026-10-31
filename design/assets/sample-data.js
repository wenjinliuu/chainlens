/*
 * ChainLens 设计稿 · 示例数据
 * 全部为【虚构】数据，仅用于看版式与视觉，不对应任何真实行情、研报或新闻。
 * 机构名一律用"机构 A/B/C…"，媒体名一律用"示例媒体"。
 */
(function () {
  // 可复现的伪随机数，保证每次打开设计稿画面一致
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const TODAY = '2026-10-30';

  // ---------- 产业链分组 + 当日涨跌（热力图） ----------
  const segments = [
    { name: '算力芯片', stocks: [
      { t: 'NVDA', n: 'NVIDIA', cap: 52, chg: 2.84 },
      { t: 'AVGO', n: 'Broadcom', cap: 18, chg: 1.12 },
      { t: 'AMD', n: 'AMD', cap: 6, chg: -1.46 },
      { t: 'MRVL', n: 'Marvell', cap: 2, chg: 3.91 },
    ] },
    { name: '存储', stocks: [
      { t: 'MU', n: 'Micron', cap: 4, chg: 4.27 },
      { t: 'WDC', n: 'Western Digital', cap: 1.2, chg: 1.83 },
      { t: 'STX', n: 'Seagate', cap: 1.1, chg: -0.62 },
    ] },
    { name: '光模块/网络', stocks: [
      { t: 'ANET', n: 'Arista', cap: 4.5, chg: -2.15 },
      { t: 'COHR', n: 'Coherent', cap: 1.4, chg: 5.62 },
      { t: 'LITE', n: 'Lumentum', cap: 0.9, chg: 6.08 },
    ] },
    { name: '服务器/代工', stocks: [
      { t: 'TSM', n: 'TSMC', cap: 22, chg: 0.74 },
      { t: 'DELL', n: 'Dell', cap: 2.2, chg: -0.88 },
      { t: 'SMCI', n: 'Supermicro', cap: 0.8, chg: -3.42 },
    ] },
    { name: '电力与能源', stocks: [
      { t: 'VRT', n: 'Vertiv', cap: 1.8, chg: 2.36 },
      { t: 'CEG', n: 'Constellation', cap: 2.4, chg: -1.05 },
      { t: 'VST', n: 'Vistra', cap: 1.5, chg: 0.41 },
    ] },
    { name: '云厂商', stocks: [
      { t: 'MSFT', n: 'Microsoft', cap: 36, chg: 0.52 },
      { t: 'AMZN', n: 'Amazon', cap: 24, chg: -0.37 },
      { t: 'GOOGL', n: 'Alphabet', cap: 26, chg: 1.06 },
      { t: 'META', n: 'Meta', cap: 17, chg: -1.74 },
    ] },
    { name: '矿企转算力', stocks: [
      { t: 'IREN', n: 'IREN', cap: 0.5, chg: 7.45 },
      { t: 'CORZ', n: 'Core Scientific', cap: 0.5, chg: -2.9 },
    ] },
    { name: '原材料', stocks: [
      { t: 'FCX', n: 'Freeport', cap: 0.7, chg: 0.95 },
      { t: 'MP', n: 'MP Materials', cap: 0.4, chg: -4.18 },
    ] },
  ];

  // ---------- 今日一句话（AI 整理，事实陈述） ----------
  const brief = {
    text: '今日 AI 产业链 24 只覆盖个股中 14 涨 10 跌；光模块与矿企转算力环节涨幅居前，原材料环节回落。期权异动 6 只，研报评级 / 目标价调整 9 条。',
    aiGenerated: true,
    source: '期权日报 · 盘前概述',
  };

  // ---------- 期权异动榜（数值来自期权日报，已按自身分布排序） ----------
  const options = [
    { t: 'LITE', cp: 3.42, leap: 2.10, z: 3.1, dir: 'up' },
    { t: 'NVDA', cp: 2.31, leap: 1.80, z: 2.4, dir: 'up' },
    { t: 'MU', cp: 2.05, leap: 1.62, z: 2.2, dir: 'up' },
    { t: 'SMCI', cp: 0.41, leap: 0.66, z: -2.6, dir: 'down' },
    { t: 'IREN', cp: 2.88, leap: 1.95, z: 2.0, dir: 'up' },
    { t: 'MP', cp: 0.52, leap: 0.71, z: -1.9, dir: 'down' },
  ];

  // ---------- 研报变动流 ----------
  const reports = [
    { t: 'NVDA', firm: '机构 A', rOld: '中性', rNew: '增持', pOld: 145, pNew: 165, date: '10-30' },
    { t: 'MU', firm: '机构 B', rOld: '增持', rNew: '增持', pOld: 135, pNew: 160, date: '10-30' },
    { t: 'ANET', firm: '机构 C', rOld: '增持', rNew: '中性', pOld: 140, pNew: 128, date: '10-30' },
    { t: 'COHR', firm: '机构 D', rOld: '—', rNew: '增持', pOld: null, pNew: 112, date: '10-29' },
    { t: 'SMCI', firm: '机构 E', rOld: '中性', rNew: '减持', pOld: 48, pNew: 36, date: '10-29' },
    { t: 'VRT', firm: '机构 F', rOld: '增持', rNew: '增持', pOld: 120, pNew: 138, date: '10-29' },
  ];

  // ---------- 个股新闻流 ----------
  const news = [
    { t: 'NVDA', title: '新一代数据中心平台公布量产时间表', src: '示例媒体', time: '08:42', imp: 'high' },
    { t: 'TSM', title: '月度营收同比增长，先进制程占比提升', src: '示例媒体', time: '07:15', imp: 'normal' },
    { t: 'MU', title: 'HBM 产能扩建项目获地方审批', src: '示例媒体', time: '06:58', imp: 'high' },
    { t: 'CEG', title: '与云厂商签署长期供电协议', src: '示例媒体', time: '昨日 22:10', imp: 'normal' },
    { t: 'LITE', title: '800G 光模块出货量环比增加', src: '示例媒体', time: '昨日 20:31', imp: 'normal' },
  ];

  // ---------- 信息集中出现（规则：近 5 个交易日内期权异动 ≥1 且研报调整 ≥1） ----------
  const clusters = [
    { t: 'NVDA', opt: 2, rep: 1 },
    { t: 'MU', opt: 1, rep: 2 },
    { t: 'SMCI', opt: 2, rep: 1 },
    { t: 'LITE', opt: 3, rep: 1 },
  ];

  // ---------- 个股页：NVDA ----------
  function genCandles(n, start, seed) {
    const r = rng(seed);
    const out = [];
    let p = start;
    const d0 = new Date('2026-05-04T00:00:00Z');
    let d = new Date(d0);
    while (out.length < n) {
      const wd = d.getUTCDay();
      if (wd !== 0 && wd !== 6) {
        const drift = 0.0016;
        const vol = 0.022;
        const o = p * (1 + (r() - 0.5) * 0.01);
        const c = o * (1 + drift + (r() - 0.5) * 2 * vol);
        const h = Math.max(o, c) * (1 + r() * 0.012);
        const l = Math.min(o, c) * (1 - r() * 0.012);
        out.push({ date: d.toISOString().slice(0, 10), o, h, l, c, v: 0.6 + r() });
        p = c;
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }

  const candles = genCandles(130, 118, 7);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  // 事件打点（按 K 线下标挂靠）
  const stockEvents = [
    { i: 14, type: 'report', title: '机构 C 首次覆盖', detail: '评级 增持 · 目标价 140' },
    { i: 31, type: 'news', title: '季度业绩发布', detail: '示例媒体' },
    { i: 38, type: 'option', title: '期权异动', detail: 'CP 2.05 · +2.1σ' },
    { i: 57, type: 'report', title: '机构 B 上调目标价', detail: '132 → 148' },
    { i: 72, type: 'news', title: '新产品发布会', detail: '示例媒体' },
    { i: 88, type: 'option', title: '期权异动', detail: 'CP 0.58 · −2.0σ' },
    { i: 101, type: 'report', title: '机构 E 维持评级', detail: '目标价 150 → 155' },
    { i: 115, type: 'news', title: '数据中心平台量产时间表', detail: '示例媒体' },
    { i: 124, type: 'option', title: '期权异动', detail: 'CP 2.31 · +2.4σ' },
    { i: 129, type: 'report', title: '机构 A 上调评级', detail: '中性 → 增持 · 145 → 165' },
  ];

  // 研报目标价区间（阶梯变化）
  const targetBand = candles.map(function (c, i) {
    let lo = 118, avg = 129, hi = 140;
    if (i >= 57) { lo = 122; avg = 136; hi = 148; }
    if (i >= 101) { lo = 128; avg = 141; hi = 155; }
    if (i >= 129) { lo = 128; avg = 146; hi = 165; }
    return { lo: lo, avg: avg, hi: hi };
  });

  // CP 比历史 + 自身分布 ±1σ
  const cpHist = (function () {
    const r = rng(11);
    return candles.map(function (c, i) {
      let v = 1.25 + Math.sin(i / 9) * 0.22 + (r() - 0.5) * 0.35;
      if (i === 38) v = 2.05;
      if (i === 88) v = 0.58;
      if (i === 124) v = 2.31;
      const leap = 1.2 + Math.sin(i / 14) * 0.15 + (r() - 0.5) * 0.18;
      return { cp: v, leap: leap };
    });
  })();

  const stock = {
    t: 'NVDA',
    n: 'NVIDIA',
    seg: '算力芯片',
    price: last.c,
    chg: (last.c / prev.c - 1) * 100,
    updated: TODAY + ' 16:00 ET',
    delay: '行情延迟 15 分钟以上',
    candles: candles,
    events: stockEvents,
    targetBand: targetBand,
    cpHist: cpHist,
    cpMean: 1.25,
    cpStd: 0.3,
    reportCards: [
      { firm: '机构 A', date: '2026-10-30', rOld: '中性', rNew: '增持', pOld: 145, pNew: 165,
        points: ['数据中心收入占比继续提升', '新平台量产节奏早于此前披露', '毛利率假设上调 1 个百分点'] },
      { firm: '机构 E', date: '2026-10-02', rOld: '增持', rNew: '增持', pOld: 150, pNew: 155,
        points: ['供应链交付周期缩短', '网络业务增速高于整体'] },
      { firm: '机构 B', date: '2026-07-21', rOld: '增持', rNew: '增持', pOld: 132, pNew: 148,
        points: ['云厂商资本开支指引上调', '库存周转天数下降', '软件订阅收入开始披露'] },
      { firm: '机构 C', date: '2026-05-22', rOld: '—', rNew: '增持', pOld: null, pNew: 140,
        points: ['首次覆盖', '产品周期处于更替阶段'] },
    ],
    newsList: [
      { title: '新一代数据中心平台公布量产时间表', src: '示例媒体', time: '10-30 08:42' },
      { title: '与亚洲代工厂扩大先进封装合作', src: '示例媒体', time: '10-27 19:05' },
      { title: '季度业绩电话会要点', src: '示例媒体', time: '08-27 21:30' },
      { title: '新产品发布会公布路线图', src: '示例媒体', time: '08-12 10:00' },
    ],
    upstream: [
      { t: 'TSM', n: 'TSMC', rel: '代工', chg: 0.74 },
      { t: 'MU', n: 'Micron', rel: 'HBM', chg: 4.27 },
      { t: 'COHR', n: 'Coherent', rel: '光器件', chg: 5.62 },
    ],
    downstream: [
      { t: 'MSFT', n: 'Microsoft', rel: '云', chg: 0.52 },
      { t: 'META', n: 'Meta', rel: '云', chg: -1.74 },
      { t: 'DELL', n: 'Dell', rel: '服务器', chg: -0.88 },
    ],
  };

  // 全部覆盖个股的名称索引
  const names = {};
  segments.forEach(function (s) { s.stocks.forEach(function (x) { names[x.t] = { n: x.n, seg: s.name, chg: x.chg }; }); });

  window.CL_DATA = {
    TODAY: TODAY,
    segments: segments,
    brief: brief,
    options: options,
    reports: reports,
    news: news,
    clusters: clusters,
    stock: stock,
    names: names,
    disclaimer: '本站内容为公开信息整理，不构成任何投资建议。市场有风险，投资需谨慎。',
  };
})();
