/*
 * 潮信 · AI 产业岛（Three.js）
 * 一座漂在潮水上的黏土小岛，8 个站点按产业链顺序排成两排：
 * - 潮水：着色器波浪 + 潮位涨落（沙滩随潮水露出 / 淹没）+ 一圈圈推向岸边的浪花 + 近岸浅、远处深
 * - 运作：传送带货物逐站变形（矿石 → 金属锭 → 芯片 → 光模块 → 服务器 → GPU → 云 → 应用）；
 *         能源站拉电线给数据中心 / 算力 / 云供电（黄色电流）；网络站向下游发数据（青色光流）
 * - 站点底座高度 = 当日环节热度；上空漂着成员公司 logo 硬币
 * - 吉祥物小更：从灯塔出发，飞到各站取信再送回灯塔；灯塔光束旋转
 * - 绕岛货船，集装箱是 8 层的颜色
 * - 悬停抬起；点击 / 导览飞镜头，侧栏说明潮信每天在这一站看什么
 */
window.ISLAND = (async () => {
const C = await window.CLAY;
const { THREE, RoundedBoxGeometry, mat, STATIONS, buildCoin, mix, buildRobin, CARGO, buildLighthouse, buildShip, buildTree } = C;
const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
const W = '#ffffff';

// ---------- 海浪：着色器与 JS 用同一套波形（货船随浪起伏） ----------
const WAVES = [[.0021, .0013, 9, .9], [-.0016, .0024, 6, 1.3], [.0042, -.0011, 3.2, 2.1], [-.0055, -.0047, 1.8, 2.8]];
const SHORE = [1330, 780, 4.44]; // 岸线：超椭圆半轴与指数（略大于岛体，含沙滩）
function waveH(x, z, t) { let h = 0; for (const [kx, kz, a, w] of WAVES) h += a * Math.sin(x * kx + z * kz + t * w); return h; }
const waterVS = `
  uniform float uTime, uTide; varying vec3 vW; varying float vH;
  ${WAVES.map((w, i) => `const vec4 W${i} = vec4(${w.map(v => v.toFixed(5)).join(',')});`).join('\n  ')}
  float wv(vec4 w, vec2 p) { return w.z * sin(p.x * w.x + p.y * w.y + uTime * w.w); }
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float h = wv(W0, wp.xz) + wv(W1, wp.xz) + wv(W2, wp.xz) + wv(W3, wp.xz);
    wp.y += h + uTide; vH = h; vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const waterFS = `
  uniform float uTime, uTide; uniform vec3 uSun, uShallow, uMid, uDeep, uFoam, uSky, uFog; varying vec3 vW; varying float vH;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (n.y < 0.0) n = -n;
    float sd = pow(pow(abs(vW.x) / ${SHORE[0]}.0, ${SHORE[2]}) + pow(abs(vW.z) / ${SHORE[1]}.0, ${SHORE[2]}), 1.0 / ${SHORE[2]}) - 1.0;
    float d = max(sd, 0.0) * ${SHORE[1]}.0 - uTide * 2.2;           // 离岸距离（潮位高时水线向岸里推）
    vec3 col = mix(uShallow, uMid, smoothstep(0.0, 260.0, d));
    col = mix(col, uDeep, smoothstep(200.0, 1400.0, d));
    float nz = noise(vW.xz * 0.012 + uTime * 0.08) * 0.6 + noise(vW.xz * 0.035 - uTime * 0.05) * 0.4;
    // 一圈圈推向岸边的浪花
    float ph = d * 0.032 + uTime * 1.35 + nz * 2.2;
    float line = smoothstep(0.86, 0.985, sin(ph)) * (1.0 - smoothstep(30.0, 360.0, d)) * smoothstep(0.25, 0.6, nz + 0.2);
    float shore = 1.0 - smoothstep(0.0, 26.0 + 14.0 * sin(uTime * 1.7 + nz * 6.0), d);
    float crest = smoothstep(9.0, 15.0, vH) * 0.35 * nz;
    float foam = clamp(line * 0.85 + shore + crest, 0.0, 1.0);
    vec3 V = normalize(cameraPosition - vW);
    float diff = 0.78 + 0.22 * max(dot(n, uSun), 0.0);
    float spec = pow(max(dot(reflect(-uSun, n), V), 0.0), 140.0) * 0.9;
    float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    col = col * diff + spec;
    col = mix(col, uSky, fres * 0.45);
    col = mix(col, uFoam, foam);
    float fogK = smoothstep(4600.0, 9500.0, length(cameraPosition - vW));
    col = mix(col, uFog, fogK);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function initIsland(canvas, ui) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const FOG = '#e6f2ff';
  scene.fog = new THREE.Fog(FOG, 4600, 9500);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfe6ff', .95));
  const sun = new THREE.DirectionalLight('#fffaf2', 1.7); sun.position.set(-900, 1600, 900);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1900, right: 1900, top: 1100, bottom: -1100, near: 100, far: 4200 }); sun.shadow.bias = -.0004; sun.shadow.radius = 6;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(28, 1, 10, 14000);
  const HOME = { pos: new THREE.Vector3(-480, 2550, 3500), tgt: new THREE.Vector3(-200, -60, -60) };
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false; controls.target.copy(HOME.tgt);
  controls.minPolarAngle = .45; controls.maxPolarAngle = 1.15; controls.minAzimuthAngle = -.75; controls.maxAzimuthAngle = .75;

  // ---------- 岛 ----------
  const shape = new THREE.Shape(), RX = 1250, RZ = 700, N = 72;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const x = Math.sign(c) * Math.pow(Math.abs(c), .45) * RX, z = Math.sign(s) * Math.pow(Math.abs(s), .45) * RZ; i ? shape.lineTo(x, z) : shape.moveTo(x, z); }
  const ext = (depth, bev, size) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: size, bevelSegments: 6, curveSegments: 72 }).rotateX(Math.PI / 2);
  const island = new THREE.Mesh(ext(110, 24, 24), [mat('#f6f7fb', { roughness: .8 }), mat('#d9d4fb', { roughness: .7 })]);
  island.receiveShadow = true; scene.add(island);
  const sand = new THREE.Mesh(ext(60, 14, 70), mat('#fbefd6', { roughness: .95 })); sand.position.y = -46; sand.receiveShadow = true; scene.add(sand);
  const cliff = new THREE.Mesh(ext(260, 10, 96), mat('#e8dcc4', { roughness: .95 })); cliff.position.y = -120; scene.add(cliff);

  // 潮水
  const waterGeo = new THREE.PlaneGeometry(14000, 9000, 260, 170); waterGeo.rotateX(-Math.PI / 2);
  const uni = {
    uTime: { value: 0 }, uTide: { value: 0 }, uSun: { value: new THREE.Vector3(-.45, .8, .4).normalize() },
    uShallow: { value: new THREE.Color('#a6ecef') }, uMid: { value: new THREE.Color('#8fd2f6') }, uDeep: { value: new THREE.Color('#78b4ef') },
    uFoam: { value: new THREE.Color('#ffffff') }, uSky: { value: new THREE.Color('#eaf6ff') }, uFog: { value: new THREE.Color(FOG) },
  };
  const water = new THREE.Mesh(waterGeo, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: waterVS, fragmentShader: waterFS }));
  const WATER_Y = -62; water.position.y = WATER_Y; scene.add(water);

  // 装饰：树、礁石
  [[-1130, -520, 1.1], [-1040, 560, .9], [1120, 560, 1], [1150, -520, .85], [-560, -600, .7], [560, 610, .75], [0, -610, .8], [-1180, 40, .7]]
    .forEach(([x, z, s]) => { const t = buildTree(s * 1.4); t.position.set(x, 24, z); scene.add(t); });
  const rockM = mat('#d6d5e2', { flatShading: true, roughness: .9 });
  [[1380, 400, 40], [-1420, -300, 34], [-600, 860, 28], [900, -860, 30], [1460, -120, 22]].forEach(([x, z, r]) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockM); m.position.set(x, WATER_Y - 4, z); m.scale.y = .7; scene.add(m); });

  // 灯塔（小更的家）
  const light = buildLighthouse(); light.group.position.set(1530, WATER_Y + 30, -330); light.group.scale.setScalar(1.15); scene.add(light.group);
  light.group.traverse(o => { if (o.isMesh && o.material.type !== 'MeshBasicMaterial') o.castShadow = true; });
  const LIGHT_TOP = light.group.position.clone().add(new THREE.Vector3(0, 340, 0));

  // 货船
  const ship = buildShip(); scene.add(ship); ship.scale.setScalar(1.4);

  // ---------- 站点 ----------
  const SLOT = [[-840, -250], [-280, -250], [280, -250], [840, -250], [840, 300], [280, 300], [-280, 300], [-840, 300]];
  const PAD = 300, TOP = 24;
  const stations = CL.layers.map((L, i) => {
    const [x, z] = SLOT[i];
    const grp = new THREE.Group(); grp.position.set(x, TOP, z); scene.add(grp);
    const podMat = mat(mix(L.color, W, .82), { roughness: .55 });
    const pod = new THREE.Mesh(new RoundedBoxGeometry(PAD, 100, PAD, 4, 18), podMat);
    pod.castShadow = pod.receiveShadow = true; grp.add(pod);
    const rim = new THREE.Mesh(new RoundedBoxGeometry(PAD + 16, 10, PAD + 16, 3, 8), mat(mix(L.color, W, .55))); rim.position.y = 5; rim.receiveShadow = true; grp.add(rim);
    const st = STATIONS[L.id](L.color);
    st.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const s = new THREE.Box3().setFromObject(st.group).getSize(new THREE.Vector3());
    const k = Math.min(230 / Math.max(s.x, s.z, 1), 1.25); st.group.scale.multiplyScalar(k);
    grp.add(st.group);
    const modelH = new THREE.Box3().setFromObject(st.group).getSize(new THREE.Vector3()).y;
    const coins = L.members.slice().sort((a, b) => b.cap - a.cap).slice(0, 3).map((c, j) => { const cg = buildCoin(c, L.color, 26); grp.add(cg); return cg; });
    return { L, i, grp, pod, podMat, st, coins, modelH, h: 0, hv: 0, ht: 0, lift: 0, lv: 0, lt: 0 };
  });
  const topOf = s => new THREE.Vector3(s.grp.position.x, TOP + 10 + Math.max(s.h, 2) + s.lift + s.modelH * .8, s.grp.position.z);

  // ---------- 传送带与逐站变形的货物 ----------
  const BY = TOP + 8;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1060, BY, -40), new THREE.Vector3(0, BY, -40), new THREE.Vector3(1040, BY, -40), new THREE.Vector3(1120, BY, 25),
    new THREE.Vector3(1040, BY, 90), new THREE.Vector3(0, BY, 90), new THREE.Vector3(-1040, BY, 90), new THREE.Vector3(-1120, BY, 25)], true, 'catmullrom', .2);
  const beltMat = mat('#d6d9ea', { roughness: .7 }), beltMat2 = mat('#c8cce2', { roughness: .7 });
  const segN = Math.floor(curve.getLength() / 34);
  const belts = [];
  for (let k = 0; k < segN; k++) {
    const t = k / segN, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const m = new THREE.Mesh(new RoundedBoxGeometry(30, 12, 64, 2, 4), k % 2 ? beltMat : beltMat2);
    m.position.copy(p).setY(BY - 1); m.rotation.y = Math.atan2(-tg.z, tg.x); m.receiveShadow = true; scene.add(m); belts.push(m);
  }
  const nearest = p => { let bi = 0, bd = 1e9; stations.forEach((s, i) => { const d = (s.grp.position.x - p.x) ** 2 + ((s.grp.position.z - p.z) * 1.6) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  const cargo = Array.from({ length: 24 }, (_, k) => ({ g: null, t: k / 24, li: -1, pop: 1, pv: 0 }));
  function morph(c, li) {
    if (c.g) scene.remove(c.g);
    c.g = CARGO(li); scene.add(c.g); c.li = li; c.pop = .2; c.pv = 0;
  }

  // ---------- 电力线（能源 → 数据中心 / 算力 / 云）与数据光流（网络 → 下游，云 → 应用） ----------
  const flows = [];
  function flow(a, b, height, color, n, speed, r) {
    const pa = stations[a].grp.position, pb = stations[b].grp.position;
    const A = new THREE.Vector3(pa.x, TOP + 150, pa.z), B = new THREE.Vector3(pb.x, TOP + 130, pb.z);
    const M = A.clone().lerp(B, .5); M.y = height;
    const cv = new THREE.QuadraticBezierCurve3(A, M, B);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(cv, 48, r, 8), mat(mix(color, W, .55), { transparent: true, opacity: .55 }));
    scene.add(tube);
    const dots = Array.from({ length: n }, (_, k) => { const d = new THREE.Mesh(new THREE.SphereGeometry(r * 2.4, 12, 10), mat('#ffffff', { emissive: color, emissiveIntensity: 1.6 })); scene.add(d); return { d, t: k / n }; });
    flows.push({ cv, dots, speed });
  }
  [4, 5, 6].forEach((b, k) => flow(1, b, 520 + k * 40, '#f5a314', 3, .32, 3.2));
  [4, 5, 6].forEach((b, k) => flow(3, b, 380 + k * 30, '#00a8c6', 4, .45, 2.6));
  flow(6, 7, 360, '#1296f0', 4, .5, 2.6);

  // ---------- 小更：灯塔 ⇄ 各站送信 ----------
  const robin = buildRobin(); robin.group.scale.setScalar(2.1); scene.add(robin.group);
  const trip = { from: 0, phase: 'rest', t: 0, curve: null, target: 0 };
  function newTrip() {
    const st = stations[focus >= 0 ? focus : trip.target]; trip.target = (trip.target + 3) % stations.length;
    const p = topOf(st).add(new THREE.Vector3(0, 70, 0));
    const mid = LIGHT_TOP.clone().lerp(p, .5); mid.y += 260;
    trip.out = new THREE.QuadraticBezierCurve3(LIGHT_TOP.clone(), mid, p);
    trip.back = new THREE.QuadraticBezierCurve3(p, mid.clone().add(new THREE.Vector3(0, 80, 160)), LIGHT_TOP.clone());
    trip.phase = 'out'; trip.t = 0;
  }

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
    if (i >= 0 && trip.phase === 'rest') trip.restT = 0;
    ui.select && ui.select(i);
  }

  // ---------- 标签（HTML，跟随 3D 位置） ----------
  const tmp = new THREE.Vector3();
  function placeLabels() {
    const r = canvas.getBoundingClientRect();
    stations.forEach(s => {
      tmp.set(s.grp.position.x, TOP + 10 + Math.max(s.h, 2) + s.lift + s.modelH + 36, s.grp.position.z).project(camera);
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
  const look = new THREE.Vector3(), SHIP_R = [1780, 1060];
  trip.restT = 1.2;
  function tick(now) {
    // rAF 时间戳可能早于上一帧记录的时间，帧间隔限制为不小于 0
    const dt = Math.max(0, Math.min((now - last) / 1000, .04)); last = now; T += dt;
    // 潮水：波浪 + 潮位涨落（约 18 秒一个周期）
    uni.uTime.value = T; uni.uTide.value = Math.sin(T * .35) * 16;
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
    // 货物：沿传送带移动，进入新站时变形并弹一下
    cargo.forEach(c => {
      c.t = ((c.t + dt * .016) % 1 + 1) % 1;
      const p = curve.getPointAt(c.t), li = nearest(p);
      if (li !== c.li) morph(c, li);
      spring(c, 'pop', 'pv', 1, dt, 220, 12);
      c.g.position.set(p.x, BY + 6, p.z); c.g.scale.setScalar(Math.max(c.pop, .05) * 1.15);
      const tg = curve.getTangentAt(c.t); c.g.rotation.y = Math.atan2(-tg.z, tg.x);
    });
    // 电流 / 数据光点
    flows.forEach(f => f.dots.forEach(o => { o.t = (o.t + dt * f.speed) % 1; o.d.position.copy(f.cv.getPoint(o.t)); }));
    // 灯塔
    light.tick(T);
    // 货船：绕岛航行，随浪起伏
    const sa = T * .045, sx = Math.cos(sa) * SHIP_R[0], sz = Math.sin(sa) * SHIP_R[1];
    const sh = waveH(sx, sz, T);
    ship.position.set(sx, WATER_Y + uni.uTide.value + sh + 6, sz);
    ship.rotation.set((waveH(sx, sz + 60, T) - waveH(sx, sz - 60, T)) * .006, Math.atan2(-Math.cos(sa) * SHIP_R[1], -Math.sin(sa) * SHIP_R[0]) + Math.PI, (waveH(sx + 80, sz, T) - waveH(sx - 80, sz, T)) * .004);
    // 小更送信
    robin.tick(T, dt);
    if (trip.phase === 'rest') {
      robin.flying = false; robin.group.position.copy(LIGHT_TOP); robin.group.rotation.y = Math.sin(T * .3) * .8 - .6;
      trip.restT -= dt; if (trip.restT <= 0) newTrip();
    } else {
      robin.flying = true;
      trip.t += dt / 3.4;
      const cv = trip.phase === 'out' ? trip.out : trip.back, k = Math.min(trip.t, 1), e = ease(k);
      const p = cv.getPoint(e); look.copy(cv.getPoint(Math.min(e + .02, 1)));
      robin.group.position.copy(p); robin.group.lookAt(look.x, p.y, look.z);
      robin.envelope.visible = trip.phase === 'back';
      if (k >= 1) { if (trip.phase === 'out') { trip.phase = 'back'; trip.t = 0; } else { trip.phase = 'rest'; trip.restT = 2.5; robin.envelope.visible = true; } }
    }
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
