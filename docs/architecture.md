# 技术架构

## 1. 原则

- **全部用 Cloudflare 免费额度**。不使用 Workers Paid 套餐；免费额度不够时，备选腾讯云 CloudBase 或轻量服务器。
- **预计算 + 静态前端**：数据在定时任务里算好，生成 JSON；前端只读 JSON，不在请求时计算。
- **数据侧判断由代码固定，AI 只负责文字类内容**（新闻摘要、研报要点提炼）。与 kzg-option-brief 的做法一致。
- 结构清晰、文档齐全，方便以后由人或 AI 接手维护。

## 2. 整体数据流

```
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │ kzg-option-brief │   │ ima-knowledge-mcp│   │ 新闻 / 行情 API  │
 │  期权日报数据     │   │  研报日报 / 卡片  │   │ Finnhub 免费等   │
 └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
          │                      │                      │
          └──────────────┬───────┴──────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  构建任务 (每日定时)   │  GitHub Actions 或 Worker Cron
              │  - 拉取各来源          │
              │  - 归一化为统一事件模型 │
              │  - 计算"信息集中出现"  │
              │  - 生成页面 JSON        │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  R2：静态 JSON / 海报   │
              │  D1：订阅用户 / 自选股   │
              └──────────┬───────────┘
                         ▼
   ┌───────────────────────────┐      ┌──────────────────────┐
   │ 前端（静态站，Workers 静态资源 │      │ 邮件任务（Resend 免费） │
   │  或 Pages 托管）             │      │ 按自选股推送            │
   └───────────────────────────┘      └──────────────────────┘
```

## 3. 前端

- 框架：**Astro**（静态生成为主，局部交互用 React 岛）或 **Vite + React**。倾向 Astro：首屏快、天然适合"每页一份 JSON"。
- 图表：
  - K 线与事件标记：**TradingView Lightweight Charts**（Apache-2.0，**必须在页面上注明 TradingView 并附链接**，可直接保留其 attribution logo）。
  - 热力图 / 产业链图：D3 或 ECharts。
- 样式：沿用设计稿的雾彩·清透 token（`design/v3/assets/brand.css`），拆成 `src/styles/`；Tailwind 可选，不作为前提（见 `docs/m1-plan.md`）。
- PWA：manifest + service worker，缓存最近一天的 JSON。
- 命令面板：cmdk 或自写。

## 4. 存储

| 存储 | 用途 |
|---|---|
| R2 | 每日生成的 JSON（`/data/YYYY-MM-DD/*.json`、`/data/latest/*.json`）、海报图片、OG 图 |
| D1 | 订阅者（邮箱、确认状态、退订 token）、自选股、发送记录 |
| KV（可选） | 少量热点配置，如当前最新交易日 |

目录约定见 [data-sources.md](data-sources.md)。

## 5. 定时任务

| 任务 | 时间（北京） | 说明 |
|---|---|---|
| 期权数据同步 | 跟随 kzg-option-brief（工作日晚间） | 读取其已算好的结果，不重复计算 |
| 研报数据同步 | 每日早间 | 读取 ima-knowledge-mcp 前一天的研报卡片 |
| 新闻同步 | 每日数次 | 只拉覆盖范围内的个股新闻 |
| 站点构建 | 上述完成后 | 生成 JSON、OG 图，写入 R2 |
| 邮件推送 | 构建完成后 | 按自选股分组发送 |

Cron 平台：GitHub Actions 有延迟，对时间敏感的任务优先用 Worker Cron Trigger（免费版可用）。

## 6. 邮件

- 发信：**Resend 免费额度**（每月 3,000 封、每天 100 封）。用户多了再评估付费方案。（Cloudflare Email Service 需要 Workers Paid，不选。）
- 发件地址用自有域名，配置 SPF / DKIM / DMARC。
- 邮件模板：缩略预览 + 要点 + 链接回站；图片托管在 R2；底部一键退订。
- 上线前用 QQ 邮箱、163、Gmail 各测一次到达率。

## 7. 仓库目录（建议）

```
chainlens/
├── docs/                 设计与架构文档
├── design/               HTML 设计稿（首页 / 个股 / 手机版，多版本对比）
├── web/                  前端（Astro）
├── pipeline/             数据构建任务（拉取、归一化、生成 JSON）
├── worker/               Cloudflare Worker（订阅 API、邮件、Cron）
├── data/samples/         示例 JSON（开发用，不含真实付费内容）
└── CLAUDE.md
```

## 8. 安全

- 仓库是**公开**的：任何 API key、Token、邮箱列表都只放在 GitHub Secrets / Cloudflare Secrets，不进代码。
- 订阅者邮箱只存在 D1，不导出到仓库。
- 上游私有仓库的接口地址不写进公开代码，通过环境变量注入。
