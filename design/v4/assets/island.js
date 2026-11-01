/*
 * 潮信 · AI 产业镇（Three.js）
 * 一座漂在潮水上的小镇：8 个环节 = 8 个街区，由环岛路、中央大道和三条横街连起来。
 * - 大道：西接跨海大桥（来自大陆），东到港口；港口岸桥给货船装集装箱
 * - 交通：集装箱车、平板车（车上货物随所在街区变形：矿石→金属锭→芯片→光模块→服务器→GPU→云→应用）、
 *         小汽车、厢式车、潮信巴士；各走各的车道，跟车减速、路口让行
 * - 街区：站点模型（底座高度 = 当日环节热度）、仓库（烟囱冒烟）、叉车来回搬货、工人干活、机器人臂、
 *         人行道上的行人 / 两足机器人 / 快递小车、行道树、路灯、长椅
 * - 能源：电塔和电线把电从能源街区送到数据中心、算力、云（黄色电流）；网络街区向下游发数据光流
 * - 天空：潮信飞艇、海鸥、云朵；灯塔上的小更来回送信；绕岛货船
 * 场景只建一次（getTown），首页背景（initHeroIsland）和导览区（initIsland）各用一个相机渲染同一个场景。
 * 细节：大道三个路口有红绿灯（车辆停车等灯、行人等绿灯过斑马线）；街区屋顶广告牌轮播当天最热公司；
 *       港口入口有市场大屏和滚动字幕；夜晚模式：白天 → 黄昏 → 夜晚，路灯、车灯、窗户亮起，星星和月亮出现。
 * 全部为示例数据。
 */
window.ISLAND = (async () => {
const C = await window.CLAY;
const T_ = await window.TOWN;
const { THREE, RoundedBoxGeometry, STATIONS, buildCoin, mix, buildRobin, buildLighthouse, buildShip } = C;
const { M, box, cyl, sph, at } = T_;
const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
const W = '#ffffff';
const G = 24;                       // 岛面高度
const RX = 1400, RZ = 820;          // 岛的半轴（超椭圆）

// ---------- 海浪（着色器与 JS 同一套波形） ----------
const WAVES = [[.0021, .0013, 9, .9], [-.0016, .0024, 6, 1.3], [.0042, -.0011, 3.2, 2.1], [-.0055, -.0047, 1.8, 2.8]];
const SHORE = [RX + 85, RZ + 85, 4.44];
const waveH = (x, z, t) => WAVES.reduce((h, [kx, kz, a, w]) => h + a * Math.sin(x * kx + z * kz + t * w), 0);
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
    float d = max(sd, 0.0) * ${SHORE[1]}.0 - uTide * 2.2;
    vec3 col = mix(uShallow, uMid, smoothstep(0.0, 280.0, d));
    col = mix(col, uDeep, smoothstep(220.0, 1600.0, d));
    float nz = noise(vW.xz * 0.012 + uTime * 0.08) * 0.6 + noise(vW.xz * 0.035 - uTime * 0.05) * 0.4;
    float ph = d * 0.032 + uTime * 1.35 + nz * 2.2;
    float line = smoothstep(0.86, 0.985, sin(ph)) * (1.0 - smoothstep(30.0, 380.0, d)) * smoothstep(0.25, 0.6, nz + 0.2);
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
    col = mix(col, uFog, smoothstep(5200.0, 11000.0, length(cameraPosition - vW)));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// ---------- 路径：按弧长匀速取点 ----------
class Path {
  constructor(pts, closed) {
    this.p = pts; this.closed = closed; this.c = [0];
    const n = pts.length + (closed ? 1 : 0);
    for (let i = 1; i < n; i++) this.c.push(this.c[i - 1] + pts[i % pts.length].distanceTo(pts[i - 1]));
    this.len = this.c[this.c.length - 1];
  }
  at(s, pos, dir) {
    if (this.closed) s = ((s % this.len) + this.len) % this.len; else s = Math.min(Math.max(s, 0), this.len - .01);
    let lo = 0, hi = this.c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.c[m] <= s) lo = m; else hi = m; }
    const a = this.p[lo], b = this.p[hi % this.p.length], k = (s - this.c[lo]) / Math.max(this.c[hi] - this.c[lo], 1e-6);
    pos.lerpVectors(a, b, k); dir.subVectors(b, a).normalize();
  }
}
// 圆角矩形环（顺时针：上边向东），r = [左上, 右上, 右下, 左下]；lane > 0 向行驶方向右侧偏移
function rectLoop(x0, x1, z0, z1, r, cw, lane, y) {
  const P = [], V = (x, z) => new THREE.Vector3(x, y, z);
  const line = (ax, az, bx, bz) => { const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 14)); for (let i = 0; i < n; i++) P.push(V(ax + (bx - ax) * i / n, az + (bz - az) * i / n)); };
  const arc = (cx, cz, rr, a0, a1) => { const n = Math.max(4, Math.ceil(rr * Math.abs(a1 - a0) / 10)); for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; P.push(V(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr)); } };
  const [r0, r1, r2, r3] = r;
  line(x0 + r0, z0, x1 - r1, z0); arc(x1 - r1, z0 + r1, r1, -Math.PI / 2, 0);
  line(x1, z0 + r1, x1, z1 - r2); arc(x1 - r2, z1 - r2, r2, 0, Math.PI / 2);
  line(x1 - r2, z1, x0 + r3, z1); arc(x0 + r3, z1 - r3, r3, Math.PI / 2, Math.PI);
  line(x0, z1 - r3, x0, z0 + r0); arc(x0 + r0, z0 + r0, r0, Math.PI, Math.PI * 1.5);
  if (!cw) P.reverse();
  return new Path(offset(P, lane, true), true);
}
function offset(P, lane, closed) {
  return P.map((p, i) => {
    const a = P[i === 0 ? (closed ? P.length - 1 : 0) : i - 1], b = P[i === P.length - 1 ? (closed ? 0 : i) : i + 1];
    const d = new THREE.Vector3().subVectors(b, a); d.y = 0; d.normalize();
    return new THREE.Vector3(p.x - d.z * lane, p.y, p.z + d.x * lane);
  });
}

// ---------- 布局 ----------
const PER = { x0: -1180, x1: 1180, z0: -560, z1: 600, r: 150, w: 100 };
const AVE = { z: 20, w: 110, x0: -3600, x1: 1760 };
// 路网：环岛路四角半径各不相同；最西边一条小河贯穿南北；前后两排各有两条横街，而且错位（不对齐），
// 所以每排的列宽都不一样——街区由"小河 + 本排横街"切出来，芯片那列最宽
const PER_R = [150, 230, 130, 210];                              // 环岛路四角半径：西北、东北、东南、西南
const CANAL = { x: -690, w: 70 };
const CW_ = 80;
const CROSS_B = [-150, 620], CROSS_F = [-230, 480];               // 后排（北）/ 前排（南）的横街 x
const CROSS = [...CROSS_B, ...CROSS_F];
const colsOf = streets => { const e = [-1120, CANAL.x - 60, CANAL.x + 60, ...streets.flatMap(x => [x - 60, x + 60]), 1120]; const out = []; for (let i = 0; i < e.length; i += 2) out.push({ cx: (e[i] + e[i + 1]) / 2, w: e[i + 1] - e[i] }); return out; };
const COLS_B = colsOf(CROSS_B), COLS_F = colsOf(CROSS_F), ROWS = [-272, 312];
const BLOCKS = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [2, 1], [1, 1], [0, 1]].map(([c, r]) => { const col = (r === 0 ? COLS_B : COLS_F)[c]; return { cx: col.cx, cz: ROWS[r], w: col.w, back: r === 0, side: c < 2 ? -1 : 1 }; });
const BW = 470, BD = 455, PAD = 240;   // BW 只是默认值，街区实际宽度用 B.w
const BRIDGE0 = -1450;
const roadY = x => x > BRIDGE0 ? G + .8 : G + .8 + 160 * Math.sin(Math.PI * Math.min((BRIDGE0 - x) / (BRIDGE0 - AVE.x0 - 150), 1));

// ---------- 合并静态几何：同一材质合成一个网格 ----------
function bake(root, scene) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    Object.keys(g.attributes).forEach(k => { if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); });
    g.morphAttributes = {};
    if (!groups.has(o.material)) groups.set(o.material, { list: [], cast: false });
    const e = groups.get(o.material); e.list.push(g); e.cast = e.cast || o.castShadow;
  });
  groups.forEach((e, m) => {
    const mesh = new THREE.Mesh(mergeGeometries(e.list), m);
    mesh.receiveShadow = true; mesh.castShadow = e.cast; scene.add(mesh);
  });
}

