import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
// Veículos e montaria do modo PvP. Modelos semi-realistas gerados no Higgsfield (sam_3_3d, a partir de
// desenhos próprios, sem marca), com todas as animações feitas em código:
// - rodas giram e as dianteiras esterçam (deformação no vertex shader, recortando a roda do modelo);
// - carroceria inclina, a moto deita na curva, escapamento solta fumaça;
// - helicóptero: rotores em código, inclinação, poeira no chão; caça: pós-combustão, rolagem, luzes;
// - T-rex: pernas, cauda, cabeça e boca animadas no vertex shader (o modelo não tem esqueleto).
// Todos os modelos vêm normalizados (comprimento 1 no eixo Z, frente para +Z, Y para cima).

const HF='https://d8j0ntlcm91z4.cloudfront.net/user_3KLobL96cAs3bokj0G7CRMHMham/hf_20261021_';
export const TIPOS={
 carro:{nome:'Carro esportivo',comp:4.6,cdn:HF+'054039_72ddea93-584e-4119-8d16-b263c8105194.glb',raio:2.3,alcance:4.5,
  rodas:[[-.311,-.088,.078,.175,0,0],[.261,-.086,.076,.175,1,0]],cam:9,motoristaVisivel:false,
  luzes:{frente:[[.19,-.045,.49],[-.19,-.045,.49]],tras:[[.2,.04,-.49],[-.2,.04,-.49]]},escape:[[.11,-.105,-.49],[-.11,-.105,-.49]]},
 moto:{nome:'Moto chopper',comp:2.5,cdn:HF+'054042_70284ae2-93ad-4cce-91ef-73ffeac65aec.glb',raio:1.2,alcance:3.5,
  rodas:[[-.38,-.15,.132,0,0,.45],[.361,-.144,.139,0,1,.45]],cam:6.5,motoristaVisivel:true,assento:[0,.03,-.17],
  luzes:{frente:[[0,.16,.16]],tras:[[0,0,-.445]]},escape:[[-.09,-.19,-.4]]},
 helicoptero:{nome:'Helicóptero',comp:14,cdn:HF+'054045_47f8d46a-b148-48de-a2a0-8c308403abe2.glb',raio:5,alcance:8,voa:true,
  rotor:[0,.185,.117,.44],rotorCauda:[.035,.05,-.47,.062],cam:22,motoristaVisivel:false,
  pilones:[[.16,-.08,.05],[-.16,-.08,.05]],canhao:[0,-.1,.4],luzesPisca:[[0,.21,-.42,'#ff3b30'],[0,-.12,.05,'#ff3b30']]},
 caca:{nome:'Caça',comp:19,cdn:HF+'054048_1c7c5a8a-8be6-447a-b4c7-26963ec14352.glb',raio:7,alcance:10,voa:true,jato:true,
  bocais:[[.061,-.068,-.462],[-.061,-.068,-.462]],cam:34,motoristaVisivel:false,
  pilones:[[.2,-.085,-.08],[-.2,-.085,-.08]],luzesPisca:[[.44,-.06,-.2,'#ff3b30'],[-.44,-.06,-.2,'#3bff6a']]},
 trex:{nome:'T-rex',comp:12,cdn:HF+'054051_adf5bcf8-7b4b-4ff9-9397-fde6b58754e4.glb',raio:3,alcance:6,dino:true,cam:20,motoristaVisivel:true,assento:[0,.19,.08],
  dino_:{quadrilZ:.03,quadrilY:-.01,caudaZ:-.1,pescocoZ:.25,pescocoY:.12,bocaZ:.37,bocaY:.085}},
};
export const ARMAS_VEICULO={helicoptero:['metralhadora','missil-heli'],caca:['missil-caca'],trex:['mordida'],carro:['atropelar'],moto:['atropelar']};

// ---------- Carregamento ----------
const cache=new Map();
export const statusModelos=new Map();
function carregar(tipo){
 if(!cache.has(tipo)){
  const L=new GLTFLoader();
  cache.set(tipo,L.loadAsync('/assets/veiculos/'+tipo+'.glb')
   .catch(()=>L.loadAsync(TIPOS[tipo].cdn))
   .then(g=>{statusModelos.set(tipo,'ok');return g.scene})
   .catch(()=>{statusModelos.set(tipo,'procedural');return null}));
 }
 return cache.get(tipo);
}
export function preCarregar(){for(const t of Object.keys(TIPOS))carregar(t)}

