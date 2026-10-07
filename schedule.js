const subjects = ['Fundamentos de mecanismos','Industria 4.0','Control inteligente','Control de procesos industriales','Robótica I','Proyectos','Automatización industrial II'];
const schedule = {
  1:[[9,11,0],[11,13,1],[15,17,2]],
  2:[[9,11,3],[11,13,4],[15,18,1]],
  3:[[9,11,5],[11,13,6],[15,18,4]],
  4:[[8,11,5],[11,13,0],[15,17,3]],
  5:[[7,11,6],[11,13,2]],
};
function localTime(date=new Date(),timeZone='America/Bogota') {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(date).map(x=>[x.type,x.value]));
  return {day:`${p.year}-${p.month}-${p.day}`,weekday:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),minute:Number(p.hour)*60+Number(p.minute)};
}
function isFree(date,settings={}) {
  const t=localTime(date,settings.timeZone||'America/Bogota');
  return t.minute >= (settings.startHour??8)*60 && t.minute < (settings.endHour??21)*60 && (!settings.weekdaysOnly || (t.weekday>0&&t.weekday<6)) && !(schedule[t.weekday]||[]).some(([s,e])=>t.minute>=s*60&&t.minute<e*60);
}
function reminderDue(date,settings={}) {
  const t=localTime(date,settings.timeZone||'America/Bogota');
  const hour={0:10,1:17,2:18,3:18,4:17,5:13,6:10}[t.weekday];
  return t.minute>=hour*60 && t.minute<hour*60+60 && isFree(date,settings);
}
function streak(tasks,today) {
  const days=new Set(tasks.filter(t=>t.completedDay).map(t=>t.completedDay));
  let d=new Date(today+'T12:00:00Z'),n=0;
  if(!days.has(today))d.setUTCDate(d.getUTCDate()-1);
  while(days.has(d.toISOString().slice(0,10))){n++;d.setUTCDate(d.getUTCDate()-1)}
  return n;
}
module.exports={subjects,schedule,localTime,isFree,reminderDue,streak};
