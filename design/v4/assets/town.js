/*
 * 潮信 · AI 产业镇道具库（Three.js，黏土风）
 * 所有模型都以 +x 为车头 / 前进方向、y 向上，单位与产业镇一致（站点底座约 250）。
 * 返回 { group, tick(t, dt, speed) } 的是会动的道具；纯静态道具直接返回 Group，交给 island.js 合并几何体以减少绘制次数。
 */
window.TOWN = (async () => {
const C = await window.CLAY;
const { THREE, RoundedBoxGeometry, mix, CARGO } = C;
const W = '#ffffff', INK = '#2b2d45';

// 材质缓存：同色同参数共用一个材质，静态道具才能按材质合并
const MC = new Map();
function M(color, o) {
  const k = color + JSON.stringify(o || {});
  if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .62, metalness: 0, envMapIntensity: .55 }, o || {})));
  return MC.get(k);
}
const box = (w, h, d, m, r) => new THREE.Mesh(r === 0 || Math.min(w, h, d) < 6 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * (r || .2)), m);
const cyl = (rt, rb, h, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), m);
const sph = (r, m, seg) => new THREE.Mesh(new THREE.SphereGeometry(r, seg || 14, Math.max(8, (seg || 14) * .7 | 0)), m);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const shadow = g => { g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; };

function textTexture(lines, w, h, bg) {
  const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => { g.setTransform(2, 0, 0, 2, 0, 0); g.fillStyle = bg; g.fillRect(0, 0, w, h); lines.forEach(([t, f, c, x, y, al]) => { g.font = f; g.fillStyle = c; g.textAlign = al || 'left'; g.fillText(t, x, y); }); tex.needsUpdate = true; };
  draw(); document.fonts && document.fonts.ready.then(draw);
  return tex;
}

// ================= 车辆 =================
function wheels(g, xs, z, r, y) {
  const m = M('#3a3c52', { roughness: .8 }), hub = M('#e9eaf2');
  const list = [];
  xs.forEach(x => [-1, 1].forEach(s => {
    const w = new THREE.Group(); at(w, x, y || r, s * z);
    const t = cyl(r, r, 4, m, 16); t.rotation.x = Math.PI / 2; w.add(t);
    const h = cyl(r * .45, r * .45, 4.4, hub, 10); h.rotation.x = Math.PI / 2; w.add(h);
    g.add(w); list.push(w);
  }));
  return list;
}
// 车灯材质全车共用：夜晚模式统一调亮
const HEAD = M('#fff6cf', { emissive: '#ffe9a0', emissiveIntensity: .4 }), TAIL = M('#ffb3b8', { emissive: '#ff3b4a', emissiveIntensity: .25 });
const GLASS = M('#dfeefe', { roughness: .2 });
function lamps(g, fx, bx, y, z) { [-1, 1].forEach(s => { g.add(at(box(2, 3, 4, HEAD, 0), fx, y, s * z)); g.add(at(box(2, 2.4, 3.6, TAIL, 0), bx, y, s * z)); }); }
function vehicle(g, ws, extra) {
  shadow(g);
  return { group: g, tick(t, dt, v) { ws.forEach(w => { w.rotation.z -= v * dt / 5; }); extra && extra(t, dt, v); } };
}
function buildCar(color) {
  const g = new THREE.Group();
  g.add(at(box(34, 10, 17, M(color)), 0, 9, 0));
  g.add(at(box(19, 9, 15, M('#dfeefe', { roughness: .2 })), -2, 18, 0));
  g.add(at(box(17, 2, 15.4, M(color)), -2, 22.5, 0));
  lamps(g, 17.5, -17.5, 10, 5);
  return vehicle(g, wheels(g, [-10, 10], 8.5, 4.6));
}
function buildVan(color) {
  const g = new THREE.Group();
  g.add(at(box(40, 20, 19, M(W)), 0, 15, 0));
  g.add(at(box(12, 9, 18, M('#dfeefe', { roughness: .2 })), 15, 19, 0));
  g.add(at(box(40.4, 4, 19.4, M(color)), 0, 11, 0));
  lamps(g, 20.5, -20.5, 12, 6);
  return vehicle(g, wheels(g, [-12, 12], 9, 4.8));
}
function buildTruck(color) { // 集装箱卡车
  const g = new THREE.Group();
  g.add(at(box(15, 20, 19, M(mix(color, INK, .05))), 24, 15, 0));
  g.add(at(box(6, 8, 17, M('#dfeefe', { roughness: .2 })), 29, 20, 0));
  g.add(at(box(60, 4, 16, M('#8e91a7')), -6, 6.5, 0));
  const ctn = new THREE.Group(); at(ctn, -10, 19, 0); g.add(ctn);
  ctn.add(box(42, 20, 19, M(mix(color, W, .18)), .08));
  for (let k = -3; k <= 3; k++) ctn.add(at(box(1.4, 18, 19.6, M(mix(color, INK, .1)), 0), k * 5.6, 0, 0));
  lamps(g, 32, -31.5, 12, 6.5);
  return vehicle(g, wheels(g, [-26, -16, 24], 8.5, 4.8));
}
function buildFlatbed(layerIdx) { // 平板车：车斗上的货物随所在站点变形
  const g = new THREE.Group();
  g.add(at(box(14, 19, 19, M('#5b4cff')), 22, 14, 0));
  g.add(at(box(6, 8, 17, M('#dfeefe', { roughness: .2 })), 27, 19, 0));
  g.add(at(box(40, 4, 19, M('#c9c3ff')), -6, 9, 0));
  const slot = new THREE.Group(); at(slot, -6, 11, 0); g.add(slot);
  lamps(g, 29.5, -26.5, 12, 6.5);
  let cur = -1, item = null, pop = 1;
  const v = vehicle(g, wheels(g, [-16, 20], 9, 4.8), (t, dt) => {
    pop += (1 - pop) * Math.min(dt * 9, 1);
    if (item) item.scale.setScalar(.9 * (pop + Math.sin(Math.min(pop, 1) * Math.PI) * .25));
  });
  v.setCargo = li => { if (li === cur) return; cur = li; if (item) slot.remove(item); item = shadow(CARGO(li)); slot.add(item); pop = .1; };
  v.setCargo(layerIdx || 0);
  return v;
}
function buildBus(line2) { // 潮信巴士；line2 = 车身第二行（默认三个栏目，接周报后写环节轮动）
  const g = new THREE.Group();
  g.add(at(box(66, 24, 22, M(W)), 0, 17, 0));
  g.add(at(box(58, 8, 22.4, M('#dfeefe', { roughness: .2 })), 2, 21, 0));
  g.add(at(box(66.4, 4, 22.4, M('#5b4cff')), 0, 9, 0));
  const tex = textTexture([['潮信', '900 30px "Noto Sans SC", sans-serif', '#5b4cff', 18, 34], [line2 || '盘前汇总 · 期权日报 · 研报日报', '700 15px "Noto Sans SC", sans-serif', '#1296f0', 96, 32]], 300, 48, '#ffffff');
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(56, 9), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); at(p, 0, 13.5, s * 11.3); if (s < 0) p.rotation.y = Math.PI; g.add(p); });
  lamps(g, 33.5, -33.5, 12, 7);
  return vehicle(g, wheels(g, [-20, 22], 10, 5.2));
}
function buildForklift() {
  const g = new THREE.Group();
  g.add(at(box(20, 10, 15, M('#f5a314')), 0, 9, 0));
  g.add(at(box(10, 12, 13, M('#dfeefe', { roughness: .2 })), -3, 20, 0));
  g.add(at(box(11, 2, 15, M('#f5a314')), -3, 26.5, 0));
  g.add(at(box(2, 26, 12, M('#8e91a7'), 0), 11, 15, 0));
  const fork = new THREE.Group(); at(fork, 13, 4, 0); g.add(fork);
  [-4, 4].forEach(z => fork.add(at(box(12, 1.5, 2.5, M('#8e91a7'), 0), 6, 0, z)));
  const crate = box(13, 11, 13, M('#e3cfae'), .12); at(crate, 7, 7, 0); fork.add(crate);
  const v = vehicle(g, wheels(g, [-6, 7], 7.5, 4));
  v.fork = fork; v.crate = crate;
  return v;
}

