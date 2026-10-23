import * as THREE from 'three';
import {POSE_CARTAZ} from './cartaz-config.mjs';
import {modoLocomocao} from './movimento.mjs';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/utils/SkeletonUtils.js';

// Times e trajes: cores genéricas, sem nome, sigla ou símbolo de partido.
export const TEAM_COLORS={vermelho:'#d32f2f',amarelo:'#f4c20d'};
export const OUTFITS=['camisa','terno-faixa'];
export const ACESSORIOS=['nenhum','bone','chapeu','oculos','megafone'];
// Corpos base semi-realistas (gerados no Higgsfield). Arquivos em /assets/bases/<base>-<time>.glb.
export const BASES=[
 {id:'boneco',nome:'Boneco'},{id:'homem',nome:'Homem'},{id:'mulher',nome:'Mulher'},
 {id:'idoso',nome:'Idoso'},{id:'idosa',nome:'Idosa'}
];
export const DEFAULT_LOOK={base:'homem',team:'vermelho',outfit:'camisa',cabeloEstilo:'auto',pele:'#c99a74',cabelo:'#2b1d14',calca:'#28324a',terno:'#2b2f36',acessorio:'nenhum'};
const HEX=/^#[0-9a-f]{6}$/i;

export function sanitizeLook(look={}){
 const out={...DEFAULT_LOOK};
 if(TEAM_COLORS[look.team])out.team=look.team;
 if(OUTFITS.includes(look.outfit))out.outfit=look.outfit;
 for(const k of ['pele','cabelo','calca','terno'])if(HEX.test(look[k]||''))out[k]=look[k].toLowerCase();
 if(ACESSORIOS.includes(look.acessorio))out.acessorio=look.acessorio;
 if(BASES.some(b=>b.id===look.base))out.base=look.base;
 if(ESTILOS_CABELO.includes(look.cabeloEstilo))out.cabeloEstilo=look.cabeloEstilo;
 return out;
}

const mat=(color,rough=.7)=>new THREE.MeshStandardMaterial({color,roughness:rough});
const skinMat=(color)=>new THREE.MeshPhysicalMaterial({color,roughness:.62,sheen:.35,sheenColor:new THREE.Color('#ffd7c2'),clearcoat:.04});
function part(geo,material,x,y,z,parent){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m}
// Sólido de revolução a partir de um perfil [raio, altura] (em metros).
function lathe(profile,segs=36){return new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(Math.max(r,0.0001),y)),segs)}
// Membro afunilado de comprimento len, saindo do pivô para baixo.
function limb(r1,r2,len,segs=14){
 const g=lathe([[0,0],[r1*.85,-r1*.25],[r1,-r1*.7],[r1*.97,-len*.35],[(r1+r2)/2,-len*.65],[r2,-len+r2*.6],[r2*.8,-len+r2*.15],[0,-len]],segs);
 return g;
}

// Proporções por tipo de corpo (o "Boneco" usa as do homem).
const CORPOS={
 homem:{H:2.15,ombro:1,quadril:1,peito:1,barriga:0,curva:0,cabelo:'ondulado'},
 mulher:{H:2.05,ombro:.86,quadril:1.12,peito:1.06,barriga:0,curva:0,cabelo:'cacheado'},
 idoso:{H:2.03,ombro:.95,quadril:1.04,peito:.98,barriga:.025,curva:.13,cabelo:'grisalho'},
 idosa:{H:1.96,ombro:.86,quadril:1.12,peito:1.02,barriga:.02,curva:.12,cabelo:'cacheado-curto'}
};
export const ESTILOS_CABELO=['auto','curto','ondulado','longo','cacheado','cacheado-curto','coque','grisalho','careca'];

