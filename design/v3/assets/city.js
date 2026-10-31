/*
 * ChainLens v3 · 等距 AI 产业城（首页主视觉）
 * - 8 个环节 = 8 栋楼，沿一条环形道路排成两排：后排 原材料 → 能源 → 芯片 → 网络与光，
 *   前排 服务器与数据中心 → 算力租赁 → 模型与云 → 应用与端侧
 * - 楼高（底座高度）= 当日环节热度；切换日期时弹簧动画长高 / 变矮
 * - 货物方块沿道路循环，经过哪一栋就变成哪一层的颜色（"被加工"）
 * - 悬停：楼弹起、颜色加深、弹出成员 logo；点击：打开环节详情
 */
(function () {
  const { Iso, DRAW, palette } = ISO;
  const T = 260, ROWS = [0, 400], COLX = [0, 330, 660, 990];
  const ROAD = { x0: -60, x1: 1310, y0: 278, y1: 382 };
  const OBJ_H = { chip: 32, gpu: 72, rack: 172, datacenter: 104, switches: 112, robot: 226, power: 124, ingots: 80 };
  const P = (x, y, z) => ISO.Iso.proj(x, y, z);

  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  window.initCity = function (root, data, hooks) {
    const { layers } = data;
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'city-svg');
    const vb = [-800, -560, 2090, 1660];
    svg.setAttribute('viewBox', vb.join(' '));
    root.appendChild(svg);
    const gGround = document.createElementNS(NS, 'g'), gBack = document.createElementNS(NS, 'g'), gPk = document.createElementNS(NS, 'g'),
      gFront = document.createElementNS(NS, 'g'), gHit = document.createElementNS(NS, 'g');
    [gGround, gBack, gPk, gFront, gHit].forEach(g => svg.appendChild(g));
    const labels = document.createElement('div'); labels.className = 'city-labels'; root.appendChild(labels);

    // 环节 → 地块位置
    const D = layers.map((L, i) => {
      const back = i < 4;
      const x0 = back ? COLX[i] : COLX[7 - i], y0 = back ? ROWS[0] : ROWS[1];
      const g = document.createElementNS(NS, 'g');
      (back ? gBack : gFront).appendChild(g);
      return { L, i, x0, y0, g, h: 0, hv: 0, ht: 0, lift: 0, lv: 0, lt: 0, drop: 260, dv: 0, hover: false, dirty: true };
    });
    // 前排按深度（x 递增）排序
    D.filter(d => d.i >= 4).sort((a, b) => a.x0 - b.x0).forEach(d => gFront.appendChild(d.g));

    // ---------- 地面：底板 + 环形道路 ----------
    function drawGround() {
      const dark = theme() === 'dark';
      const B = new Iso();
      const plate = dark ? { t: '#121530', l: '#0f1228', r: '#0c0f22' } : { t: '#f4f6fb', l: '#e9ecf4', r: '#e1e5ef' };
      B.box(-110, -90, -14, 1470, 860, 14, plate);
      const road = dark ? '#1b1f3e' : '#e9ecf4', dash = dark ? '#2b3060' : '#ffffff';
      B.poly([[ROAD.x0, ROAD.y0, 0.5], [ROAD.x1, ROAD.y0, 0.5], [ROAD.x1, ROAD.y1, 0.5], [ROAD.x0, ROAD.y1, 0.5]], road);
      const mid = (ROAD.y0 + ROAD.y1) / 2;
      for (let x = ROAD.x0 + 40; x < ROAD.x1 - 40; x += 70) B.poly([[x, mid - 3, 1], [x + 34, mid - 3, 1], [x + 34, mid + 3, 1], [x, mid + 3, 1]], dash);
      gGround.innerHTML = B.out();
    }

    // ---------- 单个环节 ----------
    function drawDistrict(d) {
      const pal = palette(d.L.color, theme(), d.hover ? 0.1 : 0);
      const B = new Iso();
      const { x0, y0 } = d;
      B.box(x0, y0, 0, T, T, 6, pal.floor);
      const PW = T * 0.8, px = x0 + (T - PW) / 2, py = y0 + (T - PW) / 2;
      const h = Math.max(d.h, 0);
      if (h > 0.5) B.box(px, py, 6, PW, PW, h, pal.podium);
      // 底座顶面一圈细边，增加"台阶"质感
      B.poly([[px, py, 6 + h + 0.2], [px + PW, py, 6 + h + 0.2], [px + PW, py + PW, 6 + h + 0.2], [px, py + PW, 6 + h + 0.2]], pal.podium.t);
      const o = DRAW[d.L.obj], [bx0, by0, bx1, by1] = o.bbox, w = bx1 - bx0, dd = by1 - by0;
      const k = Math.min(PW * 0.9 / w, PW * 0.9 / dd, 0.92);
      d.k = k;
      B.at(x0 + T / 2 - (bx0 + w / 2) * k, y0 + T / 2 - (by0 + dd / 2) * k, 6 + h + d.lift + d.drop, k);
      o.fn(B, pal);
      d.g.innerHTML = B.out();
      d.g.style.opacity = d.drop > 200 ? 0 : 1;
      placeLabel(d);
    }

    // ---------- 标签与命中区 ----------
    const toPx = (X, Y) => { const r = svg.getBoundingClientRect(), s = r.width / vb[2]; return [(X - vb[0]) * s, (Y - vb[1]) * s]; };
    D.forEach(d => {
      const el = document.createElement('button');
      el.className = 'city-label';
      el.style.setProperty('--c', d.L.color);
      el.innerHTML = `<i></i><span class="n">${d.L.name}</span><b class="num"></b>`;
      el.addEventListener('pointerenter', () => setHover(d, true));
      el.addEventListener('pointerleave', () => setHover(d, false));
      el.addEventListener('click', () => hooks.open(d.L));
      labels.appendChild(el);
      d.label = el;
    });
    function placeLabel(d) {
      const top = 6 + d.h + d.lift + d.drop + OBJ_H[d.L.obj] * (d.k || 0.8) + 24;
      const [X, Y] = P(d.x0 + T / 2, d.y0 + T / 2, top);
      const [x, y] = toPx(X, Y);
      d.label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      d.label.style.opacity = d.drop > 120 ? 0 : 1;
      d.anchor = [x, y];
    }
    function buildHits() {
      gHit.innerHTML = '';
      D.slice(0, 4).concat(D.slice(4).sort((a, b) => a.x0 - b.x0)).forEach(d => {
        const Z = 6 + 200 + OBJ_H[d.L.obj] * 0.8;
        const pts = [];
        [[d.x0, d.y0], [d.x0 + T, d.y0], [d.x0 + T, d.y0 + T], [d.x0, d.y0 + T]].forEach(([x, y]) => { pts.push(P(x, y, 0)); pts.push(P(x, y, Z * 0.7)); });
        const poly = document.createElementNS(NS, 'polygon');
        poly.setAttribute('points', hull(pts).map(p => p.join(',')).join(' '));
        poly.setAttribute('fill', 'transparent');
        poly.style.cursor = 'pointer';
        poly.addEventListener('pointerenter', () => setHover(d, true));
        poly.addEventListener('pointerleave', () => setHover(d, false));
        poly.addEventListener('click', () => hooks.open(d.L));
        gHit.appendChild(poly);
      });
    }
    function setHover(d, on) {
      if (d.hover === on) return;
      d.hover = on; d.lt = on ? 26 : 0; d.dirty = true;
      d.label.classList.toggle('on', on);
      root.classList.toggle('has-hover', D.some(x => x.hover));
      D.forEach(x => x.label.classList.toggle('dim', D.some(y => y.hover) && !x.hover));
      hooks.hover(on ? d.L : null, d);
    }

    // ---------- 货物方块 ----------
    const lane1 = 304, lane2 = 356, R = (lane2 - lane1) / 2, xa = ROAD.x0 + 40, xb = ROAD.x1 - 40;
    const straight = xb - xa, loop = straight * 2 + Math.PI * R * 2;
    function along(s) {
      s = ((s % loop) + loop) % loop;
      if (s < straight) return [xa + s, lane1, 0];
      s -= straight;
      if (s < Math.PI * R) { const a = -Math.PI / 2 + s / R; return [xb + Math.cos(a) * R, (lane1 + lane2) / 2 + Math.sin(a) * R, 1]; }
      s -= Math.PI * R;
      if (s < straight) return [xb - s, lane2, 2];
      s -= straight;
      const a = Math.PI / 2 + s / R; return [xa + Math.cos(a) * R, (lane1 + lane2) / 2 + Math.sin(a) * R, 3];
    }
    function layerAt(x, seg) {
      const col = Math.max(0, Math.min(3, Math.floor((x + 20) / 330)));
      return seg <= 1 ? col : 7 - col;
    }
    const N = reduce ? 0 : 20;
    const packets = Array.from({ length: N }, (_, k) => {
      const g = document.createElementNS(NS, 'g');
      gPk.appendChild(g);
      return { s: k * loop / N, g, li: -1 };
    });
    function paintPacket(p, li) {
      p.li = li;
      const pal = palette(layers[li].color, theme(), 0);
      const B = new Iso();
      B.box(-9, -9, 2, 18, 18, 18, pal.core);
      p.g.innerHTML = B.out();
    }

    // ---------- 动画循环（弹簧） ----------
    let last = performance.now(), running = true;
    function spring(d, key, vkey, target, dt, k, c) {
      const a = k * (target - d[key]) - c * d[vkey];
      d[vkey] += a * dt; d[key] += d[vkey] * dt;
      if (Math.abs(target - d[key]) < 0.05 && Math.abs(d[vkey]) < 0.05) { d[key] = target; d[vkey] = 0; return false; }
      return true;
    }
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.033); last = now;
      D.forEach(d => {
        if (now < d.start) return;
        let moving = spring(d, 'h', 'hv', d.ht, dt, 120, 16);
        moving = spring(d, 'lift', 'lv', d.lt, dt, 260, 18) || moving;
        moving = spring(d, 'drop', 'dv', 0, dt, 140, 13) || moving;
        if (moving || d.dirty) { drawDistrict(d); d.dirty = false; }
      });
      packets.forEach(p => {
        p.s += dt * 70;
        const [x, y, seg] = along(p.s);
        const li = layerAt(x, seg);
        if (li !== p.li) paintPacket(p, li);
        const [X, Y] = P(x, y, 0);
        p.g.setAttribute('transform', `translate(${X.toFixed(1)},${Y.toFixed(1)})`);
      });
      if (running) requestAnimationFrame(frame);
    }

    // ---------- 对外接口 ----------
    const heightOf = heat => 12 + Math.max(heat - 0.6, 0) * 92;
    let day = data.days.length - 1;
    function setDay(i) {
      day = i;
      D.forEach(d => {
        d.ht = heightOf(d.L.heat[i]);
        d.label.querySelector('b').textContent = d.L.heat[i].toFixed(1) + 'x';
      });
    }
    function intro() {
      const t0 = performance.now();
      D.forEach((d, i) => { d.h = 0; d.hv = 0; d.drop = 260; d.dv = 0; d.start = t0 + 250 + i * 140; d.dirty = true; drawDistrict(d); });
    }
    function retheme() { drawGround(); D.forEach(d => { d.dirty = true; }); packets.forEach(p => p.li = -1); }

    drawGround(); buildHits(); setDay(day);
    D.forEach(d => drawDistrict(d));
    intro();
    requestAnimationFrame(frame);
    addEventListener('resize', () => D.forEach(placeLabel));
    return { setDay, intro, retheme, districts: D, hover: (i, on) => setHover(D[i], on) };
  };
})();
