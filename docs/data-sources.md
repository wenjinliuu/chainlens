# 数据来源与数据模型

## 1. 数据来源

| 类别 | 来源 | 说明 |
|---|---|---|
| 期权信号 | `kzg-option-brief`（私有） | 已按"相对自身波动"的分布阈值算好的 CP 比 / LEAP CP 比信号；ChainLens 只读取，不重算 |
| 研报观点 / 评级 / 目标价 | `ima-knowledge-mcp`（私有） | 研报日报提取出的研报卡片。**这是 ChainLens 的独家数据** |
| 个股新闻 | Finnhub 免费层（主）+ 其他补充 | 与期权日报一致 |
| 分析师评级趋势 | Finnhub `recommendation-trends`（免费） | 买入 / 持有 / 卖出家数的月度分布 |
| 行情 K 线 | 待定（免费、延迟数据即可） | 页面必须标注数据延迟 |
| 产业链关系 | 手工维护 `chain.json` | 先覆盖期权日报 Top 范围内的公司 |

注意：Finnhub 的目标价共识接口可能需要付费，目标价以研报卡片为主。

## 2. 统一事件模型

所有来源都归一化为"事件"，前端只认这一种结构：

```json
{
  "id": "evt_20261030_NVDA_report_01",
  "ticker": "NVDA",
  "date": "2026-10-30",
  "type": "option | report | news",
  "title": "某机构上调目标价",
  "summary": "最多 3 条要点，事实陈述",
  "source": "机构名 / 媒体名",
  "url": "原文链接（如有）",
  "data": { }
}
```

`data` 按类型扩展：

```json
// type = option
{ "cp": 2.31, "leap_cp": 1.8, "z": 2.4, "direction": "up | down" }

// type = report
{ "firm": "Morgan Stanley", "rating_old": "Equal-weight", "rating_new": "Overweight",
  "target_old": 150, "target_new": 180, "currency": "USD" }

// type = news
{ "importance": "high | normal" }
```

## 3. 输出 JSON（R2）

```
/data/latest/meta.json            最新交易日、更新时间、数据延迟说明
/data/latest/dashboard.json       驾驶舱全部卡片数据
/data/latest/stocks/{TICKER}.json 个股页：行情、事件、目标价区间历史
/data/latest/chain.json           产业链节点与连线 + 当日状态
/data/{YYYY-MM-DD}/...            同结构的每日快照（用于时间回放）
/posters/{YYYY-MM-DD}.png         当日海报
/og/{...}.png                     分享图
```

## 4. 产业链关系 `chain.json`

```json
{
  "segments": ["算力芯片", "存储", "光模块/网络", "服务器/代工", "电力与能源", "云厂商", "原材料"],
  "nodes": [
    { "ticker": "NVDA", "name": "NVIDIA", "segment": "算力芯片" }
  ],
  "edges": [
    { "from": "TSM", "to": "NVDA", "relation": "代工" }
  ]
}
```

## 5. 示例数据

`data/samples/` 下放**虚构或已脱敏**的示例 JSON 供前端开发，不提交真实的付费研报内容。