// ================= 人与机器人 =================
const SKIN = ['#ffd9bf', '#f1c39f', '#d9a27d', '#a8714f'];
const SHIRT = ['#5b4cff', '#1296f0', '#ff6b2c', '#00a8c6', '#a04cf5', '#d23fd8', '#f5a314', '#2b6cf2', '#0fb57b', '#ffffff'];
function limb(len, w, m) { const p = new THREE.Group(); p.add(at(box(w, len, w, m, .3), 0, -len / 2, 0)); return p; }
function buildPerson(i, opt) {
  opt = opt || {};
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shirt = M(opt.vest ? '#ff8a3d' : SHIRT[i % SHIRT.length]), pants = M(['#3b3f5c', '#5c6280', '#2f4b7c', '#8e91a7'][i % 4]), skin = M(SKIN[i % 4]);
  const legs = [-1, 1].map(s => { const l = limb(9, 3.4, pants); at(l, 0, 10, s * 2.4); body.add(l); return l; });
  body.add(at(box(5.5, 10, 8, shirt, .3), 0, 15, 0));
  const arms = [-1, 1].map(s => { const a = limb(8.5, 2.6, shirt); at(a, 0, 19.5, s * 5.2); body.add(a); return a; });
  body.add(at(sph(4, skin), 0, 24.5, 0));
  if (opt.helmet) body.add(at(cyl(4.6, 4.6, 2.4, M('#ffd23f'), 14), 0, 27.6, 0));
  else body.add(at(sph(4.1, M(['#3a2b25', '#6b4a35', '#1f1d2b', '#c98a4b'][i % 4]), 12), -.6, 25.6, 0)).scale.set(1, .7, 1);
  shadow(g);
  return {
    group: g,
    tick(t, dt, v, mode) {
      if (mode === 'work') { // 原地干活：抡胳膊、点头
        arms[0].rotation.z = -1.2 + Math.sin(t * 6 + i) * .6; arms[1].rotation.z = Math.sin(t * 3 + i) * .2; body.position.y = Math.abs(Math.sin(t * 6 + i)) * .6;
        legs.forEach(l => { l.rotation.z = 0; }); return;
      }
      if (mode === 'idle') { arms.forEach(a => { a.rotation.z = 0; }); legs.forEach(l => { l.rotation.z = 0; }); body.position.y = 0; return; }
      const s = Math.sin(t * v * .45 + i);
      legs[0].rotation.z = s * .7; legs[1].rotation.z = -s * .7; arms[0].rotation.z = -s * .6; arms[1].rotation.z = s * .6;
      body.position.y = Math.abs(Math.cos(t * v * .45 + i)) * 1.2;
    },
  };
}
function buildWalkerBot(i) { // 两足送货机器人
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shell = M(W), joint = M('#c9c3ff'), visor = M('#16172a', { roughness: .2 });
  const legs = [-1, 1].map(s => { const l = limb(10, 3.2, joint); at(l, 0, 11, s * 3); body.add(l); return l; });
  body.add(at(box(10, 11, 12, shell, .3), 0, 17, 0));
  body.add(at(box(9, 7, 10, shell, .3), 1, 26, 0));
  body.add(at(box(1.2, 3.6, 7.5, visor, 0), 5.6, 26.5, 0));
  const eye = box(1.4, 1.4, 6, M('#ffffff', { emissive: '#5bd8ff', emissiveIntensity: 1.4 }), 0); at(eye, 6.2, 26.8, 0); body.add(eye);
  body.add(at(cyl(.5, .5, 5, joint), 0, 32, 0)); body.add(at(sph(1.4, M('#ff6b2c')), 0, 35, 0));
  const pack = box(8, 8, 9, M(SHIRT[i % 8]), .25); at(pack, -7, 18, 0); body.add(pack);
  shadow(g);
  return { group: g, tick(t, dt, v) { const s = Math.sin(t * v * .5 + i); legs[0].rotation.z = s * .5; legs[1].rotation.z = -s * .5; body.position.y = Math.abs(Math.cos(t * v * .5 + i)) * 1; eye.material.emissiveIntensity = 1 + Math.sin(t * 4 + i) * .5; } };
}
function buildDeliveryBot(i) { // 六轮小快递车
  const g = new THREE.Group();
  g.add(at(box(16, 11, 12, M(W), .3), 0, 9, 0));
  g.add(at(box(16.4, 3, 12.4, M(SHIRT[(i + 3) % 8])), 0, 6, 0));
  const flag = new THREE.Group(); at(flag, -6, 14, 0); g.add(flag);
  flag.add(at(cyl(.4, .4, 16, M('#8e91a7')), 0, 8, 0)); flag.add(at(box(5, 3.5, .6, M('#ff6b2c'), 0), 2.6, 15, 0));
  return vehicle(g, wheels(g, [-5, 0, 5], 6.5, 2.6), t => { flag.rotation.x = Math.sin(t * 6 + i) * .15; });
}