// Rosto pintado num canvas (olhos, sobrancelhas, boca, bochechas). Fica em cache por combinação.
const faceCache=new Map();
function shade(hex,f){const c=new THREE.Color(hex);c.multiplyScalar(f);return '#'+c.getHexString()}
function faceTexture(pele,cabelo,tipo){
 const key=pele+cabelo+tipo;
 if(faceCache.has(key))return faceCache.get(key);
 const cv=document.createElement('canvas');cv.width=512;cv.height=256;const c=cv.getContext('2d');
 c.fillStyle=pele;c.fillRect(0,0,512,256);
 // A frente da esfera (eixo +z) fica em u=0,25 → x=128.
 const cx=128,ey=118;
 const idade=tipo.startsWith('idos');
 // bochechas
 const blush=c.createRadialGradient(0,0,0,0,0,26);blush.addColorStop(0,'rgba(214,110,96,.28)');blush.addColorStop(1,'rgba(214,110,96,0)');
 for(const dx of [-30,30]){c.save();c.translate(cx+dx,ey+30);c.fillStyle=blush;c.fillRect(-26,-26,52,52);c.restore()}
 // olhos
 for(const dx of [-19,19]){
  c.fillStyle='#fbf7f2';c.beginPath();c.ellipse(cx+dx,ey,10.5,6.2,0,0,Math.PI*2);c.fill();
  c.fillStyle='#4a2f1d';c.beginPath();c.arc(cx+dx,ey+.5,5.2,0,Math.PI*2);c.fill();
  c.fillStyle='#120b07';c.beginPath();c.arc(cx+dx,ey+.5,2.6,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.arc(cx+dx+1.8,ey-1.6,1.3,0,Math.PI*2);c.fill();
  c.strokeStyle=shade(pele,.55);c.lineWidth=2.2;c.beginPath();c.ellipse(cx+dx,ey,10.5,6.2,0,Math.PI*1.05,Math.PI*1.95);c.stroke();
  if(idade){c.strokeStyle=shade(pele,.78);c.lineWidth=1.2;for(const k of [0,4])c.beginPath(),c.moveTo(cx+dx+(dx>0?11:-11),ey+2+k),c.lineTo(cx+dx+(dx>0?17:-17),ey+k),c.stroke()}
 }
 // sobrancelhas
 c.strokeStyle=idade?'#d9d6d0':shade(cabelo,.9);c.lineWidth=tipo==='mulher'||tipo==='idosa'?3:4.2;c.lineCap='round';
 for(const dx of [-19,19]){c.beginPath();c.moveTo(cx+dx-(dx>0?-10:10)*-1,ey-12);c.quadraticCurveTo(cx+dx,ey-17,cx+dx+(dx>0?11:-11),ey-11);c.stroke()}
 // sombra do nariz
 c.strokeStyle=shade(pele,.72);c.lineWidth=1.6;c.beginPath();c.moveTo(cx-5,ey+24);c.quadraticCurveTo(cx,ey+28,cx+5,ey+24);c.stroke();
 // boca
 c.fillStyle=tipo==='mulher'?'#b9544f':shade(pele,.62);
 c.beginPath();c.moveTo(cx-13,ey+40);c.quadraticCurveTo(cx,ey+48,cx+13,ey+40);c.quadraticCurveTo(cx,ey+43,cx-13,ey+40);c.fill();
 if(idade){c.strokeStyle=shade(pele,.8);c.lineWidth=1.2;for(const dx of [-22,22]){c.beginPath();c.moveTo(cx+dx*.75,ey+30);c.quadraticCurveTo(cx+dx,ey+38,cx+dx*.85,ey+46);c.stroke()}}
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 faceCache.set(key,tex);return tex;
}

function buildHair(head,estilo,cor,R,tipo){
 const m=mat(cor,.95);
 const cap=(scale=1.07,y=.06,thetaLen=.37)=>{const h=part(new THREE.SphereGeometry(R*scale,24,14,0,Math.PI*2,0,Math.PI*thetaLen),m,0,y*R,-.04*R,head);h.scale.set(1,.98,1.03);return h};
 if(estilo==='careca'){return}
 if(estilo==='grisalho'){ // laterais e nuca brancas, topo ralo
  const h=part(new THREE.SphereGeometry(R*1.06,24,14,Math.PI/2+1.25,Math.PI*2-2.5,Math.PI*.2,Math.PI*.36),m,0,.02*R,-.04*R,head);h.scale.set(.92,1.12,1);
  part(new THREE.SphereGeometry(R*1.03,20,10,0,Math.PI*2,0,Math.PI*.2),mat(shade(cor,.9),.95),0,.04*R,-.02*R,head);
  return;
 }
 cap();
 if(estilo==='curto')return;
 if(estilo==='ondulado'){for(let i=0;i<7;i++){const a=-1.1+i*.37;part(new THREE.SphereGeometry(R*.32,10,8),m,Math.sin(a)*R*.62,R*.86,Math.cos(a)*R*.42-.05*R,head)}return}
 if(estilo==='longo'){
  const back=part(lathe([[R*1.02,0],[R*1.0,-R*.8],[R*.9,-R*1.9],[R*.6,-R*2.25],[0,-R*2.3]],18),m,0,R*.35,-R*.12,head);back.scale.set(1,1,.62);
  return;
 }
 if(estilo==='coque'){part(new THREE.SphereGeometry(R*.42,14,10),m,0,R*.75,-R*.85,head);return}
 // cacheado / cacheado-curto: volume de cachos
 const n=estilo==='cacheado'?34:22,raio=estilo==='cacheado'?1.12:1.02,cair=estilo==='cacheado'?1.25:.62;
 for(let i=0;i<n;i++){
  const a=i*2.399,yy=1-(i/(n-1))*cair; const rr=Math.sqrt(Math.max(0,1-yy*yy));
  const x=Math.cos(a)*rr*R*raio,z=Math.sin(a)*rr*R*raio*1.02-.04*R;
  if(z>R*.3&&yy<.66)continue; // não cobre o rosto
  part(new THREE.SphereGeometry(R*(estilo==='cacheado'?.3:.26),9,7),m,x,yy*R*1.05,z,head);
 }
 if(estilo==='cacheado'){const b=part(new THREE.SphereGeometry(R*1.05,18,12),m,0,-R*.25,-R*.42,head);b.scale.set(1.15,1.1,.75)}
}

// Monta (ou remonta) o personagem semi-realista dentro do grupo. Medidas em metros.
export function dressAvatar(group,lookIn){
 const look=sanitizeLook(lookIn);
 const keep=new Set([group.userData.imported,group.userData.baseModel].filter(Boolean));
 for(const child of [...group.children])if(!keep.has(child))group.remove(child);
 const tipo=look.base==='boneco'?'homem':look.base;
 const C=CORPOS[tipo],H=C.H,k=H/2.15;
 const rig=new THREE.Group();rig.name='rig';group.add(rig);
 const team=TEAM_COLORS[look.team];
 const suit=look.outfit==='terno-faixa';
 const pele=skinMat(look.pele),camisa=mat(suit?look.terno:team,suit?.55:.8),calca=mat(suit?look.terno:look.calca,.8),sapato=mat(suit?'#141414':'#f2f2f2',.45);
 const sola=mat('#2a2a2a',.6);

 const hipY=1.06*k,shoulderY=1.74*k;
 // Pernas: quadril → joelho → tornozelo, com sapato.
 const legs=[],knees=[],pes=[],maos=[];
 for(const side of [-1,1]){
  const hip=new THREE.Group();hip.position.set(side*.1*k*C.quadril,hipY,0);rig.add(hip);
  part(limb(.098*k*C.quadril,.066*k,.52*k),calca,0,0,0,hip);
  const knee=new THREE.Group();knee.position.y=-.49*k;hip.add(knee);
  part(limb(.068*k,.046*k,.48*k),calca,0,0,0,knee);
  const shoe=part(new THREE.SphereGeometry(.066*k,16,10),sapato,0,-.5*k,.045*k,knee);shoe.scale.set(1,.6,1.85);
  const pe=new THREE.Object3D();pe.position.y=-.5*k;knee.add(pe);pes.push(pe);
  const sole=part(new THREE.CylinderGeometry(.064*k,.064*k,.018*k,16),sola,0,-.53*k,.045*k,knee);sole.scale.set(1,1,1.85);
  legs.push(hip);knees.push(knee);
 }
 // Tronco: pélvis (calça) + abdômen/peito (camisa), perfil torneado e achatado na profundidade.
 const torso=new THREE.Group();torso.position.y=hipY-.06*k;rig.add(torso);
 const L=shoulderY-hipY+.12*k;
 const q=C.quadril,pe=C.peito,b=C.barriga;
 const perfil=[[0,-.02],[.148*q,0],[.168*q,.07],[.158*q+b,.16],[.136+b*1.6,.27],[.148*pe+b,.37],[.162*pe,.48],[.172*C.ombro,.58],[.182*C.ombro,.67],[.176*C.ombro,.72],[.13*C.ombro,.765],[.065,.79],[0,.8]].map(([r,y])=>[r*k,y*L/.8]);
 const corte=.2*L/.815;
 const pelvis=part(lathe(perfil.filter(([,y])=>y<=corte+.02).concat([[.0001,corte+.02]]),24),calca,0,0,0,torso);
 const peito=part(lathe([[0,corte-.03]].concat(perfil.filter(([,y])=>y>=corte-.03)),24),camisa,0,0,0,torso);
 for(const m of [pelvis,peito])m.scale.set(1.26,1,.62);
 if(suit){
  // camisa branca em V e gravata discreta na cor do terno
  const v=new THREE.Shape();v.moveTo(-.07*k,0);v.lineTo(.07*k,0);v.lineTo(0,-.2*k);v.closePath();
  const vm=part(new THREE.ShapeGeometry(v),mat('#f4f4f2',.7),0,L*.97,.152*k,torso);vm.rotation.x=-.18;
  // faixa diagonal na cor do time
  const sash=new THREE.Mesh(new THREE.TorusGeometry(.27*k,.026*k,6,40),mat(team,.45));
  sash.scale.set(1,.56,1.6);sash.rotation.order='ZYX';sash.rotation.set(Math.PI/2,0,-.78);
  sash.position.set(0,L*.6,0);torso.add(sash);
 }
 if(C.curva)torso.rotation.x=C.curva;
 // Pescoço e cabeça
 const neckTop=new THREE.Group();neckTop.position.set(0,L*.99,0);torso.add(neckTop);
 part(new THREE.CylinderGeometry(.052*k,.06*k,.13*k,14),pele,0,.03*k,0,neckTop);
 const R=.128*k;
 const head=new THREE.Group();head.name='avatar-head';head.position.set(0,.1*k+R*1.05,.01*k);neckTop.add(head);
 if(C.curva)head.rotation.x=-C.curva*1.3;
 const headMat=new THREE.MeshPhysicalMaterial({map:faceTexture(look.pele,look.cabelo,tipo),roughness:.6,sheen:.3,sheenColor:new THREE.Color('#ffd7c2')});
 const cranio=part(new THREE.SphereGeometry(R,40,30),headMat,0,0,0,head);cranio.scale.set(.88,1.16,.98);
 const nariz=part(new THREE.SphereGeometry(R*.13,10,8),pele,0,-R*.08,R*.98,head);nariz.scale.set(.9,1.25,1);
 for(const side of [-1,1]){const o=part(new THREE.SphereGeometry(R*.2,10,8),pele,side*R*.9,0,-R*.05,head);o.scale.set(.45,1,.75)}
 const estilo=look.cabeloEstilo==='auto'?C.cabelo:look.cabeloEstilo;
 const corCabelo=tipo.startsWith('idos')&&look.cabeloEstilo==='auto'?'#e7e4de':look.cabelo;
 buildHair(head,estilo,corCabelo,R,tipo);
 if(tipo==='idoso'){const bg=part(new THREE.CapsuleGeometry(R*.07,R*.42,4,8),mat(corCabelo,.95),0,-R*.33,R*.9,head);bg.rotation.z=Math.PI/2}

 // Braços: ombro → cotovelo → mão. Manga curta (camisa) ou longa (terno).
 const arms=[],elbows=[];
 for(const side of [-1,1]){
  const sh=new THREE.Group();sh.position.set(side*.198*k*C.ombro*1.12,L*.86,0);torso.add(sh);
  part(limb(.058*k,.046*k,.33*k),suit?camisa:pele,0,0,0,sh);
  if(!suit){part(limb(.064*k,.058*k,.15*k),camisa,0,.025*k,0,sh)}
  if(suit)part(new THREE.SphereGeometry(.058*k,14,10),camisa,0,-.01*k,0,sh);
  const el=new THREE.Group();el.position.y=-.31*k;sh.add(el);
  part(limb(.046*k,.034*k,.29*k),suit?camisa:pele,0,0,0,el);
  const mao=part(new THREE.SphereGeometry(.045*k,12,10),pele,0,-.31*k,0,el);mao.scale.set(.75,1.35,.5);
  const pol=part(new THREE.CapsuleGeometry(.012*k,.04*k,3,6),pele,side*-.02*k,-.29*k,.02*k,el);pol.rotation.z=side*.5;
  const ponta=new THREE.Object3D();ponta.position.y=-.31*k;el.add(ponta);maos.push(ponta);
  sh.rotation.z=side*.1;el.rotation.x=-.12;
  arms.push(sh);elbows.push(el);
 }

 // Acessórios presos à cabeça ou à mão.
 if(look.acessorio==='bone'){
  const c=part(new THREE.SphereGeometry(R*1.12,22,12,0,Math.PI*2,0,Math.PI*.5),mat(team,.6),0,R*.18,-.02*R,head);c.scale.set(.96,.92,1.02);
  const aba=part(new THREE.CylinderGeometry(R*.7,R*.7,R*.06,20,1,false,0,Math.PI),mat(team,.6),0,R*.2,R*.75,head);aba.rotation.y=-Math.PI/2;aba.scale.set(1,1,.85);
 }
 if(look.acessorio==='chapeu'){
  part(new THREE.CylinderGeometry(R*2.1,R*2.1,R*.07,28),mat('#e8dcb5',.8),0,R*.62,0,head);
  part(new THREE.CylinderGeometry(R*.95,R*1.08,R*.7,24),mat('#e8dcb5',.8),0,R*.98,0,head);
  part(new THREE.CylinderGeometry(R*1.09,R*1.09,R*.18,24),mat('#3b2b1d'),0,R*.72,0,head);
 }
 if(look.acessorio==='oculos'){
  for(const side of [-1,1])part(new THREE.TorusGeometry(R*.24,R*.035,6,18),mat('#111',.3),side*R*.33,R*.08,R*.95,head);
  part(new THREE.BoxGeometry(R*.2,R*.04,R*.04),mat('#111',.3),0,R*.1,R*1.0,head);
 }
 if(look.acessorio==='megafone'){
  const mega=part(new THREE.CylinderGeometry(.13*k,.045*k,.34*k,16,1,true),new THREE.MeshStandardMaterial({color:'#f5f5f5',roughness:.5,side:THREE.DoubleSide}),0,-.33*k,.17*k,elbows[1]);
  mega.rotation.x=Math.PI/2;
 }
 rig.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 group.userData.look=look;
 Object.assign(group.userData,{legs,knees,arms,elbows,pes,maos,rig,torso,curva:C.curva||0});
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
 // Modelos com esqueleto: atualiza ossos e calcula a caixa já com a pele aplicada, senão a medida sai errada.
 model.updateMatrixWorld(true);
 model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();o.computeBoundingSphere();o.frustumCulled=false}});
 const box=new THREE.Box3().setFromObject(model);
 const size=box.getSize(new THREE.Vector3());
 if(!size.y||!Number.isFinite(size.y))throw new Error('Modelo sem geometria visível.');
 model.scale.setScalar(altura/size.y);
 model.updateMatrixWorld(true);
 const box2=new THREE.Box3().setFromObject(model);
 const c=box2.getCenter(new THREE.Vector3());
 model.position.set(-c.x,-box2.min.y,-c.z);
}
// Corpos base com esqueleto (rig do Higgsfield). Os quatro tipos usam o modelo da camisa vermelha;
// no time amarelo a camisa é recolorida no navegador. Todos usam a mesma caminhada do homem.
// Se o arquivo não estiver em /assets/bases, busca direto no Higgsfield.
const HF='https://d8j0ntlcm91z4.cloudfront.net/user_3KLobL96cAs3bokj0G7CRMHMham/hf_2026102';
export const BASE_CDN={
 homem:HF+'0_215339_5b3afe7f-0a9f-4ddb-8aa1-741495549426.glb',
 mulher:HF+'1_035345_d9a45351-2fb7-4851-a39b-d9344ccbf900.glb',
 idoso:HF+'1_035348_ac51b268-b3d6-4f59-96e0-90d8321b8b11.glb',
 idosa:HF+'1_035350_129869ee-bac0-4d0c-a62d-5f3ce1127f18.glb'
};
export const THUMB_CDN={
 'homem-vermelho':HF+'0_214605_fadcc2c8-ed85-4ee7-8d46-5a6c03cd4abd.png','mulher-vermelho':HF+'0_214605_df98cea5-b40e-4991-8e9b-30abdb82df67.png',
 'idoso-vermelho':HF+'0_214604_06344de0-261c-47fa-9072-21746ae89e10.png','idosa-vermelho':HF+'0_214605_2272ba5a-4ea6-4f7c-9223-26f6a424a5a9.png',
 'homem-amarelo':HF+'0_214628_05ab2456-ae6b-4f7d-8728-0d6c289324d5.png','mulher-amarelo':HF+'0_214630_98eccc5e-adca-41bd-996e-a02757bc89a5.png',
 'idoso-amarelo':HF+'0_214629_a81ece7f-f013-4f5c-acf4-4e064cb6bdf2.png','idosa-amarelo':HF+'0_214629_fca271b7-5500-4711-a45f-4a66a544a863.png'
};
const ALTURA={homem:2.15,mulher:2.08,idoso:2.1,idosa:2.0};
const baseCache=new Map();
export const baseStatus=new Map(); // chave -> 'ok' | 'faltando'
function loadBase(tipo){
 if(!baseCache.has(tipo)){
  const loader=new GLTFLoader();
  baseCache.set(tipo,loader.loadAsync('/assets/bases/'+tipo+'.glb')
   .catch(()=>BASE_CDN[tipo]?loader.loadAsync(BASE_CDN[tipo]):Promise.reject(new Error('sem arquivo')))
   .then(g=>{baseStatus.set(tipo,'ok');return g})
   .catch(()=>{baseStatus.set(tipo,'faltando');return null}));
 }
 return baseCache.get(tipo);
}
// Caminhada única para todos: a "Casual_Walk" do rig do homem. Os quatro corpos têm o mesmo esqueleto
// (24 ossos com os mesmos nomes). Os rigs sem animação trazem um "clip0" de um quadro só (pose parada),
// que é ignorado. Na cópia, fica só a rotação dos ossos e o movimento do quadril, ajustado à altura de cada corpo.
let walkBase=null;
let genuineRunBase=null;
function sharedRun(){
 if(!genuineRunBase)genuineRunBase=new GLTFLoader()
  .loadAsync('/assets/anims/run-sprint-v2.glb')
  .then(g=>({clip:g.animations.find(a=>/sprint|run|corr/i.test(a.name))||g.animations[0]||null,scene:g.scene,source:'Sprint V2 - rig original'}))
  .catch(e=>{
   console.warn('Sprint V2 indisponível, tentando animação anterior',e);
   return new GLTFLoader().loadAsync('/assets/anims/run-higgsfield.glb')
    .then(g=>({clip:g.animations.find(a=>/run|corr/i.test(a.name))||g.animations[0]||null,scene:g.scene,source:'Run anterior'}))
    .catch(e2=>{console.warn('Nenhum arquivo Run disponível',e2);return null});
  });
 return genuineRunBase;
}
function runPara(base, model){
 // Reject static 1-frame clips; they make a character glide instead of running.
 if(!base?.clip || !Number.isFinite(base.clip.duration) || base.clip.duration < .25)return null;
 const bones=new Map();model.traverse(o=>{if(o.isBone)bones.set(o.name,o)});
 const tracks=[];
 for(const t of base.clip.tracks){
  if(t.name.endsWith('.quaternion')){
   const name=t.name.slice(0,-'.quaternion'.length);
   const src=base.scene.getObjectByName(name),dst=bones.get(name);
   if(!dst||!src)continue;
   const inv=src.quaternion.clone().invert(),rest=dst.quaternion.clone(),vals=Float32Array.from(t.values);
   const q=new THREE.Quaternion();
   for(let i=0;i<vals.length;i+=4)q.fromArray(vals,i).premultiply(inv).premultiply(rest).normalize().toArray(vals,i);
   tracks.push(new THREE.QuaternionKeyframeTrack(t.name,t.times,vals));
  }else if(t.name==='Hips.position'){
   const src=base.scene.getObjectByName('Hips'),dst=bones.get('Hips');
   if(!src||!dst)continue;
   const vals=Float32Array.from(t.values);
   // No arquivo antigo a posição do quadril era descartada. Agora preservar a
   // oscilação de impulso e aterrissagem, relativa à pose do próprio modelo.
   // Root X/Z permanece fixo: posição de jogo é controlada pelo multiplayer.
   const srcRest=src.position.y, dstRest=dst.position.y;
   const clampDelta=Math.max(.02,Math.abs(srcRest)*.13);
   for(let i=0;i<vals.length;i+=3){
    vals[i]=dst.position.x;
    vals[i+1]=dstRest+THREE.MathUtils.clamp(vals[i+1]-srcRest,-clampDelta,clampDelta);
    vals[i+2]=dst.position.z;
   }
   tracks.push(new THREE.VectorKeyframeTrack('Hips.position',t.times,vals));
  }
 }
 return tracks.filter(t=>t.name.endsWith('.quaternion')).length>=8&&tracks.some(t=>t.times.length>=3)
   ?new THREE.AnimationClip(base.clip.name||'Sprint_V2',base.clip.duration,tracks):null;
}
function sharedWalk(){
 if(!walkBase)walkBase=loadBase('homem').then(g=>{
  const clip=g&&g.animations.find(a=>/walk|andar/i.test(a.name));
  const hips=g?.scene.getObjectByName('Hips');
  return clip?{clip,hipsRest:hips?hips.position.clone():new THREE.Vector3()}:null;
 });
 return walkBase;
}
function walkPara(base,hipsAlvo){
 const tracks=[];
 for(const t of base.clip.tracks){
  if(t.name.endsWith('.scale'))continue;
  if(t.name.endsWith('.position')){
   if(t.name!=='Hips.position'||!hipsAlvo)continue;
   const v=t.values.slice(),r=base.hipsRest;
   for(let i=0;i<v.length;i+=3){v[i]+=hipsAlvo.x-r.x;v[i+1]+=hipsAlvo.y-r.y;v[i+2]+=hipsAlvo.z-r.z}
   tracks.push(new THREE.VectorKeyframeTrack(t.name,t.times,v));continue;
  }
  tracks.push(t);
 }
 return new THREE.AnimationClip('caminhada',base.clip.duration,tracks);
}
// Troca o vermelho saturado da textura por amarelo (camisa do time amarelo). Pele e cabelo não mudam.
const recolorCache=new Map();
function recolorTexture(tex){
 if(!tex?.image)return tex;
 if(recolorCache.has(tex.uuid))return recolorCache.get(tex.uuid);
 const img=tex.image,w=img.width,h=img.height;
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
 try{if(tex.flipY===false){g.drawImage(img,0,0)}else{g.drawImage(img,0,0)}}catch{return tex}
 const d=g.getImageData(0,0,w,h),p=d.data;
 for(let i=0;i<p.length;i+=4){
  const r=p[i]/255,gg=p[i+1]/255,b=p[i+2]/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),dl=mx-mn;
  if(mx<.18||dl/mx<.5)continue;
  let hh;if(mx===r)hh=((gg-b)/dl)%6;else if(mx===gg)hh=(b-r)/dl+2;else hh=(r-gg)/dl+4;hh*=60;if(hh<0)hh+=360;
  if(!(hh<=16||hh>=344))continue;
  // vermelho → amarelo (#f4c20d ~ 47°), clareando um pouco
  const v=Math.min(1,mx*1.18),s=Math.min(1,dl/mx*.95),H=47/60,C=v*s,X=C*(1-Math.abs(H%2-1)),m=v-C;
  p[i]=(C+m)*255;p[i+1]=(X+m)*255;p[i+2]=m*255;
 }
 g.putImageData(d,0,0);
 const t=new THREE.CanvasTexture(c);
 t.flipY=tex.flipY;t.colorSpace=tex.colorSpace;t.wrapS=tex.wrapS;t.wrapT=tex.wrapT;t.channel=tex.channel;t.anisotropy=tex.anisotropy;
 recolorCache.set(tex.uuid,t);return t;
}
async function applyBase(group,look){
 const tipo=look.base==='boneco'?null:look.base;
 const key=tipo?tipo+'-'+look.team:null;
 group.userData.baseKey=key;
 if(group.userData.baseModel&&group.userData.baseModel.userData.key!==key){group.remove(group.userData.baseModel);group.userData.baseModel=null}
 if(!key||group.userData.baseModel){refreshVisibility(group);return}
 const gltf=await loadBase(tipo);
 if(!gltf||group.userData.baseKey!==key){refreshVisibility(group);return}
 const model=cloneSkinned(gltf.scene);
 try{normalize(model,ALTURA[tipo]||2.15)}catch{return}
 model.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
  if(look.team==='amarelo'&&o.material?.map){o.material=o.material.clone();o.material.map=recolorTexture(o.material.map)}
 });
 const holder=new THREE.Group();holder.add(model);holder.name='base';holder.userData.key=key;
 group.add(holder);group.userData.baseModel=holder;
 refreshVisibility(group);
 // Com esqueleto: todos usam a mesma caminhada, ajustada ao quadril de cada corpo.
 let skinned=false;model.traverse(o=>{if(o.isSkinnedMesh)skinned=true});
 if(!skinned)return;
 // Walk e Run são clipes independentes. Um GLB ausente não bloqueia o outro.
 const [base,runBase]=await Promise.all([sharedWalk(),sharedRun()]);
 if(group.userData.baseModel!==holder)return; // usuário trocou de personagem durante o carregamento
 const hips=model.getObjectByName('Hips');
 const walkClip=base?walkPara(base,hips?hips.position:null):null;
 const runClip=runPara(runBase,model);
 if(!walkClip&&!runClip){console.warn('Nenhum clipe de locomoção compatível para',tipo);return}
 const mixer=new THREE.AnimationMixer(model);
 const walk=walkClip?mixer.clipAction(walkClip):null;
 const run=runClip?mixer.clipAction(runClip):null;
 if(!run)console.warn('Run independente indisponível: não acelere o Walk para fingir corrida.');
 holder.userData.mixer=mixer;holder.userData.walk=walk;holder.userData.run=run;holder.userData.runSource=run?runBase?.source||'GLB':null;
 holder.userData.locomotion=null;holder.userData.andando=false;
}

