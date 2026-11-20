// 產生把國文題庫寫入正式 D1 的 SQL（可重複執行，不會重複新增）。
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {validateBank} from '../src/question-bank.js';
const file=process.argv[2]||'data/chinese-115-review-v1.json';
const bank=JSON.parse(readFileSync(file,'utf8'));const check=validateBank(bank);
if(!check.ok){console.error('題庫格式有誤：',check.errors.slice(0,3).join('；'));process.exit(1);}
const text=JSON.stringify(bank),q=s=>"'"+s.replaceAll("'","''")+"'";
const chunks=[];for(let i=0;i<text.length;i+=20000)chunks.push(text.slice(i,i+20000));
const sql=['CREATE TABLE IF NOT EXISTS _seed_bank(d TEXT NOT NULL);','DELETE FROM _seed_bank;',`INSERT INTO _seed_bank(d) VALUES(${q(chunks[0])});`,
 ...chunks.slice(1).map(c=>`UPDATE _seed_bank SET d=d||${q(c)};`),
 `INSERT OR IGNORE INTO banks(id,title,data,created_at) SELECT ${q(bank.bankId)},${q(bank.title)},d,${Date.now()} FROM _seed_bank;`,'DROP TABLE _seed_bank;'].join('\n');
mkdirSync('work',{recursive:true});writeFileSync('work/seed-bank.sql',sql);
console.log(`題庫「${bank.title}」共 ${check.active} 題可用，已產生 work/seed-bank.sql`);
