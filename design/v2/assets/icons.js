/* ChainLens v2 · 自绘线性图标（24×24，描边 1.5，currentColor） */
(function () {
  const P = {
    bolt: '<path d="M13.5 2.5 5 13.2h6.2L10 21.5l8.6-11h-6.3l1.2-8Z"/>',
    litho: '<path d="M12 2.5v3"/><path d="M7 5.5h10l-2.6 5.2H9.6L7 5.5Z"/><path d="m9.6 10.7-2.4 7.8"/><path d="m14.4 10.7 2.4 7.8"/><path d="M4 18.5h16"/><path d="M8.5 21.5h7"/>',
    wafer: '<circle cx="12" cy="12" r="9"/><path d="M7 7.5h10M5.2 10.5h13.6M5.2 13.5h13.6M7 16.5h10"/><path d="M9 4.5v15M12 3v18M15 4.5v15"/><path d="M10.6 20.9h2.8"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1.6"/><rect x="9.2" y="9.2" width="5.6" height="5.6" rx=".6"/><path d="M9 2.5V6M12 2.5V6M15 2.5V6M9 18v3.5M12 18v3.5M15 18v3.5M2.5 9H6M2.5 12H6M2.5 15H6M18 9h3.5M18 12h3.5M18 15h3.5"/>',
    memory: '<path d="m12 3 8.5 4.2L12 11.4 3.5 7.2 12 3Z"/><path d="m3.5 11.2 8.5 4.2 8.5-4.2"/><path d="m3.5 15.2 8.5 4.2 8.5-4.2"/>',
    fiber: '<path d="M2.5 8c4 0 5 8 9.5 8s5.5-8 9.5-8"/><path d="M2.5 12h19" opacity=".55"/><path d="M2.5 16c4 0 5-8 9.5-8s5.5 8 9.5 8"/><circle cx="2.5" cy="12" r=".9"/><circle cx="21.5" cy="12" r=".9"/>',
    rack: '<rect x="5" y="2.5" width="14" height="19" rx="1.6"/><path d="M5 8.5h14M5 14.5h14"/><path d="M8 5.5h5M8 11.5h5M8 17.5h5"/><circle cx="16" cy="5.5" r=".7"/><circle cx="16" cy="11.5" r=".7"/><circle cx="16" cy="17.5" r=".7"/>',
    dc: '<path d="M3 21.5h18"/><path d="M5 21.5V8l7-4.5L19 8v13.5"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h7"/>',
    cloud: '<path d="M7 18.5h10.2a4.3 4.3 0 0 0 .6-8.56A6 6 0 0 0 6.3 9.2 4.7 4.7 0 0 0 7 18.5Z"/><path d="M9.5 14.5h5M12 12v5"/>',
    pulse: '<path d="M2.5 12h4l2.5-6 4 12 2.5-6h6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20.5 20.5-4.8-4.8"/>',
    play: '<path d="M7 4.5v15l12.5-7.5L7 4.5Z"/>',
    pause: '<path d="M8 4.5v15M16 4.5v15"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  window.icon = function (name, size, extra) {
    return '<svg class="ic" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + P[name] + '</svg>';
  };
})();