// ---------- Deformação no vertex shader (rodas e T-rex) ----------
const DEFORMAR=`
uniform float uGiro,uEsterco,uFase,uAndar,uCabeca,uBoca,uCauda;
uniform vec4 uRodas[2];uniform float uDianteira[2];uniform float uRodaMin[2];uniform vec4 uDino0;uniform vec4 uDino1;
void girarZY(inout vec3 p,inout vec3 n,vec2 piv,float a){float c=cos(a),s=sin(a);vec2 d=p.zy-piv;p.zy=piv+vec2(c*d.x-s*d.y,s*d.x+c*d.y);n.zy=vec2(c*n.z-s*n.y,s*n.z+c*n.y);}
void girarXZ(inout vec3 p,inout vec3 n,vec2 piv,float a){float c=cos(a),s=sin(a);vec2 d=p.xz-piv;p.xz=piv+vec2(c*d.x+s*d.y,-s*d.x+c*d.y);n.xz=vec2(c*n.x+s*n.z,-s*n.x+c*n.z);}
void deformar(inout vec3 p,inout vec3 n){
#ifdef RODAS
 for(int i=0;i<2;i++){vec4 w=uRodas[i];vec2 d=p.zy-w.xy;
  float r2=dot(d,d);
  if(r2<w.z*w.z&&r2>uRodaMin[i]*uRodaMin[i]&&abs(p.x)>w.w){girarZY(p,n,w.xy,-uGiro);
   if(uDianteira[i]>.5){float lx=w.w>0.?sign(p.x)*(w.w+.04):0.;girarXZ(p,n,vec2(lx,w.x),uEsterco);}}}
#endif
#ifdef DINO
 float qz=uDino0.x,qy=uDino0.y,cz=uDino0.z,pz=uDino0.w,py=uDino1.x,bz=uDino1.y,by=uDino1.z;
 // pernas: cada lado balança em oposição, com o pé subindo no avanço
 if(p.y<qy+.03&&(p.z<.19||p.y<-.12)){float lado=p.x>0.?0.:3.14159;float w=smoothstep(qy+.03,qy-.06,p.y);
  float a=sin(uFase+lado)*.42*uAndar*w;girarZY(p,n,vec2(qz,qy),a);
  p.y+=max(0.,cos(uFase+lado))*.03*uAndar*smoothstep(qy-.08,qy-.18,p.y);}
 // cauda: onda que cresce até a ponta
 if(p.z<cz){float t=clamp((cz-p.z)/.4,0.,1.);float a=(sin(uFase*.5-t*2.4)*.16*(.35+uAndar)+uCauda)*t;girarXZ(p,n,vec2(0.,cz),a);p.y+=sin(uFase*.5-t*2.)*.012*t;}
 // cabeça e boca
 if(p.z>pz){float w=smoothstep(pz,pz+.07,p.z);
  if(p.z>bz&&p.y<by){girarZY(p,n,vec2(bz,by),uBoca*smoothstep(bz,bz+.03,p.z));}
  girarZY(p,n,vec2(pz,py),uCabeca*w);}
 p.y+=sin(uFase*2.)*.006*uAndar;
#endif
}
`;
function prepararMaterial(mat,cfg,uni){
 const m=mat.clone();
 m.onBeforeCompile=(sh)=>{
  Object.assign(sh.uniforms,uni);
  sh.vertexShader=sh.vertexShader
   .replace('#include <common>','#include <common>\n'+(cfg.rodas?'#define RODAS\n':'')+(cfg.dino?'#define DINO\n':'')+DEFORMAR)
   .replace('#include <beginnormal_vertex>','vec3 objectNormal=vec3(normal);vec3 _def=vec3(position);deformar(_def,objectNormal);\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif')
   .replace('#include <begin_vertex>','vec3 transformed=_def;\n#ifdef USE_ALPHAHASH\nvPosition=vec3(position);\n#endif');
 };
 m.customProgramCacheKey=()=>'veic-'+(cfg.rodas?'r':'')+(cfg.dino?'d':'');
 return m;
}

