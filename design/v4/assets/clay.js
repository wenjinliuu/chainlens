/*
 * 潮信 · 3D 黏土共用模块（Three.js）
 * - claySet / fromDraw：把日报海报的等距物件（ISO.DRAW）转成 3D 黏土模型
 * - buildCoin：印着公司 logo 的硬币
 * - STATIONS：AI 产业岛的 8 个站点模型，每个返回 { group, tick(t, dt) }，带小动画
 *   原材料：矿石堆 + 金属锭 · 能源：冷却塔（冒蒸汽）+ 风机（转动）· 芯片：晶圆上的芯片
 *   网络与光：交换机 + 光纤（光点流动）· 服务器与数据中心：机柜（指示灯闪烁）
 *   算力租赁：GPU（风扇转动）· 模型与云：数据中心园区 + 云朵 · 应用与端侧：机器人（点头）+ 手机
 */
window.CLAY = (async () => {
const THREE = await import('three');
const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
const { mix, DRAW } = window.ISO;
const W = '#ffffff', INK = '#16172a';

const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .6, metalness: 0, envMapIntensity: .55 }, o || {}));
function claySet(c) {
  return { body: mat(mix(c, W, .62)), pin: mat(mix(c, W, .42)), core: mat(mix(c, W, .2)), inner: mat(mix(c, W, .78), { roughness: .4 }), dark3: mat(mix(c, INK, .12)) };
}
const rbox = (w, h, d, m) => new THREE.Mesh(Math.min(w, d, h) > 9 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(w, d, h) * .18) : new THREE.BoxGeometry(w, h, d), m);

// 等距物件 → 3D。extras(g, mats) 可以在同一坐标系（x 右、y 向前、z 向上，与 DRAW 一致）里追加零件
function fromDraw(kind, color, extras, opts) {
  const g = new THREE.Group(), mats = claySet(color);
  const pick = c => typeof c === 'string' ? mats.inner : (c && c.__k ? mats[c.__k] : mats.body);
  const P = { body: { __k: 'body' }, pin: { __k: 'pin' }, core: { __k: 'core' }, inner: 'inner', dark3: { __k: 'dark3' } };
  const B = {
    box(x, y, z, w, d, h, c) { const m = rbox(w, h, d, pick(c)); m.position.set(x + w / 2, z + h / 2, y + d / 2); m.userData.k = c && c.__k; g.add(m); return m; },
    poly(pts, c) {
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), z = pts[0][2];
      const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, d = Math.max(...ys) - y0;
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, 2, d, 2, 1), pick(c)); m.position.set(x0 + w / 2, z + 1, y0 + d / 2); g.add(m);
    },
  };
  DRAW[kind].fn(B, P);
  if (extras) extras(g, mats, B);
  const box = new THREE.Box3().setFromObject(g), ctr = box.getCenter(new THREE.Vector3());
  const base = (opts && opts.ground) ? box.min.y : ctr.y;
  g.children.forEach(ch => { ch.position.x -= ctr.x; ch.position.z -= ctr.z; ch.position.y -= base; });
  g.userData.size = box.getSize(new THREE.Vector3());
  return g;
}
const buildObject = (kind, color) => fromDraw(kind, color);

// ---------- logo 硬币 ----------
function logoTexture(url, ring) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const paint = img => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.fill();
    if (img) { ctx.save(); ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, 16, 16, 224, 224); ctx.restore(); }
    tex.needsUpdate = true;
  };
  paint(null);
  if (url) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => paint(img); img.src = url; }
  return tex;
}
function buildCoin(c, color, r) {
  r = r || 32;
  const ring = mix(color, W, .45);
  const face = mat('#ffffff', { map: logoTexture(c.logo, ring), roughness: .5 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * .28, 48), [mat(ring, { roughness: .45 }), face, face]);
  coin.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.add(coin); g.userData.coin = c;
  return g;
}