// ================= 建筑与机械 =================
const WIN = M('#dfeefe', { roughness: .2, metalness: .01 }); // 仓库窗（夜里亮灯）
function buildWarehouse(color) {
  const g = new THREE.Group(), wall = M(mix(color, W, .8)), roof = M(mix(color, W, .45)), trim = M(mix(color, W, .6));
  g.add(at(box(110, 46, 80, wall, .06), 0, 23, 0));
  for (let k = 0; k < 4; k++) { const r = box(28, 14, 82, roof, .1); r.rotation.z = .5; at(r, -40 + k * 27, 50, 0); g.add(r); }
  const door = box(36, 30, 2, M('#e9ebf3'), 0); at(door, 10, 15, 41); g.add(door);
  for (let k = 0; k < 6; k++) g.add(at(box(36, .8, 2.4, trim, 0), 10, 3 + k * 5, 41.2));
  for (let k = 0; k < 3; k++) g.add(at(box(12, 8, 2, WIN, 0), -38 + k * 16, 34, 41));
  const stack = cyl(6, 7.5, 54, trim); at(stack, -40, 70, -24); g.add(stack);
  g.add(at(cyl(7, 7, 4, M(color)), -40, 95, -24));
  g.userData.chimney = new THREE.Vector3(-40, 100, -24);
  return g;
}
function buildRobotArm(color) {
  const g = new THREE.Group(), m = M(mix(color, W, .25)), j = M(mix(color, INK, .1)), w = M(W);
  g.add(at(cyl(14, 17, 10, j, 20), 0, 5, 0));
  const yaw = new THREE.Group(); at(yaw, 0, 10, 0); g.add(yaw);
  yaw.add(at(cyl(9, 11, 12, m, 18), 0, 6, 0));
  const a1 = new THREE.Group(); at(a1, 0, 14, 0); yaw.add(a1);
  a1.add(at(box(8, 46, 8, w, .35), 0, 23, 0)); a1.add(at(sph(6, j), 0, 0, 0));
  const a2 = new THREE.Group(); at(a2, 0, 46, 0); a1.add(a2);
  a2.add(at(sph(5.5, j), 0, 0, 0)); a2.add(at(box(36, 7, 7, m, .35), 18, 0, 0));
  const hand = new THREE.Group(); at(hand, 36, 0, 0); a2.add(hand);
  hand.add(at(box(4, 10, 10, j, 0), 2, -4, 0));
  const tip = box(6, 6, 6, M('#ffffff', { emissive: color, emissiveIntensity: .8 }), .2); at(tip, 2, -12, 0); hand.add(tip);
  shadow(g);
  return { group: g, tick(t) { yaw.rotation.y = Math.sin(t * .8) * 1.4; a1.rotation.z = -.35 + Math.sin(t * 1.6) * .3; a2.rotation.z = -.9 + Math.sin(t * 1.6 + 1) * .45; hand.rotation.z = -a1.rotation.z - a2.rotation.z - 1.4; } };
}
function buildGantry() { // 港口岸桥：小车沿横梁移动，吊具升降集装箱
  const g = new THREE.Group(), steel = M('#5b4cff'), steel2 = M('#8f84ff'), cable = M('#3a3c52');
  [[-40, -60], [40, -60], [-40, 60], [40, 60]].forEach(([x, z]) => g.add(at(box(9, 170, 9, steel, .1), x, 85, z)));
  [-60, 60].forEach(z => g.add(at(box(90, 9, 9, steel2, .1), 0, 60, z)));
  g.add(at(box(12, 12, 330, steel, .1), -40, 172, 90)); g.add(at(box(12, 12, 330, steel, .1), 40, 172, 90));
  g.add(at(box(92, 8, 12, steel2, .1), 0, 172, 250));
  g.add(at(box(40, 22, 30, M(W)), 0, 150, -40));
  const trolley = new THREE.Group(); g.add(trolley);
  trolley.add(at(box(92, 8, 22, M('#ff6b2c')), 0, 182, 0));
  const rope = box(1.4, 1, 1.4, cable, 0); trolley.add(rope);
  const spreader = new THREE.Group(); trolley.add(spreader);
  spreader.add(at(box(44, 4, 22, M('#ff6b2c')), 0, 0, 0));
  const ctn = new THREE.Group(); at(ctn, 0, -12, 0); spreader.add(ctn);
  const cmat = [M(mix('#1296f0', W, .15)), M(mix('#ff6b2c', W, .15)), M(mix('#00a8c6', W, .15)), M(mix('#a04cf5', W, .15))];
  const body = box(42, 20, 19, cmat[0], .08); ctn.add(body);
  shadow(g);
  let phase = 0, n = 0;
  return {
    group: g,
    tick(t, dt) { // 周期 12 秒：在岸上抓箱 → 升起 → 移到船上方 → 放下 → 空返
      phase += dt / 12; if (phase >= 1) { phase -= 1; n++; body.material = cmat[n % 4]; }
      const p = phase, ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const zLand = 0, zShip = 200;
      let z, y, has;
      if (p < .15) { z = zLand; y = 120 - ease(p / .15) * 80; has = p > .12; }
      else if (p < .3) { z = zLand; y = 40 + ease((p - .15) / .15) * 100; has = true; }
      else if (p < .5) { z = zLand + ease((p - .3) / .2) * (zShip - zLand); y = 140; has = true; }
      else if (p < .65) { z = zShip; y = 140 - ease((p - .5) / .15) * 90; has = true; }
      else if (p < .75) { z = zShip; y = 50 + ease((p - .65) / .1) * 90; has = false; }
      else { z = zShip - ease((p - .75) / .25) * (zShip - zLand); y = 140 - ease((p - .75) / .25) * 20; has = false; }
      trolley.position.z = z; spreader.position.y = y; ctn.visible = has;
      const len = 178 - y; rope.scale.y = len; rope.position.y = y + len / 2;
    },
  };
}
function buildPylon() {
  const g = new THREE.Group(), m = M('#c9cbd8', { roughness: .5 }), m2 = M('#b0b3c6');
  [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(([x, z]) => { const l = box(3, 132, 3, m, 0); l.rotation.set(z * .012, 0, -x * .012); at(l, x * .6, 66, z * .6); g.add(l); });
  for (let k = 0; k < 4; k++) g.add(at(box(14 - k * 2, 2, 14 - k * 2, m2, 0), 0, 24 + k * 30, 0));
  g.add(at(box(70, 3, 4, m2, 0), 0, 118, 0)); g.add(at(box(50, 3, 4, m2, 0), 0, 100, 0));
  g.userData.tips = [new THREE.Vector3(-33, 116, 0), new THREE.Vector3(33, 116, 0), new THREE.Vector3(0, 133, 0)];
  return g;
}
function buildStreetLight() {
  const g = new THREE.Group(), m = M('#b8bccd');
  g.add(at(cyl(1.4, 2, 52, m, 8), 0, 26, 0)); g.add(at(box(14, 1.6, 1.6, m, 0), 6, 52, 0));
  g.add(at(box(8, 3, 6, M('#fff7d6', { emissive: '#ffe7a3', emissiveIntensity: .5 }), 0), 13, 50.5, 0));
  return g;
}
function buildTreeSmall(i) {
  const g = new THREE.Group();
  g.add(at(cyl(2.2, 3, 14, M('#c9b8a6'), 8), 0, 7, 0));
  const leaf = M(['#a8e6cf', '#8fd8c8', '#b9e8b0'][i % 3], { roughness: .85 });
  g.add(at(sph(11, leaf, 12), 0, 22, 0)); g.add(at(sph(8, leaf, 10), 5, 17, 3));
  return g;
}
function buildBench() { const g = new THREE.Group(), m = M('#e3cfae'); g.add(at(box(22, 2, 7, m, 0), 0, 8, 0)); g.add(at(box(22, 7, 1.6, m, 0), 0, 13, -3)); [-9, 9].forEach(x => g.add(at(box(1.6, 8, 6, M('#8e91a7'), 0), x, 4, 0))); return g; }
function buildCrates(n, color) {
  const g = new THREE.Group();
  for (let k = 0; k < n; k++) g.add(at(box(14, 12, 14, M(k % 2 ? '#e3cfae' : mix(color, W, .55)), .12), (k % 3) * 16, 6 + Math.floor(k / 3) * 12, Math.floor(k / 3) * 3));
  return g;
}
function buildContainerStack(rows, cols, levels, colors) {
  const g = new THREE.Group();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const h = 1 + ((r * 7 + c * 3) % levels); for (let l = 0; l < h; l++) g.add(at(box(42, 19, 19, M(mix(colors[(r + c + l) % colors.length], W, .18)), .06), c * 46, 10 + l * 20, r * 22)); }
  return g;
}

