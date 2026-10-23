import * as THREE from 'three';
import {criarCartaz3D} from './cartaz-3d.js';
import {maoDoAvatar,poseAvatar,aplicarPoseAtual} from './avatar.js';
// Cartazes editáveis ficam ligados ao avatar no espaço 3D, não são textos flutuantes.
// O conteúdo é fornecido pelo usuário e validado pelo servidor; os demais apenas renderizam.
export function iniciarCartazes({scene,player,peers,send,meuId}){
 const cartazes=new Map(), val=document.querySelector('#cartaz-input'), aviso=document.querySelector('#cartaz-status');
 function texture(text){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=440;
  const g=canvas.getContext('2d');
  g.fillStyle='#fffbea';g.fillRect(0,0,768,440);
  g.strokeStyle='#1b2830';g.lineWidth=18;g.strokeRect(12,12,744,416);
  g.fillStyle='#132331';g.textAlign='center';g.textBaseline='middle';
  const words=String(text).split(/\s+/).filter(Boolean);
  let lines=[''];for(const w of words){
   const last=lines.length-1, next=(lines[last]+' '+w).trim();
   if(next.length>14&&lines[last]&&lines.length<3)lines.push(w);
   else lines[last]=next;
  }
  const fontSize=lines.length===1?102:lines.length===2?80:66;
  g.font='800 '+fontSize+'px system-ui';
  const scale=Math.min(1,680/Math.max(1,...lines.map(line=>g.measureText(line).width)));
  g.save();g.translate(384,220);g.scale(scale,scale);
  lines.forEach((line,i)=>g.fillText(line,0,(i-(lines.length-1)/2)*(fontSize+12)));
  g.restore();
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
 }
 function remove(id){
  const e=cartazes.get(id);if(!e)return;
  const avatar=id===meuId()?player:peers.get(id);if(avatar?.userData.pose?.nome==='cartaz'){poseAvatar(avatar,null);aplicarPoseAtual(avatar);}
  scene.remove(e.group);e.board.material.map.dispose();e.board.material.dispose();
  e.board.geometry.dispose();e.pole.material.dispose();e.pole.geometry.dispose();cartazes.delete(id);
 }
 function set(id,text){
  remove(id);
  text=String(text||'').trim().slice(0,42);if(!text)return;
  const {group:holder,pole,board}=criarCartaz3D(texture(text));
  holder.name='cartaz-do-participante';
  scene.add(holder);cartazes.set(id,{text,group:holder,pole,board});
 }
 document.querySelector('#cartaz-btn').addEventListener('click',()=>{
  const value=val.value.trim().slice(0,42);
  if(!meuId()){aviso.textContent='Entre na praça para levantar seu cartaz.';return;}
  if(!value){aviso.textContent='Digite uma mensagem para seu cartaz.';return;}
  send({type:'cartaz',text:value});aviso.textContent='Mensagem enviada para validação.';
 });
 document.querySelector('#cartaz-remover').addEventListener('click',()=>{if(meuId())send({type:'cartaz',text:''});val.value='';});
 function mensagem(data){
  if(data.type==='joined'){
   for(const id of [...cartazes.keys()])remove(id);
   (data.peers||[]).forEach(p=>set(p.id,p.cartaz));
   if(data.cartaz){set(meuId(),data.cartaz);val.value=data.cartaz;}
   return false;
  }
  if(data.type==='enter'){set(data.id,data.cartaz);return false;}
  if(data.type==='leave'){remove(data.id);return false;}
  if(data.type==='cartaz'){
   set(data.id,data.text);
   if(data.id===meuId()){aviso.textContent=data.text?'Cartaz aparecendo nas suas mãos.':'Cartaz removido.';val.value=data.text||'';}
   return true;
  }
  return false;
 }
 function update(){
  for(const [id,e] of cartazes){
   const avatar=id===meuId()?player:peers.get(id);
   if(!avatar){e.group.visible=false;continue;}
   e.group.visible=avatar.visible;
   // O cartaz acompanha as mãos e a orientação do personagem, inclusive andando.
   poseAvatar(avatar,'cartaz');
   aplicarPoseAtual(avatar);
   avatar.updateMatrixWorld(true);
   const hand=maoDoAvatar(avatar,'D');
   if(hand)hand.mao.getWorldPosition(e.group.position);
   else e.group.position.copy(avatar.position).add(new THREE.Vector3(.29,1.03,.22));
   e.group.rotation.y=avatar.rotation.y;
   // A posição da mão já inclui a escala do modelo; a haste conserva tamanho real.
   e.group.scale.setScalar(1);
  }
 }
 function reset(){for(const id of [...cartazes.keys()])remove(id);}
 return {mensagem,update,reset,diagnostico:()=>[...cartazes].map(([id,e])=>({id,text:e.text,position:e.group.position.toArray(),haste:e.pole.geometry.parameters.height,placa:e.board.geometry.parameters.height,verso:e.board.children.some(c=>c.name==='verso-legivel')}))};
}