// Caminhada procedural: balança pernas e braços; parado, respira de leve.
export function animateAvatar(group,moving,t,ritmo=1){
 desfazerPose(group);
 const {legs,arms,rig,imported,baseModel,mixer,clips}=group.userData;
 if(!imported&&baseModel){
  const walk=baseModel.userData.walk,run=baseModel.userData.run;
  if(walk||run){
   const mode=modoLocomocao(moving,ritmo);
   // Nunca transformar Walk em corrida acelerada. Se Run falhar, manter Walk normal
   // e reportar no preview; a correção verdadeira depende do clipe independente.
   const target=mode==='idle'?null:(mode==='run'?(run||walk):(walk||run));
   const current=baseModel.userData.locomotion||null;
   if(current!==target){
    current?.fadeOut(.22);
    if(target){target.reset();target.enabled=true;target.setEffectiveWeight(1);target.fadeIn(.22).play()}
    baseModel.userData.locomotion=target;
   }
   // Clipes fazem o contato dos pés; não acrescentar "pulo" ou balanço artificial.
   baseModel.position.y=0;baseModel.rotation.z=0;
   if(target)target.timeScale=1;
   return;
  }
  baseModel.position.y=0;baseModel.rotation.z=0;
  return;
 }
 if(imported){
  if(mixer&&clips){
   const want=moving?(ritmo>=2?(clips.run||clips.walk||clips.idle):(clips.walk||clips.run||clips.idle)):(clips.idle||clips.walk||clips.run);
   if(want&&group.userData.current!==want){group.userData.current?.fadeOut(.2);want.reset().fadeIn(.2).play();group.userData.current=want}
  }
  if(!mixer)imported.position.y=moving?Math.abs(Math.sin(t*9))*.08:0;
  return;
 }
 if(!legs)return;
 const {knees,elbows,torso,curva}=group.userData;
 const mode=modoLocomocao(moving,ritmo);
 const prev=group.userData.lastLocomotionT??t;
 const dt=Math.max(0,Math.min(.05,t-prev));
 group.userData.lastLocomotionT=t;
 const blendTarget=mode==='run'?1:0;
 const blend=THREE.MathUtils.damp(group.userData.runBlend||0,blendTarget,10,dt);
 group.userData.runBlend=blend;
 const walkCadence=8.7,runCadence=14.6;
 // Integrar a fase evita salto instantâneo da passada ao alternar Walk / Run.
 group.userData.gaitPhase=(group.userData.gaitPhase||0)+dt*(walkCadence+(runCadence-walkCadence)*blend);
 const f=group.userData.gaitPhase,sw=moving?Math.sin(f):0;
 const stride=.51+blend*.30;
 legs[0].rotation.x=sw*stride;legs[1].rotation.x=-sw*stride;
 // Na corrida há elevação de joelho, perna de apoio e braço com cotovelo dobrado.
 knees[0].rotation.x=moving?Math.max(0,-Math.sin(f-.8))*(.68+blend*.46)+.03:0;
 knees[1].rotation.x=moving?Math.max(0,Math.sin(f-.8))*(.68+blend*.46)+.03:0;
 arms[0].rotation.x=-sw*(.38+blend*.25);
 arms[1].rotation.x=sw*(.38+blend*.25);
 elbows[0].rotation.x=-.18-blend*.78-(moving?Math.max(0,sw)*.18:0);
 elbows[1].rotation.x=-.18-blend*.78-(moving?Math.max(0,-sw)*.18:0);
 torso.rotation.y=sw*(.055+blend*.035);
 torso.rotation.x=curva+(moving?.035:0)+blend*.14; // leve inclinação para frente
 const breath=Math.sin(t*1.8)*.006;
 rig.position.y=moving?Math.abs(Math.sin(f))*(.02+blend*.024):breath;
 torso.scale.set(1+breath*.6,1,1+breath*1.2);
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
 model.traverse(o=>{if(o.isMesh)o.castShadow=true});
 const holder=new THREE.Group();holder.add(model);holder.name='imported';
 removeImported(group);
 group.add(holder);group.userData.imported=holder;
 refreshVisibility(group);
 // Se o modelo tiver animações, tenta achar "walk"/"idle" pelo nome.
 if(gltf.animations.length){
  const mixer=new THREE.AnimationMixer(model);
  const find=re=>gltf.animations.find(c=>re.test(c.name));
  const walk=find(/walk|andar/i),run=find(/run|correr|sprint/i),idle=find(/idle|parad|stand/i)||gltf.animations[0];
  group.userData.mixer=mixer;
  group.userData.clips={walk:walk&&mixer.clipAction(walk),run:run&&mixer.clipAction(run),idle:idle&&mixer.clipAction(idle)};
 }
 return {nome:file.name,animacoes:gltf.animations.map(a=>a.name)};
}
export function removeImported(group){
 const old=group.userData.imported;
 if(old)group.remove(old);
 group.userData.imported=null;group.userData.mixer=null;group.userData.clips=null;group.userData.current=null;
 refreshVisibility(group);
}

