/* 潮信 · 日报归档页：日历选日期、时间轴回放、海报 / 文字版 / 研报 / 周报切换、高清图下载 */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const A = ARCHIVE, P = POSTER, { mix } = ISO;
  const COLS = { eve: '期权日报', rr: '研报日报', week: '周报', morn: '盘前汇总' };
  const q = new URLSearchParams(location.search);
  const last = A.DATES[A.DATES.length - 1];
  const S = { col: COLS[q.get('col')] ? q.get('col') : 'eve', date: A.byDate[q.get('d')] ? q.get('d') : last, view: q.get('v') === 'text' ? 'text' : 'poster', month: '', playing: false, speed: 1, timer: 0 };
  S.month = S.date.slice(0, 7);
  const idx = () => A.DATES.indexOf(S.date);
  const moodK = d => A.pillK(d.mood);

  // ---------- 日历 ----------
  const MONTHS = [...new Set(A.DATES.map(d => d.slice(0, 7)))];
  const LEGEND = { eve: '<span><i class="bull"></i>偏乐观</span><span><i class="flat"></i>中性</span><span><i class="bear"></i>偏谨慎</span><span><i class="wk"></i>周报（周日）</span>',
    rr: '<span><i class="sky"></i>有研报日报</span><span><i class="wk"></i>周报（周日）</span>', week: '<span><i class="wk"></i>周报（周日发）· 点任意一天看那一周</span>', morn: '<span><i class="flat"></i>上线后每个交易日开盘前发</span>' };
  function renderCal() {
    const [y, m] = S.month.split('-').map(Number);
    $('#calTitle').textContent = `${y} 年 ${m} 月`;
    const mi = MONTHS.indexOf(S.month); $('#calPrev').disabled = mi <= 0; $('#calNext').disabled = mi >= MONTHS.length - 1;
    const first = new Date(Date.UTC(y, m - 1, 1)), off = (first.getUTCDay() + 6) % 7, n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    let h = ['一', '二', '三', '四', '五', '六', '日'].map(w => `<span class="wd">${w}</span>`).join('') + '<span></span>'.repeat(off);
    for (let d = 1; d <= n; d++) {
      const iso = `${S.month}-${String(d).padStart(2, '0')}`, day = A.byDate[iso], wk = A.weeks.find(w => w.sun === iso);
      let cls = 'd', dot = '';
      if (S.col === 'week') { const w = A.weekOf(iso); if (w) { cls += ' has'; if (w.mon === A.weekOf(S.date).mon) cls += ' on'; } if (wk) dot = '<i></i>', cls += ' wk'; }
      else if (day && S.col !== 'morn') { cls += ' has'; dot = `<i class="${S.col === 'eve' ? moodK(day) : 'sky'}"></i>`; if (iso === S.date) cls += ' on'; }
      else if (wk) { cls += ' wk'; dot = '<i></i>'; }
      if (iso === '2026-10-31') cls += ' today';
      h += `<span class="${cls}" data-d="${iso}" title="${day ? `${day.md} ${day.mood} · ${day.h2}` : wk ? `${wk.label} 周报` : ''}">${d}${dot}</span>`;
    }
    $('#calGrid').innerHTML = h;
    $('#calLegend').innerHTML = LEGEND[S.col];
    $$('#calGrid .has, #calGrid .wk').forEach(el => el.onclick = () => {
      const iso = el.dataset.d;
      if (A.byDate[iso]) { if (S.col === 'morn') switchCol('eve'); setDate(iso); }
      else { const wk = A.weeks.find(w => w.sun === iso); if (wk) { switchCol('week'); setDate(wk.fri); } }
    });
  }
  $('#calPrev').onclick = () => { S.month = MONTHS[MONTHS.indexOf(S.month) - 1]; renderCal(); };
  $('#calNext').onclick = () => { S.month = MONTHS[MONTHS.indexOf(S.month) + 1]; renderCal(); };

  // ---------- 时间轴 ----------
  function renderBars() {
    const max = Math.max(...A.days.map(d => Math.abs(d.dev))) || 1;
    $('#rpBars').innerHTML = '<span class="zero"></span>' + A.days.map((d, i) => `<i class="${moodK(d)}" style="height:${Math.max(8, Math.abs(d.dev) / max * 100)}%" data-i="${i}" data-l="${d.md}" title="${d.md} ${d.mood} · CP ${A.pct(d.dev)}"></i>`).join('') +
      A.days.map((d, i) => A.dow(d.date) === 1 && i % 2 === 0 ? `<em style="left:${(i + .5) / A.days.length * 100}%">${d.md}</em>` : '').join('');
    $$('#rpBars i').forEach(el => el.onclick = () => setDate(A.DATES[+el.dataset.i]));
    $('#rpRange').max = A.DATES.length - 1;
  }
  function syncBars() { $$('#rpBars i').forEach((el, i) => el.classList.toggle('on', i === idx())); $('#rpRange').value = idx(); $('#rpDate').textContent = `${A.md(S.date)} ${A.wd(S.date)}`; }
  $('#rpRange').oninput = e => setDate(A.DATES[+e.target.value]);
  function play(on) {
    S.playing = on; $('#rpPlay').textContent = on ? '❚❚ 暂停' : '▶ 播放'; clearInterval(S.timer);
    if (!on) return;
    if (idx() >= A.DATES.length - 1) setDate(A.DATES[0]);
    S.timer = setInterval(() => { const i = idx(); if (i >= A.DATES.length - 1) return play(false); setDate(A.DATES[i + 1]); }, 1500 / S.speed);
  }
  $('#rpPlay').onclick = () => play(!S.playing);
  $$('#rpSpeed button').forEach(b => b.onclick = () => { S.speed = +b.dataset.s; $$('#rpSpeed button').forEach(x => x.classList.toggle('on', x === b)); if (S.playing) play(true); });
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); else if (e.key === ' ') { e.preventDefault(); play(!S.playing); } });
  const step = n => { const i = idx() + n; if (i >= 0 && i < A.DATES.length) setDate(A.DATES[i]); };

  // ---------- 统计（固定规则，由代码算） ----------
  function renderStat() {
    const i = idx(), d = A.days[i];
    let run = 1; for (let k = i - 1; k >= 0 && A.days[k].mood === d.mood; k--) run++;
    const mon = A.days.filter(x => x.date.slice(0, 7) === S.date.slice(0, 7));
    const c = { 偏乐观: 0, 中性: 0, 偏谨慎: 0 }; mon.forEach(x => c[x.mood]++);
    const hot = {}; mon.forEach(x => hot[x.hot.seg] = (hot[x.hot.seg] || 0) + 1);
    const top = Object.entries(hot).sort((a, b) => b[1] - a[1])[0];
    const seen = {}; mon.forEach(x => x.picks.forEach(p => seen[p.t] = (seen[p.t] || 0) + 1));
    const topT = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 3);
    $('#rpStat').innerHTML = `<div class="row"><span>到 ${d.md} 为止</span><b>连续 <span class="num">${run}</span> 天${d.mood}</b></div>
      <div class="mix"><i class="bull" style="flex:${c.偏乐观}"></i><i class="flat" style="flex:${c.中性}"></i><i class="bear" style="flex:${c.偏谨慎}"></i></div>
      <div class="row"><span>${+S.date.slice(5, 7)} 月 ${mon.length} 个交易日</span><span>偏乐观 <b class="num">${c.偏乐观}</b> · 中性 <b class="num">${c.中性}</b> · 偏谨慎 <b class="num">${c.偏谨慎}</b></span></div>
      <div class="row"><span>最热环节出现最多</span><b>${top ? `${top[0]} · ${top[1]} 天` : '—'}</b></div>
      <div class="row"><span>进重点最多</span><b class="num">${topT.map(([t, n]) => `${t} ${n}`).join(' · ')}</b></div>`;
  }

  // ---------- 环节热度轮动（DOM 固定，只改宽度，回放时有动画） ----------
  function buildHeat() {
    $('#arHeat').innerHTML = `<div class="h"><b>AI 环节热度</b><span>热度 = 成员量倍数中位数 · 回放时看资金在环节间怎么轮动</span></div>` +
      A.SEGS.map(s => `<div class="s" data-seg="${s.n}"><div class="n"><span>${s.n}</span><b>–</b></div><div class="bar"><i style="width:0;background:linear-gradient(90deg,${mix(P.SEG[s.n], '#ffffff', .32)},${P.SEG[s.n]})"></i></div><small>–</small></div>`).join('');
  }
  function syncHeat() {
    const d = A.byDate[S.date], wk = A.weekOf(S.date), useWeek = S.col === 'week';
    $('#arHeat').hidden = S.col === 'rr' || S.col === 'morn';
    $('#arHeat .h span').textContent = useWeek ? `周均热度 · ${wk.range}` : `热度 = 成员量倍数中位数 · 回放时看资金在环节间怎么轮动`;
    const rows = useWeek ? wk.segs.map(s => [s.n, s.heat, '', s.dev]) : d.heat;
    const hot = rows.slice().sort((a, b) => b[1] - a[1])[0][0];
    $$('#arHeat .s').forEach(el => { const r = rows.find(x => x[0] === el.dataset.seg); el.classList.toggle('hot', r[0] === hot); el.querySelector('.n b').textContent = `${r[1].toFixed(1)}x`; el.querySelector('.bar i').style.width = `${Math.min(100, r[1] / 3 * 100)}%`; const sm = el.querySelector('small'); sm.textContent = `CP ${A.pct(r[3])}`; sm.className = r[3] >= 0 ? 'up' : 'down'; });
  }

  // ---------- 右侧：头 + 正文 ----------
  function renderHead() {
    const d = A.byDate[S.date], i = idx(), wk = A.weekOf(S.date);
    const nav = `<div class="ar-nav"><button type="button" id="prevD" title="上一期（←）" ${i <= 0 ? 'disabled' : ''}>‹</button><button type="button" id="nextD" title="下一期（→）" ${i >= A.DATES.length - 1 ? 'disabled' : ''}>›</button></div>`;
    let tag, h2, sub, act = '';
    if (S.col === 'eve') { tag = '<span class="tag">期权日报</span>'; h2 = `${d.md} <small>${d.wd}</small><span class="pill ${moodK(d)}">大盘${d.mood}</span>`; sub = d.h2 + ' · 北京时间 15:40 送达 · 海报署名 KZG 期权 Pro';
      act = `<div class="seg-ctl sm" id="viewSeg"><button data-v="poster" class="${S.view === 'poster' ? 'on' : ''}">海报</button><button data-v="text" class="${S.view === 'text' ? 'on' : ''}">文字版</button></div><button class="btn ghost" type="button" id="copyBtn">复制文字版</button><button class="btn accent" type="button" id="dlBtn">下载高清图</button><span class="ar-msg" id="msg"></span>`; }
    else if (S.col === 'rr') { const R = A.rr(S.date); tag = '<span class="tag" style="--tc-deep:#0b77c0;--tc-bg:#e7f4fe">研报日报</span>'; h2 = `${d.md} <small>${d.wd}</small>`; sub = `今日 ${R.total} 条评级 / 目标价调整，摘录 ${R.items.length} 条 · 只放摘要，不放原文`; }
    else if (S.col === 'week') { tag = '<span class="tag" style="--tc-deep:#7a3ec9;--tc-bg:#f3e8ff">期权周报</span>'; h2 = `${wk.label} <small>${wk.range}</small><span class="pill ${A.pillK(wk.dir)}">本周${wk.dir}</span>`; sub = `${A.md(wk.sun)}（周日）上午送达 · 汇总 ${wk.days.length} 个交易日`; }
    else { tag = '<span class="tag" style="--tc-deep:#b45309;--tc-bg:#fff4dc">盘前汇总</span>'; h2 = `即将上线`; sub = '上线后每个交易日美东 09:00 送达，这里会按日归档'; }
    $('#arHead').innerHTML = `<div class="t">${tag}<h2>${h2}</h2><div class="sub">${sub}</div></div><div class="act">${act}${nav}</div>`;
    $('#prevD').onclick = () => step(-1); $('#nextD').onclick = () => step(1);
    $$('#viewSeg button').forEach(b => b.onclick = () => { S.view = b.dataset.v; renderHead(); renderBody(); pushURL(); });
    const copy = $('#copyBtn'); if (copy) copy.onclick = async () => { const el = document.createElement('div'); el.innerHTML = A.text(S.date); try { await navigator.clipboard.writeText(el.innerText.trim()); flash('已复制文字版'); } catch { flash('浏览器不允许复制，请手动选择'); } };
    const dl = $('#dlBtn'); if (dl) dl.onclick = () => download(dl);
  }
  function flash(t) { const m = $('#msg'); if (!m) return; m.textContent = t; setTimeout(() => m.textContent = '', 2200); }
  function renderBody() {
    const body = $('#arBody'), d = A.byDate[S.date], wk = A.weekOf(S.date);
    body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
    if (S.col === 'eve') body.innerHTML = S.view === 'poster' ? `<div class="pz" id="pz">${P.render(d)}</div>` : `<div class="card">${A.text(S.date)}</div>`;
    else if (S.col === 'rr') body.innerHTML = `<div class="card">${A.rrPage(S.date)}</div>`;
    else if (S.col === 'week') body.innerHTML = `<div class="card">${A.weekPage(wk.mon)}</div>`;
    else body.innerHTML = `<div class="card ar-soon"><div class="lead"><div><h3>盘前汇总还在准备中</h3><p>隔夜要闻、盘前异动的 AI 链个股、当天财报与宏观日程，开盘前 5 分钟看完。先看一张样张：</p></div><a class="btn accent" href="index.html#subscribe">上线时第一个收到</a></div><div class="sheet">${A.peek.morn()}</div></div>`;
    fitPoster();
    $$('#arBody .ar-wk-days a').forEach(a => a.onclick = e => { e.preventDefault(); switchCol('eve'); setDate(a.getAttribute('href').split('d=')[1]); });
  }
  // 海报按容器宽度等比缩放（1080 → 容器宽），高度跟着实际内容走
  function fitPoster() {
    const pz = $('#pz'); if (!pz) return; const kp = pz.querySelector('.kp'); const s = Math.min(1, pz.clientWidth / 1080);
    kp.style.transform = `scale(${s})`; pz.style.height = `${kp.offsetHeight * s}px`;
  }
  addEventListener('resize', fitPoster);

  // ---------- 高清图下载（html-to-image，按需加载；用未缩放的副本导出） ----------
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('加载失败')); document.head.appendChild(s); });
  async function download(btn) {
    const label = btn.textContent; btn.textContent = '生成中…'; btn.disabled = true;
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:-3000px;top:0;width:1080px;background:#fff'; box.innerHTML = P.render(A.byDate[S.date]); document.body.appendChild(box);
    try {
      if (!window.htmlToImage) await loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
      const blob = await window.htmlToImage.toBlob(box.firstElementChild, { pixelRatio: 2, skipFonts: true, backgroundColor: '#ffffff' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `chaoxin-daily-${S.date}.png`; document.body.appendChild(a); a.click(); a.remove(); // 文件名用 ASCII
      setTimeout(() => URL.revokeObjectURL(url), 4000); flash('已生成 2160 宽高清图');
    } catch (e) { console.warn(e); flash('高清图生成失败，请检查网络后重试'); }
    finally { box.remove(); btn.textContent = label; btn.disabled = false; }
  }

  // ---------- 状态切换 ----------
  function pushURL() { const u = new URL(location.href); u.searchParams.set('col', S.col); u.searchParams.set('d', S.date); if (S.col === 'eve' && S.view === 'text') u.searchParams.set('v', 'text'); else u.searchParams.delete('v'); history.replaceState(null, '', u); }
  function setDate(date) { if (!A.byDate[date]) return; S.date = date; const m = date.slice(0, 7); if (m !== S.month) S.month = m; renderCal(); syncBars(); renderStat(); renderHead(); syncHeat(); renderBody(); pushURL(); document.title = `${COLS[S.col]} · ${A.md(date)} · 潮信归档`; }
  function switchCol(col) { S.col = col; $$('#colSeg button').forEach(b => b.classList.toggle('on', b.dataset.col === col)); }
  $$('#colSeg button').forEach(b => b.onclick = () => { switchCol(b.dataset.col); setDate(S.date); });

  renderBars(); buildHeat(); switchCol(S.col); setDate(S.date);
})();
