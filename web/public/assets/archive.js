/*
 * 潮信 · 日报归档数据（全部虚构）
 * - 期权日报：2026-09-21 ~ 10-30 每个交易日一份，结构与 POSTER.base 相同；10-30 直接用手写样张
 * - 研报日报：每个交易日 3~6 条评级 / 目标价调整的摘要
 * - 周报：按周把当周日报汇总出方向、环节轮动、持续信号（判断规则在代码里，不交给 AI）
 * - peek：首页栏目卡"看样张"的四张样张；text / rrPage / weekPage：归档页的整页渲染
 * 生成用固定种子，刷新不变；正式版这些由 pipeline 产出 JSON，这里只是设计稿的占位数据。
 */
(function () {
  const { mix } = ISO;
  const P = window.POSTER;
  const deep = c => mix(c, '#000000', .18);
  const cbadge = (c, size, color) => `<span class="badge" style="--bs:${size}px;--c:${deep(color)};--ring:${mix(color, '#ffffff', .55)}"><i>${c.t[0]}</i>${c.logo ? `<img src="${c.logo}" alt="" onerror="this.remove()">` : ''}</span>`;
  const tb = (t, size) => { const c = CL.byT[t]; return c ? cbadge(c, size, CL.layers[c.li].color) : ''; };
  const r1 = (v, n = 1) => +v.toFixed(n);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pct = v => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;
  const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const md = s => `${+s.slice(5, 7)}月${+s.slice(8, 10)}日`;
  const dow = s => new Date(s + 'T12:00:00Z').getUTCDay();
  const wd = s => WD[dow(s)];
  const addDays = (s, n) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + n)).toISOString().slice(0, 10);
  // 固定种子随机数（mulberry32）：同一天永远生成同样的数据
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const shuffle = (r, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // 海报里的六个环节（和 KZG 日报一致）
  const SEGS = [
    { n: '光模块', ts: ['LITE', 'COHR', 'CIEN'], layer: '网络与光' },
    { n: 'GPU/加速器', ts: ['NVDA', 'AMD'], layer: '芯片' },
    { n: 'AI服务器', ts: ['SMCI', 'DELL', 'HPE'], layer: '服务器与数据中心' },
    { n: '存储', ts: ['MU', 'SNDK', 'WDC'], layer: '芯片' },
    { n: '电力/散热', ts: ['VRT', 'ETN'], layer: '服务器与数据中心' },
    { n: 'GPU/算力云', ts: ['CRWV', 'IREN', 'NBIS'], layer: '算力租赁' },
  ];
  const segOf = t => SEGS.find(s => s.ts.includes(t));

  // 交易日：2026-09-21 ~ 2026-10-30 的周一到周五（期间美股没有休市日）
  const DATES = [];
  for (let d = '2026-09-21'; d <= '2026-10-30'; d = addDays(d, 1)) { const w = dow(d); if (w >= 1 && w <= 5) DATES.push(d); }

  // 热点事件池（虚构）
  const EVENTS = [
    ['光模块龙头上调季度营收指引，称数据中心 800G 需求超预期', '公司公告', ['LITE', 'COHR']],
    ['新一代 GPU 平台公布量产时间表', '示例媒体', ['NVDA']],
    ['存储厂商宣布 HBM 产能扩建项目获地方审批', '示例媒体', ['MU']],
    ['大型云厂商上调全年资本开支指引', '公司公告', ['MSFT', 'GOOGL']],
    ['AI 服务器厂商发布季度财报：营收同比增长，毛利率下降', '公司公告', ['SMCI']],
    ['算力租赁公司披露新一笔多年期 GPU 租赁合同', '公司公告', ['CRWV']],
    ['美联储官员讲话：对通胀回落的信心增强', '示例媒体', []],
    ['电力设备厂商称数据中心订单可见度延长到明年', '公司公告', ['VRT', 'ETN']],
    ['台积电公布月度营收，先进制程占比提升', '公司公告', ['TSM']],
    ['交换机厂商与云客户签署多年供货框架', '示例媒体', ['ANET']],
    ['美国 9 月 CPI 公布，核心通胀环比持平', '示例媒体', []],
    ['核电公司与科技公司签署长期购电协议', '公司公告', ['CEG']],
    ['光学器件厂商宣布收购一家硅光初创公司', '公司公告', ['CIEN']],
    ['存储现货价格第三方报价环比回升', '示例媒体', ['MU', 'SNDK', 'WDC']],
    ['AI 服务器厂商下调当季出货指引', '公司公告', ['DELL', 'HPE']],
    ['比特币矿企转型算力租赁，披露首批 GPU 到货', '公司公告', ['IREN', 'NBIS']],
  ];
  const WHY = {
    '偏多': ['成交量为 20 日均值的 {vx} 倍，Call 集中在近月合约。', 'Call 成交集中在远月合约，LEAP Call 占比上升。', '权利金 {px} 倍，Call 占比高于 20 日常态。', '消息面有公告配合，Call 成交连续两天放大。'],
    '偏空': ['财报日前 Put 成交放大，CP 明显低于常态。', 'Put 成交集中在近月合约，权利金 {px} 倍。', '成交量 {vx} 倍，Put 占比高于 20 日常态。', '连续两天 Put 放量，LEAP Put 占比上升。'],
  };
  const LEAP = { '偏多': ['LEAP 持平', 'LEAP Call 占比上升', 'LEAP Call 占比连续 2 天上升'], '偏空': ['LEAP 持平', 'LEAP Put 占比上升', 'LEAP Put 占比连续 2 天上升'] };
  const EXP = ['11/07 到期', '11/21 到期', '12/19 到期', '26/01/16 到期 · 远月'];
  const strikeOf = t => 20 + hash(t) % 260;

  // ---------- 期权日报：先把情绪和环节热度做成随机游走，再逐日生成 ----------
  function genDays() {
    const r = rng(20261030);
    const out = [];
    let dev = .04, base = .76;
    const heat = SEGS.map(() => 1 + r() * .8), sdev = SEGS.map(() => (r() - .5) * .3);
    for (const date of DATES) {
      dev = clamp(dev * .6 + (r() - .5) * .34, -.38, .38);
      base = clamp(base + (r() - .5) * .02, .7, .86);
      SEGS.forEach((s, i) => { heat[i] = clamp(heat[i] * .7 + .35 + (r() - .5) * .9, .7, 2.9); sdev[i] = clamp(sdev[i] * .5 + (r() - .5) * .5, -.45, .55); });
      if (date === P.base.date) { out.push(Object.assign({ hotDev: .21 }, P.base)); continue; }
      const rd = rng(hash(date));
      const mood = dev > .07 ? '偏乐观' : dev < -.07 ? '偏谨慎' : '中性';
      const order = SEGS.map((s, i) => i).sort((a, b) => heat[b] - heat[a]);
      const hi = order[0], hot = SEGS[hi];
      // 最强信号：最热环节里的一只，方向跟环节 CP 偏离
      const sDir = sdev[hi] >= 0 ? '偏多' : '偏空';
      const sT = pick(rd, hot.ts), sVx = r1(1.6 + rd() * 1.8), sPx = r1(sVx * (0.9 + rd() * .4));
      const conf = sVx >= 2.6 ? '高' : sVx >= 1.9 ? '中' : '低';
      const strong = { t: sT, seg: hot.n, dir: sDir, conf, vx: sVx, px: sPx };
      // 重点 3 只：最强 + 另外两个环节各一只
      const others = shuffle(rd, order.slice(1, 4)).slice(0, 2);
      const mk = (si, t, vx, px) => { const dir = sdev[si] >= 0 ? '偏多' : '偏空'; const cp = r1(sdev[si] * (1.2 + rd()), 2) || .05; return { t, seg: SEGS[si].n, dir, conf: vx >= 2.6 ? '高' : vx >= 1.9 ? '中' : '低', rank: 1 + Math.floor(rd() * 60), vx, px, cp: dir === '偏多' ? Math.abs(cp) : -Math.abs(cp), leap: pick(rd, LEAP[dir]), why: pick(rd, WHY[dir]).replace('{vx}', vx).replace('{px}', px), hot: `${dir === '偏多' ? 'Call' : 'Put'} ${strikeOf(t)} · ${pick(rd, EXP)}` }; };
      const picks = [mk(hi, sT, sVx, sPx), ...others.map(si => { const vx = r1(1.3 + rd() * 1.4); return mk(si, pick(rd, SEGS[si].ts), vx, r1(vx * (.9 + rd() * .4))); })];
      if (CL.byT[sT]) picks[0].rank = Math.max(1, Math.floor(60 / Math.sqrt(CL.byT[sT].cap / 10 + 1)));
      // 事件 2 条：优先和最热环节相关
      const rel = EVENTS.filter(e => e[2].some(c => hot.ts.includes(c)));
      const e1 = rel.length && rd() < .7 ? pick(rd, rel) : pick(rd, EVENTS);
      let e2 = pick(rd, EVENTS); while (e2 === e1) e2 = pick(rd, EVENTS);
      const events = [e1, e2].map(e => ({ text: e[0], src: e[1], chips: e[2] }));
      // 标题
      const hotDev = r1(sdev[hi], 2);
      let h2;
      if (heat[hi] >= 1.9) h2 = `${hot.n} ${hotDev >= 0 ? 'Call 集中放量' : 'Put 成交放大'}`;
      else if (Math.abs(dev) < .05) h2 = pick(rd, ['成交平淡，CP 接近常态', '量能回落，方向不明显']);
      else if (dev > 0) h2 = pick(rd, ['远月 Call 占比上升', `${hot.n} Call 成交放大`, 'Call 成交集中在芯片层']);
      else h2 = pick(rd, ['Put 成交集中在近月', `${hot.n} Put 成交放大`, '全市场 Put 占比上升']);
      const layers = [...new Set([hot.layer, SEGS[order[1]].layer])];
      const t3 = `全市场 CP ${dev >= 0 ? '高于' : '低于'}常态 ${Math.round(Math.abs(dev) * 100)}%，资金集中在${layers.join('、')}${layers.length > 1 ? '两层' : '一层'}；${hot.ts.slice(0, 2).join('、')} 成交量超过常态 ${r1(heat[hi] * (0.8 + rd() * .3))} 倍。`;
      const heatRows = order.map(i => [SEGS[i].n, r1(heat[i]), SEGS[i].ts.join(' '), r1(sdev[i], 2)]);
      const cp = r1(base * (1 + dev), 2);
      const intra = Array.from({ length: 13 }, (_, i) => { const u = Math.abs(i - 6) / 6; return [r1(.45 + u * .45 + rd() * .15, 2), r1(cp + (rd() - .5) * .18 + (i - 6) * dev * .012, 2)]; });
      const watch = shuffle(rd, SEGS.flatMap(s => s.ts).filter(t => !picks.some(p => p.t === t))).slice(0, 2);
      out.push({ date, md: md(date), wd: wd(date), mood, cp, base: r1(base, 2), dev: r1(dev, 2), h2, t3, strong, hot: { seg: hot.n, heat: r1(heat[hi]), ts: hot.ts }, hotDev, events, picks, watch, heat: heatRows, intra });
    }
    return out;
  }
  const days = genDays();
  const byDate = Object.fromEntries(days.map(d => [d.date, d]));

  // ---------- 研报日报 ----------
  const FIRMS = ['机构 A', '机构 B', '机构 C', '机构 D', '机构 E'];
  const ACTS = [['上调评级', '中性 → 增持', 1], ['下调评级', '增持 → 中性', -1], ['上调目标价', '维持 增持', 1], ['下调目标价', '维持 中性', -1], ['首次覆盖', '首次覆盖 · 增持', 1], ['维持', '维持 增持', 0]];
  // 要点池按方向分开，免得"下调评级"配上利好要点
  const BUL = {
    raw: { up: ['铜价对利润的弹性测算上调', '矿山扩产进度快于计划'], dn: ['库存周期尚未见底', '成本通胀压缩利润率'] },
    energy: { up: ['数据中心购电协议新增', '电价上行带动利润率', '核电项目审批进度加快'], dn: ['燃气机组交付排期延长', '资本开支高于预期', '购电协议定价低于预期'] },
    chip: { up: ['数据中心收入占比继续提升', 'HBM 产能扩建进度加快', '毛利率假设上调 1 个百分点', '新平台量产节奏早于此前披露', '订单可见度延长到明年下半年', '存储价格环比回升'], dn: ['估值已反映多数预期', '毛利率假设下调', '客户库存消化慢于预期', '出口管制范围扩大'] },
    net: { up: ['800G 出货量指引上调', '硅光产品进入批量交付', '1.6T 产品送样进度快于预期'], dn: ['客户集中度上升被列为风险', '估值已反映多数预期', '价格年降幅度高于预期'] },
    dc: { up: ['液冷订单占比提升', '数据中心订单积压增加', '租金续约价格上行'], dn: ['服务器毛利率下降', '供应链成本上升', '大客户订单节奏放缓'] },
    compute: { up: ['GPU 租赁合同期限延长', '上架功率进度快于计划'], dn: ['资本开支依赖外部融资', '客户集中度高', '折旧年限假设偏长'] },
    cloud: { up: ['云业务增速高于预期', 'AI 相关收入开始单独披露', '资本开支指引上调'], dn: ['自由现金流下修', '资本开支回报周期拉长'] },
    app: { up: ['AI 产品渗透率提升', '净留存率回升', '新客户获取成本下降'], dn: ['指引保守于市场预期', '席位数增长放缓'] },
  };
  const priceOf = t => { const c = CL.byT[t]; return c ? 20 + Math.round(Math.sqrt(c.cap) * 6 + hash(t) % 90) : 100; };
  const weighted = r => { const pool = CL.companies; const tot = pool.reduce((s, c) => s + Math.sqrt(c.cap), 0); let x = r() * tot; for (const c of pool) { x -= Math.sqrt(c.cap); if (x <= 0) return c; } return pool[0]; };
  const rrCache = {};
  function rr(date) {
    if (rrCache[date]) return rrCache[date];
    const r = rng(hash('rr' + date));
    const n = 3 + Math.floor(r() * 4), used = new Set(), items = [];
    while (items.length < n) {
      const c = weighted(r); if (used.has(c.t)) continue; used.add(c.t);
      const [act, rating, sign] = pick(r, ACTS);
      const a = priceOf(c.t), b = Math.round(a * (1 + sign * (.06 + r() * .16) + (sign === 0 ? (r() - .5) * .04 : 0)));
      const pool = BUL[c.layer] || BUL.chip, pts = shuffle(r, sign > 0 ? pool.up : sign < 0 ? pool.dn : pool.up.slice(0, 1).concat(pool.dn.slice(0, 1))).slice(0, 2 + Math.floor(r() * 2));
      items.push({ t: c.t, c, firm: pick(r, FIRMS), act, rating, from: a, to: b, sign, pts });
    }
    items.sort((x, y) => Math.abs(y.sign) - Math.abs(x.sign) || y.c.cap - x.c.cap);
    // 10-30 固定成首页样张那三条在前
    if (date === '2026-10-30') items.unshift(
      { t: 'NVDA', c: CL.byT.NVDA, firm: '机构 A', act: '上调评级', rating: '中性 → 增持', from: 145, to: 165, sign: 1, pts: ['数据中心收入占比继续提升', '新平台量产节奏早于此前披露', '毛利率假设上调 1 个百分点'] },
      { t: 'MU', c: CL.byT.MU, firm: '机构 B', act: '上调目标价', rating: '维持 增持', from: 135, to: 160, sign: 1, pts: ['HBM 产能扩建进度加快', '存储价格环比回升'] },
      { t: 'ANET', c: CL.byT.ANET, firm: '机构 C', act: '下调评级', rating: '增持 → 中性', from: 140, to: 128, sign: -1, pts: ['估值已反映多数预期'] });
    const up = items.filter(i => i.sign > 0).length, down = items.filter(i => i.sign < 0).length;
    return rrCache[date] = { date, items, up, down, keep: items.length - up - down, total: items.length + 2 + Math.floor(r() * 6) };
  }

  // ---------- 周报：按周汇总（规则固定在代码里） ----------
  const NEXT = [['周三', '美联储议息结果'], ['周四', '财报：NVDA（盘后）'], ['周五', '美国非农就业'], ['周二', '美国 CPI'], ['周三', '财报：MU（盘后）'], ['周四', '财报：AVGO（盘后）'], ['周五', '美国 PCE 物价'], ['周一', '台积电月度营收'], ['周三', '财报：SMCI（盘后）'], ['周四', '美国 GDP 初值']];
  function genWeeks() {
    const weeks = {};
    for (const d of days) { const mon = addDays(d.date, 1 - dow(d.date)); (weeks[mon] = weeks[mon] || []).push(d); }
    return Object.entries(weeks).filter(([, ds]) => ds.length >= 3).map(([mon, ds]) => {
      const r = rng(hash('wk' + mon));
      const avg = ds.reduce((s, d) => s + d.dev, 0) / ds.length;
      const dir = avg > .04 ? '偏多' : avg < -.04 ? '偏空' : '中性';
      const segs = SEGS.map(s => { const rows = ds.map(d => d.heat.find(h => h[0] === s.n)); return { n: s.n, heat: r1(rows.reduce((a, h) => a + h[1], 0) / rows.length), dev: r1(rows.reduce((a, h) => a + h[3], 0) / rows.length, 2) }; });
      const byHeat = segs.slice().sort((a, b) => b.heat - a.heat), byDev = segs.slice().sort((a, b) => b.dev - a.dev);
      // 个股方向：按出现在重点里的次数 × 方向
      const cnt = {};
      ds.forEach(d => d.picks.forEach(p => { const k = p.t + '|' + p.dir; cnt[k] = (cnt[k] || 0) + 1; }));
      const ranked = Object.entries(cnt).map(([k, n]) => ({ t: k.split('|')[0], dir: k.split('|')[1], n })).sort((a, b) => b.n - a.n);
      const persist = ranked.filter(x => x.n >= 2).slice(0, 3);
      const sun = addDays(mon, 6), fri = addDays(mon, 4);
      const label = `${+mon.slice(5, 7)}月第 ${Math.ceil(+mon.slice(8, 10) / 7)} 周`;
      return { mon, fri, sun, label, range: `${md(mon)} – ${md(fri)}`, days: ds, dir, avg: r1(avg, 2), segs: byHeat, bullSeg: byDev[0].n, bearSeg: byDev[byDev.length - 1].n, strongest: ranked[0], persist, next: shuffle(r, NEXT).slice(0, 3) };
    });
  }
  const weeks = genWeeks();
  const weekOf = date => weeks.find(w => date >= w.mon && date <= w.sun);

  // ---------- 样张（首页栏目卡 + 归档页共用） ----------
  const pillK = dir => /偏多|偏乐观/.test(dir) ? 'bull' : /偏空|偏谨慎/.test(dir) ? 'bear' : 'flat';
  const layerColor = seg => { const s = SEGS.find(x => x.n === seg); const l = s && CL.layers.find(l => l.name === s.layer); return l ? l.color : '#5b4cff'; };
  const peek = {
    morn: () => `<div class="pk-h"><span class="tag" style="--tc-deep:#b45309;--tc-bg:#fff4dc">盘前汇总 · 样张</span><b>${ICON.svg('sunrise', 20, 'pk-ic')}盘前汇总 · 11月2日 周一</b><span class="pk-t">美东 09:00 送达 · 即将上线</span></div>
      <div class="pk-cols">
        <div><h4>隔夜要闻</h4><ol><li><b>台积电</b>公布 10 月营收，同比增长，先进制程占比提升 <span class="src">公司公告</span></li><li><b>美光</b>HBM 产能扩建项目获地方审批 <span class="src">示例媒体</span></li><li>美联储官员讲话：对通胀回落的信心增强 <span class="src">示例媒体</span></li></ol></div>
        <div><h4>盘前异动 · AI 链</h4><div class="pk-list">${[['LITE', 4.2], ['MU', 2.1], ['COHR', 1.8], ['SMCI', -3.4], ['ANET', -1.2]].map(([t, v]) => { const c = CL.byT[t]; return `<div class="pk-row">${tb(t, 26)}<b class="num">${t}</b><small>${c.name}</small><span class="pill ${v >= 0 ? 'bull' : 'bear'}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%</span></div>`; }).join('')}</div></div>
        <div><h4>今日日程</h4><ul class="pk-cal"><li><b>08:30</b> 美国 10 月 ISM 制造业</li><li><b>盘前</b> 财报：AMD、SMCI</li><li><b>盘后</b> 财报：AAPL、AMZN</li><li><b>全天</b> 韩国 10 月出口（含芯片）</li></ul></div>
      </div>
      <div class="pk-f">隔夜要闻来自公司公告与主流媒体，盘前涨跌为延迟数据 · 不构成投资建议</div>`,
    eve: date => { const d = byDate[date] || P.base; return `<div class="pk-h"><span class="tag">期权日报 · 样张</span><b>${ICON.svg('bars', 20, 'pk-ic')}期权概览 · ${d.md}</b><span class="pk-t">北京时间 15:40 送达 · 海报署名 KZG 期权 Pro</span></div>
      <div class="pk-cols">
        <div><h4>大盘情绪</h4><div class="pk-big"><b class="num">${d.cp.toFixed(2)}</b><span class="pill ${pillK(d.mood)}">${d.mood}</span></div><p>全市场 CP 对比 20 日常态 ${d.base.toFixed(2)}，<b class="${d.dev >= 0 ? 'up' : 'down'}">${pct(d.dev)}</b>。${d.t3.split('；')[0].replace(/^全市场[^，]*，/, '')}。</p></div>
        <div><h4>AI 链重点</h4><div class="pk-list">${d.picks.map(p => `<div class="pk-row">${tb(p.t, 26)}<b class="num">${p.t}</b><small>可信度${p.conf}</small><span class="pill ${pillK(p.dir)}">${p.dir}</span></div>`).join('')}</div></div>
        <div><h4>最热环节</h4><div class="pk-big"><b class="num" style="color:${deep(layerColor(d.hot.seg))}">${d.hot.heat}x</b><span class="pk-sub">${d.hot.seg}</span></div><p>在榜 ${d.hot.ts.length} 只：${d.hot.ts.join('、')}。热度 = 成员量倍数中位数。</p></div>
      </div>
      <div class="pk-f">"偏多 / 偏空"是期权成交结构的数据面倾向 · 不构成投资建议</div>`; },
    rr: date => { const R = rr(date || '2026-10-30'); return `<div class="pk-h"><span class="tag" style="--tc-deep:#0b77c0;--tc-bg:#e7f4fe">研报日报 · 样张</span><b>${ICON.svg('doc', 20, 'pk-ic')}研报日报 · ${md(R.date)}</b><span class="pk-t">每个交易日 · 只放摘要，不放原文</span></div>
      <div class="pk-cols">
        ${R.items.slice(0, 3).map(i => `<div><div class="pk-row">${tb(i.t, 26)}<b class="num">${i.t}</b><small>${i.firm}</small><span class="pill ${i.to >= i.from ? 'bull' : 'bear'}">${i.from} → ${i.to}</span></div><div class="pk-rt">${i.rating}</div><ul>${i.pts.slice(0, 2).map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}
      </div>
      <div class="pk-f">摘要整理自机构公开报告，每篇不超过 3 条要点 · 不构成投资建议</div>`; },
    week: mon => { const w = (mon && weeks.find(x => x.mon === mon)) || weeks[weeks.length - 1]; const max = w.segs[0].heat; return `<div class="pk-h"><span class="tag" style="--tc-deep:#7a3ec9;--tc-bg:#f3e8ff">周报 · 样张</span><b>${ICON.svg('week', 20, 'pk-ic')}${w.label} · 期权周报</b><span class="pk-t">周日上午送达</span></div>
      <div class="pk-cols">
        <div><h4>本周方向</h4><div class="pk-kv"><span>全市场</span><span class="pill ${pillK(w.dir)}">${w.dir}</span></div><div class="pk-kv"><span>最偏多环节</span><b>${w.bullSeg}</b></div><div class="pk-kv"><span>最偏空环节</span><b>${w.bearSeg}</b></div><div class="pk-kv"><span>方向最强个股</span><b class="num">${w.strongest ? w.strongest.t : '—'}</b></div></div>
        <div><h4>环节轮动</h4><div class="pk-bars">${w.segs.slice(0, 5).map(s => `<div><span>${s.n}</span><i style="width:${s.heat / max * 100}%;background:${P.SEG[s.n]}"></i><b class="num">${s.heat.toFixed(1)}x</b></div>`).join('')}</div></div>
        <div><h4>下周看点</h4><ul class="pk-cal">${w.next.map(([d, t]) => `<li><b>${d}</b> ${t}</li>`).join('')}${w.persist.length ? `<li><b>持续信号</b> ${w.persist[0].t} 本周 ${w.persist[0].n} 天${w.persist[0].dir}</li>` : ''}</ul></div>
      </div>
      <div class="pk-f">本周方向按周汇总期权成交结构，不拆到每一天 · 不构成投资建议</div>`; },
  };

  // ---------- 归档页整页渲染 ----------
  // 期权日报文字版（和海报同一份数据）
  const text = date => { const d = byDate[date] || P.base; return `<div class="ar-text">
    <b class="t">期权概览 · ${d.md}</b>
    <p>大盘：<b class="${pillK(d.mood) === 'bull' ? 'up' : pillK(d.mood) === 'bear' ? 'down' : ''}">${d.mood}</b>（全市场 CP ${d.cp.toFixed(2)}，常态 ${d.base.toFixed(2)}，${pct(d.dev)}）<br>最热环节：${d.hot.seg} ${d.hot.heat}x（${d.hot.ts.join('、')}）</p>
    <b>AI 链重点</b>
    <ol>${d.picks.map(p => `<li><b>${p.t}</b> ${p.dir} · 可信度${p.conf} — 量 ${p.vx}x，CP ${pct(p.cp)}；${p.why.replace(/。$/, '')}</li>`).join('')}</ol>
    <b>热点事件</b>
    <ol>${d.events.map(e => `<li>${e.text}（${e.src}）</li>`).join('')}</ol>
    <p>观察：${d.watch.join('、')}</p>
    <p class="f">—— 期权数据面倾向，不构成投资建议 · KZG 期权 Pro</p></div>`; };

  const rrPage = date => { const R = rr(date); return `<div class="ar-rr">
    <div class="ar-rr-sum"><span>今日 <b class="num">${R.total}</b> 条评级 / 目标价调整，摘录 <b class="num">${R.items.length}</b> 条</span><span class="pill bull">上调 ${R.up}</span><span class="pill bear">下调 ${R.down}</span><span class="pill flat">维持 ${R.keep}</span></div>
    ${R.items.map(i => { const col = CL.layers[i.c.li].color; return `<div class="ar-rr-item" style="--c:${col}">
      <div class="h">${cbadge(i.c, 40, col)}<div class="id"><b class="num">${i.t}</b><small>${i.c.name} · ${CL.layers[i.c.li].name} / ${i.c.seg}</small></div><span class="tag" style="--tc-deep:${deep(col)};--tc-bg:${mix(col, '#ffffff', .88)}">${i.act}</span><span class="pill ${i.to > i.from ? 'bull' : i.to < i.from ? 'bear' : 'flat'}">${i.from} → ${i.to}</span></div>
      <div class="rt">${i.firm} · ${i.rating}</div>
      <ul>${i.pts.map(x => `<li>${x}</li>`).join('')}</ul>
      <a class="go" href="/company?t=${i.t}">公司档案 →</a></div>`; }).join('')}
    <div class="ar-f">摘要整理自机构公开报告，每篇不超过 3 条要点；评级与目标价为机构观点的转述 · 不构成投资建议</div></div>`; };

  const weekPage = mon => { const w = weeks.find(x => x.mon === mon) || weeks[weeks.length - 1]; const max = w.segs[0].heat; return `<div class="ar-week">
    <div class="ar-wk-head"><div><span class="tag" style="--tc-deep:#7a3ec9;--tc-bg:#f3e8ff">期权周报</span><h3>${w.label} · ${w.range}</h3></div><span class="pill ${pillK(w.dir)} big">本周 ${w.dir}</span></div>
    <div class="ar-wk-days">${w.days.map(d => `<a href="?col=eve&d=${d.date}" class="${pillK(d.mood)}" title="${d.md} ${d.mood}"><i style="height:${Math.max(6, Math.abs(d.dev) * 160)}px"></i><span>${d.wd.slice(1)}</span></a>`).join('')}<small>每天的全市场 CP 偏离 · 点一根看当天</small></div>
    <div class="ar-wk-grid">
      <div class="box"><h4>本周方向</h4><div class="pk-kv"><span>全市场 CP 偏离均值</span><b class="num ${w.avg >= 0 ? 'up' : 'down'}">${pct(w.avg)}</b></div><div class="pk-kv"><span>最偏多环节</span><b>${w.bullSeg}</b></div><div class="pk-kv"><span>最偏空环节</span><b>${w.bearSeg}</b></div><div class="pk-kv"><span>方向最强个股</span><b class="num">${w.strongest ? `${w.strongest.t} · ${w.strongest.n} 天${w.strongest.dir}` : '—'}</b></div></div>
      <div class="box"><h4>环节轮动 · 周均热度</h4><div class="pk-bars">${w.segs.map(s => `<div><span>${s.n}</span><i style="width:${s.heat / max * 100}%;background:${P.SEG[s.n]}"></i><b class="num">${s.heat.toFixed(1)}x</b></div>`).join('')}</div></div>
      <div class="box"><h4>持续信号</h4>${w.persist.length ? `<div class="pk-list">${w.persist.map(p => `<div class="pk-row">${tb(p.t, 26)}<b class="num">${p.t}</b><small>本周进重点 ${p.n} 天</small><span class="pill ${pillK(p.dir)}">${p.dir}</span></div>`).join('')}</div>` : '<p class="disclaimer">本周没有连续两天以上进重点的个股。</p>'}<h4 style="margin-top:14px">下周看点</h4><ul class="pk-cal">${w.next.map(([d, t]) => `<li><b>${d}</b> ${t}</li>`).join('')}</ul></div>
    </div>
    <div class="ar-f">本周方向按周汇总期权成交结构，不拆到每一天；"持续信号"只统计进重点的天数 · 不构成投资建议</div></div>`; };

  // ---------- 专栏报告（不定期：财报前瞻 / 产业链专题 / 事件专题；全部虚构） ----------
  const KIND = { '财报': { c: '#ff6b2c', ic: 'trend' }, '产业链': { c: '#00a8c6', ic: 'factory' }, '事件': { c: '#a04cf5', ic: 'calendar' } };
  const columns = [
    { id: 'nvda-earnings-preview', date: '2026-10-29', kind: '财报', title: 'NVDA 财报前瞻：期权市场把筹码放在了哪里', dek: '财报前 5 个交易日，成交量前 100 里 NVDA 的 Call / Put 结构、远月仓位和研报目标价分布，一次看完。', tags: ['NVDA', 'TSM', 'MU', 'SMCI'], readMin: 6,
      sections: [
        { h: '财报日程与这次要看的三件事', p: ['NVDA 将于 11 月 19 日美股盘后公布季度财报（示例日程）。过去四个季度，财报后首个交易日的成交量都在 20 日均值的 2 倍以上。', '这次市场关心的三件事：数据中心收入占比、新平台量产时间表、毛利率指引。它们分别对应产业链上的 TSM（代工）、MU（存储）和 SMCI（服务器）。'] },
        { h: '期权结构：近 5 日发生了什么', p: ['成交量倍数从 1.1 倍升到 1.4 倍，权利金倍数 1.6 倍；CP 比高于 20 日常态 22%，Call 集中在 11 月 21 日到期的近月合约；LEAP Call 占比持平。', '按期权日报的口径，这属于"量放大、方向偏多、可信度中"，还没到强异动。'], data: { kind: 'bars', rows: [['量倍数', 1.4, 3], ['权利金倍数', 1.6, 3], ['CP 偏离', .22, .6], ['LEAP 趋势', .04, .6]] } },
        { h: '研报目标价怎么分布', p: ['近 60 日 4 家机构的目标价区间 494 ~ 542，均值 517；10 月 19 日机构 A 上调评级后，区间上沿抬高了 8%。', '目标价与现价的距离是研报日报每天都会更新的字段，财报后变化最大的往往是上沿。'], data: { kind: 'kv', rows: [['目标价区间', '494 – 542'], ['均值', '517'], ['现价（延迟）', '514'], ['覆盖机构', '4 家']] } },
        { h: '上下游可能的联动', p: ['TSM 的先进制程占比、MU 的 HBM 出货、SMCI 的服务器毛利率，都会在同一周被重新定价。产业镇上这三家在不同街区，但平板车上的货物是同一条链。', '财报后 48 小时，期权日报会把这几家的 CP 偏离放在同一张表里。'] },
        { h: '财报后怎么用日报', p: ['看三处：全市场情绪有没有跟着变、AI 环节热度里芯片层是否仍是最热、NVDA 的 LEAP 占比有没有方向。这些都是数据面，不构成任何投资建议。'] },
      ] },
    { id: '800g-optics-chain', date: '2026-10-22', kind: '产业链', title: '800G 光模块：从一颗激光器到数据中心，7 家公司怎么分工', dek: '把光模块这条子链拆开：器件、整机、交换、下游云厂商各在哪一站，以及近 30 日期权和研报在这条链上看到了什么。', tags: ['LITE', 'COHR', 'CIEN', 'ANET', 'MSFT'], readMin: 8,
      sections: [
        { h: '一只光模块的旅程', p: ['激光器与光芯片（LITE、COHR）→ 光模块整机与系统（CIEN）→ 交换机与连接（ANET、CRDO）→ 云厂商的数据中心（MSFT、GOOGL）。每过一站，附加值与客户集中度都在变。'] },
        { h: '7 家公司在链上的位置', p: ['上游器件的毛利率最高但订单最集中；整机环节产能是瓶颈；交换环节跟着云厂商的资本开支走。'], data: { kind: 'kv', rows: [['器件 / 激光器', 'LITE · COHR'], ['整机 / 系统', 'CIEN'], ['交换 / 连接', 'ANET · CRDO'], ['下游云', 'MSFT · GOOGL']] } },
        { h: '近 30 日：期权与研报怎么看这条链', p: ['光模块环节热度 9 月下旬起连续 11 个交易日在 1.5 倍以上，10 月 30 日达到 2.3 倍，是六个环节里最高；LITE 连续 3 天进期权日报重点，方向偏多、可信度高。', '研报侧：10 月有 5 篇覆盖这条链的评级或目标价调整，4 篇上调，集中在 800G 出货指引。'], data: { kind: 'bars', rows: [['光模块热度（10/30）', 2.3, 3], ['交换 / 连接热度', 1.4, 3], ['研报上调篇数（10 月）', 4, 6], ['研报下调篇数', 1, 6]] } },
        { h: '之后看什么', p: ['1.6T 产品的送样进度、云厂商下一季资本开支指引、以及期权日报里光模块环节热度是否回落到 1.5 倍以下。'] },
      ] },
    { id: 'fomc-48h-ai-options', date: '2026-10-15', kind: '事件', title: '议息后 48 小时：AI 链的期权结构怎么变', dek: '以美联储议息为事件锚点，看全市场 CP、8 个环节热度和研报调整在议息前后两天的变化。', tags: ['NVDA', 'AMD', 'VRT', 'CRWV'], readMin: 5,
      sections: [
        { h: '事件时间线', p: ['10 月 13 日（周二）议息结果公布，10 月 14 ~ 15 日为"后 48 小时"。全市场 CP 从议息前一日的 0.74 升到 0.80，偏离从 −3% 到 +6%。'], data: { kind: 'kv', rows: [['议息前一日 CP', '0.74（−3%）'], ['议息次日 CP', '0.80（+6%）'], ['最热环节（前）', 'GPU/加速器 1.9x'], ['最热环节（后）', '存储 1.7x']] } },
        { h: '8 个环节的变化', p: ['芯片与算力租赁的热度在议息后回落，电力 / 散热和存储上升；这和周报里"环节轮动"看到的方向一致。'], data: { kind: 'bars', rows: [['GPU/加速器', 1.3, 3], ['存储', 1.7, 3], ['电力/散热', 1.6, 3], ['GPU/算力云', 1.0, 3]] } },
        { h: '研报在议息后的调整', p: ['两天内 7 篇评级或目标价调整，4 篇上调、2 篇下调、1 篇首次覆盖；上调集中在电力设备。'] },
        { h: '下一个节点', p: ['11 月 CPI 与 NVDA 财报在同一周。期权日报会在"近期日程"里标出来。'] },
      ] },
    { id: 'hbm-capacity-map', date: '2026-10-08', kind: '产业链', title: 'HBM 扩产：存储三家的产能地图', dek: 'MU、SNDK、WDC 三家在 HBM 与企业级存储上的扩产节奏，以及设备厂商 AMAT、LRCX 的订单可见度。', tags: ['MU', 'SNDK', 'WDC', 'AMAT', 'LRCX'], readMin: 7,
      sections: [
        { h: '为什么是现在', p: ['HBM 占存储厂商收入的比重在一年内翻了一番（示例），而产能扩建的审批与设备交付周期在 9 ~ 12 个月。'] },
        { h: '三家的扩产节奏', p: ['MU 的扩建项目 10 月获地方审批；SNDK 以企业级 SSD 为主；WDC 的 HDD 产线转向数据中心客户。'], data: { kind: 'kv', rows: [['MU', 'HBM 扩建获批 · 2027 年量产'], ['SNDK', '企业级 SSD 产能 +30%'], ['WDC', '数据中心 HDD 占比提升'], ['AMAT / LRCX', '订单可见度到明年下半年']] } },
        { h: '期权与研报怎么看', p: ['存储环节热度 10 月均值 1.5 倍，MU 在 10 月进期权日报重点 3 次；研报侧 MU 有 2 篇上调目标价，均提到 HBM 产能。'] },
      ] },
  ];
  const colById = Object.fromEntries(columns.map(c => [c.id, c]));
  const colsOn = date => columns.filter(c => c.date === date);
  const kindTag = k => `<span class="tag" style="--tc-deep:${deep(KIND[k].c)};--tc-bg:${mix(KIND[k].c, '#ffffff', .86)}">${k}</span>`;
  const colCard = (c, big) => `<a class="colx${big ? ' big' : ''}" href="/column?id=${c.id}" style="--c:${KIND[c.kind].c}"><div class="cx-k">${kindTag(c.kind)}<span class="num">${md(c.date)}</span><span>· 读 ${c.readMin} 分钟</span></div><b>${c.title}</b><p>${c.dek}</p><div class="cx-tags">${c.tags.slice(0, 4).map(t => `<span>${tb(t, 20)}${t}</span>`).join('')}</div></a>`;
  peek.col = () => `<div class="pk-h"><span class="tag" style="--tc-deep:#c2410c;--tc-bg:#ffece3">专栏报告 · 样张</span><b>${ICON.svg('column', 20, 'pk-ic')}最近三篇</b><span class="pk-t">不定期 · 一件事讲透，带数据和图</span></div>
      <div class="pk-cols">${columns.slice(0, 3).map(c => colCard(c)).join('')}</div>
      <div class="pk-f">专栏是对财报、产业链或事件的专题整理，数字来自期权日报与研报日报的数据面 · 不构成投资建议</div>`;
  const colList = (cur) => `<div class="ar-cols-list">${columns.map(c => colCard(c, c.date === cur)).join('')}</div>`;
  const colPage = id => { const c = colById[id] || columns[0]; const K = KIND[c.kind];
    const data = d => !d ? '' : d.kind === 'kv' ? `<div class="cx-data kv">${d.rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`
      : `<div class="cx-data bars">${d.rows.map(([k, v, max]) => `<div><span>${k}</span><i><em style="width:${Math.min(100, Math.abs(v) / max * 100)}%"></em></i><b class="num">${typeof v === 'number' && max <= 1 ? pct(v) : v + (max === 3 ? 'x' : '')}</b></div>`).join('')}</div>`;
    return { c, K, html: c.sections.map((sec, i) => `<section class="cx-sec" id="s${i + 1}"><h2>${sec.h}</h2>${sec.p.map(x => `<p>${x}</p>`).join('')}${data(sec.data)}</section>`).join('') };
  };

  // ---------- 从 JSON 装载（站点模式）：把 pipeline 产出的 archive.json 原地灌进上面这些数组 / 缓存，消费方拿到的引用不变 ----------
  function load(j) {
    if (!j || !Array.isArray(j.days) || !j.days.length) return false;
    days.length = 0; days.push(...j.days); Object.keys(byDate).forEach(k => delete byDate[k]); days.forEach(d => { byDate[d.date] = d; });
    DATES.length = 0; DATES.push(...days.map(d => d.date));
    Object.keys(rrCache).forEach(k => delete rrCache[k]);
    Object.entries(j.rr || {}).forEach(([date, R]) => { rrCache[date] = { date, total: R.total, up: R.up, down: R.down, keep: R.keep, items: (R.items || []).map(i => ({ ...i, c: CL.byT[i.t], sign: i.to > i.from ? 1 : i.to < i.from ? -1 : 0 })).filter(i => i.c) }; });
    weeks.length = 0; (j.weeks || []).forEach(w => weeks.push({ ...w, days: (w.days || []).map(x => byDate[x.date] || x), next: (w.next || []).map(n => Array.isArray(n) ? n : [n.when, n.what]) }));
    columns.length = 0; (j.columns || []).forEach(c => columns.push(c)); Object.keys(colById).forEach(k => delete colById[k]); columns.forEach(c => { colById[c.id] = c; });
    ARCHIVE.source = 'json'; ARCHIVE.gen = j.gen || null; return true;
  }
  const ARCHIVE = { DATES, days, byDate, weeks, weekOf, rr, SEGS, peek, text, rrPage, weekPage, md, wd, addDays, dow, pct, pillK, tb, columns, colById, colsOn, colList, colPage, colCard, KIND, kindTag, load, source: 'generated' };
  window.ARCHIVE = ARCHIVE;
  // 站点（http）优先读 /data/archive.json；设计稿直接用 file:// 打开时用内置生成器。消费方等 ARCHIVE_READY 再初始化
  window.ARCHIVE_READY = (async () => {
    if (typeof location === 'undefined' || location.protocol === 'file:' || window.CX_NO_JSON) return ARCHIVE;   // Node 里（导出脚本）和设计稿 file:// 下都用生成器
    try { const r = await fetch(window.CX_ARCHIVE_URL || '/data/archive.json', { cache: 'no-cache' }); if (r.ok) load(await r.json()); }
    catch (e) { console.warn('archive.json 不可用，用内置示例数据', e); }
    return ARCHIVE;
  })();
})();
