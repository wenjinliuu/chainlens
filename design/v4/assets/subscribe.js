/* 潮信 · 订阅流程页交互（设计稿演示：不发送、不保存） */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const { mix } = ISO, deep = c => mix(c, '#000000', .18);
  const badge = (c, size, color) => `<span class="badge" style="--bs:${size}px;--c:${deep(color)};--ring:${mix(color, '#ffffff', .55)}"><i>${c.t[0]}</i>${c.logo ? `<img src="${c.logo}" alt="" onerror="this.remove()">` : ''}</span>`;
  const email = new URLSearchParams(location.search).get('email') || 'you@example.com';
  $$('#emailA, #emailB, #emailC').forEach(el => el.textContent = email);

  // 栏目勾选（和首页同一组）
  const COLS = [['期权日报', '收盘后', '#5b4cff', false], ['研报日报', '每日', '#1296f0', false], ['盘前汇总', '开盘前', '#f5a314', true]];
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
  const rs = $('#resend'); if (rs) rs.onclick = () => { $('#resendMsg').textContent = ' 已重新发送（演示）'; rs.disabled = true; setTimeout(() => { rs.disabled = false; $('#resendMsg').textContent = ''; }, 4000); };
  const save = $('#saveBtn'); if (save) save.onclick = () => { $('#saveMsg').textContent = '✓ 已保存（演示）'; setTimeout(() => $('#saveMsg').textContent = '', 2500); };

  // 关注的公司
  const watchEl = $('#watch');
  if (watchEl) {
    const list = ['NVDA', 'MU', 'LITE'];
    const render = () => { watchEl.innerHTML = list.map(t => { const c = CL.byT[t]; return `<span class="w">${badge(c, 20, CL.layers[c.li].color)}<b>${t}</b><span style="color:var(--ink3)">${c.name}</span><button type="button" data-t="${t}" title="移除">✕</button></span>`; }).join('');
      watchEl.querySelectorAll('button').forEach(b => b.onclick = () => { list.splice(list.indexOf(b.dataset.t), 1); render(); }); };
    const add = () => { const q = $('#watchIn').value.trim().toUpperCase(); const hit = CL.companies.find(c => c.t === q || c.name.toUpperCase() === q || c.t.startsWith(q)); if (hit && !list.includes(hit.t)) list.push(hit.t); $('#watchIn').value = ''; render(); };
    $('#watchBtn').onclick = add; $('#watchIn').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    render();
  }

  // 退订页
  const un = $('#unsubBtn');
  if (un) {
    un.onclick = () => { $('#ask').hidden = true; $('#done').hidden = false; dispatchEvent(new Event('resize')); dispatchEvent(new Event('cl-unsubscribed')); }; // 显示后触发一次 resize，让刚才 0×0 的画布拿到尺寸
    $$('.un-alt .chip').forEach(b => b.onclick = () => { $$('.un-alt .chip').forEach(x => x.classList.toggle('on', x === b)); un.textContent = '确认：' + b.textContent; });
  }

  // 小更：各个状态里的吉祥物场景（复用订阅区的小更 + 邮筒）
  (async () => {
    const { initMascot } = await HERO;
    $$('canvas[id^="mascot"]').forEach(cv => initMascot(cv));
    // 已退订：小更飞走
    addEventListener('cl-unsubscribed', () => setTimeout(() => dispatchEvent(new Event('cl-subscribed')), 300));
  })();
})();
