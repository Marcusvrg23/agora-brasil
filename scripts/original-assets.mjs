// Offline admission gate. Never rewrites models or fetches an unverified replacement.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';

export const MAX_BYTES=50*1024*1024; // admission ceiling, not the unknown originals' size
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');

// Structural inspection only; the Three.js/browser smoke remains mandatory.
export function inspectGLB(b,{maxBytes=MAX_BYTES}={}){
 if(b.length>maxBytes)throw Error('Asset size exceeds admission ceiling');
 if(b.length<20||b.toString('ascii',0,4)!=='glTF'||b.readUInt32LE(4)!==2)throw Error('Expected binary GLB v2');
 if(b.readUInt32LE(8)!==b.length)throw Error('GLB length mismatch');
 let offset=12,json,bin;
 while(offset<b.length){
  if(offset+8>b.length)throw Error('GLB chunk length missing');
  const n=b.readUInt32LE(offset),type=b.readUInt32LE(offset+4);offset+=8;
  if(n%4||offset+n>b.length)throw Error('GLB chunk length invalid');
  if(!json){
   if(type!==0x4e4f534a)throw Error('GLB JSON must be first');
   json=JSON.parse(b.toString('utf8',offset,offset+n));
  }else if(type===0x004e4942){if(bin)throw Error('GLB duplicate BIN');bin=b.subarray(offset,offset+n);}
  offset+=n;
 }
 if(json?.asset?.version!=='2.0')throw Error('Expected glTF 2.0');
 for(const item of [...(json.buffers||[]),...(json.images||[])]){
  if(item.uri&&!item.uri.startsWith('data:'))throw Error('GLB external resource requires separate admission');
 }
 for(const buffer of json.buffers||[]){
  if(!buffer.uri&&(!bin||buffer.byteLength>bin.length||buffer.byteLength<0))throw Error('GLB BIN length invalid');
 }
 for(const view of json.bufferViews||[]){
  const buffer=json.buffers?.[view.buffer];
  if(!buffer||!Number.isInteger(view.byteLength)||view.byteLength<0||(view.byteOffset||0)<0||(view.byteOffset||0)+view.byteLength>buffer.byteLength)throw Error('GLB bufferView length invalid');
 }
 return {bytes:b.length,sha256:hash(b),meshes:json.meshes?.length||0,
  materials:(json.materials||[]).map(m=>({name:m.name||null,pbr:m.pbrMetallicRoughness||null,doubleSided:!!m.doubleSided})),
  images:json.images?.length||0,skins:(json.skins||[]).map(s=>({name:s.name||null,joints:s.joints?.length||0})),
  bones:(json.nodes||[]).filter(n=>n.name).map(n=>n.name),animations:(json.animations||[]).map(a=>a.name||null),
  extensionsRequired:json.extensionsRequired||[]};
}
export function validateAsset(b,entry){
 if(entry.license?.status!=='approved'||!entry.license.evidence?.trim())throw Error('Asset license approval/evidence required');
 if(!Number.isSafeInteger(entry.bytes)||entry.bytes<=0||entry.bytes!==b.length)throw Error('Pinned asset size mismatch/missing');
 if(!/^[a-f0-9]{64}$/.test(entry.sha256||'')||hash(b)!==entry.sha256)throw Error('Pinned SHA-256 mismatch/missing');
 const report=inspectGLB(b);
 if(!report.meshes||!report.skins.some(s=>s.joints>0)||!report.materials.length||!report.bones.includes('Hips')||!report.bones.includes('RightHand'))throw Error('Original avatar rig/materials missing; inspect compatibility manually');
 return report;
}
export async function installAsset(source,entry,directory=root){
 if(!/^public\/assets\/bases\/(homem|mulher|idoso|idosa)\.glb$/.test(entry.localPath)||entry.localPath!==`public/assets/bases/${entry.id}.glb`)throw Error('Invalid asset destination');
 const stat=await fs.stat(source);if(stat.size>MAX_BYTES)throw Error('Asset size exceeds admission ceiling');
 const bytes=await fs.readFile(source),report=validateAsset(bytes,entry);
 const dest=path.join(directory,entry.localPath);await fs.mkdir(path.dirname(dest),{recursive:true});
 const temporary=dest+'.'+randomUUID()+'.part';
 try{
  await fs.writeFile(temporary,bytes,{flag:'wx'});
  // link is atomic and fails if destination exists, preserving any previous original.
  await fs.link(temporary,dest);
 }finally{await fs.rm(temporary,{force:true});}
 return report;
}
async function main(){
 const [command='audit',id,source]=process.argv.slice(2);
 const manifest=JSON.parse(await fs.readFile(path.join(root,'assets/original-models.manifest.json'),'utf8'));
 if(command==='install'){
  const entry=manifest.assets.find(a=>a.id===id);if(!entry||!source)throw Error('Usage: node scripts/original-assets.mjs install <base> <original.glb>');
  console.log(JSON.stringify(await installAsset(source,entry),null,2));return;
 }
 if(command!=='audit')throw Error('Expected audit or install');
 const assets=[];
 for(const entry of manifest.assets){
  try{
   const report=inspectGLB(await fs.readFile(path.join(root,entry.localPath)));
   assets.push({id:entry.id,localPath:entry.localPath,status:'present',...report,
    matchesPin:report.sha256===entry.sha256&&report.bytes===entry.bytes,license:entry.license});
  }catch(e){if(e.code!=='ENOENT')throw e;assets.push({id:entry.id,status:'missing',bytes:null,sha256:null,license:entry.license});}
 }
 console.log(JSON.stringify({at:new Date().toISOString(),scope:'Offline structural audit; not browser or licensing certification',assets},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
