# 路线图

## M0 · 设计（当前）
- [x] 产品设计、架构、数据模型、合规文档
- [x] `design/`：首页（电脑版）、个股页（电脑版）、首页（手机版）HTML 设计稿，每页 2~3 个风格对比
- [x] 设计方向 v2：调研参考案例，见 `docs/design-direction.md`
- [x] `design/v2/`：AI 产业链全景动画页、专业行情页（多窗格指标）
- [x] v3：浅色雾彩·清透（与日报同源）+ 等距 AI 产业城（`design/v3/`）
- [x] v4：日报订阅落地页（3D 首屏、拆开日报、3D 盘面、生成流程、FAQ，`design/v4/`）
- [x] 品牌定名"潮信"；落地页改为多栏目结构，加入 3D AI 产业岛
- [x] 潮水与产业链运作细节、吉祥物小更、研报 3D 区
- [x] 公司档案页（3D 信息星图 + 3D 时间轴）、看盘页浅色重构
- [x] 产业镇通栏、栏目改名、镇里可点、公司楼与街区小景、看盘页财报日 / 最热合约、画质分级
- [x] 栏目样张、订阅流程页（确认 / 偏好 / 退订）、邮件模板、日报归档页（日历 + 时间回放 + 高清下载）
- [x] 专栏报告栏目（阅读页、首页样张、归档 tab、搜索）；新 logo；去 AI 化微调；公司档案平面 K 线；实验性深色模式
- [x] 产业镇第 1 ~ 3 步：子链地块与牌子、信号旗 / 目标价牌、在建工地、发射场、天气；横街错位 + 四角半径不同 + 小河与桥；医疗园区 + 机器人试验场、周报上飞艇与巴士；山坡风机、港口广场钟楼与喷泉；近 7 日回放（方案 `docs/town-plan.md`；弯曲大道暂不做）
- [x] M1 工程化方案与数据接口草案：`docs/m1-plan.md`
- [ ] 确认整体方向后进入 M1：Astro 工程化（按 `docs/m1-plan.md`），接真实数据
- [ ] 上线前：取得数据授权、确认订阅免费与合规文案

## M1 · 静态骨架
- [x] Astro 项目初始化（`web/`，设计稿资源原样托管 + `scripts/sync-web.mjs` 同步，9 页可构建）；token 仍用 `brand.css`
- [x] `data/samples/` 示例 JSON（`node scripts/export-samples.mjs` 从设计稿数据导出，契约见 `docs/m1-plan.md` 第 4 节）
- [x] 归档 / 专栏 / 公司档案 / 搜索用示例 JSON 跑通（`archive.json` 汇总包，`pipeline/build-archive.mjs`）；个股页 K 线仍是前端虚构数据，待 M2 行情源
- [~] 部署到 Cloudflare（免费）：流水线与 wrangler 配置已写，等仓库 Secrets（`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`）

## M2 · 接入真实数据
- [~] pipeline：读取 kzg-option-brief 期权结果 → 日报 / 周报 JSON（`pipeline/fetch-kzg.mjs` 已写并有离线测试，待用真实 report.json 核对字段）
- [~] pipeline：读取 ima-knowledge-mcp 研报卡片 → 研报日报 JSON（`pipeline/build-rr.mjs` 已写并有测试，等导出格式）
- [ ] pipeline：Finnhub 新闻 + 评级趋势
- [~] 每日快照与时间回放（归档页时间回放已有；每日自动更新工作流 `data.yml` 已写，等 Secrets）
- [ ] "信息集中出现"规则

## M3 · 产业链与归档
- [ ] `chain.json` 手工维护 + 产业链地图
- [ ] 日报 / 海报归档日历，海报高清下载（设计稿见 `design/v4/daily.html`）
- [ ] OG 分享图自动生成

## M4 · 订阅
- [x] D1 订阅表、double opt-in、退订、偏好（`web/worker/index.mjs` + `migrations/0001_init.sql`，本地走通；上线要建 D1 并填 database_id）
- [~] Resend 确认邮件已接（缺 key 只记日志）；日报推送与按自选股分组待做
- [ ] 国内邮箱到达率测试

## M5 · 体验打磨
- [ ] 手机版卡片流、PWA
- [ ] ⌘K 命令面板（设计稿已做：`design/v4/assets/search.js`）
- [ ] 深色模式（设计稿已有实验性版本：`design/v4/assets/theme.js`，M1 迁移后再补细节）
