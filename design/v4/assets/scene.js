/*
 * ChainLens v4 · 首屏 3D 场景（Three.js）
 * - 日报海报的等距物件（ISO.DRAW：芯片、GPU、机柜…）经适配器转成真实 3D 方块，黏土材质 + 雾彩配色
 * - 3D K 线、印着公司 logo 的硬币（logo 来自 global-stock-logos）
 * - 鼠标视差、拖动旋转、悬停硬币翻转；离开视口时暂停渲染
 */
window.HERO = (async () => {
const THREE = await import('three');
const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');


const { mix, DRAW } = window.ISO;
const W = '#ffffff';

// ---------- 等距物件 → 3D ----------
function claySet(c) {
  const m = (hex, rough) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough ?? .62, metalness: 0, envMapIntensity: .55 });
  return { body: m(mix(c, W, .62)), pin: m(mix(c, W, .42)), core: m(mix(c, W, .2)), inner: m(mix(c, W, .78), .4), dark3: m(mix(c, '#16172a', .12)) };
}
function buildObject(kind, color) {
  const g = new THREE.Group(), mats = claySet(color);
  const pick = c => c === undefined ? mats.body : (typeof c === 'string' ? mats.inner : (c.__k ? mats[c.__k] : mats.body));
  const p = { body: { __k: 'body' }, pin: { __k: 'pin' }, core: { __k: 'core' }, inner: 'inner', dark3: { __k: 'dark3' } };
  const B = {
    box(x, y, z, w, d, h, c) {
      const r = Math.min(w, d, h) * .18;
      const geo = Math.min(w, d, h) > 9 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, pick(c));
      mesh.position.set(x + w / 2, z + h / 2, y + d / 2);
      g.add(mesh);
    },
    poly(pts, c) { // 只用于物件顶面的扁平方块
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), z = pts[0][2];
      const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, d = Math.max(...ys) - y0;
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, 2, d, 2, 1), pick(c));
      mesh.position.set(x0 + w / 2, z + 1, y0 + d / 2);
      g.add(mesh);
    },
  };
  DRAW[kind].fn(B, p);
  const box = new THREE.Box3().setFromObject(g), ctr = box.getCenter(new THREE.Vector3());
  g.children.forEach(ch => ch.position.sub(ctr));
  return g;
}
function buildCandles() {
  const g = new THREE.Group();
  const up = new THREE.MeshStandardMaterial({ color: mix('#0fb57b', W, .18), roughness: .5 });
  const dn = new THREE.MeshStandardMaterial({ color: mix('#e8364a', W, .18), roughness: .5 });
  const plate = new THREE.MeshStandardMaterial({ color: '#f1f2f8', roughness: .7 });
  const seq = [[40, 70, 30, 82], [70, 60, 52, 84], [60, 96, 50, 104], [96, 88, 80, 112], [88, 128, 84, 136], [128, 118, 104, 140], [118, 160, 112, 170]];
  const base = new THREE.Mesh(new RoundedBoxGeometry(260, 12, 90, 3, 5), plate); base.position.y = -6; g.add(base);
  seq.forEach(([o, c, l, h], i) => {
    const m = c >= o ? up : dn, x = -105 + i * 35;
    const body = new THREE.Mesh(new RoundedBoxGeometry(22, Math.max(Math.abs(c - o), 6), 22, 3, 5), m);
    body.position.set(x, Math.min(o, c) + Math.abs(c - o) / 2, 0); g.add(body);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, h - l, 10), m);
    wick.position.set(x, l + (h - l) / 2, 0); g.add(wick);
    body.userData.grow = true; wick.userData.grow = true;
  });
  return g;
}
function logoTexture(url, ring) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const paint = img => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.fill();
    if (img) { ctx.save(); ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, 16, 16, 224, 224); ctx.restore(); }
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  paint(null);
  const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => paint(img); img.src = url;
  return tex;
}
function buildCoin(c, color) {
  const ring = mix(color, W, .45);
  const side = new THREE.MeshStandardMaterial({ color: ring, roughness: .45 });
  const face = new THREE.MeshStandardMaterial({ map: logoTexture(c.logo, ring), roughness: .5 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 9, 64), [side, face, face]);
  coin.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.add(coin); g.userData.coin = c;
  return g;
}

