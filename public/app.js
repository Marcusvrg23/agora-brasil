import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js';

const canvas=document.querySelector('#world');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#86b0d4');
scene.fog=new THREE.FogExp2('#93b5ce',0.0007);
const camera=new THREE.PerspectiveCamera(58,1,0.1,3400);
camera.position.set(112,90,100);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
scene.add(new THREE.HemisphereLight('#edf6ff','#728557',2.1));
const sun=new THREE.DirectionalLight('#ffeed6',2.2);
sun.position.set(-100,280,140);scene.add(sun);
const controls=new OrbitControls(camera,canvas);
controls.target.set(0,30,-187);
controls.enableDamping=true;
controls.maxDistance=700;controls.minDistance=6;
controls.maxPolarAngle=Math.PI/2-0.02;controls.update();
const modelStatus=document.querySelector('#model-status');
const count=document.querySelector('#live-count');
let modelRoot=null;
let mixers=[];
const clock=new THREE.Clock();
function block(name, pos, dims, color) {
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...dims),new THREE.MeshStandardMaterial({color,roughness:0.75}));
 mesh.position.set(...pos);mesh.name=name;scene.add(mesh);return mesh;
}
function makeFallback(){
 block('Plano verde',[0,-1,-100],[800,2,1200],'#618756');
 block('Esplanada Gramado',[0,0,-140],[160,1,740],'#538446');
 block('Plataforma Congresso',[0,5,-190],[250,10,56],'#c9d5d6');
 for(const x of [-14,14]) {
  block('Torre Congresso',[x,61,-213],[21,110,23],'#91aab9');
  block('Vidros torre',[x,61,-201.2],[19,107,.2],'#24495a');
 }
 for(const item of [{x:-80,r:31,h:19,up:true},{x:80,r:39,h:15,up:false}]) {
   const material=new THREE.MeshStandardMaterial({color:'#f7f5e9',roughness:.65,side:THREE.DoubleSide});
   const shape=new THREE.SphereGeometry(item.r,50,25,0,Math.PI*2,0,Math.PI/2);
   const bowl=new THREE.Mesh(shape,material);bowl.position.set(item.x,10,-190);
   if(!item.up) bowl.rotation.z=Math.PI;
   scene.add(bowl);
 }
 block('Espelho d’água',[0,0.35,-121],[229,.3,65],'#62a5c2');
 block('Passarela',[0,.8,-121],[13,.65,80],'#b2b7b1');
 for(const side of [-1,1]){
   block('Pista',[side*99,.1,-130],[43,.15,730],'#3d464c');
   for(let i=0;i<6;i++)block('Ministério',[side*183,16,-70+i*103],[49,32,44],'#c8d1d1');
 }
}
new GLTFLoader().load('/assets/brasilia-v4.glb',gltf=>{
 modelRoot=gltf.scene;
 modelRoot.traverse(obj=>{
  if(obj.isCamera||obj.isLight) obj.visible=false;
  if(obj.isMesh) obj.frustumCulled=true;
 });
 scene.add(modelRoot);
 if(gltf.animations.length){const mix=new THREE.AnimationMixer(modelRoot);for(const clip of gltf.animations)mix.clipAction(clip).play();mixers.push(mix)}
 modelStatus.textContent='Cenário Blender 3D carregado · '+gltf.animations.length+' animações';
},undefined,()=>{
 makeFallback();modelStatus.textContent='Maquete 3D básica · modelo Blender em importação';
});
function resize(){
 const width=canvas.clientWidth,height=canvas.clientHeight;
 if(!width||!height)return;
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
let socket=null,myId=null,entered=false,name='Visitante',room='5300108';
const live=document.querySelector('#status-dot'),status=document.querySelector('#status-label');
const peers=new Map();
// Times e trajes: cores genéricas, sem nome, sigla ou símbolo de partido.
const TEAM_COLORS={vermelho:'#d32f2f',amarelo:'#f4c20d'};
const SUIT_COLOR='#2b2f36';
let myTeam='vermelho',myOutfit='camisa';
// Monta o corpo do avatar dentro do grupo: camisa na cor do time, ou terno escuro com faixa diagonal.
function dressAvatar(group,team,outfit,scale=1){
 for(const child of [...group.children])group.remove(child);
 const teamColor=TEAM_COLORS[team]||TEAM_COLORS.vermelho;
 const suit=outfit==='terno-faixa';
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.35*scale,1.0*scale,4,8),new THREE.MeshStandardMaterial({color:suit?SUIT_COLOR:teamColor,roughness:.7}));
 body.position.y=1.22;group.add(body);
 if(suit){
  const sash=new THREE.Mesh(new THREE.BoxGeometry(.16,1.05,.74),new THREE.MeshStandardMaterial({color:teamColor,roughness:.5}));
  sash.position.y=1.32;sash.rotation.z=-.62;group.add(sash);
 }
 const head=new THREE.Mesh(new THREE.SphereGeometry(.25*scale,12,10),new THREE.MeshStandardMaterial({color:'#c99a74'}));
 head.position.y=2.08;group.add(head);
 group.userData.team=team;group.userData.outfit=outfit;
}
const player=new THREE.Group();
scene.add(player);
dressAvatar(player,myTeam,myOutfit);
player.position.set(0,0,-70);
player.visible=false;
function remoteAvatar(id,x,z,label,team,outfit) {
 if(peers.has(id))return peers.get(id);
 const mesh=new THREE.Group();
 dressAvatar(mesh,team||'vermelho',outfit||'camisa',.97);
 mesh.userData.name=label||'';
 mesh.position.set(x||0,0,z||-75);scene.add(mesh);
 peers.set(id,mesh);return mesh;
}

