import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js';
import {buildCity,resolveCollision} from './cidade.js';
import {iniciarTeloes,iniciarFormulario} from './teloes.js';
import {iniciarPvP} from './pvp.js';
import {PHOTO_PROFILES} from './personagens.mjs';
import {aplicarRostoLocal,limparRostoLocal} from './foto-avatar.js';
import {iniciarBots} from './bots.js';
import {iniciarDesfile} from './desfile.js';
import {iniciarCartazes} from './cartazes.js';
import {dressAvatar,animateAvatar,importModel,removeImported,sanitizeLook,TEAM_COLORS,BASES,baseStatus,updateAvatarMixers,ESTILOS_CABELO,THUMB_CDN} from './avatar.js';

const canvas=document.querySelector('#world');
const scene=new THREE.Scene();
// Qualidade gráfica: "alto" (sombras 2048, espelho d'água com reflexo real) ou "leve" (notebooks e celulares).
function qualidadeInicial(){
 const q=new URLSearchParams(location.search).get('graficos');if(q==='alto'||q==='leve')return q;
 try{const s=localStorage.getItem('agora-graficos');if(s==='alto'||s==='leve')return s}catch{}
 return (navigator.hardwareConcurrency||4)<=4||/Mobi|Android/i.test(navigator.userAgent)?'leve':'alto';
}
const QUALIDADE=qualidadeInicial();
const camera=new THREE.PerspectiveCamera(55,1,0.35,9000);
camera.position.set(150,62,95);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:QUALIDADE==='alto'?'high-performance':'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,QUALIDADE==='alto'?1.5:1));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,canvas);
controls.target.set(0,28,-190);
controls.enableDamping=true;
controls.maxDistance=900;controls.minDistance=2.5;
controls.maxPolarAngle=Math.PI*.6;controls.update(); // permite olhar para cima a partir do chão
const modelStatus=document.querySelector('#model-status');
const count=document.querySelector('#live-count');
const clock=new THREE.Clock();
// Cidade desenhada em código (cidade.js), em metros reais.
const city=buildCity(scene,renderer,camera,{qualidade:QUALIDADE});
const npcs=iniciarBots(scene,(x,z)=>resolveCollision(x,z,city.colliders),city.limites);
const desfile=iniciarDesfile(scene,{
 mobile:/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)||matchMedia('(pointer:coarse)').matches,
 alto:QUALIDADE==='alto',param:new URLSearchParams(location.search).get('figurantes')
});
const selecionarMultidao=document.querySelector('#multidao-quantidade');
const avisoFigurantes=document.querySelector('#figuras-info');
function informarMultidao(){
 selecionarMultidao.value=String(desfile.count);
 avisoFigurantes.textContent='SIMULAÇÃO 3D · '+(desfile.count+npcs.count)+' figurantes virtuais · usuários reais: contador online';
}
selecionarMultidao.addEventListener('change',()=>{
 const valor=Number(selecionarMultidao.value);
 desfile.setQuantidade(valor);informarMultidao();
});
informarMultidao();
modelStatus.textContent='Esplanada em código · gráficos '+(QUALIDADE==='alto'?'altos':'leves');
const teloes=iniciarTeloes(city);iniciarFormulario();
const AVATAR_ESCALA=.84; // bonecos de 2,15 m → ~1,80 m na escala da cidade
function resize(){
 const width=canvas.clientWidth,height=canvas.clientHeight;
 if(!width||!height)return;
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
let socket=null,myId=null,entered=false,name='Visitante',room='5300108';
const live=document.querySelector('#status-dot'),status=document.querySelector('#status-label');
const peers=new Map();
let modoPvP=false;
const tags=new Map();
const makeTag=(text,color='#d9fff2')=>{const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#082634e8';g.fillRect(5,8,502,112);g.strokeStyle='#6ae5b1';g.strokeRect(5,8,502,112);g.fillStyle=color;g.textAlign='center';g.font='bold 34px system-ui';g.fillText(String(text).slice(0,38),256,78);const map=new THREE.CanvasTexture(c);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false}));sprite.scale.set(3.4,.85,1);return sprite};
function etiqueta(id,nome){let t=tags.get(id);if(t){scene.remove(t);t.material.map.dispose();t.material.dispose()}t=makeTag(nome);scene.add(t);tags.set(id,t)}
function balao(id,mensagem){const alvo=id===myId?player:peers.get(id);if(!alvo)return;let b=alvo.userData.balao;if(b){scene.remove(b);b.material.map.dispose();b.material.dispose()}b=makeTag(mensagem,'#ffeac2');b.scale.set(5.5,1.2,1);scene.add(b);alvo.userData.balao=b;alvo.userData.balaoAte=performance.now()+5000;}
// Visual do jogador: salvo só neste navegador.
function loadLook(){try{return sanitizeLook(JSON.parse(localStorage.getItem('agora-look')||'{}'))}catch{return sanitizeLook()}}
function saveLook(){try{localStorage.setItem('agora-look',JSON.stringify(myLook))}catch{}}
let myLook=loadLook();
const player=new THREE.Group();
scene.add(player);
dressAvatar(player,myLook);
player.scale.setScalar(AVATAR_ESCALA);
player.position.set(city.spawn.x,0,city.spawn.z);player.rotation.y=Math.PI;
player.visible=false;
let playerMoving=false,correndo=false;
function remoteAvatar(id,x,z,label,look) {
 if(peers.has(id))return peers.get(id);
 const mesh=new THREE.Group();
 dressAvatar(mesh,look);mesh.scale.setScalar(AVATAR_ESCALA);
 mesh.userData.name=label||'';mesh.userData.lastMove=0;
 mesh.position.set(x||0,0,z||-75);scene.add(mesh);
 peers.set(id,mesh);etiqueta(id,label||'Jogador');return mesh;
}

const cartazes=iniciarCartazes({scene,player,peers,send,meuId:()=>myId});
// Telão da tribuna: desenha o estado do debate num canvas.
const telaoCanvas=document.createElement('canvas');telaoCanvas.width=1024;telaoCanvas.height=384;
const telaoTexture=new THREE.CanvasTexture(telaoCanvas);telaoTexture.colorSpace=THREE.SRGBColorSpace;
let telaoKey='';
function drawTelao(st,segundos){
 const key=JSON.stringify([st?.fase,st?.orador,st?.a?.name,st?.b?.name,st?.a?.team,st?.b?.team,segundos,st?.vencedor]);
 if(key===telaoKey)return;telaoKey=key;
 const c=telaoCanvas.getContext('2d');
 const g=c.createLinearGradient(0,0,0,384);g.addColorStop(0,'#0c2533');g.addColorStop(1,'#071219');
 c.fillStyle=g;c.fillRect(0,0,1024,384);
 c.fillStyle='#53d6b1';c.font='700 34px Inter,system-ui,sans-serif';c.textAlign='center';
 c.fillText('TRIBUNA DA ESPLANADA',512,58);
 if(!st||!st.a){
  c.fillStyle='#e6f2f0';c.font='600 46px Inter,system-ui,sans-serif';c.fillText('Debate aberto · entre na fila',512,190);
  c.fillStyle='#8fb3bd';c.font='400 30px Inter,system-ui,sans-serif';c.fillText(st?.fila?.length?st.fila.length+' na fila':'Painel "Modo debate" ao lado',512,250);
 }else{
  for(const [lado,x] of [['a',256],['b',768]]){
   const p=st[lado],ativo=st.orador===lado;
   c.fillStyle=ativo?'#173f3b':'#0f1d26';c.fillRect(x-220,92,440,170);
   c.fillStyle=TEAM_COLORS[p.team]||'#888';c.fillRect(x-220,92,14,170);
   if(ativo){c.strokeStyle='#43d5a8';c.lineWidth=6;c.strokeRect(x-217,95,434,164)}
   c.fillStyle='#8fb3bd';c.font='600 24px Inter,system-ui,sans-serif';c.fillText('LADO '+lado.toUpperCase()+(ativo?' · FALANDO':''),x,135);
   c.fillStyle='#ffffff';c.font='700 50px Inter,system-ui,sans-serif';c.fillText(p.name.slice(0,16),x,205);
  }
  c.fillStyle='#ffffff';c.font='800 40px Inter,system-ui,sans-serif';c.fillText('x',512,195);
  let rodape=(FASES_TELAO[st.fase]||st.fase)+(segundos!=null?' · '+Math.floor(segundos/60)+':'+String(segundos%60).padStart(2,'0'):'');
  if(st.fase==='resultado'){const v=st.votos||{a:0,b:0};rodape=st.vencedor==='empate'?'Empate':'Venceu '+st[st.vencedor].name+(st.motivo==='wo'?' por W.O.':' · '+v.a+' x '+v.b)}
  c.fillStyle='#f4c20d';c.font='700 38px Inter,system-ui,sans-serif';c.fillText(rodape,512,335);
 }
 telaoTexture.needsUpdate=true;
}
const FASES_TELAO={abertura:'Abertura',replica:'Réplica',treplica:'Tréplica',votacao:'Votação da plateia',resultado:'Resultado'};
drawTelao(null,null);

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
 const telao=new THREE.Mesh(new THREE.BoxGeometry(10,4,.3),new THREE.MeshStandardMaterial({color:'#101820',roughness:.4}));
 telao.position.set(TRIBUNA.x,4.2,TRIBUNA.z-3.2);scene.add(telao);
 const tela=new THREE.Mesh(new THREE.PlaneGeometry(9.6,3.6),new THREE.MeshBasicMaterial({map:telaoTexture}));
 tela.position.set(TRIBUNA.x,4.2,TRIBUNA.z-3.04);scene.add(tela);
 for(const x of [-4.4,4.4]){const pe=new THREE.Mesh(new THREE.BoxGeometry(.25,2.4,.25),new THREE.MeshStandardMaterial({color:'#3a4048'}));pe.position.set(TRIBUNA.x+x,1.2,TRIBUNA.z-3.2);scene.add(pe)}
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
 socket=new WebSocket(scheme+'//'+location.host+'/api/ws');
 socket.onopen=()=>{
  live.classList.add('connected');status.textContent='Conectado';
  send({type:'join',room,name,look:myLook});
 };
 socket.onmessage=(event)=>{
  let data;try{data=JSON.parse(event.data)}catch{return}
  if(pvp.mensagem(data))return;
  if(cartazes.mensagem(data))return;
  if(data.type==='hello')myId=data.id;
  if(data.type==='joined'){
   entered=true;player.visible=true;seguirJogador(true);etiqueta(myId,name);
   document.body.classList.add('jogando');document.querySelector('#game-hud').hidden=false;
   document.querySelector('#pvp-toggle').checked=false;modoPvP=false;
   for(const mesh of peers.values())scene.remove(mesh);peers.clear();for(const tag of tags.values()){scene.remove(tag);tag.material.map.dispose();tag.material.dispose()}tags.clear();etiqueta(myId,name);
   for(const other of data.peers||[])remoteAvatar(other.id,other.position?.x,other.position?.z,other.name,other.look);
   log('Você entrou na praça. Participação gratuita e plural.');
   count.textContent=data.count+' online';
  }
  if(data.type==='presence')count.textContent=data.count+' online';
  if(data.type==='vitorias'){document.querySelector('#vitorias').textContent='Vitórias no jogo · Vermelho '+data.placar.vermelho+' × '+data.placar.amarelo+' Amarelo'}
  if(data.type==='grafite')mostrarGrafite(data.item);
  if(data.type==='graffitis'){for(const g of data.items||[])mostrarGrafite(g)}
  if(data.type==='chat'){log(data.text,data.name,data.time);balao(data.id,data.text)}
  if(data.type==='enter'&&data.id!==myId)remoteAvatar(data.id,data.position?.x,data.position?.z,data.name,data.look);
  if(data.type==='look'&&data.id!==myId){const p=peers.get(data.id);if(p)dressAvatar(p,data.look)}
  if(data.type==='debate')renderDebate(data.state);
  if(data.type==='teloes')teloes.atualizar(data.slots);
  if(data.type==='debate-fala')debateLog(data);
  if(data.type==='leave'){const p=peers.get(data.id);if(p){scene.remove(p);peers.delete(data.id)}const t=tags.get(data.id);if(t){scene.remove(t);t.material.map.dispose();t.material.dispose();tags.delete(data.id)}}
  if(data.type==='move'){
   const p=remoteAvatar(data.id,data.x,data.z,'');
   const dx=data.x-p.position.x,dz=data.z-p.position.z;
   if(dx||dz)p.rotation.y=Math.atan2(dx,dz);
   const agora=performance.now(),dtm=(agora-(p.userData.lastMove||agora))/1000;
   if(dtm>0&&dtm<1){const v=Math.hypot(data.x-(p.userData.target?.x??p.position.x),data.z-(p.userData.target?.z??p.position.z))/dtm;p.userData.ritmo=v>5?2.3:1.35}
   p.userData.target={x:data.x,z:data.z};p.userData.lastMove=agora;
  }
 };
 socket.onclose=()=>{
  entered=false;cartazes.reset();document.body.classList.remove('jogando');document.querySelector('#game-hud').hidden=true;renderDebate(null);pvp.reset();live.classList.remove('connected');status.textContent='Desconectado';count.textContent='0 online';
 };
 socket.onerror=()=>{status.textContent='Sem conexão'};
}
document.querySelector('#enter').addEventListener('click',()=>{
 name=(document.querySelector('#nickname').value||'Visitante').trim().slice(0,24)||'Visitante';
 // A acao parte do clique do usuario, permitindo Fullscreen API com fallback CSS.
 document.querySelector('.world-wrap').requestFullscreen?.().catch(()=>{});
 room=document.querySelector('#city').value;
 const sel=document.querySelector('#city');document.querySelector('#room-label').textContent=sel.selectedOptions[0].textContent.split('·')[0].trim();
 connect();
});
// ---------- Criador de personagem ----------
const creator={
 base:document.querySelector('#base'),cards:document.querySelector('#base-cards'),
 team:document.querySelector('#team'),outfit:document.querySelector('#outfit'),
 pele:document.querySelector('#cor-pele'),cabelo:document.querySelector('#cor-cabelo'),
 calca:document.querySelector('#cor-calca'),terno:document.querySelector('#cor-terno'),
 acessorio:document.querySelector('#acessorio'),cabeloEstilo:document.querySelector('#cabelo-estilo'),file:document.querySelector('#import-model'),
 remove:document.querySelector('#remove-model'),info:document.querySelector('#import-info'),
 preview:document.querySelector('#avatar-preview')
};
const LOOK_KEYS=['base','team','outfit','pele','cabelo','calca','terno','acessorio','cabeloEstilo'];
function fillCreator(){for(const k of LOOK_KEYS)creator[k].value=myLook[k];paintCards()}
// Cartões de corpo base, com foto quando o arquivo existe em /assets/bases.
function paintCards(){
 creator.cards.replaceChildren(...BASES.map(b=>{
  const btn=document.createElement('button');btn.type='button';btn.className='base-card';btn.setAttribute('role','radio');
  btn.setAttribute('aria-checked',String(myLook.base===b.id));
  const thumb=document.createElement('span');thumb.className='thumb';
  if(b.id==='boneco')thumb.textContent='🧍';
  else{
   const key=b.id+'-'+myLook.team,img=new Image();img.alt='';img.src='/assets/bases/'+key+'.png';
   img.onerror=()=>{if(THUMB_CDN[key]&&img.src!==THUMB_CDN[key]){img.src=THUMB_CDN[key]}else{img.remove();thumb.textContent='👤'}};
   thumb.append(img);
  }
  btn.append(thumb,document.createTextNode(b.nome));
  btn.addEventListener('click',()=>{creator.base.value=b.id;readCreator()});
  return btn;
 }));
}
function readCreator(){
 limparRostoLocal(player);limparRostoLocal(previewAvatar);

 myLook=sanitizeLook(Object.fromEntries(LOOK_KEYS.map(k=>[k,creator[k].value])));
 paintCards();
 setTimeout(baseNotice,1500);
 dressAvatar(player,myLook);dressAvatar(previewAvatar,myLook);saveLook();
 if(entered)send({type:'look',look:myLook});
}
 // Prévia giratória do personagem no painel.
const previewRenderer=new THREE.WebGLRenderer({canvas:creator.preview,antialias:true,alpha:true});
previewRenderer.outputColorSpace=THREE.SRGBColorSpace;
const previewScene=new THREE.Scene();
previewScene.add(new THREE.HemisphereLight('#ffffff','#556b4f',2.4));
const previewSun=new THREE.DirectionalLight('#fff3df',2);previewSun.position.set(2,4,3);previewScene.add(previewSun);
const previewCam=new THREE.PerspectiveCamera(30,1,.1,50);previewCam.position.set(0,1.5,6.2);previewCam.lookAt(0,1.15,0);
 const previewAvatar=new THREE.Group();previewScene.add(previewAvatar);dressAvatar(previewAvatar,myLook);
 const photoStatus=document.querySelector('#face-photo-status');
 const photoCards=document.querySelector('#photo-profiles');
 for(const profile of PHOTO_PROFILES){const btn=document.createElement('button');btn.type='button';btn.className='photo-profile';btn.textContent=profile.nome+' · '+profile.descricao;btn.addEventListener('click',()=>{myLook=sanitizeLook({...profile.look});dressAvatar(player,myLook);dressAvatar(previewAvatar,myLook);limparRostoLocal(player);limparRostoLocal(previewAvatar);saveLook();fillCreator();if(entered)send({type:'look',look:myLook});photoStatus.textContent=profile.nome+' selecionado. Você pode importar uma foto para o rosto.';});photoCards.append(btn)}
 document.querySelector('#face-photo').addEventListener('change',async(e)=>{const file=e.target.files[0];if(!file)return;try{await aplicarRostoLocal(player,file);await aplicarRostoLocal(previewAvatar,file);photoStatus.textContent='Foto aplicada localmente. Outros jogadores verão o boneco personalizado sem a foto.'}catch(err){photoStatus.textContent=err.message}finally{e.target.value=''}});
 document.querySelector('#clear-face-photo').addEventListener('click',()=>{limparRostoLocal(player);limparRostoLocal(previewAvatar);photoStatus.textContent='Rosto local removido.'});
const floor=new THREE.Mesh(new THREE.CircleGeometry(.9,32),new THREE.MeshStandardMaterial({color:'#1e403e'}));floor.rotation.x=-Math.PI/2;previewScene.add(floor);
function renderPreview(t){
 const w=creator.preview.clientWidth,h=creator.preview.clientHeight;
 if(!w||!h)return;
 if(creator.preview.width!==Math.round(w*1.5)){previewRenderer.setPixelRatio(1.5);previewRenderer.setSize(w,h,false);previewCam.aspect=w/h;previewCam.updateProjectionMatrix()}
 previewAvatar.rotation.y=t*.6;
 animateAvatar(previewAvatar,previewWalking,t);
 updateAvatarMixers(previewAvatar,1/60);
 previewRenderer.render(previewScene,previewCam);
}
let previewWalking=false;
document.querySelector('#preview-walk').addEventListener('click',e=>{previewWalking=!previewWalking;e.currentTarget.textContent=previewWalking?'Parar':'Ver andando'});
fillCreator();
for(const k of LOOK_KEYS.slice(1))creator[k].addEventListener('input',readCreator);
function baseNotice(){
 const key=myLook.base;
 if(myLook.base!=='boneco'&&baseStatus.get(key)==='faltando')creator.info.textContent='Não consegui carregar o modelo "'+key+'" (nem local nem do Higgsfield). Rode scripts/baixar-modelos.sh; até lá aparece o boneco.';
}
creator.file.addEventListener('change',async()=>{
 const file=creator.file.files[0];if(!file)return;
 creator.info.textContent='Carregando '+file.name+'…';
 try{
  const [r]=await Promise.all([importModel(player,file),importModel(previewAvatar,file)]);
  creator.info.textContent='Modelo importado: '+r.nome+(r.animacoes.length?' · animações: '+r.animacoes.slice(0,4).join(', '):' · sem animações (vai pular ao andar)')+'. Só você vê este modelo; os outros veem seu boneco personalizado.';
  creator.remove.hidden=false;
 }catch(err){creator.info.textContent='Não foi possível importar: '+(err.message||err)}
 creator.file.value='';
});
creator.remove.addEventListener('click',()=>{removeImported(player);removeImported(previewAvatar);creator.remove.hidden=true;creator.info.textContent='Modelo removido. Voltou ao boneco personalizado.'});

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
 if(!st||!st.terminaEm||st.fase==='aguardando'){dbg.timer.textContent='vs';drawTelao(st,null);return}
 const s=Math.max(0,Math.ceil((st.terminaEm-Date.now())/1000));
 drawTelao(st,s);
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
window.addEventListener('keydown',e=>{if(e.key==='Shift')pressed.add('shift')});
window.addEventListener('blur',()=>pressed.clear());
// Modo PvP: itens, veículos e combate (pvp.js). O servidor valida tudo.
const pvp=iniciarPvP({scene,camera,renderer,controls,canvas,city,player,peers,send,colisao:resolveCollision,
 meuId:()=>myId,meuNome:()=>name,teclas:()=>pressed,wrap:document.querySelector('.world-wrap'),aoTeleporte:()=>seguirJogador(false)});
for(const [id,key] of [['up','w'],['down','s'],['left','a'],['right','d']]){
 const button=document.querySelector('#'+id);
 for(const eventName of ['pointerdown','pointerup','pointercancel','pointerleave']){
  button.addEventListener(eventName,e=>{e.preventDefault();if(eventName==='pointerdown')pressed.add(key);else pressed.delete(key)})
 }
}
let netTick=0;
const fwd=new THREE.Vector3(),right=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),lastPlayer=new THREE.Vector3();
// Câmera em terceira pessoa: acompanha o jogador mantendo o ângulo escolhido com o mouse.
function seguirJogador(snap){
 const alvo=pvp.alvoCamera()||new THREE.Vector3(player.position.x,player.position.y+1.55,player.position.z);
 if(snap){controls.target.copy(alvo);camera.position.set(alvo.x+1.1,alvo.y+2.35,alvo.z+6.7);lastPlayer.copy(alvo);controls.update();return}
 const d=alvo.clone().sub(lastPlayer);camera.position.add(d);controls.target.add(d);lastPlayer.copy(alvo);
}
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05);
 if(entered&&!pvp.dirigindo()&&!pvp.morto()){
  // Movimento relativo à câmera; Shift corre. Colisão simples com prédios e espelhos d'água.
  let f=0,r=0;
  if(pressed.has('w')||pressed.has('arrowup'))f+=1;
  if(pressed.has('s')||pressed.has('arrowdown'))f-=1;
  if(pressed.has('a')||pressed.has('arrowleft'))r-=1;
  if(pressed.has('d')||pressed.has('arrowright'))r+=1;
  playerMoving=!!(f||r);
  if(playerMoving){
   camera.getWorldDirection(fwd);fwd.y=0;fwd.normalize();right.crossVectors(fwd,UP);
   const dir=new THREE.Vector3().addScaledVector(fwd,f).addScaledVector(right,r).normalize();
   correndo=pressed.has('shift');
   const vel=(correndo?7.5:3.2)*dt;
   let nx=player.position.x+dir.x*vel,nz=player.position.z+dir.z*vel;
   [nx,nz]=resolveCollision(nx,nz,city.colliders);
   nx=THREE.MathUtils.clamp(nx,city.limites.xMin,city.limites.xMax);
   nz=THREE.MathUtils.clamp(nz,city.limites.zMin,city.limites.zMax);
   player.rotation.y=Math.atan2(dir.x,dir.z);
   player.position.set(nx,0,nz);
   netTick+=dt;if(netTick>.13){send({type:'move',x:nx,z:nz});netTick=0}
  }
  seguirJogador(false);
 } else {playerMoving=false;if(entered)seguirJogador(false)}
 const t=clock.elapsedTime,now=performance.now();
 for(const [id,tag] of tags){const avatar=id===myId?player:peers.get(id);if(avatar){tag.position.set(avatar.position.x,avatar.position.y+2.6,avatar.position.z)}}
 for(const avatar of [player,...peers.values()]){const b=avatar.userData.balao;if(!b)continue;if(now>avatar.userData.balaoAte){scene.remove(b);b.material.map.dispose();b.material.dispose();avatar.userData.balao=null}else b.position.set(avatar.position.x,avatar.position.y+3.7,avatar.position.z)}
 npcs.update(dt,t);
 if(desfile.update(dt,Date.now()/1000,camera))informarMultidao();
 cartazes.update();
 animateAvatar(player,entered&&playerMoving,t,correndo?2.3:1.35);
 updateAvatarMixers(player,dt);
 for(const p of peers.values()){
  const tg=p.userData.target;
  if(tg){p.position.x+=(tg.x-p.position.x)*Math.min(1,dt*10);p.position.z+=(tg.z-p.position.z)*Math.min(1,dt*10)}
  animateAvatar(p,now-p.userData.lastMove<260,t,p.userData.ritmo||1.35);updateAvatarMixers(p,dt);
 }
 pvp.update(dt,t);
 renderPreview(t);
 controls.update();
 if(camera.position.y<.45)camera.position.y=.45; // câmera nunca entra no chão
 city.update(dt,t,controls.target,camera.position.distanceTo(controls.target));
 renderer.render(scene,camera);
}

