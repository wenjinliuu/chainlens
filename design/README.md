# design/ · HTML 设计稿（M0）

直接用浏览器打开 `index.html` 即可，无需构建。

| 文件 | 内容 | 版本 |
|---|---|---|
| `home-desktop.html` | 今日驾驶舱 · 电脑版 1440 | A 晨雾玻璃 / B 彩釉 Bento / C 终端纸面 |
| `stock-desktop.html` | 个股页 · 电脑版 1440 | A 双栏研报侧栏 / B 沉浸主图 + 统一时间线 |
| `home-mobile.html` | 首页 · 手机版 390×844 | A 竖向卡片流 / B 双列瀑布 / C 分组摘要 |
| `assets/sample-data.js` | 共用示例数据（**全部虚构**） | |
| `assets/common.js` | 版本切换、高清图下载、热力图、K 线、CP 副图 | |
| `assets/base.css` | 方向色、事件色、图表与合规元素样式 | |

说明：

- 顶部深色条是设计稿外壳，不属于设计本身；可切换版本、下载当前版本高清图（2x PNG）。海报和手机版提供 3x 下载。
- 高清图下载依赖 jsDelivr 上的 `html-to-image`，需联网。
- K 线在设计稿里用 SVG 手绘示意；M1 正式实现改用 TradingView Lightweight Charts，并保留 TradingView 署名。
- 示例数据里的机构一律写成"机构 A/B/C…"，媒体一律写成"示例媒体"，不对应真实研报或行情。
