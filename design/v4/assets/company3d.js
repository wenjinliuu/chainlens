/*
 * 潮信 · 公司档案 3D（Three.js）
 * initStar：信息星图——中央 logo 硬币立在台座上；内圈 = 近 20 日 CP 偏离环形柱；中圈 = 研报卡片环绕；
 *           外圈 = 新闻气泡；左边上游、右边下游公司硬币，用管线连到中央，光点按供货方向流动，点击可跳转
 * initLine：3D 时间轴——近 60 日 K 线、悬空的 CP 比曲线、研报目标价半透明带，事件小旗插在当天 K 线上
 * 全部为虚构示例数据
 */
window.COMPANY3D = (async () => {
const C = await window.CLAY;
const { THREE, RoundedBoxGeometry, mat, buildCoin, mix } = C;
const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
const W = '#ffffff', BULL = '#0fb57b', BEAR = '#e8364a';
const EVC = { o: '#a04cf5', r: '#1296f0', n: '#f5a314' }, EVL = { o: '期', r: '研', n: '闻' };

function base(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#dcd7ff', 1.05));
  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(-500, 800, 600); scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 9000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enableZoom = false; controls.enablePan = false;
  return { renderer, scene, camera, controls };
}
function textTex(lines, w, h, opt) {
  const S = 2, cv = document.createElement('canvas'); cv.width = w * S; cv.height = h * S;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = () => {
    g.setTransform(S, 0, 0, S, 0, 0); g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, opt.r || 18); g.fill(); g.lineWidth = 3; g.strokeStyle = opt.edge || '#eceef5'; g.stroke();
    if (opt.strip) { g.fillStyle = opt.strip; g.beginPath(); g.roundRect(3, 3, 10, h - 6, [opt.r || 18, 0, 0, opt.r || 18]); g.fill(); }
    lines.forEach(([txt, font, color, x, y]) => { g.font = font; g.fillStyle = color; g.fillText(txt, x, y); });
    tex.needsUpdate = true;
  };
  draw(); document.fonts && document.fonts.ready.then(draw);
  return tex;
}
const CN = '"Noto Sans SC", "PingFang SC", sans-serif', NUM = '"Plus Jakarta Sans", "Noto Sans SC", sans-serif';
const clip = (s, n) => s.length > n ? s.slice(0, n) + '…' : s;
function clear(g) { while (g.children.length) g.remove(g.children[0]); }
function visLoop(canvas, fn) {
  let visible = false, last = performance.now(), T = 0;
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visible) { visible = true; last = performance.now(); requestAnimationFrame(tick); } visible = v; }).observe(canvas);
  function tick(now) { const dt = Math.max(0, Math.min((now - last) / 1000, .05)); last = now; T += dt; fn(T, dt); if (visible) requestAnimationFrame(tick); }
}

