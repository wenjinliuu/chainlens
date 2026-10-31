/*
 * 潮信 · AI 产业岛（Three.js）
 * 一座漂在潮水上的黏土小岛，8 个站点按产业链顺序排成两排，传送带从"原材料"一路通到"应用与端侧"：
 * - 站点底座高度 = 当日环节热度（与日报"AI 环节热度"同口径，示例数据）
 * - 货物方块沿传送带流动，经过哪一站就换成哪一层的颜色
 * - 站点上空漂着成员公司的 logo 硬币
 * - 悬停：站点抬起；点击 / 导览：镜头飞到该站，侧栏说明潮信每天在这一站看什么
 */
window.ISLAND = (async () => {
const C = await window.CLAY;
const { THREE, RoundedBoxGeometry, mat, STATIONS, buildCoin, mix } = C;
const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
const W = '#ffffff';

function initIsland(canvas, ui) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfe6ff', .95));
  const sun = new THREE.DirectionalLight('#fffaf2', 1.7); sun.position.set(-900, 1600, 900);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1400, right: 1400, top: 900, bottom: -900, near: 100, far: 4000 }); sun.shadow.bias = -.0004; sun.shadow.radius = 6;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(28, 1, 10, 12000);
  const HOME = { pos: new THREE.Vector3(-560, 1900, 2650), tgt: new THREE.Vector3(-360, -40, -40) };
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false; controls.target.copy(HOME.tgt);
  controls.minPolarAngle = .45; controls.maxPolarAngle = 1.15; controls.minAzimuthAngle = -.75; controls.maxAzimuthAngle = .75;

  // ---------- 岛与潮水 ----------
  const shape = new THREE.Shape(), RX = 1250, RZ = 700, N = 64;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const x = Math.sign(c) * Math.pow(Math.abs(c), .45) * RX, z = Math.sign(s) * Math.pow(Math.abs(s), .45) * RZ; i ? shape.lineTo(x, z) : shape.moveTo(x, z); }
  const islandGeo = new THREE.ExtrudeGeometry(shape, { depth: 90, bevelEnabled: true, bevelThickness: 24, bevelSize: 24, bevelSegments: 6, curveSegments: 64 });
  islandGeo.rotateX(Math.PI / 2);
  const island = new THREE.Mesh(islandGeo, [mat('#f5f6fb', { roughness: .75 }), mat('#ddd9fb', { roughness: .7 })]);
  island.position.y = 0; island.receiveShadow = true; scene.add(island);
  const sand = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 20, bevelEnabled: true, bevelThickness: 10, bevelSize: 46, bevelSegments: 4, curveSegments: 64 }).rotateX(Math.PI / 2), mat('#fdf3dc', { roughness: .9 }));
  sand.position.y = -62; scene.add(sand);

  const waterGeo = new THREE.PlaneGeometry(7000, 4600, 90, 60); waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, mat('#bfe2ff', { roughness: .18, metalness: .05, transparent: true, opacity: .92 }));
  water.position.y = -70; water.receiveShadow = true; scene.add(water);
  const wpos = waterGeo.attributes.position, wbase = Float32Array.from(wpos.array);

  // ---------- 站点 ----------
  const SLOT = [[-840, -250], [-280, -250], [280, -250], [840, -250], [840, 300], [280, 300], [-280, 300], [-840, 300]];
  const PAD = 300;
  const stations = CL.layers.map((L, i) => {
    const [x, z] = SLOT[i];
    const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
    const podMat = mat(mix(L.color, W, .82), { roughness: .55 });
    const pod = new THREE.Mesh(new RoundedBoxGeometry(PAD, 100, PAD, 4, 18), podMat);
    pod.castShadow = pod.receiveShadow = true; grp.add(pod);
    const rim = new THREE.Mesh(new RoundedBoxGeometry(PAD + 16, 10, PAD + 16, 3, 8), mat(mix(L.color, W, .55))); rim.position.y = 5; rim.receiveShadow = true; grp.add(rim);
    const st = STATIONS[L.id](L.color);
    st.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const s = st.group.userData.size || new THREE.Box3().setFromObject(st.group).getSize(new THREE.Vector3());
    const k = Math.min(230 / Math.max(s.x, s.z, 1), 1.25); st.group.scale.multiplyScalar(k);
    grp.add(st.group);
    const modelH = new THREE.Box3().setFromObject(st.group).getSize(new THREE.Vector3()).y;
    const coins = L.members.slice().sort((a, b) => b.cap - a.cap).slice(0, 3).map((c, j) => { const cg = buildCoin(c, L.color, 26); grp.add(cg); cg.userData.j = j; return cg; });
    return { L, i, grp, pod, podMat, st, coins, modelH, h: 0, hv: 0, ht: 0, lift: 0, lv: 0, lt: 0 };
  });

  // ---------- 传送带与货物 ----------
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1060, 14, -40), new THREE.Vector3(0, 14, -40), new THREE.Vector3(1040, 14, -40), new THREE.Vector3(1120, 14, 25),
    new THREE.Vector3(1040, 14, 90), new THREE.Vector3(0, 14, 90), new THREE.Vector3(-1040, 14, 90), new THREE.Vector3(-1120, 14, 25)], true, 'catmullrom', .2);
  const beltMat = mat('#d6d9ea', { roughness: .7 }), beltMat2 = mat('#c8cce2', { roughness: .7 });
  const L0 = curve.getLength(), segN = Math.floor(L0 / 34);
  for (let k = 0; k < segN; k++) {
    const t = k / segN, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const m = new THREE.Mesh(new RoundedBoxGeometry(30, 12, 64, 2, 4), k % 2 ? beltMat : beltMat2);
    m.position.copy(p).setY(7); m.rotation.y = Math.atan2(-tg.z, tg.x); m.receiveShadow = true; scene.add(m);
  }
  const cargo = Array.from({ length: 26 }, (_, k) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(24, 24, 24, 2, 5), mat('#ffffff')); m.castShadow = true; scene.add(m);
    return { m, t: k / 26, li: -1 };
  });
  const nearest = p => { let bi = 0, bd = 1e9; stations.forEach((s, i) => { const d = (s.grp.position.x - p.x) ** 2 + ((s.grp.position.z - p.z) * 1.6) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };

  // ---------- 交互 ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, focus = -1, tween = null;
  const pickStation = e => {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(stations.map(s => s.grp), true)[0];
    if (!hit) return null; let o = hit.object; while (o && !stations.find(s => s.grp === o)) o = o.parent; return stations.find(s => s.grp === o) || null;
  };
  canvas.addEventListener('pointermove', e => {
    const s = pickStation(e);
    if (s !== hover) { if (hover) hover.lt = 0; hover = s; if (s) s.lt = 34; canvas.style.cursor = s ? 'pointer' : 'grab'; ui.hover && ui.hover(s ? s.i : -1); }
  });
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) { const s = pickStation(e); if (s) go(s.i); }
    downAt = null;
  });
  function flyTo(pos, tgt) { tween = { t0: performance.now(), d: 1300, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: tgt }; }
  // 竖屏（手机）视野窄：按宽高比把镜头拉远；手机上面板在下方，不需要给左侧让位
  const narrow = () => camera.aspect < 1.3;
  const far = () => narrow() ? Math.min(1.3 / camera.aspect, 2.4) : 1;
  function view(i) {
    if (i < 0) {
      const tgt = HOME.tgt.clone(); if (narrow()) tgt.set(0, -40, 120);
      return [tgt.clone().add(HOME.pos.clone().sub(HOME.tgt).multiplyScalar(far())), tgt];
    }
    const p = stations[i].grp.position, back = i < 4;
    const tgt = new THREE.Vector3(p.x - (narrow() ? 0 : 170), narrow() ? 60 : 120, p.z + (narrow() ? 160 : 0));
    const off = new THREE.Vector3(-250, 960, back ? 1380 : 1450).multiplyScalar(narrow() ? Math.min(far(), 1.6) : 1);
    return [tgt.clone().add(off), tgt];
  }
  function go(i) {
    focus = i;
    const [pos, tgt] = view(i);
    flyTo(pos, tgt);
    ui.select && ui.select(i);
  }

  // ---------- 标签（HTML，跟随 3D 位置） ----------
  const tmp = new THREE.Vector3();
  function placeLabels() {
    const r = canvas.getBoundingClientRect();
    stations.forEach(s => {
      tmp.set(s.grp.position.x, 10 + Math.max(s.h, 2) + s.lift + s.modelH + 36, s.grp.position.z).project(camera);
      const el = ui.labels[s.i];
      el.style.transform = `translate(${(tmp.x + 1) / 2 * r.width}px, ${(1 - tmp.y) / 2 * r.height}px) translate(-50%, -100%)`;
      el.classList.toggle('on', s.i === focus || s === hover);
      el.classList.toggle('dim', focus >= 0 && s.i !== focus);
    });
  }

  // ---------- 热度 ----------
  const hOf = heat => 14 + Math.max(heat - .6, 0) * 70;
  function setDay(d) { stations.forEach(s => { s.ht = hOf(s.L.heat[d]); }); }
  setDay(6);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!tween) { const [pos, tgt] = view(focus); camera.position.copy(pos); controls.target.copy(tgt); }
  }
  resize(); addEventListener('resize', resize);
  let visible = false, last = performance.now(), T = 0;
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visible) { visible = true; last = performance.now(); requestAnimationFrame(tick); } visible = v; }, { threshold: .05 }).observe(canvas);
  const spring = (o, k, v, tgt, dt, K, D) => { o[v] += (K * (tgt - o[k]) - D * o[v]) * dt; o[k] += o[v] * dt; };
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function tick(now) {
    // rAF 时间戳可能早于上一帧记录的时间，帧间隔限制为不小于 0
    const dt = Math.max(0, Math.min((now - last) / 1000, .04)); last = now; T += dt;
    // 潮水
    for (let i = 0; i < wpos.count; i++) { const x = wbase[i * 3], z = wbase[i * 3 + 2]; wpos.array[i * 3 + 1] = Math.sin(x * .004 + T * 1.1) * 7 + Math.cos(z * .006 + T * .8) * 6; }
    wpos.needsUpdate = true; waterGeo.computeVertexNormals();
    // 站点
    stations.forEach(s => {
      spring(s, 'h', 'hv', s.ht, dt, 90, 14); spring(s, 'lift', 'lv', s.lt + (s.i === focus ? 24 : 0), dt, 160, 16);
      const H = Math.max(s.h, 2);
      s.pod.scale.y = H / 100; s.pod.position.y = 10 + H / 2;
      s.st.group.position.y = 10 + H + s.lift;
      s.podMat.emissive.set(s === hover || s.i === focus ? mix(s.L.color, W, .7) : '#000000'); s.podMat.emissiveIntensity = .25;
      s.st.tick(T, dt);
      const top = 10 + H + s.lift + s.modelH + 70;
      const show = focus < 0 || s.i === focus ? 1 : 0;
      s.coins.forEach((c, j) => {
        c.scale.setScalar(Math.max(c.scale.x + (show - c.scale.x) * .12, .001));
        const a = T * .5 + j * 2.1, rr = s === hover || s.i === focus ? 120 : 70;
        c.position.set(Math.cos(a) * rr, top + Math.sin(T * 1.6 + j) * 10 + j * 18, Math.sin(a) * rr * .5);
        c.lookAt(camera.position);
      });
    });
    // 货物
    cargo.forEach(c => {
      c.t = ((c.t + dt * .018) % 1 + 1) % 1;
      const p = curve.getPointAt(c.t); c.m.position.set(p.x, 30 + Math.abs(Math.sin(c.t * 400)) * 2, p.z);
      c.m.rotation.y = c.t * 20;
      const li = nearest(p); if (li !== c.li) { c.li = li; c.m.material = mat(mix(CL.layers[li].color, W, .2)); }
    });
    // 镜头
    if (tween) {
      const k = Math.min((now - tween.t0) / tween.d, 1), e = ease(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
      if (k >= 1) tween = null;
    }
    controls.update();
    renderer.render(scene, camera);
    placeLabels();
    if (visible) requestAnimationFrame(tick);
  }
  return { go, setDay, get focus() { return focus; } };
}
return { initIsland };
})();
