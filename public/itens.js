import * as THREE from 'three';
// Itens de mão modelados em código, semi-realistas (metal com reflexo do céu, couro, madeira):
// espada alada, arco recurvo com flecha e bomba de pavio. Cada um tem a sua animação:
// - espada: golpe em arco com rastro luminoso;
// - arco: corda puxada, braços do arco flexionam, corda vibra ao soltar, flecha com gravidade;
// - bomba: pavio queimando com faíscas, arremesso girando, quique e explosão.

const aco=()=>new THREE.MeshStandardMaterial({color:'#d9dde2',metalness:1,roughness:.18});
const ouro=()=>new THREE.MeshStandardMaterial({color:'#c99a3a',metalness:1,roughness:.3});
function couroTex(){
 const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#3b2416';g.fillRect(0,0,64,256);
 for(let y=-64;y<256+64;y+=22){g.strokeStyle='#22140b';g.lineWidth=5;g.beginPath();g.moveTo(0,y);g.lineTo(64,y+30);g.stroke();g.strokeStyle='rgba(255,220,180,.12)';g.lineWidth=2;g.beginPath();g.moveTo(0,y+4);g.lineTo(64,y+34);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function madeiraTex(){
 const c=document.createElement('canvas');c.width=64;c.height=512;const g=c.getContext('2d');
 g.fillStyle='#6b4423';g.fillRect(0,0,64,512);
 for(let i=0;i<70;i++){g.strokeStyle=`rgba(${40+Math.random()*30},${22+Math.random()*15},10,${.25+Math.random()*.3})`;g.lineWidth=1+Math.random()*2;const x=Math.random()*64;g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+8,170,x-8,340,x+4,512);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
let _couro,_madeira;const couro=()=>(_couro||=couroTex()),madeira=()=>(_madeira||=madeiraTex());

// ---------- Espada alada ----------
// Lâmina com sulco central (perfil em losango), guarda em forma de asas com penas, punho de couro e pomo.
export function criarEspada(){
 const g=new THREE.Group();g.name='espada';
 const L=1.0,W=.055;
 const lam=new THREE.Shape();lam.moveTo(-W,0);lam.lineTo(-W*.92,L*.82);lam.quadraticCurveTo(-W*.5,L*.96,0,L);lam.quadraticCurveTo(W*.5,L*.96,W*.92,L*.82);lam.lineTo(W,0);lam.closePath();
 const lg=new THREE.ExtrudeGeometry(lam,{depth:.012,bevelEnabled:true,bevelThickness:.01,bevelSize:.012,bevelSegments:2,curveSegments:10});lg.translate(0,0,-.006);
 const lamina=new THREE.Mesh(lg,aco());g.add(lamina);
 const sulco=new THREE.Mesh(new THREE.BoxGeometry(.012,L*.72,.026),new THREE.MeshStandardMaterial({color:'#9aa3ab',metalness:1,roughness:.35}));sulco.position.y=L*.4;g.add(sulco);
 // asas da guarda: penas em leque
 for(const lado of [-1,1]){
  const asa=new THREE.Group();asa.position.set(lado*.035,-.01,0);g.add(asa);
  for(let i=0;i<6;i++){
   const pena=new THREE.Shape();const comp=.13+i*.03,larg=.032;
   pena.moveTo(0,0);pena.quadraticCurveTo(comp*.5,larg,comp,larg*.35);pena.lineTo(comp*.92,-larg*.1);pena.quadraticCurveTo(comp*.5,-larg*.3,0,0);
   const pg=new THREE.ExtrudeGeometry(pena,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1});pg.translate(0,0,-.006);
   const m=new THREE.Mesh(pg,ouro());m.scale.x=lado;m.rotation.z=lado*(.25+i*.14);m.position.y=-i*.012;asa.add(m);
  }
 }
 const cruz=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.11,12),ouro());cruz.rotation.z=Math.PI/2;g.add(cruz);
 const gema=new THREE.Mesh(new THREE.OctahedronGeometry(.022,1),new THREE.MeshStandardMaterial({color:'#2f8cff',emissive:'#0b3a8a',emissiveIntensity:1.2,metalness:.2,roughness:.1}));gema.position.z=.03;gema.scale.z=.5;g.add(gema);
 const ct=couro();ct.repeat.set(1,1);
 const cabo=new THREE.Mesh(new THREE.CylinderGeometry(.021,.024,.2,14),new THREE.MeshStandardMaterial({map:ct,roughness:.85}));cabo.position.y=-.11;g.add(cabo);
 const pomo=new THREE.Mesh(new THREE.SphereGeometry(.035,16,12),ouro());pomo.position.y=-.23;pomo.scale.y=1.2;g.add(pomo);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});
 g.userData={ponta:new THREE.Vector3(0,L,0),base:new THREE.Vector3(0,.05,0),comp:L};
 return g;
}

