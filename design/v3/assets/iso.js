/*
 * ChainLens v3 · 等距物件引擎
 * 物件造型移植自 KZG 期权 Pro 日报 src/poster.js 的 Iso / DRAW（源头：wenjinliuu/poster-kit 模板）。
 * 本文件在原版基础上加了：变换（平移 + 缩放，用于把多个物件摆进同一座"城"）、主题色板（浅色 / 深色）。
 * 投影：X = (x − y)·0.866，Y = (x + y)·0.5 − z（x 向右下、y 向左下、z 向上）
 */
(function () {
  const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => '#' + hex2rgb(a).map((v, i) => Math.round(v + (hex2rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

  class Iso {
    constructor() { this.s = []; this.tf = { x: 0, y: 0, z: 0, k: 1 }; this.b = [1e9, 1e9, -1e9, -1e9]; }
    at(x, y, z, k) { this.tf = { x, y, z, k: k == null ? 1 : k }; return this; }
    proj(x, y, z) {
      const t = this.tf, wx = x * t.k + t.x, wy = y * t.k + t.y, wz = z * t.k + t.z;
      const X = (wx - wy) * 0.866, Y = (wx + wy) * 0.5 - wz, b = this.b;
      b[0] = Math.min(b[0], X); b[1] = Math.min(b[1], Y); b[2] = Math.max(b[2], X); b[3] = Math.max(b[3], Y);
      return [X, Y];
    }
    poly(pts, fill) {
      this.s.push('<polygon points="' + pts.map(q => this.proj(q[0], q[1], q[2]).map(v => v.toFixed(1)).join(',')).join(' ') + '" fill="' + fill + '"/>');
    }
    box(x, y, z, w, d, h, c) {
      this.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c.l);
      this.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c.r);
      this.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c.t);
    }
    out() { const s = this.s.join(''); this.s = []; return s; }
    // 已绘制内容的投影边界，方便生成紧贴的 viewBox
    viewBox(pad) { const [a, b, c, d] = this.b, p = pad || 0; return `${(a - p).toFixed(1)} ${(b - p).toFixed(1)} ${(c - a + 2 * p).toFixed(1)} ${(d - b + 2 * p).toFixed(1)}`; }
  }
  Iso.proj = (x, y, z) => [(x - y) * 0.866, (x + y) * 0.5 - z];

  // 物件造型（与 KZG 日报背景物件一致）；bbox = 物件在自身坐标里的占地 [x0, y0, x1, y1]
  const DRAW = {
    chip: { bbox: [-16, -16, 236, 236], fn(B, p) {
      const S = 220, H = 18;
      for (let i = 20; i <= S - 28; i += 22) { B.box(i, -16, 5, 8, 16, 4, p.pin); B.box(-16, i, 5, 16, 8, 4, p.pin); }
      B.box(0, 0, 0, S, S, H, p.body);
      for (let i = 20; i <= S - 28; i += 22) { B.box(i, S, 5, 8, 16, 4, p.pin); B.box(S, i, 5, 16, 8, 4, p.pin); }
      B.box(50, 50, H, 120, 120, 12, p.core);
      B.poly([[72, 72, H + 12.5], [148, 72, H + 12.5], [148, 148, H + 12.5], [72, 148, H + 12.5]], p.inner);
    } },
    gpu: { bbox: [-10, 0, 280, 136], fn(B, p) {
      B.box(-10, 0, 0, 10, 130, 70, p.pin);
      B.box(0, 0, 0, 280, 130, 10, p.body);
      for (let k = 0; k < 9; k++) B.box(150 + k * 13, 14, 10, 6, 102, 34, p.pin);
      for (const x of [24, 84]) { B.box(x, 25, 10, 56, 80, 22, p.core); B.poly([[x + 12, 45, 32.5], [x + 44, 45, 32.5], [x + 44, 85, 32.5], [x + 12, 85, 32.5]], p.inner); }
      for (let k = 0; k < 6; k++) B.box(20 + k * 18, 130, 0, 10, 6, 6, p.dark3);
    } },
    rack: { bbox: [0, 0, 202, 102], fn(B, p) {
      for (let i = 0; i < 3; i++) {
        const x = i * 72;
        B.box(x, 0, 0, 58, 96, 170, p.body);
        for (let j = 0; j < 5; j++) { B.box(x + 6, 96, 16 + j * 30, 46, 4, 18, p.core); B.box(x + 40, 100, 22 + j * 30, 6, 2, 6, p.dark3); }
      }
    } },
    datacenter: { bbox: [0, 0, 300, 220], fn(B, p) {
      B.box(0, 0, 0, 300, 220, 8, p.body);
      const blds = [[20, 20, 110, 80, 64], [150, 20, 120, 80, 92], [20, 120, 110, 80, 40], [150, 120, 120, 80, 56]];
      for (const [x, y, w, d, h] of blds) {
        B.box(x, y, 8, w, d, h, p.core);
        for (let k = 0; k < Math.floor(w / 30); k++) B.box(x + 8 + k * 30, y + 14, 8 + h, 20, 20, 10, p.pin);
      }
    } },
    switches: { bbox: [0, 0, 240, 123], fn(B, p) {
      for (let i = 0; i < 3; i++) {
        const z = i * 40;
        B.box(0, 0, z, 240, 120, 30, i % 2 ? p.core : p.body);
        for (let r = 0; r < 2; r++) for (let k = 0; k < 12; k++) B.box(14 + k * 18, 120, z + 6 + r * 11, 11, 3, 7, p.dark3);
      }
    } },
    robot: { bbox: [-4, 20, 184, 90], fn(B, p) {
      B.box(40, 30, 0, 36, 46, 44, p.pin); B.box(104, 30, 0, 36, 46, 44, p.pin);
      B.box(-4, 35, 80, 24, 36, 50, p.pin);
      B.box(20, 20, 44, 140, 70, 90, p.body);
      B.box(160, 35, 80, 24, 36, 50, p.pin);
      B.box(45, 25, 134, 90, 60, 58, p.core);
      for (const x of [62, 100]) B.box(x, 85, 158, 18, 3, 14, p.dark3);
      B.box(86, 50, 192, 8, 8, 22, p.pin); B.box(82, 46, 214, 16, 16, 10, p.core);
    } },
    power: { bbox: [0, 0, 300, 200], fn(B, p) {
      B.box(0, 0, 0, 300, 200, 8, p.body);
      for (let i = 0; i < 3; i++) B.box(20, 20 + i * 52, 8, 150, 40, 50, p.core);
      B.box(200, 40, 8, 70, 70, 80, p.pin);
      for (let k = 0; k < 5; k++) B.box(204 + k * 13, 110, 14, 6, 10, 66, p.body);
      for (let k = 0; k < 3; k++) B.box(212 + k * 20, 60, 88, 8, 8, 34, p.core);
    } },
    ingots: { bbox: [0, 0, 300, 110], fn(B, p) {
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) B.box(k * 46 + r * 23, 0, r * 26, 40, 110, 24, (k + r) % 2 ? p.core : p.pin);
      for (let k = 0; k < 6; k++) B.box(210, 10, k * 10, 90, 90, 7, k % 2 ? p.body : p.core);
    } },
  };

  // 色板：前景物件比海报背景饱和一些；深色主题改为向深底混色
  function palette(c, theme, boost) {
    const dark = theme === 'dark';
    const base = dark ? '#151830' : '#ffffff';
    const b = boost || 0;
    const f = v => Math.max(0, Math.min(1, dark ? v * 0.85 : v - b));
    const tri = (t, l, r) => ({ t: mix(c, base, f(t)), l: mix(c, base, f(l)), r: mix(c, base, f(r)) });
    return {
      body: tri(.86, .74, .62), pin: tri(.74, .6, .48), core: tri(.54, .38, .26), inner: mix(c, base, f(.9)), dark3: tri(.42, .3, .2),
      podium: tri(.94, .86, .79), podiumEdge: mix(c, base, f(.7)),
      floor: tri(.965, .92, .88),
    };
  }

  window.ISO = { Iso, DRAW, palette, mix };
})();
