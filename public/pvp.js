import * as THREE from 'three';
import {criarEfeitos} from './efeitos.js';
import {Veiculo,TIPOS,ARMAS_VEICULO,geoMissil,preCarregar} from './veiculos.js';
import {ITENS,Rastro,animarArco,soltarArco,criarFlecha,animarBomba} from './itens.js';
import {poseAvatar,maoDoAvatar,TEAM_COLORS} from './avatar.js';
import {deveExibirPiloto,poseParaVeiculo,progressoDeEmbarque,ritmoDeVeiculo} from './montaria.mjs';
import {som,motorVeiculo,alternarSom,somLigado} from './som.js';

// Modo PvP da praça: itens no gramado, veículos, combate entre os times vermelho e amarelo.
// O servidor decide vida, dano e placar. Armas só atingem jogadores e veículos: os prédios
// (Congresso, Planalto, STF, ministérios) não sofrem dano, os projéteis só explodem neles.

const NOMES_ARMA={espada:'espada',arco:'flecha',bomba:'bomba',metralhadora:'metralhadora','missil-heli':'míssil','missil-caca':'míssil',mordida:'mordida de T-rex',atropelar:'atropelamento'};
const ICONE={espada:'🗡️',arco:'🏹',bomba:'💣',carro:'🏎️',moto:'🏍️',helicoptero:'🚁',caca:'✈️',trex:'🦖','caminhao-lula':'🚚','caminhao-bolsonaro':'🚚'};
const COR_ITEM={espada:'#7cc4ff',arco:'#7ee08a',bomba:'#ff9c4a'};
const DICAS_VEIC={'caminhao-lula':'W/S acelera ou freia · A/D direção · Shift reforço · E sai','caminhao-bolsonaro':'W/S acelera ou freia · A/D direção · Shift reforço · E sai',carro:'W/S acelera e freia · A/D vira · Shift turbo · H buzina · atropela inimigos',moto:'W/S acelera e freia · A/D vira · Shift turbo · H buzina',
 helicoptero:'Espaço/C sobe e desce · W/S frente/trás · A/D gira · Clique/F metralhadora · G míssil',caca:'W/S potência · A/D inclina · Espaço/C sobe e desce · Clique/F míssil (trava no alvo da mira)',
 trex:'W anda · Shift corre · A/D vira · Clique/F mordida · R rugido'};

