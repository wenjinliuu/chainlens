# 路线图

## M0 · 设计（当前）
- [x] 产品设计、架构、数据模型、合规文档
- [x] `design/`：首页（电脑版）、个股页（电脑版）、首页（手机版）HTML 设计稿，每页 2~3 个风格对比
- [x] 设计方向 v2：调研参考案例，见 `docs/design-direction.md`
- [x] `design/v2/`：AI 产业链全景动画页、专业行情页（多窗格指标）
- [ ] 确认 v2 方向；补今日驾驶舱 v2、手机版 v2

## M1 · 静态骨架
- [ ] Astro 项目初始化，设计 token（颜色 / 圆角 / 阴影 / 字体）
- [ ] `data/samples/` 示例 JSON
- [ ] 驾驶舱、个股页用示例数据跑通（含 Lightweight Charts K 线 + 事件标记）
- [ ] 部署到 Cloudflare（免费）

## M2 · 接入真实数据
- [ ] pipeline：读取 kzg-option-brief 期权结果 → 事件
- [ ] pipeline：读取 ima-knowledge-mcp 研报卡片 → 事件 + 目标价区间
- [ ] pipeline：Finnhub 新闻 + 评级趋势
- [ ] 每日快照与时间回放
- [ ] "信息集中出现"规则

## M3 · 产业链与归档
- [ ] `chain.json` 手工维护 + 产业链地图
- [ ] 日报 / 海报归档日历，海报高清下载
- [ ] OG 分享图自动生成

## M4 · 订阅
- [ ] D1 订阅表、double opt-in、退订
- [ ] Resend 邮件模板，按自选股推送
- [ ] 国内邮箱到达率测试

## M5 · 体验打磨
- [ ] 手机版卡片流、PWA
- [ ] ⌘K 命令面板
- [ ] 深色模式
