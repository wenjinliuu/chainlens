/*
 * 潮信 · 3D 盘面（Three.js，可拖动旋转）
 * 三种视图（数据均为虚构示例）：
 *   kline  个股日 K（60 根）+ 成交量 + CP 比曲线（色带 = 该股自身常态区间）
 *   intra  全市场分时：每 30 分钟一根柱，柱高 = 成交量，绿 = CP 高于全天
 *   heat   AI 环节热度：8 根柱，颜色 = 环节，柱顶放该环节的日报物件
 * 切换视图时旧柱子依次收起、新柱子依次长出。
 */
window.BOARD = (async () => {
const THREE = await import('three');
const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');


const { mix, DRAW } = window.ISO;
const W = '#ffffff', UP = mix('#0fb57b', W, .12), DN = mix('#e8364a', W, .12), GRAY = '#cfd3df';
const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r ?? .55, metalness: 0, envMapIntensity: .5 });

function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function genK() {
  const r = rng(11), out = []; let p = 100;
  for (let i = 0; i < 60; i++) {
    const o = p * (1 + (r() - .5) * .01), c = o * (1 + .003 + (r() - .5) * .045);
    out.push({ o, c, h: Math.max(o, c) * (1 + r() * .015), l: Math.min(o, c) * (1 - r() * .015), v: .4 + r() * .8 + (i > 50 ? .5 : 0), cp: 1.1 + Math.sin(i / 6) * .25 + (r() - .5) * .3 + (i > 55 ? .7 : 0) });
    p = c;
  }
  return out;
}

function miniObject(kind, color) {
  const g = new THREE.Group(), m = { body: mat(mix(color, W, .6)), pin: mat(mix(color, W, .4)), core: mat(mix(color, W, .18)), inner: mat(mix(color, W, .78)), dark3: mat(mix(color, '#16172a', .1)) };
  const pick = c => typeof c === 'string' ? m.inner : m[c.__k];
  const B = {
    box(x, y, z, w, d, h, c) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pick(c)); mesh.position.set(x + w / 2, z + h / 2, y + d / 2); g.add(mesh); },
    poly(pts, c) { const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]); const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...ys) - Math.min(...ys);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), pick(c)); mesh.position.set(Math.min(...xs) + w / 2, pts[0][2] + .75, Math.min(...ys) + d / 2); g.add(mesh); },
  };
  DRAW[kind].fn(B, { body: { __k: 'body' }, pin: { __k: 'pin' }, core: { __k: 'core' }, inner: 'inner', dark3: { __k: 'dark3' } });
  const b = new THREE.Box3().setFromObject(g), ctr = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
  g.children.forEach(ch => { ch.position.x -= ctr.x; ch.position.z -= ctr.z; ch.position.y -= b.min.y; });
  const s = 46 / Math.max(size.x, size.z); g.scale.setScalar(s);
  return g;
}