// ====================================================================
let TOWN_SINGLETON = null;
function getTown() {
  if (TOWN_SINGLETON) return TOWN_SINGLETON;
  const scene = new THREE.Scene();
  const FOG = '#e6f2ff';
  scene.fog = new THREE.Fog(FOG, 5200, 11000);
  const hemi = new THREE.HemisphereLight('#ffffff', '#cfe6ff', .95); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fffaf2', 1.7); sun.position.set(-1100, 1900, 1000);
  const Q = window.Q || { dpr: 2, shadows: true, shadowMap: 4096, density: 1, water: 1, tick() {}, onChange() {} };
  sun.castShadow = Q.shadows; sun.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
  Object.assign(sun.shadow.camera, { left: -2300, right: 2300, top: 1500, bottom: -1500, near: 100, far: 5200 }); sun.shadow.bias = -.0005; sun.shadow.radius = 4;
  scene.add(sun);
  const S = new THREE.Group();     // 静态道具，最后统一合并
  const pickables = [];            // 可点击的东西：{ obj, info() }
  const flags = [], cranes = [];   // 楼顶旗、塔吊（每帧动）
  // 静态且可点的道具：几何并进 S 合并绘制，另放一个隐形盒子（按包围盒）给射线拾取；Raycaster 不看 visible，所以能点中
  const PROXY_M = new THREE.MeshBasicMaterial({ visible: false });
  const proxyOf = obj => { obj.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(obj), sz = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sz.x, 8), Math.max(sz.y, 8), Math.max(sz.z, 8)), PROXY_M); m.position.copy(c); m.visible = false; scene.add(m); return m; };
  const staticPick = (obj, info) => { S.add(obj); pickables.push({ obj: proxyOf(obj), info }); };
  let padState = { next: 0, launching: false };
  // 天气：跟着当天的大盘情绪（偏乐观 = 晴，中性 = 多云，偏谨慎 = 阴雨）；规则固定在这里
  const WX = { sunny: { sun: 1, hemi: 1, fogN: 5200, fogF: 11000, gray: 0, cloud: .55 }, cloudy: { sun: .74, hemi: .92, fogN: 4300, fogF: 9600, gray: .35, cloud: .85 }, rain: { sun: .5, hemi: .8, fogN: 3400, fogF: 8200, gray: .6, cloud: 1 } };
  const MOOD_WX = { '偏乐观': 'sunny', '中性': 'cloudy', '偏谨慎': 'rain' };

  // ---------- 岛与潮水 ----------
  const shape = new THREE.Shape(), N = 80;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const x = Math.sign(c) * Math.pow(Math.abs(c), .45) * RX, z = Math.sign(s) * Math.pow(Math.abs(s), .45) * RZ; i ? shape.lineTo(x, z) : shape.moveTo(x, z); }
  const ext = (depth, bev, size) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: size, bevelSegments: 6, curveSegments: 80 }).rotateX(Math.PI / 2);
  const island = new THREE.Mesh(ext(110, 24, 24), [M('#e4f4e6', { roughness: .85 }), M('#d9d4fb', { roughness: .7 })]); island.receiveShadow = true; scene.add(island);
  const sand = new THREE.Mesh(ext(60, 14, 75), M('#fbefd6', { roughness: .95 })); sand.position.y = -46; sand.receiveShadow = true; scene.add(sand);
  scene.add(at(new THREE.Mesh(ext(260, 10, 100), M('#e8dcc4', { roughness: .95 })), 0, -120, 0));
  const waterGeo = new THREE.PlaneGeometry(16000, 11000, Math.round(260 * Q.water), Math.round(180 * Q.water)); waterGeo.rotateX(-Math.PI / 2);
  const uni = {
    uTime: { value: 0 }, uTide: { value: 0 }, uSun: { value: new THREE.Vector3(-.45, .8, .4).normalize() },
    uShallow: { value: new THREE.Color('#a6ecef') }, uMid: { value: new THREE.Color('#8fd2f6') }, uDeep: { value: new THREE.Color('#78b4ef') },
    uFoam: { value: new THREE.Color('#ffffff') }, uSky: { value: new THREE.Color('#eaf6ff') }, uFog: { value: new THREE.Color(FOG) },
  };
  const WATER_Y = -62;
  scene.add(at(new THREE.Mesh(waterGeo, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: waterVS, fragmentShader: waterFS })), 0, WATER_Y, 0));

  // ---------- 道路 ----------
  const roadM = M('#dcdfeb', { roughness: .9 }), lineM = M('#ffffff', { roughness: .6 }), curbM = M('#cfd2e2');
  const flat = (w, d, m, x, z, y) => at(box(w, 1.2, d, m, 0), x, y == null ? G + .6 : y, z);
  const { x0, x1, z0, z1, w } = PER, [r0, r1, r2, r3] = PER_R;
  S.add(flat(x1 - x0 - r0 - r1, w, roadM, (x0 + r0 + x1 - r1) / 2, z0)); S.add(flat(x1 - x0 - r2 - r3, w, roadM, (x0 + r3 + x1 - r2) / 2, z1));
  S.add(flat(w, z1 - z0 - r0 - r3, roadM, x0, (z0 + r0 + z1 - r3) / 2)); S.add(flat(w, z1 - z0 - r1 - r2, roadM, x1, (z0 + r1 + z1 - r2) / 2));
  [[x0 + r0, z0 + r0, Math.PI / 2, r0], [x1 - r1, z0 + r1, 0, r1], [x1 - r2, z1 - r2, -Math.PI / 2, r2], [x0 + r3, z1 - r3, Math.PI, r3]].forEach(([cx, cz, a, rr]) => {
    const g = new THREE.RingGeometry(rr - w / 2, rr + w / 2, 28, 1, a, Math.PI / 2); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, roadM); at(m, cx, G + 1.2, cz); S.add(m);
  });
  S.add(flat(x1 - x0 + w, AVE.w, roadM, 0, AVE.z));                                       // 中央大道（岛上部分）
  S.add(flat(x0 - 50 - BRIDGE0 + 40, AVE.w, roadM, (x0 - 50 + BRIDGE0) / 2 - 20, AVE.z));  // 环岛路到桥头
  S.add(flat(1420 - x1, AVE.w, roadM, (1420 + x1) / 2, AVE.z));                           // 环岛路到码头
  CROSS_B.forEach(cx => S.add(flat(CW_, AVE.z - z0 + 20, roadM, cx, (z0 + AVE.z) / 2 - 10)));   // 后排横街：北环岛路 → 大道
  CROSS_F.forEach(cx => S.add(flat(CW_, z1 - AVE.z + 20, roadM, cx, (z1 + AVE.z) / 2 + 10)));   // 前排横街：大道 → 南环岛路
  // 车道虚线
  const dashes = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 55); for (let i = 0; i < n; i++) { const k = (i + .5) / n, h = Math.abs(bx - ax) > Math.abs(bz - az); S.add(flat(h ? 24 : 3, h ? 3 : 24, lineM, ax + (bx - ax) * k, az + (bz - az) * k, G + 1.4)); } };
  dashes(x0 + r0, z0, x1 - r1, z0); dashes(x0 + r3, z1, x1 - r2, z1); dashes(x0, z0 + r0, x0, z1 - r3); dashes(x1, z0 + r1, x1, z1 - r2);
  dashes(x0 + 60, AVE.z, x1 - 60, AVE.z); CROSS_B.forEach(cx => dashes(cx, z0 + 60, cx, AVE.z - 70)); CROSS_F.forEach(cx => dashes(cx, AVE.z + 70, cx, z1 - 60));
  // 斑马线
  const zebra = (cx, cz, alongX, n) => { for (let i = 0; i < n; i++) S.add(flat(alongX ? 5 : 30, alongX ? 30 : 5, lineM, cx + (alongX ? (i - n / 2) * 10 : 0), cz + (alongX ? 0 : (i - n / 2) * 10), G + 1.45)); };
  CROSS_B.forEach(cx => { zebra(cx, AVE.z - 72, true, 8); zebra(cx, z0 + 64, true, 8); }); CROSS_F.forEach(cx => { zebra(cx, AVE.z + 72, true, 8); zebra(cx, z1 - 64, true, 8); });

  // ---------- 小河：从北岸流到南岸，替代最西边的横街；三座桥让环岛路和大道跨过去 ----------
  {
    const waterM = new THREE.MeshStandardMaterial({ color: '#9fdcf3', roughness: .12, metalness: .05, transparent: true, opacity: .92 });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(CANAL.w, 1800, 1, 1).rotateX(-Math.PI / 2), waterM); at(strip, CANAL.x, G + .6, 0); scene.add(strip);   // 水面略低于路面，桥面压在上面
    const bankM = M('#fbefd6', { roughness: .95 });
    [-1, 1].forEach(sd => S.add(at(box(10, 5, 1800, bankM, .2), CANAL.x + sd * (CANAL.w / 2 + 4), G + 2.5, 0)));
    // 河里几块石头和两只小船（静态）
    for (let k = 0; k < 7; k++) S.add(at(sph(6 + (k % 3) * 2, M('#cfd2e2', { roughness: 1 }), 8), CANAL.x + ((k * 37) % 40 - 20), G + 2, -700 + k * 230 + (k % 2) * 60));
    [[-420, .3], [380, -.4]].forEach(([z, ry]) => { const b = box(30, 7, 12, M('#ff6b2c'), .3); b.rotation.y = ry; at(b, CANAL.x + 8, G + 5, z); S.add(b); });
    // 桥：桥面略高于路面，两侧矮栏杆
    [z0, AVE.z, z1].forEach((bz, k) => {
      const bw = k === 1 ? AVE.w + 24 : w + 24;
      S.add(at(box(CANAL.w + 40, 1.4, bw, M('#ffffff'), .08), CANAL.x, G + .55, bz));   // 桥面和路面齐平，车不会陷进去
      [-1, 1].forEach(sd => { S.add(at(box(CANAL.w + 40, 9, 4, M('#5b4cff'), .3), CANAL.x, G + 5.5, bz + sd * (bw / 2 - 2))); });
    });
    // 岸边：树与长椅
    for (let k = 0; k < 10; k++) { const t = T_.buildTreeSmall(k + 3); t.scale.setScalar(1.1 + (k % 3) * .15); at(t, CANAL.x + (k % 2 ? 58 : -58), G + 5, -760 + k * 165 + ((k * 7) % 5) * 9); S.add(t); }
    [[-160, 1], [250, -1]].forEach(([z, sd]) => { const bn = T_.buildBench(); bn.rotation.y = sd > 0 ? -Math.PI / 2 : Math.PI / 2; at(bn, CANAL.x + sd * 52, G + 5, z); S.add(bn); });
  }

  // ---------- 街区底板、站点、仓库、工人 ----------
  const stations = [], chimneys = [], forklifts = [], workers = [], arms = [];
  CL.layers.forEach((L, i) => {
    const B = BLOCKS[i], { cx, cz, back, side } = B, toAve = back ? 1 : -1;
    const hw = B.w / 2, sx = Math.min(175, hw - 60), ex = Math.min(160, hw - 50);   // 仓库 / 机械臂离中心的距离按街区宽度收缩
    S.add(at(box(B.w, 5, BD, M(mix(L.color, W, .9), { roughness: .8 }), .02 + (i % 3) * .03), cx, G + 2.5, cz));   // 转角圆度各不相同
    S.add(at(box(B.w + 8, 3, BD + 8, curbM, 0), cx, G + 1.5, cz));
    // 站点（底座高度 = 热度）
    const grp = new THREE.Group(); at(grp, cx, G + 5, cz); scene.add(grp);
    const podMat = new THREE.MeshStandardMaterial({ color: mix(L.color, W, .78), roughness: .55, envMapIntensity: .55 });
    const pod = new THREE.Mesh(new RoundedBoxGeometry(PAD, 100, PAD, 4, 16), podMat); pod.castShadow = pod.receiveShadow = true; grp.add(pod);
    const st = STATIONS[L.id](L.color);
    st.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const sz = new THREE.Box3().setFromObject(st.group).getSize(new THREE.Vector3());
    st.group.scale.multiplyScalar(Math.min(195 / Math.max(sz.x, sz.z, 1), 1.2)); grp.add(st.group);
    const modelH = new THREE.Box3().setFromObject(st.group).getSize(new THREE.Vector3()).y;
    const coins = L.members.slice().sort((a, b) => b.cap - a.cap).slice(0, 3).map(c => { const cg = buildCoin(c, L.color, 24); grp.add(cg); return cg; });
    stations.push({ L, i, grp, pod, podMat, st, coins, modelH, h: 0, hv: 0, ht: 0, lift: 0, lv: 0, lt: 0 });
    // 仓库（门朝大道），烟囱
    const wh = T_.buildWarehouse(L.color); wh.scale.setScalar(.85); wh.rotation.y = back ? 0 : Math.PI; at(wh, cx + side * sx, G + 5, cz); S.add(wh);
    const ch = wh.userData.chimney.clone().multiplyScalar(.85).applyAxisAngle(new THREE.Vector3(0, 1, 0), wh.rotation.y).add(wh.position);
    // 屋顶广告牌：这一环节今天成交最热的公司（广告牌有贴图，不参与合并）
    const hot = L.members.slice().sort((a, b) => b.vx[6] - a.vx[6])[0];
    const bb = T_.buildBillboard(T_.hotStockTexture(hot, L), 150, 75, 30); at(bb, cx + side * sx, G + 55, cz + 6);
    staticPick(bb, () => ({ kind: 'board', title: `${hot.t} ${hot.name}`, sub: `${L.name} · 今日成交最热 · 量 ${hot.vx[6].toFixed(1)}x · ${hot.chg[6] >= 0 ? '+' : '−'}${Math.abs(hot.chg[6]).toFixed(2)}%`, go: hot.t, L }));
    chimneys.push({ p: ch, puffs: Array.from({ length: 5 }, (_, k) => { const m = sph(10, M('#ffffff', { roughness: 1, transparent: true, opacity: .8 }), 10); scene.add(m); return { m, ph: k / 5 }; }) });
    // 货堆（大道边）与叉车
    const pileZ = cz + toAve * 200, fx = cx + side * sx;
    const pile = T_.buildCrates(5, L.color); at(pile, fx + side * 36, G + 5, pileZ); S.add(pile);
    const fk = T_.buildForklift(); fk.group.rotation.y = back ? -Math.PI / 2 : Math.PI / 2; scene.add(fk.group);
    pickables.push({ obj: fk.group, info: () => ({ kind: 'fork', title: `${L.name}街区的叉车`, sub: '把仓库里的货搬到路边，等卡车来运走', L }) });
    forklifts.push({ v: fk, x: fx, za: cz + toAve * 52, zb: pileZ - toAve * 4, ph: i * .13 });
    // 工人（在站点前干活）、机器人臂
    [[-side * ex, toAve * 150], [-side * Math.min(60, hw - 110), toAve * 150]].forEach(([dx, dz], k) => {
      const p = T_.buildPerson(i * 3 + k, { vest: true, helmet: true }); at(p.group, cx + dx, G + 5, cz + dz);
      p.group.lookAt(cx, G + 5, cz); p.group.rotateY(-Math.PI / 2); scene.add(p.group); workers.push(p);
      pickables.push({ obj: p.group, info: () => ({ kind: 'worker', title: `${L.name}街区的工人`, sub: `今天这个环节期权热度 ${L.heat[6].toFixed(1)}x，${L.heat[6] >= 1.5 ? '开足马力' : '正常开工'}`, L }) });
    });
    if ([2, 4, 5].includes(i)) { const a = T_.buildRobotArm(L.color); at(a.group, cx - side * ex, G + 5, cz - toAve * 160); a.group.scale.setScalar(1.2); scene.add(a.group); arms.push(a); pickables.push({ obj: a.group, info: () => ({ kind: 'arm', title: `${L.name}街区的机械臂`, sub: '自动化产线，24 小时不停', L }) }); }
    // 公司楼：沿街区远离大道的那条边，按子链分组排成一排；每组前立一块地块牌；楼顶按当日期权信号升旗（绿多 / 红空），楼前按研报调整立目标价牌
    const groups = Object.entries(L.segs).map(([seg, list]) => ({ seg, ms: list.split(' ').filter(Boolean).map(t => CL.byT[t]).filter(Boolean).sort((a, b) => b.cap - a.cap) }));
    const towerZ = cz - toAve * (BD / 2 - 40), span = B.w - 90, MAXT = 7;
    const drawn = groups.map(g => ({ ...g, ms: g.ms.slice(0, Math.min(g.ms.length, Math.max(1, Math.round(MAXT * g.ms.length / Math.max(1, L.members.length))))) }));
    const slots = []; drawn.forEach(g => { slots.push({ sign: g }); g.ms.forEach(c => slots.push({ c, g })); });   // 每组：一块牌 + 它的楼；空子链只有牌（留地块）
    const unit = span / Math.max(slots.length - 1, 1), tscale = slots.length > 9 ? .74 : slots.length > 7 ? .84 : 1;
    slots.forEach((sl, k) => {
      const x = cx - span / 2 + k * unit;
      if (sl.sign) {
        const g = sl.sign, sub = g.ms.length ? `${g.ms.length} 家 · 热度 ${L.heat[6].toFixed(1)}x` : '新子链 · 名单待补';
        const ps = T_.buildPlotSign(g.seg, sub, L.color); ps.rotation.y = back ? 0 : Math.PI; ps.scale.setScalar(.78); at(ps, x, G + 5, towerZ + toAve * 22);
        staticPick(ps, () => ({ kind: 'plot', title: `${L.name} · ${g.seg}`, sub: g.ms.length ? `这块地上有 ${g.ms.length} 家：${g.ms.map(c => c.t).join('、')}` : '还没有上市公司，先留着地块', L }));
        return;
      }
      const c = sl.c, h = 24 + Math.min(Math.sqrt(c.cap) * 2.2, 92);
      const tw = T_.buildTower(c, L.color, h); tw.rotation.y = back ? 0 : Math.PI; tw.scale.setScalar(tscale);
      at(tw, x, G + 5, towerZ); c.towerPos = tw.position.clone();
      const sigTxt = c.signals.length ? ' · 今日有' + c.signals.map(k => ({ o: '期权信号', r: '研报调整', n: '新闻' })[k]).join('、') : '';
      staticPick(tw, () => ({ kind: 'tower', title: `${c.t} ${c.name}`, sub: `${L.name} · ${c.seg} · 今日 ${c.chg[6] >= 0 ? '+' : '−'}${Math.abs(c.chg[6]).toFixed(2)}%${sigTxt} · 点击打开公司档案`, go: c.t, L }));
      if (c.signals.includes('o')) { const f = T_.buildFlag(c.chg[6] >= 0 ? '#0fb57b' : '#e8364a'); f.group.scale.setScalar(tscale); at(f.group, x - 14 * tscale, G + 5 + (h + 22) * tscale, towerZ); scene.add(f.group); flags.push({ f, ph: k }); }
      if (c.signals.includes('r')) { const sg = T_.buildTargetSign(c.chg[6] >= 0); sg.rotation.y = back ? 0 : Math.PI; sg.scale.setScalar(tscale); at(sg, x + 28 * tscale, G + 5, towerZ + toAve * 34); S.add(sg); }
    });
    // 模型与云街区：未上市实验室的在建工地（塔吊慢慢转、吊钩上下）
    if (L.id === 'cloud') {
      const names = CL.unlisted.filter(u => u.layer === 'cloud').map(u => u.name);
      const cr = T_.buildCrane('#f5a314'); cr.group.scale.setScalar(.72); at(cr.group, cx - side * ex, G + 5, cz - toAve * 150); scene.add(cr.group); cranes.push({ cr, ph: 1.3 });
      const fe = T_.buildFence(names, L.color); fe.rotation.y = back ? Math.PI : 0; fe.scale.setScalar(.8); at(fe, cx - side * ex, G + 5, cz - toAve * 92); S.add(fe);
      pickables.push({ obj: cr.group, info: () => ({ kind: 'site', title: '未上市实验室 · 在建', sub: `${names.join('、')}：还没上市，没有期权与研报数据；上市后这里会换成公司楼`, L }) });
    }
    // 行道树、长椅
    for (let k = 0; k < 5; k++) { const t = T_.buildTreeSmall(i + k); at(t, cx - hw + 40 + k * ((B.w - 80) / 4) + ((i * 7 + k * 5) % 11 - 5), G + 5, cz + toAve * (BD / 2 - 14 - (k % 2) * 6)); t.scale.setScalar(1.3); S.add(t); } // 大道这一侧的行道树
    for (let k = 0; k < 3; k++) { const t = T_.buildTreeSmall(i + k + 2); at(t, cx - side * (hw - 16), G + 5, cz - 120 + k * 120 + ((i + k) % 3 - 1) * 14); t.scale.setScalar(1.2); S.add(t); }
    const bench = T_.buildBench(); at(bench, cx, G + 5, cz + toAve * (BD / 2 - 32)); bench.rotation.y = back ? Math.PI : 0; S.add(bench);
  });
  // 外圈绿地：大树
  const big = [];
  for (let i = 0; i < 46; i++) {
    const a = i / 46 * Math.PI * 2 + (i % 3) * .03, c = Math.cos(a), s = Math.sin(a), k = .9 + (i % 4) * .015;
    const x = Math.sign(c) * Math.pow(Math.abs(c), .45) * RX * k, z = Math.sign(s) * Math.pow(Math.abs(s), .45) * RZ * k;
    if (Math.abs(z - AVE.z) < 120 && Math.abs(x) > 1000) continue;
    if (Math.abs(x) < x1 + 70 && Math.abs(z - (z0 + z1) / 2) < (z1 - z0) / 2 + 70) continue;
    const t = T_.buildTreeSmall(i); t.scale.setScalar(2 + (i % 3) * .4); at(t, x, G, z); S.add(t); big.push(t);
  }
  // 路灯
  const lampSpots = [];
  for (let x = -1080; x <= 1080; x += 180) [-1, 1].forEach(s => { const l = T_.buildStreetLight(); l.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; at(l, x, G + 5, AVE.z + s * 66); S.add(l); lampSpots.push([x, AVE.z + s * 53]); });
  // 路灯光晕（夜里才显示）：合成一个网格，保留 uv
  scene.add(new THREE.Mesh(mergeGeometries(lampSpots.map(([x, z]) => new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2).translate(x, G + 5.4, z))), T_.NIGHT.pool));

  // ---------- 红绿灯（大道上的三个路口）：东西向与南北向轮流放行 ----------
  // 路口表：后排两条横街和前排两条横街各自与大道交汇（T 字路口）；红绿灯仍按东西 / 南北轮流放行
  const SIGNALS = CROSS.map(ix => {
    const heads = [];
    // [角落 x, 角落 z, 朝向（弧度）, 管的是东西向还是南北向]
    [[-50, 70, Math.PI, 'ew'], [50, -70, 0, 'ew'], [-50, -70, Math.PI / 2, 'ns'], [50, 70, -Math.PI / 2, 'ns']].forEach(([dx, dz, ry, axis]) => {
      const t = T_.buildTrafficLight(); t.group.rotation.y = ry; at(t.group, ix + dx, G + 5, AVE.z + dz); scene.add(t.group); heads.push({ lamps: t.lamps, axis });
    });
    return { ix, iz: AVE.z, heads };
  });
  const CYCLE = 26, PH = [[0, 11, 'ew', 'g'], [11, 13, 'ew', 'y'], [13, 24, 'ns', 'g'], [24, 26, 'ns', 'y']];
  const sig = { ew: 'r', ns: 'r', idx: -1, nsStart: false };
  function signalPhase(T) {
    const k = T % CYCLE; let idx = 0; for (let i = 0; i < PH.length; i++) if (k >= PH[i][0] && k < PH[i][1]) idx = i;
    sig.ew = PH[idx][2] === 'ew' ? PH[idx][3] : 'r'; sig.ns = PH[idx][2] === 'ns' ? PH[idx][3] : 'r';
    sig.nsStart = idx === 2 && sig.idx !== 2;
    if (idx !== sig.idx) { sig.idx = idx; SIGNALS.forEach(S_ => S_.heads.forEach(h => { const st = sig[h.axis]; h.lamps[0].material = T_.SIG[st === 'r' ? 'ron' : 'roff']; h.lamps[1].material = T_.SIG[st === 'y' ? 'yon' : 'yoff']; h.lamps[2].material = T_.SIG[st === 'g' ? 'gon' : 'goff']; })); }
  }
  // 过马路的行人：在斑马线等南北向绿灯
  const crossers = [];
  CROSS.forEach((ix, i) => [-1, 1].forEach((sd, k) => {
    const p = T_.buildPerson(40 + i * 2 + k); scene.add(p.group);
    crossers.push({ o: p, x: ix + sd * 34, dir: sd, p: k ? 1 : 0, moving: false });
  }));

  // ---------- 跨海大桥（西） ----------
  const deckM = M('#ffffff'), pierM = M('#d9d4fb');
  for (let x = BRIDGE0 + 30; x > AVE.x0 - 40; x -= 40) {
    const y0 = roadY(x), y1 = roadY(x - 40), m = box(42, 10, AVE.w + 10, deckM, 0);
    m.rotation.z = Math.atan2(y0 - y1, 40); at(m, x - 20, (y0 + y1) / 2 - 5, AVE.z); S.add(m);
    [-1, 1].forEach(s => { const rl = box(42, 6, 3, M('#5b4cff'), 0); rl.rotation.z = m.rotation.z; at(rl, x - 20, (y0 + y1) / 2 + 4, AVE.z + s * (AVE.w / 2 + 4)); S.add(rl); });
  }
  for (let x = BRIDGE0 - 120; x > AVE.x0; x -= 240) { const y = roadY(x) - 10; S.add(at(box(26, y - WATER_Y + 40, 70, pierM, .1), x, (y + WATER_Y - 40) / 2, AVE.z)); }

  // ---------- 港口（东）：码头、集装箱堆场、岸桥、靠港货船 ----------
  S.add(at(box(380, 22, 360, M('#eef0f7'), .03), 1600, G - 9, 90));
  for (let x = 1440; x <= 1780; x += 85) for (let z = -60; z <= 250; z += 100) S.add(at(cyl(9, 9, 120, pierM, 10), x, G - 70, z));
  const yard = T_.buildContainerStack(4, 3, 3, ['#1296f0', '#ff6b2c', '#00a8c6', '#a04cf5', '#f5a314', '#5b4cff']); at(yard, 1430, G + 2, 130); S.add(yard);
  const dockWh = T_.buildWarehouse('#5b4cff'); dockWh.rotation.y = -Math.PI / 2; at(dockWh, 1740, G + 2, AVE.z); S.add(dockWh);
  const gantry = T_.buildGantry(); at(gantry.group, 1640, G + 2, 120); scene.add(gantry.group);
  const docked = buildShip(); docked.scale.setScalar(1.25); at(docked, 1630, WATER_Y + 8, 330); scene.add(docked);
  pickables.push({ obj: gantry.group, info: () => ({ kind: 'port', title: '港口岸桥', sub: '把 8 个环节的成品装上货船，运往全世界' }) });
  pickables.push({ obj: docked, info: () => ({ kind: 'port', title: '靠港货船', sub: '集装箱是 8 层产业链的颜色，装满就出发' }) });

  // ---------- 发射场（东南半岛）：SpaceX 未上市，只有火箭和倒计时，没有数据 ----------
  const pierSE = box(64, 10, 460, M('#eef0f7'), .02); pierSE.rotation.y = -Math.atan2(230, 390); at(pierSE, 885, G - 8, 1035); S.add(pierSE);
  for (let k = 0; k <= 5; k++) { const t = k / 5; S.add(at(cyl(9, 9, 120, pierM, 10), 770 + 230 * t, G - 70, 840 + 390 * t)); }
  const pad = T_.buildRocketPad(); at(pad.group, 1000, G - 4, 1230); scene.add(pad.group);
  pickables.push({ obj: pad.rocket, info: () => ({ kind: 'rocket', title: 'SpaceX 试射 · 发射场', sub: `太空与卫星通信 · 未上市，没有期权与研报数据 · ${padState.launching ? '正在升空' : '下次点火 ' + padState.next + ' 秒后'}` }) });
  pickables.push({ obj: pad.sign, info: () => ({ kind: 'rocket', title: '发射场 · 太空', sub: '应用与端侧的延伸：未来有上市公司时会在这里给地块' }) });

  // ---------- 园区平台（西南半岛）：AI 医疗园区 + 机器人试验场；救护车绕医院、机器人绕跑道、无人机送药 ----------
  const pierSW = box(64, 10, 460, M('#eef0f7'), .02); pierSW.rotation.y = Math.atan2(230, 390); at(pierSW, -885, G - 8, 1035); S.add(pierSW);
  for (let k = 0; k <= 5; k++) { const t = k / 5; S.add(at(cyl(9, 9, 120, pierM, 10), -770 - 230 * t, G - 70, 840 + 390 * t)); }
  const CAMP = { x: -1000, z: 1230 };
  const campus = T_.buildCampus(); at(campus.group, CAMP.x, G - 4, CAMP.z); S.add(campus.group);
  pickables.push({ obj: proxyOf(campus.hospital), info: () => ({ kind: 'med', title: 'AI 医疗园区', sub: '影像 AI、手术机器人、AI 制药：应用与端侧的延伸；上市公司名单待补，先留地块' }) });
  pickables.push({ obj: proxyOf(campus.sign), info: () => ({ kind: 'track', title: '机器人试验场', sub: '端侧 / 机器人子链的试验场：两台两足机器人在绕圈，看台上没人打分' }) });
  const drone = T_.buildDrone(); scene.add(drone.group);
  pickables.push({ obj: drone.group, info: () => ({ kind: 'drone', title: '送药无人机', sub: '从医院楼顶起飞，绕园区一圈再回来' }) });

  // ---------- 北面山坡：缓坡上三台风机（能源的延伸）；港口广场：潮信钟楼（15:40）+ 喷泉 ----------
  const MOUND = { x: 150, z: -770, sx: 560, sy: 90, sz: 120 };
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), M('#dcefd9', { roughness: .95 })); mound.scale.set(MOUND.sx, MOUND.sy, MOUND.sz); at(mound, MOUND.x, G - 30, MOUND.z); mound.receiveShadow = true; S.add(mound);
  const moundY = (x, z) => { const dx = (x - MOUND.x) / MOUND.sx, dz = (z - MOUND.z) / MOUND.sz; return G - 30 + MOUND.sy * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz)); };
  const turbines = [-180, 150, 470].map((x, k) => { const t = T_.buildTurbine(); t.group.scale.setScalar(.8); t.group.rotation.y = -.4 + k * .2; at(t.group, x, moundY(x, MOUND.z) - 2, MOUND.z); scene.add(t.group);
    pickables.push({ obj: t.group, info: () => ({ kind: 'turbine', title: '山坡上的风机', sub: '能源街区的延伸：给镇上的数据中心供电（示意）' }) }); return { t, ph: k * 2.1 }; });
  for (let k = 0; k < 6; k++) { const x = MOUND.x - 480 + k * 190, z = MOUND.z + 60 + (k % 2) * 30; const tr = T_.buildTreeSmall(k + 11); tr.scale.setScalar(1.6); at(tr, x, moundY(x, z) - 4, z); S.add(tr); }
  const PLAZA = { x: 1310, z: 240 };
  const plate = new THREE.Mesh(new THREE.CircleGeometry(105, 48).rotateX(-Math.PI / 2), M('#eef0f7', { roughness: .9 })); at(plate, PLAZA.x, G + 2.2, PLAZA.z); S.add(plate);
  const plateRim = new THREE.Mesh(new THREE.RingGeometry(103, 109, 48).rotateX(-Math.PI / 2), M('#cfd2e2')); at(plateRim, PLAZA.x, G + 2.4, PLAZA.z); S.add(plateRim);
  const clock = T_.buildClockTower(); clock.scale.setScalar(.85); at(clock, PLAZA.x + 40, G + 2.4, PLAZA.z + 30);
  staticPick(clock, () => ({ kind: 'clock', title: '潮信钟楼 · 15:40', sub: '表针停在 15:40——每个交易日这个时候，期权日报送到你的邮箱' }));
  const fountain = T_.buildFountain(); at(fountain.group, PLAZA.x - 45, G + 2.4, PLAZA.z - 30); scene.add(fountain.group);
  pickables.push({ obj: fountain.group, info: () => ({ kind: 'fountain', title: '港口广场的喷泉', sub: '下班后大家在这里等巴士、看市场大屏' }) });
  [[-70, 70, .9], [60, -70, -2.3], [-30, 95, 0]].forEach(([dx, dz, ry]) => { const bn = T_.buildBench(); bn.rotation.y = ry; at(bn, PLAZA.x + dx, G + 2.4, PLAZA.z + dz); S.add(bn); });
  for (let k = 0; k < 5; k++) { const a_ = k / 5 * Math.PI * 2 + .3; const tr = T_.buildTreeSmall(k + 20); tr.scale.setScalar(1.25); at(tr, PLAZA.x + Math.cos(a_) * 92, G + 2.4, PLAZA.z + Math.sin(a_) * 92); S.add(tr); }

  // ---------- 电力：电塔与电线 ----------
  const pyl = [[-330, -130], [-330, 140], [60, 140], [760, 140]].map(([x, z]) => { const p = T_.buildPylon(); p.rotation.y = Math.PI / 2; at(p, x, G + 5, z); S.add(p); p.updateMatrixWorld(true); return p; });
  const tipsOf = p => p.userData.tips.map(t => t.clone().applyMatrix4(p.matrixWorld));
  const wireM = M('#8e91a7'), spans = [];
  for (let k = 0; k < pyl.length - 1; k++) {
    const a = tipsOf(pyl[k]), b = tipsOf(pyl[k + 1]);
    [0, 1].forEach(j => { const m = a[j].clone().lerp(b[j], .5); m.y -= 34; const cv = new THREE.QuadraticBezierCurve3(a[j], m, b[j]); S.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 24, 1.1, 5), wireM)); if (j === 0) spans.push(cv); });
  }
  const sparks = [];
  [1, 2, 3].forEach((n, r) => { for (let k = 0; k < 2; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#f5a314', emissiveIntensity: 1.8 })); scene.add(d); sparks.push({ d, n, t: k * .5 + r * .17 }); } });

  // ---------- 数据光流（网络 → 下游，云 → 应用） ----------
  const flows = [];
  function flow(a, b, height, color, n, speed) {
    const pa = stations[a].grp.position, pb = stations[b].grp.position;
    const A = new THREE.Vector3(pa.x, G + 170, pa.z), B = new THREE.Vector3(pb.x, G + 150, pb.z), Mm = A.clone().lerp(B, .5); Mm.y = height;
    const cv = new THREE.QuadraticBezierCurve3(A, Mm, B);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 48, 2.2, 8), new THREE.MeshStandardMaterial({ color: mix(color, W, .55), transparent: true, opacity: .45 })));
    const dots = Array.from({ length: n }, (_, k) => { const d = new THREE.Mesh(new THREE.SphereGeometry(5.5, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: color, emissiveIntensity: 1.6 })); scene.add(d); return { d, t: k / n }; });
    flows.push({ cv, dots, speed });
  }
  [4, 5, 6].forEach((b, k) => flow(3, b, 460 + k * 40, '#00a8c6', 3, .4));
  flow(6, 7, 420, '#1296f0', 3, .45);

  // ---------- 交通 ----------
  const PL = 33, IL = 13, AL = 36, Y = G + .8;
  const ave = (east) => { const pts = []; for (let x = AVE.x0; x <= AVE.x1; x += 20) pts.push(new THREE.Vector3(x, roadY(x), AVE.z)); if (!east) pts.reverse(); return new Path(offset(pts, AL, false), false); };
  const routes = [
    { path: rectLoop(x0, x1, z0, z1, PER_R, true, PL, Y), kinds: ['bus', 'truck', 'car', 'flat', 'car', 'van', 'truck'] },
    { path: rectLoop(x0, x1, z0, z1, PER_R, false, PL, Y), kinds: ['truck', 'car', 'flat', 'van', 'car', 'bus'] },
    { path: rectLoop(CROSS_B[0], CROSS_B[1], z0, AVE.z, [40, 40, 40, 40], true, IL, Y), kinds: ['flat', 'car', 'van'] },
    { path: rectLoop(CROSS_F[0], CROSS_F[1], AVE.z, z1, [40, 40, 40, 40], false, IL, Y), kinds: ['car', 'flat', 'van'] },
    { path: rectLoop(x0, CROSS_F[0], AVE.z, z1, [40, 40, 40, PER_R[3]], false, IL, Y), kinds: ['car', 'flat', 'car'] },
    { path: rectLoop(CROSS_B[1], x1, z0, AVE.z, [40, PER_R[1], 40, 40], true, IL, Y), kinds: ['van', 'car', 'flat'] },
    { path: ave(true), open: true, kinds: ['truck', 'car', 'truck', 'flat', 'van'] },
    { path: ave(false), open: true, kinds: ['truck', 'car', 'van', 'truck', 'car'] },
  ];
  const CARC = T_.SHIRT.slice(0, 9);
  const vehicles = [];
  let vid = 0;
  routes.forEach((R, ri) => R.kinds.slice(0, Math.max(1, Math.round(R.kinds.length * Q.density))).forEach((k, j) => {
    const col = CARC[(ri * 3 + j) % CARC.length];
    const v = k === 'bus' ? T_.buildBus(window.ARCHIVE && ARCHIVE.weeks ? `本周最热 ${ARCHIVE.weeks[ARCHIVE.weeks.length - 1].segs.slice(0, 3).map(x => x.n).join(' · ')}` : undefined) : k === 'truck' ? T_.buildTruck(CL.layers[(ri + j * 3) % 8].color) : k === 'van' ? T_.buildVan(col) : k === 'flat' ? T_.buildFlatbed(0) : T_.buildCar(col);
    scene.add(v.group);
    const cruise = k === 'bus' || k === 'truck' ? 62 : k === 'flat' ? 66 : 80;
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(110, 64), T_.NIGHT.beam); beam.rotation.x = -Math.PI / 2;
    const vlen = k === 'bus' ? 70 : k === 'truck' ? 66 : 44; beam.position.set(vlen / 2 + 52, 2.2, 0); v.group.add(beam);
    const rec = { id: vid++, v, R, s: R.path.len * j / R.kinds.length + (R.open ? 0 : ri * 37), sp: cruise * .5, cruise, kind: k, len: k === 'bus' ? 70 : k === 'truck' ? 66 : 44, pos: new THREE.Vector3(), dir: new THREE.Vector3(1, 0, 0), wait: 0, li: (ri + j * 3) % 8, cargoLi: 0 };
    vehicles.push(rec);
    pickables.push({ obj: v.group, info: () => {
      const L = CL.layers[k === 'flat' ? rec.cargoLi : rec.li];
      const CN = { raw: '矿石与金属锭', energy: '电力设备', chip: '芯片', net: '光模块与交换机', dc: '服务器', compute: 'GPU', cloud: '云服务', app: 'AI 应用' };
      if (k === 'bus') return { kind: 'bus', title: '潮信巴士', sub: '绕着小镇跑，车身上写着三个栏目：盘前汇总 · 期权日报 · 研报日报' };
      if (k === 'truck') return { kind: 'truck', title: `${L.name}的集装箱车`, sub: `${rec.R.open ? '从大桥开来，开进港口仓库' : '绕环岛路送货'} · 装着${CN[L.id]}`, L };
      if (k === 'flat') return { kind: 'flat', title: `平板车 · 正在${L.name}街区`, sub: `车斗里是${CN[L.id]}；每过一个街区，货物就"加工"成下一环节的样子`, L };
      const st = rec.sp < 4 ? (rec.wait > 1 ? '在等红灯' : '停着') : '正在行驶';
      return { kind: 'car', title: k === 'van' ? '厢式车' : '小汽车', sub: `${st} · 时速约 ${Math.round(rec.sp * 1.2)} 公里` };
    } });
  }));
  const nearestBlock = p => { let bi = 0, bd = 1e12; BLOCKS.forEach((b, i) => { const d = (b.cx - p.x) ** 2 + (b.cz - p.z) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };

  // ---------- 行人、机器人（街区人行道） ----------
  const walkers = [];
  // 园区：救护车绕医院一圈，两台机器人绕试验场跑道
  { const cy = G - 4 + 10 + .8, ax = CAMP.x - 110, az = CAMP.z - 40;
    const amb = T_.buildVan('#e8364a'); amb.group.add(at(box(10, 3, 6, M('#1296f0', { emissive: '#1296f0', emissiveIntensity: 1.2 }), .3), -4, 26, 0)); scene.add(amb.group);
    walkers.push({ o: amb, path: rectLoop(ax - 95, ax + 95, az - 75, az + 95, [30, 30, 30, 30], true, 0, cy), s: 0, sp: 38 });
    pickables.push({ obj: amb.group, info: () => ({ kind: 'med', title: '救护车', sub: '绕着医院巡逻，园区里还没有真正的病人' }) });
    const tc = campus.trackCenter, pts = []; for (let i = 0; i < 48; i++) { const a_ = i / 48 * Math.PI * 2; pts.push(new THREE.Vector3(CAMP.x + tc.x + Math.cos(a_) * 71, cy, CAMP.z + tc.z + Math.sin(a_) * 71)); }
    const track = new Path(pts, true);
    [0, 1].forEach(k => { const bot = T_.buildWalkerBot(20 + k); scene.add(bot.group); walkers.push({ o: bot, path: track, s: track.len * k / 2, sp: 15 + k * 4 }); }); }
  BLOCKS.forEach((B, bi) => {
    const lp = (cw) => rectLoop(B.cx - B.w / 2 + 16, B.cx + B.w / 2 - 16, B.cz - BD / 2 + 16, B.cz + BD / 2 - 16, [24, 24, 24, 24], cw, 0, G + 5);
    const paths = [lp(true), lp(false)];
    const L = CL.layers[bi], JOBS = ['去上班', '午休散步', '下班回家', '去港口看船'], who = ['工程师', '分析师', '实习生', '产品经理'];
    for (let k = 0; k < Math.max(1, Math.round(4 * Q.density)); k++) { const p = T_.buildPerson(bi * 5 + k); scene.add(p.group); walkers.push({ o: p, path: paths[k % 2], s: paths[0].len * (k / 4 + bi * .07), sp: 15 + (k * 7 % 9) });
      pickables.push({ obj: p.group, info: () => ({ kind: 'person', title: `${L.name}街区的${who[k]}`, sub: `${JOBS[(bi + k) % 4]} · 手机里刚收到今天的期权日报`, L }) }); }
    const bot = T_.buildWalkerBot(bi); scene.add(bot.group); walkers.push({ o: bot, path: paths[(bi + 1) % 2], s: paths[0].len * .62, sp: 17 });
    pickables.push({ obj: bot.group, info: () => ({ kind: 'bot', title: '送货机器人', sub: `背包里是研报日报：今天 ${L.name}有 ${L.members.filter(c => c.signals.includes('r')).length} 条评级调整`, L }) });
    if (bi % 2 === 0) { const d = T_.buildDeliveryBot(bi); scene.add(d.group); walkers.push({ o: d, path: paths[bi % 4 === 0 ? 0 : 1], s: paths[0].len * .3, sp: 24, wheels: true });
      pickables.push({ obj: d.group, info: () => ({ kind: 'bot', title: '快递小车', sub: '给街区里的公司送盘前汇总（即将上线）', L }) }); }
  });

  // ---------- 港口入口的市场大屏 + 滚动字幕 ----------
  const board = T_.buildBillboard(T_.marketBoardTexture(), 230, 115, 70, { dark: true }); at(board, 1290, G + 5, -150); S.add(board);
  const tickerTex = T_.tickerTexture(CL.companies.slice().sort((a, b) => b.vx[6] - a.vx[6]).slice(0, 14).map(c => [c.t, c.chg[6]]));
  const ticker = new THREE.Mesh(new THREE.BoxGeometry(236, 18, 4), [M('#2b2d45'), M('#2b2d45'), M('#2b2d45'), M('#2b2d45'), new THREE.MeshBasicMaterial({ map: tickerTex, toneMapped: false }), M('#2b2d45')]);
  at(ticker, 1290, G + 5 + 58, -149); scene.add(ticker);

  // ---------- 夜空：星星与月亮（白天透明） ----------
  const starGeo = new THREE.BufferGeometry(), starPos = [];
  for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = .15 + Math.random() * 1.3, r = 7000; starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 44, transparent: true, opacity: 0, fog: false, sizeAttenuation: true })); scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 18), new THREE.MeshBasicMaterial({ color: '#fff4d6', transparent: true, opacity: 0, fog: false, toneMapped: false })); at(moon, 2300, 1750, -3300); scene.add(moon);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(230, 24, 18), new THREE.MeshBasicMaterial({ color: '#8fa0ff', transparent: true, opacity: 0, fog: false, toneMapped: false, depthWrite: false })); at(halo, 2300, 1750, -3300); scene.add(halo);

  // ---------- 灯塔、小更、货船、飞艇、海鸥、云 ----------
  const light = buildLighthouse(); at(light.group, 1560, WATER_Y + 30, -600); light.group.scale.setScalar(1.15); scene.add(light.group);
  pickables.push({ obj: light.group, info: () => ({ kind: 'light', title: '潮信灯塔', sub: '小更的家。每天从这里出发，把日报送到各个街区' }) });
  light.group.traverse(o => { if (o.isMesh && o.material.type !== 'MeshBasicMaterial') o.castShadow = true; });
  const LIGHT_TOP = light.group.position.clone().add(new THREE.Vector3(0, 340, 0));
  const ship = buildShip(); ship.scale.setScalar(1.4); scene.add(ship);
  const robin = buildRobin(); robin.group.scale.setScalar(2.1); scene.add(robin.group);
  pickables.push({ obj: robin.group, info: () => ({ kind: 'robin', title: '小更', sub: '潮信的信使，一只知更鸟。叼着的信封里是今天的日报' }) });
  // 周报的方向与环节轮动：飞艇横幅 + 巴士车身（有 archive.js 时）
  const WK = window.ARCHIVE && ARCHIVE.weeks ? ARCHIVE.weeks[ARCHIVE.weeks.length - 1] : null;
  const banner = WK ? `本周${WK.dir} · 环节轮动 ${WK.segs.slice(0, 3).map(x => x.n).join(' → ')}` : '收盘后看信号';
  const blimp = T_.buildBlimp(banner); blimp.group.scale.setScalar(1.6); scene.add(blimp.group);
  pickables.push({ obj: blimp.group, info: () => ({ kind: 'blimp', title: '潮信飞艇', sub: WK ? `横幅是周报的结论：本周${WK.dir}，最热环节 ${WK.segs[0].n}（${WK.segs[0].heat.toFixed(1)}x）` : '在小镇上空巡航，提醒大家：收盘后看信号' }) });
  const gulls = Array.from({ length: Math.max(2, Math.round(7 * Q.density)) }, (_, i) => { const g = T_.buildGull(i); g.group.scale.setScalar(2.2); scene.add(g.group); return { g, r: 500 + i * 140, h: 420 + (i % 3) * 70, w: .25 + (i % 4) * .05, ph: i * .9, cx: (i % 2 ? 1 : -1) * 600 }; });
  const clouds = Array.from({ length: Math.max(3, Math.round(7 * Q.density)) }, (_, i) => { const c = T_.buildCloud(i); c.scale.setScalar(1.3 + (i % 3) * .35); at(c, -3200 + i * 950, 480 + (i % 3) * 110, -1750 - (i % 3) * 420); scene.add(c); return c; }); // 云在岛的远处，不挡镇子

  bake(S, scene);
  // 注意：用 scene.environment 时，three.js r170 不读材质的 envMapIntensity，环境光强度要靠 scene.environmentIntensity 控制
  const ENV_DAY = .62;
  scene.environmentIntensity = ENV_DAY;

  // ---------- 小更送信 ----------
  const trip = { phase: 'rest', t: 0, target: 0, restT: 1.2 };
  const topOf = s => new THREE.Vector3(s.grp.position.x, G + 15 + Math.max(s.h, 2) + s.lift + s.modelH * .8, s.grp.position.z);
  function newTrip(focus) {
    const st = stations[focus >= 0 ? focus : trip.target]; trip.target = (trip.target + 3) % stations.length;
    const p = topOf(st).add(new THREE.Vector3(0, 80, 0)), mid = LIGHT_TOP.clone().lerp(p, .5); mid.y += 280;
    trip.out = new THREE.QuadraticBezierCurve3(LIGHT_TOP.clone(), mid, p);
    trip.back = new THREE.QuadraticBezierCurve3(p, mid.clone().add(new THREE.Vector3(0, 80, 160)), LIGHT_TOP.clone());
    trip.phase = 'out'; trip.t = 0;
  }

  // ---------- 每帧更新 ----------
  const spring = (o, k, v, tgt, dt, K, D) => { o[v] += (K * (tgt - o[k]) - D * o[v]) * dt; o[k] += o[v] * dt; };
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), look = new THREE.Vector3();
  const town = { scene, stations, focus: -1, hover: null };
  const hOf = heat => 14 + Math.max(heat - .6, 0) * 70;
  town.setDay = d => { stations.forEach(s => { s.ht = hOf(s.L.heat[d]); }); town.day = d; if (town.setWeather && CL.moods) town.setWeather(MOOD_WX[CL.moods[d]] || 'sunny'); };
  town.setDay(6);
  const place = (obj, path, s, pos, dir) => { path.at(s, pos, dir); obj.position.copy(pos); obj.rotation.set(0, Math.atan2(-dir.z, dir.x), Math.asin(Math.max(-1, Math.min(1, dir.y)))); };

  town.update = (T, dt) => {
    uni.uTime.value = T; uni.uTide.value = Math.sin(T * .35) * 16;
    // 站点
    stations.forEach(s => {
      spring(s, 'h', 'hv', s.ht, dt, 90, 14); spring(s, 'lift', 'lv', s.lt + (s.i === town.focus ? 24 : 0), dt, 160, 16);
      const H = Math.max(s.h, 2);
      s.pod.scale.y = H / 100; s.pod.position.y = H / 2;
      s.st.group.position.y = H + s.lift;
      s.podMat.emissive.set(s === town.hover || s.i === town.focus ? mix(s.L.color, W, .7) : '#000000'); s.podMat.emissiveIntensity = .25;
      s.st.tick(T, dt);
      const top = H + s.lift + s.modelH + 70, show = town.focus < 0 || s.i === town.focus ? 1 : 0;
      s.coins.forEach((c, j) => {
        c.scale.setScalar(Math.max(c.scale.x + (show - c.scale.x) * .12, .001));
        const a = T * .5 + j * 2.1, rr = s === town.hover || s.i === town.focus ? 115 : 70;
        c.position.set(Math.cos(a) * rr, top + Math.sin(T * 1.6 + j) * 10 + j * 18, Math.sin(a) * rr * .5);
      });
    });
    // 烟囱
    chimneys.forEach((c, i) => c.puffs.forEach(p => { const k = (T * .22 + p.ph + i * .07) % 1; p.m.position.set(c.p.x - k * 40, c.p.y + k * 150, c.p.z + Math.sin(k * 6 + i) * 8); p.m.scale.setScalar(.5 + k * 1.8); p.m.material.opacity = .75 * (1 - k); }));
    // 叉车：门口装货 → 开到大道边卸货 → 倒回去
    forklifts.forEach(f => {
      const k = (T / 11 + f.ph) % 1; let z, lift, has, v = 0;
      if (k < .12) { z = f.za; lift = (k / .12) * 10; has = true; }
      else if (k < .45) { z = f.za + (f.zb - f.za) * ease((k - .12) / .33); lift = 10; has = true; v = 40; }
      else if (k < .55) { z = f.zb; lift = 10 - (k - .45) / .1 * 10; has = k < .52; }
      else if (k < .88) { z = f.zb + (f.za - f.zb) * ease((k - .55) / .33); lift = 0; has = false; v = -40; }
      else { z = f.za; lift = 0; has = false; }
      f.v.group.position.set(f.x, G + 5, z); f.v.fork.position.y = 4 + lift; f.v.crate.visible = has; f.v.tick(T, dt, v);
    });
    workers.forEach(w => w.tick(T, dt, 0, 'work'));
    arms.forEach(a => a.tick(T));
    gantry.tick(T, dt);
    flags.forEach(o => o.f.tick(T, o.ph)); cranes.forEach(o => o.cr.tick(T, o.ph)); padState = pad.tick(T);
    turbines.forEach(o => o.t.tick(T, o.ph)); fountain.tick(T);
    { const k = (T * .18) % 1, a_ = k * Math.PI * 2; drone.group.position.set(CAMP.x - 110 + Math.cos(a_) * 140, G + 70 + Math.sin(k * Math.PI) * 60 + (k < .08 || k > .92 ? -(1 - Math.min(k, 1 - k) / .08) * 40 : 0), CAMP.z - 40 + Math.sin(a_) * 120); drone.group.rotation.y = -a_; drone.tick(T); }
    if (rain.visible) { const arr = rainGeo.attributes.position.array; for (let i = 0; i < RAIN_N; i++) { let y = arr[i * 6 + 1] - dt * 560; if (y < G) y += 900; arr[i * 6 + 1] = y; arr[i * 6 + 4] = y - 16; } rainGeo.attributes.position.needsUpdate = true; }
    // 车辆：跟车减速、路口让行（编号小的先走；等太久就放行，防止互相卡住）
    vehicles.forEach(a => { a.R.path.at(a.s, a.pos, a.dir); });
    vehicles.forEach(a => {
      let tgt = a.cruise;
      const grace = a.wait < 0;   // 等太久后有一小段"放行期"：不再给横向来车让行
      // 红绿灯：快到停止线且不是绿灯就减速停下；已经进入路口的继续走
      const ew = Math.abs(a.dir.x) > .7, ns = Math.abs(a.dir.z) > .7;
      if (ew || ns) for (const S_ of SIGNALS) {
        if (ew && Math.abs(a.pos.z - S_.iz) > 70) continue; if (ns && Math.abs(a.pos.x - S_.ix) > 50) continue;
        const ahead = ew ? (S_.ix - a.pos.x) * Math.sign(a.dir.x) : (S_.iz - a.pos.z) * Math.sign(a.dir.z);
        const gap = ahead - (ew ? 56 : 72) - a.len / 2, st = sig[ew ? 'ew' : 'ns'];
        if (gap > -4 && gap < 170 && st !== 'g' && !(st === 'y' && gap < 18)) tgt = Math.min(tgt, Math.max(0, gap * 2.2));
      }
      for (const b of vehicles) {
        if (b === a) continue;
        tmp.subVectors(b.pos, a.pos); tmp.y = 0; const d = tmp.length(); if (d > 130) continue;
        const ahead = tmp.x * a.dir.x + tmp.z * a.dir.z, lat = Math.abs(tmp.x * a.dir.z - tmp.z * a.dir.x), dd = a.dir.x * b.dir.x + a.dir.z * b.dir.z;
        if (ahead <= 0) continue;
        if (lat < 14 && dd > .3) tgt = Math.min(tgt, Math.max(0, (ahead - (a.len + b.len) / 2 - 12) * 2));                       // 跟车
        else if (!grace && d < 90 && lat < 46 && Math.abs(dd) < .6 && b.id < a.id && b.sp > 6) tgt = Math.min(tgt, Math.max(0, (ahead - 60) * 1.5)); // 路口让行（只让给在动的车）
      }
      if (a.wait < 0) a.wait = Math.min(a.wait + dt, 0); else a.wait = tgt < 4 ? a.wait + dt : 0;
      if (a.wait > 7) a.wait = -1.4;  // 等红灯是正常的，等很久才放行
      a.sp += (tgt - a.sp) * Math.min(dt * (tgt < a.sp ? 6 : 1.4), 1);
      a.s += a.sp * dt;
      if (a.R.open && a.s >= a.R.path.len) a.s = 0;
      place(a.v.group, a.R.path, a.s, a.pos, a.dir);
      if (a.R.open) { const e = Math.min(1, a.s / 90, (a.R.path.len - a.s) / 90); a.v.group.scale.setScalar(Math.max(e, .001)); }
      a.v.tick(T, dt, a.sp);
      if (a.kind === 'flat') { a.cargoLi = nearestBlock(a.pos); a.v.setCargo(a.cargoLi); }
    });
    // 红绿灯与过马路的行人
    signalPhase(T);
    crossers.forEach(c => {
      if (sig.nsStart && !c.moving) c.moving = true;
      if (c.moving) { c.p += c.dir * dt * 18 / 150; if (c.p >= 1 || c.p <= 0) { c.p = c.p >= 1 ? 1 : 0; c.dir = -c.dir; c.moving = false; } }
      c.o.group.position.set(c.x, G + 5, AVE.z - 75 + c.p * 150); c.o.group.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      c.o.tick(T, dt, 18, c.moving ? 'walk' : 'idle');
    });
    tickerTex.offset.x += dt * .045;
    // 行人
    walkers.forEach(w => { w.s += w.sp * dt; place(w.o.group, w.path, w.s, tmp, tmp2); w.o.tick(T, dt, w.sp); });
    // 夜晚模式：白天 → 黄昏 → 夜晚 平滑过渡
    if (town.night !== town.nightTarget) {
      town.night += Math.sign(town.nightTarget - town.night) * Math.min(dt / 2.6, Math.abs(town.nightTarget - town.night));
      applyNight(town.night);
    }
    // 电流、数据流
    sparks.forEach(sp => { sp.t = (sp.t + dt * .28) % 1; const seg = Math.min(Math.floor(sp.t * sp.n), sp.n - 1), k = sp.t * sp.n - seg; sp.d.position.copy(spans[seg].getPoint(k)); });
    flows.forEach(f => f.dots.forEach(o => { o.t = (o.t + dt * f.speed) % 1; o.d.position.copy(f.cv.getPoint(o.t)); }));
    // 灯塔、货船、飞艇、海鸥、云
    light.tick(T);
    const sa = T * .04, SR = [2250, 1420], sx = Math.cos(sa) * SR[0], sz = Math.sin(sa) * SR[1];
    ship.position.set(sx, WATER_Y + uni.uTide.value + waveH(sx, sz, T) + 6, sz);
    ship.rotation.set((waveH(sx, sz + 60, T) - waveH(sx, sz - 60, T)) * .006, Math.atan2(-Math.cos(sa) * SR[1], -Math.sin(sa) * SR[0]) + Math.PI, (waveH(sx + 80, sz, T) - waveH(sx - 80, sz, T)) * .004);
    docked.position.y = WATER_Y + uni.uTide.value + waveH(1630, 330, T) + 8; docked.rotation.x = Math.sin(T * .7) * .015;
    const ba = T * .05; blimp.group.position.set(Math.cos(ba) * 1300, 760 + Math.sin(T * .3) * 20, Math.sin(ba) * 700 - 100); blimp.group.rotation.y = -ba - Math.PI / 2 + Math.PI; blimp.tick(T);
    gulls.forEach(g => { const a = T * g.w + g.ph; g.g.group.position.set(g.cx + Math.cos(a) * g.r, g.h + Math.sin(T * 1.3 + g.ph) * 20, Math.sin(a) * g.r * .6); g.g.group.rotation.set(0, -a - Math.PI / 2 + Math.PI, Math.cos(a) * .3); g.g.tick(T); });
    clouds.forEach((c, i) => { c.position.x += dt * (14 + i * 2); if (c.position.x > 3600) c.position.x = -3600; });
    // 小更
    robin.tick(T, dt);
    if (trip.phase === 'rest') {
      robin.flying = false; robin.group.position.copy(LIGHT_TOP); robin.group.rotation.y = Math.sin(T * .3) * .8 - .6;
      trip.restT -= dt; if (trip.restT <= 0) newTrip(town.focus);
    } else {
      robin.flying = true; trip.t += dt / 3.6;
      const cv = trip.phase === 'out' ? trip.out : trip.back, k = Math.min(trip.t, 1), e = ease(k);
      const p = cv.getPoint(e); look.copy(cv.getPoint(Math.min(e + .02, 1)));
      robin.group.position.copy(p); robin.group.lookAt(look.x, p.y, look.z);
      robin.envelope.visible = trip.phase === 'back';
      if (k >= 1) { if (trip.phase === 'out') { trip.phase = 'back'; trip.t = 0; } else { trip.phase = 'rest'; trip.restT = 2.5; robin.envelope.visible = true; } }
    }
  };
  // ---------- 夜晚模式 ----------
  const C3 = (a, b, c) => [new THREE.Color(a), new THREE.Color(b), new THREE.Color(c)];
  const lerp3 = (cols, n, out) => n < .5 ? out.copy(cols[0]).lerp(cols[1], n * 2) : out.copy(cols[1]).lerp(cols[2], (n - .5) * 2);
  const NC = { fog: C3(FOG, '#f6c9a8', '#0d1230'), sky: C3('#eaf6ff', '#ffd9b0', '#1a2250'), hemiSky: C3('#ffffff', '#ffd6b0', '#2a3360'), hemiGnd: C3('#cfe6ff', '#8a6f8f', '#141a33'),
    sun: C3('#fffaf2', '#ffb070', '#8fa0ff'), shallow: C3('#a6ecef', '#f0c8a8', '#1e5a7a'), mid: C3('#8fd2f6', '#d79a8c', '#163f66'), deep: C3('#78b4ef', '#8a6a9a', '#0f2a4d'), foam: C3('#ffffff', '#fff0e0', '#9fb8d8') };
  const dusk = n => Math.sin(n * Math.PI); // 黄昏在中间最强
  function applyNight(n) {
    lerp3(NC.fog, n, scene.fog.color); lerp3(NC.fog, n, uni.uFog.value); lerp3(NC.sky, n, uni.uSky.value);
    lerp3(NC.hemiSky, n, hemi.color); lerp3(NC.hemiGnd, n, hemi.groundColor); hemi.intensity = .95 - n * .72;
    lerp3(NC.sun, n, sun.color); sun.intensity = 1.7 - n * 1.42 + dusk(n) * .2;
    lerp3(NC.shallow, n, uni.uShallow.value); lerp3(NC.mid, n, uni.uMid.value); lerp3(NC.deep, n, uni.uDeep.value); lerp3(NC.foam, n, uni.uFoam.value);
    const lit = Math.max(0, (n - .3) / .7); // 灯从黄昏开始亮
    T_.NIGHT.lamp.emissiveIntensity = .5 + lit * 2.2; T_.NIGHT.win.emissive.set('#ffd98a'); T_.NIGHT.win.emissiveIntensity = lit * .9;
    T_.NIGHT.head.emissiveIntensity = .4 + lit * 2.4; T_.NIGHT.tail.emissiveIntensity = .25 + lit * 1.6;
    T_.NIGHT.pool.opacity = lit * .55; T_.NIGHT.beam.opacity = lit * .6;
    stars.material.opacity = Math.max(0, (n - .55) / .45) * .95; moon.material.opacity = Math.max(0, (n - .5) / .5); halo.material.opacity = moon.material.opacity * .18;
    light.night = lit;
    // RoomEnvironment 本身很亮，夜里几乎关掉，只留路灯和月光
    scene.environmentIntensity = ENV_DAY * (1 - n * .97);
    applyWeather();
  }
  // 雨：线段粒子，只在"偏谨慎"的日子下
  const RAIN_N = Q.density < .5 ? 60 : Math.round(900 * Q.density), /* 低档只留一点雨丝 */ rainGeo = new THREE.BufferGeometry(), rp = new Float32Array(RAIN_N * 6);
  for (let i = 0; i < RAIN_N; i++) { const x = (Math.random() - .5) * 4200, z = (Math.random() - .5) * 3000, y = G + Math.random() * 900; rp.set([x, y, z, x, y - 16, z], i * 6); }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#9fb6d8', transparent: true, opacity: .55 })); rain.visible = false; rain.frustumCulled = false; scene.add(rain);
  const GRAY = new THREE.Color('#cfd6e3');
  town.weather = 'sunny';
  function applyWeather() {
    const w = WX[town.weather]; sun.intensity *= w.sun; hemi.intensity *= w.hemi; scene.fog.near = w.fogN; scene.fog.far = w.fogF;
    scene.fog.color.lerp(GRAY, w.gray * (1 - town.night)); uni.uFog.value.copy(scene.fog.color); uni.uSky.value.lerp(GRAY, w.gray * .6 * (1 - town.night));
    rain.visible = town.weather === 'rain';
    clouds.forEach((c, i) => { c.visible = i < Math.ceil(clouds.length * w.cloud); });
  }
  town.setWeather = mode => { town.weather = WX[mode] ? mode : 'sunny'; applyNight(town.night); };
  town.night = 0; town.nightTarget = 0;
  town.setWeather(MOOD_WX[CL.moods ? CL.moods[6] : '偏乐观']);   // 必须在 night 初始化之后，否则 lerp 出 NaN 整屏黑
  town.setNight = (v, immediate) => { town.nightTarget = Math.max(0, Math.min(1, v)); if (immediate) { town.night = town.nightTarget; applyNight(town.night); } };
  town.faceCoins = cam => stations.forEach(s => s.coins.forEach(c => c.lookAt(cam.position)));
  town.vehicles = vehicles; town.walkers = walkers; town.pickables = pickables; town.pad = pad; town.flags = flags;
  TOWN_SINGLETON = town;
  return town;
}

