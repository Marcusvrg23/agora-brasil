import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function glb(path){
 const bytes=fs.readFileSync(new URL(path,import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'glTF');
 assert.equal(bytes.readUInt32LE(4),2);
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 const jsonLength=bytes.readUInt32LE(12),start=20;
 const data=JSON.parse(bytes.subarray(start,start+jsonLength).toString('utf8'));
 const binaryStart=start+jsonLength+8;
 const binary=bytes.subarray(binaryStart);
 const accessor=i=>{
  const a=data.accessors[i],view=data.bufferViews[a.bufferView],components={SCALAR:1,VEC3:3,VEC4:4}[a.type];
  assert.ok(components);
  const offset=(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||components*4;
  const out=[];
  for(let k=0;k<a.count;k++){
   const row=[];
   for(let j=0;j<components;j++)row.push(binary.readFloatLE(offset+k*stride+j*4));
   out.push(row);
  }
  return out;
 };
 return {bytes,data,accessor};
}
const run=glb('../public/assets/anims/run-sprint-v2.glb');
const human=glb('../public/assets/bases/homem.glb');
test('Sprint V2 é arquivo GLB autônomo com duração e amostragem próprias',()=>{
 const g=run.data,a=g.animations[0];
 assert.equal(a.name,'Sprint_V2_RealStride');
 assert.ok(g.nodes.length>=24);
 const channels=a.channels.map(c=>({node:g.nodes[c.target.node].name,path:c.target.path}));
 assert.ok(channels.length>=20,JSON.stringify(channels));
 const times=run.accessor(a.samplers[0].input).map(a=>a[0]);
 assert.ok(times.length>=50);
 assert.ok(times.at(-1)>=.7&&times.at(-1)<=1);
 const allNames=new Set(human.data.nodes.map(n=>n.name));
 assert.ok(channels.every(c=>allNames.has(c.node)), 'Rig origem é o personagem jogável do projeto');
});
test('Sprint V2 inclui quadril animado em Y, sem root-motion em X/Z',()=>{
 const a=run.data.animations[0];
 const hip=a.channels.find(c=>run.data.nodes[c.target.node].name==='Hips'&&c.target.path==='translation');
 assert.ok(hip,'Faltou Hips.translation');
 const values=run.accessor(a.samplers[hip.sampler].output);
 const range=Math.max(...values.map(a=>a[1]))-Math.min(...values.map(a=>a[1]));
 assert.ok(range>3 && range<8, 'Amplitude do quadril precisa ser natural e limitada: '+range);
 assert.ok(values.every(v=>Math.abs(v[0]-values[0][0])<.001&&Math.abs(v[2]-values[0][2])<.001),'In-place animation only');
});
test('Sprint V2 é bilateral: braços alternam, joelhos flexionam, ritmo é diferente de Walk',()=>{
 const a=run.data.animations[0];
 const track=(name,path='rotation')=>{
  const c=a.channels.find(c=>run.data.nodes[c.target.node].name===name&&c.target.path===path);
  assert.ok(c,name);
  return run.accessor(a.samplers[c.sampler].output);
 };
 const left=track('LeftArm'),right=track('RightArm');
 const delta=(arr,i,j)=>Math.sqrt(arr[i].reduce((s,n,k)=>s+(n-arr[j][k])**2,0));
 assert.ok(delta(left,0,15)>.1, 'Braço esquerdo deve mudar ao longo da passada');
 assert.ok(delta(right,0,15)>.1, 'Braço direito deve mudar ao longo da passada');
 assert.ok(delta(track('LeftLeg'),0,15)>.2);
 assert.ok(delta(track('RightLeg'),0,45)>.2);
 assert.ok(a.channels.some(c=>run.data.nodes[c.target.node].name==='LeftFoot'));
 assert.ok(a.channels.some(c=>run.data.nodes[c.target.node].name==='RightFoot'));
 const walk=human.data.animations[0];
 assert.ok(walk.samplers.length>0);
 assert.notEqual(walk.name,a.name);
});
