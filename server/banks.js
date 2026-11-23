// 2026-11-23 取消「自動數學練習」：沒指定題庫或指定 math-auto 時，改用預設國文題庫（資料庫裡沒有時才退回自動數學，供舊測試與空資料庫使用）。
export const DEFAULT_BANK_ID='chinese-115-review-v1';
export async function pickBankId(db,bankId){
 const id=String(bankId||'');if(id&&id!=='math-auto')return id;
 const row=await db.prepare('SELECT id FROM banks WHERE id=?').bind(DEFAULT_BANK_ID).first()||await db.prepare('SELECT id FROM banks ORDER BY created_at DESC LIMIT 1').first();
 return row?.id||'math-auto';
}
