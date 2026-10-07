import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cli=path.join(root,'node_modules/wrangler/bin/wrangler.js');
function wrangler(args,capture=false){
 const result=spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:capture?['ignore','pipe','inherit']:'inherit',encoding:'utf8'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Falló Wrangler. Revisa el acceso de Cloudflare y vuelve a ejecutar.');
 return capture?result.stdout:'';
}
function list(){const output=wrangler(['d1','list','--json'],true);try{return JSON.parse(output)}catch{throw Error('La lista de bases de datos no tiene el formato esperado. No se modificó la configuración.')}}
try{
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
 let databases=list();let db=databases.find(d=>d.name==='impulso');
 if(!db){wrangler(['d1','create','impulso','--update-config=false']);db=list().find(d=>d.name==='impulso')}
 if(!db?.uuid)throw Error('No se encontró el identificador de la base de datos impulso.');
 config.main=path.join(root,'worker.mjs');config.assets.directory=path.join(root,'public');
 config.d1_databases[0].database_id=db.uuid;config.d1_databases[0].migrations_dir=path.join(root,'migrations');delete config.$schema;
 const folder=path.join(root,'.wrangler');fs.mkdirSync(folder,{recursive:true});const configPath=path.join(folder,'deploy.json');fs.writeFileSync(configPath,JSON.stringify(config,null,2));
 wrangler(['d1','migrations','apply','impulso','--remote','--config',configPath]);
 wrangler(['deploy','--config',configPath]);
 console.log('Despliegue terminado. Abre la URL HTTPS indicada arriba y verifica /healthz.');
}catch(error){console.error(error.message);process.exit(1)}
