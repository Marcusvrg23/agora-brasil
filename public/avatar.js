import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';

// Times e trajes: cores genéricas, sem nome, sigla ou símbolo de partido.
export const TEAM_COLORS={vermelho:'#d32f2f',amarelo:'#f4c20d'};
export const OUTFITS=['camisa','terno-faixa'];
export const ACESSORIOS=['nenhum','bone','chapeu','oculos','megafone'];
// Corpos base semi-realistas (gerados no Higgsfield). Arquivos em /assets/bases/<base>-<time>.glb.
export const BASES=[
 {id:'boneco',nome:'Boneco'},{id:'homem',nome:'Homem'},{id:'mulher',nome:'Mulher'},
 {id:'idoso',nome:'Idoso'},{id:'idosa',nome:'Idosa'}
];
export const DEFAULT_LOOK={base:'boneco',team:'vermelho',outfit:'camisa',pele:'#c99a74',cabelo:'#2b1d14',calca:'#28324a',terno:'#2b2f36',acessorio:'nenhum'};
const HEX=/^#[0-9a-f]{6}$/i;

export function sanitizeLook(look={}){
 const out={...DEFAULT_LOOK};
 if(TEAM_COLORS[look.team])out.team=look.team;
 if(OUTFITS.includes(look.outfit))out.outfit=look.outfit;
 for(const k of ['pele','cabelo','calca','terno'])if(HEX.test(look[k]||''))out[k]=look[k].toLowerCase();
 if(ACESSORIOS.includes(look.acessorio))out.acessorio=look.acessorio;
 if(BASES.some(b=>b.id===look.base))out.base=look.base;
 return out;
}

const mat=(color,rough=.7)=>new THREE.MeshStandardMaterial({color,roughness:rough});
function part(geo,material,x,y,z,parent){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m}

// Monta (ou remonta) o boneco dentro do grupo. Medidas em metros, altura ~2,2.
export function dressAvatar(group,lookIn){
 const look=sanitizeLook(lookIn);
 const keep=new Set([group.userData.imported,group.userData.baseModel].filter(Boolean));
 for(const child of [...group.children])if(!keep.has(child))group.remove(child);
 const rig=new THREE.Group();rig.name='rig';group.add(rig);
 const team=TEAM_COLORS[look.team];
 const suit=look.outfit==='terno-faixa';
 const top=suit?look.terno:team;
 const pele=mat(look.pele,.8),cabelo=mat(look.cabelo,.9),calca=mat(suit?look.terno:look.calca),camisa=mat(top),sapato=mat('#1a1a1a',.5);

 // Pernas com pivô no quadril (para balançar ao andar).
 const legs=[];
 for(const side of [-1,1]){
  const hip=new THREE.Group();hip.position.set(side*.17,1.0,0);rig.add(hip);
  part(new THREE.CapsuleGeometry(.13,.62,4,8),calca,0,-.45,0,hip);
  part(new THREE.BoxGeometry(.24,.12,.36),sapato,0,-.93,.06,hip);
  legs.push(hip);
 }
 // Tronco
 part(new THREE.CapsuleGeometry(.34,.55,4,10),camisa,0,1.38,0,rig);
 if(suit){
  part(new THREE.BoxGeometry(.2,.32,.05),mat('#f2f2f2'),0,1.62,.31,rig); // camisa branca no colarinho
  const sash=part(new THREE.BoxGeometry(.15,1.0,.72),mat(team,.45),0,1.4,0,rig);sash.rotation.z=-.62;
 }
 // Braços com pivô no ombro.
 const arms=[];
 for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.45,1.66,0);rig.add(shoulder);
  part(new THREE.CapsuleGeometry(.1,.5,4,8),camisa,0,-.3,0,shoulder);
  part(new THREE.SphereGeometry(.1,10,8),pele,0,-.64,0,shoulder);
  shoulder.rotation.z=side*.12;
  arms.push(shoulder);
 }
 // Cabeça e cabelo
 const headY=2.02;
 part(new THREE.SphereGeometry(.27,16,12),pele,0,headY,0,rig);
 const hair=part(new THREE.SphereGeometry(.285,16,10,0,Math.PI*2,0,Math.PI*.5),cabelo,0,headY+.02,-.01,rig);hair.scale.y=.85;
 for(const side of [-1,1])part(new THREE.SphereGeometry(.035,8,6),mat('#1b1b1b'),side*.09,headY+.03,.25,rig);

 // Acessórios
 if(look.acessorio==='bone'){
  part(new THREE.SphereGeometry(.29,16,10,0,Math.PI*2,0,Math.PI*.5),mat(team,.6),0,headY+.06,0,rig);
  part(new THREE.BoxGeometry(.32,.03,.24),mat(team,.6),0,headY+.08,.27,rig);
 }
 if(look.acessorio==='chapeu'){
  part(new THREE.CylinderGeometry(.46,.46,.03,24),mat('#e8dcb5',.8),0,headY+.19,0,rig);
  part(new THREE.CylinderGeometry(.24,.27,.22,20),mat('#e8dcb5',.8),0,headY+.3,0,rig);
  part(new THREE.CylinderGeometry(.272,.272,.06,20),mat('#3b2b1d'),0,headY+.22,0,rig);
 }
 if(look.acessorio==='oculos'){
  for(const side of [-1,1])part(new THREE.TorusGeometry(.07,.018,6,16),mat('#111',.3),side*.1,headY+.04,.26,rig);
  part(new THREE.BoxGeometry(.06,.015,.015),mat('#111',.3),0,headY+.05,.27,rig);
 }
 if(look.acessorio==='megafone'){
  const mega=part(new THREE.CylinderGeometry(.14,.05,.38,14,1,true),new THREE.MeshStandardMaterial({color:'#f5f5f5',roughness:.5,side:THREE.DoubleSide}),0,-.7,.18,arms[1]);
  mega.rotation.x=Math.PI/2;
 }
 group.userData.look=look;
 group.userData.legs=legs;group.userData.arms=arms;group.userData.rig=rig;
 applyBase(group,look);
 refreshVisibility(group);
 return group;
}