// ====================================================================
// 共享时钟：场景每帧只更新一次，可见的视图各自渲染
const views = new Set();
let running = false, last = 0, CLOCK = 0;
function loop(now) {
  const dt = Math.max(0, Math.min((now - last) / 1000, .04)); last = now; CLOCK += dt;
  const vis = [...views].filter(v => v.visible);
  if (!vis.length) { running = false; return; }
  window.Q && window.Q.tick(dt);
  getTown().update(CLOCK, dt);
  vis.forEach(v => v.render(CLOCK, dt));
  requestAnimationFrame(loop);
}
function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
function makeView(canvas, opts) {
  const town = getTown();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const Q = window.Q || { dpr: 2, shadows: true, onChange() {} };
  renderer.setPixelRatio(Math.min(devicePixelRatio, opts.maxDpr || 2, Q.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = Q.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  Q.onChange(() => { renderer.setPixelRatio(Math.min(devicePixelRatio, opts.maxDpr || 2, Q.dpr)); renderer.shadowMap.enabled = Q.shadows; town.scene.traverse(o => { if (o.isLight && o.shadow) o.castShadow = Q.shadows; }); view.resize(); });
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; // 环境贴图属于各自的 WebGL 上下文
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 16000);
  const view = { canvas, renderer, camera, visible: false, onResize: null, before: null, after: null };
  view.render = (T, dt) => {
    view.before && view.before(T, dt);
    town.scene.environment = env; town.faceCoins(camera);
    renderer.render(town.scene, camera);
    view.after && view.after(T, dt);
  };
  view.resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); view.onResize && view.onResize(w, h); };
  addEventListener('resize', view.resize);
  new IntersectionObserver(es => { view.visible = es[0].isIntersecting; if (view.visible) wake(); }, { threshold: .02 }).observe(canvas);
  views.add(view);
  return view;
}

