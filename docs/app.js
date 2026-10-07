const $=s=>document.querySelector(s);
const storageKey='impulso-tasks-v1';
const config=window.Impulso;let state,filter='pending';
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,6500)}
function loadTasks(){const value=localStorage.getItem(storageKey);if(!value)return [];const tasks=JSON.parse(value);if(!Array.isArray(tasks))throw Error('No se pudieron leer tus tareas guardadas.');return tasks}
async function api(route,method='GET',data){
 const tasks=loadTasks();
 if(route==='tasks'&&method==='POST'){if(!data.title?.trim()||!config.subjects.includes(data.subject))throw Error('Revisa el título y la materia');tasks.unshift({id:crypto.randomUUID(),title:data.title.trim(),subject:data.subject,description:data.description||'',due:data.due||'',completedDay:null})}
 else if(route.startsWith('tasks/')){const id=route.slice(6),task=tasks.find(t=>t.id===id);if(!task)throw Error('Tarea no encontrada');if(method==='PATCH')task.completedDay=data.completed?config.today():null;else if(method==='DELETE')tasks.splice(tasks.indexOf(task),1)}
 try{localStorage.setItem(storageKey,JSON.stringify(tasks))}catch{throw Error('No hay espacio para guardar. Exporta tus tareas antes de liberar espacio.')}
}
function el(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e}
async function refresh(){const tasks=loadTasks(),today=config.today();state={tasks,today,streak:config.streak(tasks,today)};render()}
function render(){
 const done=state.tasks.filter(t=>t.completedDay),pending=state.tasks.filter(t=>!t.completedDay);
 $('#streak').textContent=state.streak;$('#pending-count').textContent=pending.length;$('#done-count').textContent=done.length;$('#xp').textContent=done.length*25;$('#mission-count').textContent=pending.length;
 $('#motivation').textContent=done.some(t=>t.completedDay===state.today)?'¡Hoy ya diste un paso! Tu yo del futuro te lo agradece.':state.streak?'Tu racha sigue viva. Completa una misión hoy para mantenerla.':'Completa tu primera tarea y empieza tu racha.';
 $('#week').replaceChildren();const today=new Date(state.today+'T12:00:00Z');for(let i=6;i>=0;i--){const d=new Date(today);d.setUTCDate(d.getUTCDate()-i);const key=d.toISOString().slice(0,10),finished=done.some(t=>t.completedDay===key);const e=el('div',undefined,'week-day'+(finished?' finished':'')+(i===0?' current':''));e.append(el('span',['D','L','M','X','J','V','S'][d.getUTCDay()]),el('i',finished?'✓':'·'));e.title=key+(finished?' · tarea completada':'');$('#week').append(e)}
 const selected=$('#subject-filter').value;
 const list=state.tasks.filter(t=>(filter==='all'||(filter==='done'?!!t.completedDay:!t.completedDay))&&(!selected||t.subject===selected));
 list.sort((a,b)=>!!a.completedDay-!!b.completedDay||(a.due||'9999').localeCompare(b.due||'9999'));
 $('#tasks').replaceChildren();if(!list.length){const e=el('div',undefined,'empty');e.append(el('span','✳'),el('h3',filter==='done'?'Aquí aparecerán tus logros':'Un espacio para tu próxima misión'),el('p',filter==='done'?'Completa una tarea para sumar 25 XP y encender tu racha.':selected?'No hay tareas de esta materia en esta vista.':'Añade una tarea y transforma un pendiente en un paso adelante.'));$('#tasks').append(e)}
 for(const t of list){const row=el('article',undefined,'task'+(t.completedDay?' done':''));const check=el('button',t.completedDay?'✓':'','check');check.setAttribute('aria-label',(t.completedDay?'Marcar pendiente: ':'Completar: ')+t.title);check.onclick=async()=>{check.disabled=true;try{await api('tasks/'+t.id,'PATCH',{completed:!t.completedDay});await refresh();toast(t.completedDay?'Tarea pendiente de nuevo':'¡Misión cumplida! +25 XP ✨')}catch(e){toast(e.message);check.disabled=false}};
 const content=el('div',undefined,'task-content');content.append(el('h3',t.title));if(t.description)content.append(el('p',t.description));const meta=el('div',undefined,'task-meta');meta.append(el('span',t.subject,'tag'));if(t.due){const overdue=!t.completedDay&&t.due<state.today;meta.append(el('span',(overdue?'Vencida · ':'Entrega · ')+new Date(t.due+'T12:00:00Z').toLocaleDateString('es-CO',{day:'numeric',month:'short',timeZone:'UTC'}),overdue?'overdue':''))}if(t.completedDay)meta.append(el('span','✓ +25 XP'));content.append(meta);
 const del=el('button','×','delete');del.setAttribute('aria-label','Eliminar: '+t.title);del.onclick=async()=>{if(!confirm('¿Eliminar esta tarea? Si estaba completada, se quitarán su XP y su aporte a la racha.'))return;try{await api('tasks/'+t.id,'DELETE');await refresh()}catch(e){toast(e.message)}};row.append(check,content,del);$('#tasks').append(row)}
 const weekday=today.getUTCDay();$('#date').textContent=new Intl.DateTimeFormat('es-CO',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Bogota'}).format(new Date()).toUpperCase();
 $('#today-schedule').replaceChildren();for(const [s,e,i] of config.schedule[weekday]||[])$('#today-schedule').append(classRow(s,e,i));if(!(config.schedule[weekday]||[]).length)$('#today-schedule').append(el('p','Hoy no tienes clases. Un poco de descanso también es parte del progreso.'));
 const classes=config.schedule[weekday]||[];$('#next-time').textContent=classes.length?'Terminas clases a las '+classes.at(-1)[1]+':00':'Hoy puedes elegir tu ritmo';
}
function classRow(s,e,i){const row=el('div',undefined,'class-row');row.append(el('time',String(s).padStart(2,'0')+':00–'+String(e).padStart(2,'0')+':00'),el('b',config.subjects[i]));return row}
$('#new-task').onclick=()=>$('#task-dialog').showModal();$('#show-schedule').onclick=()=>$('#schedule-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$('#subject-filter').onchange=render;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});render()});
$('#task-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;try{await api('tasks','POST',Object.fromEntries(new FormData(e.target)));e.target.reset();$('#task-dialog').close();filter='pending';document.querySelector('[data-filter=pending]').click();await refresh();toast('Nueva misión lista. ¡Tú puedes!')}catch(err){toast(err.message)}finally{button.disabled=false}};
async function init(){try{
 for(const subject of config.subjects){$('#task-subject').append(new Option(subject,subject));$('#subject-filter').append(new Option(subject,subject))}
 for(let day=1;day<=5;day++){$('#full-schedule').append(el('h3',days[day]));for(const [start,end,i] of config.schedule[day])$('#full-schedule').append(classRow(start,end,i))}
 await refresh();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('El modo sin conexión no está disponible en este navegador.'));
 }catch(error){$('#tasks').replaceChildren(el('div','No se pudieron abrir tus tareas. No borres los datos del navegador antes de recuperar tu copia.','empty'));toast(error.message)}}
$('#export-tasks').onclick=()=>{try{const tasks=loadTasks();const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,tasks},null,2)],{type:'application/json'}));const link=el('a');link.href=url;link.download='impulso-tareas-'+config.today()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Copia exportada. Guárdala en Archivos.')}catch(error){toast(error.message)}};
$('#import-tasks').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('La copia es demasiado grande.');const backup=JSON.parse(await file.text());if(backup.version!==1||!Array.isArray(backup.tasks)||backup.tasks.some(t=>!t||typeof t.id!=='string'||typeof t.title!=='string'||!t.title.trim()||t.title.length>180||!config.subjects.includes(t.subject)||typeof t.description!=='string'||t.description.length>2000||typeof t.due!=='string'||(t.due&&!validDay(t.due))||(t.completedDay!==null&&!validDay(t.completedDay))))throw Error('La copia no tiene el formato de Impulso.');const tasks=loadTasks(),ids=new Set(tasks.map(t=>t.id));for(const task of backup.tasks)if(!ids.has(task.id)){tasks.push(task);ids.add(task.id)}localStorage.setItem(storageKey,JSON.stringify(tasks));await refresh();toast('Copia importada. Tus tareas actuales se conservaron.')}catch(error){toast(error.message)}finally{event.target.value=''}};
function validDay(day){return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day}
init();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(e=>toast(e.message))});
window.addEventListener('storage',event=>{if(event.key===storageKey)refresh().catch(e=>toast(e.message))});