// ================= 信息星图 =================
function initStar(canvas, ui, labelsEl) {
  const { renderer, scene, camera, controls } = base(canvas);
  camera.position.set(0, 640, 1850); controls.target.set(0, 170, 0);
  controls.autoRotate = true; controls.autoRotateSpeed = .45; controls.minPolarAngle = .7; controls.maxPolarAngle = 1.35;
  canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });
  const root = new THREE.Group(); scene.add(root);
  let D = null, hits = [], flows = [], orbitR = null, orbitN = null, center = null, labels = [];

  function load(data) {
    D = data; clear(root); hits = []; flows = []; labels = [];
    const L = D.L, col = L.color;
    // 台座与中央硬币
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(120, 140, 40, 64), mat(mix(col, W, .82))); ped.position.y = -20; root.add(ped);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(132, 5, 12, 80), mat(mix(col, W, .5))); rim.rotation.x = Math.PI / 2; root.add(rim);
    center = buildCoin(D.c, col, 78); center.position.y = 130; root.add(center);
    // 内圈：近 20 日 CP 偏离环形柱
    D.dev.forEach((v, i) => {
      const a = i / 20 * Math.PI * 2 - Math.PI / 2, h = 14 + Math.abs(v) * 240, last = i === 19;
      const m = new THREE.Mesh(new RoundedBoxGeometry(26, h, 26, 2, 5), mat(mix(v >= 0 ? BULL : BEAR, W, last ? .05 : .35), last ? { emissive: v >= 0 ? BULL : BEAR, emissiveIntensity: .25 } : {}));
      m.position.set(Math.cos(a) * 205, h / 2, Math.sin(a) * 205); root.add(m);
      m.userData.tip = `<b>${D.days[40 + i]}</b> · 期权日报 CP 偏离 <b class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%</b>`; m.userData.di = 40 + i; hits.push(m);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(205, 2.5, 8, 120), mat('#e3e1fb')); ring.rotation.x = Math.PI / 2; root.add(ring);
    // 中圈：研报卡片
    orbitR = new THREE.Group(); root.add(orbitR);
    D.reports.forEach((x, i, arr) => {
      const up = x.p1 >= x.p0, c2 = up ? BULL : BEAR;
      const tex = textTex([[x.firm + ' · ' + x.d, `700 17px ${CN}`, '#8e91a7', 22, 34], [x.r0 === x.r1 ? '维持 ' + x.r1 : x.r0 + ' → ' + x.r1, `800 22px ${CN}`, '#16172a', 22, 68], [`${x.p0} → ${x.p1}`, `800 30px ${NUM}`, mix(c2, '#000', .18), 22, 112]], 220, 136, { strip: c2 });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(200, 124), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
      const a = i / arr.length * Math.PI * 2;
      card.position.set(Math.cos(a) * 340, 260 + (i % 2) * 70, Math.sin(a) * 340); orbitR.add(card);
      card.userData = { tip: `<b>研报</b> · ${x.firm} ${x.d}<br>${x.r0 === x.r1 ? '维持 ' + x.r1 : x.r0 + ' → ' + x.r1} · 目标价 ${x.p0} → <b>${x.p1}</b>`, di: x.di, face: true }; hits.push(card);
    });
    // 外圈：新闻
    orbitN = new THREE.Group(); root.add(orbitN);
    D.news.forEach((n, i, arr) => {
      const tex = textTex([[n.d + ' · ' + n.src, `700 16px ${CN}`, '#c27803', 22, 32], [clip(n.title, 13), `700 21px ${CN}`, '#16172a', 22, 66]], 300, 90, { strip: '#f5a314' });
      const chip = new THREE.Mesh(new THREE.PlaneGeometry(250, 75), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
      const a = i / arr.length * Math.PI * 2 + .4;
      chip.position.set(Math.cos(a) * 470, 40 + (i % 3) * 80, Math.sin(a) * 470); chip.userData = { tip: `<b>新闻</b> · ${n.d} ${n.src}<br>${n.title}`, di: n.di, face: true, ph: i }; orbitN.add(chip); hits.push(chip);
    });
    // 上下游
    const side = (arr, sx) => arr.slice(0, 5).forEach((x, i, a) => {
      const z = (i - (a.length - 1) / 2) * 190, y = 90 + (i % 2) * 60;
      const coin = buildCoin(x.c, CL.layers[x.c.li].color, 40); coin.position.set(sx * 700, y, z); root.add(coin);
      coin.userData = { tip: `<b>${sx < 0 ? '上游' : '下游'}</b> · ${x.c.t} ${x.c.name}<br>${x.rel} · 点击查看`, go: x.c.t, face: true }; hits.push(coin);
      const A = new THREE.Vector3(sx * 660, y, z), B = new THREE.Vector3(sx * 90, 130, 0), M = A.clone().lerp(B, .5); M.y += 200;
      const cv = sx < 0 ? new THREE.QuadraticBezierCurve3(A, M, B) : new THREE.QuadraticBezierCurve3(B, M, A);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 40, 2.6, 8), mat(mix(CL.layers[x.c.li].color, W, .55), { transparent: true, opacity: .6 })));
      const dots = [0, .5].map(t0 => { const d = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10), mat('#ffffff', { emissive: CL.layers[x.c.li].color, emissiveIntensity: 1.5 })); root.add(d); return { d, t: t0 }; });
      flows.push({ cv, dots });
    });
    side(D.ups, -1); side(D.downs, 1);
    // 文字标签
    labelsEl.innerHTML = '';
    const mk = (txt, pos, cls) => { const el = document.createElement('div'); el.className = 'st-lab ' + (cls || ''); el.innerHTML = txt; labelsEl.appendChild(el); labels.push({ el, pos }); };
    labels = labels.filter(l => l.el);
    mk('期权日报 · 近 20 日 CP 偏离', new THREE.Vector3(0, 30, 250), 'k-o');
    mk('研报 · 绕中圈', new THREE.Vector3(0, 440, 0), 'k-r');
    if (D.ups.length) mk('← 上游 · 供应方', new THREE.Vector3(-700, 330, 0), 'k-u');
    if (D.downs.length) mk('下游 · 客户 →', new THREE.Vector3(700, 330, 0), 'k-u');
  }

  // 悬停提示与点击
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let hov = null, downAt = null;
  const pick = e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, true)[0]; if (!h) return null; let o = h.object; while (o && !hits.includes(o)) o = o.parent; return o; };
  canvas.addEventListener('pointermove', e => { const o = pick(e); if (o !== hov) { hov = o; canvas.style.cursor = o ? 'pointer' : 'grab'; } ui.tip(o ? o.userData.tip : null, e.clientX, e.clientY); if (o && o.userData.di != null) ui.focusDay(o.userData.di); });
  canvas.addEventListener('pointerleave', () => ui.tip(null));
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) { const o = pick(e); if (o && o.userData.go) ui.go(o.userData.go); } downAt = null; });

  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; const far = camera.aspect < 1.2 ? 1.45 / Math.max(camera.aspect, .5) : 1; camera.position.set(0, 640 * far, 1850 * far); controls.target.set(0, 170, 0); camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  const tmp = new THREE.Vector3(), pq = new THREE.Quaternion();
  visLoop(canvas, (T, dt) => {
    if (!D) return;
    center.rotation.y = T * .6; center.position.y = 130 + Math.sin(T * 1.4) * 8;
    if (orbitR) orbitR.rotation.y = T * .12;
    if (orbitN) { orbitN.rotation.y = -T * .06; orbitN.children.forEach(ch => ch.position.y += Math.sin(T * 1.2 + ch.userData.ph) * .15); }
    // 卡片、新闻、上下游硬币始终正对镜头（抵消父级的旋转）
    hits.forEach(o => { if (!o.userData.face) return; o.parent.getWorldQuaternion(pq); o.quaternion.copy(pq.invert().multiply(camera.quaternion)); });
    flows.forEach(f => f.dots.forEach(o => { o.t = (o.t + dt * .35) % 1; o.d.position.copy(f.cv.getPoint(o.t)); }));
    controls.update(); renderer.render(scene, camera);
    const r = canvas.getBoundingClientRect();
    labels.forEach(l => { tmp.copy(l.pos).project(camera); l.el.style.transform = `translate(${(tmp.x + 1) / 2 * r.width}px, ${(1 - tmp.y) / 2 * r.height}px) translate(-50%, -50%)`; l.el.style.opacity = tmp.z < 1 ? 1 : 0; });
  });
  return { load };
}

