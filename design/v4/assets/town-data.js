/*
 * 潮信 · 产业镇每日数据装载（站点模式）
 * 站点下读 /data/town/latest.json（pipeline 每日产出，契约见 docs/town-plan.md 第 4 节），把当天的环节热度、公司当日涨跌 / 量倍数 / 信号、
 * 大盘情绪原地写进 CL（data.js）里，小镇建场景时就按真实数据升旗、定底座高度、定天气。
 * 设计稿 file:// 下不读，保持内置示例。island.js 等 TOWN_READY 再建镇。
 */
(function () {
  function apply(t) {
    if (!t || !window.CL) return false;
    const D = CL.days.length - 1;
    if (t.layerHeat) CL.layers.forEach(l => { if (typeof t.layerHeat[l.id] === 'number') l.heat[D] = t.layerHeat[l.id]; });
    if (t.companies) CL.companies.forEach(c => { const x = t.companies[c.t]; if (!x) return; if (typeof x.chg === 'number') c.chg[D] = x.chg; if (typeof x.vx === 'number') c.vx[D] = x.vx; if (Array.isArray(x.signals)) c.signals = x.signals.slice(); });
    if (t.towers) Object.entries(t.towers).forEach(([sym, info]) => { const c = CL.byT[sym]; if (!c) return; if (info.flag && !c.signals.includes('o')) c.signals.push('o'); if (info.target && !c.signals.includes('r')) c.signals.push('r'); });
    if (t.mood && CL.moods) CL.moods[D] = t.mood;
    if (t.date && CL.days) CL.days[D] = t.date.slice(5);
    window.TOWN_DATA = t; return true;
  }
  window.TOWN_READY = (async () => {
    if (typeof location === 'undefined' || location.protocol === 'file:' || window.CX_NO_JSON) return null;
    try { const r = await fetch(window.CX_TOWN_URL || '/data/town/latest.json', { cache: 'no-cache' }); if (r.ok) { apply(await r.json()); return window.TOWN_DATA; } }
    catch (e) { console.warn('town/latest.json 不可用，用内置示例', e); }
    return null;
  })();
  window.TOWN_APPLY = apply;
})();
