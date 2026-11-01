/*
 * 潮信 · 线性图标（24×24，描边 2，圆头）
 * 替换界面骨架里的 emoji：⌘K 面板、样张标题、产业镇气泡、主题按钮、吐司……
 * 用法：ICON.svg('truck', 18) 返回 <svg> 字符串；颜色跟随 currentColor。
 * 海报与邮件正文里的符号不在这里管。
 */
window.ICON = (() => {
  const P = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sunrise: '<path d="M4 17a8 8 0 0 1 16 0"/><path d="M2 21h20M12 3v3M4.2 9.2l2.1 2.1M19.8 9.2l-2.1 2.1M8 21a4 4 0 0 1 8 0"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    half: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>',
    bars: '<rect x="4" y="11" width="4" height="9" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="8" width="4" height="12" rx="1"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9.5 13h5M9.5 17h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    week: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M7 14h3M14 14h3M7 18h3"/>',
    factory: '<path d="M3 21V10l5 3v-3l5 3v-3l5 3v8H3Z"/><path d="M17 10V4h3v6"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
    trend: '<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>',
    cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h13v15"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5M3 17.5l9 5 9-5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 8 9 6 9-6"/>',
    sliders: '<path d="M4 7h8M16 7h4M4 17h4M12 17h8M4 12h16"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    door: '<path d="M13 3H5v18h8M17 8l4 4-4 4M9 12h12"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    truck: '<path d="M3 7h11v10H3zM14 11h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    flat: '<path d="M3 15V9h5l2 3h11v3H3z"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/>',
    bus: '<rect x="4" y="4" width="16" height="15" rx="3"/><path d="M4 11h16M8 15h.01M16 15h.01M7 19v2M17 19v2"/>',
    car: '<path d="M5 16l1.5-5h11L19 16"/><path d="M3 16h18v3H3z"/><circle cx="7" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
    forklift: '<path d="M3 17V9h7l3 4v4"/><path d="M13 17h2M16 5v13h5"/><circle cx="6" cy="19" r="2"/><circle cx="13" cy="19" r="2"/>',
    worker: '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2 15h20M12 7v4"/>',
    arm: '<path d="M4 20h8M8 20V13l5-5 3 3-5 5"/><circle cx="16" cy="8" r="2.5"/>',
    walker: '<circle cx="12" cy="5" r="2"/><path d="M12 7v6l-3 7M12 13l3 7M9 10l3-2 3 2"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 19v2M15 19v2"/>',
    billboard: '<rect x="3" y="4" width="18" height="11" rx="2"/><path d="M9 15l-2 6M15 15l2 6M12 15v6"/>',
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 11h8"/>',
    lighthouse: '<path d="M9 21l1-13h4l1 13H9z"/><path d="M8 8h8M12 2v2M4 6l3 1M20 6l-3 1"/>',
    bird: '<path d="M3 12c4-6 9-7 13-5l5-2-2 4c1 2 1 4 0 6-5 2-11 1-16-3Z"/>',
    blimp: '<ellipse cx="11" cy="10" rx="9" ry="5"/><path d="M19 7l3-2v8l-3-2M9 15v3h5v-3"/>',
    sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    party: '<path d="M4 20l4-12 8 8-12 4Z"/><path d="M14 4l1 2M19 7l-2 1M18 13l2 1M12 8l2-2"/>',
    mailbox: '<path d="M4 10a4 4 0 0 1 8 0v8H4z"/><path d="M8 6h8a4 4 0 0 1 4 4v8h-8M14 10h4M10 18v3"/>',
    wave: '<path d="M3 10c3-4 6-4 9 0s6 4 9 0"/><path d="M3 17c3-4 6-4 9 0s6 4 9 0"/>',
    play: '<path d="M7 5v14l11-7z" fill="currentColor"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
    column: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    rocket: '<path d="M12 3c3 2 5 6 5 10l-5 4-5-4c0-4 2-8 5-10Z"/><path d="M7 13l-3 3 2 2 3-1M17 13l3 3-2 2-3-1M10 20l2 2 2-2"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8 11l8-5M8 13l8 5"/>',
  };
  const svg = (n, s = 18, cls = '') => `<svg class="ico ico-${n}${cls ? ' ' + cls : ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.sparkle}</svg>`;
  return { P, svg, has: n => !!P[n] };
})();
