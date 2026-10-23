import * as THREE from 'three';
import {BOT_SEEDS} from './bot-paths.mjs';
import {dressAvatar,animateAvatar,updateAvatarMixers,poseAvatar,aplicarPoseAtual,maoDoAvatar} from './avatar.js';

// Multidão exclusivamente visual, determinística e local.
// Instâncias são desenhadas em lotes; jamais entram no WebSocket, votos ou contagem online.
import {CARTAZES,QUANTIDADES,NOMES,quantidadeInicial,posicaoFigurante,varianteFigurante,CARTAZ_POR_PERFIL} from './desfile-dados.mjs';
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
function lookDaSemente(i){
 const b=BOT_SEEDS[i];
 return {base:b.base,team:b.team,outfit:i%2?'terno-faixa':'camisa',
  pele:i%3===0?'#a76a48':'#c99a74',cabelo:'#292320',
  calca:'#242a39',terno:'#28324a',acessorio:'nenhum',cabeloEstilo:'auto'};
}
function criarPlaca(spec){
 const grupo=new THREE.Group();grupo.name='cartaz-em-mãos';
 const madeira=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1.25,6),
  new THREE.MeshLambertMaterial({color:'#7a5536'}));
 madeira.position.y=.62;grupo.add(madeira);
 const tex=cartazTexture(spec);
 const board=new THREE.Mesh(new THREE.PlaneGeometry(1.28,.71),
  new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
 board.position.y=1.35;grupo.add(board);
 return {grupo,board,tex};
}
function encaixarPlaca(avatar,placa){
 avatar.updateMatrixWorld(true);
 const hand=maoDoAvatar(avatar,'D');
 if(hand){
  const position=new THREE.Vector3();
  hand.mao.getWorldPosition(position);
  placa.grupo.position.copy(position);
 }else{
  // Mesma posição sobre o avatar original quando a malha remota não expõe ossos.
  placa.grupo.position.copy(avatar.position).add(new THREE.Vector3(.28,1.05,.25));
 }
 placa.grupo.rotation.set(0,avatar.rotation.y,0);
}
function criarEtiqueta(nome){
 const c=document.createElement('canvas');c.width=256;c.height=64;
 const g=c.getContext('2d');g.fillStyle='#0a2039e8';g.fillRect(0,5,256,52);
 g.fillStyle='#fff';g.textAlign='center';g.font='bold 27px system-ui';g.fillText(nome,128,41);
 const texture=new THREE.CanvasTexture(c);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
 sprite.scale.set(2.25,.56,1);return sprite;
}
function buildCrowd(scene,renderer,quantidade,{mobile=false}={}){
 const root=new THREE.Group();root.name='figurantes-mesmos-6-modelos';scene.add(root);
 const facade=new THREE.Group();root.add(facade);
 let groups,mesh;
 const dummy=new THREE.Object3D();
 const tex=[null,null,null,null,null,null];
 function createInstances(n){
  groups=Array.from({length:6},()=>[]);
  for(let id=0;id<n;id++)groups[varianteFigurante(id)].push(id);
  mesh=groups.map((ids,i)=>{
   const plane=new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.30,2.82),
    new THREE.MeshBasicMaterial({map:tex[i],color:'#ffffff',transparent:true,alphaTest:.08,depthWrite:false,side:THREE.DoubleSide}),
    ids.length
   );
   plane.frustumCulled=false;plane.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   facade.add(plane);return plane;
  });
 }
 createInstances(quantidade);
 const avatars=[];
 const LIMIT=mobile?24:48; // máximo de mixers de personagens detalhados ao mesmo tempo
 for(let i=0;i<6;i++)for(let k=0;k<LIMIT/6;k++){
  const avatar=new THREE.Group();avatar.scale.setScalar(.84);
  dressAvatar(avatar,lookDaSemente(i));avatar.visible=false;root.add(avatar);
  const item=CARTAZES[CARTAZ_POR_PERFIL[i]];
  const sign=criarPlaca(item);
  sign.grupo.visible=false;root.add(sign.grupo);
  const label=criarEtiqueta(NOMES[k%NOMES.length]);label.visible=false;root.add(label);
  avatars.push({i,id:-1,avatar,sign,label});
 }
 const stage=new THREE.Scene();
 stage.add(new THREE.HemisphereLight('#ffffff','#86909d',2.25));
 const lamp=new THREE.DirectionalLight('#fff2de',2.1);lamp.position.set(-3,6,7);stage.add(lamp);
 const stageCam=new THREE.PerspectiveCamera(33,384/640,.1,40);
 stageCam.position.set(0,1.5,5.6);stageCam.lookAt(0,1.47,0);
 const stageAvatars=Array.from({length:6},(_,i)=>{
  const avatar=new THREE.Group();avatar.scale.setScalar(.84);
  dressAvatar(avatar,lookDaSemente(i));stage.add(avatar);
  const item=CARTAZES[CARTAZ_POR_PERFIL[i]];
  const sign=criarPlaca(item);stage.add(sign.grupo);
  return {avatar,sign};
 });
 const target=new THREE.WebGLRenderTarget(384,640,{format:THREE.RGBAFormat,depthBuffer:true});
 const pixels=new Uint8Array(384*640*4);
 let destroyed=false,prepared=false,renderCount=0,lastRender=0;
 function renderTextures(){
  if(destroyed)return;
  const previousTarget=renderer.getRenderTarget();
  const previousColor=new THREE.Color();renderer.getClearColor(previousColor);
  const previousAlpha=renderer.getClearAlpha();
  const previousAuto=renderer.autoClear;
  renderer.autoClear=true;renderer.setClearColor('#000000',0);
  try{
   for(let i=0;i<6;i++){
    stageAvatars.forEach((s,n)=>{
     s.avatar.visible=n===i;s.sign.grupo.visible=n===i;
     if(n!==i)return;
     animateAvatar(s.avatar,false,0,1);
     poseAvatar(s.avatar,'cartaz');aplicarPoseAtual(s.avatar);
     encaixarPlaca(s.avatar,s.sign);
    });
    renderer.setRenderTarget(target);renderer.clear(true,true,true);renderer.render(stage,stageCam);
    renderer.readRenderTargetPixels(target,0,0,384,640,pixels);
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=640;
    const ctx=canvas.getContext('2d');
    const flipped=new Uint8ClampedArray(pixels.length);
    for(let y=0;y<640;y++){
     const row=384*4;flipped.set(pixels.subarray(y*row,(y+1)*row),(639-y)*row);
    }
    ctx.putImageData(new ImageData(flipped,384,640),0,0);
    const next=new THREE.CanvasTexture(canvas);next.colorSpace=THREE.SRGBColorSpace;
    tex[i]?.dispose();tex[i]=next;
    mesh[i].material.map=next;mesh[i].material.needsUpdate=true;
   }
   prepared=true;
  }catch(error){console.warn('Não foi possível capturar modelos do desfile',error);}
  finally{
   renderer.setRenderTarget(previousTarget);
   renderer.setClearColor(previousColor,previousAlpha);renderer.autoClear=previousAuto;
  }
 }
 // A primeira captura já usa o avatar original procedural; a seguinte usa o GLB do mesmo
 // personagem, após o carregamento. Assim, jamais substituímos por caixas ou esferas.
 function update(t,camera){
  if(renderCount<3&&(renderCount===0||t-lastRender>(renderCount===1?3:8))){
   renderTextures();lastRender=t;renderCount++;
  }
  const nearby=Array.from({length:6},()=>[]);
  const radius=mobile?35:55,rad2=radius*radius;
  for(let id=0;id<quantidade;id++){
   const p=posicaoFigurante(id,t,quantidade);
   const dx=p.x-camera.position.x,dz=p.z-camera.position.z,d2=dx*dx+dz*dz;
   const variant=varianteFigurante(id);
   if(d2<rad2)nearby[variant].push({id,p,d2});
  }
  const used=new Set();
  for(let variant=0;variant<6;variant++){
   nearby[variant].sort((a,b)=>a.d2-b.d2);
   const slots=avatars.filter(a=>a.i===variant);
   for(let k=0;k<slots.length;k++){
    const slot=slots[k],o=nearby[variant][k];
    if(!o){
     slot.id=-1;slot.avatar.visible=false;slot.sign.grupo.visible=false;slot.label.visible=false;
     continue;
    }
    used.add(o.id);
    const av=slot.avatar;
    av.visible=true;
    av.position.set(o.p.x,0,o.p.z);
    av.rotation.y=.18*Math.sin(t*.42+o.id*.73);
    const pace=1.05+.13*Math.sin(o.id);
    animateAvatar(av,true,t+o.id*.31,pace);
    updateAvatarMixers(av,.1);
    poseAvatar(av,'cartaz');aplicarPoseAtual(av);
    encaixarPlaca(av,slot.sign);slot.sign.grupo.visible=true;
    if(slot.id!==o.id){
     slot.id=o.id;
     const previous=slot.label;root.remove(previous);
     previous.material.map.dispose();previous.material.dispose();
     slot.label=criarEtiqueta(NOMES[o.id%NOMES.length]);root.add(slot.label);
    }
    slot.label.visible=o.d2<21*21;
    slot.label.position.set(o.p.x,2.52,o.p.z);
   }
  }
  for(let variant=0;variant<6;variant++){
   const ids=groups[variant],m=mesh[variant];
   for(let i=0;i<ids.length;i++){
    const id=ids[i],p=posicaoFigurante(id,t,quantidade);
    const dx=camera.position.x-p.x,dz=camera.position.z-p.z;
    dummy.position.set(p.x,1.41,p.z);
    dummy.rotation.set(0,Math.atan2(dx,dz),0);
    const scale=used.has(id)||!tex[variant]?0:1;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    m.setMatrixAt(i,dummy.matrix);
   }
   m.instanceMatrix.needsUpdate=true;
  }
 }
 function setQuantidade(n){
  if(destroyed)return;
  for(const plane of mesh){facade.remove(plane);plane.geometry.dispose();plane.material.dispose();}
  quantidade=n;createInstances(n);
 }
 function dispose(){
  destroyed=true;scene.remove(root);target.dispose();
  for(const a of avatars){
   a.label.material.map.dispose();a.label.material.dispose();
   a.sign.board.geometry.dispose();a.sign.board.material.map.dispose();a.sign.board.material.dispose();
   a.sign.grupo.children[0].geometry.dispose();a.sign.grupo.children[0].material.dispose();
  }
  for(let i=0;i<6;i++){
   tex[i]?.dispose();mesh[i].geometry.dispose();mesh[i].material.dispose();
   stageAvatars[i].sign.board.geometry.dispose();stageAvatars[i].sign.board.material.map.dispose();
   stageAvatars[i].sign.board.material.dispose();
   stageAvatars[i].sign.grupo.children[0].geometry.dispose();stageAvatars[i].sign.grupo.children[0].material.dispose();
  }
 }
 return {update,setQuantidade,renderTextures,dispose};
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
export function iniciarDesfile(scene,{renderer,mobile=false,alto=false,param=null}={}){
 if(!renderer)throw new Error('O desfile necessita do renderer para usar os modelos originais.');
 let quantidade=quantidadeInicial({mobile,alto,param});
 const crowd=buildCrowd(scene,renderer,quantidade,{mobile});
 const cars=buildCaravan(scene);
 let accumulator=0,frames=0,dtSum=0,lastReduce=-100;
 function setQuantidade(n){
  if(!QUANTIDADES.includes(n))return false;
  quantidade=n;crowd.setQuantidade(n);
  return true;
 }
 function update(dt,t,camera){
  accumulator+=dt;
  if(accumulator>=.12){crowd.update(t,camera);cars.update(t);accumulator=0;}
  // Reduz a densidade se o dispositivo estiver sobrecarregado.
  dtSum+=dt;frames++;
  let reduced=false;
  if(frames>=120){
   const mean=dtSum/frames;dtSum=0;frames=0;
   if(mean>.042&&quantidade>180&&t-lastReduce>14){
    const idx=QUANTIDADES.indexOf(quantidade);
    if(idx>1){setQuantidade(QUANTIDADES[idx-1]);lastReduce=t;reduced=true;}
   }
  }
  return reduced;
 }
 return {update,setQuantidade,get count(){return quantidade},dispose(){crowd.dispose();cars.dispose()}};
}