// ================= 3D 时间轴 =================
function initLine(canvas, ui) {
  const { renderer, scene, camera, controls } = base(canvas);
  camera.position.set(-300, 380, 1000); controls.target.set(30, 170, 0);
  controls.minPolarAngle = .6; controls.maxPolarAngle = 1.4; controls.minAzimuthAngle = -.9; controls.maxAzimuthAngle = .9;
  const plate = new THREE.Mesh(new RoundedBoxGeometry(1060, 14, 340, 4, 7), mat('#f3f4f9', { roughness: .8 })); plate.position.y = -7; scene.add(plate);
  const root = new THREE.Group(); scene.add(root);
  let hits = [], D = null, born = 0;
  const X = i => -470 + i * 16;
  function load(data) {
    D = data; clear(root); hits = []; born = performance.now();
    const lo = Math.min(...D.K.map(k => k.l), D.tLo * .95), hi = Math.max(...D.K.map(k => k.h), D.tHi * 1.02), Y = v => 20 + (v - lo) / (hi - lo) * 300;
    D.K.forEach((k, i) => {
      const m = k.c >= k.o ? mat(mix(BULL, W, .12)) : mat(mix(BEAR, W, .12));
      const b = new THREE.Mesh(new RoundedBoxGeometry(11, Math.max(Math.abs(Y(k.c) - Y(k.o)), 3), 11, 2, 2), m); b.position.set(X(i), (Y(k.c) + Y(k.o)) / 2, 0); root.add(b);
      const w = new THREE.Mesh(new THREE.BoxGeometry(2, Y(k.h) - Y(k.l), 2), m); w.position.set(X(i), (Y(k.h) + Y(k.l)) / 2, 0); root.add(w);
      const v = new THREE.Mesh(new THREE.BoxGeometry(11, k.v * 40, 11), mat(mix(k.c >= k.o ? BULL : BEAR, W, .55))); v.position.set(X(i), k.v * 20, -110); root.add(v);
      b.userData = { tip: `<b>${k.d}</b> · 开 ${k.o.toFixed(1)} 收 ${k.c.toFixed(1)}（${((k.c / k.o - 1) * 100).toFixed(2)}%）`, di: i }; hits.push(b);
    });
    // 研报目标价区间：按每条研报阶梯变化的半透明带
    let cur = null; const seg = [];
    D.K.forEach((k, i) => { const rp = D.reports.filter(x => x.di <= i); if (rp.length) { const ps = rp.map(x => x.p1); cur = [Math.min(...ps), Math.max(...ps)]; } seg.push(cur); });
    seg.forEach((s, i) => { if (!s) return; const h = Math.max(Y(s[1]) - Y(s[0]), 4); const bx = new THREE.Mesh(new THREE.BoxGeometry(16, h, 6), new THREE.MeshBasicMaterial({ color: '#1296f0', transparent: true, opacity: .12, depthWrite: false })); bx.position.set(X(i), Y(s[0]) + h / 2, -40); root.add(bx); });
    // CP 比曲线：悬在前方
    const pts = D.cp.map((v, i) => new THREE.Vector3(X(i), 330 + (v - 1.1) * 160, 90));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 3, 8), mat('#5b4cff', { roughness: .4 })));
    // 事件小旗
    const stack = {};
    D.events.forEach(e => {
      const k = D.K[e.di], n = stack[e.di] = (stack[e.di] || 0) + 1;
      const top = Y(k.h) + 20 + n * 46;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, top - Y(k.h), 8), mat('#c9cbd8')); pole.position.set(X(e.di), (top + Y(k.h)) / 2, 18); root.add(pole);
      const tex = textTex([[EVL[e.k], `900 30px ${CN}`, '#fff', 15, 40]], 60, 60, { r: 14, edge: EVC[e.k] });
      const flag = new THREE.Mesh(new RoundedBoxGeometry(30, 30, 4, 2, 6), [mat(EVC[e.k]), mat(EVC[e.k]), mat(EVC[e.k]), mat(EVC[e.k]), mat(EVC[e.k]), mat(EVC[e.k])]);
      flag.position.set(X(e.di) + 15, top, 18); root.add(flag);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, toneMapped: false, map: (() => { const t = textTex([[EVL[e.k], `900 34px ${CN}`, EVC[e.k], 13, 44]], 60, 60, { r: 30 }); return t; })() }));
      face.position.set(X(e.di) + 15, top, 20.5); root.add(face);
      flag.userData = face.userData = { tip: `<b>${e.d}</b> · ${({ o: '期权日报', r: '研报日报', n: '新闻' })[e.k]}<br>${e.title}<br><span style="color:var(--ink3)">${e.sub}</span>`, di: e.di }; hits.push(flag, face);
    });
    root.children.forEach((m, i) => { m.userData.y0 = m.position.y; m.userData.dl = i * .6; m.scale.y = .001; });
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, false)[0]; ui.tip(h ? h.object.userData.tip : null, e.clientX, e.clientY); if (h) ui.focusDay(h.object.userData.di);
    canvas.style.cursor = h ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerleave', () => ui.tip(null));
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; if (camera.aspect < 1.2) camera.position.set(-380, 700, 2300); camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  visLoop(canvas, () => {
    const el = performance.now() - born;
    root.children.forEach(m => { const k = Math.min(Math.max((el - m.userData.dl) / 600, 0), 1), e = 1 - Math.pow(1 - k, 3); m.scale.y = Math.max(e, .001); m.position.y = m.userData.y0 * e; });
    controls.update(); renderer.render(scene, camera);
  });
  return { load };
}
// ================= 街区小景：这家公司在镇上的位置 =================
// 这家公司所在街区的一角：站点模型 + 同街区的公司楼（本公司那栋高亮），镜头慢慢摆动
async function initBlock(canvas, ui) {
  const T_ = await window.TOWN;
  const { renderer, scene, camera, controls } = base(canvas);
  camera.position.set(-260, 300, 560); controls.target.set(0, 60, 0);
  controls.enableRotate = false;
  const plate = new THREE.Mesh(new RoundedBoxGeometry(620, 14, 360, 4, 8), mat('#f4f5fa', { roughness: .8 })); plate.position.y = -7; scene.add(plate);
  const root = new THREE.Group(); scene.add(root);
  let D = null, st = null, mine = null, hits = [];
  function load(data) {
    D = data; clear(root); hits = []; st = null; mine = null;
    const L = D.L;
    // 站点模型放后排
    st = C.STATIONS[L.id](L.color); st.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const sz = new THREE.Box3().setFromObject(st.group).getSize(new THREE.Vector3());
    st.group.scale.multiplyScalar(Math.min(150 / Math.max(sz.x, sz.z, 1), 1)); st.group.position.set(-150, 0, -90); root.add(st.group);
    const pod = new THREE.Mesh(new RoundedBoxGeometry(190, 14, 190, 3, 10), mat(mix(L.color, W, .8))); pod.position.set(-150, 7, -90); root.add(pod); st.group.position.y = 14;
    // 公司楼：本公司放中间最前，其余同街区公司排两侧
    const members = L.members.slice().sort((a, b) => b.cap - a.cap).slice(0, 5);
    const order = [D.c, ...members.filter(m => m.t !== D.c.t)].slice(0, 5);
    order.forEach((c, k) => {
      const h = 24 + Math.min(Math.sqrt(c.cap) * 2.2, 92), me = c.t === D.c.t;
      const tw = T_.buildTower(c, L.color, h);
      const x = me ? 60 : 60 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 92, z = me ? 60 : 0 - (k > 2 ? 70 : 0);
      tw.position.set(x, 0, z); tw.scale.setScalar(me ? 1.15 : .9); root.add(tw);
      tw.userData = { tip: `<b>${c.t}</b> ${c.name}${me ? '（当前）' : ' · 点击查看'}`, go: me ? null : c.t }; hits.push(tw);
      if (me) { mine = tw; const ring = new THREE.Mesh(new THREE.TorusGeometry(44, 2.5, 10, 48), mat(L.color, { emissive: L.color, emissiveIntensity: .5 })); ring.rotation.x = Math.PI / 2; ring.position.set(x, 2, z); root.add(ring); }
    });
    // 一点街景
    for (let k = 0; k < 5; k++) { const t = T_.buildTreeSmall(k + D.c.li); t.position.set(-280 + k * 140, 0, 150); t.scale.setScalar(1.1); root.add(t); }
    const road = new THREE.Mesh(new THREE.BoxGeometry(620, 1.2, 40), mat('#dcdfeb')); road.position.set(0, .6, 120); root.add(road);
    ui.caption && ui.caption(`${L.name}街区 · 第 ${D.c.li + 1} 站`);
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, true)[0]; if (!h) return null; let o = h.object; while (o && !hits.includes(o)) o = o.parent; return o; };
  canvas.addEventListener('pointermove', e => { const o = pick(e); canvas.style.cursor = o && o.userData.go ? 'pointer' : 'default'; ui.tip(o ? o.userData.tip : null, e.clientX, e.clientY); });
  canvas.addEventListener('pointerleave', () => ui.tip(null));
  canvas.addEventListener('click', e => { const o = pick(e); if (o && o.userData.go) ui.go(o.userData.go); });
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  visLoop(canvas, (T, dt) => {
    if (!D) return;
    st && st.tick(T, dt);
    const a = Math.sin(T * .25) * .22; camera.position.set(Math.sin(a - .45) * 620, 300, Math.cos(a - .45) * 620); camera.lookAt(0, 60, 0);
    if (mine) mine.position.y = Math.sin(T * 1.6) * 2;
    renderer.render(scene, camera);
  });
  return { load };
}
return { initStar, initLine, initBlock };
})();