function initBoard(canvas, ui) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#dcd7ff', 1.05));
  const key = new THREE.DirectionalLight('#ffffff', 1.5); key.position.set(-260, 500, 320); scene.add(key);
  const camera = new THREE.PerspectiveCamera(32, 1, 10, 8000);
  camera.position.set(-690, 540, 1010);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false;
  controls.autoRotate = true; controls.autoRotateSpeed = .55;
  controls.minPolarAngle = .5; controls.maxPolarAngle = 1.35; controls.target.set(0, 70, 0);
  canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  const plate = new THREE.Mesh(new RoundedBoxGeometry(980, 16, 420, 4, 8), mat('#f3f4f9', .75));
  plate.position.y = -8; scene.add(plate);

  // ---------- 三种视图 ----------
  const K = genK();
  const views = {};
  function bar(w, h, d, color, x, z, info, y0) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, Math.max(h, 2), d, 3, Math.min(w, d) * .2), mat(color));
    m.geometry.translate(0, Math.max(h, 2) / 2, 0);
    m.position.set(x, y0 || 0, z); m.userData = { info, h }; m.scale.y = .001;
    return m;
  }
  views.kline = () => {
    const g = new THREE.Group(), lo = Math.min(...K.map(k => k.l)), hi = Math.max(...K.map(k => k.h)), Y = v => (v - lo) / (hi - lo) * 230 + 20;
    K.forEach((k, i) => {
      const x = -440 + i * 15, col = k.c >= k.o ? UP : DN;
      const body = bar(10, Math.abs(Y(k.c) - Y(k.o)), 10, col, x, 30, `第 ${i + 1} 根 · 开 ${k.o.toFixed(1)} 收 ${k.c.toFixed(1)}（${((k.c / k.o - 1) * 100).toFixed(2)}%）`, Math.min(Y(k.o), Y(k.c)));
      const wick = bar(2.4, Y(k.h) - Y(k.l), 2.4, col, x, 30, body.userData.info, Y(k.l));
      const vol = bar(10, k.v * 40, 10, mix(col, W, .45), x, -120, `第 ${i + 1} 根 · 成交量 ${(k.v * 100).toFixed(0)} 万张`);
      g.add(wick, body, vol);
    });
    // CP 比曲线：悬在前方的一条管子；后方半透明色带 = 常态区间
    const pts = K.map((k, i) => new THREE.Vector3(-440 + i * 15, 60 + k.cp * 90, 150));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 3.2, 10), mat('#5b4cff', .4));
    tube.userData = { info: 'CP 比曲线 · 最近 5 天明显高于常态', h: 1, tube: true }; tube.scale.y = .001; g.add(tube);
    const band = new THREE.Mesh(new THREE.BoxGeometry(900, 54, 1), new THREE.MeshBasicMaterial({ color: '#5b4cff', transparent: true, opacity: .08 }));
    band.position.set(-5, 60 + 1.25 * 90, 150); band.userData = { h: 1, tube: true }; band.scale.y = .001; g.add(band);
    return g;
  };
  views.intra = () => {
    const g = new THREE.Group(), v = [.62, .95, .74, .58, .52, .49, .55, .6, .57, .66, .78, .88, 1], cp = [.84, .91, .88, .86, .83, .9, .92, .95, .89, .94, .97, 1.02, 1.05];
    const T = ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
    v.forEach((h, i) => g.add(bar(52, h * 260, 120, cp[i] > .9 ? UP : GRAY, -390 + i * 65, 0, `${T[i]} · 成交量 ${(h * 100).toFixed(0)} · CP ${cp[i].toFixed(2)}${cp[i] > .9 ? '（高于全天 0.90）' : ''}`)));
    return g;
  };
  views.heat = () => {
    const g = new THREE.Group();
    CL.layers.forEach((L, i) => {
      const h = L.heat[6] * 110, x = -385 + i * 110;
      const b = bar(78, h, 130, mix(L.color, W, .35), x, 0, `${L.name} · 热度 ${L.heat[6].toFixed(1)}x（成员量倍数中位数）`);
      const obj = miniObject(L.obj, L.color); obj.position.set(x, h, 0); obj.userData = { ride: b }; obj.visible = false;
      g.add(b, obj);
    });
    return g;
  };

  let cur = null, curKey = '';
  function show(key) {
    if (key === curKey) return; curKey = key;
    const old = cur;
    if (old) {
      old.children.forEach((m, i) => { m.userData.out = performance.now() + i * 4; });
      setTimeout(() => scene.remove(old), 900);
    }
    cur = views[key](); scene.add(cur);
    const t = performance.now() + (old ? 350 : 0);
    cur.children.forEach((m, i) => { m.userData.in = t + i * (key === 'kline' ? 6 : 60); });
  }

  // ---------- 悬停读数 ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = null;
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = cur && ray.intersectObjects(cur.children, false).find(h => h.object.userData.info);
    const m = hit ? hit.object : null;
    if (m !== hovered) {
      if (hovered && hovered.material.emissive) hovered.material.emissive.setHex(0);
      hovered = m;
      if (m && m.material.emissive) m.material.emissive.setHex(0x22204a);
      ui.read(m ? m.userData.info : null);
    }
  });

  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  let visible = false;
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visible) { visible = true; requestAnimationFrame(tick); } visible = v; }).observe(canvas);
  const ease = k => 1 - Math.pow(1 - k, 3), back = k => { const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  function tick(now) {
    controls.update();
    [cur, ...scene.children.filter(c => c.isGroup && c !== cur)].forEach(g => g && g.children.forEach(m => {
      const u = m.userData;
      if (u.out) { const k = Math.min(Math.max((now - u.out) / 400, 0), 1); m.scale.y = Math.max(1 - ease(k), .001); if (u.ride) m.visible = false; return; }
      if (u.in == null) return;
      const k = Math.min(Math.max((now - u.in) / 700, 0), 1);
      if (u.ride) { m.visible = u.ride.scale.y > .98; m.position.y = u.ride.userData.h * u.ride.scale.y; return; }
      m.scale.y = Math.max(back(k), .001);
    }));
    renderer.render(scene, camera);
    if (visible) requestAnimationFrame(tick);
  }
  show('kline');
  return { show, resetSpin: () => { controls.autoRotate = true; } };
}

return { initBoard };
})();
