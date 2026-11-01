-- 潮信 · 订阅表（D1 免费额度）。邮箱只在这里，不导出到仓库
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | confirmed | unsubscribed
  token TEXT NOT NULL UNIQUE,                  -- 确认 / 管理偏好 / 退订链接共用的一把随机串
  cols TEXT NOT NULL DEFAULT 'eve,rr',         -- 栏目：eve 期权日报 rr 研报日报 morn 盘前汇总 week 周报 col 专栏
  watch TEXT NOT NULL DEFAULT '',              -- 关注的公司代码，逗号分隔
  deliver_at TEXT NOT NULL DEFAULT 'close',    -- close 收盘后立即 | morning 合并到早上
  format TEXT NOT NULL DEFAULT 'poster',       -- poster 海报缩略 + 要点 | text 纯文字
  created_at TEXT NOT NULL,
  confirm_sent_at TEXT,
  confirmed_at TEXT,
  unsub_at TEXT,
  last_sent_at TEXT
);
CREATE TABLE IF NOT EXISTS sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sub_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  col TEXT NOT NULL,
  status TEXT NOT NULL,                        -- sent | failed | skipped
  sent_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sends_sub ON sends(sub_id, date);
