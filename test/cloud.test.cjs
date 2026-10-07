const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const {createECDH,randomBytes}=require('node:crypto');
let mf,db,sent=0;const token='d'.repeat(64);
const request=(route,method='GET',data,key=token)=>mf.dispatchFetch('https://impulso.test/api/'+route,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
before(async()=>{
 mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'.wrangler/build/worker.js',compatibilityDate:'2026-01-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{VAPID_SUBJECT:'https://github.com/matpaz400/Recordatorios'},serviceBindings:{ASSETS:()=>new Response('assets')},outboundService:async request=>{assert.equal(new URL(request.url).host,'web.push.apple.com');assert.ok(request.headers.get('Authorization'));assert.equal(request.headers.get('Content-Encoding'),'aes128gcm');assert.ok((await request.arrayBuffer()).byteLength>0);sent++;return new Response(null,{status:201})}}));
 db=await mf.getD1Database('DB');for(const statement of fs.readFileSync('migrations/0001_initial.sql','utf8').split(';').filter(x=>x.trim()))await db.prepare(statement).run();
});
after(async()=>{await mf?.dispose()});
test('Worker real: salud, claves persistentes, tareas, racha y aislamiento',async()=>{
 assert.equal((await mf.dispatchFetch('https://impulso.test/healthz')).status,200);
 const c1=await(await request('config')).json();assert.equal(c1.subjects.length,7);assert.ok(c1.publicKey);const c2=await(await request('config')).json();assert.equal(c1.publicKey,c2.publicKey);assert.equal(c1.privateKey,undefined);
 assert.equal((await request('state','GET',null,'bad')).status,401);
 assert.equal((await request('tasks','POST',{title:'Prueba D1',subject:'Robótica I',description:'Persistencia',due:''})).status,201);
 let s=await(await request('state')).json();assert.equal(s.tasks.length,1);const id=s.tasks[0].id;
 assert.equal((await(await request('state','GET',null,'e'.repeat(64))).json()).tasks.length,0);
 assert.equal((await request('tasks/'+id,'PATCH',{completed:true})).status,200);s=await(await request('state')).json();assert.equal(s.streak,1);
 assert.equal((await request('tasks/'+id,'PATCH',{completed:'false'})).status,400);
 assert.equal((await request('tasks/'+id,'DELETE')).status,200);assert.equal((await(await request('state')).json()).tasks.length,0);
});
function subscription(){const curve=createECDH('prime256v1');curve.generateKeys();return {endpoint:'https://web.push.apple.com/test-subscription',keys:{p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}}}
async function seed(){const state={tasks:[{title:'Taller',subject:'Robótica I',completedDay:null}],settings:{},subscription:subscription(),lastSent:null};await db.prepare('INSERT INTO profiles VALUES (?,?) ON CONFLICT(token) DO UPDATE SET state=excluded.state').bind('f'.repeat(64),JSON.stringify(state)).run()}
test('Cron: cifrado Web Push en workerd, envío después de clases y sin duplicados',async()=>{
 await seed();sent=0;
 await (await mf.getWorker()).scheduled({scheduledTime:Date.parse('2026-10-05T16:59:00-05:00'),cron:'* * * * *'});assert.equal(sent,0);
 await (await mf.getWorker()).scheduled({scheduledTime:Date.parse('2026-10-05T17:00:00-05:00'),cron:'* * * * *'});assert.equal(sent,1);
 await (await mf.getWorker()).scheduled({scheduledTime:Date.parse('2026-10-05T17:01:00-05:00'),cron:'* * * * *'});assert.equal(sent,1);
 const row=await db.prepare('SELECT state FROM profiles WHERE token=?').bind('f'.repeat(64)).first();assert.equal(JSON.parse(row.state).lastSent,'2026-10-05');
 await (await mf.getWorker()).scheduled({scheduledTime:Date.parse('2026-10-10T10:00:00-05:00'),cron:'* * * * *'});assert.equal(sent,2);
});
