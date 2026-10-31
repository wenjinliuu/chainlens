# 设计方向 v2：深色"控制室"

> 本文取代 `docs/design.md` 第 5 节"视觉风格"中"浅色 Apple 式"的方向。页面结构、合规要求不变。
> 对应设计稿：`design/v2/`（产业链全景 `chain.html`、专业行情 `stock.html`）。

## 1. v1 设计稿的问题

v1（`design/*.html`）看起来像 AI 模板，原因大致有这几条：

- **没有主角**：所有卡片尺寸相近、权重相同，眼睛不知道先看哪里。
- **装饰代替信息**：马卡龙渐变底色、假的柱状图、圆角大卡片，填满了页面，但没有表达任何数据关系。
- **产业链只是一个热力图**：没有体现"上游 → 下游"的流向，看不出"链"。
- **没有动效叙事**：静态页面，没有用动画讲清楚任何事情。
- **图表不专业**：只有 K 线示意，没有指标、窗格、十字光标数值，达不到交易软件的预期。

## 2. 参考案例

| 参考 | 学什么 |
|---|---|
| [GLOBAÏA · AI Supply Chain](https://globaia.org/ai-supply-chain) | 把 AI 产业链分成 10 层（原材料 → 能源 → … → 芯片 → 数据中心 → AI 服务），开场"逐层搭建"，连线有流向动画，点击节点出故事面板 |
| [ETO · Chip Supply Chain Explorer](https://eto.tech/blog/introducing-supply-chain-explorer-advanced-chips)（乔治城 CSET） | "阶段 → 流程 → 工具 / 材料 → 供应商"的信息结构；详情面板；筛选后可分享 URL |
| [Macro Polo · AI 芯片供应链地图](https://macropolo.org/digital-projects/supply-chain/ai-chips/ai-chips-supply-chain-mapping/) | 上游 / 中游 / 下游三段切换 |
| [Stockplus 价值链地图](https://www.digitaltoday.co.kr/en/view/91116/stockplus-launches-value-chain-map-service)（韩国 Dunamu） | 以"公司关系"而不是"物理流程"组织产业链，和股票直接挂钩，最接近我们的场景 |
| TradingView / Bloomberg / Refinitiv 等专业终端 | 深色底、等宽数字、高信息密度、多窗格指标、十字光标数值图例 |
| Stripe、Mercury 的后台 | 克制配色、密而不乱的表格、清楚的层级 |

调研来源还包括：[AdminLTE 2026 仪表盘案例](https://adminlte.io/blog/25-best-dashboard-design-examples-for-2026-real-products-principles/)、[交易终端设计系统](https://open-design.ai/systems/trading-terminal/)、[Lightweight Charts 指标扩展](https://cdn.jsdelivr.net/npm/lightweight-charts-indicators@0.4.2/README.md)。

## 3. 设计原则

1. **一页一个主角。** 产业链页的主角是"流动的链"，行情页的主角是 K 线。其他东西都退到次要层级。
2. **深色为主。** 底色分 4 级明度（`--bg-0` ~ `--bg-3`），靠明度而不是阴影区分层级；加极淡的点阵和噪点，避免"死黑"。
3. **颜色只表达语义，不做装饰。**
   - 绿涨红跌：只用于涨跌方向，全站一致；
   - 事件三色：期权紫、研报蓝、新闻橙；
   - 环节九色：每个产业链环节一种颜色（避开红绿），从左到右构成"冷暖光谱"；
   - 品牌色只有一个：青色 `#3FD3FF`。
4. **字体。** 西文 Geist，数字一律用 Geist Mono 等宽显示（`tabular-nums`）；中文回落到苹方 / 思源黑体。
5. **动效必须表达信息，不做无意义的动画。**
   - 开场逐层搭建 = 讲"从上游到下游"的故事；
   - 粒子流 = 供应方向，速度随当日涨跌变化；
   - 悬停 = 高亮完整的上下游路径，其余压暗；
   - 数字滚动 = 切换日期时数据的变化；
   - 信号脉冲环 = 当日有期权 / 研报 / 新闻信号；
   - 系统开启"减少动态效果"时关闭粒子和过渡。
6. **专业图表是标配。** K 线页提供 MA / BOLL / 目标价区间主图叠加，VOL / MACD / KDJ / RSI 副图，日 / 周 / 月 K，十字光标逐窗格显示数值。
7. **自动分析只描述状态。** "技术指标状态"由规则计算，只陈述数值和所处区间（如"RSI(14) 为 56.3，处于 50–70 区间"），不使用"超买 / 超卖 / 买入 / 看涨"之类方向性措辞，符合 `docs/compliance.md`。

## 4. 实现要点

- **产业链全景**：Canvas 画连线与粒子（发光精灵图 + `lighter` 叠加），DOM 画节点（文字清晰、方便交互）；跨多层的长连线向下弯，避免穿过中间节点。
- **专业行情**：TradingView Lightweight Charts v5 的多窗格（`addSeries(..., paneIndex)`、`setStretchFactor`），保留 TradingView 标识；指标计算放在 `design/v2/assets/indicators.js`，以后可以直接搬进 `web/`。
- **数据**：产业链分层、公司归属和关系见 `design/v2/assets/chain-data.js`（关系为示意，正式版由人工维护 `chain.json`）。

## 5. 待定 / 下一步

- [ ] 确认是否以深色为主（原文档写的是浅色为主、深色为次）
- [ ] 今日驾驶舱 v2（可能直接以产业链全景作为首页主视觉）
- [ ] 手机版 v2：产业链改成竖向分层 + 横滑
- [ ] 日报海报 v2 与站内视觉统一
