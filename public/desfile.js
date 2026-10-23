import * as THREE from 'three';

// Multidão exclusivamente visual, determinística e local.
// Instâncias são desenhadas em lotes; jamais entram no WebSocket, votos ou contagem online.
export const MAX_FIGURANTES=2000;
export const QUANTIDADES=Object.freeze([0,180,300,600,1200,2000]);
export const NOMES=Object.freeze([
 'Rafael','Gabriel','Ana','João','Maria','Lucas','Fernanda','Pedro','Lia','Caio',
 'Bianca','Bruno','Camila','Sofia','Eduardo','Marina','Felipe','Juliana','Luiza','Daniel',
 'Patrícia','Amanda','Ricardo','Aline','Marcos','Clara','Helena','Gustavo','Davi','Nina',
 'Renata','Tiago','Carla','Samuel','Júlia','Vitor','Mateus','Alice','Beatriz','Rodrigo',
 'Paulo','Isabela','Letícia','André','Vinícius','Miguel','Yasmin','Carlos','Laura','Diego'
]);
export const CARTAZES=Object.freeze([
 {team:0,text:'LULA 13',cor:'#f9e6e6',tinta:'#921b26'},
 {team:0,text:'PAZ E RESPEITO',cor:'#fff8ec',tinta:'#173047'},
 {team:0,text:'DIÁLOGO JÁ',cor:'#fff8ec',tinta:'#173047'},
 {team:1,text:'BOLSONARO 22',cor:'#eff5e4',tinta:'#1f632e'},
 {team:1,text:'PAZ E RESPEITO',cor:'#fff8ec',tinta:'#173047'},
 {team:1,text:'DIÁLOGO JÁ',cor:'#fff8ec',tinta:'#173047'}
]);
export function quantidadeInicial({mobile=false,alto=false,param=null}={}){
 const val=Number(param);
 if(param!==null && QUANTIDADES.includes(val))return val;
 return mobile?180:(alto?600:300);
}
export function posicaoFigurante(id,t=0,total=600){
 const lado=id%2===0?-1:1,faixa=Math.floor(id/2)%10,fileira=Math.floor(id/20);
 // 20 colunas e até 100 fileiras, com representantes de ambas as cores alternados.
 // Distribuir o total evita sobreposição entre pessoas mesmo no perfil de 2.000.
 const linhas=Math.max(1,Math.ceil(total/20)),espaco=Math.max(120,Math.min(420,linhas*4.2));
 const passo=linhas>1?espaco/(linhas-1):0;
 const x=lado*(8+faixa*3.65)+Math.sin(id*2.19)*.65;
 const z=-125+fileira*passo+Math.sin(id*1.37)*.45;
 const wobble=Math.sin(t*.48+id*.71),drift=Math.sin(t*.12+id*.17)*2.6;
 return {x:x+drift, z:z+wobble*1.5,team:id%2};
}
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
   legs:inst(new THREE.BoxGeometry(.41,.68,.23),calca,a.length),
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
 function matrix(mesh,i,x,y,z,sizeX=1,sizeY=1,sizeZ=1,yaw=0){
  dummy.position.set(x,y,z);dummy.rotation.set(0,yaw,0);
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
    matrix(m.legs,index,p.x,.42+sway*.4,p.z,1,1,1,heading);
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
 const labels=Array.from({length:Math.min(20,quantidade)},(_,idx)=>{
  const label=simpleLabel(NOMES[idx%NOMES.length]);scene.add(label);return label;
 });
 let accumulator=0,lastView=0;
 function setQuantidade(n){
  if(!QUANTIDADES.includes(n))return false;
  crowd.dispose();quantidade=n;crowd=buildCrowd(scene,n);
  for(const l of labels)l.visible=false;
  return true;
 }
 function update(dt,t,camera){
  accumulator+=dt;if(accumulator>=.12){crowd.update(t);cars.update(t);accumulator=0;}
  if(t-lastView<.4)return;lastView=t;
  let visible=0;
  for(let i=0;i<quantidade&&visible<labels.length;i++){
   const p=posicaoFigurante(i,t,quantidade),dist=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);
   if(dist<32&&dist>2){
    const label=labels[visible++];label.position.set(p.x,3.05,p.z);label.visible=true;
    if(label.userData.previous!==NOMES[i%NOMES.length]){
      label.material.map.dispose();label.material.dispose();
      const replacement=simpleLabel(NOMES[i%NOMES.length]);
      label.material=replacement.material;label.userData.previous=NOMES[i%NOMES.length];
    }
   }
  }
  for(let j=visible;j<labels.length;j++)labels[j].visible=false;
 }
 return {update,setQuantidade,get count(){return quantidade},dispose(){
  crowd.dispose();cars.dispose();for(const label of labels){scene.remove(label);label.material.map.dispose();label.material.dispose();}
 }};
}
