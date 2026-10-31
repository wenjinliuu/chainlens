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
| [CLAUDE.md](CLAUDE.md) | 给 AI 编程助手的交接说明 |

## 状态

设计阶段。代码尚未开始，见 [docs/roadmap.md](docs/roadmap.md) 的 M1。

## 关联项目

- `kzg-option-brief`（私有）：美股期权日报，ChainLens 的期权数据来源。
- `ima-knowledge-mcp`（私有）：研报日报，ChainLens 的研报观点 / 目标价来源。
- `poster-kit` / `poster-gallery`：海报生成与图库。
