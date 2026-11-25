// 防止兩台裝置同時改同一份進度（2026-11-25 省寫入版）：
// 舊做法是在批次裡插入再刪除一筆 state_guards，每次動作多寫 4 筆（含索引）。
// 新做法緊接在 UPDATE progress 之後執行這個 SELECT：若版本不符（changes() 不是 1）就讓 json() 報錯，
// 整個 D1 批次一起回滾，效果相同但完全不寫入。changes() 讓運算式無法被預先計算，只在版本不符時報錯。
export const staleGuard=db=>db.prepare("SELECT json(CASE WHEN changes()=1 THEN '1' ELSE 'stale progress version' END) AS ok");