export function iniciarPvP(o){
 const {scene,camera,renderer,controls,canvas,city,player,peers,send,meuId,meuNome,colisao,teclas,wrap}=o;
 const efeitos=criarEfeitos(scene,camera,renderer);
 preCarregar();
 const mundo={colliders:city.colliders,limites:city.limites,colisao};
 const est={jogadores:new Map(),veiculos:new Map(),pickups:new Map(),placar:{vermelho:0,amarelo:0},vitoria:25,ativo:false};
 const embarques=new Map(); // entrada independente por jogador, sem modificar a cidade
 const proj=[]; // projéteis em voo
 const meusTiros=new Map();let ref=0;
 const eu=()=>est.jogadores.get(meuId());
 const avatarDe=(id)=>id===meuId()?player:peers.get(id);
 const nomeDe=(id)=>id===meuId()?'Você':(peers.get(id)?.userData.name||'Jogador');
 const timeDe=(id)=>est.jogadores.get(id)?.team;
 const inimigo=(id)=>id!==meuId()&&timeDe(id)&&timeDe(id)!==eu()?.team;

 // ---------- HUD ----------
 const hud=document.createElement('div');hud.id='pvp-hud';hud.hidden=true;
 hud.innerHTML=`<div class="pvp-placar"><span class="vm">0</span><em>×</em><span class="am">0</span><small>PvP · até <b class="meta">25</b></small></div>
 <div class="pvp-feed" aria-live="polite"></div>
 <div class="pvp-mira" hidden><i></i></div>
 <div class="pvp-aviso" hidden></div>
 <div class="pvp-base"><div class="pvp-vida"><span>Vida</span><div class="barra"><i></i></div><b>100</b></div>
  <div class="pvp-slot" hidden></div></div>
 <div class="pvp-morte" hidden><b>Você foi derrubado</b><span></span></div>
 <div class="pvp-vitoria" hidden></div>
 <div class="pvp-dano"></div>
 <div class="pvp-acoes"><button data-k="e" type="button" aria-label="Pegar ou entrar">E</button><button data-k="f" type="button" aria-label="Usar item">⚔</button><button data-k=" " type="button" aria-label="Subir">▲</button><button data-k="c" type="button" aria-label="Descer">▼</button></div>
 <button class="pvp-som" type="button" aria-label="Som">${somLigado()?'🔊':'🔇'}</button>`;
 wrap.append(hud);
 const score=hud.querySelector('.pvp-placar');
 const $=s=>hud.querySelector(s);
 $('.pvp-som').addEventListener('click',e=>{e.currentTarget.textContent=alternarSom()?'🔊':'🔇'});
 function feed(html){const d=document.createElement('div');d.innerHTML=html;$('.pvp-feed').prepend(d);setTimeout(()=>d.remove(),7000);while($('.pvp-feed').children.length>5)$('.pvp-feed').lastChild.remove()}
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const tag=(id)=>`<b style="color:${TEAM_COLORS[timeDe(id)]||'#fff'}">${esc(nomeDe(id))}</b>`;
 function pintarPlacar(){score.querySelector('.vm').textContent=est.placar.vermelho;score.querySelector('.am').textContent=est.placar.amarelo;score.querySelector('.meta').textContent=est.vitoria}
 function pintarVida(){const j=eu();if(!j)return;const v=Math.max(0,j.vida);$('.pvp-vida i').style.width=v+'%';$('.pvp-vida i').style.background=v>50?'#43d5a8':v>25?'#f4c20d':'#e05a4f';$('.pvp-vida b').textContent=v}
 function pintarSlot(){
  const j=eu(),s=$('.pvp-slot');if(!j){s.hidden=true;return}
  if(j.veiculo){const v=est.veiculos.get(j.veiculo);s.hidden=false;s.innerHTML=`<b>${ICONE[v.tipo]} ${TIPOS[v.tipo].nome}</b><div class="barra"><i style="width:${Math.round(100*v.vida/(v.max||1))}%"></i></div><small>${DICAS_VEIC[v.tipo]} · E sai</small>`;return}
  if(j.item){s.hidden=false;s.innerHTML=`<b>${ICONE[j.item]} ${ITENS[j.item].nome}</b><small>${ITENS[j.item].dica} · Q larga</small>`;return}
  s.hidden=true;
 }
 let danoT=0;

 // ---------- Cenário do PvP: bases dos times, zona segura e itens no chão ----------
 const extras=new THREE.Group();scene.add(extras);
 function base(team,b){
  const g=new THREE.Group();g.position.set(b.x,0,b.z);extras.add(g);
  const anel=new THREE.Mesh(new THREE.RingGeometry(7.4,8,64),new THREE.MeshBasicMaterial({color:TEAM_COLORS[team],transparent:true,opacity:.75,depthWrite:false}));anel.rotation.x=-Math.PI/2;anel.position.y=.06;g.add(anel);
  const chao=new THREE.Mesh(new THREE.CircleGeometry(7.4,64),new THREE.MeshBasicMaterial({color:TEAM_COLORS[team],transparent:true,opacity:.12,depthWrite:false}));chao.rotation.x=-Math.PI/2;chao.position.y=.05;g.add(chao);
  const mastro=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,9,10),new THREE.MeshStandardMaterial({color:'#d8dade',metalness:.8,roughness:.3}));mastro.position.y=4.5;mastro.castShadow=true;g.add(mastro);
  // bandeira lisa, só a cor do time (sem sigla ou símbolo)
  const bg=new THREE.PlaneGeometry(3.2,2,16,4);bg.translate(1.6,0,0);
  const band=new THREE.Mesh(bg,new THREE.MeshStandardMaterial({color:TEAM_COLORS[team],side:THREE.DoubleSide,roughness:.8}));band.position.y=7.8;band.castShadow=true;g.add(band);
  band.userData.base=bg.attributes.position.array.slice();g.userData.band=band;return g;
 }
 const bandeiras=[];
 function zona(z){const m=new THREE.Mesh(new THREE.RingGeometry(z.r-.35,z.r,72),new THREE.MeshBasicMaterial({color:'#53d6b1',transparent:true,opacity:.45,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(z.x,.07,z.z);extras.add(m)}
 function criarPickup(p){
  const g=new THREE.Group();g.position.set(p.x,0,p.z);extras.add(g);
  const cor=COR_ITEM[p.item];
  const disco=new THREE.Mesh(new THREE.CircleGeometry(1.3,40),new THREE.MeshBasicMaterial({color:cor,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));disco.rotation.x=-Math.PI/2;disco.position.y=.06;g.add(disco);
  const feixe=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,14,24,1,true),new THREE.ShaderMaterial({uniforms:{cor:{value:new THREE.Color(cor)}},
   vertexShader:'varying float vY;void main(){vY=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 cor;varying float vY;void main(){gl_FragColor=vec4(cor,(1.-vY)*(1.-vY)*.16);}',transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  feixe.position.y=7;g.add(feixe);
  const item=ITENS[p.item].criar();item.scale.setScalar(p.item==='bomba'?2.6:1.5);item.position.y=1.3;g.add(item);
  if(p.item==='arco')item.rotation.z=.3;if(p.item==='espada')item.rotation.z=.25;
  g.userData={item,dados:p};g.visible=p.disponivel;
  est.pickups.set(p.id,g);
 }

 // ---------- Itens nas mãos ----------
 const naMao=new Map(); // id do jogador → {item, mesh, rastro}
 function equipar(id,item){
  const atual=naMao.get(id);
  if(atual?.item===item)return atual;
  if(atual){scene.remove(atual.mesh);atual.rastro?.remover();naMao.delete(id)}
  const av=avatarDe(id);
  if(!item){if(av)poseAvatar(av,null);return null}
  const mesh=ITENS[item].criar();scene.add(mesh);
  const e={item,mesh,rastro:item==='espada'?new Rastro(scene):null,acao:null,k:0,puxada:0};
  naMao.set(id,e);return e;
 }
 const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_m=new THREE.Matrix4(),_up=new THREE.Vector3(0,1,0);
 function posicionarItem(id,e){
  const av=avatarDe(id);if(!av||!av.visible){e.mesh.visible=false;return}
  e.mesh.visible=true;
  const esc=av.scale.x;
  const mao=maoDoAvatar(av,e.item==='arco'?'E':'D');
  const fr=new THREE.Vector3(Math.sin(av.rotation.y),0,Math.cos(av.rotation.y));
  if(mao){mao.mao.getWorldPosition(_a);mao.antebraco.getWorldPosition(_b)}
  else{_a.copy(av.position).add(new THREE.Vector3(0,1.0*esc,0)).addScaledVector(fr,.3);_b.copy(_a).add(new THREE.Vector3(0,.3,0))}
  const dir=_a.clone().sub(_b).normalize(); // antebraço → mão
  e.mesh.position.copy(_a);
  if(e.item==='espada'){
   // lâmina segue o antebraço, inclinada para cima à frente
   const lam=dir.clone().multiplyScalar(.55).add(fr.clone().multiplyScalar(.5)).add(new THREE.Vector3(0,.35,0)).normalize();
   if(e.acao==='golpe')lam.copy(dir).lerp(fr,.35).normalize();
   e.mesh.quaternion.setFromUnitVectors(_up,lam);
   e.mesh.scale.setScalar(esc*1.15);
   const tipW=e.mesh.localToWorld(e.mesh.userData.ponta.clone()),baseW=e.mesh.localToWorld(e.mesh.userData.base.clone());
   e.rastro.empurrar(baseW,tipW,e.acao==='golpe'&&e.k>.25&&e.k<.7);
  } else if(e.item==='arco'){
   // arco em pé, com o lado da corda voltado para o jogador e a flecha apontando para a mira
   const alvo=(id===meuId()&&e.acao==='mirar')?mira.dir.clone():fr.clone();
   const z=alvo.clone().negate();const x=new THREE.Vector3().crossVectors(_up,z).normalize();const y=new THREE.Vector3().crossVectors(z,x);
   _m.makeBasis(x,y,z);e.mesh.quaternion.setFromRotationMatrix(_m);e.mesh.rotateZ(-.12);
   e.mesh.scale.setScalar(esc*1.25);
   animarArco(e.mesh,e.acao==='mirar'?e.puxada:0,dtAtual);
  } else if(e.item==='bomba'){
   e.mesh.scale.setScalar(esc*1.1);e.mesh.position.addScaledVector(dir,.08*esc);
   animarBomba(e.mesh,0,efeitos,e.acao==='arremesso');
  }
 }

 // ---------- Veículos ----------
 function veiculoRede(d){
  let v=est.veiculos.get(d.id);
  if(!v){v=new Veiculo(scene,d,efeitos);est.veiculos.set(d.id,v)}
  v.rede(d);return v;
 }

 // ---------- Mira e acertos ----------
 const mira={dir:new THREE.Vector3(0,0,1),ponto:new THREE.Vector3(),bloqueio:false};
 const ray=new THREE.Ray();
 const colBounds=city.colliders.filter(c=>(c.h||25)>=.5);
 function centroJogador(id){const av=avatarDe(id);if(!av)return null;const j=est.jogadores.get(id);
  if(j?.veiculo){const v=est.veiculos.get(j.veiculo);if(v)return v.raiz.position.clone().add(new THREE.Vector3(0,TIPOS[v.tipo].comp*.12,0))}
  return av.position.clone().add(new THREE.Vector3(0,.9,0))}
 // segmento a→b contra esferas de jogadores/veículos inimigos, chão e prédios (prédios só param o projétil)
 function testar(a,b,{ignorar=null,raioExtra=0}={}){
  const d=b.clone().sub(a),L=d.length();if(L<1e-6)return null;d.divideScalar(L);
  let melhor=null;const ok=(t,obj)=>{if(t>=0&&t<=L&&(!melhor||t<melhor.t))melhor={t,...obj}};
  const esfera=(c,r)=>{const oc=a.clone().sub(c);const bb=oc.dot(d),cc=oc.lengthSq()-r*r,h=bb*bb-cc;if(h<0)return -1;const t=-bb-Math.sqrt(h);return t<0&&cc<0?0:t};
  for(const [id,j] of est.jogadores){
   if(!j.vivo||id===ignorar||!inimigo(id))continue;
   if(j.veiculo)continue; // quem está dentro é atingido pelo veículo
   const av=avatarDe(id);if(!av)continue;
   for(const y of [.55,1.25]){const t=esfera(av.position.clone().add(new THREE.Vector3(0,y,0)),.48+raioExtra);if(t>=0)ok(t,{tipo:'jogador',id})}
  }
  for(const [id,v] of est.veiculos){
   if(!v.ativo||v.local)continue;
   if(v.motorista&&!inimigo(v.motorista))continue;
   const c=v.raiz.position.clone().add(new THREE.Vector3(0,TIPOS[v.tipo].comp*.1,0));
   const t=esfera(c,TIPOS[v.tipo].raio+raioExtra);if(t>=0)ok(t,{tipo:'veiculo',id})
  }
  if(d.y<0){const t=(.02-a.y)/d.y;if(t>=0)ok(t,{tipo:'chao'})}
  for(const c of colBounds){
   if(Math.max(a.x,b.x)<c.x0||Math.min(a.x,b.x)>c.x1||Math.max(a.z,b.z)<c.z0||Math.min(a.z,b.z)>c.z1)continue;
   // entrada na caixa (slab)
   let t0=0,t1=L;
   for(const [o,dd,mn,mx] of [[a.x,d.x,c.x0,c.x1],[a.y,d.y,0,c.h||25],[a.z,d.z,c.z0,c.z1]]){
    if(Math.abs(dd)<1e-9){if(o<mn||o>mx){t0=1e9;break}continue}
    let ta=(mn-o)/dd,tb=(mx-o)/dd;if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)break;
   }
   if(t0<=t1&&t0<1e8)ok(t0,{tipo:'predio'});
  }
  if(melhor)melhor.ponto=a.clone().addScaledVector(d,melhor.t);
  return melhor;
 }
 function atualizarMira(){
  camera.getWorldDirection(mira.dir);
  const a=camera.position.clone().addScaledVector(mira.dir,Math.max(2,camera.position.distanceTo(controls.target)));
  const h=testar(a,a.clone().addScaledVector(mira.dir,900));
  mira.ponto.copy(h?h.ponto:a.clone().addScaledVector(mira.dir,900));mira.alvo=h&&(h.tipo==='jogador'||h.tipo==='veiculo')?h:null;
 }
 function enviarDisparo(arma,o,d,extra={}){
  const r=++ref;const t={ref:r,tiro:null,pendente:null,arma};meusTiros.set(r,t);
  send({type:'pvp-disparo',arma,ref:r,o:{x:+o.x.toFixed(2),y:+o.y.toFixed(2),z:+o.z.toFixed(2)},d:{x:+d.x.toFixed(3),y:+d.y.toFixed(3),z:+d.z.toFixed(3)},...extra});
  setTimeout(()=>meusTiros.delete(r),13000);return t;
 }
 function informarAcerto(t,alvo){
  if(!t)return;const msg={type:'pvp-acerto',...alvo};
  if(t.tiro){send({...msg,tiro:t.tiro})}else t.pendente=msg;
 }
 const pt=(v)=>({x:+v.x.toFixed(2),y:+v.y.toFixed(2),z:+v.z.toFixed(2)});

 // ---------- Projéteis ----------
 const missilBase=geoMissil();
 function lancarProjetil(tipo,origem,vel,{dono,tiro,alvo=null}){
  let mesh;
  if(tipo==='flecha')mesh=criarFlecha();
  else if(tipo==='bomba')mesh=ITENS.bomba.criar();
  else if(tipo==='missil'){mesh=missilBase.clone();mesh.add(new THREE.PointLight('#ffb070',8,25,2))}
  else if(tipo==='bala'){mesh=new THREE.Object3D()}
  mesh.position.copy(origem);scene.add(mesh);
  if(tipo==='bomba')mesh.scale.setScalar(1.1);
  const p={tipo,mesh,pos:origem.clone(),vel:vel.clone(),dono,tiro,alvo,vida:tipo==='bomba'?1.7:(tipo==='flecha'?6:6),t:0,giro:new THREE.Vector3(Math.random()*8,Math.random()*8,0)};
  proj.push(p);return p;
 }
 function explodir(p,ponto){
  const raio=p.tipo==='bomba'?7:(p.arma==='missil-caca'?8:6);
  if(p.dono!==meuId())return; // explosões dos outros chegam pelo servidor
  efeitos.explosao(ponto.x,Math.max(.2,ponto.y),ponto.z,raio);som.explosao(camera.position.distanceTo(ponto));
  informarAcerto(p.tiro,{ponto:pt(ponto)});
 }
 function atualizarProjeteis(dt){
  for(let i=proj.length-1;i>=0;i--){
   const p=proj[i];p.t+=dt;p.vida-=dt;const antes=p.pos.clone();
   if(p.tipo==='missil'){
    // guiado: vira em direção ao alvo travado
    if(p.alvo){const c=p.alvo.tipo==='jogador'?centroJogador(p.alvo.id):est.veiculos.get(p.alvo.id)?.raiz.position.clone().add(new THREE.Vector3(0,2,0));
     if(c){const des=c.sub(p.pos).normalize(),v=p.vel.length(),cur=p.vel.clone().normalize();const ang=cur.angleTo(des),max=2.4*dt;cur.lerp(des,Math.min(1,max/Math.max(ang,1e-4))).normalize();p.vel.copy(cur.multiplyScalar(v))}}
    p.vel.setLength(Math.min(p.vel.length()+90*dt,p.vmax||150));
    efeitos.fumacaRastro(p.pos.x-p.vel.x*.012,p.pos.y-p.vel.y*.012,p.pos.z-p.vel.z*.012,1);
   } else if(p.tipo!=='bala')p.vel.y-=9.8*dt;
   p.pos.addScaledVector(p.vel,dt);
   const local=p.dono===meuId();
   const h=testar(antes,p.pos,{ignorar:p.dono,raioExtra:p.tipo==='bomba'?.2:0});
   if(p.tipo==='bomba'){
    p.mesh.rotation.x+=p.giro.x*dt;p.mesh.rotation.y+=p.giro.y*dt;animarBomba(p.mesh,p.t,efeitos,true);
    if(h&&(h.tipo==='chao'||h.tipo==='predio')&&p.vida>0){
     p.pos.copy(h.ponto);if(h.tipo==='chao'){p.pos.y=.18;p.vel.y=Math.abs(p.vel.y)*.35;p.vel.x*=.6;p.vel.z*=.6}else{p.vel.multiplyScalar(-.35)}p.giro.multiplyScalar(.6);
    } else if(h&&(h.tipo==='jogador'||h.tipo==='veiculo'))p.vida=0;
    if(p.vida<=0){explodir(p,p.pos);remover(i);continue}
   } else if(h){
    if(p.tipo==='missil'){explodir(p,h.ponto);remover(i);continue}
    if(p.tipo==='flecha'){
     if(h.tipo==='jogador'||h.tipo==='veiculo'){efeitos.impacto(h.ponto.x,h.ponto.y,h.ponto.z,[1,.9,.7]);if(local){informarAcerto(p.tiro,h.tipo==='jogador'?{alvo:h.id}:{alvoVeiculo:h.id});som.acerto()}remover(i);continue}
     // crava no chão ou na parede e some depois
     p.mesh.position.copy(h.ponto).addScaledVector(p.vel.clone().normalize(),-.3);efeitos.impacto(h.ponto.x,h.ponto.y,h.ponto.z,[.8,.7,.5]);
     p.tipo='cravada';p.vida=8;p.vel.set(0,0,0);continue;
    }
   }
   if(p.tipo==='cravada'){if(p.vida<=0)remover(i);continue}
   if(p.vida<=0){if(p.tipo==='missil')explodir(p,p.pos);remover(i);continue}
   p.mesh.position.copy(p.pos);
   if(p.tipo==='flecha'||p.tipo==='missil')p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),p.vel.clone().normalize());
  }
 }
 function remover(i){const p=proj[i];scene.remove(p.mesh);proj.splice(i,1)}

 // ---------- Ações do jogador local ----------
 let dtAtual=1/60;
 const local={acao:null,k:0,dur:0,puxando:false,puxada:0,segura:false,recarga:{},atropelos:new Map(),ultimoEnvio:0,giroMissil:0};
 function usarItem(inicio){
  const j=eu();if(!j||!j.vivo)return;
  if(j.veiculo){armaVeiculo(inicio,'principal');return}
  const e=naMao.get(meuId());if(!j.item||!e)return;
  const agora=performance.now();
  if(j.item==='espada'&&inicio){
   if(local.acao)return;local.acao='golpe';local.k=0;local.dur=.5;local.acertou=false;virarParaMira();som.espada();send({type:'pvp-golpe-visual'});
  }
  if(j.item==='arco'){
   if(inicio&&!local.puxando&&!(agora<(local.recarga.arco||0))){local.puxando=true;local.puxada=0;virarParaMira()}
   if(!inicio&&local.puxando){
    local.puxando=false;const forca=Math.max(.3,local.puxada);
    if(local.puxada>.15){
     local.recarga.arco=agora+850;
     const o=e.mesh.localToWorld(new THREE.Vector3(0,0,-.2));
     const dir=mira.ponto.clone().sub(o).normalize();
     const vel=dir.clone().multiplyScalar(30+forca*45);
     const t=enviarDisparo('arco',o,vel.clone().divideScalar(50));lancarProjetil('flecha',o,vel,{dono:meuId(),tiro:t});
     soltarArco(e.mesh);som.corda();som.flecha();
    }
    local.puxada=0;
   }
  }
  if(j.item==='bomba'&&inicio&&!local.acao){local.acao='arremesso';local.k=0;local.dur=.6;local.lancou=false;virarParaMira();som.pavio()}
 }
 function virarParaMira(){const d=mira.dir;player.rotation.y=Math.atan2(d.x,d.z)}
 function armaVeiculo(inicio,qual){
  const j=eu(),v=est.veiculos.get(j?.veiculo);if(!v)return;
  if(v.tipo==='helicoptero'){if(qual==='principal')local.segura=inicio;else if(inicio)dispararMissil(v,'missil-heli')}
  if(v.tipo==='caca'&&inicio)dispararMissil(v,'missil-caca');
  if(v.tipo==='trex'&&inicio&&!(v.s.golpe>0)){v.s.golpe=.55;local.mordida=.25;som.mordida();send({type:'pvp-golpe-visual'})}
 }
 function dispararMissil(v,arma){
  const agora=performance.now();if(agora<(local.recarga[arma]||0))return;local.recarga[arma]=agora+(arma==='missil-caca'?1700:1400);
  const o=v.lancar(local.giroMissil++)||v.raiz.position.clone();
  const dir=mira.ponto.clone().sub(o).normalize();
  // trava no alvo mais próximo da mira (cone de 12°)
  let alvo=null,melhor=Math.cos(THREE.MathUtils.degToRad(12));
  for(const [id,j] of est.jogadores){if(!j.vivo||!inimigo(id)||j.veiculo)continue;const c=centroJogador(id);if(!c)continue;const dd=c.clone().sub(o);const L=dd.length();if(L>(arma==='missil-caca'?900:500))continue;const cs=dd.normalize().dot(mira.dir);if(cs>melhor){melhor=cs;alvo={tipo:'jogador',id}}}
  for(const [id,w] of est.veiculos){if(!w.ativo||w===v||!w.motorista||!inimigo(w.motorista))continue;const dd=w.raiz.position.clone().sub(o);const L=dd.length();if(L>(arma==='missil-caca'?900:500))continue;const cs=dd.normalize().dot(mira.dir);if(cs>melhor){melhor=cs;alvo={tipo:'veiculo',id}}}
  const vel=v.frente().multiplyScalar(Math.max(0,v.s.vel)).addScaledVector(dir,25);
  const t=enviarDisparo(arma,o,dir);
  const p=lancarProjetil('missil',o,vel,{dono:meuId(),tiro:t,alvo});p.arma=arma;p.vmax=arma==='missil-caca'?190:140;
  som.missil(0);if(alvo)feed(`🎯 Míssil travado em ${alvo.tipo==='jogador'?tag(alvo.id):TIPOS[est.veiculos.get(alvo.id).tipo].nome}`);
 }
 let ultimaBala=0;
 function metralhadora(v,agora){
  if(agora-ultimaBala<95)return;ultimaBala=agora;
  const o=v.mundo(v.canhao.clone());
  const dir=mira.ponto.clone().sub(o).normalize();dir.x+=(Math.random()-.5)*.012;dir.y+=(Math.random()-.5)*.012;dir.z+=(Math.random()-.5)*.012;dir.normalize();
  const fim=o.clone().addScaledVector(dir,220);const h=testar(o,fim,{ignorar:meuId()});const ate=h?h.ponto:fim;
  efeitos.tracante(o,ate);efeitos.claraoBoca(o.x,o.y,o.z,30);som.tiro(0);
  if(h)efeitos.impacto(ate.x,ate.y,ate.z);
  const t=enviarDisparo('metralhadora',o,dir);
  if(h&&(h.tipo==='jogador'||h.tipo==='veiculo')){informarAcerto(t,h.tipo==='jogador'?{alvo:h.id}:{alvoVeiculo:h.id});som.acerto()}
 }
 function acaoLocal(dt){
  const j=eu(),e=naMao.get(meuId());
  if(local.puxando){local.puxada=Math.min(1,local.puxada+dt/.8);if(e){e.acao='mirar';e.puxada=local.puxada}poseAvatar(player,'mirar',local.puxada);virarParaMira();return}
  if(e&&e.acao==='mirar'){e.acao=null}
  if(!local.acao){if(j?.item&&!j.veiculo)poseAvatar(player,j.item==='arco'?'arco':j.item);return}
  local.k+=dt/local.dur;const k=Math.min(1,local.k);
  if(e){e.acao=local.acao;e.k=k}
  poseAvatar(player,local.acao,k);
  if(local.acao==='golpe'&&k>.42&&!local.acertou){
   local.acertou=true;
   const fr=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));let alvo=null,dmin=3.4;
   for(const [id,jj] of est.jogadores){if(!jj.vivo||!inimigo(id)||jj.veiculo)continue;const av=avatarDe(id);if(!av)continue;const d=av.position.clone().sub(player.position);d.y=0;const L=d.length();if(L<dmin&&d.normalize().dot(fr)>.2){dmin=L;alvo={alvo:id}}}
   if(!alvo)for(const [id,v] of est.veiculos){if(!v.ativo||!v.motorista||!inimigo(v.motorista))continue;const d=v.raiz.position.clone().sub(player.position);d.y=0;if(d.length()<TIPOS[v.tipo].raio+2.2&&d.normalize().dot(fr)>0){alvo={alvoVeiculo:id};break}}
   if(alvo){send({type:'pvp-ataque',arma:'espada',...alvo});const c=alvo.alvo?centroJogador(alvo.alvo):est.veiculos.get(alvo.alvoVeiculo).raiz.position.clone().add(new THREE.Vector3(0,1,0));if(c)efeitos.impacto(c.x,c.y,c.z,[.8,.9,1]);som.acerto()}
  }
  if(local.acao==='arremesso'&&k>.55&&!local.lancou&&e){
   local.lancou=true;
   const o=e.mesh.getWorldPosition(new THREE.Vector3());
   const alvoP=mira.ponto.clone();const dist=Math.min(40,alvoP.distanceTo(o));
   const dir=alvoP.sub(o);dir.y=0;dir.normalize();
   const vel=dir.multiplyScalar(Math.max(8,dist*.75)).add(new THREE.Vector3(0,6+dist*.12,0));
   const t=enviarDisparo('bomba',o,vel.clone().divideScalar(20));
   lancarProjetil('bomba',o,vel,{dono:meuId(),tiro:t});
   equipar(meuId(),null);
  }
  if(k>=1){local.acao=null;if(e)e.acao=null}
 }

 // ---------- Entrada ----------
 const segurando=new Set();
 function tecla(k,inicio){
  const j=eu();if(!est.ativo||!j)return;
  if(k==='e'&&inicio)interagir();
  if(k==='q'&&inicio&&j.item&&!j.veiculo){send({type:'pvp-largar'})}
  if(k==='f')usarItem(inicio);
  if(k==='g')armaVeiculo(inicio,'secundaria');
  if(k==='r'&&inicio){const v=est.veiculos.get(j.veiculo);if(v?.tipo==='trex'&&!(v.s.rugido>0)){v.s.rugido=1.6;som.rugido(0);send({type:'pvp-golpe-visual',rugido:true})}}
  if(k==='h'&&inicio&&j.veiculo){som.buzina()}
  if(k===' ')segurando[inicio?'add':'delete']('subir');
  if(k==='c')segurando[inicio?'add':'delete']('descer');
 }
 const repetida=new Set();
 window.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea'))return;const k=e.key.toLowerCase();
  if(!['e','q','f','g','r','h',' ','c'].includes(k))return;
  if(est.ativo&&(k===' '||k==='f'))e.preventDefault();
  if(repetida.has(k))return;repetida.add(k);tecla(k,true);
 });
 window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(!repetida.has(k))return;repetida.delete(k);tecla(k,false)});
 window.addEventListener('blur',()=>{for(const k of repetida)tecla(k,false);repetida.clear()});
 for(const b of hud.querySelectorAll('.pvp-acoes button')){
  const k=b.dataset.k;b.addEventListener('pointerdown',e=>{e.preventDefault();tecla(k,true)});
  for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>tecla(k,false));
 }
 // Mira com o mouse travado (pointer lock): com arma ou veículo armado, clicar na cena trava o mouse;
 // o mouse gira a câmera e o clique usa a arma. Esc solta.
 function armado(){const j=eu();if(!j||!j.vivo)return false;return !!j.item||!!(j.veiculo&&ARMAS_VEICULO[est.veiculos.get(j.veiculo)?.tipo]?.some(a=>a!=='atropelar'))}
 canvas.addEventListener('pointerdown',e=>{
  if(!est.ativo||!armado()||e.pointerType==='touch')return;
  if(document.pointerLockElement!==canvas){canvas.requestPointerLock?.();return}
  if(e.button===0)usarItem(true);if(e.button===2)armaVeiculo(true,'secundaria');
 });
 window.addEventListener('pointerup',e=>{if(document.pointerLockElement===canvas){if(e.button===0)usarItem(false);if(e.button===2)armaVeiculo(false,'secundaria')}});
 canvas.addEventListener('contextmenu',e=>{if(document.pointerLockElement===canvas)e.preventDefault()});
 document.addEventListener('pointerlockchange',()=>{const travado=document.pointerLockElement===canvas;controls.enabled=!travado;mira.bloqueio=travado;if(!travado){usarItem(false);local.segura=false}});
 document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==canvas)return;
  const off=camera.position.clone().sub(controls.target);const s=new THREE.Spherical().setFromVector3(off);
  s.theta-=e.movementX*.0026;s.phi=THREE.MathUtils.clamp(s.phi-e.movementY*.0026,.15,controls.maxPolarAngle);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));camera.lookAt(controls.target);
 });

 // E: pega item, entra/sai do veículo (o mais perto)
 function perto(){
  const j=eu();if(!j||!j.vivo||j.veiculo)return null;const p=player.position;let melhor=null,dm=1e9;
  for(const [id,g] of est.pickups){if(!g.visible)continue;const d=Math.hypot(g.position.x-p.x,g.position.z-p.z);if(d<3.2&&d<dm){dm=d;melhor={tipo:'item',id,nome:ITENS[g.userData.dados.item].nome,item:g.userData.dados.item}}}
  for(const [id,v] of est.veiculos){if(!v.ativo||v.motorista)continue;const d=Math.hypot(v.s.x-p.x,v.s.z-p.z);if(d<TIPOS[v.tipo].alcance+1&&d<dm){dm=d;melhor={tipo:'veiculo',id,nome:TIPOS[v.tipo].nome,v}}}
  return melhor;
 }
 function interagir(){
  const j=eu();if(!j)return;
  if(j.veiculo){send({type:'pvp-sair'});return}
  const p=perto();if(!p)return;
  if(p.tipo==='item'){send({type:'move',x:player.position.x,z:player.position.z});setTimeout(()=>send({type:'pvp-pegar',pickup:p.id}),80)}
  if(p.tipo==='veiculo')send({type:'pvp-entrar',veiculo:p.id});
 }

 // ---------- Rede ----------
 function aplicarJogador(d,pos){
  const antes=est.jogadores.get(d.id);
  const j={...(antes||{}),...d};est.jogadores.set(d.id,j);
  const souEu=d.id===meuId();
  // item na mão
  equipar(d.id,j.vivo&&!j.veiculo?j.item:null);
  if(souEu&&j.item&&antes?.item!==j.item){som.pegar();feed(`${ICONE[j.item]} Você pegou: <b>${ITENS[j.item].nome}</b>`)}
  // entrou/saiu do veículo
  if(antes?.veiculo!==j.veiculo){
   const av=avatarDe(d.id);
   if(antes?.veiculo){embarques.delete(d.id);const v=est.veiculos.get(antes.veiculo);if(v){if(souEu){v.local=false;motorVeiculo(null)}}
    if(av){av.visible=true;poseAvatar(av,null);av.rotation.x=0;av.rotation.z=0;if(pos){av.position.set(pos.x,0,pos.z);av.userData.target={x:pos.x,z:pos.z}}}
    if(souEu&&pos){player.position.set(pos.x,0,pos.z);send({type:'move',x:pos.x,z:pos.z});controls.minDistance=2.5;afastarCamera(7)}}
   if(j.veiculo){const v=est.veiculos.get(j.veiculo);
    if(v){v.motorista=d.id;
     if(av){
      embarques.set(d.id,{inicio:performance.now(),origem:av.position.clone()});
      av.userData.target=null; // desliga a interpolação de caminhada durante a montaria
      av.visible=deveExibirPiloto(v.tipo);
     }
     if(souEu){v.local=true;v.alvo=null;afastarCamera(TIPOS[v.tipo].cam);controls.minDistance=TIPOS[v.tipo].comp*.6;feed(`${ICONE[v.tipo]} ${TIPOS[v.tipo].nome}: ${DICAS_VEIC[v.tipo]}`)}}}
  }
  if(souEu){pintarVida();pintarSlot()}
 }
 function afastarCamera(dist){
  const off=camera.position.clone().sub(controls.target);if(off.lengthSq()<1e-6)off.set(0,.4,-1);
  off.setLength(dist);camera.position.copy(controls.target).add(off);
 }
 function morrer(id){
  const av=avatarDe(id);if(av){av.userData.morto=0.001;equipar(id,null)}
  if(id===meuId()){$('.pvp-morte').hidden=false;local.acao=null;local.puxando=false;let n=5;$('.pvp-morte span').textContent='Volta na base do seu time em '+n+' s';
   clearInterval(local.contagem);local.contagem=setInterval(()=>{n--;if(n<=0)clearInterval(local.contagem);$('.pvp-morte span').textContent=n>0?'Volta na base do seu time em '+n+' s':'Voltando…'},1000)}
 }
 function renascer(id,pos,vida){
  const j=est.jogadores.get(id);if(j){j.vivo=true;j.vida=vida}
  const av=avatarDe(id);if(av){av.userData.morto=0;av.rotation.x=0;av.position.y=0;av.visible=true;if(pos){av.position.set(pos.x,0,pos.z);av.userData.target={x:pos.x,z:pos.z}}}
  if(id===meuId()){$('.pvp-morte').hidden=true;clearInterval(local.contagem);if(pos){player.position.set(pos.x,0,pos.z);send({type:'move',x:pos.x,z:pos.z});o.aoTeleporte?.()}pintarVida();pintarSlot()}
 }
 function mensagem(d){
  switch(d.type){
   case 'pvp':{
    est.ativo=true;hud.hidden=false;
    for(const v of est.veiculos.values())v.remover();est.veiculos.clear();
    for(const g of est.pickups.values())extras.remove(g);est.pickups.clear();
    extras.clear();bandeiras.length=0;
    const s=d.estado;est.placar=s.placar;est.vitoria=s.vitoria||25;pintarPlacar();
    for(const [team,b] of Object.entries(s.bases||{}))bandeiras.push(base(team,b));
    for(const z of s.zonas||[])zona(z);
    for(const p of s.pickups)criarPickup(p);
    for(const v of s.veiculos)veiculoRede(v);
    est.jogadores.clear();for(const j of s.jogadores)aplicarJogador(j);
    for(const j of s.jogadores)if(!j.vivo){const av=avatarDe(j.id);if(av)av.userData.morto=1}
    pintarSlot();return true;
   }
   case 'jogador':aplicarJogador(d.jogador,d.pos);return true;
   case 'pickup':{const g=est.pickups.get(d.id);if(g)g.visible=d.disponivel;return true}
   case 'veiculo':{const v=veiculoRede(d.veiculo);if(eu()?.veiculo===v.id)pintarSlot();return true}
   case 'veiculo-mov':{const v=est.veiculos.get(d.id);if(v&&!v.local)v.rede(d);return true}
   case 'pvp-bilhete':{const t=meusTiros.get(d.ref);if(t){if(!d.ok){meusTiros.delete(d.ref);return true}t.tiro=d.tiro;if(t.pendente){send({...t.pendente,tiro:d.tiro});t.pendente=null}}return true}
   case 'disparo':{
    if(d.de===meuId())return true;
    const o=new THREE.Vector3(d.o.x,d.o.y,d.o.z),dir=new THREE.Vector3(d.d.x,d.d.y,d.d.z).normalize();
    const dist=camera.position.distanceTo(o);
    if(d.arma==='metralhadora'){const h=testar(o,o.clone().addScaledVector(dir,220),{ignorar:d.de});const fim=h?h.ponto:o.clone().addScaledVector(dir,220);efeitos.tracante(o,fim);efeitos.claraoBoca(o.x,o.y,o.z,25);if(h)efeitos.impacto(fim.x,fim.y,fim.z);som.tiro(dist)}
    const bruto=new THREE.Vector3(d.d.x,d.d.y,d.d.z);
    if(d.arma==='arco'){lancarProjetil('flecha',o,bruto.multiplyScalar(50),{dono:d.de});const e=naMao.get(d.de);if(e)soltarArco(e.mesh)}
    if(d.arma==='bomba'){lancarProjetil('bomba',o,bruto.multiplyScalar(20),{dono:d.de});const av=avatarDe(d.de);if(av){av.userData.acao={nome:'arremesso',k:.55,dur:.6}}}
    if(d.arma==='missil-heli'||d.arma==='missil-caca'){const v=est.veiculos.get(est.jogadores.get(d.de)?.veiculo);v?.lancar(Math.floor(Math.random()*2));const p=lancarProjetil('missil',o,dir.multiplyScalar(60),{dono:d.de});p.arma=d.arma;p.vmax=d.arma==='missil-caca'?190:140;som.missil(dist)}
    return true;
   }
   case 'golpe':return true;
   case 'golpe-visual':{
    if(d.de===meuId())return true;
    const j=est.jogadores.get(d.de);
    if(j?.veiculo){const v=est.veiculos.get(j.veiculo);if(v?.tipo==='trex'){if(d.rugido){v.s.rugido=1.6;som.rugido(camera.position.distanceTo(v.raiz.position))}else{v.s.golpe=.55}}return true}
    const av=avatarDe(d.de);if(av&&d.arma!=='atropelar')av.userData.acao={nome:j?.item==='espada'?'golpe':'golpe',k:0,dur:.5};
    return true;
   }
   case 'explosao':{if(d.de===meuId())return true;efeitos.explosao(d.x,Math.max(.2,d.y),d.z,d.raio||6);som.explosao(camera.position.distanceTo(new THREE.Vector3(d.x,d.y,d.z)));
    // projéteis visuais remotos daquele dono somem na explosão
    for(let i=proj.length-1;i>=0;i--){const p=proj[i];if(p.dono===d.de&&(p.tipo==='bomba'||p.tipo==='missil')&&p.pos.distanceTo(new THREE.Vector3(d.x,d.y,d.z))<40){remover(i);break}}
    return true}
   case 'explosao-veiculo':{const v=est.veiculos.get(d.veiculo);efeitos.explosao(d.x,d.y+1,d.z,12);som.explosao(camera.position.distanceTo(new THREE.Vector3(d.x,d.y,d.z)));if(v){feed(`💥 ${TIPOS[v.tipo].nome} destruído`)}return true}
   case 'dano':{
    const j=est.jogadores.get(d.alvo);if(j)j.vida=d.vida;
    if(d.alvo===meuId()){pintarVida();danoT=.6;som.dano()}
    if(d.de===meuId()&&d.alvo!==meuId()){const m=$('.pvp-mira');m.classList.remove('hit');void m.offsetWidth;m.classList.add('hit')}
    const c=centroJogador(d.alvo);if(c)efeitos.impacto(c.x,c.y,c.z,[1,.4,.3]);
    return true;
   }
   case 'dano-veiculo':{const v=est.veiculos.get(d.veiculo);if(v){v.vida=d.vida;if(eu()?.veiculo===v.id){pintarSlot();danoT=.4}}if(d.de===meuId()){const m=$('.pvp-mira');m.classList.remove('hit');void m.offsetWidth;m.classList.add('hit')}return true}
   case 'morte':{const j=est.jogadores.get(d.alvo);if(j){j.vivo=false;j.item=null;j.vida=0}morrer(d.alvo);
    feed(`${tag(d.de)} <span class="arma">${NOMES_ARMA[d.arma]||d.arma}</span> ${tag(d.alvo)}`);if(d.alvo===meuId())pintarVida();return true}
   case 'renasceu':renascer(d.id,d.pos,d.vida);return true;
   case 'placar':{est.placar=d.placar;pintarPlacar();if(d.novaPartida){$('.pvp-vitoria').hidden=true;feed('Nova partida começou.')}return true}
   case 'vitoria':{est.placar=d.placar;pintarPlacar();const el=$('.pvp-vitoria');el.hidden=false;el.style.setProperty('--cor',TEAM_COLORS[d.time]);el.innerHTML=`<b>Time ${d.time} venceu!</b><span>${d.placar.vermelho} × ${d.placar.amarelo} · nova partida em 12 s</span>`;return true}
   case 'leave':{const e=naMao.get(d.id);if(e){scene.remove(e.mesh);e.rastro?.remover();naMao.delete(d.id)}est.jogadores.delete(d.id);return false}
   case 'look':{return false}
  }
  return false;
 }

 // ---------- Quadro a quadro ----------
 let envioVeic=0;
 function update(dt,t){
  dtAtual=dt;
  if(!est.ativo)return;
  const j=eu();
  atualizarMira();
  // dirigir
  const meuV=j?.veiculo?est.veiculos.get(j.veiculo):null;
  if(meuV&&meuV.local){
   const p=teclas();
   const inp={frente:p.has('w')||p.has('arrowup'),tras:p.has('s')||p.has('arrowdown'),esq:+(p.has('a')||p.has('arrowleft')),dir:+(p.has('d')||p.has('arrowright')),
    subir:+segurando.has('subir'),descer:+segurando.has('descer'),turbo:p.has('shift')};
   meuV.dirigir(dt,inp,mundo);
   envioVeic+=dt;if(envioVeic>.066){envioVeic=0;const s=meuV.s;send({type:'pvp-veiculo',x:+s.x.toFixed(2),y:+s.y.toFixed(2),z:+s.z.toFixed(2),ry:+s.ry.toFixed(3),rx:+s.rx.toFixed(3),rz:+s.rz.toFixed(3),vel:+s.vel.toFixed(1)})}
   motorVeiculo(meuV.tipo,Math.min(1,Math.abs(meuV.s.vel)/(meuV.tipo==='caca'?125:40)+(meuV.tipo==='helicoptero'?meuV.s.motor*.4:0)));
   if(local.segura&&meuV.tipo==='helicoptero')metralhadora(meuV,performance.now());
   // atropelar inimigos
   if((meuV.tipo==='carro'||meuV.tipo==='moto'||TIPOS[meuV.tipo].truck)&&Math.abs(meuV.s.vel)>8){
    for(const [id,jj] of est.jogadores){if(!jj.vivo||!inimigo(id)||jj.veiculo)continue;const av=avatarDe(id);if(!av)continue;
     if(Math.hypot(av.position.x-meuV.s.x,av.position.z-meuV.s.z)<TIPOS[meuV.tipo].raio+.6&&performance.now()-(local.atropelos.get(id)||0)>1000){local.atropelos.set(id,performance.now());send({type:'pvp-ataque',arma:'atropelar',alvo:id});efeitos.impacto(av.position.x,1,av.position.z)}}
   }
   // mordida do T-rex
   if(meuV.tipo==='trex'&&local.mordida>0){local.mordida-=dt;if(local.mordida<=0){
    const fr=meuV.frente();const boca=meuV.raiz.position.clone().addScaledVector(fr,5).add(new THREE.Vector3(0,2,0));let alvo=null,dm=6;
    for(const [id,jj] of est.jogadores){if(!jj.vivo||!inimigo(id))continue;const c=centroJogador(id);if(!c)continue;const L=c.distanceTo(boca);if(L<dm){dm=L;alvo=jj.veiculo?{alvoVeiculo:jj.veiculo}:{alvo:id}}}
    if(alvo){send({type:'pvp-ataque',arma:'mordida',...alvo});efeitos.impacto(boca.x,boca.y,boca.z);som.acerto()}}}
   // câmera atrás do veículo quando em movimento (se o jogador não estiver girando a câmera)
   if(Math.abs(meuV.s.vel)>4&&!arrastando){const off=camera.position.clone().sub(controls.target);const s=new THREE.Spherical().setFromVector3(off);
    const alvoT=Math.atan2(-Math.sin(meuV.s.ry),-Math.cos(meuV.s.ry));let d=alvoT-s.theta;d=Math.atan2(Math.sin(d),Math.cos(d));s.theta+=d*Math.min(1,dt*(meuV.tipo==='caca'?2.5:1.4));
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s))}
  } else motorVeiculo(null);
  // veículos
  for(const v of est.veiculos.values())v.animar(dt,t,camera);
  // Interação em Three.js, sem serviços pagos: embarque suave e poses individuais.
  for(const [id,jj] of est.jogadores){
   if(!jj.veiculo)continue;const v=est.veiculos.get(jj.veiculo),av=avatarDe(id);if(!v||!av)continue;
   const visivel=deveExibirPiloto(v.tipo);
   av.visible=visivel;
   const sp=v.seatWorld();
   if(!TIPOS[v.tipo].assento)sp.y=v.raiz.position.y;
   av.userData.target=null; // impede que a rede puxe a montaria de volta à caminhada
   av.userData.lastMove=0;
   av.rotation.y=v.s.ry;
   if(!visivel){av.position.copy(sp);continue} // cabine fechada: motorista não flutua fora do modelo
   const fase=ritmoDeVeiculo(v.tipo,t,v.s.vel);
   sp.y-=.62*av.scale.y; // quadril no assento; modelo local fica independente
   sp.y+=Math.sin(fase)*(v.tipo==='trex'?.055:.018); // balanço de montaria ou vibração da moto
   const transicao=embarques.get(id);
   if(transicao){
    const k=progressoDeEmbarque(transicao.inicio,performance.now());
    av.position.copy(transicao.origem).lerp(sp,k);
    if(k>=1)embarques.delete(id);
   }else av.position.copy(sp);
   av.rotation.z=v.corpo.rotation.z;
   poseAvatar(av,poseParaVeiculo(v.tipo),(.5+.5*Math.sin(fase)));
  }
  // ações locais (golpe, mira, arremesso)
  if(j?.vivo&&!j.veiculo)acaoLocal(dt);
  // ações vistas nos outros jogadores
  for(const [id,jj] of est.jogadores){
   if(id===meuId())continue;const av=avatarDe(id);if(!av)continue;const e=naMao.get(id);
   const a=av.userData.acao;
   if(a){a.k+=dt/a.dur;if(a.k>=1){av.userData.acao=null;if(e)e.acao=null}else{poseAvatar(av,a.nome,a.k);if(e){e.acao=a.nome;e.k=a.k}}}
   else if(jj.item&&!jj.veiculo&&jj.vivo)poseAvatar(av,jj.item==='arco'?'arco':jj.item);
   else if(!jj.veiculo)poseAvatar(av,null);
  }
  // queda de quem foi derrubado
  for(const [id,jj] of est.jogadores){const av=avatarDe(id);if(!av)continue;
   if(av.userData.morto>0){av.userData.morto=Math.min(1,av.userData.morto+dt*2.2);av.rotation.order='YXZ';av.rotation.x=-Math.PI/2*Math.sin(av.userData.morto*Math.PI/2);av.position.y=.25*av.userData.morto;poseAvatar(av,null)}}
  // itens nas mãos
  for(const [id,e] of naMao)posicionarItem(id,e);
  atualizarProjeteis(dt);
  // itens no chão giram; bandeiras tremulam
  for(const g of est.pickups.values()){if(!g.visible)continue;const it=g.userData.item;it.rotation.y+=dt*1.4;it.position.y=1.3+Math.sin(t*2+g.position.x)*.15}
  for(const b of bandeiras){const band=b.userData.band,pa=band.geometry.attributes.position,o0=band.userData.base;for(let i=0;i<pa.count;i++){const x=o0[i*3];pa.setZ(i,Math.sin(x*2.2-t*5)*.18*(x/3.2))}pa.needsUpdate=true}
  efeitos.update(dt);
  // tremor de câmera nas explosões
  const tr=efeitos.tremor();if(tr>0){camera.position.x+=(Math.random()-.5)*tr*.4;camera.position.y+=(Math.random()-.5)*tr*.4}
  // HUD
  danoT=Math.max(0,danoT-dt);$('.pvp-dano').style.opacity=danoT;
  $('.pvp-mira').hidden=!armado();
  const pp=perto();const av=$('.pvp-aviso');
  if(pp){av.hidden=false;av.innerHTML=`<kbd>E</kbd> ${pp.tipo==='item'?'pegar':'entrar no(a)'} <b>${pp.nome}</b>`}
  else if(armado()&&document.pointerLockElement!==canvas&&!matchMedia('(pointer:coarse)').matches){av.hidden=false;av.innerHTML='Clique na cena para mirar com o mouse · <kbd>Esc</kbd> solta'}
  else av.hidden=true;
  hud.classList.toggle('voando',!!(meuV&&TIPOS[meuV.tipo].voa));
  if(meuV&&Math.random()<.1)pintarSlot();
 }
 let arrastando=false;
 canvas.addEventListener('pointerdown',()=>{arrastando=true});window.addEventListener('pointerup',()=>{arrastando=false});

 return {
  mensagem,update,
  dirigindo:()=>!!eu()?.veiculo,
  morto:()=>eu()?.vivo===false,
  alvoCamera(){const j=eu();if(!j?.veiculo)return null;const v=est.veiculos.get(j.veiculo);if(!v)return null;return v.raiz.position.clone().add(new THREE.Vector3(0,TIPOS[v.tipo].comp*.18+1,0))},
  reset(){est.ativo=false;hud.hidden=true;motorVeiculo(null)},
  depurar:{est,proj,naMao,efeitos,tecla}
 };
}
