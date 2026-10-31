/*
 * 潮信 · 研报 3D 宣传区（Three.js）：研报卡片环
 * - 今日每条研报调整 = 一张立体卡片（Canvas 绘制：logo、机构、评级变化、目标价、≤3 条要点），围成一圈慢慢转
 * - 拖动旋转带惯性；点击卡片转到正前方并放大，侧栏显示详情
 * - 中央统计台：今日调整条数；上调的绿色箭头往上飘，下调的红色箭头往下沉
 * - 筛选：全部 / 上调 / 下调（不符合的卡片缩小变淡）
 * 全部为虚构示例；机构名一律"机构 A/B/C…"
 */
window.RESEARCH = (async () => {
const C = await window.CLAY;
const { THREE, RoundedBoxGeometry, mat, mix } = C;
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
const W = '#ffffff', BULL = '#0fb57b', BEAR = '#e8364a';

const REPORTS = [
  { t: 'NVDA', firm: '机构 A', date: '10-30', r0: '中性', r1: '增持', p0: 145, p1: 165, pts: ['数据中心收入占比继续提升', '新平台量产节奏早于此前披露', '毛利率假设上调 1 个百分点'] },
  { t: 'MU', firm: '机构 B', date: '10-30', r0: '增持', r1: '增持', p0: 135, p1: 160, pts: ['HBM 产能扩建进度加快', '存储价格环比回升', '资本开支指引上调'] },
  { t: 'ANET', firm: '机构 C', date: '10-30', r0: '增持', r1: '中性', p0: 140, p1: 128, pts: ['估值已反映多数增长预期', '大客户订单节奏放缓'] },
  { t: 'COHR', firm: '机构 D', date: '10-30', r0: '—', r1: '增持', p0: null, p1: 112, pts: ['首次覆盖', '800G 光模块份额提升'] },
  { t: 'SMCI', firm: '机构 E', date: '10-30', r0: '中性', r1: '减持', p0: 48, p1: 36, pts: ['毛利率承压', '财务披露存在不确定性'] },
  { t: 'VRT', firm: '机构 F', date: '10-30', r0: '增持', r1: '增持', p0: 120, p1: 138, pts: ['液冷订单储备创新高', '数据中心电力需求上行'] },
  { t: 'AVGO', firm: '机构 G', date: '10-30', r0: '增持', r1: '增持', p0: 330, p1: 360, pts: ['定制 ASIC 客户数量增加', '网络芯片出货量环比增长'] },
  { t: 'TSM', firm: '机构 H', date: '10-30', r0: '增持', r1: '增持', p0: 300, p1: 320, pts: ['先进制程产能利用率维持高位', 'CoWoS 封装产能继续扩张'] },
  { t: 'CEG', firm: '机构 I', date: '10-30', r0: '中性', r1: '中性', p0: 260, p1: 280, pts: ['长期购电协议带来稳定现金流', '核电机组重启进度符合预期'] },
];
REPORTS.forEach(r => { r.dir = r.p0 == null ? 'new' : r.p1 > r.p0 ? 'up' : r.p1 < r.p0 ? 'down' : 'flat'; r.c = CL.byT[r.t]; });

// ---------- 卡片贴图 ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function cardTexture(r) {
  const S = 2, cw = 480, ch = 640, cv = document.createElement('canvas'); cv.width = cw * S; cv.height = ch * S;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const L = CL.layers[r.c.li], dc = r.dir === 'up' ? BULL : r.dir === 'down' ? BEAR : '#8e91a7';
  const NUM = '"Plus Jakarta Sans", "Noto Sans SC", sans-serif', CN = '"Noto Sans SC", "PingFang SC", sans-serif';
  let logo = null;
  function draw() {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = '#ffffff'; rr(g, 4, 4, cw - 8, ch - 8, 34); g.fill();
    g.lineWidth = 3; g.strokeStyle = '#eceef5'; g.stroke();
    g.fillStyle = mix(dc, W, .9); rr(g, 4, 4, cw - 8, 128, 34); g.fill(); g.fillRect(4, 100, cw - 8, 32);
    // logo
    g.save(); g.beginPath(); g.arc(78, 70, 40, 0, Math.PI * 2); g.fillStyle = mix(L.color, W, .5); g.fill();
    g.beginPath(); g.arc(78, 70, 35, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.clip();
    if (logo) g.drawImage(logo, 43, 35, 70, 70); else { g.fillStyle = mix(L.color, '#000', .18); g.font = `800 34px ${NUM}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.t[0], 78, 72); }
    g.restore();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#16172a'; g.font = `800 40px ${NUM}`; g.fillText(r.t, 134, 66);
    g.fillStyle = '#8e91a7'; g.font = `600 19px ${CN}`; g.fillText(`${r.c.name} · ${L.name}`, 136, 96);
    // 机构与评级
    g.fillStyle = '#444760'; g.font = `700 20px ${CN}`; g.fillText(`${r.firm} · ${r.date}`, 34, 176);
    const rt = r.r0 === r.r1 ? `维持 ${r.r1}` : r.r0 === '—' ? `首次覆盖 · ${r.r1}` : `${r.r0} → ${r.r1}`;
    g.font = `800 22px ${CN}`; const tw = g.measureText(rt).width + 28;
    g.fillStyle = r.r0 === r.r1 || r.r0 === '—' ? '#efedff' : mix(dc, W, .88); rr(g, 34, 194, tw, 40, 20); g.fill();
    g.fillStyle = r.r0 === r.r1 || r.r0 === '—' ? '#4b3ed1' : mix(dc, '#000', .18); g.fillText(rt, 48, 222);
    // 目标价
    g.fillStyle = '#8e91a7'; g.font = `700 18px ${CN}`; g.fillText('目标价', 34, 282);
    g.fillStyle = '#16172a'; g.font = `800 58px ${NUM}`;
    const p1 = String(r.p1); const pre = r.p0 == null ? '' : `${r.p0} → `;
    g.font = `700 30px ${NUM}`; g.fillStyle = '#8e91a7'; g.fillText(pre, 34, 340); const pw = g.measureText(pre).width;
    g.font = `800 58px ${NUM}`; g.fillStyle = '#16172a'; g.fillText(p1, 34 + pw, 342);
    if (r.p0 != null) {
      const d = (r.p1 / r.p0 - 1) * 100, txt = `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(0)}%`;
      g.font = `800 22px ${NUM}`; const w2 = g.measureText(txt).width + 26, x2 = cw - 34 - w2;
      g.fillStyle = mix(dc, W, .88); rr(g, x2, 306, w2, 40, 20); g.fill(); g.fillStyle = mix(dc, '#000', .18); g.fillText(txt, x2 + 13, 334);
    }
    // 要点
    g.strokeStyle = '#eceef5'; g.lineWidth = 2; g.beginPath(); g.moveTo(34, 376); g.lineTo(cw - 34, 376); g.stroke();
    g.font = `500 20px ${CN}`;
    r.pts.slice(0, 3).forEach((p, i) => { g.fillStyle = L.color; g.beginPath(); g.arc(42, 414 + i * 46, 5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#444760'; g.fillText(p, 58, 421 + i * 46); });
    g.fillStyle = '#b4b7c8'; g.font = `600 15px ${CN}`; g.fillText('潮信 · 研报日报 · 摘要整理，不构成投资建议', 34, ch - 34);
    tex.needsUpdate = true;
  }
  draw();
  if (document.fonts) document.fonts.ready.then(() => Promise.all([document.fonts.load(`800 40px "Plus Jakarta Sans"`), document.fonts.load(`900 20px "Noto Sans SC"`)]).then(draw, draw));
  if (r.c.logo) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { logo = img; draw(); }; img.src = r.c.logo; }
  return tex;
}
const BACK = (() => { // 卡片背面：潮信花纹
  const cv = document.createElement('canvas'); cv.width = 480; cv.height = 640; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, '#f3f1ff'); gr.addColorStop(1, '#e7f4fe'); g.fillStyle = gr; rr(g, 4, 4, 472, 632, 34); g.fill();
  g.strokeStyle = 'rgba(18,150,240,.35)'; g.lineWidth = 8; g.lineCap = 'round';
  for (let k = 0; k < 6; k++) { g.beginPath(); for (let x = 60; x <= 420; x += 4) g.lineTo(x, 200 + k * 46 + Math.sin((x - 60) / 360 * Math.PI * 3 + k) * 12); g.stroke(); }
  g.fillStyle = '#5b4cff'; g.font = '900 64px "Noto Sans SC", sans-serif'; g.textAlign = 'center'; g.fillText('潮信', 240, 140);
  g.fillStyle = '#8e91a7'; g.font = '700 26px "Noto Sans SC", sans-serif'; g.fillText('研报日报', 240, 560);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
function hubTexture(up, down, nw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    g.clearRect(0, 0, 512, 512); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
    g.textAlign = 'center'; g.fillStyle = '#8e91a7'; g.font = '700 34px "Noto Sans SC", sans-serif'; g.fillText('今日研报调整', 256, 150);
    g.fillStyle = '#5b4cff'; g.font = '800 170px "Plus Jakarta Sans", sans-serif'; g.fillText(String(up + down + nw), 256, 300);
    g.font = '800 38px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    g.fillStyle = '#0c9465'; g.fillText(`▲${up}`, 150, 390); g.fillStyle = '#be2c3d'; g.fillText(`▼${down}`, 256, 390); g.fillStyle = '#4b3ed1'; g.fillText(`★${nw}`, 362, 390);
    g.fillStyle = '#8e91a7'; g.font = '600 24px "Noto Sans SC", sans-serif'; g.fillText('上调　下调　首次', 256, 432);
    tex.needsUpdate = true;
  };
  draw(); document.fonts && document.fonts.ready.then(draw);
  return tex;
}

function initResearch(canvas, ui) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, window.Q ? window.Q.dpr : 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9e6ff', 1.05));
  const key = new THREE.DirectionalLight('#ffffff', 1.3); key.position.set(-400, 700, 600); scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 8000);

  // 中央统计台
  const up = REPORTS.filter(r => r.dir === 'up').length, down = REPORTS.filter(r => r.dir === 'down').length, nw = REPORTS.filter(r => r.dir === 'new').length;
  const hub = new THREE.Group(); scene.add(hub);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(190, 210, 46, 64), mat('#efedff')); base.position.y = -23; hub.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(200, 6, 12, 80), mat('#c9c3ff')); ring.rotation.x = Math.PI / 2; ring.position.y = 0; hub.add(ring);
  // 统计牌：竖着放在台子上，始终面向镜头
  const plaque = new THREE.Group(); plaque.position.y = 150; scene.add(plaque);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(142, 142, 14, 64), mat('#ffffff')); disc.rotation.x = Math.PI / 2; disc.position.z = -8; plaque.add(disc);
  const face = new THREE.Mesh(new THREE.CircleGeometry(132, 64), new THREE.MeshBasicMaterial({ map: hubTexture(up, down, nw), toneMapped: false })); plaque.add(face);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, 120, 16), mat('#c9c3ff')); stem.position.y = 70; scene.add(stem);
  // 上调 / 下调箭头
  const arrows = [];
  const arrow = (color, dirUp) => {
    const g = new THREE.Group(), m = mat(mix(color, W, .15));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 26, 12), m); g.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(12, 20, 16), m); head.position.y = dirUp ? 22 : -22; if (!dirUp) head.rotation.x = Math.PI; g.add(head);
    return g;
  };
  for (let i = 0; i < 14; i++) {
    const isUp = i < up * 1.5; const a = arrow(isUp ? BULL : BEAR, isUp); scene.add(a);
    arrows.push({ a, up: isUp, ang: Math.random() * Math.PI * 2, r: 230 + Math.random() * 120, ph: Math.random() });
  }

  // 卡片环
  const R = 600, CW = 240, CH = 320, N = REPORTS.length;
  const cards = REPORTS.map((r, i) => {
    const g = new THREE.Group();
    const back = new THREE.Mesh(new RoundedBoxGeometry(CW + 8, CH + 8, 10, 4, 14), mat('#ffffff', { roughness: .5 })); back.position.z = -6; g.add(back);
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: BACK, toneMapped: false })); bk.rotation.y = Math.PI; bk.position.z = -11.5; g.add(bk);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: cardTexture(r), transparent: true, toneMapped: false })); g.add(front);
    const edge = new THREE.Mesh(new RoundedBoxGeometry(CW + 8, 8, 12, 2, 3), mat(r.dir === 'up' ? BULL : r.dir === 'down' ? BEAR : '#8f84ff')); edge.position.set(0, -CH / 2 - 8, -4); g.add(edge);
    scene.add(g);
    return { r, g, front, i, s: 1, sv: 0, vis: 1 };
  });

  let rot = 0, vel = .12, filter = 'all', sel = -1, target = null;
  const placeCards = () => cards.forEach(c => {
    const a = rot + c.i / N * Math.PI * 2;
    c.g.position.set(Math.sin(a) * R, 170 + Math.sin(a * 2 + rot) * 6, Math.cos(a) * R);
    c.g.rotation.y = a; c.front_a = a;
  });

  // 交互：拖动旋转 + 惯性；点击卡片转到前面
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null, moved = 0;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, rot }; moved = 0; canvas.setPointerCapture(e.pointerId); target = null; });
  canvas.addEventListener('pointermove', e => {
    if (drag) { const dx = e.clientX - drag.x; moved = Math.max(moved, Math.abs(dx)); const nr = drag.rot + dx * .006; vel = (nr - rot) * 30; rot = nr; }
    else { const c = pick(e); canvas.style.cursor = c ? 'pointer' : 'grab'; }
  });
  canvas.addEventListener('pointerup', e => { if (drag && moved < 5) { const c = pick(e); if (c) focusCard(c.i); } drag = null; });
  function pick(e) {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(cards.map(c => c.g), true)[0];
    if (!h) return null; let o = h.object; while (o && !cards.find(c => c.g === o)) o = o.parent; return cards.find(c => c.g === o);
  }
  function focusCard(i) {
    sel = i; vel = 0;
    const want = -i / N * Math.PI * 2; // 让第 i 张转到正前方（a = 0）
    let d = want - rot; d = Math.atan2(Math.sin(d), Math.cos(d)); target = rot + d;
    ui.select && ui.select(cards[i].r);
  }
  function setFilter(f) {
    filter = f; sel = -1;
    const c = f === 'all' ? null : cards.find(c => c.r.dir === f);
    if (c) focusCard(c.i);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    const far = camera.aspect < 1 ? 1.8 : 1;
    camera.position.set(0, 980 * far, 2050 * far); camera.lookAt(0, 60, 0); camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);
  let visible = false, last = performance.now(), T = 0;
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visible) { visible = true; last = performance.now(); requestAnimationFrame(tick); } visible = v; }).observe(canvas);
  function tick(now) {
    const dt = Math.max(0, Math.min((now - last) / 1000, .05)); last = now; T += dt;
    if (target != null) { rot += (target - rot) * Math.min(dt * 5, 1); if (Math.abs(target - rot) < .001) target = null; }
    else if (!drag) { vel += (.12 - vel) * Math.min(dt * .8, 1); if (sel < 0) rot += vel * dt; }
    placeCards();
    cards.forEach(c => {
      const front = Math.cos(c.front_a); // 1 = 正前方
      const show = filter === 'all' || c.r.dir === filter || (filter === 'up' && c.r.dir === 'new') ? 1 : 0;
      c.vis += (show - c.vis) * Math.min(dt * 6, 1);
      const want = (c.i === sel ? 1.22 : 1 + Math.max(front, 0) * .08) * (.55 + c.vis * .45);
      c.s += (want - c.s) * Math.min(dt * 8, 1);
      c.g.scale.setScalar(c.s);
      c.g.position.y += c.i === sel ? 40 : 0;
      c.front.material.opacity = .35 + c.vis * .65;
    });
    hub.rotation.y = T * .15; plaque.lookAt(camera.position.x, plaque.position.y, camera.position.z); plaque.position.y = 150 + Math.sin(T * 1.2) * 6;
    arrows.forEach(o => {
      const k = (T * .25 + o.ph) % 1, a = o.ang + T * .1;
      o.a.position.set(Math.cos(a) * o.r, o.up ? 10 + k * 260 : 270 - k * 260, Math.sin(a) * o.r);
      o.a.scale.setScalar(Math.sin(k * Math.PI) * .9 + .05);
    });
    renderer.render(scene, camera);
    if (visible) requestAnimationFrame(tick);
  }
  return { setFilter, focusCard, reports: REPORTS };
}
return { initResearch, REPORTS };
})();
