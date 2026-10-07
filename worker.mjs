import webpush from 'web-push';
import scheduleModule from './schedule.js';
const {subjects,schedule,localTime,isFree,reminderDue,streak}=scheduleModule;
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
class ApiError extends Error {constructor(status,message){super(message);this.status=status}}
const emptyState=()=>({tasks:[],settings:{startHour:8,endHour:21,timeZone:'America/Bogota',weekdaysOnly:false},subscription:null,lastSent:null});
async function read(env,token){const row=await env.DB.prepare('SELECT state FROM profiles WHERE token=?').bind(token).first();return {state:row?JSON.parse(row.state):emptyState(),raw:row?.state}}
async function save(env,token,state,raw){
 const value=JSON.stringify(state);
 const result=raw===undefined
  ?await env.DB.prepare('INSERT INTO profiles VALUES (?,?) ON CONFLICT(token) DO NOTHING').bind(token,value).run()
  :await env.DB.prepare('UPDATE profiles SET state=? WHERE token=? AND state=?').bind(value,token,raw).run();
 if(!result.meta.changes)throw new ApiError(409,'Tus datos cambiaron. Recarga e intenta de nuevo.');
}
async function body(request){if(Number(request.headers.get('Content-Length')||0)>100000)throw new ApiError(413,'Solicitud demasiado grande');const reader=request.body?.getReader();if(!reader)return {};const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>100000){await reader.cancel();throw new ApiError(413,'Solicitud demasiado grande')}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new ApiError(400,'Solicitud no válida')}}
export function validSubscription(s){
 if(!s||typeof s.endpoint!=='string'||!s.keys||typeof s.keys.p256dh!=='string'||typeof s.keys.auth!=='string')return false;
 try{const u=new URL(s.endpoint);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(u.hostname)||u.hostname.endsWith('.push.apple.com')||u.hostname.endsWith('.notify.windows.com'))&&Buffer.from(s.keys.p256dh,'base64url').length===65&&Buffer.from(s.keys.auth,'base64url').length>=16}catch{return false}
}
async function vapid(env){
 let row=await env.DB.prepare("SELECT value FROM configuration WHERE id='vapid'").first();
 if(!row){await env.DB.prepare("INSERT INTO configuration VALUES ('vapid',?) ON CONFLICT(id) DO NOTHING").bind(JSON.stringify(webpush.generateVAPIDKeys())).run();row=await env.DB.prepare("SELECT value FROM configuration WHERE id='vapid'").first()}
 return JSON.parse(row.value);
}
async function notify(env,subscription,title,message){
 const keys=await vapid(env);
 const details=webpush.generateRequestDetails(subscription,JSON.stringify({title,body:message}),{TTL:3600,vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:keys.publicKey,privateKey:keys.privateKey}});
 const response=await fetch(details.endpoint,{method:details.method,headers:details.headers,body:details.body,redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(!response.ok){const error=new Error('Servicio de notificaciones respondió '+response.status);error.statusCode=response.status;throw error}
}
export async function reminders(env,now=new Date()){
 if(!reminderDue(now))return;
 const today=localTime(now).day;
 // No cargar perfiles que no necesitan recibir un aviso en esta jornada.
 const {results}=await env.DB.prepare("SELECT token,state FROM profiles WHERE json_extract(state,'$.subscription') IS NOT NULL AND COALESCE(json_extract(state,'$.lastSent'),'') != ?").bind(today).all();
 for(const row of results){
  const state=JSON.parse(row.state),pending=state.tasks.filter(t=>!t.completedDay);
  if(!pending.length||!reminderDue(now,state.settings))continue;
  const claim=await env.DB.prepare("UPDATE profiles SET state=json_set(state,'$.lastSent',?) WHERE token=? AND state=?").bind(today,row.token,row.state).run();
  if(!claim.meta.changes)continue;
  try{await notify(env,state.subscription,'Tu misión de hoy 🌱',`${pending.length} tarea${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}. Dedica 15 minutos a ${pending[0].subject}.`)}
  catch(error){
   if([404,410].includes(error.statusCode))await env.DB.prepare("UPDATE profiles SET state=json_set(state,'$.subscription',NULL) WHERE token=? AND json_extract(state,'$.subscription.endpoint')=?").bind(row.token,state.subscription.endpoint).run();
   else await env.DB.prepare("UPDATE profiles SET state=json_set(state,'$.lastSent',?) WHERE token=? AND json_extract(state,'$.lastSent')=?").bind(state.lastSent??null,row.token,today).run();
   console.error('Fallo de recordatorio:',error.statusCode||error.message);
  }
 }
}
async function handle(request,env){
 const url=new URL(request.url),route=url.pathname,method=request.method;
 if(route==='/healthz'){await env.DB.prepare('SELECT COUNT(*) FROM configuration').first();return json(200,{ok:true})}
 if(route==='/api/config'){const keys=await vapid(env);return json(200,{subjects,schedule,publicKey:keys.publicKey})}
 if(!route.startsWith('/api/'))return env.ASSETS.fetch(request);
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!token||!/^[a-f0-9]{64}$/.test(token))throw new ApiError(401,'Falta la clave de este dispositivo');
 const {state,raw}=await read(env,token);
 if(method==='GET'&&route==='/api/state'){const today=localTime().day;return json(200,{tasks:state.tasks,settings:state.settings,notifications:!!state.subscription,today,streak:streak(state.tasks,today)})}
 if(method==='POST'&&route==='/api/tasks'){
  const b=await body(request);
  if(typeof b.title!=='string'||!b.title.trim()||b.title.length>180||!subjects.includes(b.subject)||typeof b.description!=='string'||b.description.length>2000||(b.due&&(typeof b.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.due)||Number.isNaN(Date.parse(b.due)))))throw new ApiError(400,'Revisa el título, la materia y la fecha');
  state.tasks.unshift({id:crypto.randomUUID(),title:b.title.trim(),subject:b.subject,description:b.description,due:b.due||'',completedDay:null});await save(env,token,state,raw);return json(201,{ok:true});
 }
 const match=route.match(/^\/api\/tasks\/([a-f0-9-]+)$/);
 if(match&&['PATCH','DELETE'].includes(method)){
  const task=state.tasks.find(t=>t.id===match[1]);if(!task)throw new ApiError(404,'Tarea no encontrada');
  if(method==='DELETE')state.tasks=state.tasks.filter(t=>t.id!==task.id);
  else{const b=await body(request);if(typeof b.completed!=='boolean')throw new ApiError(400,'Estado de tarea no válido');task.completedDay=b.completed?localTime().day:null}
  await save(env,token,state,raw);return json(200,{ok:true});
 }
 if(method==='POST'&&route==='/api/settings'){
  const b=await body(request);if(!Number.isInteger(b.startHour)||!Number.isInteger(b.endHour)||b.startHour<0||b.endHour>24||b.startHour>=b.endHour||typeof b.weekdaysOnly!=='boolean')throw new ApiError(400,'Elige una franja horaria válida');
  state.settings={startHour:b.startHour,endHour:b.endHour,weekdaysOnly:b.weekdaysOnly,timeZone:'America/Bogota'};await save(env,token,state,raw);return json(200,{ok:true});
 }
 if(route==='/api/subscription'&&method==='POST'){const b=await body(request);if(!validSubscription(b))throw new ApiError(400,'Suscripción no válida');state.subscription=b;await save(env,token,state,raw);return json(200,{ok:true})}
 if(route==='/api/subscription'&&method==='DELETE'){state.subscription=null;await save(env,token,state,raw);return json(200,{ok:true})}
 if(route==='/api/test-notification'&&method==='POST'){
  if(!state.subscription)throw new ApiError(400,'Activa primero las notificaciones');
  if(!isFree(new Date(),state.settings))throw new ApiError(409,'Ahora estás en clase o fuera de tu franja. Prueba en una hora libre.');
  if(state.lastTest&&Date.now()-state.lastTest<60000)throw new ApiError(429,'Espera un minuto antes de volver a probar');
  state.lastTest=Date.now();await save(env,token,state,raw);
  try{await notify(env,state.subscription,'¡Tu próxima misión! ✨','Tus avisos están listos. Un paso pequeño también cuenta.')}catch{throw new ApiError(502,'No se pudo entregar el aviso. Comprueba los permisos y vuelve a activar los recordatorios.')}
  return json(200,{ok:true});
 }
 throw new ApiError(404,'Ruta no encontrada');
}
export default {
 async fetch(request,env){try{return await handle(request,env)}catch(error){if(!error.status)console.error(error.message);return json(error.status||500,{error:error.status?error.message:'No se pudo realizar la operación. Intenta otra vez.'})}},
 async scheduled(event,env,ctx){ctx.waitUntil(reminders(env,new Date(event.scheduledTime)))}
};