const graffitis=new Map();
function mostrarGrafite(g){
 if(!g||graffitis.has(g.id))return;
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.font='bold 36px system-ui';ctx.textAlign='center';ctx.fillText(String(g.text).slice(0,48),256,60);
 const tex=new THREE.CanvasTexture(c);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.8,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 mesh.position.set(g.x,1.35,g.z);scene.add(mesh);graffitis.set(g.id,mesh);
}
document.querySelector('#jogo-chat').addEventListener('submit',e=>{e.preventDefault();const i=e.currentTarget.querySelector('input');const text=i.value.trim();if(entered&&text)send({type:'chat',text});i.value=''});
document.querySelector('#pvp-toggle').addEventListener('change',e=>{
 modoPvP=e.target.checked;
 send({type:'modo-pvp',ativo:modoPvP});
 document.querySelector('#pvp-label').textContent=modoPvP?'PvP ligado — combates liberados':'Livre — sem dano entre jogadores';
});
document.querySelector('#grafite-btn').addEventListener('click',()=>{
 if(!entered)return;
 const v=prompt('Sua arte virtual (máximo 48 caracteres, sem ofensas):');
 if(v?.trim())send({type:'grafite',text:v.trim().slice(0,48),x:player.position.x,z:player.position.z});
});
document.querySelector('#sair-jogo').addEventListener('click',()=>{
 socket?.close();entered=false;document.body.classList.remove('jogando');document.querySelector('#game-hud').hidden=true;
 if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
});
document.querySelector('#tela-cheia').addEventListener('click',()=>{
 document.querySelector('.world-wrap').requestFullscreen?.().catch(()=>{});
});

resize();animate();
