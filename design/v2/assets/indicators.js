/*
 * ChainLens v2 · 技术指标与示例行情
 * 指标：MA / EMA / BOLL / MACD / KDJ / RSI / 成交量均量
 * describe()：把指标"当前状态"翻译成客观描述句，只陈述数值与位置，不做方向判断
 */
(function () {
  const IND = {};

  // ---------- 示例行情（虚构，按代码做种子，保证每次一致） ----------
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }
  IND.genDaily = function (ticker, n, endDate) {
    let seed = 0; for (const c of ticker) seed = seed * 31 + c.charCodeAt(0);
    const r = rng(seed);
    const dates = [];
    const d = new Date(endDate + 'T00:00:00Z');
    while (dates.length < n) {
      const wd = d.getUTCDay();
      if (wd !== 0 && wd !== 6) dates.unshift(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() - 1);
    }
    const base = 40 + (seed % 260);
    let p = base, vol = 0.017, trend = 0;
    return dates.map((date, i) => {
      if (i % 60 === 0) trend = (r() - 0.45) * 0.003;           // 分段趋势
      vol = Math.min(Math.max(vol + (r() - 0.5) * 0.003, 0.01), 0.03); // 波动率聚集
      const o = p * (1 + gauss(r) * vol * 0.35);
      const c = o * (1 + trend + gauss(r) * vol);
      const h = Math.max(o, c) * (1 + Math.abs(gauss(r)) * vol * 0.45);
      const l = Math.min(o, c) * (1 - Math.abs(gauss(r)) * vol * 0.45);
      const v = Math.round((180 + r() * 140) * (1 + Math.abs(c / o - 1) * 25) * 1e5);
      p = c;
      return { time: date, open: +o.toFixed(2), high: +h.toFixed(2), low: +l.toFixed(2), close: +c.toFixed(2), volume: v };
    });
  };

  // 日K → 周K / 月K
  IND.aggregate = function (daily, unit) {
    const out = [];
    const key = t => {
      if (unit === 'M') return t.slice(0, 7);
      const d = new Date(t + 'T00:00:00Z'); const wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd);
      return d.toISOString().slice(0, 10);
    };
    daily.forEach(b => {
      const k = key(b.time), cur = out[out.length - 1];
      if (!cur || cur._k !== k) out.push({ _k: k, time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume });
      else { cur.high = Math.max(cur.high, b.high); cur.low = Math.min(cur.low, b.low); cur.close = b.close; cur.volume += b.volume; cur.time = b.time; }
    });
    return out;
  };

  // ---------- 指标 ----------
  IND.sma = (vals, n) => vals.map((_, i) => i < n - 1 ? null : vals.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n);
  IND.ema = (vals, n) => { const k = 2 / (n + 1); let e = null; return vals.map(v => (e = e == null ? v : v * k + e * (1 - k))); };
  IND.boll = (closes, n = 20, m = 2) => closes.map((_, i) => {
    if (i < n - 1) return null;
    const s = closes.slice(i - n + 1, i + 1), mid = s.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(s.reduce((a, b) => a + (b - mid) ** 2, 0) / n);
    return { mid, up: mid + m * sd, dn: mid - m * sd };
  });
  IND.macd = (closes, f = 12, s = 26, sig = 9) => {
    const ef = IND.ema(closes, f), es = IND.ema(closes, s);
    const dif = ef.map((v, i) => v - es[i]);
    const dea = IND.ema(dif, sig);
    return dif.map((v, i) => ({ dif: v, dea: dea[i], hist: (v - dea[i]) * 2 }));
  };
  IND.kdj = (bars, n = 9) => {
    let k = 50, d = 50;
    return bars.map((b, i) => {
      const s = bars.slice(Math.max(0, i - n + 1), i + 1);
      const hh = Math.max(...s.map(x => x.high)), ll = Math.min(...s.map(x => x.low));
      const rsv = hh === ll ? 50 : (b.close - ll) / (hh - ll) * 100;
      k = (2 * k + rsv) / 3; d = (2 * d + k) / 3;
      return { k, d, j: 3 * k - 2 * d };
    });
  };
  IND.rsi = (closes, n = 14) => {
    let ag = 0, al = 0;
    return closes.map((c, i) => {
      if (i === 0) return null;
      const ch = c - closes[i - 1], g = Math.max(ch, 0), l = Math.max(-ch, 0);
      if (i <= n) { ag += g / n; al += l / n; if (i < n) return null; }
      else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; }
      return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    });
  };

  IND.compute = function (bars) {
    const c = bars.map(b => b.close);
    return {
      ma5: IND.sma(c, 5), ma10: IND.sma(c, 10), ma20: IND.sma(c, 20), ma60: IND.sma(c, 60),
      boll: IND.boll(c), macd: IND.macd(c), kdj: IND.kdj(bars),
      rsi6: IND.rsi(c, 6), rsi12: IND.rsi(c, 12), rsi24: IND.rsi(c, 24), rsi14: IND.rsi(c, 14),
      vma20: IND.sma(bars.map(b => b.volume), 20),
    };
  };

  // ---------- 客观描述（规则固定，不含任何方向性判断） ----------
  IND.describe = function (bars, x) {
    const i = bars.length - 1, c = bars[i].close, f = v => v.toFixed(2);
    const out = [];
    // 均线位置
    const mas = [['MA5', x.ma5[i]], ['MA10', x.ma10[i]], ['MA20', x.ma20[i]], ['MA60', x.ma60[i]]];
    const above = mas.filter(m => c > m[1]).map(m => m[0]);
    let cross = null;
    for (let k = i; k > i - 40 && k > 0; k--) {
      const a = x.ma5[k] - x.ma20[k], b = x.ma5[k - 1] - x.ma20[k - 1];
      if (a != null && b != null && Math.sign(a) !== Math.sign(b)) { cross = { ago: i - k, dir: a > 0 ? '上穿' : '下穿' }; break; }
    }
    out.push({ key: '均线', value: `${above.length}/4`, meter: above.length / 4,
      text: `收盘价位于 ${above.length ? above.join('、') + ' 之上' : '四条均线之下'}` + (cross ? `；MA5 于 ${cross.ago} 个交易日前${cross.dir} MA20` : '') });
    // 布林带
    const bb = x.boll[i], pb = (c - bb.dn) / (bb.up - bb.dn), bw = (bb.up - bb.dn) / bb.mid * 100;
    out.push({ key: 'BOLL', value: '%B ' + pb.toFixed(2), meter: Math.min(Math.max(pb, 0), 1), zones: [0, 1],
      text: `收盘价处于布林带${pb > 1 ? '上轨之外' : pb < 0 ? '下轨之外' : (pb > 0.8 ? '上轨附近' : pb < 0.2 ? '下轨附近' : '中轨附近')}；带宽 ${bw.toFixed(1)}%` });
    // MACD
    const m = x.macd[i];
    let run = 0; const sg = Math.sign(m.hist); for (let k = i; k >= 0 && Math.sign(x.macd[k].hist) === sg; k--) run++;
    out.push({ key: 'MACD', value: f(m.hist), meter: Math.min(Math.max(0.5 + m.hist / (Math.abs(c) * 0.04), 0), 1), zones: [0.5],
      text: `DIF ${f(m.dif)}、DEA ${f(m.dea)} 均在零轴${m.dif > 0 && m.dea > 0 ? '上方' : m.dif < 0 && m.dea < 0 ? '下方' : '两侧'}；柱状图连续 ${run} 日为${sg > 0 ? '正' : '负'}` });
    // KDJ
    const kd = x.kdj[i];
    out.push({ key: 'KDJ', value: 'J ' + kd.j.toFixed(1), meter: Math.min(Math.max(kd.j, 0), 100) / 100, zones: [0.2, 0.8],
      text: `K ${kd.k.toFixed(1)} / D ${kd.d.toFixed(1)} / J ${kd.j.toFixed(1)}；J 值${kd.j > 80 ? '高于 80' : kd.j < 20 ? '低于 20' : '位于 20–80 之间'}` });
    // RSI
    const r = x.rsi14[i];
    out.push({ key: 'RSI(14)', value: r.toFixed(1), meter: r / 100, zones: [0.3, 0.7],
      text: `RSI(14) 为 ${r.toFixed(1)}，处于 ${r >= 70 ? '70 以上' : r <= 30 ? '30 以下' : r >= 50 ? '50–70' : '30–50'} 区间` });
    // 量能
    const vr = bars[i].volume / x.vma20[i];
    out.push({ key: '量能', value: vr.toFixed(2) + '×', meter: Math.min(vr / 3, 1), zones: [1 / 3],
      text: `当日成交量为 20 日均量的 ${vr.toFixed(2)} 倍` });
    return out;
  };

  window.IND = IND;
})();