// ================= 公司楼 =================
// 每家公司一栋小楼：高度 ≈ 市值，楼顶一块带 logo 的招牌；窗户夜里亮灯
function logoSignTexture(c, color) {
  let logo = null;
  const tex = canvasTex(200, 120, g => {
    g.fillStyle = '#ffffff'; rr(g, 0, 0, 200, 120, 18); g.fill();
    g.fillStyle = mix(color, W, .9); rr(g, 0, 0, 200, 120, 18); g.fill();
    g.save(); g.beginPath(); g.arc(44, 60, 30, 0, Math.PI * 2); g.fillStyle = mix(color, W, .5); g.fill(); g.beginPath(); g.arc(44, 60, 26, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.clip();
    if (logo) g.drawImage(logo, 18, 34, 52, 52); else { g.fillStyle = mix(color, '#000', .18); g.font = `800 26px ${NUMF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.t[0], 44, 61); g.textBaseline = 'alphabetic'; }
    g.restore();
    g.textAlign = 'left'; g.fillStyle = '#16172a'; g.font = `800 34px ${NUMF}`; g.fillText(c.t, 84, 58);
    g.fillStyle = '#8e91a7'; g.font = `600 15px ${CNF}`; g.fillText(c.name.length > 7 ? c.name.slice(0, 7) + '…' : c.name, 86, 84);
  });
  if (c.logo) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { logo = img; tex.redraw(); }; img.src = c.logo; }
  return tex;
}
function buildTower(c, color, h) {
  const g = new THREE.Group(), w = 44, d = 40;
  const wall = M(mix(color, W, .72)), band = M(mix(color, W, .5));
  g.add(at(box(w, h, d, wall, .06), 0, h / 2, 0));
  g.add(at(box(w + 4, 3, d + 4, band, 0), 0, 1.5, 0));
  // 窗户：每层四扇，前后两面
  const floors = Math.max(1, Math.floor((h - 10) / 14));
  for (let f = 0; f < floors; f++) [-1, 1].forEach(sd => { for (let k = 0; k < 3; k++) g.add(at(box(8, 7, 1.2, WIN, 0), -12 + k * 12, 10 + f * 14, sd * (d / 2 + .4))); });
  g.add(at(box(w - 6, 2.5, d - 6, band, 0), 0, h + 1.2, 0));
  // 楼顶招牌（面朝 +z 与 -z）
  const tex = logoSignTexture(c, color);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(40, 24, 2), [M(W), M(W), M(W), M(W), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })]);
  at(sign, 0, h + 16, 0); g.add(sign);
  g.add(at(box(2, 6, 2, M('#b8bccd'), 0), -14, h + 4, 0)); g.add(at(box(2, 6, 2, M('#b8bccd'), 0), 14, h + 4, 0));
  shadow(g);
  return g;
}

// ================= 红绿灯 =================
const SIG = { ron: M('#ff5a5a', { emissive: '#ff2d2d', emissiveIntensity: 1.6 }), roff: M('#5a2a2e'), yon: M('#ffd24a', { emissive: '#ffb800', emissiveIntensity: 1.6 }), yoff: M('#5a4a24'), gon: M('#5cf08a', { emissive: '#1ad65c', emissiveIntensity: 1.6 }), goff: M('#24503a') };
function buildTrafficLight() { // 默认朝 +x（灯面对着从 +x 方向驶来的车）
  const g = new THREE.Group(), pole = M('#3a3c52'), head = M('#2b2d45');
  g.add(at(cyl(1.6, 2.2, 60, pole, 8), 0, 30, 0));
  g.add(at(box(7, 22, 8, head, .15), 0, 66, 0));
  g.add(at(box(2, 24, 10, head, .1), 3.5, 66, 0));
  const lamps = ['r', 'y', 'g'].map((k, i) => { const m = sph(2.6, SIG[k + 'off'], 10); at(m, 4.2, 73 - i * 7, 0); g.add(m); return m; });
  return { group: g, lamps };
}

// ================= 广告牌 =================
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const run = () => { g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, w, h); draw(g); tex.needsUpdate = true; };
  run(); document.fonts && document.fonts.ready.then(run);
  tex.redraw = run; return tex;
}
const NUMF = '"Plus Jakarta Sans", "Noto Sans SC", sans-serif', CNF = '"Noto Sans SC", "PingFang SC", sans-serif';
function hotStockTexture(c, L) { // 街区屋顶广告牌：这一环节今天成交最热的公司
  let logo = null;
  const chg = c.chg[6], up = chg >= 0, col = up ? '#0c9465' : '#be2c3d';
  const tex = canvasTex(360, 180, g => {
    g.fillStyle = '#ffffff'; rr(g, 0, 0, 360, 180, 22); g.fill();
    g.fillStyle = mix(L.color, W, .9); rr(g, 0, 0, 360, 44, [22, 22, 0, 0]); g.fill();
    g.fillStyle = mix(L.color, '#000000', .18); g.font = `800 17px ${CNF}`; g.textAlign = 'left'; g.fillText(`期权日报 · ${L.name} · 今日最热`, 18, 29);
    g.fillStyle = '#8e91a7'; g.font = `700 14px ${NUMF}`; g.textAlign = 'right'; g.fillText(`量 ${c.vx[6].toFixed(1)}x`, 342, 29);
    g.save(); g.beginPath(); g.arc(58, 112, 36, 0, Math.PI * 2); g.fillStyle = mix(L.color, W, .5); g.fill(); g.beginPath(); g.arc(58, 112, 31, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.clip();
    if (logo) g.drawImage(logo, 27, 81, 62, 62); else { g.fillStyle = mix(L.color, '#000', .18); g.font = `800 30px ${NUMF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.t[0], 58, 114); g.textBaseline = 'alphabetic'; }
    g.restore();
    g.textAlign = 'left'; g.fillStyle = '#16172a'; g.font = `800 46px ${NUMF}`; g.fillText(c.t, 108, 118);
    g.fillStyle = '#8e91a7'; g.font = `600 16px ${CNF}`; g.fillText(c.name, 110, 148);
    const txt = `${up ? '+' : '−'}${Math.abs(chg).toFixed(2)}%`; g.font = `800 22px ${NUMF}`; const tw = g.measureText(txt).width + 26;
    g.fillStyle = up ? '#e2f6ef' : '#fce7e9'; rr(g, 342 - tw, 92, tw, 38, 19); g.fill(); g.fillStyle = col; g.fillText(txt, 355 - tw, 119);
  });
  if (c.logo) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { logo = img; tex.redraw(); }; img.src = c.logo; }
  return tex;
}
function marketBoardTexture() { // 港口入口的大屏：今日市场
  return canvasTex(440, 220, g => {
    g.fillStyle = '#16172a'; rr(g, 0, 0, 440, 220, 24); g.fill();
    g.fillStyle = '#a59cff'; g.font = `900 24px ${CNF}`; g.textAlign = 'left'; g.fillText('潮信 · 今日市场', 24, 42);
    g.fillStyle = '#8e91a7'; g.font = `700 14px ${NUMF}`; g.textAlign = 'right'; g.fillText('2026-10-30 · 美股收盘', 416, 42);
    g.textAlign = 'left'; g.fillStyle = '#8e91a7'; g.font = `700 16px ${CNF}`; g.fillText('全市场 CP', 24, 84); g.fillText('最热 AI 环节', 250, 84);
    g.fillStyle = '#ffffff'; g.font = `800 64px ${NUMF}`; g.fillText('0.90', 24, 146);
    g.fillStyle = '#34d399'; g.font = `800 20px ${CNF}`; g.fillText('偏乐观', 150, 118); g.font = `700 16px ${NUMF}`; g.fillText('+15% vs 常态', 150, 142);
    g.fillStyle = '#5bd8ff'; g.font = `800 40px ${NUMF}`; g.fillText('2.3x', 250, 134); g.fillStyle = '#ffffff'; g.font = `800 20px ${CNF}`; g.fillText('光模块', 345, 134);
    g.fillStyle = '#8e91a7'; g.font = `600 14px ${CNF}`; g.fillText('在榜 3 只：LITE · COHR · CIEN', 250, 160);
    g.fillStyle = '#444760'; g.fillRect(24, 178, 392, 1.5);
    g.fillStyle = '#8e91a7'; g.font = `600 13px ${CNF}`; g.fillText('期权数据面倾向 · 不构成投资建议', 24, 202);
  });
}
function tickerTexture(items) { // 滚动字幕：公司代码 + 涨跌
  const tex = canvasTex(1600, 40, g => {
    g.fillStyle = '#0d0f1c'; g.fillRect(0, 0, 1600, 40);
    let x = 20; g.textBaseline = 'middle';
    items.forEach(([t, v]) => {
      g.font = `800 20px ${NUMF}`; g.fillStyle = '#ffffff'; g.fillText(t, x, 21); x += g.measureText(t).width + 8;
      const s = `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`; g.fillStyle = v >= 0 ? '#34d399' : '#ff6b7a'; g.font = `700 18px ${NUMF}`; g.fillText(s, x, 21); x += g.measureText(s).width + 14;
      g.fillStyle = '#444760'; g.fillText('·', x, 21); x += 18;
    });
  });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = .32;
  return tex;
}
function buildBillboard(tex, w, h, postH, opts) { // 面朝 +z
  opts = opts || {};
  const g = new THREE.Group(), post = M(opts.dark ? '#3a3c52' : '#b8bccd'), frame = M(opts.dark ? '#2b2d45' : '#ffffff');
  [-w * .32, w * .32].forEach(x => g.add(at(cyl(2.2, 2.6, postH, post, 8), x, postH / 2, -2)));
  const side = frame, face = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), [side, side, side, side, face, frame]); at(panel, 0, postH + h / 2, 0); g.add(panel);
  g.add(at(box(w + 6, h + 6, 2.4, frame, 0), 0, postH + h / 2, -1.5));
  shadow(g);
  return g;
}