// ---------- 场景 ----------
function initHeroScene(canvas, opts) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d4ff', 1.1));
  const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(-300, 500, 400); scene.add(key);
  const rim = new THREE.DirectionalLight('#c9c3ff', .8); rim.position.set(400, -100, -300); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
  const root = new THREE.Group(); scene.add(root);

  // 摆放：单位≈像素（相对于手机中心），z 越大越靠前
  const items = [];
  const add = (obj, x, y, z, s, ry, rx, delay) => {
    const holder = new THREE.Group(); holder.add(obj);
    holder.position.set(x, y, z); holder.userData = { base: new THREE.Vector3(x, y, z), s, ry, rx, delay, phase: Math.random() * 6 };
    obj.rotation.set(rx, ry, 0); holder.scale.setScalar(.001);
    root.add(holder); items.push(holder); return holder;
  };
  add(buildObject('chip', '#5b4cff'), -250, -210, 60, .95, -.78, .62, 0);
  add(buildObject('gpu', '#a04cf5'), 245, 250, -40, .78, -.9, .55, 120);
  add(buildObject('rack', '#1296f0'), 270, -220, 20, .72, -.7, .38, 240);
  add(buildCandles(), -255, 215, -20, .9, -.55, .42, 360);
  const coinSpots = [['NVDA', -180, 300, 120, '#1296f0'], ['MU', -335, 40, 100, '#5b4cff'], ['TSM', 330, 10, 140, '#5b4cff']];
  const coins = coinSpots.map(([t, x, y, z, col], i) => add(buildCoin(CL.byT[t], col), x, y, z, 1, 0, 0, 480 + i * 90));

  // ---------- 交互 ----------
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }, drag = { on: false, x0: 0, spin: 0, v: 0, t: 0 };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null;
  const host = opts.host;
  host.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ptr.tx = (e.clientX - r.left) / r.width * 2 - 1; ptr.ty = (e.clientY - r.top) / r.height * 2 - 1;
    if (drag.on) { drag.t = (e.clientX - drag.x0) / r.width * 120; }
    ndc.set(ptr.tx, -ptr.ty); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(coins, true)[0];
    const h = hit ? coins.find(c => c === hit.object.parent.parent) : null;
    if (h !== hover) { hover = h; opts.onCoin && opts.onCoin(h ? h.children[0].userData.coin : null, e); if (h) h.userData.flip = 1; }
  });
  host.addEventListener('pointerdown', e => { drag.on = true; drag.x0 = e.clientX; drag.t = drag.spin; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointerup', () => { drag.on = false; drag.t = 0; });
  host.addEventListener('pointerleave', () => { ptr.tx = ptr.ty = 0; });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0, h / 2 / Math.tan(THREE.MathUtils.degToRad(15)));
    camera.updateProjectionMatrix();
    root.position.x = opts.offsetX ? opts.offsetX() : 0;
  }
  resize(); addEventListener('resize', resize);

  let visible = true, t0 = performance.now(), last = t0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(tick); } }).observe(canvas);
  const easeBack = k => { const c = 1.70158 * 1.3; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  function tick(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now; const t = (now - t0) / 1000;
    ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06;
    drag.spin += (drag.t - drag.spin) * (drag.on ? .25 : .08);
    opts.onTilt && opts.onTilt(ptr.x, ptr.y, drag.spin);
    root.rotation.y = ptr.x * .16 + drag.spin * .012;
    root.rotation.x = ptr.y * .1;
    items.forEach(it => {
      const u = it.userData, k = Math.min(Math.max((now - t0 - 500 - u.delay) / 900, 0), 1);
      it.scale.setScalar(Math.max(easeBack(k), .001) * u.s);
      it.position.y = u.base.y - Math.sin(t * .9 + u.phase) * 9;
      it.children[0].rotation.y = u.ry + Math.sin(t * .4 + u.phase) * .12 + drag.spin * .02;
      if (u.flip) { u.flip = Math.max(u.flip - dt * 1.4, 0); it.children[0].rotation.y = u.ry + (1 - u.flip) * Math.PI * 2; }
    });
    renderer.render(scene, camera);
    if (visible) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { resize };
}

return { initHeroScene };
})();
