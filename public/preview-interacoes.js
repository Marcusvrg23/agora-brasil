import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js';
import {poseParaVeiculo,ritmoDeVeiculo,deveExibirPiloto} from './montaria.mjs';
import {dressAvatar,animateAvatar,updateAvatarMixers,poseAvatar} from './avatar.js';

const HF='https://d8j0ntlcm91z4.cloudfront.net/user_3KLobL96cAs3bokj0G7CRMHMham/hf_20261021_';
const SOURCES={
 trex:{name:'Dinossauro T-Rex',desc:'Montaria com corpo oscilante e piloto seguindo o assento. A malha original não possui rig.',size:12,local:'/assets/veiculos/trex.glb',remote:HF+'054051_adf5bcf8-7b4b-4ff9-9397-fde6b58754e4.glb',seat:[0,.19,.08],zoom:21,top:.39},
 carro:{name:'Carro esportivo',desc:'Motorista sentado, suspensão e direção simuladas. O painel raio-X revela o piloto na carroceria fechada.',size:4.6,local:'/assets/veiculos/carro.glb',remote:HF+'054039_72ddea93-584e-4119-8d16-b263c8105194.glb',seat:[-.13,.08,.00],zoom:10,top:.33},
 moto:{name:'Motocicleta',desc:'Piloto montado, braços em direção ao guidão e inclinação sincronizada ao movimento.',size:2.5,local:'/assets/veiculos/moto.glb',remote:HF+'054042_70284ae2-93ad-4cce-91ef-73ffeac65aec.glb',seat:[0,.03,-.17],zoom:8.2,top:.57},
 helicoptero:{name:'Helicóptero',desc:'Piloto dentro da cabine, rotor em movimento, oscilações de hover e deslocamento aéreo.',size:14,local:'/assets/veiculos/helicoptero.glb',remote:HF+'054045_47f8d46a-b148-48de-a2a0-8c308403abe2.glb',seat:[0,.03,.10],zoom:23,top:.39},
 caca:{name:'Caça',desc:'Postura de pilotagem, inclinação e propulsão. Cabine transparente somente na ferramenta de inspeção.',size:19,local:'/assets/veiculos/caca.glb',remote:HF+'054048_1c7c5a8a-8be6-447a-b4c7-26963ec14352.glb',seat:[0,.035,.12],zoom:29,top:.27}
};
const labels={trex:'🦖 Dinossauro',carro:'🏎️ Carro',moto:'🏍️ Moto',helicoptero:'🚁 Helicóptero',caca:'✈️ Caça'};
const cnv=document.getElementById('stage'),status=document.getElementById('asset-status'),title=document.getElementById('object-title'),description=document.getElementById('object-desc');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#173045');
scene.fog=new THREE.Fog('#173045',32,80);
const camera=new THREE.PerspectiveCamera(43,1,.08,300);
const renderer=new THREE.WebGLRenderer({canvas:cnv,antialias:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
const orbit=new OrbitControls(camera,cnv);
orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=3;orbit.maxDistance=75;orbit.maxPolarAngle=Math.PI*.52;
scene.add(new THREE.HemisphereLight('#e3f1ff','#344437',2.5));
const sun=new THREE.DirectionalLight('#fff5df',3);sun.position.set(-12,25,20);scene.add(sun);
const rim=new THREE.DirectionalLight('#72dcbf',1.4);rim.position.set(17,11,-19);scene.add(rim);
const ground=new THREE.Mesh(new THREE.CircleGeometry(70,128),new THREE.MeshStandardMaterial({color:'#536266',roughness:.95,metalness:.03}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
const grid=new THREE.GridHelper(130,52,'#6b9d94','#576973');grid.position.y=.015;scene.add(grid);
const inner=new THREE.Mesh(new THREE.RingGeometry(8,8.12,128),new THREE.MeshBasicMaterial({color:'#5acda5',transparent:true,opacity:.55,side:THREE.DoubleSide}));
inner.rotation.x=-Math.PI/2;inner.position.y=.03;scene.add(inner);
const loader=new GLTFLoader();
const holder=new THREE.Group();scene.add(holder);
const vehRoot=new THREE.Group();holder.add(vehRoot);
const riderAnchor=new THREE.Group();vehRoot.add(riderAnchor);
const rider=new THREE.Group();riderAnchor.add(rider);
const overlayGroup=new THREE.Group();vehRoot.add(overlayGroup);
let vehicleModel=null,current='trex',currentConfig=SOURCES.trex,loading=0;
let isModelLoaded=false,rigReady=false,highQuality=false;
const clock=new THREE.Clock();

function shapeFallback(type){
 const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:'#a7b7bd',roughness:.5,metalness:.2});
 const mk=(geo,x,y,z)=>{const p=new THREE.Mesh(geo,m);p.position.set(x,y,z);g.add(p);return p};
 if(type==='trex'){mk(new THREE.CapsuleGeometry(1.2,2,6,12),0,2,0);mk(new THREE.BoxGeometry(1.3,.65,1.1),0,3.6,1.7);mk(new THREE.ConeGeometry(.5,4,12),0,2,-2).rotation.x=Math.PI/2;}
 else if(type==='moto'){mk(new THREE.BoxGeometry(.55,.6,2),0,.7,0);for(const z of [-.7,.7])mk(new THREE.TorusGeometry(.48,.14,8,24),0,.52,z).rotation.y=Math.PI/2;}
 else if(type==='carro'){mk(new THREE.BoxGeometry(2,1.05,4.5),0,.7,0);mk(new THREE.BoxGeometry(1.6,.55,2),0,1.45,0);}
 else if(type==='helicoptero'){mk(new THREE.CapsuleGeometry(1.1,4,6,15),0,1.7,0).rotation.x=Math.PI/2;}
 else{mk(new THREE.ConeGeometry(.7,8,12),0,1,0).rotation.x=Math.PI/2;mk(new THREE.BoxGeometry(9,.15,1.9),0,1,0);}
 return g;
}
function resetRider(){
 for(const child of [...rider.children])rider.remove(child);
 rider.userData={};rider.rotation.set(0,0,0);rider.position.set(0,0,0);
 dressAvatar(rider,{base:'boneco',team:'amarelo',outfit:'camisa',acessorio:'nenhum'});
 rider.scale.setScalar(.86);rigReady=true;
}
function positionCamera(cfg){
 camera.position.set(cfg.zoom*.78, cfg.size*.16+cfg.zoom*.40, cfg.zoom*.78);
 orbit.target.set(0,Math.min(cfg.size*.22,3.2),0);orbit.update();
}
function modelOpaque(xray){
 if(!vehicleModel)return;
 vehicleModel.traverse(o=>{
  if(!o.isMesh)return;
  if(!o.userData.originalMaterials){
   o.userData.originalMaterials=Array.isArray(o.material)?o.material.slice():[o.material];
  }
  const orig=o.userData.originalMaterials;
  if(!orig[0])return;
  if(xray && !o.userData.xrayMaterials){
   o.userData.xrayMaterials=orig.map(m=>{const c=m.clone();c.transparent=true;c.opacity=.42;c.depthWrite=false;c.side=THREE.DoubleSide;return c});
  }
  const chosen=xray?o.userData.xrayMaterials:orig;
  o.material=Array.isArray(o.material)?chosen:chosen[0];
 });
}
async function loadFile(local,remote){
 try{return await loader.loadAsync(local)}
 catch(e){return await loader.loadAsync(remote)}
}
function overlay(type,cfg){
 overlayGroup.clear();
 const mk=(obj,loc)=>{obj.position.set(...loc);overlayGroup.add(obj);return obj};
 const metallic=new THREE.MeshStandardMaterial({color:'#3a4549',metalness:.65,roughness:.31});
 const orange=new THREE.MeshBasicMaterial({color:'#ff914e',transparent:true,opacity:.75});
 if(type==='helicoptero'){
  const blades=new THREE.Group();blades.name='MainRotor';
  for(let i=0;i<4;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(cfg.size*.38,.08,cfg.size*.048),metallic);b.position.x=cfg.size*.18;b.rotation.y=i*Math.PI/2;blades.add(b)}
  mk(blades,[0,cfg.size*.395,cfg.size*.118]);
  overlayGroup.userData.blades=blades;
 }
 if(type==='caca'){
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.42,4,15),orange);
  flame.rotation.x=-Math.PI/2;mk(flame,[0,cfg.size*.09,-cfg.size*.6]);overlayGroup.userData.flame=flame;
 }
}
async function choose(type){
 if(!SOURCES[type])return;
 const seq=++loading,cfg=SOURCES[type];current=type;currentConfig=cfg;status.textContent='Carregando '+cfg.name+'…';
 document.querySelectorAll('.choice').forEach(b=>b.classList.toggle('active',b.dataset.tipo===type));
 title.textContent=cfg.name;description.textContent=cfg.desc;
 if(vehicleModel){vehRoot.remove(vehicleModel);vehicleModel=null}
 overlay(type,cfg);resetRider();isModelLoaded=false;
 positionCamera(cfg);
 // Mostrar o cenário parcialmente renderizado caso haja falha de rede.
 let gltf=null;
 try{gltf=await loadFile(cfg.local,cfg.remote)}
 catch(e){status.textContent='Arquivo GLB não carregado — modelo geométrico alternativo';}
 if(seq!==loading)return;
 const model=gltf?.scene||shapeFallback(type);vehicleModel=model;
 const box=new THREE.Box3().setFromObject(model);
 const size=box.getSize(new THREE.Vector3());
 const len=Math.max(.01,size.z),factor=cfg.size/len;
 model.scale.setScalar(factor);model.updateMatrixWorld(true);
 const bb=new THREE.Box3().setFromObject(model);
 const ctr=bb.getCenter(new THREE.Vector3());
 model.position.set(-ctr.x,-bb.min.y,-ctr.z);
 vehRoot.add(model);
 riderAnchor.position.set(cfg.seat[0]*cfg.size, cfg.seat[1]*cfg.size+cfg.size*.18,cfg.seat[2]*cfg.size);
 rider.position.y=type==='trex'?-1.0:-(type==='moto'?.62:.76);
 rider.rotation.y=Math.PI;
 // Modelos de piloto são visíveis por fora em montarias abertas; x-ray opcional para cabine fechada.
 rider.visible=deveExibirPiloto(type)||document.querySelector('#xray').checked;
 modelOpaque(!deveExibirPiloto(type)&&document.querySelector('#xray').checked);
 status.textContent=gltf?('GLB original carregado · '+labels[type]):('Prévia geométrica · '+labels[type]);
 isModelLoaded=true;window.__agoraPreviewStatus={ready:true,type,original:!!gltf,loadedAt:Date.now()};
}
function resize(){const w=Math.max(1,cnv.clientWidth),h=Math.max(1,cnv.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
const observer=new ResizeObserver(resize);observer.observe(cnv);
document.querySelector('#choices').addEventListener('click',e=>{const b=e.target.closest('[data-tipo]');if(b)choose(b.dataset.tipo)});
document.querySelector('#reset').addEventListener('click',()=>positionCamera(currentConfig));
document.querySelector('#xray').addEventListener('change',e=>{rider.visible=deveExibirPiloto(current)||e.target.checked;modelOpaque(!deveExibirPiloto(current)&&e.target.checked)});
document.querySelector('#speed').addEventListener('input',e=>{document.getElementById('speed-value').textContent=e.target.value+'%'});
let t=0;
function loop(){
 requestAnimationFrame(loop);
 const dt=Math.min(clock.getDelta(),.05);
 const play=document.querySelector('#play').checked;const sp=Number(document.querySelector('#speed').value)/100;
 if(play)t+=dt*sp;
 const cfg=currentConfig,type=current;
 vehRoot.rotation.set(0,0,0);vehRoot.position.set(0,0,0);
 if(type==='trex'){vehRoot.position.y=Math.abs(Math.sin(t*4))*.17;vehRoot.rotation.z=Math.sin(t*2)*.028;vehRoot.rotation.y=Math.sin(t*.9)*.16}
 else if(type==='carro'){vehRoot.rotation.z=Math.sin(t*1.5)*.042;vehRoot.rotation.x=Math.sin(t*2.3)*.028;vehRoot.position.y=Math.abs(Math.sin(t*7))*.025}
 else if(type==='moto'){vehRoot.rotation.z=Math.sin(t*1.3)*.24;vehRoot.position.y=Math.abs(Math.sin(t*4.7))*.05}
 else if(type==='helicoptero'){vehRoot.position.y=.9+Math.sin(t*1.4)*.32;vehRoot.rotation.z=Math.sin(t*.8)*.085;const rotor=overlayGroup.userData.blades;if(rotor)rotor.rotation.y+=dt*sp*29}
 else if(type==='caca'){vehRoot.position.y=2+Math.sin(t*1.2)*.6;vehRoot.rotation.z=Math.sin(t*.8)*.22;vehRoot.rotation.x=Math.sin(t*.5)*.12;
  const f=overlayGroup.userData.flame;if(f)f.scale.y=.75+Math.sin(t*19)*.17}
 const phase=ritmoDeVeiculo(type,t,10);animateAvatar(rider,false,t);poseAvatar(rider,poseParaVeiculo(type),.5+.5*Math.sin(phase));updateAvatarMixers(rider,dt);
 orbit.update();renderer.render(scene,camera);
}
window.__agoraSelect=choose;
window.__agoraPreviewStatus={ready:false,type:null,original:false};
choose('trex');resize();loop();
