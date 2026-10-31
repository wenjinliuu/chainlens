/*
 * ChainLens 设计稿 · 公共脚本
 * - 版本切换（同一页面放多个风格对比）
 * - 高清图下载（html-to-image，2x / 3x）
 * - 热力图（squarified treemap）
 * - K 线 + 事件标记 + 目标价区间带（设计稿用 SVG 手绘；正式版用 TradingView Lightweight Charts）
 * - CP 比副图（含自身分布 ±1σ 带）
 */
(function () {
  const CL = {};

  // ---------- 小工具 ----------
  CL.fmt = function (v, d) { return Number(v).toFixed(d == null ? 2 : d); };
  CL.pct = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; };
  CL.dirCls = function (v) { return v > 0 ? 'up' : v < 0 ? 'down' : 'flat'; };
  CL.el = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  CL.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // 涨跌 → 颜色（绿涨红跌），按幅度插值
  CL.heatColor = function (chg, alpha) {
    const a = Math.min(Math.abs(chg) / 6, 1);
    const base = chg >= 0 ? [22, 163, 74] : [220, 38, 38];
    const lo = [241, 245, 249];
    const mix = lo.map(function (l, i) { return Math.round(l + (base[i] - l) * (0.18 + a * 0.82)); });
    return 'rgba(' + mix.join(',') + ',' + (alpha == null ? 1 : alpha) + ')';
  };

  // ---------- 版本切换 ----------
  CL.initVariants = function () {
    const tabs = document.querySelectorAll('[data-variant-tab]');
    const panes = document.querySelectorAll('[data-variant]');
    function show(id) {
      tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.variantTab === id); });
      panes.forEach(function (p) { p.hidden = p.dataset.variant !== id; });
      history.replaceState(null, '', '#' + id);
      window.dispatchEvent(new Event('resize'));
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.variantTab); }); });
    const initial = location.hash.slice(1);
    show(Array.from(tabs).some(function (t) { return t.dataset.variantTab === initial; }) ? initial : tabs[0].dataset.variantTab);
  };

  // ---------- 高清图下载 ----------
  CL.initDownload = function () {
    document.querySelectorAll('[data-download]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const target = document.querySelector(btn.dataset.download);
        if (!target || !window.htmlToImage) { alert('下载组件未加载，请检查网络'); return; }
        const label = btn.textContent;
        btn.textContent = '生成中…';
        btn.disabled = true;
        try {
          const url = await window.htmlToImage.toPng(target, {
            pixelRatio: Number(btn.dataset.ratio || 2),
            skipFonts: true,
            backgroundColor: getComputedStyle(target).backgroundColor,
          });
          const a = document.createElement('a');
          a.href = url;
          a.download = btn.dataset.filename || 'chainlens.png';
          a.click();
        } catch (e) {
          console.error(e);
          alert('生成失败：' + e.message);
        } finally {
          btn.textContent = label;
          btn.disabled = false;
        }
      });
    });
  };

  // ---------- Squarified treemap ----------
  function worst(row, w) {
    const s = row.reduce(function (a, b) { return a + b.area; }, 0);
    const mx = Math.max.apply(null, row.map(function (r) { return r.area; }));
    const mn = Math.min.apply(null, row.map(function (r) { return r.area; }));
    return Math.max((w * w * mx) / (s * s), (s * s) / (w * w * mn));
  }
  CL.treemap = function (items, x, y, w, h) {
    const total = items.reduce(function (a, b) { return a + b.value; }, 0);
    const scale = (w * h) / total;
    const nodes = items.slice().sort(function (a, b) { return b.value - a.value; })
      .map(function (it) { return Object.assign({}, it, { area: it.value * scale }); });
    const out = [];
    let rect = { x: x, y: y, w: w, h: h };
    let row = [];
    function layoutRow(row, rect) {
      const s = row.reduce(function (a, b) { return a + b.area; }, 0);
      if (rect.w >= rect.h) {
        const cw = s / rect.h; let cy = rect.y;
        row.forEach(function (r) { const ch = r.area / cw; out.push(Object.assign(r, { x: rect.x, y: cy, w: cw, h: ch })); cy += ch; });
        return { x: rect.x + cw, y: rect.y, w: rect.w - cw, h: rect.h };
      }
      const ch = s / rect.w; let cx = rect.x;
      row.forEach(function (r) { const cw = r.area / ch; out.push(Object.assign(r, { x: cx, y: rect.y, w: cw, h: ch })); cx += cw; });
      return { x: rect.x, y: rect.y + ch, w: rect.w, h: rect.h - ch };
    }
    while (nodes.length) {
      const side = Math.min(rect.w, rect.h);
      const n = nodes[0];
      if (!row.length || worst(row.concat([n]), side) <= worst(row, side)) { row.push(nodes.shift()); }
      else { rect = layoutRow(row, rect); row = []; }
    }
    if (row.length) layoutRow(row, rect);
    return out;
  };

  // 热力图：先按环节分块，再在块内按市值分格
  CL.renderHeatmap = function (el, segments, opts) {
    opts = opts || {};
    const gap = opts.gap == null ? 3 : opts.gap;
    const W = el.clientWidth, H = el.clientHeight;
    el.innerHTML = '';
    el.style.position = 'relative';
    const segItems = segments.map(function (s) {
      return { seg: s, value: s.stocks.reduce(function (a, b) { return a + Math.sqrt(b.cap); }, 0) };
    });
    CL.treemap(segItems, 0, 0, W, H).forEach(function (sr) {
      const box = CL.el('<div class="hm-seg" style="position:absolute;left:' + sr.x + 'px;top:' + sr.y + 'px;width:' + sr.w + 'px;height:' + sr.h + 'px"></div>');
      el.appendChild(box);
      const labelH = opts.segLabel === false ? 0 : 18;
      if (labelH) box.appendChild(CL.el('<div class="hm-seg-label">' + sr.seg.name + '</div>'));
      const cells = sr.seg.stocks.map(function (s) { return Object.assign({}, s, { value: Math.sqrt(s.cap) }); });
      CL.treemap(cells, gap / 2, labelH + gap / 2, sr.w - gap, sr.h - labelH - gap).forEach(function (c) {
        const big = c.w > 70 && c.h > 44;
        const cell = CL.el(
          '<a class="hm-cell" href="stock-desktop.html" title="' + c.n + ' ' + CL.pct(c.chg) + '" style="left:' + (c.x + gap / 2) + 'px;top:' + (c.y + gap / 2) + 'px;width:' + Math.max(c.w - gap, 0) + 'px;height:' + Math.max(c.h - gap, 0) + 'px;background:' + CL.heatColor(c.chg) + ';color:' + (Math.abs(c.chg) > 2.2 ? '#fff' : '#1d2433') + '">' +
          (c.w > 34 && c.h > 18 ? '<b>' + c.t + '</b>' : '') + (big ? '<span>' + CL.pct(c.chg) + '</span>' : '') + '</a>');
        box.appendChild(cell);
      });
    });
  };

  // ---------- K 线 ----------
  const EVT = {
    option: { color: 'var(--c-option, #8b5cf6)', label: '期', name: '期权异动' },
    report: { color: 'var(--c-report, #2f7bf6)', label: '研', name: '研报调整' },
    news: { color: 'var(--c-news, #f59e0b)', label: '闻', name: '新闻' },
  };
  CL.EVT = EVT;

  CL.renderKline = function (el, stock, opts) {
    opts = opts || {};
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const pad = { l: 8, r: 56, t: 16, b: 26 };
    const cs = stock.candles, band = stock.targetBand;
    const n = cs.length;
    const cw = (W - pad.l - pad.r) / n;
    let lo = Infinity, hi = -Infinity;
    cs.forEach(function (c) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); });
    if (opts.band !== false) band.forEach(function (b) { lo = Math.min(lo, b.lo); hi = Math.max(hi, b.hi); });
    const span = hi - lo; lo -= span * 0.06; hi += span * 0.1;
    const volH = opts.volume === false ? 0 : (H - pad.t - pad.b) * 0.16;
    const priceH = H - pad.t - pad.b - volH;
    const X = function (i) { return pad.l + cw * i + cw / 2; };
    const Y = function (p) { return pad.t + (1 - (p - lo) / (hi - lo)) * priceH; };

    let s = '<svg class="kline" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    // 网格 + 价格刻度
    for (let k = 0; k <= 4; k++) {
      const p = lo + (hi - lo) * (k / 4);
      const y = Y(p);
      s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y + '" y2="' + y + '" class="k-grid"/>';
      s += '<text x="' + (W - pad.r + 8) + '" y="' + (y + 4) + '" class="k-axis">' + p.toFixed(0) + '</text>';
    }
    // 月份刻度
    let lastM = '';
    cs.forEach(function (c, i) {
      const m = c.date.slice(5, 7);
      if (m !== lastM) {
        lastM = m;
        s += '<text x="' + X(i) + '" y="' + (H - 8) + '" class="k-axis" text-anchor="middle">' + Number(m) + '月</text>';
      }
    });
    // 目标价区间带
    if (opts.band !== false) {
      let top = '', bot = '', avg = '';
      band.forEach(function (b, i) {
        top += (i ? 'L' : 'M') + X(i) + ' ' + Y(b.hi);
        avg += (i ? 'L' : 'M') + X(i) + ' ' + Y(b.avg);
      });
      for (let i = n - 1; i >= 0; i--) bot += 'L' + X(i) + ' ' + Y(band[i].lo);
      s += '<path d="' + top + bot + 'Z" class="k-band"/>';
      s += '<path d="' + avg + '" class="k-band-avg"/>';
      const lb = band[n - 1];
      s += '<text x="' + (W - pad.r + 8) + '" y="' + (Y(lb.hi) - 2) + '" class="k-band-label">高 ' + lb.hi + '</text>';
      s += '<text x="' + (W - pad.r + 8) + '" y="' + (Y(lb.avg) + 4) + '" class="k-band-label">均 ' + lb.avg + '</text>';
      s += '<text x="' + (W - pad.r + 8) + '" y="' + (Y(lb.lo) + 10) + '" class="k-band-label">低 ' + lb.lo + '</text>';
    }
    // 成交量
    if (volH) {
      const vb = H - pad.b;
      cs.forEach(function (c, i) {
        const h = c.v / 1.6 * volH;
        s += '<rect x="' + (X(i) - cw * 0.35) + '" y="' + (vb - h) + '" width="' + (cw * 0.7) + '" height="' + h + '" class="k-vol ' + (c.c >= c.o ? 'up' : 'down') + '"/>';
      });
    }
    // K 线
    cs.forEach(function (c, i) {
      const cls = c.c >= c.o ? 'up' : 'down';
      const x = X(i);
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + Y(c.h) + '" y2="' + Y(c.l) + '" class="k-wick ' + cls + '"/>';
      const y1 = Y(Math.max(c.o, c.c)), y2 = Y(Math.min(c.o, c.c));
      s += '<rect x="' + (x - cw * 0.36) + '" y="' + y1 + '" width="' + (cw * 0.72) + '" height="' + Math.max(y2 - y1, 1) + '" rx="0.6" class="k-body ' + cls + '"/>';
    });
    // 事件标记
    stock.events.forEach(function (e, idx) {
      const c = cs[e.i];
      const x = X(e.i);
      const above = e.type !== 'option';
      const y = above ? Y(c.h) - 14 : Y(c.l) + 14;
      s += '<g class="k-evt" data-evt="' + idx + '">' +
        '<line x1="' + x + '" x2="' + x + '" y1="' + (above ? Y(c.h) - 3 : Y(c.l) + 3) + '" y2="' + (above ? y + 7 : y - 7) + '" stroke="' + EVT[e.type].color + '" stroke-width="1"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="8.5" fill="' + EVT[e.type].color + '"/>' +
        '<text x="' + x + '" y="' + (y + 3.6) + '" text-anchor="middle" class="k-evt-label">' + EVT[e.type].label + '</text></g>';
    });
    s += '</svg>';
    el.innerHTML = s;
    el.style.position = 'relative';

    // 悬停详情卡
    const tip = CL.el('<div class="k-tip" hidden></div>');
    el.appendChild(tip);
    el.querySelectorAll('.k-evt').forEach(function (g) {
      g.addEventListener('mouseenter', function () {
        const e = stock.events[Number(g.dataset.evt)];
        const c = cs[e.i];
        tip.innerHTML = '<div class="k-tip-type" style="color:' + EVT[e.type].color + '">● ' + EVT[e.type].name + '</div>' +
          '<div class="k-tip-title">' + CL.esc(e.title) + '</div><div class="k-tip-detail">' + CL.esc(e.detail) + '</div>' +
          '<div class="k-tip-date">' + c.date + '</div>';
        tip.hidden = false;
        const x = X(e.i);
        tip.style.left = Math.min(Math.max(x - 90, 4), W - 190) + 'px';
        tip.style.top = (e.type === 'option' ? Y(c.l) + 30 : Math.max(Y(c.h) - 110, 4)) + 'px';
      });
      g.addEventListener('mouseleave', function () { tip.hidden = true; });
    });
  };

  // ---------- CP 比副图 ----------
  CL.renderCp = function (el, stock) {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const pad = { l: 8, r: 56, t: 10, b: 10 };
    const d = stock.cpHist, n = d.length;
    const cw = (W - pad.l - pad.r) / n;
    const lo = 0.3, hi = 2.6;
    const X = function (i) { return pad.l + cw * i + cw / 2; };
    const Y = function (v) { return pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b); };
    const m = stock.cpMean, sd = stock.cpStd;
    let s = '<svg width="' + W + '" height="' + H + '">';
    s += '<rect x="' + pad.l + '" y="' + Y(m + sd) + '" width="' + (W - pad.l - pad.r) + '" height="' + (Y(m - sd) - Y(m + sd)) + '" class="cp-band"/>';
    s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(m) + '" y2="' + Y(m) + '" class="cp-mean"/>';
    [[m + sd, '+1σ'], [m, '均值'], [m - sd, '−1σ']].forEach(function (p) {
      s += '<text x="' + (W - pad.r + 8) + '" y="' + (Y(p[0]) + 4) + '" class="k-axis">' + p[1] + '</text>';
    });
    let a = '', b = '';
    d.forEach(function (p, i) { a += (i ? 'L' : 'M') + X(i) + ' ' + Y(p.cp); b += (i ? 'L' : 'M') + X(i) + ' ' + Y(p.leap); });
    s += '<path d="' + b + '" class="cp-leap"/>';
    s += '<path d="' + a + '" class="cp-line"/>';
    d.forEach(function (p, i) {
      if (Math.abs(p.cp - m) > 2 * sd) s += '<circle cx="' + X(i) + '" cy="' + Y(p.cp) + '" r="4" class="cp-hit"/>';
    });
    s += '</svg>';
    el.innerHTML = s;
  };

  // ---------- 迷你走势线 ----------
  CL.sparkline = function (seed, w, h, up) {
    let v = 50, pts = [];
    let st = seed * 9301 + 49297;
    for (let i = 0; i < 24; i++) {
      st = (st * 9301 + 49297) % 233280;
      v += (st / 233280 - 0.5) * 10 + (up ? 0.9 : -0.9);
      pts.push(v);
    }
    const mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts);
    const d = pts.map(function (p, i) { return (i ? 'L' : 'M') + (i / 23 * w).toFixed(1) + ' ' + ((1 - (p - mn) / (mx - mn || 1)) * (h - 2) + 1).toFixed(1); }).join('');
    return '<svg width="' + w + '" height="' + h + '" class="spark ' + (up ? 'up' : 'down') + '"><path d="' + d + '"/></svg>';
  };

  // 统一挂载：resize 时重绘
  CL.onResize = function (fn) {
    let t;
    fn();
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fn, 80); });
  };

  window.CL = CL;
})();
