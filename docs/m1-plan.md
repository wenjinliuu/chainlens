# M1 工程化方案与数据接口草案

写于 2026-10-31，M0 设计稿（`design/v4/`）收尾时。这份文档只定方案和契约，不写代码；进入 M1 时按这里动手，有出入就改这里。

## 进度（2026-11-01）

- **第 1 步已做**：`web/` Astro 7 静态站可构建（`pnpm install && pnpm build`，9 个页面）；`scripts/sync-web.mjs` 把设计稿同步成站点输入——设计稿资源原样托管在 `web/public/assets`，每页正文抽成 `src/partials/*.html` 由 `Base.astro` 统一加头（meta / OG / favicon / 字体预连接 / 主题与图标脚本 / three importmap）注入；示例 JSON 在 `web/public/data`。**过渡做法**：设计稿仍是唯一的源，改了设计稿跑 `pnpm sync` 再构建；下面第 3 节的"拆成组件 + TS 模块"按页逐个替换，替换掉的页面不再由 sync 生成。
- **部署流水线已写**：`.github/workflows/deploy.yml`（pnpm 安装 → 合规扫描 → 构建 → 产物上传；main 分支且配置了 Secrets 时 `wrangler deploy`），`web/wrangler.toml` 用 Workers 静态资源托管 `dist/`。**需要你做的**：在 Cloudflare 建一个 API Token（Workers Scripts:Edit），把 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 加到仓库 Secrets；合并到 main 即上线。
- 未做：真实数据、邮件、Astro 组件化拆分。

## 0. 目标与范围

- 把 `design/v4/` 的设计稿变成**可部署的静态站**：首页、日报归档、公司档案、看盘、订阅流程、⌘K 搜索。
- 数据先用**示例 JSON**（结构与正式版一致，内容虚构），真实数据接入放 M2。
- 继续只用 Cloudflare 免费额度；仓库公开，密钥与上游地址只走 Secrets。

不做：真实数据 pipeline、邮件发送、深色模式（M5）。

## 1. 技术选型（落定）

| 项 | 选择 | 理由 |
|---|---|---|
| 框架 | **Astro 5**，静态生成 | 每页一份 JSON 的站最适合；设计稿里的 3D 模块本来就是无框架 ES 模块，不需要 React 岛 |
| 语言 | TypeScript（3D 与数据模块），模板用 `.astro` | 迁移时把 `window.X` 全局改成 `import` |
| 样式 | 直接沿用 `design/v3/assets/brand.css` 的 token，拆成 `src/styles/`；**不引入 Tailwind** | 设计稿已经有一整套雾彩·清透 token，引入 Tailwind 只会多一套语法。`docs/architecture.md` 里的 Tailwind 改为"可选" |
| 3D | three 0.170（npm），`three` 单独分包，`island/town` 懒加载 | 首屏先出 DOM 和手机，3D 在 `requestIdleCallback` 后再起；画质分级（`quality.js`）原样保留 |
| 图表 | Lightweight Charts 5.x（npm），保留 TradingView 署名 | 设计稿已验证的多窗格方案 |
| 海报导出 | html-to-image 按需加载；构建时另用 Playwright 出 PNG | 浏览器端给"下载高清图"，构建端给邮件和 OG 图 |
| 部署 | **Cloudflare Workers 静态资源**（Workers Static Assets） | 免费；以后订阅 API 与静态站在同一个 Worker，不用再开 Pages Functions |
| 包管理 | pnpm | — |

## 2. 目录结构

