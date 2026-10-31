/*
 * ChainLens v2 · AI 产业链示例数据
 * - 分层与公司归属按公开业务整理；上下游连线为【示意】，正式版以手工维护的 chain.json 为准
 * - 市值为【量级示意】（十亿美元），只用于决定节点大小
 * - 每日涨跌、信号全部为【虚构】，仅用于展示交互
 */
(function () {
  // 层：从左到右 = 从上游到下游；icon 对应 icons.js 里的自绘图标
  const layers = [
    { id: 'power', name: '能源与原材料', en: 'POWER · MATERIALS', color: '#FFB547', icon: 'bolt' },
    { id: 'equip', name: '半导体设备', en: 'EQUIPMENT', color: '#C38BFF', icon: 'litho' },
    { id: 'fab', name: '晶圆代工与封装', en: 'FOUNDRY · PACKAGING', color: '#8C9BFF', icon: 'wafer' },
    { id: 'chip', name: '算力芯片', en: 'ACCELERATORS', color: '#3FD3FF', icon: 'chip' },
    { id: 'mem', name: '存储', en: 'MEMORY · HBM', color: '#6AB0FF', icon: 'memory' },
    { id: 'net', name: '网络与光模块', en: 'NETWORK · OPTICS', color: '#9DEBF7', icon: 'fiber' },
    { id: 'server', name: '服务器与机房设备', en: 'SERVERS · COOLING', color: '#EC8CF7', icon: 'rack' },
    { id: 'dc', name: '数据中心与算力租赁', en: 'DATA CENTERS', color: '#FFD27A', icon: 'dc' },
    { id: 'cloud', name: '云厂商与 AI 应用', en: 'CLOUD · AI APPS', color: '#E9EEFF', icon: 'cloud' },
  ];

  // [代码, 中文名, 层, 市值量级, 一句话简介]
  const raw = [
    ['CEG', 'Constellation', 'power', 110, '美国最大的核电运营商之一，向数据中心长期供电'],
    ['VST', 'Vistra', 'power', 65, '综合发电与零售电力公司，核电与燃气机组'],
    ['OKLO', 'Oklo', 'power', 15, '小型模块化核反应堆开发商'],
    ['FCX', 'Freeport', 'power', 65, '铜矿龙头，铜用于电网、机房与线缆'],
    ['MP', 'MP Materials', 'power', 10, '美国稀土开采与磁材企业'],

    ['ASML', '阿斯麦', 'equip', 350, 'EUV 光刻机唯一供应商'],
    ['AMAT', '应用材料', 'equip', 180, '沉积、刻蚀等前道设备'],
    ['LRCX', '泛林', 'equip', 150, '刻蚀与沉积设备，存储产线占比高'],
    ['KLAC', '科磊', 'equip', 120, '量测与检测设备'],

    ['TSM', '台积电', 'fab', 1400, '全球最大晶圆代工厂，先进制程与 CoWoS 封装'],
    ['INTC', '英特尔', 'fab', 180, 'CPU 与晶圆代工业务'],
    ['AMKR', 'Amkor', 'fab', 8, '外包封装测试（OSAT）'],

    ['NVDA', '英伟达', 'chip', 4500, 'GPU 与数据中心加速计算平台'],
    ['AVGO', '博通', 'chip', 1600, '定制 AI 芯片（ASIC）与网络芯片'],
    ['AMD', 'AMD', 'chip', 400, 'GPU、CPU 与数据中心加速卡'],
    ['ARM', 'Arm', 'chip', 160, 'CPU 指令集架构与 IP 授权'],
    ['MRVL', 'Marvell', 'chip', 70, '定制芯片与数据中心互连'],

    ['MU', '美光', 'mem', 220, 'DRAM、HBM 与 NAND'],
    ['WDC', '西部数据', 'mem', 35, '机械硬盘（HDD）'],
    ['STX', '希捷', 'mem', 40, '大容量机械硬盘'],
    ['SNDK', '闪迪', 'mem', 20, 'NAND 闪存与固态硬盘'],

    ['CSCO', '思科', 'net', 270, '网络交换与路由设备'],
    ['ANET', 'Arista', 'net', 180, '数据中心以太网交换机'],
    ['CRDO', 'Credo', 'net', 25, '高速有源电缆与 SerDes'],
    ['COHR', 'Coherent', 'net', 25, '光模块与激光器件'],
    ['LITE', 'Lumentum', 'net', 15, '光器件与光模块'],

    ['ETN', '伊顿', 'server', 140, '配电与电源管理设备'],
    ['DELL', '戴尔', 'server', 90, 'AI 服务器与存储系统'],
    ['VRT', 'Vertiv', 'server', 50, '机房电源与液冷散热'],
    ['HPE', '慧与', 'server', 30, '服务器与网络设备'],
    ['SMCI', '超微电脑', 'server', 30, 'GPU 服务器整机与液冷机柜'],

    ['EQIX', 'Equinix', 'dc', 80, '全球托管型数据中心运营商'],
    ['CRWV', 'CoreWeave', 'dc', 60, 'GPU 云算力租赁'],
    ['DLR', 'Digital Realty', 'dc', 55, '批发型数据中心 REIT'],
    ['IREN', 'IREN', 'dc', 12, '比特币矿企转型 AI 算力'],
    ['CORZ', 'Core Scientific', 'dc', 6, '矿企转型高性能计算托管'],

    ['MSFT', '微软', 'cloud', 3800, 'Azure 云与 Copilot 等 AI 应用'],
    ['GOOGL', '谷歌', 'cloud', 3000, 'Google Cloud、TPU 与 Gemini'],
    ['AMZN', '亚马逊', 'cloud', 2400, 'AWS 云与自研 Trainium 芯片'],
    ['META', 'Meta', 'cloud', 1800, '社交平台与 Llama 大模型'],
    ['ORCL', '甲骨文', 'cloud', 800, 'OCI 云与数据库'],
    ['PLTR', 'Palantir', 'cloud', 400, '企业级 AI 数据分析平台'],
  ];

  // [上游, 下游, 关系]（示意）
  const edges = [
    ['ASML', 'TSM', '光刻机'], ['AMAT', 'TSM', '前道设备'], ['LRCX', 'TSM', '刻蚀'], ['KLAC', 'TSM', '量测'],
    ['ASML', 'INTC', '光刻机'], ['AMAT', 'INTC', '前道设备'], ['LRCX', 'MU', '刻蚀'], ['AMAT', 'MU', '前道设备'], ['KLAC', 'MU', '量测'],
    ['TSM', 'NVDA', '代工 · CoWoS'], ['TSM', 'AMD', '代工'], ['TSM', 'AVGO', '代工'], ['TSM', 'MRVL', '代工'],
    ['AMKR', 'NVDA', '封测'], ['AMKR', 'AMD', '封测'], ['INTC', 'ARM', '代工'],
    ['ARM', 'NVDA', '架构授权'], ['ARM', 'AMZN', '架构授权'],
    ['MU', 'NVDA', 'HBM'], ['MU', 'AMD', 'HBM'], ['SNDK', 'DELL', 'SSD'], ['WDC', 'EQIX', 'HDD'], ['STX', 'DLR', 'HDD'],
    ['NVDA', 'DELL', 'GPU'], ['NVDA', 'SMCI', 'GPU'], ['NVDA', 'HPE', 'GPU'], ['AMD', 'DELL', 'GPU'],
    ['AVGO', 'GOOGL', 'TPU'], ['AVGO', 'META', 'ASIC'], ['MRVL', 'AMZN', 'ASIC'], ['AVGO', 'ANET', '交换芯片'],
    ['COHR', 'NVDA', '光模块'], ['LITE', 'GOOGL', '光器件'], ['CRDO', 'AMZN', 'AEC'], ['COHR', 'ANET', '光模块'],
    ['ANET', 'MSFT', '交换机'], ['ANET', 'META', '交换机'], ['CSCO', 'EQIX', '网络设备'],
    ['DELL', 'CRWV', '服务器'], ['SMCI', 'CRWV', '服务器'], ['HPE', 'IREN', '服务器'], ['SMCI', 'CORZ', '服务器'],
    ['VRT', 'EQIX', '电源 · 液冷'], ['VRT', 'DLR', '电源 · 液冷'], ['ETN', 'DLR', '配电'], ['ETN', 'CRWV', '配电'],
    ['FCX', 'ETN', '铜'], ['FCX', 'VRT', '铜'], ['MP', 'ETN', '稀土磁材'],
    ['CEG', 'MSFT', '长期购电'], ['VST', 'EQIX', '电力'], ['OKLO', 'DLR', '电力'], ['CEG', 'IREN', '电力'],
    ['CRWV', 'MSFT', '算力租赁'], ['CORZ', 'CRWV', '托管'], ['IREN', 'MSFT', '算力租赁'],
    ['EQIX', 'ORCL', '托管'], ['DLR', 'GOOGL', '托管'], ['DLR', 'META', '托管'],
    ['MSFT', 'PLTR', '云'], ['AMZN', 'PLTR', '云'], ['NVDA', 'ORCL', 'GPU'], ['NVDA', 'MSFT', 'GPU'],
  ];

  // 7 个交易日的虚构涨跌：同层相关 + 个股噪声
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const days = ['10-22', '10-23', '10-24', '10-27', '10-28', '10-29', '10-30'];
  const r = rng(20261030);
  const layerMood = {};
  layers.forEach(l => { layerMood[l.id] = days.map(() => (r() - 0.45) * 4); });

  const nodes = raw.map(([t, name, layer, cap, desc]) => {
    const chg = days.map((_, d) => +(layerMood[layer][d] + (r() - 0.5) * 4.5).toFixed(2));
    return { t, name, layer, cap, desc, chg, signals: [] };
  });
  const byT = Object.fromEntries(nodes.map(n => [n.t, n]));

  // 当日信号（虚构）：o = 期权异动, r = 研报调整, n = 重要新闻
  [['NVDA', 'o'], ['NVDA', 'r'], ['MU', 'o'], ['MU', 'r'], ['LITE', 'o'], ['SMCI', 'o'], ['IREN', 'o'], ['MP', 'o'],
   ['ANET', 'r'], ['COHR', 'r'], ['VRT', 'r'], ['CEG', 'n'], ['TSM', 'n'], ['AVGO', 'r'], ['CRWV', 'n']]
    .forEach(([t, k]) => byT[t].signals.push(k));

  window.CHAIN = { layers, nodes, edges, days, byT };
})();