// ================= 夜晚：灯光贴图 =================
function gradientTex(cone) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  if (cone) { g.beginPath(); g.moveTo(0, 54); g.lineTo(128, 6); g.lineTo(128, 122); g.lineTo(0, 74); g.closePath(); g.clip(); const gr = g.createRadialGradient(0, 64, 0, 0, 64, 128); gr.addColorStop(0, 'rgba(255,240,190,.95)'); gr.addColorStop(.5, 'rgba(255,240,190,.45)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  else { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,236,170,.95)'); gr.addColorStop(.45, 'rgba(255,236,170,.4)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const NIGHT = {
  lamp: M('#fff7d6', { emissive: '#ffe7a3', emissiveIntensity: .5 }), win: WIN, head: HEAD, tail: TAIL,
  pool: new THREE.MeshBasicMaterial({ map: gradientTex(false), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  beam: new THREE.MeshBasicMaterial({ map: gradientTex(true), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
};

// ================= 天空 =================
function buildBlimp(banner) { // banner：吊在飞艇下面的横幅文字（周报方向与环节轮动）
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(30, 110, 10, 24), M(W, { roughness: .45 })); hull.rotation.z = Math.PI / 2; g.add(hull);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(30.6, 30.6, 26, 32, 1, true), M('#5b4cff')); band.rotation.z = Math.PI / 2; at(band, -38, 0, 0); g.add(band);
  const tex = textTexture([['潮信', '900 62px "Noto Sans SC", sans-serif', '#5b4cff', 110, 70, 'center']], 220, 96, '#ffffff');
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.PlaneGeometry(64, 28), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); at(p, 18, 2, s * 30.8); if (s < 0) p.rotation.y = Math.PI; g.add(p); });
  [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([y, z]) => { const f = box(26, 3, 3, M('#1296f0'), 0); f.scale.set(1, y ? 9 : 1, z ? 9 : 1); at(f, -78, y * 14, z * 14); g.add(f); });
  g.add(at(box(26, 9, 12, M('#efedff')), 6, -34, 0));
  if (banner) {
    const bt = textTexture([[banner, '800 26px "Noto Sans SC", sans-serif', '#16172a', 300, 30, 'center']], 600, 48, '#ffffff');
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(210, 17), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false, side: THREE.DoubleSide })); at(bp, 10, -62, 0); g.add(bp);
    [-80, 80].forEach(x => g.add(at(box(.8, 20, .8, M('#8e91a7'), 0), x + 10, -44, 0)));
  }
  const prop = new THREE.Group(); at(prop, -96, 0, 0); g.add(prop);
  [0, 1].forEach(k => { const b = box(1.5, 22, 3, M('#8e91a7'), 0); b.rotation.x = k * Math.PI / 2; prop.add(b); });
  shadow(g);
  return { group: g, tick(t) { prop.rotation.x = t * 14; } };
}
function buildGull(i) {
  const g = new THREE.Group(), m = M(W), d = M('#8e91a7');
  g.add(at(box(9, 3, 3, m, .4), 0, 0, 0));
  const wl = new THREE.Group(), wr = new THREE.Group(); g.add(wl, wr);
  wl.add(at(box(4, 1, 12, m, 0), 0, 0, 6)); wl.add(at(box(3, 1.1, 4, d, 0), 0, 0, 12));
  wr.add(at(box(4, 1, 12, m, 0), 0, 0, -6)); wr.add(at(box(3, 1.1, 4, d, 0), 0, 0, -12));
  return { group: g, tick(t) { const f = Math.sin(t * 7 + i) * .55; wl.rotation.x = -f; wr.rotation.x = f; } };
}
function buildCloud(i) {
  const g = new THREE.Group(), m = M(W, { roughness: 1 });
  const n = 5 + i % 3;
  for (let k = 0; k < n; k++) { const r = 40 + ((k * 37 + i * 11) % 30); g.add(at(sph(r, m, 16), (k - n / 2) * 42, ((k * 13) % 3) * 8, ((k * 29) % 5 - 2) * 14)); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}


// ================= 子链地块牌 =================
function plotSignTexture(seg, sub, color) {
  return canvasTex(300, 130, g => {
    g.fillStyle = '#ffffff'; rr(g, 0, 0, 300, 130, 18); g.fill();
    g.fillStyle = color; rr(g, 0, 0, 14, 130, [18, 0, 0, 18]); g.fill();
    g.fillStyle = '#16172a'; g.font = `900 40px ${CNF}`; g.textAlign = 'left'; g.fillText(seg, 32, 62);
    g.fillStyle = '#8e91a7'; g.font = `700 22px ${CNF}`; g.fillText(sub, 32, 102);
  });
}
function buildPlotSign(seg, sub, color) { return buildBillboard(plotSignTexture(seg, sub, color), 96, 42, 22); }

// ================= 信号：楼顶旗（绿多 / 红空）、楼前目标价牌（研报上调 / 下调） =================
function buildFlag(color) {
  const g = new THREE.Group();
  g.add(at(cyl(1, 1.3, 44, M('#b8bccd'), 6), 0, 22, 0));
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(20, 12, 6, 1), new THREE.MeshStandardMaterial({ color, roughness: .8, side: THREE.DoubleSide, emissive: color, emissiveIntensity: .25 }));
  cloth.geometry.translate(10, 0, 0); cloth.position.y = 38; g.add(cloth);
  return { group: g, cloth, tick(T, ph) { const pos = cloth.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin(T * 6 + x * .35 + ph) * x * .12); } pos.needsUpdate = true; } };
}
function buildTargetSign(up) {
  const g = new THREE.Group(), c = up ? '#0fb57b' : '#e8364a';
  g.add(at(box(2.4, 22, 2.4, M('#b8bccd'), 0), 0, 11, 0));
  g.add(at(box(16, 14, 2, M('#ffffff'), .12), 0, 28, 0));
  const a = new THREE.Mesh(new THREE.ConeGeometry(4.5, 6, 3), M(c, { emissive: c, emissiveIntensity: .3 })); a.rotation.z = up ? 0 : Math.PI; a.position.set(0, up ? 30 : 26, 1.6); g.add(a);
  g.add(at(box(2.4, 5, 1.6, M(c), 0), 0, up ? 25 : 31, 1.6));
  return shadow(g);
}

