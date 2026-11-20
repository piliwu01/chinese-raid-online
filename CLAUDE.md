# 題靈冒險 QuizSpirit（國文全班討伐線上版）

正式網址：https://chinese-raid.piliwu.workers.dev
使用者是國中國文老師，非工程師。**全程用繁體中文回覆**，用白話說明，中文與英文／數字之間加半形空格，日期用台北時間。

## 架構

- 前端：React 19 + Vite（`src/`），入口 `src/main.jsx` → `CloudApp.jsx`（登入、帳號列）→ `App.jsx`（冒險／篇章／夥伴／任務／福運／商城／圖鑑／對戰場，一頁一畫面）。
- 後端：Cloudflare Worker（`server/worker.js`）＋ D1 資料庫 `chinese-raid-db`（id f4727dbc-5c53-4d88-9aa5-cded6974bde4）＋ Durable Objects：`RaidRoom`（`server/raid-room.js`，全班討伐）、`PvpRoom`（`server/pvp-room.js`）。
- 共用規則（前後端都用、純函式、有單元測試）：`shared/`。
  - `game.js`：伺服器權威的 `applyAction`，所有學生進度變更都走這裡；`freshState()` 是新帳號的進度。
  - `raid-rules.js`＋`raid-skills.js`：討伐規則與魔王干擾技能（設定在 `BOSS_SKILL`）。
  - `passives.js`（初始夥伴被動）、`qpick.js`（抽題不重複）、`hero.js`（英雄榜）、`lucky.js`（山海籤）、`dupes.js`（重複卡轉化）、`trade.js`（卡牌交易）。
- 一次性：`operations` 表（requestId 防重送）；多筆原子更新：`state_guards`。
- 角色圖：存在 D1 `art_images`，由 `/assets/<id>.png` 提供，Worker 快取 1 小時。音樂 `public/music`，遊戲說明圖 `public/guide/1~6.webp`。
- 資料表定義：`migrations/`。**deploy.bat 不會自動套用 migration**，新增資料表要另外對正式 D1 執行 `CREATE TABLE IF NOT EXISTS ...`，並把 SQL 存進 `migrations/`。

## 開發與測試

- 安裝：`npm ci`
- 單元測試：`npm test`（新增測試檔要加進 package.json 的 test 清單）。改規則後全部要通過。
- 建置：`npm run build`
- 本機試玩：`npm run dev` 或雙擊 `start-local.cmd` → http://127.0.0.1:8788。本機老師帳密在 `work/本機老師帳密.txt`。反覆登入被擋時清登入限制：
  `npx wrangler d1 execute chinese-raid-db --local --command "delete from login_limits"`
- 不以「build 成功」代替測試：版面改動要實際用瀏覽器在 1920×1080、1366×768、390×844 看過；用 `getBoundingClientRect` 量測重疊比看截圖可靠。

## 部署

- 使用者雙擊 `deploy.bat`（npm ci → wrangler login → build → deploy → 寫入題庫）。
- 部署前先問使用者同意；部署後到正式網址實際開啟確認。

## 正式站驗證規則

- 不要跟使用者要密碼。需要測試時，用 Cloudflare 在 D1 建立臨時帳號，帳號一律以 `zztest-` 開頭：
  - `users` 欄位：`id, username, display_name, class_name, role, password(雜湊), must_change, created_at(毫秒)`；學生 `role='student'`，要測開討伐房／投影畫面時另建 `role='teacher'` 的 `zztest-t1`。
  - 另插一筆 `progress(user_id, version, data)`，data 用 `freshState()` 並填好 `growth.starter`、`captured`、`selected`。
- 測完一定清理，依序刪除 `user_id IN (select id from users where username like 'zztest-%')` 的 hero_awards、trades（from_id/to_id）、sessions、operations、raid_members、pvp_members、activity_locks、progress、ai_usage，再刪 host 為測試帳號的 raid_rooms、pvp_rooms，最後刪 users，並回報剩餘帳號數。
- 不在真實學生帳號上做會改變資料的測試。

## 設計規則（使用者已確認，不要擅自改回）

- 角色全部原創（《山海經》神獸），不使用寶可夢等既有作品的角色或圖。
- 敵人與魔王半血暴走，攻擊 ×1.5；單人對戰敵人 500 血、只在答錯／超時反擊；PVP 5 分鐘。
- 討伐魔王血量預設＝人數 × 300；魔王四招（墨甲護體、亂序咒、墨霧遮眼、反噬詛咒）開戰 60 秒起每 60 秒、暴走後每 45 秒，出招前 3 秒預告；全班合擊可打斷。
- 不要有答題倒數嘟嘟聲與出題提示音；音樂只用 `public/music` 的 4 首。
- 「對戰場」分頁未開戰時按下要帶回「冒險」並提示，不可做成灰色不能按。
- 每次功能改動，在 `README.txt` 末尾補一段說明（含日期）。

## 安全

- 金鑰、密碼不寫進程式碼或前端；AI 用的 Groq 金鑰在 Cloudflare Secrets Store，Worker 用綁定 `env.GROQ_KEY` 取得。
- 若要放上 GitHub：使用者的程式庫都是公開的，push 前確認沒有 `work/`、`.wrangler/`、`node_modules/`、`dist/`、帳密檔。commit／push 只在使用者要求時做。

## 參考經驗

更多製作經驗與案例：GitHub `piliwu01/quizspirit-template` 的 `references/`（特別是 `quizspirit-shanhai-case.md`、`production-verification.md`）。