// ---------- 首页背景：镜头慢慢环绕，鼠标带一点视差 ----------
function initHeroIsland(canvas, opts) {
  opts = opts || {};
  const view = makeView(canvas, { maxDpr: 1.75 });
  const { camera } = view, ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  (opts.host || canvas).addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = e.clientY / innerHeight * 2 - 1; });
  const tgt = new THREE.Vector3();
  view.onResize = (w, h) => { const sh = opts.shift ? opts.shift(w, h) : 0; if (sh) camera.setViewOffset(w, h, -w * sh, 0, w, h); else camera.clearViewOffset(); };
  view.before = (T) => {
    ptr.x += (ptr.tx - ptr.x) * .03; ptr.y += (ptr.ty - ptr.y) * .03;
    const narrow = camera.aspect < 1;
    const az = -.38 + Math.sin(T * .045) * .3 + ptr.x * .08, el = .6 + ptr.y * .04 + Math.sin(T * .06) * .03, dist = narrow ? 6400 : 5100;
    tgt.set(narrow ? 0 : 120, -40, 80);
    camera.position.set(tgt.x + Math.sin(az) * Math.cos(el) * dist, tgt.y + Math.sin(el) * dist, tgt.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tgt);
  };
  view.resize();
  return { view };
}

// ---------- 导览区：可拖动、点站点、导览飞镜头 ----------
function initIsland(canvas, ui) {
  const town = getTown(), view = makeView(canvas, {}), { camera } = view, stations = town.stations;
  const HOME = { pos: new THREE.Vector3(-560, 2900, 3900), tgt: new THREE.Vector3(-150, -60, 0) };
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false; controls.target.copy(HOME.tgt);
  controls.minPolarAngle = .45; controls.maxPolarAngle = 1.2; controls.minAzimuthAngle = -.85; controls.maxAzimuthAngle = .85;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let tween = null;
  const setRay = e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); };
  const pickStation = e => {
    setRay(e);
    const hit = ray.intersectObjects(stations.map(s => s.grp), true)[0];
    if (!hit) return null; let o = hit.object; while (o && !stations.find(s => s.grp === o)) o = o.parent; return stations.find(s => s.grp === o) || null;
  };
  // 镇里的小东西：车、人、机器人、广告牌、岸桥、灯塔、小更、飞艇
  const pickThing = e => {
    setRay(e);
    const objs = town.pickables.map(p => p.obj), hit = ray.intersectObjects(objs, true)[0];
    if (!hit) return null; let o = hit.object; while (o && !objs.includes(o)) o = o.parent; return town.pickables.find(p => p.obj === o) || null;
  };
  let thingHover = null;
  canvas.addEventListener('pointermove', e => {
    const th = pickThing(e);
    if (th !== thingHover) { thingHover = th; }
    const s = th ? null : pickStation(e);
    if (s !== town.hover) { if (town.hover) town.hover.lt = 0; town.hover = s; if (s) s.lt = 34; ui.hover && ui.hover(s ? s.i : -1); }
    canvas.style.cursor = th || s ? 'pointer' : 'grab';
  });
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) {
      const th = pickThing(e);
      if (th) { const r = canvas.getBoundingClientRect(); ui.thing && ui.thing(th.info(), e.clientX - r.left, e.clientY - r.top, th); }
      else { ui.thing && ui.thing(null); const s = pickStation(e); if (s) go(s.i); }
    }
    downAt = null;
  });
  const narrow = () => camera.aspect < 1.3, far = () => narrow() ? Math.min(1.3 / camera.aspect, 2.4) : 1;
  function viewOf(i) {
    if (i < 0) { const tgt = HOME.tgt.clone(); if (narrow()) tgt.set(0, -40, 120); return [tgt.clone().add(HOME.pos.clone().sub(HOME.tgt).multiplyScalar(narrow() ? Math.min(far(), 1.55) : 1)), tgt]; }
    const p = stations[i].grp.position, back = i < 4;
    const tgt = new THREE.Vector3(p.x - (narrow() ? 0 : 160), narrow() ? 60 : 110, p.z + (narrow() ? 160 : 0));
    const off = new THREE.Vector3(-260, 900, back ? 1300 : 1360).multiplyScalar(narrow() ? Math.min(far(), 1.6) : 1);
    return [tgt.clone().add(off), tgt];
  }
  function go(i) { town.focus = i; const [pos, tgt] = viewOf(i); tween = { t0: performance.now(), d: 1400, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: tgt }; ui.select && ui.select(i); }
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, tmp = new THREE.Vector3();
  view.onResize = () => { if (!tween) { const [pos, tgt] = viewOf(town.focus); camera.position.copy(pos); controls.target.copy(tgt); } };
  view.before = () => {
    if (tween) { const k = Math.min((performance.now() - tween.t0) / tween.d, 1), e = ease(k); camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e); if (k >= 1) tween = null; }
    controls.update();
  };
  view.after = () => {
    const r = canvas.getBoundingClientRect();
    if (ui.followThing) { const th = ui.followThing(); if (th) { th.obj.getWorldPosition(tmp); tmp.y += 60; tmp.project(camera); ui.moveThing((tmp.x + 1) / 2 * r.width, (1 - tmp.y) / 2 * r.height, tmp.z < 1); } }
    stations.forEach(s => {
      tmp.set(s.grp.position.x, G + 5 + Math.max(s.h, 2) + s.lift + s.modelH + 36, s.grp.position.z).project(camera);
      const el = ui.labels[s.i];
      el.style.transform = `translate(${(tmp.x + 1) / 2 * r.width}px, ${(1 - tmp.y) / 2 * r.height}px) translate(-50%, -100%)`;
      el.classList.toggle('on', s.i === town.focus || s === town.hover);
      el.classList.toggle('dim', town.focus >= 0 && s.i !== town.focus);
    });
  };
  view.resize();
  return { view, look: (px, py, pz, tx, ty, tz, d) => { town.focus = -2; tween = { t0: performance.now(), d: d || 1400, p0: camera.position.clone(), t0v: controls.target.clone(), p1: new THREE.Vector3(px, py, pz), t1: new THREE.Vector3(tx, ty, tz) }; }, go, setDay: town.setDay, town, get focus() { return town.focus; } };
}
return { initIsland, initHeroIsland, getTown };
})();
