# CLAUDE.md — 交接说明

## 沟通
- 所有回复、注释说明、文档一律使用**简体中文**；代码、命令、专有名词可保留英文。

## 项目
ChainLens（仓库名）：AI 产业链情报台，**对外品牌叫"潮信"**，栏目按本名叫：**盘前汇总**（开盘前，待上线）、**期权日报**（收盘后，海报署名暂为 KZG 期权 Pro）、**研报日报**、**周报**，以及不定期的**专栏报告**（财报 / 产业链 / 事件专题）；不用"早潮 / 晚潮"的叫法。先读：
1. `docs/compliance.md`（合规，优先级最高）
2. `docs/design.md`
3. `docs/architecture.md`
4. `docs/data-sources.md`
5. `docs/roadmap.md`（当前进度与下一步）
6. `docs/m1-plan.md`（M1 工程化方案、静态 JSON 契约、与上游字段映射）
7. `docs/town-plan.md`（AI 产业镇重构方案：子地块细分、自然布局、扩展区、信号上镇、分步实现）

## 硬性约束
- 只用 Cloudflare **免费**额度，不引入 Workers Paid 依赖。
- 仓库是**公开**的：密钥、上游私有接口地址、订阅者数据一律走 Secrets / 环境变量，绝不提交。
- 数据侧判断（阈值、排序、"信息集中出现"规则）用代码固定；AI 只做文字摘要。
- 期权信号直接读取 `kzg-option-brief` 的结果，不在本仓库重算。
- 不提交研报原文或付费订阅原文，示例数据用虚构 / 脱敏内容。
- 任何面向用户的文案都要过 `docs/compliance.md` 的自检清单。

## 视觉
- 以 `docs/design-direction.md` 为准：**浅色"雾彩·清透"**，与期权日报海报同源（`kzg-option-brief/docs/poster-style.md`）；可切换深色但以浅色为主；**绿涨红跌**全站统一。
- 首页是日报订阅落地页（`design/v4/`），看盘工具（K 线、产业链图）是二级页面。
- 共用资源在 `design/v3/assets/`（brand.css、iso.js、data.js）；v1、v2 稿仅作历史参考。
- 海报、设计稿类页面提供高清图下载按钮；使用 Lightweight Charts 时保留 TradingView 署名。

## 下一步
M0 设计稿已完成（`design/v4/`），按 `docs/m1-plan.md` 进入 M1 工程化。