```
chainlens/
├── web/                         Astro 站
│   ├── astro.config.mjs
│   ├── public/
│   │   ├── data/                 构建时由 pipeline 写入的 JSON（见第 4 节）
│   │   ├── logos/                构建时下载的公司 logo（避免运行时跨域与 403）
│   │   └── posters/              构建时渲染的海报 PNG
│   └── src/
│       ├── layouts/Base.astro    导航、页脚（合规声明）、⌘K、字体
│       ├── pages/
│       │   ├── index.astro               首页（落地页）
│       │   ├── daily/index.astro         归档：日历 + 时间回放（客户端按 ?d= 切换）
│       │   ├── daily/[date].astro        某一天：海报 SSR 进页面（无 JS 也能看、可被分享抓取）
│       │   ├── company/[t].astro         公司档案（58 家静态生成）
│       │   ├── stock.astro               看盘（客户端取 JSON）
│       │   ├── subscribe.astro / unsubscribe.astro
│       │   └── 404.astro
│       ├── components/           栏目卡、样张、FAQ、订阅框、吐司、飞出卡…
│       ├── lib/
│       │   ├── 3d/  clay.ts town.ts island.ts scene.ts research.ts board.ts company3d.ts quality.ts
│       │   ├── poster.ts         renderPoster(day)：构建端与浏览器端共用
│       │   ├── sheets.ts         样张 / 文字版 / 研报页 / 周报页渲染（现 archive.js 的渲染部分）
│       │   ├── data.ts           读 public/data 的类型化访问层（现 archive.js 的生成部分删掉）
│       │   ├── search.ts         ⌘K，索引来自 data/search-index.json
│       │   └── indicators.ts     MA / BOLL / MACD / KDJ / RSI（现 design/v2/assets/indicators.js）
│       └── styles/  tokens.css brand.css landing.css daily.css company.css stock.css subscribe.css search.css
├── pipeline/                    数据构建（Node 20，无框架）
│   ├── fetch-kzg.mjs             读期权 Worker：/report.json、/brief.json、/weekly.json、/weekly-report.json、/px.json
│   ├── fetch-reports.mjs         读研报卡片（ima-knowledge-mcp）
│   ├── build-json.mjs            归一化 → web/public/data；生成 search-index、daily/index
│   ├── render-posters.mjs        Playwright 渲染海报 PNG
│   └── samples/                  虚构示例（现已由 scripts/export-samples.mjs 导出到 data/samples/，M1 时搬过来）
├── worker/                      Cloudflare Worker：静态资源 + 订阅 API（M4）
├── scripts/
│   ├── compliance-scan.mjs       文案合规扫描（见第 9 节）
│   └── shots.mjs                 截图回归（桌面 1440×900 + 手机 390×844）
└── design/                      设计稿，M1 起只读
```

## 3. 设计稿 → 工程的映射

| 设计稿 | 工程 | 迁移要点 |
|---|---|---|
| `index.html` 行内初始化脚本 | `pages/index.astro` 的 `<script>` | `window.HERO / ISLAND / RESEARCH / BOARD` 这些 promise 改成 `export async function init…`；importmap 删掉 |
| `assets/landing.js` | 拆成 `components/*` 各自的脚本 + `lib/sheets.ts` | 订阅框、栏目卡、样张展开、产业镇 UI、拆开日报、生成流程、样张、投信联动分别归到组件 |
| `assets/poster.js` | `lib/poster.ts` | 已是 `renderPoster(day)`；在 `daily/[date].astro` 里构建时渲染，浏览器端复用同一函数做回放 |
| `assets/archive.js` | `lib/data.ts` + `lib/sheets.ts` + `pipeline/samples/` | 生成器只用来导出一次示例 JSON；周报汇总规则（方向、环节轮动、持续信号）搬到 `pipeline/build-json.mjs`，前端不再算 |
| `assets/daily.js` | `pages/daily/index.astro` 脚本 | 日历、时间轴、热度条、下载逻辑不变；数据从 `data/daily/index.json` 和 `data/daily/{date}.json` 取（回放时预取相邻 3 天） |
| `assets/island.js / town.js / clay.js / scene.js` | `lib/3d/*` | 原样 TS 化；`Q` 改 import；贴图用 canvas 生成的部分保留 |
| `assets/search.js` | `lib/search.ts` | 索引改读 `data/search-index.json`；最近记录仍存 localStorage |
| `assets/stock.js` | `pages/stock.astro` 脚本 | 行情从 `data/stocks/{T}.json` 取；指标计算保留在前端（纯函数） |
| `assets/company.js / company3d.js` | `pages/company/[t].astro` | 列表与档案头 SSR；星图、时间轴、街区 3D 客户端起 |
| `subscribe.html / unsubscribe.html / email.html` | `pages/subscribe.astro` 等；`worker/email/` | 邮件模板改成 table 布局的 HTML（邮件客户端不吃 grid / flex），缩略海报用 `posters/{date}.png` |
| `../v3/assets/data.js`（58 家公司、8 层） | `data/companies.json` + `data/chain.json` | 前端不再内置公司名单 |

公共约定：
- 所有页面共用 `Base.astro`：导航（含 ⌘K 按钮）、页脚风险提示、`<meta>` OG 图。
- 用户可见的 URL 与设计稿保持：`/`、`/daily?col=eve&d=2026-10-30`、`/daily/2026-10-30`、`/company/NVDA`、`/stock?t=NVDA`、`/subscribe`、`/#island?station=chip`。

## 4. 静态 JSON 契约（v1）

所有 JSON 顶层都带 `gen`（生成时间 ISO）、`v`（契约版本 `1`）、`disclaimer`。数字由 pipeline 算好，前端只排版。

