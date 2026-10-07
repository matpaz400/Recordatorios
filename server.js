const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const webpush=require('web-push');
const {subjects,schedule,localTime,isFree,reminderDue,streak}=require('./schedule');
const data=process.env.DATA_DIR||path.join(__dirname,'data');fs.mkdirSync(data,{recursive:true});
const db=new DatabaseSync(path.join(data,'study.db'));
db.exec('CREATE TABLE IF NOT EXISTS profiles (token TEXT PRIMARY KEY, state TEXT NOT NULL)');
const keyFile=path.join(data,'vapid.json');
if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,JSON.stringify(webpush.generateVAPIDKeys()),{mode:0o600});
const keys=JSON.parse(fs.readFileSync(keyFile));
webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://example.com',keys.publicKey,keys.privateKey);
const read=token=>{const r=db.prepare('SELECT state FROM profiles WHERE token=?').get(token);return r?JSON.parse(r.state):{tasks:[],settings:{startHour:8,endHour:21,timeZone:'America/Bogota',weekdaysOnly:false},subscription:null,lastSent:null}};
const save=(token,state)=>db.prepare('INSERT INTO profiles VALUES (?,?) ON CONFLICT(token) DO UPDATE SET state=excluded.state').run(token,JSON.stringify(state));
const json=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>100000)throw Error('Solicitud demasiado grande')}return JSON.parse(s||'{}')}
function validSubscription(s){if(!s||typeof s.endpoint!=='string'||!s.keys||typeof s.keys.p256dh!=='string'||typeof s.keys.auth!=='string')return false;try{const u=new URL(s.endpoint);return u.protocol==='https:'&&!u.port&&(['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(u.hostname)||u.hostname.endsWith('.push.apple.com')||u.hostname.endsWith('.notify.windows.com'))}catch{return false}}
async function notify(state,title,message){await webpush.sendNotification(state.subscription,JSON.stringify({title,body:message}),{TTL:3600});}
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/config')return json(res,200,{subjects,schedule,publicKey:keys.publicKey});
 if(url.pathname.startsWith('/api/')){
 const token=req.headers.authorization?.replace(/^Bearer /,'');if(!token||!/^[a-f0-9]{64}$/.test(token))return json(res,401,{error:'Falta la clave de este dispositivo'});
 const state=read(token);
 if(req.method==='GET'&&url.pathname==='/api/state'){const today=localTime().day;return json(res,200,{tasks:state.tasks,settings:state.settings,notifications:!!state.subscription,today,streak:streak(state.tasks,today)})}
 if(req.method==='POST'&&url.pathname==='/api/tasks'){
 const b=await body(req);if(typeof b.title!=='string'||!b.title.trim()||b.title.length>180||!subjects.includes(b.subject)||typeof b.description!=='string'||b.description.length>2000|| (b.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(b.due)||Number.isNaN(Date.parse(b.due)))))return json(res,400,{error:'Revisa el título, la materia y la fecha'});
 state.tasks.unshift({id:crypto.randomUUID(),title:b.title.trim(),subject:b.subject,description:b.description,due:b.due||'',completedDay:null});save(token,state);return json(res,201,{ok:true});}
 const match=url.pathname.match(/^\/api\/tasks\/([a-f0-9-]+)$/);
 if(match&&['PATCH','DELETE'].includes(req.method)){const t=state.tasks.find(t=>t.id===match[1]);if(!t)return json(res,404,{error:'Tarea no encontrada'});if(req.method==='DELETE')state.tasks=state.tasks.filter(x=>x.id!==t.id);else{const b=await body(req);t.completedDay=b.completed?localTime().day:null}save(token,state);return json(res,200,{ok:true})}
 if(req.method==='POST'&&url.pathname==='/api/settings'){const b=await body(req);if(!Number.isInteger(b.startHour)||!Number.isInteger(b.endHour)||b.startHour<0||b.endHour>24||b.startHour>=b.endHour||typeof b.weekdaysOnly!=='boolean')return json(res,400,{error:'Elige una franja horaria válida'});state.settings={startHour:b.startHour,endHour:b.endHour,weekdaysOnly:b.weekdaysOnly,timeZone:'America/Bogota'};save(token,state);return json(res,200,{ok:true})}
 if(url.pathname==='/api/subscription'&&req.method==='POST'){const b=await body(req);if(!validSubscription(b))return json(res,400,{error:'Suscripción no válida'});state.subscription=b;save(token,state);return json(res,200,{ok:true})}
 if(url.pathname==='/api/subscription'&&req.method==='DELETE'){state.subscription=null;save(token,state);return json(res,200,{ok:true})}
 if(url.pathname==='/api/test-notification'&&req.method==='POST'){if(!state.subscription)return json(res,400,{error:'Activa primero las notificaciones'});if(!isFree(new Date(),state.settings))return json(res,409,{error:'Ahora estás en clase o fuera de tu franja. Prueba en una hora libre.'});if(state.lastTest&&Date.now()-state.lastTest<60000)return json(res,429,{error:'Espera un minuto antes de volver a probar'});await notify(state,'¡Tu próxima misión! ✨','Tus avisos están listos. Un paso pequeño también cuenta.');state.lastTest=Date.now();save(token,state);return json(res,200,{ok:true})}
 return json(res,404,{error:'Ruta no encontrada'});
 }
 if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido'});
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/sw.js':'sw.js','/manifest.json':'manifest.json','/icon.svg':'icon.svg','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png'};
 const file=files[url.pathname];if(!file)return json(res,404,{error:'No encontrado'});
 res.writeHead(200,{'Content-Type':{'html':'text/html; charset=utf-8','js':'application/javascript','css':'text/css','json':'application/json','svg':'image/svg+xml','png':'image/png'}[file.split('.').pop()],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});res.end(fs.readFileSync(path.join(__dirname,'public',file)));
 }catch(e){console.error(e.message);json(res,500,{error:'No se pudo realizar la operación. Intenta otra vez.'})}
});
async function reminders(now=new Date()){for(const row of db.prepare('SELECT token,state FROM profiles').all()){const s=JSON.parse(row.state),today=localTime(now).day;const pending=s.tasks.filter(t=>!t.completedDay);if(!s.subscription||!pending.length||s.lastSent===today||!reminderDue(now,s.settings))continue;try{await notify(s,'Tu misión de hoy 🌱',`${pending.length} tarea${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}. Dedica 15 minutos a ${pending[0].subject}.`);s.lastSent=today;save(row.token,s)}catch(e){if([404,410].includes(e.statusCode)){s.subscription=null;save(row.token,s)}console.error('No se pudo enviar un recordatorio:',e.statusCode||e.message)}}}
if(require.main===module){server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Recordatorios iniciado'));let running=false;setInterval(async()=>{if(running)return;running=true;try{await reminders()}finally{running=false}},60000).unref();}
module.exports={server,db,validSubscription,reminders};