// Tribuna do debate no gramado, à frente do espelho d'água.
const TRIBUNA={x:42,z:-62};
const PULPITO={a:{x:TRIBUNA.x-6,z:TRIBUNA.z},b:{x:TRIBUNA.x+6,z:TRIBUNA.z}};
(function buildTribuna(){
 const palco=new THREE.Mesh(new THREE.BoxGeometry(20,.25,8),new THREE.MeshStandardMaterial({color:'#e9e4d6',roughness:.8}));
 palco.position.set(TRIBUNA.x,.12,TRIBUNA.z);scene.add(palco);
 for(const [lado,cor] of [['a','#9fd8c6'],['b','#c5b8f0']]){
  const pos=PULPITO[lado];
  const pulpito=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.25,.8),new THREE.MeshStandardMaterial({color:'#5b4636',roughness:.6}));
  pulpito.position.set(pos.x,.88,pos.z+1.1);scene.add(pulpito);
  const placa=new THREE.Mesh(new THREE.BoxGeometry(1.2,.3,.05),new THREE.MeshStandardMaterial({color:cor}));
  placa.position.set(pos.x,1.15,pos.z+1.53);scene.add(placa);
 }
 const telao=new THREE.Mesh(new THREE.BoxGeometry(10,4,.3),new THREE.MeshStandardMaterial({color:'#101820',emissive:'#0d2a33',roughness:.4}));
 telao.position.set(TRIBUNA.x,4.2,TRIBUNA.z-3.2);scene.add(telao);
})();
function log(msg,nick,time){
 const pane=document.querySelector('#messages');
 const el=document.createElement('div');
 el.className=nick?'message':'system';
 if(nick) {
  const strong=document.createElement('b');strong.textContent=nick;el.append(strong);
  const timestamp=document.createElement('time');timestamp.textContent=new Date(time||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});el.append(timestamp);
  el.append(document.createTextNode(msg));
 } else el.textContent=msg;
 pane.append(el);pane.scrollTop=pane.scrollHeight;
 while(pane.children.length>65)pane.firstChild.remove();
}
function send(data){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(data))}
function connect(){
 if(socket&&socket.readyState<2)socket.close();
 const scheme=location.protocol==='https:'?'wss:':'ws:';
 socket=new WebSocket(scheme+'//'+location.host);
 socket.onopen=()=>{
  live.classList.add('connected');status.textContent='Conectado';
  send({type:'join',room,name,team:myTeam,outfit:myOutfit});
 };
 socket.onmessage=(event)=>{
  let data;try{data=JSON.parse(event.data)}catch{return}
  if(data.type==='hello')myId=data.id;
  if(data.type==='joined'){
   entered=true;player.visible=true;
   for(const mesh of peers.values())scene.remove(mesh);peers.clear();
   for(const other of data.peers||[])remoteAvatar(other.id,other.position?.x,other.position?.z,other.name,other.team,other.outfit);
   log('Você entrou na praça. Participação gratuita e plural.');
   count.textContent=data.count+' online';
  }
  if(data.type==='presence')count.textContent=data.count+' online';
  if(data.type==='chat')log(data.text,data.name,data.time);
  if(data.type==='enter'&&data.id!==myId)remoteAvatar(data.id,data.position?.x,data.position?.z,data.name,data.team,data.outfit);
  if(data.type==='look'&&data.id!==myId){const p=peers.get(data.id);if(p)dressAvatar(p,data.team,data.outfit,.97)}
  if(data.type==='debate')renderDebate(data.state);
  if(data.type==='debate-fala')debateLog(data);
  if(data.type==='leave'){const p=peers.get(data.id);if(p){scene.remove(p);peers.delete(data.id)}}
  if(data.type==='move'){const p=remoteAvatar(data.id,data.x,data.z,'');p.position.set(data.x,0,data.z)}
 };
 socket.onclose=()=>{
  entered=false;renderDebate(null);live.classList.remove('connected');status.textContent='Desconectado';count.textContent='0 online';
 };
 socket.onerror=()=>{status.textContent='Sem conexão'};
}
document.querySelector('#enter').addEventListener('click',()=>{
 name=(document.querySelector('#nickname').value||'Visitante').trim().slice(0,24)||'Visitante';
 room=document.querySelector('#city').value;
 const sel=document.querySelector('#city');document.querySelector('#room-label').textContent=sel.selectedOptions[0].textContent.split('·')[0].trim();
 connect();
});
for(const id of ['team','outfit']){
 document.querySelector('#'+id).addEventListener('change',()=>{
  myTeam=document.querySelector('#team').value;myOutfit=document.querySelector('#outfit').value;
  dressAvatar(player,myTeam,myOutfit);
  if(entered)send({type:'look',team:myTeam,outfit:myOutfit});
 });
}

