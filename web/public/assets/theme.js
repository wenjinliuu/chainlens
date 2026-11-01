/*
 * 潮信 · 主题切换（实验性深色模式）
 * 放在 <head> 里最早执行：读 localStorage 的 cx-theme，给 <html> 打 data-theme，避免闪一下白。
 * 浅色是默认和主推；深色只是可切换。海报（.kp）和 3D 场景始终保持浅色。
 * 首页切到深色时，产业镇与首屏一起进入夜晚模式（LP.setNight）。
 */
(function () {
  const KEY = 'cx-theme';
  const get = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const set = (t, save = true) => {
    if (t === 'dark') document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    if (save) try { localStorage.setItem(KEY, t); } catch {}
    document.querySelectorAll('.nav-theme').forEach(b => { b.innerHTML = window.ICON ? ICON.svg(t === 'dark' ? 'sun' : 'moon', 17) : (t === 'dark' ? '☀' : '☾'); b.title = t === 'dark' ? '切回浅色' : '试试深色（实验性）'; });
    if (window.LP && LP.setNight) LP.setNight(t === 'dark');
  };
  try { if (localStorage.getItem(KEY) === 'dark') set('dark', false); } catch {}
  addEventListener('DOMContentLoaded', () => {
    const nr = document.querySelector('.nav-right');
    if (nr) { const b = document.createElement('button'); b.type = 'button'; b.className = 'nav-theme'; b.setAttribute('aria-label', '切换深色 / 浅色'); b.onclick = () => set(get() === 'dark' ? 'light' : 'dark'); nr.prepend(b); }
    set(get(), false);
  });
  window.CX_THEME = { get, set, toggle: () => set(get() === 'dark' ? 'light' : 'dark') };
})();
