# ChainLens · 链镜

> AI 产业链情报台 —— 把**期权信号、研报观点、目标价、个股新闻**按时间线叠在一起，一只股票一个页面看清楚。

ChainLens 只做**公开信息的整理与可视化**，不提供任何投资建议、买卖时机或价格预测。详见 [docs/compliance.md](docs/compliance.md)。

## 它是什么

- **今日驾驶舱**：一屏看完当天 AI 产业链的期权异动、研报评级/目标价变动、重要个股新闻。
- **个股页**：K 线 + 事件标记（期权异动 / 研报调整 / 新闻）+ 研报目标价区间带 + CP 比历史 + 研报观点时间线。
- **产业链地图**：上下游节点图，点节点进个股页。
- **日报 / 海报归档**：每天一张海报，可下载高清图；支持"时间回放"查看任意一天。
- **邮件订阅**：按自选股推送更新。

## 文档

| 文档 | 内容 |
|---|---|
| [docs/design.md](docs/design.md) | 产品设计：板块、页面布局、电脑版 / 手机版、视觉风格 |
| [docs/design-direction.md](docs/design-direction.md) | 设计方向 v2：参考案例、视觉与动效原则（取代 design.md 的视觉风格一节） |
| [docs/architecture.md](docs/architecture.md) | 技术架构：数据流、存储、前端、部署、邮件 |
| [docs/data-sources.md](docs/data-sources.md) | 数据来源与数据模型（JSON 结构） |
| [docs/compliance.md](docs/compliance.md) | 合规原则（必读） |
| [docs/roadmap.md](docs/roadmap.md) | 分阶段路线图 |
| [docs/m1-plan.md](docs/m1-plan.md) | M1 工程化方案、静态 JSON 契约、与上游字段映射 |
| [docs/town-plan.md](docs/town-plan.md) | AI 产业镇重构方案：子地块细分、自然布局、扩展区、信号上镇 |
| [CLAUDE.md](CLAUDE.md) | 给 AI 编程助手的交接说明 |

## 状态

M0 设计稿已完成（`design/v4/`，浏览器直接打开 HTML 即可看，不需要构建），下一步按 [docs/m1-plan.md](docs/m1-plan.md) 进入 M1 工程化。

| 设计稿 | 内容 |
|---|---|
| `design/v4/index.html` | 首页：全屏 3D AI 产业镇 + 悬浮手机与飞出卡片、三个栏目与样张、产业镇导览（可点车辆 / 行人 / 公司楼）、研报卡片环、拆开日报、3D 盘面、生成流程、订阅、FAQ |
| `design/v4/daily.html` | 日报归档：月历 + 时间回放，期权日报海报（高清下载 / 文字版）、研报日报、周报 |
| `design/v4/company.html` | 公司档案：3D 信息星图、近 60 日行情 + 事件、街区 3D、期权 / 研报 / 新闻、出现记录 |
| `design/v4/stock.html` | 看盘：Lightweight Charts 多窗格指标 + 财报日、最热合约、研报目标价区间 |
| `design/v4/subscribe.html` `unsubscribe.html` `email.html` | 订阅确认 / 偏好 / 退订流程，邮件模板 |

所有页面支持 ⌘K 全局搜索；数据全部为虚构示例。辅助脚本：`node scripts/compliance-scan.mjs`（文案合规扫描）、`node scripts/export-samples.mjs`（导出示例 JSON 到 `data/samples/`）。

## 关联项目

- `kzg-option-brief`（私有）：美股期权日报，ChainLens 的期权数据来源。
- `ima-knowledge-mcp`（私有）：研报日报，ChainLens 的研报观点 / 目标价来源。
- `poster-kit` / `poster-gallery`：海报生成与图库。
