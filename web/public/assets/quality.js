/*
 * 潮信 · 画质分级
 * 按设备给 3D 场景定档：high（桌面）/ medium（平板、普通手机）/ low（老手机、减少动态效果）。
 * 运行时如果帧率持续偏低会自动降一档（最多降到 low）。各场景通过 window.Q 读取参数：
 *   Q.tier      档位
 *   Q.dpr       渲染像素比上限
 *   Q.shadows   是否开阴影；Q.shadowMap 阴影贴图尺寸
 *   Q.density   行人 / 车辆 / 海鸥等数量的比例（1 = 全量）
 *   Q.water     海面网格细分比例
 *   Q.onChange(fn) 档位变化时回调（场景据此关阴影、降 DPR）
 * 用 ?q=low|medium|high 可以强制指定，方便调试。
 */
(function () {
  const params = new URLSearchParams(location.search);
  const forced = params.get('q');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 500;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  let tier = forced || (reduce ? 'low' : (touch && small) ? (cores >= 6 && mem >= 4 ? 'medium' : 'low') : touch ? 'medium' : (cores <= 2 || mem <= 2) ? 'medium' : 'high');
  const TIERS = {
    high: { dpr: 2, shadows: true, shadowMap: 4096, density: 1, water: 1 },
    medium: { dpr: 1.5, shadows: true, shadowMap: 2048, density: .6, water: .6 },
    low: { dpr: 1, shadows: false, shadowMap: 1024, density: .35, water: .4 },
  };
  const listeners = [];
  const Q = {
    get tier() { return tier; },
    reduce,
    apply() { Object.assign(Q, TIERS[tier]); return Q; },
    lower() { const next = tier === 'high' ? 'medium' : tier === 'medium' ? 'low' : null; if (!next) return false; tier = next; Q.apply(); listeners.forEach(f => f(tier)); console.info('[潮信] 帧率偏低，画质降为', tier); return true; },
    onChange(f) { listeners.push(f); },
    // 帧率监测：场景的主循环每帧调用一次 Q.tick(dt)；连续 4 秒平均低于 24 帧就降档（强制指定档位时不降）
    _t0: 0, _n: 0, _badMs: 0,
    tick() { // 用真实时间计帧率（主循环里的 dt 有上限，不能用来测）；低于 24 帧累计 3 秒就降档
      if (forced) return;
      const now = performance.now(); if (!Q._t0) { Q._t0 = now; return; }
      Q._n++;
      const span = now - Q._t0;
      if (span >= 1000) { const fps = Q._n * 1000 / span; Q._badMs = fps < 24 ? Q._badMs + span : 0; Q._t0 = now; Q._n = 0; if (Q._badMs >= 3000) { Q._badMs = 0; Q.lower(); } }
    },
  };
  Q.apply();
  window.Q = Q;
})();