### 4.1 `data/meta.json`
```json
{ "latest": "2026-10-30", "latestRR": "2026-10-30", "latestWeek": "2026-10-26",
  "delay": "期权数据为收盘后汇总；行情为延迟数据", "rulesVersion": "kzg 的 RULES_VERSION", "gen": "…" }
```

### 4.2 `data/daily/index.json`
```json
[{ "date": "2026-10-30", "wd": "周五", "mood": "偏乐观", "h2": "光模块 Call 集中放量", "hasRR": true, "weekMon": "2026-10-26", "dataOnly": false }]
```
`dataOnly = true` 表示那天没有判断 JSON，只有数据面（与 kzg `/daily` 的"仅数据面"一致）；归档日历用灰框标出。

### 4.3 `data/daily/{date}.json` —— 期权日报（海报日对象）
就是 `design/v4/assets/poster.js` 里 `POSTER.base` 的结构，逐字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date, md, wd` | string | `2026-10-30`、`10月30日`、`周五` |
| `mood` | 偏乐观 / 中性 / 偏谨慎 | kzg `MOODS` 枚举 |
| `cp, base, dev` | number | 全市场 CP、20 日常态、偏离（`cp/base-1`） |
| `h2` | string ≤14 字 | 海报靛紫大字 |
| `t3` | string ≤60 字 | 副句 |
| `strong` | `{t, seg, dir, conf, vx, px}` | 最强信号 |
| `hot` | `{seg, heat, ts[]}` | 最热环节与在榜公司 |
| `events[]` | `{text, src, chips[], url?}` | 最多 3 条 |
| `picks[]` | `{t, seg, dir, conf, rank, vx, px, cp, leap, why, hot, url?}` | AI 链重点，最多 3 只完整的 |
| `watch[]` | string | 观察名单 |
| `heat[]` | `[seg, heat, "T T T", cpDev]` | 六个环节，按热度降序 |
| `intra[]` | `[vol, cp]` × 13 | 每 30 分钟一根 |
| `text` | string | 文字版（纯文本，供复制与邮件） |
| `source` | `{savedAt, rulesVersion, agent}` | 来自 kzg 判断 JSON |

### 4.4 `data/rr/{date}.json` —— 研报日报
```json
{ "date": "2026-10-30", "total": 12, "up": 6, "down": 2, "keep": 4,
  "items": [{ "t": "NVDA", "firm": "机构 A", "act": "上调评级", "rating": "中性 → 增持",
              "from": 145, "to": 165, "pts": ["…", "…"], "src": "机构公开报告", "ai": true }] }
```
`pts` 最多 3 条，`ai: true` 表示 AI 整理（页面显示"AI 整理"标）。不含原文段落与 PDF 链接。

### 4.5 `data/weekly/{monday}.json` —— 周报
```json
{ "mon": "2026-10-26", "fri": "2026-10-30", "sun": "2026-11-01", "label": "10月第 4 周",
  "dir": "中性", "avg": 0.01, "bullSeg": "光模块", "bearSeg": "存储",
  "segs": [{ "n": "电力/散热", "heat": 1.7, "dev": 0.03 }],
  "strongest": { "t": "ETN", "dir": "偏空", "n": 2 },
  "persist": [{ "t": "ETN", "dir": "偏空", "n": 2 }],
  "days": [{ "date": "2026-10-26", "mood": "中性", "dev": -0.02 }],
  "next": [{ "when": "周四", "what": "美国 GDP 初值" }],
  "headline": "…", "summary": "…", "themes": [{ "title": "…", "text": "…", "syms": ["LITE"] }] }
```
前半段由 pipeline 按固定规则汇总，后三个字段来自 kzg 的周报 JSON（AI 写的文字）。

### 4.5b `data/columns/index.json` 与 `data/columns/{id}.json` —— 专栏报告
```json
{ "id": "800g-optics-chain", "date": "2026-10-22", "kind": "产业链", "title": "…", "dek": "…", "tags": ["LITE", "COHR"], "readMin": 8,
  "sections": [{ "h": "…", "p": ["…"], "data": { "kind": "kv | bars", "rows": [["名称", "值", "上限（bars 用）"]] } }],
  "related": { "daily": "2026-10-22", "rr": "2026-10-22" }, "ai": true }
