/*
 * 潮信 · Lightweight Charts 自定义原语（看盘页与公司档案共用）
 * VLines：在指定 K 线上画竖虚线 + 顶部标签（财报日）；Band：两条价格线之间的填充带（研报目标价区间、布林带、CP 常态区间）
 */
window.LWP = (() => {
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
  return { VLines, Band };
})();
