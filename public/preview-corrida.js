import * as THREE from 'three';
import {dressAvatar,animateAvatar,updateAvatarMixers,baseStatus} from './avatar.js';
const canvas=document.querySelector('#preview3d');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power',alpha:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(1.35,window.devicePixelRatio||1));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(37,1,.08,100);
camera.position.set(3.4,2.25,6.1);camera.lookAt(0,1.05,0);
const amb=new THREE.HemisphereLight(0xbefce2,0x29424c,2.2);scene.add(amb);
const key=new THREE.DirectionalLight('#fff2dc',3.4);key.position.set(3,7,6);scene.add(key);
const rim=new THREE.DirectionalLight('#72f9d2',2.2);rim.position.set(-4,5,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.CircleGeometry(5,64),new THREE.MeshStandardMaterial({color:'#1c4340',roughness:.9}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.025;scene.add(floor);
const rings=[];
for(const radius of [1.3,2.4,3.8]){const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.009,100),new THREE.MeshBasicMaterial({color:'#66c4ae',transparent:true,opacity:.3,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.003;scene.add(ring);rings.push(ring)}
const avatar=new THREE.Group();scene.add(avatar);
dressAvatar(avatar,{base:'homem',outfit:'terno-faixa',team:'vermelho'});
const labels={idle:'PARADO',walk:'ANDANDO',run:'CORRENDO'};
let mode='idle';let auto=false;
function select(next){mode=next;document.querySelector('#mode-label').textContent=labels[next];for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===next));}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{auto=false;select(b.dataset.mode)}));
window.setPreviewMode=select;window.previewModel=avatar;
window.__avatarPreviewScene={scene,camera,renderer,paused:false};
const params=new URLSearchParams(location.search);
if(params.has('demo'))auto=true;
function size(){const w=canvas.clientWidth||900,h=canvas.clientHeight||600;
const pw=Math.round(w*renderer.getPixelRatio()),ph=Math.round(h*renderer.getPixelRatio());
if(canvas.width!==pw||canvas.height!==ph){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
let last=performance.now(),elapsed=0;
function animate(now){
requestAnimationFrame(animate);
if(window.__avatarPreviewScene.paused)return;
const dt=Math.min(.06,(now-last)/1000||0);last=now;elapsed+=dt;size();
if(auto){const cycle=elapsed%11;select(cycle<2?'idle':cycle<5?'walk':cycle<9?'run':'idle')}
const time=now/1000;
animateAvatar(avatar,mode!=='idle',time,mode==='run'?2.3:1.35);
updateAvatarMixers(avatar,dt);
// O clipe deve mostrar o contato real, sem deslocamento vertical artificial na prévia.
avatar.position.y=0;
avatar.rotation.y=Math.sin(time*.26)*.12;
const holder=avatar.userData.baseModel;
const rigged=Boolean(holder?.userData.run);
const fallback=baseStatus.get('homem')==='faltando';
document.querySelector('#rig-status').innerHTML=rigged?'<strong>Esqueleto original carregado</strong><div>Walk + corrida independente, com transição entre clipes e mesmo rig.</div>':fallback?'<strong>Boneco procedural ativo</strong><div>O modelo esquelético remoto não carregou; mostrando movimento de reserva.</div>':'<strong>Carregando rig...</strong><div>Verificando personagem e animações.</div>';
window.__avatarPreviewStatus={mode,rigged,fallback,elapsed};
renderer.render(scene,camera);
}
requestAnimationFrame(animate);
