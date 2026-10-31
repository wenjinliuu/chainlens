/*
 * 潮信 · 首屏 3D 场景（Three.js）
 * - 日报海报的等距物件经 clay.js 转成 3D 黏土模型（芯片、GPU、机柜），加 3D K 线
 * - 3D K 线、印着公司 logo 的硬币（logo 来自 global-stock-logos）
 * - 鼠标视差、拖动旋转、悬停硬币翻转；离开视口时暂停渲染
 */
window.HERO = (async () => {
const THREE = await import('three');
const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');


const { buildObject, buildCoin, mix, buildRobin, mat } = await window.CLAY;
const { RoundedBoxGeometry: RBG } = await import('three/addons/geometries/RoundedBoxGeometry.js');
const W = '#ffffff';

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

  // 小更的飞行路线（单位≈像素，相对手机中心；手机左上角约在 (-165, 345)）
  const robin = buildRobin(); robin.group.scale.setScalar(1.7); root.add(robin.group);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const PERCH = V(-385, 215, 200);
  const FLY = [
    { c: new THREE.CubicBezierCurve3(V(-900, 480, 120), V(-700, 560, 260), V(-480, 260, 260), PERCH), d: 2.6 },
    { at: PERCH, d: 1.4, face: .5, deliver: true },
    { c: new THREE.CubicBezierCurve3(PERCH, V(-200, 470, 260), V(300, 520, 140), V(900, 470, -40)), d: 2.8 },
    { at: V(900, 470, -40), d: 5.5, face: 0 },
  ];
  const fly = { i: 0, t: 0 };
  robin.group.position.copy(FLY[0].c.getPoint(0));

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
    const dt = Math.max(0, Math.min((now - last) / 1000, .05)); last = now; const t = (now - t0) / 1000;
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
    // 小更：飞来 → 在手机左上角悬停投信（触发推送）→ 飞走 → 过一会儿再来
    robin.tick(t, dt);
    fly.t += dt;
    const seg = FLY[fly.i], k = Math.min(fly.t / seg.d, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    if (seg.c) { const p = seg.c.getPoint(e); robin.group.position.copy(p); const q = seg.c.getPoint(Math.min(e + .03, 1)); if (q.distanceTo(p) > .5) robin.group.lookAt(q.x, p.y, q.z); }
    else { robin.group.position.copy(seg.at); robin.group.position.y += Math.sin(t * 3) * 4; robin.group.rotation.y += (seg.face - robin.group.rotation.y) * .1; }
    robin.flying = !!seg.c; robin.envelope.visible = fly.i < 2;
    if (k >= 1) {
      if (seg.deliver && opts.onDeliver) { const v = robin.group.getWorldPosition(new THREE.Vector3()).project(camera); opts.onDeliver((v.x + 1) / 2 * canvas.clientWidth, (1 - v.y) / 2 * canvas.clientHeight); }
      fly.i = (fly.i + 1) % FLY.length; fly.t = 0;
    }
    renderer.render(scene, camera);
    if (visible) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { resize };
}

// ---------- 订阅区：小更和邮筒；订阅成功后衔信飞走 ----------
function initMascot(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d4ff', 1.1));
  const key = new THREE.DirectionalLight('#ffffff', 1.5); key.position.set(-200, 400, 300); scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 4000); camera.position.set(-140, 170, 600); camera.lookAt(10, 70, 0);
  const g = new THREE.Group(); scene.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(150, 160, 22, 64), mat('#efedff')); base.position.y = -11; g.add(base);
  // 邮筒：柱子 + 圆顶信箱 + 投信口 + 小旗
  const post = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 80, 16), mat('#c9c3ff')); post.position.set(60, 40, -20); g.add(post);
  const box = new THREE.Mesh(new RBG(80, 56, 58, 4, 16), mat('#5b4cff')); box.position.set(60, 104, -20); g.add(box);
  const slot = new THREE.Mesh(new RBG(40, 6, 4, 2, 2), mat('#2b2d5c')); slot.position.set(60, 112, 10); g.add(slot);
  const flag = new THREE.Group(); flag.position.set(102, 104, -20); g.add(flag);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(4, 50, 4), mat('#ff6b2c')); pole.position.y = 22; flag.add(pole);
  const cloth = new THREE.Mesh(new RBG(22, 14, 3, 2, 1), mat('#ff6b2c')); cloth.position.set(11, 40, 0); flag.add(cloth);
  const robin = buildRobin(); robin.group.scale.setScalar(1.75); robin.group.position.set(-40, 62, 30); robin.group.rotation.y = .5; g.add(robin.group);
  let away = 0, t0 = performance.now(), last = t0, visible = false;
  addEventListener('cl-subscribed', () => { away = .001; });
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visible) { visible = true; last = performance.now(); requestAnimationFrame(tick); } visible = v; }).observe(canvas);
  function tick(now) {
    const dt = Math.max(0, Math.min((now - last) / 1000, .05)); last = now; const t = (now - t0) / 1000;
    robin.tick(t, dt);
    g.rotation.y = Math.sin(t * .4) * .25;
    flag.rotation.z = away ? Math.max(flag.rotation.z - dt * 2, -1.4) : 0;
    if (away) { // 起飞，绕一圈飞出画面，3 秒后回到原位
      away += dt; robin.flying = true;
      const k = away / 2.6;
      robin.group.position.set(-40 + Math.sin(k * 3) * 160 + k * 220, 62 + k * 260, 30 - k * 120);
      robin.group.rotation.y = .5 + k * 2;
      if (away > 4.2) { away = 0; robin.flying = false; robin.group.position.set(-40, 62, 30); robin.group.rotation.y = .5; }
    }
    renderer.render(scene, camera);
    if (visible) requestAnimationFrame(tick);
  }
}

return { initHeroScene, initMascot };
})();