// ================= 在建工地：塔吊 + 围挡（未上市巨头） =================
function buildCrane(color) {
  const g = new THREE.Group(), steel = M(color || '#f5a314'), dark = M('#3a3c52');
  g.add(at(box(34, 6, 34, M('#cfd2e2'), .1), 0, 3, 0));
  for (let k = 0; k < 6; k++) g.add(at(box(k % 2 ? 7 : 9, 28, k % 2 ? 7 : 9, steel, 0), 0, 6 + 14 + k * 28, 0));   // 塔身（粗细交替像桁架）
  const top = 6 + 6 * 28;
  const jib = new THREE.Group(); jib.position.y = top; g.add(jib);
  jib.add(at(box(150, 5, 5, steel, 0), 60, 6, 0)); jib.add(at(box(44, 5, 5, steel, 0), -32, 6, 0));
  jib.add(at(box(12, 12, 10, dark, .15), -42, 2, 0)); jib.add(at(box(10, 9, 9, M('#ffffff'), .1), 10, 0, 7));   // 配重、驾驶室
  for (let k = 1; k <= 4; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 40 + k * 22, 4), M('#8e91a7')); t.position.set(20 + k * 25, 20, 0); t.rotation.z = Math.atan2(40 + k * 22, 0) * 0 + Math.PI / 2 - Math.atan2(26, 20 + k * 25); jib.add(t); }
  jib.add(at(box(6, 30, 6, steel, 0), 0, 18, 0));
  const hookG = new THREE.Group(); hookG.position.set(110, 6, 0); jib.add(hookG);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 1, 4), M('#5d6182')); cable.position.y = -.5; hookG.add(cable);
  const hook = at(box(10, 8, 10, M('#ff6b2c'), .1), 0, -60, 0); hookG.add(hook);
  shadow(g);
  return { group: g, jib, hook, cable, tick(T, ph) { jib.rotation.y = Math.sin(T * .17 + ph) * .9; const L = 60 + Math.sin(T * .4 + ph) * 25; cable.scale.y = L; cable.position.y = -L / 2; hook.position.y = -L; } };
}
function buildFence(names, color) {
  const g = new THREE.Group(), n = names.length;
  const tex = canvasTex(520, 100, x => {
    x.fillStyle = mix(color, W, .85); x.fillRect(0, 0, 520, 100);
    x.fillStyle = mix(color, '#000000', .2); x.font = `900 30px ${CNF}`; x.textAlign = 'left'; x.fillText('未上市实验室 · 在建', 20, 42);
    x.fillStyle = '#444760'; x.font = `800 26px ${NUMF}`; x.fillText(names.join('  ·  '), 20, 80);
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(170, 32, 2.4), [M(W), M(W), M(W), M(W), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), M(mix(color, W, .85))]);
  at(panel, 0, 16, 0); g.add(panel);
  [-85, -28, 28, 85].forEach(x => g.add(at(box(4, 36, 4, M('#b8bccd'), 0), x, 18, -1)));
  g.add(at(box(150, 4, 90, M('#dcdfeb'), 0), 0, 2, -60));   // 地基
  for (let k = 0; k < 3; k++) g.add(at(box(14, 18, 14, M(mix(color, W, .6)), .05), -50 + k * 50, 9, -60));   // 刚起的柱子
  return shadow(g);
}