// ---------- Modo debate ----------
const FASES={aguardando:'Aguardando',abertura:'Abertura',replica:'Réplica',treplica:'Tréplica',votacao:'Votação',resultado:'Resultado'};
const dbg={
 phase:document.querySelector('#debate-phase'),timer:document.querySelector('#debate-timer'),
 a:document.querySelector('#debate-a'),b:document.querySelector('#debate-b'),
 feed:document.querySelector('#debate-feed'),join:document.querySelector('#debate-join'),
 form:document.querySelector('#debate-form'),input:document.querySelector('#debate-input'),
 pass:document.querySelector('#debate-pass'),vote:document.querySelector('#debate-vote')
};
let debateState=null,myVote=null,lastPhaseKey='';
function debateSystem(text){
 const el=document.createElement('div');el.className='system';el.textContent=text;
 dbg.feed.append(el);dbg.feed.scrollTop=dbg.feed.scrollHeight;
 while(dbg.feed.children.length>80)dbg.feed.firstChild.remove();
}
function debateLog(data){
 const el=document.createElement('div');el.className='message';
 const tag=document.createElement('span');tag.className='tag-'+data.side;tag.textContent=data.side.toUpperCase();el.append(tag);
 const strong=document.createElement('b');strong.textContent=data.name;el.append(strong);
 el.append(document.createTextNode(data.text));
 dbg.feed.append(el);dbg.feed.scrollTop=dbg.feed.scrollHeight;
 while(dbg.feed.children.length>80)dbg.feed.firstChild.remove();
}
function paintSide(el,info,speaking){
 el.querySelector('b').textContent=info?info.name:'—';
 el.className='side'+(info?' '+info.team:'')+(speaking?' falando':'');
}
function mySide(st){return st?.a?.id===myId?'a':(st?.b?.id===myId?'b':null)}
function renderDebate(st){
 debateState=st;
 const fase=st?.fase||'aguardando';
 dbg.phase.textContent=FASES[fase]||fase;
 paintSide(dbg.a,st?.a,st?.orador==='a');paintSide(dbg.b,st?.b,st?.orador==='b');
 const side=mySide(st);
 const inQueue=!!st?.fila?.some(p=>p.id===myId);
 dbg.join.hidden=!entered||!!side;
 dbg.join.textContent=inQueue?'Sair da fila ('+st.fila.length+' na fila)':'Entrar na fila do debate'+(st?.fila?.length?' ('+st.fila.length+' na fila)':'');
 const myTurn=!!side&&st.orador===side;
 dbg.form.hidden=!myTurn;dbg.pass.hidden=!myTurn;
 const voting=fase==='votacao'&&entered&&!side;
 dbg.vote.hidden=!voting;
 for(const b of dbg.vote.querySelectorAll('button'))b.disabled=!!myVote;
 const key=fase+':'+(st?.orador||'')+':'+(st?.a?.id||'')+':'+(st?.b?.id||'');
 if(key!==lastPhaseKey){
  lastPhaseKey=key;
  if(fase==='abertura'&&st.orador==='a'){myVote=null;debateSystem('Começou o debate: '+st.a.name+' x '+st.b.name+'.')}
  if(st?.orador)debateSystem(FASES[fase]+': vez de '+st[st.orador].name+'.');
  if(fase==='votacao')debateSystem('Votação aberta por 30 s. Debatedores não votam.');
  if(fase==='resultado'){
   const v=st.votos||{a:0,b:0};
   const quem=st.vencedor==='empate'?'Empate':('Venceu '+st[st.vencedor].name);
   debateSystem(st.motivo==='wo'?quem+' por W.O.':quem+' · '+v.a+' x '+v.b+' votos.');
  }
  // Debatedor vai para o púlpito do seu lado.
  if(side&&fase!=='resultado'){const pos=PULPITO[side];player.position.set(pos.x,0,pos.z);send({type:'move',x:pos.x,z:pos.z})}
 }
}
function debateClock(){
 const st=debateState;
 if(!st||!st.terminaEm||st.fase==='aguardando'){dbg.timer.textContent='vs';return}
 const s=Math.max(0,Math.ceil((st.terminaEm-Date.now())/1000));
 dbg.timer.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}