// ---------- Peças em código ----------
const metal=(c,r=.35,m=.8)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
export function geoMissil(){
 const g=new THREE.Group();
 const corpo=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,2.2,14),metal('#e9ebe8',.4,.5));corpo.rotation.x=Math.PI/2;g.add(corpo);
 const ponta=new THREE.Mesh(new THREE.ConeGeometry(.11,.45,14),metal('#5b5f63',.3,.7));ponta.rotation.x=Math.PI/2;ponta.position.z=1.32;g.add(ponta);
 const faixa=new THREE.Mesh(new THREE.CylinderGeometry(.113,.113,.12,14),metal('#d9a41e',.5,.3));faixa.rotation.x=Math.PI/2;faixa.position.z=.7;g.add(faixa);
 for(let i=0;i<4;i++){const a=new THREE.Mesh(new THREE.BoxGeometry(.02,.28,.35),metal('#c8cbc8',.5,.5));a.position.z=-.9;a.rotation.z=i*Math.PI/2;a.position.x=Math.sin(i*Math.PI/2)*.14;a.position.y=Math.cos(i*Math.PI/2)*.14;g.add(a)}
 const bocal=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.12,12),metal('#2b2b2b',.6,.6));bocal.rotation.x=Math.PI/2;bocal.position.z=-1.15;g.add(bocal);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});
 return g;
}
function rotorPrincipal(raio){
 const g=new THREE.Group();const pas=new THREE.Group();g.add(pas);
 const pa=new THREE.BoxGeometry(raio,.06,.42);pa.translate(raio/2,0,0);
 const m=metal('#1d1f22',.5,.4);
 for(let i=0;i<4;i++){const p=new THREE.Mesh(pa,m);p.rotation.y=i*Math.PI/2;p.rotation.x=.06;p.castShadow=true;pas.add(p)}
 const cubo=new THREE.Mesh(new THREE.CylinderGeometry(.32,.38,.35,16),metal('#3a3d40'));pas.add(cubo);
 // disco de borrão quando gira rápido
 const disco=new THREE.Mesh(new THREE.CircleGeometry(raio,48),new THREE.MeshBasicMaterial({color:'#2a2c2e',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 disco.rotation.x=-Math.PI/2;disco.position.y=.02;g.add(disco);
 g.userData={pas,disco};return g;
}
function rotorCauda(raio){
 const g=new THREE.Group();const pa=new THREE.BoxGeometry(.04,raio*2,.16);const m=metal('#222',.5,.4);
 for(let i=0;i<2;i++){const p=new THREE.Mesh(pa,m);p.rotation.x=i*Math.PI/2;g.add(p)}
 const disco=new THREE.Mesh(new THREE.CircleGeometry(raio,24),new THREE.MeshBasicMaterial({color:'#333',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 disco.rotation.y=Math.PI/2;g.add(disco);g.userData={disco};return g;
}
// Chama da pós-combustão: cone com degradê e tremulação no shader.
const chamaMat=new THREE.ShaderMaterial({
 uniforms:{uT:{value:0},uForca:{value:1}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float uT,uForca;varying vec2 vUv;
  void main(){float l=vUv.y;float n=sin(l*30.-uT*55.+vUv.x*12.)*.5+.5;float a=pow(l,1.3)*(.45+.35*n)*uForca;
   // perto do bocal: núcleo azulado; na ponta: laranja que some
   vec3 c=mix(vec3(1.,.42,.08),vec3(.75,.85,1.),smoothstep(.75,1.,l));gl_FragColor=vec4(c,a*.9);}`,
 transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
});
function chama(raio,comp){const g=new THREE.ConeGeometry(raio,comp,16,1,true);g.rotateX(-Math.PI/2);g.translate(0,0,-comp/2);return new THREE.Mesh(g,chamaMat)}
const brilhoTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
function brilho(cor,tam){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:brilhoTex,color:cor,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.setScalar(tam);return s}

// Modelos de reserva, se o GLB não carregar (mesma escala normalizada: comprimento 1 em Z).
function procedural(tipo){
 const g=new THREE.Group();const add=(geo,cor,x,y,z,m=.3)=>{const k=new THREE.Mesh(geo,metal(cor,.45,m));k.position.set(x,y,z);k.castShadow=true;g.add(k);return k};
 if(tipo==='carro'){add(new THREE.BoxGeometry(.5,.14,1),'#d46a12',0,-.05,0);add(new THREE.BoxGeometry(.4,.1,.45),'#202428',0,.07,-.05);for(const z of [-.31,.26])for(const x of [-.24,.24]){const r=add(new THREE.CylinderGeometry(.1,.1,.07,18),'#151515',x,-.06,z);r.rotation.z=Math.PI/2}}
 if(tipo==='moto'){add(new THREE.BoxGeometry(.12,.12,.5),'#202c3a',0,0,-.05);for(const z of [-.38,.36]){const r=add(new THREE.TorusGeometry(.13,.035,8,20),'#151515',0,-.125,z);r.rotation.y=Math.PI/2}}
 if(tipo==='helicoptero'){add(new THREE.SphereGeometry(.15,20,14),'#7a7e82',0,0,.15).scale.set(1,1,1.6);add(new THREE.BoxGeometry(.04,.05,.5),'#7a7e82',0,.05,-.25);add(new THREE.BoxGeometry(.02,.12,.08),'#7a7e82',0,.11,-.47)}
 if(tipo==='caca'){add(new THREE.ConeGeometry(.08,1,12),'#3a3f45',0,0,0).rotation.x=Math.PI/2;const a=add(new THREE.BoxGeometry(.9,.02,.35),'#3a3f45',0,0,-.1);a.scale.set(1,1,1)}
 if(tipo==='trex'){add(new THREE.SphereGeometry(.12,16,12),'#4c4237',0,.05,0).scale.set(1,1,1.8);add(new THREE.ConeGeometry(.06,.45,10),'#4c4237',0,.05,-.32).rotation.x=-Math.PI/2;add(new THREE.BoxGeometry(.1,.08,.14),'#4c4237',0,.12,.4);for(const x of [-.06,.06])add(new THREE.BoxGeometry(.05,.2,.06),'#4c4237',x,-.1,.07)}
 return g;
}

// ---------- Instância de veículo ----------
export class Veiculo{
 constructor(scene,dados,efeitos){
  this.id=dados.id;this.tipo=dados.tipo;this.cfg=TIPOS[dados.tipo];this.efeitos=efeitos;
  this.raiz=new THREE.Group();this.raiz.rotation.order='YXZ';scene.add(this.raiz);
  this.corpo=new THREE.Group();this.raiz.add(this.corpo); // inclinações locais (suspensão)
  this.escala=this.cfg.comp;
  this.s={x:dados.x,y:dados.y||0,z:dados.z,ry:dados.ry||0,rx:0,rz:0,vel:0,vy:0,esterco:0,giro:0,fase:0,motor:0,acel:0,lat:0,cabeca:0,boca:0,cauda:0,golpe:0};
  this.alvo=null;this.ativo=true;this.vida=dados.vida;this.max=dados.max;this.motorista=dados.motorista||null;
  this.uni={uGiro:{value:0},uEsterco:{value:0},uFase:{value:0},uAndar:{value:0},uCabeca:{value:0},uBoca:{value:0},uCauda:{value:0},
   uRodas:{value:[new THREE.Vector4(),new THREE.Vector4()]},uDianteira:{value:[0,0]},uRodaMin:{value:[0,0]},uDino0:{value:new THREE.Vector4()},uDino1:{value:new THREE.Vector4()}};
  if(this.cfg.rodas)this.cfg.rodas.forEach((r,i)=>{this.uni.uRodas.value[i].set(r[0],r[1],r[2],r[3]);this.uni.uDianteira.value[i]=r[4];this.uni.uRodaMin.value[i]=r[2]*(r[5]||0)});
  if(this.cfg.dino){const d=this.cfg.dino_;this.uni.uDino0.value.set(d.quadrilZ,d.quadrilY,d.caudaZ,d.pescocoZ);this.uni.uDino1.value.set(d.pescocoY,d.bocaZ,d.bocaY,0)}
  this.montar(procedural(this.tipo),true);
  carregar(this.tipo).then(m=>{if(m&&!this.removido)this.montar(m.clone(true),false)});
  this.raiz.position.set(this.s.x,this.s.y,this.s.z);this.raiz.rotation.y=this.s.ry;
 }
 montar(modelo,provisorio){
  if(this.modelo)this.corpo.remove(this.modelo);
  const holder=new THREE.Group();holder.add(modelo);
  const box=new THREE.Box3().setFromObject(modelo),size=box.getSize(new THREE.Vector3());
  const k=1/(size.z||1);modelo.scale.multiplyScalar(k);
  // a deformação usa as coordenadas originais do modelo (comprimento 1), então só normaliza escala/posição fora dele
  const box2=new THREE.Box3().setFromObject(modelo),c=box2.getCenter(new THREE.Vector3());
  modelo.position.sub(new THREE.Vector3(c.x,box2.min.y,c.z));
  holder.scale.setScalar(this.escala);
  modelo.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
   if(!provisorio&&(this.cfg.rodas||this.cfg.dino))o.material=prepararMaterial(o.material,this.cfg,this.uni);
   if(o.material.map)o.material.map.anisotropy=4}});
  this.corpo.add(holder);this.modelo=holder;
  // ponto (x,y,z) nas coordenadas do modelo normalizado → coordenadas locais do corpo
  const off=modelo.position.clone();
  this.ponto=(x,y,z)=>new THREE.Vector3(x,y,z).multiplyScalar(k).add(off).multiplyScalar(this.escala);
  this.pecas();
 }
 pecas(){
  const P=this.ponto,C=this.cfg,h=this.modelo;
  this.extras?.forEach(e=>e.parent?.remove(e));this.extras=[];
  const add=(o,pai=this.corpo)=>{pai.add(o);this.extras.push(o);return o};
  if(C.rotor){const [x,y,z,r]=C.rotor;this.rotor=add(rotorPrincipal(r*this.escala));this.rotor.position.copy(P(x,y,z));this.rotor.position.y+=.15}
  if(C.rotorCauda){const [x,y,z,r]=C.rotorCauda;this.rotorC=add(rotorCauda(r*this.escala));this.rotorC.position.copy(P(x,y,z))}
  if(C.bocais){this.chamas=C.bocais.map(([x,y,z])=>{const g=new THREE.Group();g.position.copy(P(x,y,z));add(g);
   const f=chama(.5,6);g.add(f);const b=brilho('#ff9a4a',3.2);b.position.z=-.3;g.add(b);g.userData={f,b};return g})}
  if(C.pilones){this.misseis=C.pilones.map(([x,y,z])=>{const m=geoMissil();m.position.copy(P(x,y,z));if(this.tipo==='helicoptero')m.scale.setScalar(.8);add(m);return m})}
  if(C.luzes){this.farois=C.luzes.frente.map(([x,y,z])=>{const b=brilho('#fff6dc',.45);b.position.copy(P(x,y,z));return add(b)});
   this.lanternas=C.luzes.tras.map(([x,y,z])=>{const b=brilho('#ff2a1a',.4);b.position.copy(P(x,y,z));return add(b)})}
  if(C.luzesPisca)this.piscas=C.luzesPisca.map(([x,y,z,cor])=>{const b=brilho(cor,1.4);b.position.copy(P(x,y,z));return add(b)});
  if(C.escape)this.escapes=C.escape.map(([x,y,z])=>P(x,y,z));
  if(C.assento){const [x,y,z]=C.assento;this.assento=P(x,y,z)}
  if(C.canhao)this.canhao=P(...C.canhao);
 }
 // Ponto local → mundo
 mundo(v){return this.corpo.localToWorld(v.clone())}
 frente(){return new THREE.Vector3(Math.sin(this.s.ry)*Math.cos(this.s.rx),-Math.sin(this.s.rx),Math.cos(this.s.ry)*Math.cos(this.s.rx))}
 remover(){this.removido=true;this.raiz.parent?.remove(this.raiz)}
 rede(d){
  if(d.ativo===false&&this.ativo){this.ativo=false;this.raiz.visible=false}
  if(d.ativo&&!this.ativo){this.ativo=true;this.raiz.visible=true;Object.assign(this.s,{x:d.x,y:d.y,z:d.z,ry:d.ry,rx:0,rz:0,vel:0});this.alvo=null}
  if('vida' in d)this.vida=d.vida;if('max' in d)this.max=d.max;if('motorista' in d)this.motorista=d.motorista;
  if(!this.local&&d.x!=null){this.alvo={x:d.x,y:d.y||0,z:d.z,ry:d.ry,rx:d.rx||0,rz:d.rz||0,vel:d.vel||0}}
 }

 // ---- Física de quem dirige (só no navegador do motorista) ----
 dirigir(dt,inp,mundo){
  const s=this.s,C=this.cfg;
  if(this.tipo==='carro'||this.tipo==='moto'){
   const max=this.tipo==='moto'?36:42,acel=this.tipo==='moto'?15:13;
   const v0=s.vel;
   if(inp.frente)s.vel+=(s.vel<0?30:acel)*dt;
   else if(inp.tras)s.vel-=(s.vel>0?30:6)*dt;
   else s.vel-=Math.sign(s.vel)*Math.min(Math.abs(s.vel),(2+Math.abs(s.vel)*.08)*dt);
   s.vel=THREE.MathUtils.clamp(s.vel,-9,max*(inp.turbo?1.15:1));
   s.acel=THREE.MathUtils.lerp(s.acel,(s.vel-v0)/Math.max(dt,1e-3),Math.min(1,dt*6));
   const alvoEst=(inp.esq-inp.dir)*(this.tipo==='moto'?.6:.55)/(1+Math.abs(s.vel)/22);
   s.esterco=THREE.MathUtils.lerp(s.esterco,alvoEst,Math.min(1,dt*7));
   const eixo=this.tipo==='moto'?1.6:2.6;
   s.ry+=s.vel*Math.tan(s.esterco)/eixo*dt;
   s.lat=THREE.MathUtils.lerp(s.lat,s.vel*s.vel*Math.tan(s.esterco)/eixo,Math.min(1,dt*5));
   this.mover(dt,mundo,s.vel);
  } else if(this.tipo==='trex'){
   const max=inp.turbo?13:6.5;
   const alvoV=inp.frente?max:(inp.tras?-2.5:0);
   s.vel=THREE.MathUtils.lerp(s.vel,alvoV,Math.min(1,dt*(alvoV?1.6:3)));
   s.ry+=(inp.esq-inp.dir)*1.3*dt*(.5+Math.min(1,Math.abs(s.vel)/6)*.5);
   this.mover(dt,mundo,s.vel);
  } else if(this.tipo==='helicoptero'){
   s.motor=Math.min(1,s.motor+dt/2.5);
   const pode=s.motor>.8;
   const alvoV=pode&&s.y>1?(inp.frente?48*(inp.turbo?1.2:1):(inp.tras?-14:0)):0;
   s.vel=THREE.MathUtils.lerp(s.vel,alvoV,Math.min(1,dt*.8));
   const yaw=(inp.esq-inp.dir)*1.1;s.ry+=yaw*dt;
   s.vy=THREE.MathUtils.lerp(s.vy,pode?(inp.subir-inp.descer)*11:-3,Math.min(1,dt*2.5));
   s.y=THREE.MathUtils.clamp(s.y+s.vy*dt,0,420);
   if(s.y<=0){s.vel*=Math.exp(-4*dt)}
   s.rx=THREE.MathUtils.lerp(s.rx,(s.vel/48)*.22+(alvoV-s.vel)*.004,Math.min(1,dt*2));
   s.rz=THREE.MathUtils.lerp(s.rz,-yaw*.18*Math.min(1,Math.abs(s.vel)/10+.3),Math.min(1,dt*2));
   this.mover(dt,mundo,s.vel,true);
  } else if(this.tipo==='caca'){
   s.motor=THREE.MathUtils.clamp(s.motor+((inp.frente?1:0)-(inp.tras?1:0))*dt*.45,0,1);
   const alvoV=s.motor*125;
   s.vel=THREE.MathUtils.lerp(s.vel,alvoV,Math.min(1,dt*.35));
   const noChao=s.y<=.01,voa=s.vel>58;
   const alvoRoll=noChao?0:-(inp.esq-inp.dir)*1.05;
   s.rz=THREE.MathUtils.lerp(s.rz,alvoRoll,Math.min(1,dt*2.2));
   let alvoPitch=-(inp.subir-inp.descer)*.55;
   if(noChao&&!voa)alvoPitch=0;if(noChao)alvoPitch=Math.min(alvoPitch,0);
   s.rx=THREE.MathUtils.lerp(s.rx,alvoPitch,Math.min(1,dt*1.6));
   if(noChao)s.ry+=(inp.esq-inp.dir)*.45*dt*Math.min(1,s.vel/10);
   else s.ry+=-s.rz*.75*dt*Math.min(1,s.vel/80);
   // volta para a área do mapa
   const lim=Math.max(Math.abs(s.x)-1300,s.z>1700?s.z-1700:0,s.z<-1500?-1500-s.z:0);
   if(lim>0){const ang=Math.atan2(-s.x,200-s.z);let d=ang-s.ry;d=Math.atan2(Math.sin(d),Math.cos(d));s.ry+=Math.sign(d)*Math.min(Math.abs(d),dt*.8)}
   let vy=s.vel*Math.sin(-s.rx);if(!voa&&!noChao)vy=Math.min(vy,0)-(58-s.vel)*.25;
   s.y=Math.max(0,Math.min(600,s.y+vy*dt));
   if(s.y===0&&s.rx<0&&!voa)s.rx=0;
   this.mover(dt,mundo,s.vel*Math.cos(s.rx),true,lim>0);
  }
 }
 mover(dt,mundo,v,voa,livre){
  const s=this.s;let nx=s.x+Math.sin(s.ry)*v*dt,nz=s.z+Math.cos(s.ry)*v*dt;
  if(!voa||s.y<45){
   const alto=voa?mundo.colliders.filter(c=>(c.h||25)>s.y+this.cfg.raio*.5):mundo.colliders;
   const [cx,cz]=mundo.colisao(nx,nz,alto,this.cfg.raio);
   if(Math.hypot(cx-nx,cz-nz)>.01){
    if(Math.abs(s.vel)>8){const p=this.mundo(new THREE.Vector3(0,1,this.cfg.comp*.45));this.efeitos.faiscas(p.x,p.y,p.z,10);this.batida=Math.min(1,Math.abs(s.vel)/30)}
    // Colisao nao paralisa o helicoptero: escorrega e permite sair da parede.
    s.vel*=voa?.55:.25;nx=cx;nz=cz;
   }
  }
  if(!livre&&!voa){const L=mundo.limites;nx=THREE.MathUtils.clamp(nx,L.xMin,L.xMax);nz=THREE.MathUtils.clamp(nz,L.zMin,L.zMax)}
  if(voa&&!livre){nx=THREE.MathUtils.clamp(nx,-1600,1600);nz=THREE.MathUtils.clamp(nz,-1600,1900)}
  s.x=nx;s.z=nz;
 }

 // ---- Animação (todos os navegadores) ----
 animar(dt,t,camera){
  const s=this.s,C=this.cfg;
  if(!this.local&&this.alvo){
   const a=this.alvo,k=Math.min(1,dt*9);
   s.x+=(a.x-s.x)*k;s.y+=(a.y-s.y)*k;s.z+=(a.z-s.z)*k;
   let d=a.ry-s.ry;d=Math.atan2(Math.sin(d),Math.cos(d));s.ry+=d*k;s.rx+=(a.rx-s.rx)*k;s.rz+=(a.rz-s.rz)*k;
   const v0=s.vel;s.vel+=(a.vel-s.vel)*k;s.acel=(s.vel-v0)/Math.max(dt,1e-3);
   if(this.tipo==='helicoptero'||this.tipo==='caca')s.motor=Math.min(1,s.motor+dt*(this.motorista?.5:-.3));
   if(this.motorista&&(this.tipo==='carro'||this.tipo==='moto'))s.esterco=THREE.MathUtils.lerp(s.esterco,THREE.MathUtils.clamp(d*4,-.5,.5),k);
  }
  if(!this.motorista&&!this.local){s.motor=Math.max(0,s.motor-dt*.25)}
  const voando=s.y>.5;
  this.raiz.position.set(s.x,s.y,s.z);
  this.raiz.rotation.set((this.tipo==='helicoptero'||this.tipo==='caca')?s.rx:0,s.ry,(this.tipo==='caca'||this.tipo==='helicoptero')?s.rz:0);
  // suspensão e inclinações por tipo
  const c=this.corpo;
  if(this.tipo==='carro'){
   s.giro+=s.vel*dt/(C.rodas[0][2]*this.escala);
   this.uni.uGiro.value=s.giro;this.uni.uEsterco.value=s.esterco;
   const quique=Math.sin(t*17)*.006*Math.min(1,Math.abs(s.vel)/10);
   c.rotation.x=THREE.MathUtils.lerp(c.rotation.x,THREE.MathUtils.clamp(-s.acel*.004,-.05,.05),Math.min(1,dt*5));
   c.rotation.z=THREE.MathUtils.lerp(c.rotation.z,THREE.MathUtils.clamp((s.lat||s.vel*s.esterco*.6)*.0045,-.07,.07),Math.min(1,dt*5));
   c.position.y=quique+(this.batida||0)*Math.sin(t*40)*.05;
   const freando=s.acel<-4;for(const l of this.lanternas||[])l.material.opacity=freando?1:.45;for(const l of this.farois||[])l.material.opacity=this.motorista||this.local?1:.15;
  }
  if(this.tipo==='moto'){
   s.giro+=s.vel*dt/(C.rodas[0][2]*this.escala);
   this.uni.uGiro.value=s.giro;this.uni.uEsterco.value=s.esterco*.7;
   const deita=THREE.MathUtils.clamp(-(s.lat||s.vel*s.esterco)*.035,-.75,.75)*Math.min(1,Math.abs(s.vel)/6);
   c.rotation.z=THREE.MathUtils.lerp(c.rotation.z,deita+(this.motorista||this.local?0:.18),Math.min(1,dt*4)); // parada fica no descanso
   c.rotation.x=THREE.MathUtils.lerp(c.rotation.x,THREE.MathUtils.clamp(-s.acel*.006,-.12,.04),Math.min(1,dt*4)); // empina de leve ao acelerar
   c.position.y=Math.max(0,Math.sin(Math.abs(c.rotation.z))*.05);
   for(const l of this.farois||[])l.material.opacity=this.motorista||this.local?1:.15;
  }
  if(this.tipo==='helicoptero'){
   const w=s.motor*s.motor*38;
   if(this.rotor){this.rotor.userData.pas.rotation.y+=w*dt;this.rotor.userData.disco.material.opacity=Math.min(.35,s.motor*.4)}
   if(this.rotorC){this.rotorC.rotation.x+=w*1.6*dt;this.rotorC.userData.disco.material.opacity=Math.min(.3,s.motor*.35)}
   if(s.motor>.3&&s.y<25){const p=this.raiz.position;this.efeitos.poeira(p.x,p.z,(25-s.y)*.25+4,s.motor*(1-s.y/25)*1.5)}
   c.position.y=voando?Math.sin(t*1.7)*.12:0;
  }
  if(this.tipo==='caca'){
   chamaMat.uniforms.uT.value=t;
   const f=this.motorista||this.local?.25+s.motor*.95:0;
   for(const g of this.chamas||[]){g.userData.f.scale.set(1,1,.4+f*1.2+Math.random()*.08);g.userData.f.visible=f>.05;g.userData.b.material.opacity=Math.min(1,f);
    if(f>.8&&Math.random()<.5){const p=g.getWorldPosition(new THREE.Vector3()),d=this.frente().multiplyScalar(-14);this.efeitos.chama(p.x,p.y,p.z,d.x,d.y,d.z,1.1)}}
   chamaMat.uniforms.uForca.value=1;
  }
  if(this.piscas){const on=(t%1.2)<.12;for(const b of this.piscas)b.material.opacity=on?1:.0}
  if(this.tipo==='trex'){
   s.fase+=dt*Math.abs(s.vel)*1.05;
   const andar=Math.min(1,Math.abs(s.vel)/5);
   this.uni.uFase.value=s.fase*Math.sign(s.vel||1);this.uni.uAndar.value=THREE.MathUtils.lerp(this.uni.uAndar.value,andar,Math.min(1,dt*4));
   // respiração/olhar parado, investida na mordida, cabeça para cima no rugido
   s.golpe=Math.max(0,s.golpe-dt);s.rugido=Math.max(0,(s.rugido||0)-dt);
   const g=s.golpe>0?Math.sin((1-s.golpe/.55)*Math.PI):0;
   const r=s.rugido>0?Math.sin(Math.min(1,(1.6-s.rugido)/.4)*Math.PI/2)*Math.min(1,s.rugido/.3):0;
   this.uni.uCabeca.value=Math.sin(t*1.3)*.04+g*.35-r*.45;
   this.uni.uBoca.value=.05+g*.35+r*.55+Math.max(0,Math.sin(t*.7))*.04;
   this.uni.uCauda.value=-(s.lat||0)*.002;
   c.rotation.z=Math.sin(s.fase)*.025*andar;c.rotation.x=g*.05-r*.05;
   if(andar>.6&&Math.floor(s.fase/Math.PI)!==this.passo){this.passo=Math.floor(s.fase/Math.PI);const p=this.raiz.position;this.efeitos.pegadas(p.x,p.z)}
  }
  this.batida=Math.max(0,(this.batida||0)-dt*2);
  // escapamento e fumaça quando danificado
  if(this.escapes&&(this.motorista||this.local))for(const e of this.escapes){const p=this.mundo(e),b=this.frente().multiplyScalar(-1.5);this.efeitos.escapamento(p.x,p.y,p.z,b.x,b.z,Math.min(1,.3+Math.abs(s.acel)*.05))}
  if(this.ativo&&this.max&&this.vida/this.max<.35&&Math.random()<.4){const p=this.mundo(new THREE.Vector3(0,this.cfg.comp*.12,this.cfg.comp*.15));this.efeitos.fumacaRastro(p.x,p.y,p.z,1.4)}
 }
 // Míssil sai do pilone: esconde por um instante e volta (recarga).
 lancar(i){const m=this.misseis?.[i%this.misseis.length];if(!m)return null;const p=m.getWorldPosition(new THREE.Vector3());m.visible=false;setTimeout(()=>{m.visible=true},1200);return p}
 seatWorld(){return this.assento?this.mundo(this.assento):this.raiz.position.clone()}
}
