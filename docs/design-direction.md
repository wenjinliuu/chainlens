# 设计方向（当前：潮信 · 雾彩·清透 + 3D 订阅落地页）

> 本文取代 `docs/design.md` 第 5 节"视觉风格"。页面结构、合规要求不变。
> 当前设计稿：`design/v4/index.html`（日报订阅落地页，首页）。历史稿：v1 `design/*.html`、v2 `design/v2/`（深色）、v3 `design/v3/`（等距产业城）。

## 0. 品牌：潮信（2026-10-31 定名）

- 对外品牌叫**潮信**（"潮水按时涨落"，寓意准时、可信）；仓库名仍为 chainlens。原英文名 ChainLens 已被 Web3 Labs 的区块链浏览器注册商标，不再对外使用。
- 栏目结构：**早潮**（盘前汇总，美股开盘前，待上线）· **晚潮**（期权日报，收盘后）· **研报**（研报日报）· **周报**（周日上午）。
- 晚潮海报的署名暂时保持"KZG 期权 Pro"不变。
- Logo：等距小方块 + 一道浪（`design/v4/index.html` 导航里的 SVG）。

## 1. 定位变化（2026-10-31）

- **首页的第一任务是让用户订阅日报**，不是看盘。首页 = 日报宣传与订阅落地页，要精美、3D、可交互。
- K 线、技术指标、产业链关系图等"看盘工具"放到二级页面（`design/v2/stock.html`、`design/v2/chain.html`，待按本方向换成浅色）。

## 2. 视觉：雾彩·清透（与日报海报同源）

视觉直接继承期权日报海报（`kzg-option-brief/docs/poster-style.md`，源头 `poster-kit` 的 `style.md`、`palette.md`），网站和海报是一家人：

| 项 | 约定 |
|---|---|
| 底色 | 白 → `#f7f8fc` 纵向过渡；可切换深色（`[data-theme="dark"]`），但以浅色为主 |
| 强调色 | 靛紫 `#5b4cff`，只给标题大字、编号、按钮、单一重点 |
| 分类色 | 8 色：靛紫、天蓝、琥珀、紫罗兰、湖青、洋红、珊瑚橙、宝蓝（避开涨跌红绿） |
| 涨跌 | 绿 `#0fb57b` = 涨 / 偏多，红 `#e8364a` = 跌 / 偏空；文字用主色加 18% 黑 |
| 卡片 | 白底、圆角 30、1.5px `#eceef5` 描边，基本不用阴影 |
| 字体 | 中文 Noto Sans SC（标题 900），数字与代码 Plus Jakarta Sans 800 |
| 标题 | 三层：黑色主句 → 靛紫大字 → 灰色副句 |
| 公司 | 圆形 logo + 环节色描边 + 粗体代码；logo 来自 `wenjinliuu/global-stock-logos`，取不到用首字母徽章 |
| 物件 | 日报海报的等距物件（芯片、GPU、机柜、数据中心、交换机、机器人、储能、金属锭），网页里升级为 Three.js 黏土 3D |

共用资源：`design/v3/assets/brand.css`（token 与组件）、`iso.js`（等距物件，移植自日报 `poster.js`）、`data.js`（按日报 `AI_CHAIN` 的 8 层）。

## 3. 首页（落地页）结构

1. **首屏**：大字"潮信" + "早潮看消息，晚潮看信号"；邮箱订阅 + 栏目勾选；3D 倾斜手机自动播放晚潮海报，弹出晚潮、研报两条推送；四周漂浮黏土 3D 物件和 logo 硬币。
2. **三个栏目**：早潮（日出 + 潮水）、晚潮（新月 + 潮水）、研报（文件堆）三张卡，加周报一行。
3. **AI 产业岛**（Three.js）：漂在潮水上的黏土小岛，8 个站点按产业链顺序排列——矿石与金属锭、冷却塔（冒蒸汽）与风机（转动）、晶圆上的芯片、交换机与光纤（光点流动）、机柜（指示灯闪烁）、GPU（风扇转动）、数据中心园区与云朵、机器人与手机；传送带上的方块经过哪站就变成哪层的颜色；底座高度 = 当日热度；上空漂着成员公司 logo 硬币。可拖动、点击、按"下一站"导览，侧栏说明潮信每天在这一站看什么（晚潮 / 研报 / 早潮）。
4. **拆开晚潮**：滚动驱动的爆炸图，海报逐层分离，镜头跟随当前版块。
5. **3D 盘面**：个股 K 线 + CP / 全市场分时 / 环节热度三视图，可旋转。
6. **晚潮怎么生成** → **样张**（晚潮海报、晚潮文字版、研报日报）→ 订阅 → 常见问题 → 合规页脚。
7. 手机适配：单列；产业岛镜头按宽高比自动拉远，说明面板移到下方。