// ---------- 站点模型 ----------
const ground = g => { const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()); g.children.forEach(ch => { ch.position.x -= c.x; ch.position.z -= c.z; ch.position.y -= b.min.y; }); return g; };
const STATIONS = {
  raw(color) { // 矿石堆 + 金属锭
    const g = new THREE.Group();
    const ing = fromDraw('ingots', color, null, { ground: true }); ing.scale.setScalar(.62); ing.position.set(30, 0, 10); g.add(ing);
    const rock = mat(mix('#8e91a7', W, .45), { flatShading: true, roughness: .8 }), ore = mat(mix(color, W, .1), { flatShading: true, roughness: .5 });
    [[-80, 34, -40, 0], [-110, 24, 20, 1], [-50, 22, 40, 0], [-90, 18, -95, 1], [-30, 16, -80, 0]].forEach(([x, r, z, o]) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), o ? ore : rock); m.position.set(x, r * .7, z); m.rotation.set(x, z, r); g.add(m);
    });
    return { group: ground(g), tick() {} };
  },
  energy(color) { // 冷却塔 + 风机 + 变压器
    const g = new THREE.Group();
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(46 - Math.sin(t * Math.PI) * 14 + (t > .8 ? (t - .8) * 20 : 0), t * 140)); }
    const tower = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat('#f4f5fa', { side: THREE.DoubleSide }));
    tower.position.set(-60, 0, -10); g.add(tower);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(39, 40, 12, 40, 1, true), mat(mix(color, W, .25), { side: THREE.DoubleSide })); stripe.position.set(-60, 110, -10); g.add(stripe);
    const steam = [];
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 12), mat('#ffffff', { transparent: true, opacity: .7, roughness: .9 })); s.position.set(-60, 150, -10); s.userData.ph = i / 5; g.add(s); steam.push(s); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(4, 7, 190, 12), mat('#eef0f6')); pole.position.set(80, 95, 40); g.add(pole);
    const hub = new THREE.Group(); hub.position.set(80, 192, 52); g.add(hub);
    hub.add(new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), mat(mix(color, W, .3))));
    for (let k = 0; k < 3; k++) { const b = rbox(10, 80, 3, mat('#ffffff')); b.geometry.translate(0, 42, 0); b.rotation.z = k * Math.PI * 2 / 3; hub.add(b); }
    const tr = fromDraw('power', color, null, { ground: true }); tr.scale.setScalar(.38); tr.position.set(40, 0, -70); g.add(tr);
    ground(g);
    return { group: g, tick(t) {
      hub.rotation.z = -t * 2.2;
      steam.forEach(s => { const k = (t * .25 + s.userData.ph) % 1; s.position.y = tower.position.y + 150 + k * 90; s.scale.setScalar(.6 + k * 1.2); s.material.opacity = .75 * (1 - k); });
    } };
  },
  chip(color) { // 晶圆 + 芯片
    const g = new THREE.Group();
    const wafer = new THREE.Mesh(new THREE.CylinderGeometry(118, 118, 8, 64), mat(mix(color, W, .82), { roughness: .25, metalness: .1 }));
    wafer.position.y = 4; g.add(wafer);
    const grid = mat(mix(color, W, .62));
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { if (i * i + j * j > 11 || (Math.abs(i) < 2 && Math.abs(j) < 2)) continue; const d = rbox(26, 3, 26, grid); d.position.set(i * 31, 9.5, j * 31); g.add(d); }
    const chip = fromDraw('chip', color, null, { ground: true }); chip.scale.setScalar(.42); chip.position.y = 8; g.add(chip);
    return { group: ground(g), tick() {} };
  },
  net(color) { // 交换机 + 光纤（光点沿光纤流动）；全部放进 inner，整体平移时光点和光纤同步
    const g = new THREE.Group(), outer = new THREE.Group(); outer.add(g);
    const sw = fromDraw('switches', color, null, { ground: true }); sw.scale.setScalar(.62); sw.position.set(-20, 0, -30); g.add(sw);
    const pulses = [];
    [[-60, 40], [0, 60], [60, 40]].forEach(([x, dz], i) => {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x - 20, 30, 10), new THREE.Vector3(x, 16, 60 + dz * .3), new THREE.Vector3(x + 20, 4, 110)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 2.6, 8), mat(mix(color, W, .35))));
      const p = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), mat('#ffffff', { emissive: color, emissiveIntensity: 1.4 }));
      p.userData = { curve, ph: i / 3 }; g.add(p); pulses.push(p);
    });
    ground(outer);
    return { group: outer, tick(t) { pulses.forEach(p => p.position.copy(p.userData.curve.getPoint((t * .6 + p.userData.ph) % 1))); } };
  },
  dc(color) { // 机柜（指示灯闪烁）
    const leds = [];
    const g = fromDraw('rack', color, (grp) => {
      grp.children.forEach(m => { if (m.userData.k === 'dark3') { m.material = mat('#ffffff', { emissive: '#34d399', emissiveIntensity: 0 }); m.userData.ph = Math.random() * 6; leds.push(m); } });
    }, { ground: true });
    g.scale.setScalar(.75);
    const w = new THREE.Group(); w.add(g);
    return { group: ground(w), tick(t) { leds.forEach(l => { l.material.emissiveIntensity = Math.sin(t * 5 + l.userData.ph) > .3 ? 1.6 : .1; }); } };
  },
  compute(color) { // GPU（两个风扇在转）
    const fans = [];
    const g = fromDraw('gpu', color, (grp, mats) => {
      [[52, 65], [112, 65]].forEach(([x, y]) => {
        const f = new THREE.Group(); f.position.set(x, 34, y);
        f.add(new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 3, 20), mats.core));
        for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 7), mats.inner); b.geometry.translate(13, 0, 0); b.rotation.y = k * Math.PI * 2 / 7; b.rotation.x = .3; f.add(b); }
        grp.add(f); fans.push(f);
      });
    }, { ground: true });
    g.scale.setScalar(.72);
    const w = new THREE.Group(); w.add(g);
    return { group: ground(w), tick(t) { fans.forEach(f => { f.rotation.y = t * 6; }); } };
  },
  cloud(color) { // 数据中心园区 + 云朵
    const g = new THREE.Group();
    const dc = fromDraw('datacenter', color, null, { ground: true }); dc.scale.setScalar(.62); g.add(dc);
    const cloud = new THREE.Group(), cm = mat('#ffffff', { roughness: .9 });
    [[0, 0, 0, 34], [36, -6, 6, 26], [-34, -8, -4, 24], [12, 14, -10, 26], [-12, 10, 14, 22]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), cm); s.position.set(x, y, z); cloud.add(s); });
    cloud.position.set(10, 170, 0); g.add(cloud);
    ground(g);
    return { group: g, tick(t) { cloud.position.y = 175 + Math.sin(t * 1.2) * 8; cloud.rotation.y = Math.sin(t * .4) * .3; } };
  },
  app(color) { // 机器人（点头）+ 手机
    const g = new THREE.Group();
    const robot = fromDraw('robot', color, null, { ground: true }); robot.scale.setScalar(.6); robot.position.set(-30, 0, 0); g.add(robot);
    const phone = rbox(54, 100, 8, mat('#f4f5fa')); phone.position.set(90, 60, 20); phone.rotation.set(0, -.5, .12); g.add(phone);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(44, 84), mat('#ffffff', { emissive: mix(color, W, .55), emissiveIntensity: .6 })); scr.position.set(0, 0, 4.2); phone.add(scr);
    ground(g);
    return { group: g, tick(t) { robot.rotation.y = Math.sin(t * 1.4) * .18; robot.position.y = Math.abs(Math.sin(t * 2.8)) * 6; } };
  },
};

return { THREE, RoundedBoxGeometry, mat, claySet, fromDraw, buildObject, buildCoin, logoTexture, STATIONS, mix };
})();
