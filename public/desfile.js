import * as THREE from 'three';

// Multidão exclusivamente visual, determinística e local.
// Instâncias são desenhadas em lotes; jamais entram no WebSocket, votos ou contagem online.
import {CARTAZES,QUANTIDADES,NOMES,quantidadeInicial,posicaoFigurante} from './desfile-dados.mjs';
function cartazTexture({text,cor,tinta}){
 const c=document.createElement('canvas');c.width=512;c.height=284;
 const ctx=c.getContext('2d');ctx.fillStyle=cor;ctx.fillRect(0,0,c.width,c.height);
 ctx.strokeStyle='#20292e';ctx.lineWidth=14;ctx.strokeRect(8,8,496,268);
 ctx.fillStyle=tinta;ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 62px system-ui';let size=62;
 while(ctx.measureText(text).width>468 && size>26){size-=2;ctx.font='bold '+size+'px system-ui';}
 ctx.fillText(text,256,142);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;
 return tex;
}
function simpleLabel(name){
 const c=document.createElement('canvas');c.width=256;c.height=64;
 const ctx=c.getContext('2d');ctx.fillStyle='#092438df';ctx.fillRect(0,4,256,55);
 ctx.fillStyle='#ffffff';ctx.font='bold 27px system-ui';ctx.textAlign='center';ctx.fillText(name,128,41);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false,transparent:true}));
 sprite.scale.set(2.8,.7,1);return sprite;
}
function buildCrowd(scene,quantidade){
 const root=new THREE.Group();root.name='figurantes-simulados';scene.add(root);
 const groups=[[],[]];
 for(let id=0;id<quantidade;id++)groups[id%2].push({id,index:groups[id%2].length});
 const dummy=new THREE.Object3D(), meshes=[], marks=[];
 function inst(geometry,material,n){
  const m=new THREE.InstancedMesh(geometry,material,n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;
  m.castShadow=false;m.receiveShadow=false;root.add(m);meshes.push(m);return m;
 }
 const teamMeshes=groups.map((a,team)=>{
  const cor=team===0?'#bf3443':'#d1ba3e';
  const camiseta=new THREE.MeshLambertMaterial({color:cor});
  const pele=new THREE.MeshLambertMaterial({color:'#cba17e'});
  const calca=new THREE.MeshLambertMaterial({color:'#333a48'});
  const haste=new THREE.MeshBasicMaterial({color:'#5d5345'});
  return {
   body:inst(new THREE.BoxGeometry(.58,.77,.29),camiseta,a.length),
   head:inst(new THREE.SphereGeometry(.17,6,5),pele,a.length),
   leftLeg:inst(new THREE.BoxGeometry(.18,.68,.23),calca,a.length),
   rightLeg:inst(new THREE.BoxGeometry(.18,.68,.23),calca,a.length),
   leftArm:inst(new THREE.BoxGeometry(.15,.57,.18),pele,a.length),
   rightArm:inst(new THREE.BoxGeometry(.15,.57,.18),pele,a.length),
   pole:inst(new THREE.CylinderGeometry(.014,.014,1.4,5),haste,a.length),
   signs: Array.from({length:3},(_,idx)=>{
    const tex=cartazTexture(CARTAZES[team*3+idx]);
    const material=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,transparent:false});
    marks.push({tex,material});
    return inst(new THREE.PlaneGeometry(1.2,.72),material,a.filter((b)=>b.id%6===team+idx*2).length);
   }),
  };
 });
 // Indexação de cada placa: garantimos que as contagens correspondam ao total de variantes.
 const signsIndex=[Array(3).fill(0),Array(3).fill(0)];
 function matrix(mesh,i,x,y,z,sizeX=1,sizeY=1,sizeZ=1,yaw=0,tilt=0){
  dummy.position.set(x,y,z);dummy.rotation.set(0,yaw,tilt);
  dummy.scale.set(sizeX,sizeY,sizeZ);dummy.updateMatrix();
  mesh.setMatrixAt(i,dummy.matrix);
 }
 function update(t){
  for(const [team,people] of groups.entries()){
   const m=teamMeshes[team], counters=signsIndex[team];counters.fill(0);
   for(const {id,index} of people){
    const p=posicaoFigurante(id,t,quantidade),sway=Math.sin(t*1.7+id*2.17)*.08;
    const heading=Math.sin(id*.36+t*.16)*.35;
    matrix(m.body,index,p.x,1.12+sway,p.z,1,1,1,heading);
    matrix(m.head,index,p.x,1.74+sway,p.z,1,1,1,heading);
    const passo=Math.sin(t*2.5+id*1.2)*.11;
    matrix(m.leftLeg,index,p.x-.15,.42+sway*.4,p.z+passo,1,1,1,heading);
    matrix(m.rightLeg,index,p.x+.15,.42+sway*.4,p.z-passo,1,1,1,heading);
    matrix(m.leftArm,index,p.x-.37,1.25+sway,p.z,1,1,1,heading,-.08);
    matrix(m.rightArm,index,p.x+.33,1.39+sway,p.z+.2,1,1,1,heading,-.35);
    matrix(m.pole,index,p.x+.42,2.0+sway,p.z+.19,1,1,1,heading);
    const variant=Math.floor(id/2)%3;
    matrix(m.signs[variant],counters[variant]++,p.x+.42,2.66+sway,p.z+.19,1,1,1,heading);
   }
  }
  for(const mesh of meshes)mesh.instanceMatrix.needsUpdate=true;
 }
 update(0);
 return {root,update,dispose(){
  scene.remove(root);
  for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}
  for(const mark of marks)mark.tex.dispose();
 }};
}
function buildCaravan(scene){
 const root=new THREE.Group();root.name='carreata-simulada';scene.add(root);
 const bodyGeo=new THREE.BoxGeometry(2.3,.9,4.6);
 const cabGeo=new THREE.BoxGeometry(1.9,.75,2.2);
 const poleGeo=new THREE.CylinderGeometry(.035,.035,2.8,6);
 const flagGeo=new THREE.PlaneGeometry(1.2,.75);
 const cars=[];
 for(let team=0;team<2;team++){
  const grp=new THREE.Group();root.add(grp);
  const paint=new THREE.MeshLambertMaterial({color:team===0?'#bb3b45':'#427d4e'});
  const body=new THREE.Mesh(bodyGeo,paint);body.position.y=.95;grp.add(body);
  const cab=new THREE.Mesh(cabGeo,new THREE.MeshLambertMaterial({color:'#9aabb3'}));cab.position.set(0,1.64,-.25);grp.add(cab);
  const pole=new THREE.Mesh(poleGeo,new THREE.MeshLambertMaterial({color:'#737474'}));pole.position.set(0,2.9,-1.5);grp.add(pole);
  const tex=cartazTexture(CARTAZES[team*3]);
  const flag=new THREE.Mesh(flagGeo,new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));flag.position.set(0,4.1,-1.5);grp.add(flag);
  cars.push({team,grp,paint,cab,pole,flag,tex});
 }
 const convoys=[];
 for(let team=0;team<2;team++)for(let n=0;n<12;n++){
  const clone=cars[team].grp.clone();
  clone.position.set(team===0?-59:59,0,-120+n*23);
  root.add(clone);convoys.push({team,n,clone});
 }
 for(const prefab of cars)prefab.grp.visible=false;
 function update(t){
  for(const v of convoys){
   const z=((v.n*23+t*4.6+130)%350)-160;
   // Corredores laterais: deixam a região central livre aos jogadores.
   v.clone.position.set(v.team===0?-58:58,0,z);
   v.clone.rotation.y=v.team===0?0:Math.PI;
  }
 }
 update(0);
 return {update,dispose(){
  scene.remove(root);bodyGeo.dispose();cabGeo.dispose();poleGeo.dispose();flagGeo.dispose();
  for(const c of cars){c.paint.dispose();c.cab.material.dispose();c.pole.material.dispose();c.flag.material.dispose();c.tex.dispose();}
 }};
}
export function iniciarDesfile(scene,{mobile=false,alto=false,param=null}={}){
 let quantidade=quantidadeInicial({mobile,alto,param}),crowd=buildCrowd(scene,quantidade);
 const cars=buildCaravan(scene);
 // Nomes reais na interface, mas rótulo global informa que não são participantes conectados.
 const labels=Array.from({length:20},(_,idx)=>{
  const label=simpleLabel(NOMES[idx%NOMES.length]);scene.add(label);return label;
 });
 let accumulator=0,lastView=0,frames=0,dtSum=0,lastReduce=-100;
 function setQuantidade(n){
  if(!QUANTIDADES.includes(n))return false;
  crowd.dispose();quantidade=n;crowd=buildCrowd(scene,n);
  for(const l of labels)l.visible=false;
  return true;
 }
 function update(dt,t,camera){
  accumulator+=dt;if(accumulator>=.12){crowd.update(t);cars.update(t);accumulator=0;}
  // Reduz o número de figurantes se o FPS cair de modo sustentado; não afeta usuários reais.
  dtSum+=dt;frames++;
  let reduced=false;
  if(frames>=120){
   const mean=dtSum/frames;dtSum=0;frames=0;
   if(mean>.042&&quantidade>180&&t-lastReduce>14){
    const idx=QUANTIDADES.indexOf(quantidade);
    if(idx>1){setQuantidade(QUANTIDADES[idx-1]);lastReduce=t;reduced=true;}
   }
  }
  if(t-lastView<.4)return reduced;lastView=t;
  let visible=0;
  for(let i=0;i<quantidade&&visible<labels.length;i++){
   const p=posicaoFigurante(i,t,quantidade),dist=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);
   if(dist<65&&dist>2){
    const label=labels[visible++];label.position.set(p.x,3.05,p.z);label.visible=true;
    if(label.userData.previous!==NOMES[i%NOMES.length]){
      label.material.map.dispose();label.material.dispose();
      const replacement=simpleLabel(NOMES[i%NOMES.length]);
      label.material=replacement.material;label.userData.previous=NOMES[i%NOMES.length];
    }
   }
  }
  for(let j=visible;j<labels.length;j++)labels[j].visible=false;
  return reduced;
 }
 return {update,setQuantidade,get count(){return quantidade},dispose(){
  crowd.dispose();cars.dispose();for(const label of labels){scene.remove(label);label.material.map.dispose();label.material.dispose();}
 }};
}
