import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectGLB, validateAsset, installAsset} from '../scripts/original-assets.mjs';

const original=readFileSync(new URL('../public/assets/bases/homem.glb',import.meta.url));
const sha256=createHash('sha256').update(original).digest('hex');
const approved={id:'homem',bytes:original.length,sha256,license:{status:'approved',evidence:'Registro de teste'},localPath:'public/assets/bases/homem.glb'};
test('auditoria preserva o homem original, rig, material, textura e caminhada',()=>{
 const r=inspectGLB(original);
 assert.equal(sha256,'5e90a942da4a573417463cb1b38f7e288be6410948881c5b90cf9d7c75c2d156');
 assert.equal(r.meshes,1);assert.equal(r.materials.length,1);assert.equal(r.images,1);
 assert.equal(r.skins[0].joints,24);assert.ok(r.bones.includes('RightHand'));
 assert.deepEqual(r.animations,['Armature|Casual_Walk|baselayer']);
});
test('HTML de erro e GLB truncado não são aceitos como modelo',()=>{
 assert.throws(()=>inspectGLB(Buffer.from('<html>Forbidden</html>')),/GLB/);
 assert.throws(()=>inspectGLB(original.subarray(0,original.length-4)),/length/i);
});
test('hash, tamanho e licença são obrigatórios antes da instalação',()=>{
 assert.throws(()=>validateAsset(original,{...approved,sha256:null}),/SHA-256/);
 assert.throws(()=>validateAsset(original,{...approved,sha256:'0'.repeat(64)}),/SHA-256/);
 assert.throws(()=>validateAsset(original,{...approved,bytes:1}),/size/i);
 assert.throws(()=>validateAsset(original,{...approved,license:{status:'pending'}}),/licen/i);
 assert.equal(validateAsset(original,approved).sha256,sha256);
});
test('limite de tamanho e recursos externos são recusados',()=>{
 assert.throws(()=>inspectGLB(original,{maxBytes:100}),/size/i);
 const json={asset:{version:'2.0'},buffers:[{uri:'https://example.org/other.bin',byteLength:1}]};
 let str=JSON.stringify(json);str+=' '.repeat((4-Buffer.byteLength(str)%4)%4);
 const body=Buffer.from(str),b=Buffer.alloc(20+body.length);
 b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(body.length,12);b.writeUInt32LE(0x4e4f534a,16);body.copy(b,20);
 assert.throws(()=>inspectGLB(b),/external/i);
});
test('importação falha sem escrever e nunca sobrescreve um original',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'agora-assets-test-'));
 try{
  const source=path.join(dir,'source.glb');await fs.writeFile(source,original);
  await assert.rejects(installAsset(source,{...approved,sha256:'0'.repeat(64)},dir),/SHA-256/);
  await assert.rejects(fs.access(path.join(dir,approved.localPath)));
  const r=await installAsset(source,approved,dir);assert.equal(r.sha256,sha256);
  await assert.rejects(installAsset(source,approved,dir),/EEXIST/);
  assert.deepEqual(await fs.readFile(path.join(dir,approved.localPath)),original);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('importação recusa destino fora do diretório de bases',async()=>{
 await assert.rejects(installAsset('/unused',{...approved,localPath:'../escape.glb'},'/tmp'),/destination/i);
});
test('manifesto preserva as seis identidades e não inventa hash dos três ausentes',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../assets/original-models.manifest.json',import.meta.url)));
 const {BOT_SEEDS}=await import('../public/bot-paths.mjs');
 assert.deepEqual(manifest.identities,BOT_SEEDS.map(({name,base,team})=>({name,base,team})));
 for(const id of ['mulher','idoso','idosa']){
  const asset=manifest.assets.find(a=>a.id===id);
  assert.equal(asset.bytes,null);assert.equal(asset.sha256,null);assert.equal(asset.license.status,'pending');
  assert.equal(new URL(asset.sourceUrl).hostname,'d8j0ntlcm91z4.cloudfront.net');
 }
});
test('servidor entrega bytes originais com MIME GLB e 404 para arquivo ausente',async()=>{
 const {default:{server}}=await import('../server.js');
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{
  const origin=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(origin+'/assets/bases/homem.glb');
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'model/gltf-binary');
  assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),sha256);
  assert.equal((await fetch(origin+'/assets/bases/arquivo-ausente.glb')).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