// ================= 发射场：发射塔 + 火箭（每隔一会儿点火升空） =================
function buildRocketPad() {
  const g = new THREE.Group(), steel = M('#8e91a7'), white = M('#ffffff', { roughness: .35 });
  g.add(at(cyl(150, 160, 10, M('#e4e6ef', { roughness: .9 }), 48), 0, 5, 0));
  g.add(at(box(70, 6, 70, M('#b8bccd'), 0), 0, 13, 0));
  // 发射塔：四根立柱 + 横撑
  const H = 190;
  [[-26, -26], [26, -26], [-26, 26], [26, 26]].forEach(([x, z]) => g.add(at(box(5, H, 5, steel, 0), x + 60, 16 + H / 2, z)));
  for (let y = 40; y < H; y += 30) { g.add(at(box(57, 3, 3, steel, 0), 60, 16 + y, -26)); g.add(at(box(57, 3, 3, steel, 0), 60, 16 + y, 26)); g.add(at(box(3, 3, 57, steel, 0), 34, 16 + y, 0)); }
  g.add(at(box(40, 4, 10, steel, 0), 20, 16 + H - 30, 0));   // 连接臂
  // 火箭
  const rocket = new THREE.Group(); rocket.position.set(0, 16, 0); g.add(rocket);
  rocket.add(at(cyl(12, 12, 120, white, 20), 0, 60, 0));
  rocket.add(at(box(26, 6, 26, M('#1296f0'), 0), 0, 92, 0));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(12, 34, 20), white); nose.position.y = 137; rocket.add(nose);
  [0, 1, 2].forEach(k => { const f = at(box(4, 26, 16, M('#3a3c52'), 0), 0, 13, 0); f.geometry.translate(0, 0, 14); f.rotation.y = k * Math.PI * 2 / 3; rocket.add(f); });
  rocket.add(at(cyl(6, 9, 10, M('#3a3c52'), 12), 0, -2, 0));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(9, 70, 12), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff8a1e', emissiveIntensity: 2.2, transparent: true, opacity: .9 }));
  flame.rotation.x = Math.PI; flame.position.y = -42; flame.scale.setScalar(.001); rocket.add(flame);
  const puffs = Array.from({ length: 10 }, (_, k) => { const m = sph(14, M('#ffffff', { roughness: 1, transparent: true, opacity: 0 }), 10); m.position.set(0, 20, 0); g.add(m); return { m, ph: k / 10 }; });
  const sign = buildBillboard(canvasTex(360, 150, x => { x.fillStyle = '#ffffff'; rr(x, 0, 0, 360, 150, 22); x.fill(); x.fillStyle = '#16172a'; x.font = `900 40px ${CNF}`; x.textAlign = 'left'; x.fillText('发射场 · 太空', 22, 64); x.fillStyle = '#8e91a7'; x.font = `700 24px ${CNF}`; x.fillText('SpaceX · 未上市 · 定期试射', 22, 112); }), 120, 50, 26);
  at(sign, -110, 10, 110); g.add(sign);
  shadow(g);
  const CYCLE = 96;
  return { group: g, rocket, flame, sign, tick(T) {
    const k = T % CYCLE;
    let y = 0, fl = 0, launching = false;
    if (k < 70) { y = 0; fl = 0; }
    else if (k < 73) { y = 0; fl = (k - 70) / 3; launching = true; }
    else if (k < 86) { const u = (k - 73) / 13; y = u * u * 2600; fl = 1; launching = true; }
    else { y = -9999; fl = 0; }
    rocket.position.y = y === -9999 ? -400 : 16 + y; rocket.visible = y !== -9999;
    flame.scale.setScalar(Math.max(fl, .001)); flame.scale.y = Math.max(fl * (1 + Math.sin(T * 40) * .15), .001);
    puffs.forEach(p => { const u = launching ? ((T * .6 + p.ph) % 1) : 0; p.m.material.opacity = launching ? (1 - u) * .8 : Math.max(0, p.m.material.opacity - .02); p.m.position.set(Math.cos(p.ph * 6.28) * (20 + u * 120), 18 + u * 40, Math.sin(p.ph * 6.28) * (20 + u * 120)); p.m.scale.setScalar(.6 + u * 2.4); });
    return { next: Math.max(0, Math.ceil(70 - k)), launching };
  } };
}


