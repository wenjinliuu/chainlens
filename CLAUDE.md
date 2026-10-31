# CLAUDE.md — 交接说明

## 沟通
- 所有回复、注释说明、文档一律使用**简体中文**；代码、命令、专有名词可保留英文。

## 项目
ChainLens（链镜）：AI 产业链情报台。先读：
1. `docs/compliance.md`（合规，优先级最高）
2. `docs/design.md`
3. `docs/architecture.md`
4. `docs/data-sources.md`
5. `docs/roadmap.md`（当前进度与下一步）

## 硬性约束
- 只用 Cloudflare **免费**额度，不引入 Workers Paid 依赖。
- 仓库是**公开**的：密钥、上游私有接口地址、订阅者数据一律走 Secrets / 环境变量，绝不提交。
- 数据侧判断（阈值、排序、"信息集中出现"规则）用代码固定；AI 只做文字摘要。
- 期权信号直接读取 `kzg-option-brief` 的结果，不在本仓库重算。
- 不提交研报原文或付费订阅原文，示例数据用虚构 / 脱敏内容。
- 任何面向用户的文案都要过 `docs/compliance.md` 的自检清单。

## 视觉
- 以 `docs/design-direction.md` 为准：深色"控制室"方向（v2），**绿涨红跌**全站统一；颜色只表达语义，动效必须表达信息。
- v1 浅色稿（`design/*.html`）已被 v2（`design/v2/`）取代，仅作对比保留。
- 海报、设计稿类页面提供高清图下载按钮；设计稿习惯在一个页面里放多个版本对比。
- 使用 Lightweight Charts 时保留 TradingView 署名。

## 下一步
从 `docs/roadmap.md` 的 M0 剩余项（`design/` 设计稿）或 M1 开始。
