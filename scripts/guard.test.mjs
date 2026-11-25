import test from 'node:test';import assert from 'node:assert/strict';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {staleGuard} from '../server/guard.js';
test('staleGuard rolls back the whole D1 batch on a stale version and writes nothing extra',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-10-20',d1Databases:['DB']}));
 try{const db=await mf.getD1Database('DB');
  await db.exec("CREATE TABLE progress (user_id TEXT PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL)");await db.exec("CREATE TABLE ops (id TEXT PRIMARY KEY)");
  await db.prepare("INSERT INTO progress VALUES('a',1,'old')").run();
  const batch=(version,id)=>db.batch([db.prepare('UPDATE progress SET data=?,version=version+1 WHERE user_id=? AND version=?').bind('new-'+id,'a',version),staleGuard(db),db.prepare('INSERT INTO ops(id) VALUES(?)').bind(id)]);
  await assert.rejects(batch(0,'stale'));
  assert.equal((await db.prepare("SELECT data FROM progress").first()).data,'old');assert.equal((await db.prepare("SELECT count(*) n FROM ops").first()).n,0);
  const ok=await batch(1,'fresh');assert.equal(ok[1].meta.rows_written||0,0);
  assert.deepEqual(await db.prepare("SELECT data,version FROM progress").first(),{data:'new-fresh',version:2});assert.equal((await db.prepare("SELECT count(*) n FROM ops").first()).n,1);
  await assert.rejects(batch(1,'again'));assert.equal((await db.prepare("SELECT count(*) n FROM ops").first()).n,1);
 }finally{await mf.dispose();}
});