```
`kind` 只有 财报 / 产业链 / 事件 三种；正文由 AI 整理但数字全部来自日报 JSON（pipeline 校验每个数字可追溯）；`index.json` 是按日期降序的摘要列表。

### 4.5c `data/town/{date}.json` —— 产业镇每日数据
见 `docs/town-plan.md` 第 4 节；示例 `data/samples/town/2026-10-30.json`。前端只读这份文件决定天气、底座高度、楼顶旗 / 射灯、目标价牌、广告牌、巴士与飞艇文字；归档页回放时按日期切换。

### 4.6 其它
- `data/companies.json`：`{ layers:[{id, name, color, segs}], companies:[{t, name, cap, layer, seg}] }`（现 `data.js` 去掉虚构行情后的部分）。
- `data/company/{T}.json`：`{ profile, px60:[[date, close]], events:[统一事件模型], targets:[{date, firm, lo, hi}], seen:{opt, rr, news}, upstream[], downstream[] }`。统一事件模型见 `docs/data-sources.md` 第 2 节。
- `data/stocks/{T}.json`：`{ bars:[{t,o,h,l,c,v}], cp:[[date, cpDev]], earn:[date], hot:[{date, contract, vol}], targets }`。
- `data/chain.json`：节点与连线（`docs/data-sources.md` 第 4 节）。
- `data/search-index.json`：`[{g, t, sub, href, k}]`，构建时由公司、页面、归档日期生成。

## 5. 字段映射：kzg-option-brief → 潮信

来源接口（都要带 `?key=`，地址与 key 放 Secrets `KZG_BASE`、`KZG_KEY`）：`/report.json?date=`（判断 JSON + 海报数据快照 `data`）、`/brief.json?date=`（数据面）、`/weekly.json?week=`、`/weekly-report.json?week=`、`/px.json`。

| 潮信字段 | 来源 | 规则（在 pipeline 里固定） |
|---|---|---|
| `mood` | `report.mood` | 直接用 |
| `h2` | `report.headline`（≤14 字） | 直接用 |
| `t3` | `report.summary`（≤60 字） | 直接用 |
| `cp, base, dev` | `data.market.cp / cpBase / cpDev` | 保留两位 |
| `intra` | `data.market.intraday` | 取 13 档，量按当天最大值归一 |
| `events` | `report.events[{text, source, url}]` | `chips` 由 pipeline 用公司代码表在 `text` 里匹配 |
| `picks` | `report.picks`（`group = ai`、非 `compact`，按 conf 降序取 3）+ 该票在 `data.ai.changed` 里的数据行 | `vx = volX`、`px = premX`、`cp = cpDev`、`leap` 由 `leapTrend / leapZ` 写成固定文案、`hot = hottest`、`rank` = 成交排名；`why` 用 `report.picks[].why` |
| `watch` | `report.watch[].sym` | — |
| `strong` | `picks` 里 conf 最高、再按 `max(vx, px)` 最大的一只 | 规则固定，不让 AI 选 |
| `heat` | `data.segments`（按环节的量倍数中位数与 CP 偏离） | 取六个海报环节；名称映射表写在 pipeline |
| `hot` | `heat[0]` | — |
| `text` | `report.text` | 原文，仅去掉"提醒行" |
| `dataOnly` | 当天没有 `report:<date>` | 用 `/brief.json` 的数据面生成 h2 / t3（固定模板），`picks` 取 `ai.changed` 前 3 |
| 周报 `segs / persist / strongest / next` | `weekly.json` 的 `rotation / persistent / strongest / ahead` | 字段改名即可 |
| 周报 `headline / summary / themes` | `weekly-report.json` | 直接用 |

注意：
- kzg 的"可信度 = 底分 + 消息调级"这一套留在 kzg，潮信只展示 `conf`，不重算，也不展示 `base / adj`。
- kzg 新闻原文（`nr:*`）不进潮信；只用判断 JSON 里的 `events[].text / source / url`。
- 旧日期：kzg KV 只留 30 天，但 `report.json` 带快照，所以潮信自己把每天的 JSON 存进仓库 / R2，不依赖 kzg 回看。

## 6. 字段映射：研报卡片 → 研报日报

来源：`ima-knowledge-mcp`（私有）产出的研报卡片，字段以其导出为准，预期：`{ticker, firm, date, ratingOld, ratingNew, targetOld, targetNew, currency, points[], source}`。

- `act` 由代码判断：评级变化 → 上调 / 下调评级；目标价变化 → 上调 / 下调目标价；无旧值 → 首次覆盖；否则 维持。
- `pts` 取前 3 条，超过 40 字截断并加"…"；标 `ai: true`。
- 合规：不放原文段落、不放 PDF、机构名可以是真名（公开信息），但要点措辞要过 `compliance-scan`。
- 公司不在 58 家名单内的研报先丢弃（M2 再扩名单）。

## 7. 构建与部署

```
GitHub Actions（工作日）
  16:10 北京  pipeline/fetch-kzg → build-json → render-posters → astro build → wrangler deploy
  08:30 北京  pipeline/fetch-reports → build-json（只更新 rr/*、daily/index）→ astro build → deploy
  周日 09:00  fetch-kzg（周报）→ 同上
```
- 任一步失败：保留上一次产物，不部署，发 Actions 通知；没有判断 JSON 时按 `dataOnly` 出页，不等 AI。
- 产物：`web/dist/`（Workers Static Assets）；`data/*.json` 同时提交回仓库的 `pipeline/out/`（公开仓库，内容只含公开信息与 AI 摘要，不含 key、不含上游地址）。
- 免费额度核对：Workers 每天 10 万请求、静态资源不计费；Actions 每月 2,000 分钟（每天两次构建约 10 分钟，够）；R2 / D1 本阶段不用。

## 8. 订阅 API（M4 实现，接口先定）

| 接口 | 作用 |
|---|---|
| `POST /api/subscribe {email, cols[], watch[]}` | 写 D1（status = pending）并发确认邮件（double opt-in） |
| `GET /api/confirm?token=` | 激活，跳 `/subscribe?state=confirmed` |
| `GET /api/prefs?token=` / `POST /api/prefs` | 读写栏目、关注公司、送达时间、格式 |
| `GET /api/unsubscribe?token=` | 一键退订，跳 `/unsubscribe?done=1`；30 天后删除记录 |

D1 表：`subscribers(id, email, status, token, cols, watch, deliver_at, format, created_at, confirmed_at, unsub_at)`、`sends(id, sub_id, date, col, status, sent_at)`。发信用 Resend 免费额度（每天 100 封），超出前先限制订阅数并在页面注明。

## 9. 质量门槛

- 首屏：手机端 LCP < 2.5 s（3D 延后起、字体 `font-display: swap`）；three 分包 gzip < 200 KB；`quality.js` 分级与自动降档保留。
- 兼容：Chrome / Safari / 微信内置浏览器各看一遍 3D（WebGL2 不可用时显示静态海报背景）。
- 布局：390 宽无横向溢出；键盘可用（⌘K、归档 ← →、Esc）。
- 合规：`scripts/compliance-scan.mjs`（已写好，`node scripts/compliance-scan.mjs`）扫所有页面模板、JSON 文案与邮件模板，命中以下词即失败（免责声明里的"投资建议""不荐股"除外）：
  `推荐|买入|卖出|看涨|看跌|机会|抄底|稳赚|翻倍|目标位|超买|超卖|建议|荐股`
- 数字一致性：构建时校验海报 HTML 里出现的每个数字都能在当天 JSON 找到来源（同 kzg 的 `/verify` 思路，但只查数字）。
- 测试：`poster.ts` 渲染快照、周报汇总规则、`compliance-scan`、搜索索引生成。

## 10. 工作量拆分（建议顺序）

| # | 内容 | 预计 |
|---|---|---|
| 1 | 初始化 Astro + token + Base 布局 + 部署流水线跑通（空页面上线） | 1 天 |
| 2 | 首页迁移：栏目、样张、FAQ、订阅框先上；3D（首屏小镇、手机、产业镇、研报环、3D 盘面）懒加载接入 | 2 天 |
| 3 | 日报归档：JSON 契约、示例数据导出、`daily/[date]` SSR 海报、回放 | 1.5 天 |
| 4 | 公司档案、看盘 | 2 天 |
| 5 | ⌘K、订阅 / 退订页、邮件模板（table 版） | 1 天 |
| 6 | pipeline 读 kzg（先对真实 `report.json` 跑一次映射，核对第 5 节字段名） | 1 天 |
| 7 | 合规扫描、截图回归、Lighthouse、文档 | 1 天 |

## 11. 未决问题

1. `report.json` 的 `data.ai.changed[]` 数据行里 `volX / premX / cpDev / leapTrend / hottest` 的确切字段名，进 M1 第 6 步时对一遍 `brief.json`。
2. 研报卡片的导出格式与是否带来源 URL。
3. 行情数据：先用 kzg 的 `/px.json`（关注范围内 60 天收盘价），K 线的 OHLC 另找免费延迟源（M2）。
4. 域名与发件域名（SPF / DKIM）。
5. 深色模式：设计稿以浅色为主，M5 再做；token 里已留 `[data-theme=dark]`。
6. 盘前汇总上线时间：页面与归档已留位，数据源待定。
