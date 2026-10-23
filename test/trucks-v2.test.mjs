import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as visual from '../public/veiculo-visual.mjs';

test('V2 exige opt-in explícito na página de prévia; jogo continua com V1',()=>{
 const enabled=visual.usarCaminhoesV2;
 assert.equal(typeof enabled,'function');
 for(const pathname of ['/','/index.html','/preview-corrida.html'])assert.equal(enabled({pathname,search:'?trucksV2=1'}),false);
 for(const search of ['', '?trucksV2=0','?trucksV2=true'])assert.equal(enabled({pathname:'/preview-caminhoes.html',search}),false);
 assert.equal(enabled({pathname:'/preview-caminhoes.html',search:'?trucksV2=1'}),true);
});

test('GLBs V2 são os binários entregues, autocontidos, com rodas e bandeiras independentes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/assets/veiculos/v2/manifest.json',import.meta.url)));
 assert.equal(manifest.length,2);
 for(const entry of manifest){
  const b=readFileSync(new URL('../public/assets/veiculos/v2/'+entry.name+'.glb',import.meta.url));
  assert.equal(b.length,entry.bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'),entry.sha256);
  assert.equal(b.toString('ascii',0,4),'glTF');
  assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  assert.equal(gltf.buffers.length,1);assert.equal(gltf.buffers[0].uri,undefined);
  assert.equal(gltf.images?.length||0,0,'cores por vértice, sem textura externa');
  const wheels=gltf.nodes.filter(n=>visual.rodaNomeada(n.name));
  const flags=gltf.nodes.filter(n=>visual.bandeiraNomeada(n.name));
  assert.equal(wheels.length,entry.wheel_count);assert.equal(flags.length,3);
  assert.equal(new Set(wheels.map(n=>n.mesh)).size,entry.wheel_count);
  for(const n of [...wheels,...flags]){
   assert.ok(n.matrix?.slice(12,15).some(v=>Math.abs(v)>.01),'peça tem pivô posicionado');
  }
  for(const mesh of gltf.meshes)for(const p of mesh.primitives)assert.ok(p.attributes.COLOR_0!==undefined);
  const triangles=gltf.meshes.reduce((sum,m)=>sum+m.primitives.reduce((s,p)=>s+gltf.accessors[p.indices].count/3,0),0);
  assert.equal(triangles,entry.triangles);
 }
});

test('hashes dos caminhões V1 permanecem intactos',()=>{
 for(const [name,hash] of [['caminhao-lula','17488ae3c85b7a117b9f968725888225bbae038a245ef179237fe4dfc91f9fc1'],['caminhao-bolsonaro','8ff894ee63b4dba0b72d2bdf6d49fcc23e4e17809b7c89fa672364f5614afaa4']]){
  assert.equal(createHash('sha256').update(readFileSync(new URL('../public/assets/veiculos/'+name+'.glb',import.meta.url))).digest('hex'),hash);
 }
});