// Avança as animações do avatar (modelo importado ou corpo base com esqueleto).
export function updateAvatarMixers(group,dt){
 group.userData.mixer?.update(dt);
 group.userData.baseModel?.userData.mixer?.update(dt);
 aplicarPose(group);
}

// ---------- Poses de ação ----------
// Segurar espada, golpear, mirar com o arco, arremessar a bomba e sentar no veículo.
// Cada segmento do braço/perna é apontado para uma direção no referencial do personagem
// (X = esquerda, Y = cima, Z = frente), por cima da caminhada. Funciona no boneco e nos corpos com esqueleto.
export function poseAvatar(group,nome,k=0){group.userData.pose=nome?{nome,k}:null}
const OSSOS={bracoD:['RightArm','RightForeArm','RightHand'],bracoE:['LeftArm','LeftForeArm','LeftHand'],
 pernaD:['RightUpLeg','RightLeg','RightFoot'],pernaE:['LeftUpLeg','LeftLeg','LeftFoot']};
function corpoAtivo(group){
 const {imported,baseModel,rig}=group.userData;
 const fonte=imported||baseModel;
 if(fonte&&fonte.getObjectByName('RightArm')){
  if(group.userData._cadDe!==fonte){group.userData._cadDe=fonte;group.userData._cad=Object.fromEntries(Object.entries(OSSOS).map(([k,n])=>[k,n.map(x=>fonte.getObjectByName(x))]).filter(([,v])=>v.every(Boolean)))}
  return group.userData._cad;
 }
 if(imported||baseModel||!rig)return null;
 const {arms,elbows,maos,legs,knees,pes}=group.userData;
 if(!maos?.length)return null;
 return {bracoD:[arms[0],elbows[0],maos[0]],bracoE:[arms[1],elbows[1],maos[1]],pernaD:[legs[0],knees[0],pes[0]],pernaE:[legs[1],knees[1],pes[1]]};
}
const V=(x,y,z)=>new THREE.Vector3(x,y,z).normalize();
const mix=(a,b,t)=>a.clone().lerp(b,t).normalize();
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
function chaves(lista,k){ // [[k, [d1,d2]], ...] → interpolação suave
 for(let i=1;i<lista.length;i++)if(k<=lista[i][0]){const [k0,a]=lista[i-1],[k1,b]=lista[i];const u=ease((k-k0)/(k1-k0||1));return [mix(a[0],b[0],u),mix(a[1],b[1],u)]}
 return lista[lista.length-1][1];
}
const P={
 cartazD:[V(-.18,.24,.96),V(.02,.4,.91)],
 cartazE:[V(.18,-.3,.94),V(-.04,.3,.95)],
 espada:[V(-.25,-.85,.45),V(-.05,-.1,1)],
 golpe:[[0,[V(-.25,-.85,.45),V(-.05,-.1,1)]],[.3,[V(-.35,.85,-.35),V(-.15,.9,.4)]],[.55,[V(.2,-.3,.95),V(.6,-.35,.7)]],[1,[V(-.25,-.85,.45),V(-.05,-.1,1)]]],
 arcoE:[V(.15,-.75,.6),V(0,-.2,1)],
 mirarE:[V(.08,.06,1),V(.02,.06,1)],
 mirarD:[[0,[V(-.2,-.2,.95),V(.25,.1,.95)]],[1,[V(-.75,.12,-.6),V(.78,.12,.6)]]],
 bomba:[V(-.3,-.75,.55),V(-.05,.25,1)],
 arremesso:[[0,[V(-.3,-.75,.55),V(-.05,.25,1)]],[.4,[V(-.35,.45,-.8),V(-.1,.95,-.25)]],[.65,[V(-.1,.7,.7),V(0,.3,1)]],[1,[V(-.3,-.75,.55),V(-.05,.25,1)]]],
 sentadoD:[V(-.12,-.12,1),V(0,-1,.12)],sentadoE:[V(.12,-.12,1),V(0,-1,.12)],
 guidaoD:[V(-.15,-.5,.85),V(.05,-.15,1)],guidaoE:[V(.15,-.5,.85),V(-.05,-.15,1)],
 montadoD:[V(-.55,-.55,.6),V(-.1,-1,.1)],montadoE:[V(.55,-.55,.6),V(.1,-1,.1)],
 // Key poses intermediárias: joelhos, mãos e guidão se movem com o veículo.
 carroD:[[0,[V(-.13,-.18,.98),V(.08,-.45,.9)]],[.5,[V(-.3,-.14,.94),V(.22,-.42,.88)]],[1,[V(-.08,-.18,.98),V(.02,-.42,.9)]]],
 carroE:[[0,[V(.13,-.18,.98),V(-.08,-.45,.9)]],[.5,[V(.08,-.18,.98),V(-.03,-.48,.88)]],[1,[V(.3,-.14,.94),V(-.22,-.42,.88)]]],
 motoD:[[0,[V(-.38,-.23,.89),V(.04,-.12,.99)]],[.5,[V(-.39,-.33,.86),V(.02,-.2,.98)]],[1,[V(-.37,-.21,.9),V(.04,-.10,.99)]]],
 motoE:[[0,[V(.38,-.23,.89),V(-.04,-.12,.99)]],[.5,[V(.39,-.33,.86),V(-.02,-.2,.98)]],[1,[V(.37,-.21,.9),V(-.04,-.10,.99)]]],
 heliD:[V(-.12,-.48,.87),V(.04,-.86,.50)],heliE:[V(.28,-.52,.81),V(-.15,-.65,.74)],
 cacaD:[V(-.10,-.36,.93),V(.03,-.84,.53)],cacaE:[V(.18,-.38,.90),V(-.14,-.76,.64)],
 dinoD:[[0,[V(-.47,-.43,.77),V(.06,-.72,.69)]],[.5,[V(-.52,-.55,.67),V(.02,-.78,.62)]],[1,[V(-.47,-.43,.77),V(.06,-.72,.69)]]],
 dinoE:[[0,[V(.47,-.43,.77),V(-.06,-.72,.69)]],[.5,[V(.52,-.55,.67),V(-.02,-.78,.62)]],[1,[V(.47,-.43,.77),V(-.06,-.72,.69)]]],
};
function alvos(nome,k){
 switch(nome){
  case 'cartaz':return {bracoD:POSE_CARTAZ.bracoD.map(direction=>V(...direction))};
  case 'espada':return {bracoD:P.espada};
  case 'golpe':return {bracoD:chaves(P.golpe,k)};
  case 'arco':return {bracoE:P.arcoE};
  case 'mirar':return {bracoE:P.mirarE,bracoD:chaves(P.mirarD,k)};
  case 'bomba':return {bracoD:P.bomba};
  case 'arremesso':return {bracoD:chaves(P.arremesso,k)};
  case 'sentado':return {pernaD:P.sentadoD,pernaE:P.sentadoE,bracoD:P.guidaoD,bracoE:P.guidaoE};
  case 'montado':return {pernaD:P.montadoD,pernaE:P.montadoE,bracoD:chaves(P.dinoD,k),bracoE:chaves(P.dinoE,k)};
  case 'dirigindo-carro':return {pernaD:P.sentadoD,pernaE:P.sentadoE,bracoD:chaves(P.carroD,k),bracoE:chaves(P.carroE,k)};
  case 'pilotando-moto':return {pernaD:P.montadoD,pernaE:P.montadoE,bracoD:chaves(P.motoD,k),bracoE:chaves(P.motoE,k)};
  case 'pilotando-helicoptero':return {pernaD:P.sentadoD,pernaE:P.sentadoE,bracoD:P.heliD,bracoE:P.heliE};
  case 'pilotando-caca':return {pernaD:P.sentadoD,pernaE:P.sentadoE,bracoD:P.cacaD,bracoE:P.cacaE};
 }
 return null;
}
const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_q=new THREE.Quaternion(),_p=new THREE.Quaternion(),_g=new THREE.Quaternion(),_d=new THREE.Vector3();
function apontar(osso,filho,dirMundo){
 osso.getWorldPosition(_a);filho.getWorldPosition(_b);
 const atual=_b.sub(_a);if(atual.lengthSq()<1e-10)return;atual.normalize();
 _q.setFromUnitVectors(atual,dirMundo);
 osso.parent.getWorldQuaternion(_p);
 const local=_p.clone().invert().multiply(_q).multiply(_p);
 osso.quaternion.premultiply(local);osso.updateMatrixWorld(true);
}
function aplicarPose(group){
 const pose=group.userData.pose;if(!pose)return;
 const cad=corpoAtivo(group);if(!cad)return;
 const a=alvos(pose.nome,pose.k);if(!a)return;
 group.updateMatrixWorld(true);group.getWorldQuaternion(_g);
 const tocados=group.userData._tocados=[];
 for(const [membro,dirs] of Object.entries(a)){
  const c=cad[membro];if(!c)continue;
  tocados.push([c[0],c[0].quaternion.clone()],[c[1],c[1].quaternion.clone()]);
  apontar(c[0],c[1],_d.copy(dirs[0]).applyQuaternion(_g));
  apontar(c[1],c[2],_d.copy(dirs[1]).applyQuaternion(_g));
 }
}
function desfazerPose(group){
 const t=group.userData._tocados;if(!t)return;
 for(let i=t.length-1;i>=0;i--)t[i][0].quaternion.copy(t[i][1]);
 group.userData._tocados=null;
}
// Ajusta as mãos depois do mixer atualizar os ossos; preserva caminhada/corrida originais.
export function aplicarPoseAtual(group){desfazerPose(group);aplicarPose(group);}
// Mão para prender itens: o osso da mão (com esqueleto) ou a ponta do antebraço (boneco).
export function maoDoAvatar(group,lado='D'){
 const cad=corpoAtivo(group);const m=cad?.['braco'+lado];
 return m?{mao:m[2],antebraco:m[1]}:null;
}
