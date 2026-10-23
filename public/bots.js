import * as THREE from 'three';
import {dressAvatar,animateAvatar,updateAvatarMixers,poseAvatar,aplicarPoseAtual} from './avatar.js';
import {criarPlaca,encaixarPlaca} from './desfile.js';
import {CARTAZES,CARTAZ_POR_PERFIL} from './desfile-dados.mjs';
import {BOT_SEEDS,posicaoBot} from './bot-paths.mjs';
// NPCs locais apenas visuais. Não contam como humanos online, não votam ou enviam mensagens.
function etiqueta(nome){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='rgba(5,26,37,.9)';ctx.fillRect(4,6,248,50);
 ctx.strokeStyle='#70e8cb';ctx.strokeRect(4,6,248,50);
 ctx.fillStyle='#d9fff2';ctx.font='bold 25px system-ui';ctx.textAlign='center';
 ctx.fillText(nome,128,40);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false,transparent:true}));
 s.scale.set(3.1,.78,1);return s;
}
export function iniciarBots(scene,colisao,limites){
 const bots=BOT_SEEDS.map((b,i)=>{
  const mesh=new THREE.Group();
  dressAvatar(mesh,{base:b.base,team:b.team,outfit:i%2?'terno-faixa':'camisa',pele:i%3===0?'#a76a48':'#c99a74',
   cabelo:'#292320',calca:'#242a39',terno:'#28324a',acessorio:'nenhum',cabeloEstilo:'auto'});
  mesh.scale.setScalar(.84);
  const p=posicaoBot(b,0);mesh.position.set(p.x,0,p.z);
  scene.add(mesh);
  const label=etiqueta(b.name);label.position.set(p.x,3.1,p.z);scene.add(label);
  const sign=criarPlaca(CARTAZES[CARTAZ_POR_PERFIL[i]]);scene.add(sign.grupo);
  return {...b,mesh,label,sign,xp:p.x,zp:p.z};
 });
 let tick=0;
 function update(dt,t){
  tick+=dt;
  // Caminho suavizado sem ocupar renderização/CPU excessivas.
  const step=Math.min(dt,.05);
  for(const b of bots){
   if(tick>=.08){
    const pos=posicaoBot(b,t);
    let x=Math.max(limites.xMin+2,Math.min(limites.xMax-2,pos.x));
    let z=Math.max(limites.zMin+2,Math.min(limites.zMax-2,pos.z));
    [x,z]=colisao(x,z);
    b.xp=x;b.zp=z;
   }
   const dx=b.xp-b.mesh.position.x,dz=b.zp-b.mesh.position.z;
   const k=Math.min(1,dt*5);
   b.mesh.position.x+=dx*k;b.mesh.position.z+=dz*k;
   if(Math.abs(dx)+Math.abs(dz)>.015)b.mesh.rotation.y=Math.atan2(dx,dz);
   animateAvatar(b.mesh,true,t,b.speed*1.3);
   updateAvatarMixers(b.mesh,step);
   poseAvatar(b.mesh,'cartaz');aplicarPoseAtual(b.mesh);
   encaixarPlaca(b.mesh,b.sign);
   b.label.position.set(b.mesh.position.x,3.1,b.mesh.position.z);
  }
  if(tick>=.08)tick=0;
 }
 return {update,count:bots.length,dispose(){for(const b of bots){
  scene.remove(b.mesh);scene.remove(b.label);scene.remove(b.sign.grupo);
  b.label.material.map.dispose();b.label.material.dispose();
  for(const part of b.sign.grupo.children){
   part.geometry.dispose();part.material.map?.dispose();part.material.dispose();
  }
 }}};
}