3D 共用模块：`design/v4/assets/clay.js`（黏土材质、等距物件转 3D、logo 硬币、8 个站点模型）。

## 4. 动效原则

- 动效要讲清一件事：手机滚动 = "每天推送到手机"；爆炸图 = "日报由哪些版块组成"；柱子长出 = "数据怎么来的"。
- 3D 场景离开视口时暂停渲染；尊重系统"减少动态效果"设置。
- Three.js 以普通脚本 + 动态 `import()` 加载（配合 importmap），设计稿可直接双击打开。

## 5. 上线前必须解决（非设计问题）

- **数据授权**：日报数据来自 KZG 个人网站，日报仓库约定"不公开分发"；Finnhub 免费档仅限个人非商用。公开招募订阅前需取得授权或更换数据源。
- **合规**：订阅保持免费；"偏多 / 偏空"统一表述为期权数据面倾向；页脚与 FAQ 写明不构成投资建议（见 `docs/compliance.md`）。

## 6. 参考案例

### 可玩性与 3D

- [Crypto Bubbles](https://apps.apple.com/us/app/-/id1599892658)：可拖拽的市场气泡，靠手感和截图传播
- [The Pudding](https://webiano.digital/the-pudding-proves-that-a-website-can-still-be-journalism/)：用可交互的视觉叙事讲数据
- Apple 产品页的滚动爆炸图、黏土风 3D 插画（等距 + 柔光 + 圆角）

### 产业链可视化与专业终端（v2 时调研）

| 参考 | 学什么 |
|---|---|
| [GLOBAÏA · AI Supply Chain](https://globaia.org/ai-supply-chain) | 把 AI 产业链分成 10 层（原材料 → 能源 → … → 芯片 → 数据中心 → AI 服务），开场"逐层搭建"，连线有流向动画，点击节点出故事面板 |
| [ETO · Chip Supply Chain Explorer](https://eto.tech/blog/introducing-supply-chain-explorer-advanced-chips)（乔治城 CSET） | "阶段 → 流程 → 工具 / 材料 → 供应商"的信息结构；详情面板；筛选后可分享 URL |
| [Macro Polo · AI 芯片供应链地图](https://macropolo.org/digital-projects/supply-chain/ai-chips/ai-chips-supply-chain-mapping/) | 上游 / 中游 / 下游三段切换 |
| [Stockplus 价值链地图](https://www.digitaltoday.co.kr/en/view/91116/stockplus-launches-value-chain-map-service)（韩国 Dunamu） | 以"公司关系"而不是"物理流程"组织产业链，和股票直接挂钩，最接近我们的场景 |
| TradingView / Bloomberg / Refinitiv 等专业终端 | 深色底、等宽数字、高信息密度、多窗格指标、十字光标数值图例 |
| Stripe、Mercury 的后台 | 克制配色、密而不乱的表格、清楚的层级 |

调研来源还包括：[AdminLTE 2026 仪表盘案例](https://adminlte.io/blog/25-best-dashboard-design-examples-for-2026-real-products-principles/)、[交易终端设计系统](https://open-design.ai/systems/trading-terminal/)、[Lightweight Charts 指标扩展](https://cdn.jsdelivr.net/npm/lightweight-charts-indicators@0.4.2/README.md)。

## 7. 历史版本为什么被替换

- v1（浅色卡片）：没有主角、装饰代替信息、像 AI 模板。
- v2（深色控制室）：专业但和日报品牌脱节；用户更想要浅色、年轻活力。
- v3（等距产业城）：品牌对了，但首页目标从"看产业链"变为"订阅日报"，产业城降为备选素材。
