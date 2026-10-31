/*
 * ChainLens v3 · 示例数据
 * - 分层与环节按 KZG 期权 Pro 的 AI_CHAIN（src/config.js）整理，保证两边口径一致
 * - 市值为量级示意（十亿美元），只决定气泡大小
 * - 每日涨跌、环节热度（量倍数）、信号全部为【虚构】，仅用于展示交互
 * - logo 来自 wenjinliuu/global-stock-logos（jsDelivr），取不到时显示首字母徽章
 */
(function () {
  const LOGO_EXT = 'PLTR:png SNOW:png CRWD:png TSLA:png AAPL:png QCOM:png MSFT:png GOOGL:png AMZN:png META:png ORCL:png BABA:svg CRWV:svg NBIS:svg IREN:svg CIFR:svg WULF:svg CORZ:svg APLD:svg NVDA:png AMD:svg AVGO:png MRVL:svg ARM:svg INTC:png MU:svg WDC:svg STX:svg SNDK:svg SKHY:svg TSM:svg ASML:svg AMAT:png LRCX:svg KLAC:svg AMKR:svg SNPS:svg CDNS:svg COHR:svg LITE:svg AAOI:svg FN:svg GLW:svg CIEN:svg ANET:svg CRDO:svg ALAB:svg CSCO:png SMCI:svg DELL:png HPE:png VRT:svg ETN:png EQIX:svg DLR:svg VST:svg CEG:svg TLN:svg NRG:svg NEE:svg GEV:svg PWR:svg OKLO:svg SMR:svg CCJ:svg BE:svg EOSE:svg FCX:svg SCCO:svg MP:svg NOW:png'
    .split(' ').reduce((m, s) => { const [t, e] = s.split(':'); m[t] = e; return m; }, {});
  const logo = t => LOGO_EXT[t] ? `https://cdn.jsdelivr.net/gh/wenjinliuu/global-stock-logos@main/logos/us/${t}.${LOGO_EXT[t]}` : '';

  // 8 层：从上游到下游；颜色取 palette.md 主分类 8 色（不含涨跌红绿），相邻层色差大
  const layers = [
    { id: 'raw', name: '原材料', en: 'Materials', color: '#f5a314', obj: 'ingots', segs: { '铜/稀土': 'FCX SCCO MP' } },
    { id: 'energy', name: '能源', en: 'Energy', color: '#ff6b2c', obj: 'power', segs: { '发电': 'VST CEG TLN', '电网设备': 'GEV', '核能/铀': 'OKLO CCJ', '燃料电池': 'BE' } },
    { id: 'chip', name: '芯片', en: 'Chips', color: '#5b4cff', obj: 'chip', segs: { 'GPU/加速器': 'NVDA AMD', '定制ASIC': 'AVGO MRVL', 'CPU': 'ARM INTC', '存储': 'MU SNDK WDC', '晶圆代工': 'TSM', '设备/材料': 'ASML AMAT LRCX KLAC' } },
    { id: 'net', name: '网络与光', en: 'Network', color: '#00a8c6', obj: 'switches', segs: { '光模块': 'COHR LITE CIEN', '交换/连接': 'ANET CRDO ALAB CSCO' } },
    { id: 'dc', name: '服务器与数据中心', en: 'Servers & DC', color: '#2b6cf2', obj: 'rack', segs: { 'AI服务器': 'SMCI DELL HPE', '电力/散热': 'VRT ETN', '数据中心REIT': 'EQIX DLR' } },
    { id: 'compute', name: '算力租赁', en: 'GPU Cloud', color: '#d23fd8', obj: 'gpu', segs: { 'GPU/算力云': 'CRWV NBIS IREN CIFR WULF CORZ APLD' } },
    { id: 'cloud', name: '模型与云', en: 'Models & Cloud', color: '#1296f0', obj: 'datacenter', segs: { '大模型/云': 'MSFT GOOGL AMZN META ORCL', '中概云': 'BABA' } },
    { id: 'app', name: '应用与端侧', en: 'Apps & Edge', color: '#a04cf5', obj: 'robot', segs: { 'AI软件': 'PLTR SNOW CRWD NOW', '端侧/机器人': 'TSLA AAPL QCOM' } },
  ];

  const NAMES = {
    FCX: ['自由港', 65], SCCO: ['南方铜业', 90], MP: ['MP Materials', 10],
    VST: ['Vistra', 65], CEG: ['Constellation', 110], TLN: ['Talen', 18], GEV: ['GE Vernova', 170], OKLO: ['Oklo', 15], CCJ: ['Cameco', 35], BE: ['Bloom Energy', 25],
    NVDA: ['英伟达', 4500], AMD: ['AMD', 400], AVGO: ['博通', 1600], MRVL: ['Marvell', 70], ARM: ['Arm', 160], INTC: ['英特尔', 180],
    MU: ['美光', 220], SNDK: ['闪迪', 20], WDC: ['西部数据', 35], TSM: ['台积电', 1400], ASML: ['阿斯麦', 350], AMAT: ['应用材料', 180], LRCX: ['泛林', 150], KLAC: ['科磊', 120],
    COHR: ['Coherent', 25], LITE: ['Lumentum', 15], CIEN: ['Ciena', 20], ANET: ['Arista', 180], CRDO: ['Credo', 25], ALAB: ['Astera Labs', 30], CSCO: ['思科', 270],
    SMCI: ['超微电脑', 30], DELL: ['戴尔', 90], HPE: ['慧与', 30], VRT: ['Vertiv', 50], ETN: ['伊顿', 140], EQIX: ['Equinix', 80], DLR: ['Digital Realty', 55],
    CRWV: ['CoreWeave', 60], NBIS: ['Nebius', 25], IREN: ['IREN', 12], CIFR: ['Cipher', 6], WULF: ['TeraWulf', 5], CORZ: ['Core Scientific', 6], APLD: ['Applied Digital', 5],
    MSFT: ['微软', 3800], GOOGL: ['谷歌', 3000], AMZN: ['亚马逊', 2400], META: ['Meta', 1800], ORCL: ['甲骨文', 800], BABA: ['阿里巴巴', 300],
    PLTR: ['Palantir', 400], SNOW: ['Snowflake', 70], CRWD: ['CrowdStrike', 110], NOW: ['ServiceNow', 200], TSLA: ['特斯拉', 1300], AAPL: ['苹果', 3600], QCOM: ['高通', 180],
  };

  const days = ['10-22', '10-23', '10-24', '10-27', '10-28', '10-29', '10-30'];
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const r = rng(30);

  // 环节热度 = 成员量倍数中位数（KZG 口径），这里虚构 7 天走势，让每天的天际线不一样
  const heatShape = { raw: [0.9, 1.0, 0.8, 1.1, 1.3, 1.0, 0.9], energy: [1.2, 1.4, 1.6, 1.3, 1.1, 1.5, 1.4], chip: [1.6, 1.3, 1.5, 1.9, 1.7, 1.4, 1.8],
    net: [1.1, 1.5, 1.2, 1.6, 2.0, 2.4, 2.3], dc: [1.0, 0.9, 1.3, 1.2, 1.5, 1.3, 1.6], compute: [2.1, 1.7, 1.4, 1.2, 1.6, 1.9, 1.5],
    cloud: [0.8, 0.9, 1.1, 1.0, 0.9, 1.2, 1.1], app: [1.3, 1.1, 0.9, 1.4, 1.2, 1.0, 1.2] };

  const companies = [];
  layers.forEach((L, li) => {
    L.heat = heatShape[L.id];
    L.members = [];
    Object.entries(L.segs).forEach(([seg, list]) => list.split(' ').forEach(t => {
      const mood = L.heat.map(h => (h - 1.2) * 1.6);
      const c = { t, name: NAMES[t][0], cap: NAMES[t][1], layer: L.id, li, seg, logo: logo(t),
        chg: days.map((_, d) => +(mood[d] + (r() - 0.5) * 5).toFixed(2)), vx: days.map((_, d) => +(L.heat[d] * (0.6 + r() * 0.9)).toFixed(1)), signals: [] };
      companies.push(c); L.members.push(c);
    }));
  });
  const byT = Object.fromEntries(companies.map(c => [c.t, c]));
  [['NVDA', 'o'], ['NVDA', 'r'], ['MU', 'o'], ['MU', 'r'], ['LITE', 'o'], ['SMCI', 'o'], ['IREN', 'o'], ['MP', 'o'],
   ['ANET', 'r'], ['COHR', 'r'], ['VRT', 'r'], ['CEG', 'n'], ['TSM', 'n'], ['AVGO', 'r'], ['CRWV', 'n'], ['PLTR', 'n']]
    .forEach(([t, k]) => byT[t].signals.push(k));

  // 今日情报卡（虚构示例）
  const cards = [
    { kind: 'o', t: 'LITE', title: 'CP 比远高于常态', big: '+3.1σ', dev: 0.68, lines: ['Call / Put 成交比 3.42，常态 2.04', 'LEAP Call 占比连续 3 天上升', '最热合约：Call 25 · 远月'], src: '期权日报' },
    { kind: 'r', t: 'NVDA', title: '机构 A 上调评级与目标价', big: '145 → 165', lines: ['评级：中性 → 增持', '数据中心收入占比继续提升', '新平台量产节奏早于此前披露'], src: '研报日报 · AI 整理' },
    { kind: 'c', t: 'MU', title: '本周信息集中出现', big: '2 + 2', lines: ['期权异动 2 次', '研报评级 / 目标价调整 2 次', '规则：近 5 个交易日同时出现'], src: '规则计算' },
    { kind: 'n', t: 'CEG', title: '与云厂商签署长期供电协议', big: '20 年', lines: ['核电机组向数据中心长期供电', '协议细节以公司公告为准'], src: '示例媒体' },
    { kind: 'h', t: 'ANET', title: '网络与光 · 今天最热环节', big: '2.3x', lines: ['热度 = 成员量倍数中位数', '在榜 5 只，成交最多：ANET、COHR、LITE'], src: '期权日报' },
  ];

  // 产业链小测验（公开常识）
  const quiz = [
    { q: '英伟达的 GPU，主要由谁来代工制造？', opts: ['TSM', 'INTC', 'AMKR', 'SMCI'], a: 'TSM', why: '台积电负责先进制程代工，以及 CoWoS 先进封装。' },
    { q: '能造 EUV 光刻机的，全世界只有哪一家？', opts: ['AMAT', 'ASML', 'LRCX', 'KLAC'], a: 'ASML', why: '阿斯麦是 EUV 光刻机的唯一供应商，先进制程离不开它。' },
    { q: 'GPU 旁边的 HBM 高带宽内存，下面哪家在供应？', opts: ['WDC', 'INTC', 'MU', 'SNDK'], a: 'MU', why: '美光是 HBM 三大供应商之一（另两家是 SK 海力士、三星）。' },
    { q: '谷歌的 TPU 芯片，是和哪家一起设计的？', opts: ['AMD', 'ARM', 'MRVL', 'AVGO'], a: 'AVGO', why: '博通长期为谷歌提供 TPU 的定制芯片设计服务。' },
    { q: '微软签约重启三里岛核电机组买电，对方是谁？', opts: ['CEG', 'VST', 'TLN', 'OKLO'], a: 'CEG', why: 'Constellation 与微软签了 20 年购电协议，为数据中心供电。' },
    { q: '哪家原本挖比特币，后来转型做 AI 算力租赁？', opts: ['ORCL', 'IREN', 'NBIS', 'DLR'], a: 'IREN', why: 'IREN 把矿场的电力和机房改造成 GPU 算力中心。' },
    { q: '数据中心的电源和液冷设备，代表公司是？', opts: ['VRT', 'PLTR', 'ASML', 'MU'], a: 'VRT', why: 'Vertiv 做机房供配电、UPS 和液冷散热。' },
  ];

  window.CL = { layers, companies, byT, days, cards, quiz, logo,
    disclaimer: '本站内容为公开信息整理，不构成任何投资建议。市场有风险，投资需谨慎。' };
})();
