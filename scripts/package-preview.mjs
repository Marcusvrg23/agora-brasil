// Builds an isolated review artifact. Does not upload or deploy anything.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(process.argv[2]||'agora-brasil-preview-qa.zip');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'agora-preview-package-'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 const config=fs.readFileSync(path.join(root,'ops/staging/squarecloud-preview.app'),'utf8');
 if(!/^SUBDOMAIN=agora-brasil-preview-qa$/m.test(config)||/agora-brasil-multiplayer/.test(config))throw Error('Configuração não isolada');
 fs.writeFileSync(path.join(temporary,'squarecloud.app'),config);
 for(const file of ['package.json','package-lock.json','server.js','combate.js','debate.js','anuncios.js','pagamentos.js','public'])fs.cpSync(path.join(root,file),path.join(temporary,file),{recursive:true});
 fs.copyFileSync(path.join(root,'docs/HOMOLOGACAO-RC.md'),path.join(temporary,'HOMOLOGACAO.md'));
 const files={};
 function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isSymbolicLink())throw Error('Symlink não permitido no pacote');
  if(entry.isDirectory())scan(file);
  else files[path.relative(temporary,file).split(path.sep).join('/')]=hash(fs.readFileSync(file));
 }}
 scan(temporary);
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const manifest={commit,builtAt:new Date().toISOString(),scope:'Isolated QA package; no deploy; no production data or credentials',files};
 fs.writeFileSync(path.join(temporary,'preview-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.mkdirSync(path.dirname(output),{recursive:true});
 if(fs.existsSync(output))fs.unlinkSync(output);
 execFileSync('zip',['-qr',output,'.'],{cwd:temporary});
 execFileSync('unzip',['-t',output],{stdio:'ignore'});
 fs.writeFileSync(output+'.sha256',hash(fs.readFileSync(output))+'  '+path.basename(output)+'\n');
 console.log(JSON.stringify({output,commit,files:Object.keys(files).length,sha256:hash(fs.readFileSync(output)),bytes:fs.statSync(output).size}));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
