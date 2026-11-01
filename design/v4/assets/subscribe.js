/* 潮信 · 订阅流程页交互（设计稿演示：不发送、不保存） */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const { mix } = ISO, deep = c => mix(c, '#000000', .18);
  const badge = (c, size, color) => `<span class="badge" style="--bs:${size}px;--c:${deep(color)};--ring:${mix(color, '#ffffff', .55)}"><i>${c.t[0]}</i>${c.logo ? `<img src="${c.logo}" alt="" onerror="this.remove()">` : ''}</span>`;
  const email = new URLSearchParams(location.search).get('email') || 'you@example.com';
  $$('#emailA, #emailB, #emailC').forEach(el => el.textContent = email);

  // 栏目勾选（和首页同一组）
  const COLS = [['期权日报', '收盘后', '#5b4cff', false], ['研报日报', '每日', '#1296f0', false], ['盘前汇总', '开盘前', '#f5a314', true], ['专栏报告', '不定期', '#ff6b2c', false]];
  const check = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="m5 12 5 5 9-10"/></svg>';
  $$('.col-pick').forEach(box => {
    box.innerHTML = COLS.map(([n, sub, c, soon]) => `<button type="button" class="cp-chip on" style="--c:${c}">${check}<b>${n}</b>${sub}${soon ? '<em>即将上线</em>' : ''}</button>`).join('');
    box.querySelectorAll('.cp-chip').forEach(b => b.onclick = () => b.classList.toggle('on'));
  });

  // 演示状态切换
  const seg = $('#stateSeg');
  if (seg) {
    const show = s => { $$('[data-state]').forEach(el => el.hidden = el.dataset.state !== s); seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.s === s)); dispatchEvent(new Event('resize')); if (s === 'confirmed') confetti(); };
    seg.querySelectorAll('button').forEach(b => b.onclick = () => show(b.dataset.s));
    const init = new URLSearchParams(location.search).get('state'); if (init) show(init);
  }
  function confetti() {
    const box = $('#confetti'); if (!box) return; box.innerHTML = '';
    const cols = ['#5b4cff', '#1296f0', '#f5a314', '#00a8c6', '#d23fd8', '#0fb57b'];
    for (let i = 0; i < 40; i++) { const e = document.createElement('i'); e.style.left = Math.random() * 100 + '%'; e.style.background = cols[i % cols.length]; e.style.animationDelay = Math.random() * .8 + 's'; e.style.transform = `rotate(${Math.random() * 360}deg)`; box.appendChild(e); }
  }
  const LIVE = location.protocol !== 'file:', qs = new URLSearchParams(location.search), tokenQ = qs.get('token');
  if (LIVE) { $$('.nav-right .disclaimer, .sb-demo').forEach(el => { el.hidden = true; }); }   // 站点下不显示"设计稿演示"字样和状态开关
  const COL_ID = { '期权日报': 'eve', '研报日报': 'rr', '盘前汇总': 'morn', '专栏报告': 'col', '周报': 'week' };
  const api = (path, body) => fetch(path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
  const chipsOf = box => [...box.querySelectorAll('.cp-chip.on b')].map(b => COL_ID[b.textContent.trim()]).filter(Boolean);
  const setChips = (box, cols) => box.querySelectorAll('.cp-chip').forEach(b => b.classList.toggle('on', cols.includes(COL_ID[b.querySelector('b').textContent.trim()])));
  const rs = $('#resend'); if (rs) rs.onclick = () => { rs.disabled = true;
    if (!LIVE) { $('#resendMsg').textContent = ' 已重新发送（演示）'; setTimeout(() => { rs.disabled = false; $('#resendMsg').textContent = ''; }, 4000); return; }
    api('/api/resend', { email }).then(j => { $('#resendMsg').textContent = j.ok ? (j.throttled ? ' 刚发过了，请过几分钟再试' : ' 已重新发送') : ' ' + (j.error || '失败'); }).catch(() => { $('#resendMsg').textContent = ' 发送失败'; }).finally(() => setTimeout(() => { rs.disabled = false; }, 4000)); };
  const save = $('#saveBtn'); if (save) save.onclick = () => {
    if (!LIVE || !tokenQ) { $('#saveMsg').textContent = '✓ 已保存（演示）'; setTimeout(() => $('#saveMsg').textContent = '', 2500); return; }
    const cols = chipsOf($('#pickC')); if ($('#pickC').parentElement.querySelector('.pf-row input:checked')) cols.push('week');
    const body = { token: tokenQ, cols, watch: [...document.querySelectorAll('#watch .w b')].map(b => b.textContent), deliverAt: document.querySelector('input[name=tm]:checked') === document.querySelectorAll('input[name=tm]')[1] ? 'morning' : 'close', format: document.querySelector('input[name=fm]:checked') === document.querySelectorAll('input[name=fm]')[1] ? 'text' : 'poster' };
    save.disabled = true; api('/api/prefs', body).then(j => { $('#saveMsg').textContent = j.ok ? '✓ 已保存' : (j.error || '失败'); }).catch(() => { $('#saveMsg').textContent = '保存失败'; }).finally(() => { save.disabled = false; setTimeout(() => $('#saveMsg').textContent = '', 2500); }); };
  // 站点下带 token 打开：拉偏好填进表单
  if (LIVE && tokenQ && $('#pickC')) api('/api/prefs?token=' + encodeURIComponent(tokenQ)).then(j => { if (!j.ok) return;
    $$('#emailA, #emailB, #emailC').forEach(el => el.textContent = j.email); setChips($('#pickC'), j.cols); setChips($('#pickB'), j.cols);
    if ($('#sinceC')) $('#sinceC').textContent = j.since; if ($('#sentC')) $('#sentC').textContent = j.sent;
    const wk = $('#pickC').parentElement.querySelector('.pf-row input'); if (wk) wk.checked = j.cols.includes('week');
    document.querySelectorAll('input[name=tm]')[j.deliverAt === 'morning' ? 1 : 0].checked = true; document.querySelectorAll('input[name=fm]')[j.format === 'text' ? 1 : 0].checked = true;
    window.__watchList && window.__watchList(j.watch); }).catch(() => {});

  // 关注的公司
  const watchEl = $('#watch');
  if (watchEl) {
    const list = LIVE && tokenQ ? [] : ['NVDA', 'MU', 'LITE'];
    window.__watchList = arr => { list.length = 0; arr.filter(t => CL.byT[t]).forEach(t => list.push(t)); render(); };
    const render = () => { watchEl.innerHTML = list.map(t => { const c = CL.byT[t]; return `<span class="w">${badge(c, 20, CL.layers[c.li].color)}<b>${t}</b><span style="color:var(--ink3)">${c.name}</span><button type="button" data-t="${t}" title="移除">✕</button></span>`; }).join('');
      watchEl.querySelectorAll('button').forEach(b => b.onclick = () => { list.splice(list.indexOf(b.dataset.t), 1); render(); }); };
    const add = () => { const q = $('#watchIn').value.trim().toUpperCase(); const hit = CL.companies.find(c => c.t === q || c.name.toUpperCase() === q || c.t.startsWith(q)); if (hit && !list.includes(hit.t)) list.push(hit.t); $('#watchIn').value = ''; render(); };
    $('#watchBtn').onclick = add; $('#watchIn').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    render();
  }

  // 退订页
  const un = $('#unsubBtn');
  if (un) {
    const showDone = () => { $('#ask').hidden = true; $('#done').hidden = false; dispatchEvent(new Event('resize')); dispatchEvent(new Event('cl-unsubscribed')); }; // 显示后触发一次 resize，让刚才 0×0 的画布拿到尺寸
    const KEEP = { '只保留周报': ['week'], '只保留期权日报': ['eve'], '暂停 30 天': [] };
    let keep = null;
    un.onclick = () => {
      if (!LIVE || !tokenQ) { showDone(); return; }
      un.disabled = true; api('/api/unsubscribe', { token: tokenQ, keep: keep || [] }).then(j => { if (!j.ok) throw new Error(j.error); if (j.state === 'kept') { un.textContent = '✓ 已改为只保留：' + j.cols.map(c => ({ eve: '期权日报', rr: '研报日报', morn: '盘前汇总', week: '周报', col: '专栏报告' })[c]).join('、'); } else { if (j.email) $$('#done p b').forEach(el => el.textContent = j.email); showDone(); } }).catch(e => { un.disabled = false; alert('没成功：' + (e.message || '稍后再试')); });
    };
    if (qs.get('done') === '1') showDone();
    const em = qs.get('email'); if (em) $$('#ask p b, #done p b').forEach(el => el.textContent = em);
    $$('.un-alt .chip').forEach(b => b.onclick = () => { $$('.un-alt .chip').forEach(x => x.classList.toggle('on', x === b)); keep = KEEP[b.textContent.trim()] || null; un.textContent = '确认：' + b.textContent; });
  }

  // 小更：各个状态里的吉祥物场景（复用订阅区的小更 + 邮筒）
  (async () => {
    const { initMascot } = await HERO;
    $$('canvas[id^="mascot"]').forEach(cv => initMascot(cv));
    // 已退订：小更飞走
    addEventListener('cl-unsubscribed', () => setTimeout(() => dispatchEvent(new Event('cl-subscribed')), 300));
  })();
})();
