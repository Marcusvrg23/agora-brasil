import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

test('pacote isolado contém hashes, preserva assets e inicia sem dados de produção', {timeout:12000},async t=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agora-package-test-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const archive=path.join(dir,'preview.zip'),extract=path.join(dir,'extracted');
 execFileSync(process.execPath,['scripts/package-preview.mjs',archive],{cwd:root});
 execFileSync('unzip',['-q',archive,'-d',extract]);
 const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8'}).trim().split('\n').filter(f=>!f.endsWith('/'));
 const rootFiles=new Set(['squarecloud.app','package.json','package-lock.json','server.js','combate.js','debate.js','anuncios.js','pagamentos.js','HOMOLOGACAO.md','preview-manifest.json']);
 assert.ok(entries.every(f=>rootFiles.has(f)||f.startsWith('public/')), 'sem .env, banco, dependências ou configurações de produção');
 const manifest=JSON.parse(fs.readFileSync(path.join(extract,'preview-manifest.json')));
 assert.deepEqual(entries.filter(f=>f!=='preview-manifest.json').sort(),Object.keys(manifest.files).sort());
 for(const [file,sha]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(extract,file))).digest('hex'),sha,file);
 const config=fs.readFileSync(path.join(extract,'squarecloud.app'),'utf8');
 assert.match(config,/^SUBDOMAIN=agora-brasil-preview-qa$/m);
 assert.doesNotMatch(config,/agora-brasil-multiplayer/);
 for(const f of ['public/assets/anims/run-sprint-v2.glb','public/assets/bases/homem.glb','public/assets/veiculos/v2/caminhao-verde-v2.glb'])assert.deepEqual(fs.readFileSync(path.join(extract,f)),fs.readFileSync(path.join(root,f)),f);
 // Start the actual extracted server, with fresh data and repository-installed
 // dependencies supplied through Node's standard lookup path.
 const code=`const {server}=require(${JSON.stringify(path.join(extract,'server.js'))});server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));`;
 const child=spawn(process.execPath,['-e',code],{cwd:extract,env:{...process.env,NODE_PATH:path.join(root,'node_modules'),DATA_DIR:path.join(dir,'empty-qa-data'),ADMIN_TOKEN:'',MP_ACCESS_TOKEN:'',PUBLIC_URL:''},stdio:['ignore','ignore','pipe','ipc']});
 t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit')}});
 const [{port}]=await once(child,'message');
 assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status,200);
 const ws=new WebSocket(`ws://127.0.0.1:${port}/api/ws`);t.after(()=>ws.terminate());
 const joined=new Promise((resolve,reject)=>{ws.on('error',reject);ws.on('message',raw=>{const m=JSON.parse(String(raw));if(m.type==='joined')resolve(m)})});
 await once(ws,'open');ws.send(JSON.stringify({type:'join',room:'5300108',name:'QA-Pacote',role:'visitor'}));
 assert.equal((await joined).role,'visitor');ws.terminate();await once(ws,'close');
 child.kill();await once(child,'exit');
});
