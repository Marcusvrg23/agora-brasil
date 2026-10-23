import * as THREE from 'three';
import {validarArquivoFoto} from './personagens.mjs';
const overlays=new WeakMap();
export async function aplicarRostoLocal(avatar,file){
 const error=validarArquivoFoto(file);if(error)throw new Error(error);
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Foto ilegível.'));i.src=url;});
  const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');
  const tam=Math.min(img.width,img.height),x=(img.width-tam)/2,y=(img.height-tam)/2;
  ctx.drawImage(img,x,y,tam,tam,0,0,256,256);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  limparRostoLocal(avatar);const head=avatar.userData.rig?.getObjectByName('avatar-head');
  if(!head){tex.dispose();throw new Error('Selecione um boneco procedimental para aplicar uma foto.');}
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.204,.235),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  mesh.position.set(0,0,.13);mesh.rotation.x=-.06;mesh.name='foto-facial-local';head.add(mesh);overlays.set(avatar,mesh);return true;
 }finally{URL.revokeObjectURL(url)}
}
export function limparRostoLocal(avatar){const old=overlays.get(avatar);if(old){old.parent?.remove(old);old.geometry.dispose();old.material.map?.dispose();old.material.dispose();overlays.delete(avatar)}}