// ================= 园区平台（西南）：AI 医疗园区 + 机器人试验场 =================
function buildCampus() {
  const g = new THREE.Group();
  g.add(at(box(440, 10, 300, M('#e9f3ea', { roughness: .9 }), .04), 0, 5, 0));
  // 医院：白楼 + 蓝玻璃带 + 红十字 + 停机坪
  const hosp = new THREE.Group(); at(hosp, -110, 10, -40); g.add(hosp);
  hosp.add(at(box(130, 58, 86, M('#ffffff', { roughness: .5 }), .05), 0, 29, 0));
  hosp.add(at(box(132, 10, 88, M('#dfeefe', { roughness: .2 }), 0), 0, 22, 0));
  hosp.add(at(box(132, 10, 88, M('#dfeefe', { roughness: .2 }), 0), 0, 42, 0));
  const red = M('#e8364a', { emissive: '#e8364a', emissiveIntensity: .25 });
  hosp.add(at(box(24, 8, 2, red, 0), 0, 50, 44)); hosp.add(at(box(8, 24, 2, red, 0), 0, 50, 44));
  hosp.add(at(box(22, 2, 8, red, 0), 36, 59.5, 0)); hosp.add(at(box(8, 2, 22, red, 0), 36, 59.5, 0));
  hosp.add(at(cyl(26, 26, 2, M('#cfd2e2'), 32), -36, 59, 0)); hosp.add(at(cyl(20, 20, 1, M('#ffffff'), 32), -36, 60.5, 0));
  hosp.add(at(box(60, 2, 60, M('#dcdfeb'), 0), 0, .8, 80));   // 门前停车位
  // 试验场：环形跑道 + 看台
  const ring = new THREE.Mesh(new THREE.RingGeometry(58, 84, 48), M('#cfd2e2', { roughness: .9 })); ring.rotation.x = -Math.PI / 2; at(ring, 120, 10.6, 30); g.add(ring);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(56, 40), M('#d6f0dc', { roughness: 1 })); inner.rotation.x = -Math.PI / 2; at(inner, 120, 10.5, 30); g.add(inner);
  for (let k = 0; k < 3; k++) g.add(at(box(110, 6, 10, M(k ? '#ffffff' : '#c9c3ff'), .1), 120, 13 + k * 6, 130 + k * 10));
  // 牌子
  const sign = buildBillboard(canvasTex(380, 150, x => { x.fillStyle = '#ffffff'; rr(x, 0, 0, 380, 150, 22); x.fill(); x.fillStyle = '#16172a'; x.font = `900 38px ${CNF}`; x.textAlign = 'left'; x.fillText('AI 医疗园区 · 机器人试验场', 20, 62); x.fillStyle = '#8e91a7'; x.font = `700 23px ${CNF}`; x.fillText('应用与端侧的延伸 · 名单待补', 20, 110); }), 130, 52, 26);
  at(sign, -20, 10, 128); g.add(sign);
  shadow(g);
  return { group: g, hospital: hosp, trackCenter: new THREE.Vector3(120, 10, 30), sign };
}
function buildDrone() {
  const g = new THREE.Group();
  g.add(at(box(10, 4, 10, M('#3a3c52'), .2), 0, 0, 0));
  const rotors = [[-7, -7], [7, -7], [-7, 7], [7, 7]].map(([x, z]) => { g.add(at(box(9, 1.2, 1.2, M('#8e91a7'), 0), x / 2, 1, z / 2)); const r = cyl(5, 5, .6, M('#c9c3ff', { transparent: true, opacity: .7 }), 12); at(r, x, 3, z); g.add(r); return r; });
  g.add(at(box(6, 3, 6, M('#e8364a'), .3), 0, -3, 0));   // 药箱
  return { group: g, tick(t) { rotors.forEach((r, i) => r.rotation.y = t * 40 + i); } };
}

return { buildCampus, buildDrone, plotSignTexture, buildPlotSign, buildFlag, buildTargetSign, buildCrane, buildFence, buildRocketPad, M, box, cyl, sph, at, buildTower, logoSignTexture, buildTrafficLight, SIG, hotStockTexture, marketBoardTexture, tickerTexture, buildBillboard, NIGHT, buildCar, buildVan, buildTruck, buildFlatbed, buildBus, buildForklift, buildPerson, buildWalkerBot, buildDeliveryBot,
  buildWarehouse, buildRobotArm, buildGantry, buildPylon, buildStreetLight, buildTreeSmall, buildBench, buildCrates, buildContainerStack, buildBlimp, buildGull, buildCloud, SHIRT };
})();