// Rastro do golpe: faixa entre a base e a ponta da lâmina nos últimos quadros.
export class Rastro{
 constructor(scene,n=14,cor='#cfe8ff'){
  this.n=n;this.pts=[];const geo=new THREE.BufferGeometry();
  this.pos=new Float32Array(n*2*3);this.alfa=new Float32Array(n*2);
  geo.setAttribute('position',new THREE.BufferAttribute(this.pos,3));geo.setAttribute('alfa',new THREE.BufferAttribute(this.alfa,1));
  const idx=[];for(let i=0;i<n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}geo.setIndex(idx);
  this.mesh=new THREE.Mesh(geo,new THREE.ShaderMaterial({uniforms:{cor:{value:new THREE.Color(cor)}},
   vertexShader:'attribute float alfa;varying float vA;void main(){vA=alfa;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 cor;varying float vA;void main(){gl_FragColor=vec4(cor,vA*.55);}',
   transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  this.mesh.frustumCulled=false;scene.add(this.mesh);this.ativo=0;
 }
 empurrar(a,b,ativo){
  this.pts.unshift([a.clone(),b.clone()]);if(this.pts.length>this.n)this.pts.pop();
  this.ativo=ativo?1:Math.max(0,this.ativo-.12);
  for(let i=0;i<this.n;i++){const p=this.pts[Math.min(i,this.pts.length-1)];
   this.pos.set([p[0].x,p[0].y,p[0].z],i*6);this.pos.set([p[1].x,p[1].y,p[1].z],i*6+3);
   const k=(1-i/(this.n-1))*this.ativo;this.alfa[i*2]=k*.2;this.alfa[i*2+1]=k}
  this.mesh.geometry.attributes.position.needsUpdate=true;this.mesh.geometry.attributes.alfa.needsUpdate=true;
 }
 remover(){this.mesh.parent?.remove(this.mesh)}
}

// ---------- Arco recurvo e flecha ----------
function membro(dir){
 // braço do arco: sai do punho curvando para o lado do arqueiro e as pontas voltam para o alvo (recurvo)
 const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push(new THREE.Vector3(0,dir*(.12+t*.62),.23*Math.sin(t*Math.PI*.55)-(t>.82?(t-.82)*.45:0)))}
 const curva=new THREE.CatmullRomCurve3(pts),seg=24,rad=8;
 const geo=new THREE.TubeGeometry(curva,seg,.022,rad,false);
 const p=geo.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<p.count;i++){const t=Math.floor(i/(rad+1))/seg;curva.getPointAt(t,c);v.fromBufferAttribute(p,i).sub(c);
  const k=1-t*.55;v.x*=k*1.6;v.y*=k;v.z*=k*.8;p.setXYZ(i,c.x+v.x,c.y+v.y,c.z+v.z)}
 geo.computeVertexNormals();return geo;
}
export function criarArco(){
 const g=new THREE.Group();g.name='arco';
 const mad=new THREE.MeshStandardMaterial({map:madeira(),roughness:.55,metalness:.05});
 const cima=new THREE.Group(),baixo=new THREE.Group();g.add(cima,baixo);
 cima.add(new THREE.Mesh(membro(1),mad));baixo.add(new THREE.Mesh(membro(-1),mad));
 const punho=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.26,12),new THREE.MeshStandardMaterial({map:couro(),roughness:.85}));g.add(punho);
 for(const y of [-.13,.13]){const a=new THREE.Mesh(new THREE.CylinderGeometry(.034,.034,.025,12),ouro());a.position.y=y;g.add(a)}
 const ponta=(dir)=>new THREE.Vector3(0,dir*.74,.146);
 // corda: duas metades que se encontram no ponto de puxada
 const cordaMat=new THREE.LineBasicMaterial({color:'#e8e2d0'});
 const cordaGeo=new THREE.BufferGeometry().setFromPoints([ponta(1),new THREE.Vector3(0,0,.146),ponta(-1)]);
 const corda=new THREE.Line(cordaGeo,cordaMat);g.add(corda);
 const flecha=criarFlecha();flecha.visible=false;g.add(flecha);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});
 g.userData={cima,baixo,corda,flecha,ponta,puxada:0,vibra:0};
 return g;
}
// puxada 0..1; vibração depois de soltar
export function animarArco(arco,puxada,dt){
 const u=arco.userData;u.vibra=Math.max(0,u.vibra-dt);
 const v=u.vibra>0?Math.sin(u.vibra*90)*u.vibra*.12:0;
 const z=.146+puxada*.5+v;
 const flex=puxada*.14;u.cima.rotation.x=flex;u.baixo.rotation.x=-flex;
 const pc=u.ponta(1).applyAxisAngle(new THREE.Vector3(1,0,0),flex),pb=u.ponta(-1).applyAxisAngle(new THREE.Vector3(1,0,0),-flex);
 const p=u.corda.geometry.attributes.position;p.setXYZ(0,pc.x,pc.y,pc.z);p.setXYZ(1,0,0,z);p.setXYZ(2,pb.x,pb.y,pb.z);p.needsUpdate=true;
 u.flecha.visible=puxada>.02;u.flecha.position.set(0,0,z);u.flecha.rotation.set(Math.PI,0,0); // flecha aponta para fora (-Z do arco)
}
export function soltarArco(arco){arco.userData.vibra=.35}
export function criarFlecha(){
 const g=new THREE.Group();
 const haste=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.8,6),new THREE.MeshStandardMaterial({color:'#b48a55',roughness:.6}));haste.rotation.x=Math.PI/2;haste.position.z=.4;g.add(haste);
 const ponta=new THREE.Mesh(new THREE.ConeGeometry(.02,.08,4),new THREE.MeshStandardMaterial({color:'#8c9196',metalness:1,roughness:.25}));ponta.rotation.x=Math.PI/2;ponta.position.z=.84;g.add(ponta);
 for(let i=0;i<3;i++){const pena=new THREE.Mesh(new THREE.PlaneGeometry(.035,.12),new THREE.MeshStandardMaterial({color:i?'#f2f2f2':'#d32f2f',side:THREE.DoubleSide,roughness:.9}));
  pena.position.z=.07;pena.rotation.set(Math.PI/2,0,i*Math.PI*2/3);pena.translateX(.02);g.add(pena)}
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});
 return g;
}

