window.Impulso = {
 subjects:['Fundamentos de mecanismos','Industria 4.0','Control inteligente','Control de procesos industriales','Robótica I','Proyectos','Automatización industrial II'],
 schedule:{1:[[9,11,0],[11,13,1],[15,17,2]],2:[[9,11,3],[11,13,4],[15,18,1]],3:[[9,11,5],[11,13,6],[15,18,4]],4:[[8,11,5],[11,13,0],[15,17,3]],5:[[7,11,6],[11,13,2]]},
 today(){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`},
 streak(tasks,today){const days=new Set(tasks.filter(t=>t.completedDay).map(t=>t.completedDay));const d=new Date(today+'T12:00:00Z');let count=0;if(!days.has(today))d.setUTCDate(d.getUTCDate()-1);while(days.has(d.toISOString().slice(0,10))){count++;d.setUTCDate(d.getUTCDate()-1)}return count}
};