// Quem aparece: modelo importado (só local) > corpo base > boneco.
function refreshVisibility(group){
 const {imported,baseModel,rig}=group.userData;
 if(baseModel)baseModel.visible=!imported;
 if(rig)rig.visible=!imported&&!baseModel;
}
function normalize(model,altura){
 const box=new THREE.Box3().setFromObject(model);
 const size=box.getSize(new THREE.Vector3());
 if(!size.y||!Number.isFinite(size.y))throw new Error('Modelo sem geometria visível.');
 model.scale.setScalar(altura/size.y);
 const box2=new THREE.Box3().setFromObject(model);
 const c=box2.getCenter(new THREE.Vector3());
 model.position.set(-c.x,-box2.min.y,-c.z);
}
const baseCache=new Map();
export const baseStatus=new Map(); // chave -> 'ok' | 'faltando'
function loadBase(key){
 if(!baseCache.has(key)){
  baseCache.set(key,new GLTFLoader().loadAsync('/assets/bases/'+key+'.glb')
   .then(g=>{baseStatus.set(key,'ok');return g.scene})
   .catch(()=>{baseStatus.set(key,'faltando');return null}));
 }
 return baseCache.get(key);
}
async function applyBase(group,look){
 const key=look.base==='boneco'?null:look.base+'-'+look.team;
 group.userData.baseKey=key;
 if(group.userData.baseModel&&group.userData.baseModel.userData.key!==key){group.remove(group.userData.baseModel);group.userData.baseModel=null}
 if(!key||group.userData.baseModel){refreshVisibility(group);return}
 const scene=await loadBase(key);
 if(!scene||group.userData.baseKey!==key){refreshVisibility(group);return}
 const model=scene.clone(true);
 try{normalize(model,look.base.startsWith('idos')?2.0:2.15)}catch{return}
 const holder=new THREE.Group();holder.add(model);holder.name='base';holder.userData.key=key;
 group.add(holder);group.userData.baseModel=holder;
 refreshVisibility(group);
}

// Caminhada procedural: balança pernas e braços; parado, respira de leve.
export function animateAvatar(group,moving,t){
 const {legs,arms,rig,imported,baseModel,mixer,clips}=group.userData;
 if(!imported&&baseModel){
  // Modelos base ainda sem esqueleto: passo com leve balanço.
  baseModel.position.y=moving?Math.abs(Math.sin(t*9))*.06:0;
  baseModel.rotation.z=moving?Math.sin(t*9)*.04:0;
  return;
 }
 if(imported){
  if(mixer&&clips){
   const want=moving?(clips.walk||clips.idle):(clips.idle||clips.walk);
   if(want&&group.userData.current!==want){group.userData.current?.fadeOut(.2);want.reset().fadeIn(.2).play();group.userData.current=want}
  }
  if(!mixer)imported.position.y=moving?Math.abs(Math.sin(t*9))*.08:0;
  return;
 }
 if(!legs)return;
 const swing=moving?Math.sin(t*9)*.6:0;
 legs[0].rotation.x=swing;legs[1].rotation.x=-swing;
 arms[0].rotation.x=-swing*.8;arms[1].rotation.x=swing*.8;
 rig.position.y=moving?Math.abs(Math.sin(t*9))*.05:Math.sin(t*2)*.012;
}

// Importa um .glb/.gltf do próprio usuário. Fica só no navegador dele.
export const IMPORT_MAX_BYTES=15*1024*1024;
export async function importModel(group,file){
 if(!file)throw new Error('Nenhum arquivo.');
 if(!/\.(glb|gltf)$/i.test(file.name))throw new Error('Use um arquivo .glb ou .gltf.');
 if(file.size>IMPORT_MAX_BYTES)throw new Error('Arquivo maior que 15 MB.');
 const buffer=await file.arrayBuffer();
 const gltf=await new Promise((res,rej)=>new GLTFLoader().parse(buffer,'',res,rej));
 const model=gltf.scene;
 normalize(model,2.2); // altura de 2,2 m, pés no chão, centralizado
 const holder=new THREE.Group();holder.add(model);holder.name='imported';
 removeImported(group);
 group.add(holder);group.userData.imported=holder;
 refreshVisibility(group);
 // Se o modelo tiver animações, tenta achar "walk"/"idle" pelo nome.
 if(gltf.animations.length){
  const mixer=new THREE.AnimationMixer(model);
  const find=re=>gltf.animations.find(c=>re.test(c.name));
  const walk=find(/walk|andar|run|correr/i),idle=find(/idle|parad|stand/i)||gltf.animations[0];
  group.userData.mixer=mixer;
  group.userData.clips={walk:walk&&mixer.clipAction(walk),idle:idle&&mixer.clipAction(idle)};
 }
 return {nome:file.name,animacoes:gltf.animations.map(a=>a.name)};
}
export function removeImported(group){
 const old=group.userData.imported;
 if(old)group.remove(old);
 group.userData.imported=null;group.userData.mixer=null;group.userData.clips=null;group.userData.current=null;
 refreshVisibility(group);
}