setInterval(debateClock,250);
dbg.join.addEventListener('click',()=>{
 const inQueue=!!debateState?.fila?.some(p=>p.id===myId);
 send({type:inQueue?'debate-leave':'debate-join'});
});
dbg.form.addEventListener('submit',e=>{
 e.preventDefault();const text=dbg.input.value.trim();
 if(text)send({type:'debate-say',text});dbg.input.value='';
});
dbg.pass.addEventListener('click',()=>send({type:'debate-pass'}));
for(const b of dbg.vote.querySelectorAll('button')){
 b.addEventListener('click',()=>{if(myVote)return;myVote=b.dataset.side;send({type:'debate-vote',side:myVote});renderDebate(debateState)});
}
renderDebate(null);

document.querySelector('#chat-form').addEventListener('submit',e=>{
 e.preventDefault();const input=document.querySelector('#chat-input');const text=input.value.trim();
 if(!entered){log('Entre na manifestação para conversar.');return}
 if(text)send({type:'chat',text});input.value='';
});
const pressed=new Set();
window.addEventListener('keydown',e=>{
 if(e.target.matches('input,select,textarea'))return;
 const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){pressed.add(key);if(key.startsWith('arrow'))e.preventDefault()}
});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
for(const [id,key] of [['up','w'],['down','s'],['left','a'],['right','d']]){
 const button=document.querySelector('#'+id);
 for(const eventName of ['pointerdown','pointerup','pointercancel','pointerleave']){
  button.addEventListener(eventName,e=>{e.preventDefault();if(eventName==='pointerdown')pressed.add(key);else pressed.delete(key)})
 }
}
let netTick=0;
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05);
 for(const mixer of mixers)mixer.update(dt);
 if(entered){
  const speed=dt*9;let x=0,z=0;
  if(pressed.has('w')||pressed.has('arrowup'))z=-speed;
  if(pressed.has('s')||pressed.has('arrowdown'))z=speed;
  if(pressed.has('a')||pressed.has('arrowleft'))x=-speed;
  if(pressed.has('d')||pressed.has('arrowright'))x=speed;
  if(x||z){
   const nx=THREE.MathUtils.clamp(player.position.x+x,-300,300);
   const nz=THREE.MathUtils.clamp(player.position.z+z,-950,200);
   player.position.set(nx,0,nz);
   netTick+=dt;if(netTick>.13){send({type:'move',x:nx,z:nz});netTick=0}
  }
 }
 controls.update();renderer.render(scene,camera);
}
resize();animate();