// ---------- Bomba de pavio ----------
export function criarBomba(){
 const g=new THREE.Group();g.name='bomba';
 const corpo=new THREE.Mesh(new THREE.SphereGeometry(.16,32,24),new THREE.MeshStandardMaterial({color:'#1b1d20',metalness:.6,roughness:.42}));g.add(corpo);
 const tampa=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.06,16),new THREE.MeshStandardMaterial({color:'#4a4d52',metalness:.9,roughness:.3}));tampa.position.y=.165;g.add(tampa);
 const anel=new THREE.Mesh(new THREE.TorusGeometry(.058,.01,8,20),new THREE.MeshStandardMaterial({color:'#7a7e84',metalness:1,roughness:.25}));anel.rotation.x=Math.PI/2;anel.position.y=.195;g.add(anel);
 const curva=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.19,0),new THREE.Vector3(.02,.25,0),new THREE.Vector3(.06,.29,.01),new THREE.Vector3(.1,.3,.02)]);
 const pavio=new THREE.Mesh(new THREE.TubeGeometry(curva,12,.008,6),new THREE.MeshStandardMaterial({color:'#c9b48a',roughness:.95}));g.add(pavio);
 const fagulha=new THREE.Sprite(new THREE.SpriteMaterial({color:'#ffcc66',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,map:(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');const gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(.3,'rgba(255,200,90,.8)');gr.addColorStop(1,'rgba(255,120,0,0)');x.fillStyle=gr;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(x.canvas)})()}));
 fagulha.position.copy(curva.getPoint(1));fagulha.scale.setScalar(.12);g.add(fagulha);
 // reflexo especular sutil: faixa clara
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});
 g.userData={fagulha,curva};
 return g;
}
// pavio aceso: a fagulha pulsa e solta faíscas
export function animarBomba(b,t,efeitos,acesa){
 const f=b.userData.fagulha;f.visible=acesa;
 if(!acesa)return;
 f.scale.setScalar(.1+Math.random()*.08);
 if(efeitos&&Math.random()<.7){const p=f.getWorldPosition(new THREE.Vector3());efeitos.faiscas(p.x,p.y,p.z,1)}
}

export const ITENS={
 espada:{nome:'Espada alada',criar:criarEspada,dica:'Clique ou F: golpe'},
 arco:{nome:'Arco e flecha',criar:criarArco,dica:'Segure o clique (ou F) para puxar, solte para atirar'},
 bomba:{nome:'Bomba',criar:criarBomba,dica:'Clique ou F: acender e arremessar'},
};
