import * as THREE from 'three';
import {Sky} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/objects/Sky.js';
import {Reflector} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/objects/Reflector.js';
import {mergeVertices} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/geometries/RoundedBoxGeometry.js';

// Esplanada dos Ministérios, Congresso Nacional e Praça dos Três Poderes desenhados em código.
// Unidade = 1 metro. Eixo Monumental no x=0; leste (Congresso, Praça) = -z; oeste (Catedral, Torre de TV) = +z.
// Norte = -x (Itamaraty, Planalto); sul = +x (Justiça, STF).
// Medidas de referência: torres do Congresso com 100 m e 28 andares, planta de 45 x 10,5–12,25 m;
// cúpula da Câmara com 62 m de diâmetro; Planalto ~357 m a leste do Congresso.

export const LIMITES={xMin:-320,xMax:320,zMin:-665,zMax:790};
export const SPAWN={x:0,z:-30};

// ---------- utilidades ----------
function rng(seed){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=rng(20261021);
const pick=a=>a[Math.floor(R()*a.length)];

function canvasTex(w,h,draw,{repeat=[1,1],srgb=true}={}){
 const c=document.createElement('canvas');c.width=w;c.height=h;
 draw(c.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(c);
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat[0],repeat[1]);
 if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
 return t;
}
// Desenha repetindo nas bordas para a textura emendar sem costura.
function wrapDraw(w,h,x,y,m,fn){for(const dx of [0,-w,w])for(const dy of [0,-h,h]){if((dx&&Math.abs(x+dx-w/2)>w/2+m)||(dy&&Math.abs(y+dy-h/2)>h/2+m))continue;fn(x+dx,y+dy)}}
function speckle(g,w,h,n,cores,rMin,rMax,alpha=1){
 for(let i=0;i<n;i++){
  const x=R()*w,y=R()*h,r=rMin+R()*(rMax-rMin);
  g.globalAlpha=alpha*(0.4+R()*0.6);g.fillStyle=pick(cores);
  wrapDraw(w,h,x,y,r,(px,py)=>g.fillRect(px,py,r,r));
 }
 g.globalAlpha=1;
}

// ---------- texturas ----------
function grassTex(){
 return canvasTex(512,512,(g,w,h)=>{
  g.fillStyle='#6a7d3c';g.fillRect(0,0,w,h);
  const cores=['#55692c','#62773a','#718640','#82914a','#93995a','#a9a466','#5d7030','#bdb27a','#4b5e27','#8a8a52'];
  g.lineCap='round';
  for(let i=0;i<46000;i++){
   const x=R()*w,y=R()*h,len=2+R()*6,a=-Math.PI/2+(R()-.5)*1.6;
   g.strokeStyle=pick(cores);g.globalAlpha=.45+R()*.5;g.lineWidth=.8+R()*1.2;
   wrapDraw(w,h,x,y,8,(px,py)=>{g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len);g.stroke()});
  }
  g.globalAlpha=1;
 },{repeat:[1,1]});
}
function macroTex(){
 // ruído suave em dois canais, para quebrar a repetição da grama em grande escala
 const small=document.createElement('canvas');small.width=small.height=16;
 const sg=small.getContext('2d');const img=sg.createImageData(16,16);
 for(let i=0;i<256;i++){img.data[i*4]=110+R()*145;img.data[i*4+1]=110+R()*145;img.data[i*4+2]=0;img.data[i*4+3]=255}
 sg.putImageData(img,0,0);
 return canvasTex(256,256,(g,w,h)=>{g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(small,0,0,w,h)},{srgb:false});
}
function asphaltTex(){
 return canvasTex(512,512,(g,w,h)=>{
  g.fillStyle='#3a3c3f';g.fillRect(0,0,w,h);
  speckle(g,w,h,26000,['#2e3033','#45474a','#505255','#36383b','#5b5c5e'],1,2.4,.8);
  for(let i=0;i<14;i++){ // manchas e remendos
   const x=R()*w,y=R()*h,r=20+R()*60;
   g.globalAlpha=.08+R()*.08;g.fillStyle=R()<.5?'#1f2123':'#55575a';
   wrapDraw(w,h,x,y,r,(px,py)=>{g.beginPath();g.ellipse(px,py,r,r*(.4+R()*.6),R()*3,0,7);g.fill()});
  }
  g.globalAlpha=1;
 });
}
function pavingTex(cor='#d3cec4',junta='#b7b1a6',passo=128){
 return canvasTex(512,512,(g,w,h)=>{
  g.fillStyle=cor;g.fillRect(0,0,w,h);
  speckle(g,w,h,15000,['#c4bfb4','#ddd8ce','#bdb7ab','#e4e0d7'],1,2.2,.7);
  g.strokeStyle=junta;g.lineWidth=2;
  for(let i=0;i<=w;i+=passo){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke()}
  for(let i=0;i<10;i++){const x=R()*w,y=R()*h,r=15+R()*40;g.globalAlpha=.06;g.fillStyle='#7a7468';g.beginPath();g.arc(x,y,r,0,7);g.fill()}
  g.globalAlpha=1;
 });
}
function concreteTex(){
 return canvasTex(512,512,(g,w,h)=>{
  g.fillStyle='#dcd9d1';g.fillRect(0,0,w,h);
  speckle(g,w,h,9000,['#d0cdc5','#e4e2dc','#c8c5bc'],1,2,.6);
  for(let i=0;i<40;i++){ // escorridos de chuva
   const x=R()*w,len=60+R()*260;
   const gr=g.createLinearGradient(0,0,0,len);gr.addColorStop(0,'rgba(120,118,110,.16)');gr.addColorStop(1,'rgba(120,118,110,0)');
   g.fillStyle=gr;g.fillRect(x,0,2+R()*5,len);
  }
 });
}
function marbleTex(){
 return canvasTex(256,1024,(g,w,h)=>{
  g.fillStyle='#ecebe6';g.fillRect(0,0,w,h);
  for(let row=0;row<h;row+=h/28){g.fillStyle='rgba(150,150,145,.35)';g.fillRect(0,row,w,1.5)}
  for(let i=0;i<70;i++){
   g.strokeStyle='rgba(170,168,160,'+(.1+R()*.2)+')';g.lineWidth=.6+R();
   let x=R()*w,y=R()*h;g.beginPath();g.moveTo(x,y);
   for(let k=0;k<6;k++){x+=(R()-.5)*50;y+=R()*40;g.lineTo(x,y)}g.stroke();
  }
 });
}
// Fachada de vidro: grade de vidros com variação (persianas, reflexo do céu), montantes e faixas entre andares.
function facadeTex({w=1024,h=256,andares=11,colunas=48,vidros,montante='#c9cdcf',faixa='#b9bdbe',topo='#d8d8d4',persiana=.18}){
 return canvasTex(w,h,(g)=>{
  const topH=h*.04,rowH=(h-topH)/andares,colW=w/colunas;
  g.fillStyle=topo;g.fillRect(0,0,w,topH);
  for(let r=0;r<andares;r++)for(let c=0;c<colunas;c++){
   const x=c*colW,y=topH+r*rowH;
   const base=pick(vidros);
   const gr=g.createLinearGradient(0,y,0,y+rowH);gr.addColorStop(0,shade(base,1.18));gr.addColorStop(1,shade(base,.88));
   g.fillStyle=gr;g.fillRect(x,y,colW,rowH);
   if(R()<persiana){g.fillStyle='rgba(225,228,224,.55)';const p=rowH*(.25+R()*.6);g.fillRect(x+1,y+2,colW-2,p);
    g.fillStyle='rgba(120,120,120,.18)';for(let k=y+4;k<y+p;k+=3)g.fillRect(x+1,k,colW-2,1)}
  }
  g.fillStyle=montante;for(let c=0;c<=colunas;c++)g.fillRect(c*colW-1,topH,2,h);
  g.fillStyle=faixa;for(let r=0;r<=andares;r++)g.fillRect(0,topH+r*rowH-2.5,w,5);
 });
}
function shade(hex,f){const c=new THREE.Color(hex);c.multiplyScalar(f);return '#'+c.getHexString()}
function towerTex(){
 // faces longas das torres: mosaico de painéis cinza com fitas de janela
 return canvasTex(256,1024,(g,w,h)=>{
  const rows=28,cols=12,rh=h/rows,cw=w/cols;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   g.fillStyle=pick(['#8d9397','#9ea3a6','#7b8286','#b2b6b6','#a7abac','#6f767a']);
   g.fillRect(c*cw,r*rh,cw,rh);
   g.fillStyle='rgba(30,38,44,.85)';g.fillRect(c*cw+2,r*rh+rh*.55,cw-4,rh*.32);
  }
  g.fillStyle='#2a3238';g.fillRect(w-cw*1.4,0,cw*1.4,h); // fita escura de vidro junto ao vão entre as torres
  g.fillStyle='rgba(255,255,255,.18)';for(let r=0;r<=rows;r++)g.fillRect(0,r*rh-1,w,2);
 });
}
function checkerTex(){
 // anexo com fachada em mosaico ocre e dourado
 return canvasTex(1024,256,(g,w,h)=>{
  g.fillStyle='#cfc6b2';g.fillRect(0,0,w,h);
  const topH=h*.12,rows=8,cols=40,rh=(h-topH)/rows,cw=w/cols;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   g.fillStyle=pick(['#d4a62a','#c4901f','#a8741d','#e2b93d','#8e5f1c','#b98a2e','#e9c75a','#c99a2a']);
   g.fillRect(c*cw,topH+r*rh,cw+.5,rh+.5);
  }
  g.fillStyle='#4a4a46';for(let c=0;c<cols;c++)g.fillRect(c*cw+cw*.3,topH*.35,cw*.4,topH*.35);
 });
}
function flagBrasilTex(){
 return canvasTex(700,490,(g,w,h)=>{
  g.fillStyle='#009c3b';g.fillRect(0,0,w,h);
  g.fillStyle='#ffdf00';g.beginPath();g.moveTo(w*.085,h/2);g.lineTo(w/2,h*.12);g.lineTo(w*.915,h/2);g.lineTo(w/2,h*.88);g.closePath();g.fill();
  g.fillStyle='#002776';g.beginPath();g.arc(w/2,h/2,h*.25,0,7);g.fill();
  g.save();g.beginPath();g.arc(w/2,h/2,h*.25,0,7);g.clip();
  g.strokeStyle='#ffffff';g.lineWidth=h*.04;g.beginPath();g.arc(w/2-h*.04,h*.95,h*.55,-Math.PI*.78,-Math.PI*.2);g.stroke();
  g.fillStyle='#ffffff';for(let i=0;i<27;i++){g.beginPath();g.arc(w/2+(R()-.5)*h*.42,h/2+R()*h*.2,1.4+R()*2,0,7);g.fill()}
  g.restore();
 },{repeat:[1,1]});
}
function flagGenericTex(seed){
 const r=rng(seed);
 const pal=['#1f5aa6','#d62f2f','#ffffff','#1d8a3b','#f2c500','#111111','#7b1e1e','#3aa0d8'];
 const p=()=>pal[Math.floor(r()*pal.length)];
 return canvasTex(128,90,(g,w,h)=>{
  const tipo=Math.floor(r()*4);
  if(tipo===0){for(let i=0;i<3;i++){g.fillStyle=p();g.fillRect(0,i*h/3,w,h/3+1)}}
  else if(tipo===1){for(let i=0;i<3;i++){g.fillStyle=p();g.fillRect(i*w/3,0,w/3+1,h)}}
  else if(tipo===2){g.fillStyle=p();g.fillRect(0,0,w,h);g.fillStyle=p();g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.lineTo(0,h);g.fill()}
  else{g.fillStyle=p();g.fillRect(0,0,w,h);g.fillStyle=p();g.fillRect(0,h*.38,w,h*.24);g.fillRect(w*.3,0,w*.18,h)}
  g.fillStyle=p();g.beginPath();g.arc(w*.24,h*.3,h*.11,0,7);g.fill();
 });
}
function cloudTex(seed){
 const r=rng(seed);
 return canvasTex(512,256,(g,w,h)=>{
  const puff=(x,y,rad,a)=>{const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,`rgba(255,255,255,${a})`);gr.addColorStop(.55,`rgba(255,255,255,${a*.75})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,7);g.fill()};
  const base=h*.7;
  for(let i=0;i<60;i++){const x=w*(.12+r()*.76),t=1-Math.abs(x/w-.5)*2,rad=h*(.08+r()*.16)*(.5+t*.8);puff(x,base-rad*(.2+r()*.9)*t,rad,.55+r()*.4)}
  for(let i=0;i<25;i++){const x=w*(.15+r()*.7);puff(x,base-h*.02,h*(.06+r()*.07),.5)}
  // base mais escura, como cúmulos de verdade
  g.globalCompositeOperation='source-atop';
  const sh=g.createLinearGradient(0,h*.3,0,base+10);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(120,135,155,.42)');
  g.fillStyle=sh;g.fillRect(0,0,w,h);
  g.globalCompositeOperation='destination-out';
  const fade=g.createLinearGradient(0,base-h*.06,0,base+h*.12);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');
  g.fillStyle=fade;g.fillRect(0,base-h*.06,w,h);g.globalCompositeOperation='source-over';
 });
}
function leafTex(){
 return canvasTex(256,256,(g,w,h)=>{
  g.fillStyle='#4e6a2f';g.fillRect(0,0,w,h);
  for(let i=0;i<2600;i++){const x=R()*w,y=R()*h,r=2+R()*5;g.fillStyle=pick(['#3b5523','#5c7a36','#6f8f43','#2f461c','#86a352','#4a6629']);g.globalAlpha=.6+R()*.4;
   wrapDraw(w,h,x,y,r,(px,py)=>{g.beginPath();g.ellipse(px,py,r,r*.6,R()*3,0,7);g.fill()})}
  g.globalAlpha=1;
 });
}
function waterfallTex(){
 return canvasTex(64,256,(g,w,h)=>{
  g.fillStyle='rgba(220,235,245,.35)';g.fillRect(0,0,w,h);
  for(let i=0;i<120;i++){g.fillStyle='rgba(255,255,255,'+(.2+R()*.5)+')';g.fillRect(R()*w,R()*h,1+R()*2,8+R()*30)}
 });
}

// Variação de cor em grande escala (evita o padrão repetido da grama).
function withMacro(mat,map,scale,strength){
 mat.onBeforeCompile=(sh)=>{
  sh.uniforms.macroMap={value:map};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMacroPos;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvMacroPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMacroPos;uniform sampler2D macroMap;')
   .replace('#include <map_fragment>',`#include <map_fragment>
    {float m=texture2D(macroMap,vMacroPos.xz/${scale.toFixed(1)}).r*.6+texture2D(macroMap,vMacroPos.xz/${(scale*.23).toFixed(1)}).g*.4;
     diffuseColor.rgb*=mix(${(1-strength).toFixed(3)},${(1+strength).toFixed(3)},m);}`);
 };
 mat.customProgramCacheKey=()=>'macro'+scale+'_'+strength;
 return mat;
}
// Bandeiras tremulando no shader (um uniforme de tempo para todas).
const flagTime={value:0};
function flagMaterial(map){
 const m=new THREE.MeshStandardMaterial({map,side:THREE.DoubleSide,roughness:.8});
 m.onBeforeCompile=(sh)=>{
  sh.uniforms.uTime=flagTime;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    float k=uv.x;transformed.z+=sin(uv.x*7.0-uTime*4.0+position.y*.6)*.09*k*(1.0+abs(position.x)*.05)*${'1.0'};
    transformed.y-=k*k*.06;`);
 };
 m.customProgramCacheKey=()=>'flag';
 return m;
}

// ---------- geometrias auxiliares ----------
function boxMesh(w,h,d,mat,x,y,z,parent){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);
 m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function plane(w,d,mat,x,y,z,parent,{shadow=true}={}){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);
 m.receiveShadow=shadow;parent.add(m);return m;
}
// Fachada em arcada (Itamaraty, Justiça): pente com arcos plenos, extrudado.
function arcadeGeometry(W,H,n,coluna,faixaTopo,profundidade){
 const vao=(W-(n+1)*coluna)/n,raio=vao/2,mola=H-faixaTopo-raio;
 const s=new THREE.Shape();
 s.moveTo(0,H);s.lineTo(W,H);s.lineTo(W,0);
 let x=W;
 for(let i=0;i<n;i++){
  x-=coluna;s.lineTo(x,0);s.lineTo(x,mola);
  s.absarc(x-raio,mola,raio,0,Math.PI,false);
  x-=vao;s.lineTo(x,0);
 }
 s.lineTo(0,0);s.lineTo(0,H);
 const g=new THREE.ExtrudeGeometry(s,{depth:profundidade,bevelEnabled:false,curveSegments:10});
 g.translate(-W/2,0,-profundidade/2);
 return g;
}
// Coluna em curva no estilo do Planalto/Alvorada: vista de frente, larga no alto e afinando até tocar o chão.
function finGeometry(H,larg,esp){
 const s=new THREE.Shape(),w=larg/2,slab=H*.2;
 s.moveTo(-w,H);s.lineTo(w,H);
 s.quadraticCurveTo(w*.18,H*.62,w*.16,slab);
 s.quadraticCurveTo(w*.24,slab*.45,w*.05,0);
 s.lineTo(-w*.05,0);
 s.quadraticCurveTo(-w*.24,slab*.45,-w*.16,slab);
 s.quadraticCurveTo(-w*.18,H*.62,-w,H);
 const g=new THREE.ExtrudeGeometry(s,{depth:esp,bevelEnabled:true,bevelThickness:.08,bevelSize:.06,bevelSegments:2,curveSegments:16});
 g.translate(0,0,-esp/2);
 return g;
}

// ---------- cidade ----------
export function buildCity(scene,renderer,camera,{qualidade='alto'}={}){
 const alto=qualidade==='alto';
 const root=new THREE.Group();root.name='cidade';scene.add(root);
 const colliders=[];
 // h = altura do obstáculo (usada por projéteis; prédios não sofrem dano)
 const solid=(x0,x1,z0,z1,h=25)=>colliders.push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1),h});
 const updaters=[];

 // Renderização: tons de filme, sombras suaves.
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=.5;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;

 // Céu físico + sol de fim de tarde vindo do oeste/noroeste (ilumina a fachada do Congresso).
 const sunDir=new THREE.Vector3(-.38,.62,.69).normalize();
 const sky=new Sky();sky.scale.setScalar(8000);
 const su=sky.material.uniforms;
 su.turbidity.value=2.4;su.rayleigh.value=1.9;su.mieCoefficient.value=.003;su.mieDirectionalG.value=.86;
 su.sunPosition.value.copy(sunDir);
 root.add(sky);
 // Ambiente para reflexos (vidro, água) gerado a partir do próprio céu.
 const pmrem=new THREE.PMREMGenerator(renderer);
 const envScene=new THREE.Scene();const sky2=new Sky();sky2.scale.setScalar(8000);
 for(const k of ['turbidity','rayleigh','mieCoefficient','mieDirectionalG'])sky2.material.uniforms[k].value=su[k].value;
 sky2.material.uniforms.sunPosition.value.copy(sunDir);envScene.add(sky2);
 const envRT=pmrem.fromScene(envScene,.02);
 scene.environment=envRT.texture;
 scene.environmentIntensity=.85;
 scene.fog=new THREE.Fog('#b9cadb',380,2900);

 const sun=new THREE.DirectionalLight('#fff0d8',2.7);
 sun.castShadow=true;
 sun.shadow.mapSize.set(alto?2048:1024,alto?2048:1024);
 sun.shadow.bias=-.0004;sun.shadow.normalBias=.6;
 const sc=sun.shadow.camera;sc.near=10;sc.far=1400;
 root.add(sun);root.add(sun.target);
 root.add(new THREE.HemisphereLight('#dfeaf5','#5d6b45',.55));

 // Materiais
 const macro=macroTex();
 const grassMap=grassTex();grassMap.repeat.set(1,1);
 const grass=withMacro(new THREE.MeshStandardMaterial({map:grassMap,roughness:.96,metalness:0}),macro,150,.3);
 grassMap.repeat.set(9000/4,9000/4);
 const asphalt=asphaltTex();
 const paving=pavingTex();
 const pracaPaving=pavingTex('#cbc6bb','#ada69a',128);
 const concrete=new THREE.MeshStandardMaterial({map:concreteTex(),roughness:.82,color:'#ffffff'});
 const concreteDark=new THREE.MeshStandardMaterial({color:'#bdb8ad',roughness:.9});
 const white=new THREE.MeshStandardMaterial({color:'#e6e4de',roughness:.55});
 const marble=new THREE.MeshStandardMaterial({map:marbleTex(),roughness:.38});
 const darkGlass=new THREE.MeshStandardMaterial({color:'#1d272d',roughness:.08,metalness:.85,envMapIntensity:1.3});
 const steel=new THREE.MeshStandardMaterial({color:'#8c9196',roughness:.4,metalness:.75});
 const ministryGlass=new THREE.MeshStandardMaterial({map:facadeTex({vidros:['#5b7280','#64808c','#4f6673','#6f8a95','#7d96a0','#58707c']}),roughness:.16,metalness:.55,envMapIntensity:1.15});
 const ministryEnd=new THREE.MeshStandardMaterial({color:'#e2dccd',map:pavingTex('#e4dece','#d4cdbd',256),roughness:.85});
 const towerFace=new THREE.MeshStandardMaterial({map:towerTex(),roughness:.3,metalness:.35,envMapIntensity:1.1});

 // ---------- chão ----------
 const ground=plane(9000,9000,grass,0,0,0,root);ground.name='gramado';
 const roadMat=new THREE.MeshStandardMaterial({map:asphalt,roughness:.9,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const pavMat=new THREE.MeshStandardMaterial({map:paving,roughness:.9,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const pracaMat=new THREE.MeshStandardMaterial({map:pracaPaving,roughness:.85,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const tile=(map,w,d,tam)=>{const t=map.clone();t.needsUpdate=true;t.repeat.set(w/tam,d/tam);return t};
 // Pistas N1/S1, calçadas (alamedas) e estacionamentos.
 const zRoad0=-262,zRoad1=800,roadLen=zRoad1-zRoad0,zc=(zRoad0+zRoad1)/2;
 for(const s of [-1,1]){
  const rm=roadMat.clone();rm.map=tile(asphalt,30,roadLen,7);
  plane(30,roadLen,rm,s*132,.02,zc,root);
  const pm=pavMat.clone();pm.map=tile(paving,20,roadLen,4);
  plane(20,roadLen,pm,s*157,.03,zc,root);
  boxMesh(.3,.18,roadLen,concreteDark,s*116.9,.09,zc,root).castShadow=false;
  boxMesh(.3,.18,roadLen,concreteDark,s*147.1,.09,zc,root).castShadow=false;
 }
 // Faixas da pista (tracejadas e contínuas), instanciadas.
 {
  const dashGeo=new THREE.PlaneGeometry(.15,4);dashGeo.rotateX(-Math.PI/2);
  const lineMat=new THREE.MeshStandardMaterial({color:'#e9e9e2',roughness:.6,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const pos=[];
  for(const s of [-1,1])for(const off of [122.8,127.4,132,136.6,141.2])for(let z=zRoad0+4;z<zRoad1;z+=16)pos.push([s*off,z]);
  const inst=new THREE.InstancedMesh(dashGeo,lineMat,pos.length);const m=new THREE.Matrix4();
  pos.forEach(([x,z],i)=>{m.makeTranslation(x,.045,z);inst.setMatrixAt(i,m)});root.add(inst);
  for(const s of [-1,1])for(const off of [118.3,145.7]){
   const l=new THREE.Mesh(new THREE.PlaneGeometry(.18,roadLen),lineMat);l.rotation.x=-Math.PI/2;l.position.set(s*off,.045,zc);root.add(l);
  }
  // faixa de pedestres em frente à tribuna
  const zp=[];for(const s of [-1,1])for(let x=118.6;x<146;x+=1.25)zp.push([s*x,-70]);
  const zi=new THREE.InstancedMesh(new THREE.PlaneGeometry(.6,4.2).rotateX(-Math.PI/2),lineMat,zp.length);
  zp.forEach(([x,z],i)=>{m.makeTranslation(x,.046,z);zi.setMatrixAt(i,m)});root.add(zi);
 }
 // Estacionamentos entre os ministérios.
 const ministryZ=[];for(let i=0;i<9;i++)ministryZ.push(40+i*88);
 for(const s of [-1,1])for(let i=0;i<ministryZ.length-1;i++){
  const z=(ministryZ[i]+ministryZ[i+1])/2;const pm=roadMat.clone();pm.map=tile(asphalt,96,48,7);
  plane(96,48,pm,s*222,.02,z,root);
 }

 // ---------- ministérios ----------
 const roofMat=new THREE.MeshStandardMaterial({color:'#9a9890',roughness:.9});
 for(const s of [-1,1])ministryZ.forEach((z,i)=>{
  const mats=[ministryEnd,ministryEnd,roofMat,roofMat,ministryGlass,ministryGlass];
  const b=new THREE.Mesh(new THREE.BoxGeometry(100,38,18),mats);
  b.position.set(s*222,19,z);b.castShadow=b.receiveShadow=true;root.add(b);
  // casa de máquinas e antenas no topo
  boxMesh(14,4,10,concreteDark,s*(222+(R()-.5)*50),40,z,root);
  for(let k=0;k<3;k++){const a=boxMesh(.25,4+R()*6,.25,steel,s*(190+R()*60),40+2,z+(R()-.5)*12,root);a.position.y=38+a.geometry.parameters.height/2}
  // marquise de entrada voltada para o gramado
  boxMesh(4,.4,10,white,s*170.5,4,z,root);
  solid(s*172,s*272,z-9,z+9,40);
 });

 // ---------- Congresso Nacional ----------
 const C={x0:-110,x1:110,z0:-225,z1:-150,h:10.2};
 const congresso=new THREE.Group();congresso.name='Congresso Nacional';root.add(congresso);
 // corpo principal: vidro escuro recuado sob a laje branca, com brises verticais
 boxMesh(216,8.6,71,darkGlass,0,4.3,(C.z0+C.z1)/2,congresso);
 boxMesh(220,1.6,75,concrete,0,9.4,(C.z0+C.z1)/2,congresso);
 {const dm=pavMat.clone();dm.color=new THREE.Color('#b4b1aa');dm.map=tile(paving,218,73,5);plane(218,73,dm,0,10.21,(C.z0+C.z1)/2,congresso)}
 boxMesh(220,.4,75,concreteDark,0,.2,(C.z0+C.z1)/2,congresso);
 {
  const finGeo=new THREE.BoxGeometry(.4,8.6,1.4);
  const xs=[];for(let x=-108;x<=108;x+=3)xs.push(x);
  const fins=new THREE.InstancedMesh(finGeo,white,xs.length*2);const m=new THREE.Matrix4();
  xs.forEach((x,i)=>{m.makeTranslation(x,4.3,C.z1-.9);fins.setMatrixAt(i,m);m.makeTranslation(x,4.3,C.z0+.9);fins.setMatrixAt(i+xs.length,m)});
  fins.castShadow=fins.receiveShadow=true;congresso.add(fins);
 }
 solid(C.x0,C.x1,C.z0,C.z1,C.h+1);
 // torres (Anexo I): 28 andares, 100 m, faces longas voltadas para o vão entre elas
 const towerMats=[towerFace,towerFace,roofMat,roofMat,marble,marble];
 for(const x of [-18.5,-1.5]){
  const t=new THREE.Mesh(new THREE.BoxGeometry(12,100,45),towerMats);t.position.set(x,50,-232);t.castShadow=t.receiveShadow=true;congresso.add(t);
  boxMesh(12.4,1.2,45.4,white,x,100.4,-232,congresso);
 }
 boxMesh(5.2,15,12,darkGlass,-10,40,-232,congresso); // ligação entre as torres
 boxMesh(5.2,2,12,white,-10,33,-232,congresso);
 solid(-24.5,4.5,-254.5,-209.5,101);
 // cúpula do Senado (convexa)
 const domeMat=new THREE.MeshStandardMaterial({map:concreteTex(),roughness:.6,side:THREE.DoubleSide});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(20,72,36,0,Math.PI*2,0,Math.PI/2),domeMat);
 dome.scale.y=.66;dome.position.set(-62,C.h,-187);dome.castShadow=dome.receiveShadow=true;congresso.add(dome);
 const domeRing=new THREE.Mesh(new THREE.CylinderGeometry(20.6,20.6,.6,72),white);domeRing.position.set(-62,C.h+.3,-187);congresso.add(domeRing);
 // cúpula da Câmara (côncava), 62 m de diâmetro
 const bowlProfile=[[0,.01],[6,0],[7,.6],[12,2.6],[18,5.4],[24,8.4],[28.5,10.9],[31,12.2],[31.2,12.6],[30.5,12.75],[27.6,11.6],[22,8.9],[15,6.4],[8,5.2],[0,4.9]].map(([r,y])=>new THREE.Vector2(r,y));
 const bowl=new THREE.Mesh(new THREE.LatheGeometry(bowlProfile,96),domeMat);
 bowl.position.set(58,C.h,-187);bowl.castShadow=bowl.receiveShadow=true;congresso.add(bowl);
 // rampa de acesso à cobertura
 {
  const L=Math.hypot(50,C.h),ang=Math.atan2(C.h,50);
  const ramp=new THREE.Group();ramp.position.set(-10,C.h/2,-125);ramp.rotation.x=ang;congresso.add(ramp);
  boxMesh(10,.6,L,concrete,0,0,0,ramp);
  for(const sx of [-5.15,5.15])boxMesh(.3,1.1,L,white,sx,.8,0,ramp);
  solid(-17,-3,-150,-100,2);
 }
 // espelho d'água em frente ao Congresso
 const poolZ0=-147,poolZ1=-104;
 let waterMat=new THREE.MeshPhysicalMaterial({color:'#466b78',roughness:.04,metalness:.1,envMapIntensity:1.4,clearcoat:1});
 if(alto){
  const refl=new Reflector(new THREE.PlaneGeometry(216,poolZ1-poolZ0),{textureWidth:1024,textureHeight:512,color:'#9fb6bd',clipBias:.003});
  refl.rotation.x=-Math.PI/2;refl.position.set(0,.3,(poolZ0+poolZ1)/2);congresso.add(refl);
 }else plane(216,poolZ1-poolZ0,waterMat,0,.3,(poolZ0+poolZ1)/2,congresso,{shadow:false});
 boxMesh(14,.4,poolZ1-poolZ0,concrete,-10,.2,(poolZ0+poolZ1)/2,congresso); // passarela central
 for(const [x0,x1] of [[-108.5,-17],[-3,108.5]]){
  const w=x1-x0,cx=(x0+x1)/2;
  boxMesh(w,.5,.6,concrete,cx,.25,poolZ1+.3,congresso);boxMesh(w,.5,.6,concrete,cx,.25,poolZ0-.3,congresso);
  solid(x0,x1,poolZ0,poolZ1+1.5,.4);
 }
 boxMesh(.6,.5,poolZ1-poolZ0,concrete,-108.5,.25,(poolZ0+poolZ1)/2,congresso);boxMesh(.6,.5,poolZ1-poolZ0,concrete,108.5,.25,(poolZ0+poolZ1)/2,congresso);
 // grade metálica baixa diante do espelho d'água
 {
  const postGeo=new THREE.BoxGeometry(.06,1.1,.06);const xs=[];
  for(let x=-108;x<=108;x+=2.5)if(x<-17||x>-3)xs.push(x);
  const posts=new THREE.InstancedMesh(postGeo,steel,xs.length);const m=new THREE.Matrix4();
  xs.forEach((x,i)=>{m.makeTranslation(x,.55,poolZ1+1.4);posts.setMatrixAt(i,m)});congresso.add(posts);
  for(const [x0,x1] of [[-108,-17],[-3,108]])for(const y of [.5,1.05]){const r=boxMesh(x1-x0,.05,.05,steel,(x0+x1)/2,y,poolZ1+1.4,congresso);r.castShadow=false}
 }

 // ---------- Itamaraty e Palácio da Justiça ----------
 function arcadePalace({cx,cz,W,H,n,coluna,faixa,prof,lago,cascatas}){
  const g=new THREE.Group();g.position.set(cx,0,cz);root.add(g);
  boxMesh(W-10,H-3,W-10,darkGlass,0,(H-3)/2+.3,0,g);
  boxMesh(W+1,1.6,W+1,concrete,0,H-.8,0,g);
  const arc=arcadeGeometry(W,H,n,coluna,faixa,prof);
  for(let i=0;i<4;i++){
   const f=new THREE.Mesh(arc,concrete);f.castShadow=f.receiveShadow=true;
   const a=i*Math.PI/2;f.rotation.y=a;f.position.set(Math.sin(a)*W/2,0,Math.cos(a)*W/2);g.add(f);
  }
  if(lago){
   plane(lago,lago,waterMat,0,.25,0,g,{shadow:false});
   for(let i=0;i<4;i++){const a=i*Math.PI/2;const b=boxMesh(lago,.45,.6,concrete,Math.sin(a)*lago/2,.22,Math.cos(a)*lago/2,g);b.rotation.y=a}
  }
  if(cascatas){
   const t=waterfallTex();const wm=new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide});
   const vao=(W-(n+1)*coluna)/n;
   for(let i=1;i<n;i++){
    const x=-W/2+i*(vao+coluna)+coluna/2;
    const c=new THREE.Mesh(new THREE.PlaneGeometry(coluna*.8,H-faixa-1),wm);
    c.position.set(-W/2-prof/2-.15,(H-faixa-1)/2,x);c.rotation.y=-Math.PI/2;g.add(c);
   }
   plane(4,W,waterMat,-W/2-2.6,.2,0,g,{shadow:false});
   updaters.push((dt)=>{t.offset.y-=dt*.9});
  }
  const half=(lago||W)/2+1;solid(cx-half,cx+half,cz-half,cz+half);
  return g;
 }
 arcadePalace({cx:-222,cz:-55,W:84,H:18,n:14,coluna:.8,faixa:1.5,prof:1.2,lago:112});
 arcadePalace({cx:222,cz:-55,W:84,H:20,n:9,coluna:2.4,faixa:2.2,prof:1.6,cascatas:true});

 // Anexo com fachada em mosaico dourado (atrás da Câmara, lado sul)
 {
  const ck=new THREE.MeshStandardMaterial({map:checkerTex(),roughness:.55,metalness:.15});
  const mats=[ck,ck,roofMat,roofMat,ministryEnd,ministryEnd];
  const a=new THREE.Mesh(new THREE.BoxGeometry(30,24,120),mats);a.position.set(215,12,-185);a.castShadow=a.receiveShadow=true;root.add(a);
  solid(200,230,-245,-125);
 }

 // ---------- Praça dos Três Poderes ----------
 {
  const pm=pracaMat.clone();pm.map=tile(pracaPaving,340,400,6);
  plane(340,400,pm,0,.025,-462,root);
  const pm2=pavMat.clone();pm2.map=tile(paving,234,40,4);
  plane(234,40,pm2,0,.024,-245,root); // calçadão atrás do Congresso
  // Palácio do Planalto: corpo elevado, lajes brancas e colunas em curva nas fachadas longas
  const P={cx:-122,cz:-520,w:50,len:150,h:19};
  const pl=new THREE.Group();pl.name='Palácio do Planalto';pl.position.set(P.cx,0,P.cz);root.add(pl);
  boxMesh(P.w-4,15,P.len-4,darkGlass,0,10.5,0,pl);
  boxMesh(P.w,.8,P.len,white,0,3,0,pl);boxMesh(P.w+1,1.2,P.len+1,white,0,P.h-.6,0,pl);
  const fin=finGeometry(P.h-1.2,7.2,.7);
  for(const s of [-1,1])for(let z=-P.len/2+5;z<=P.len/2-5;z+=10){
   const f=new THREE.Mesh(fin,white);f.castShadow=f.receiveShadow=true;
   f.position.set(s*(P.w/2+1.2),0,z);f.rotation.y=Math.PI/2;pl.add(f);
  }
  // rampa e parlatório voltados para a praça
  {const L=Math.hypot(32,3),ang=Math.atan2(3,32);const r=new THREE.Group();r.position.set(P.w/2+16,1.5,0);r.rotation.z=ang;pl.add(r);
   boxMesh(L,.5,9,white,0,0,0,r);for(const sz of [-4.6,4.6])boxMesh(L,.9,.25,white,0,.6,sz,r);}
  boxMesh(4,.4,10,white,P.w/2+2,7,20,pl);
  plane(14,46,waterMat,P.w/2+10,.2,-38,pl,{shadow:false});
  solid(P.cx-P.w/2-4.5,P.cx+P.w/2+33,P.cz-P.len/2,P.cz+P.len/2);
  // Supremo Tribunal Federal
  const S={cx:118,cz:-520,w:40,len:84,h:15};
  const st=new THREE.Group();st.name='STF';st.position.set(S.cx,0,S.cz);root.add(st);
  boxMesh(S.w-4,11.5,S.len-4,darkGlass,0,8.5,0,st);
  boxMesh(S.w,.8,S.len,white,0,2.6,0,st);boxMesh(S.w+1,1.1,S.len+1,white,0,S.h-.55,0,st);
  const fin2=finGeometry(S.h-1.1,6.4,.6);
  for(const s of [-1,1])for(let z=-S.len/2+5;z<=S.len/2-5;z+=8.5){
   const f=new THREE.Mesh(fin2,white);f.castShadow=f.receiveShadow=true;f.position.set(s*(S.w/2+1),0,z);f.rotation.y=Math.PI/2;st.add(f);
  }
  solid(S.cx-S.w/2-4,S.cx+S.w/2+4,S.cz-S.len/2,S.cz+S.len/2);
  // Mastro da Bandeira Nacional (100 m) com bandeira tremulando
  const mastro=new THREE.Group();mastro.position.set(0,0,-470);root.add(mastro);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const r=boxMesh(.12,100,.12,steel,Math.cos(a)*.9,50,Math.sin(a)*.9,mastro);r.castShadow=true}
  boxMesh(3.2,1.2,3.2,concreteDark,0,.6,0,mastro);
  const bandeira=new THREE.Mesh(new THREE.PlaneGeometry(20,14,40,24).translate(10,0,0),flagMaterial(flagBrasilTex()));
  bandeira.position.set(1,92,0);bandeira.castShadow=true;mastro.add(bandeira);
  solid(-3,3,-473,-467,100);
  // Pombal (duas lâminas de concreto) e Panteão da Pátria (volume branco alongado)
  boxMesh(3,16,1.2,concrete,-70,8,-610,root);boxMesh(3,16,1.2,concrete,-70,8,-603,root);boxMesh(3,1.4,8.2,concrete,-70,15.3,-606.5,root);
  const pant=new THREE.Mesh(new THREE.CapsuleGeometry(6,44,8,24),white);pant.rotation.x=Math.PI/2;pant.scale.set(1.6,1,.9);pant.position.set(0,5.4,-628);
  pant.castShadow=pant.receiveShadow=true;root.add(pant);
  solid(-11,11,-658,-598);solid(-72,-68,-612,-601);
 }

 // ---------- Alameda dos Estados: bandeiras genéricas na borda do gramado ----------
 {
  const poleGeo=new THREE.CylinderGeometry(.06,.08,10,8);
  for(const s of [-1,1])for(let i=0;i<14;i++){
   const z=-97+i*7.5;
   const p=new THREE.Mesh(poleGeo,steel);p.position.set(s*111.5,5,z);p.castShadow=true;root.add(p);
   const f=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.9,12,6).translate(1.4,0,0),flagMaterial(flagGenericTex(100+i*2+(s>0?1:0))));
   f.position.set(s*111.5,9,z);f.rotation.y=s>0?Math.PI*.6:Math.PI*.4;f.castShadow=true;root.add(f);
  }
  updaters.push((dt,t)=>{flagTime.value=t});
 }

 // ---------- árvores (instanciadas) ----------
 {
  const pts=[];
  for(const s of [-1,1]){
   for(let z=-238;z<790;z+=13)pts.push([s*(157+(R()-.5)*3),z+(R()-.5)*3]);
   for(let z=20;z<780;z+=17)pts.push([s*(286+R()*18),z+(R()-.5)*8]);
   for(let z=-240;z>-650;z-=19)pts.push([s*(185+R()*30),z]);
  }
  for(let i=0;i<40;i++){const a=R()*Math.PI*2,r=62+R()*12;pts.push([-222+Math.cos(a)*r,-55+Math.sin(a)*r])}
  const trunkGeo=new THREE.CylinderGeometry(.18,.3,1,6);trunkGeo.translate(0,.5,0);
  // copa suave e irregular (deslocamento por função da posição, sem rachaduras)
  const canopyGeos=[0,1,2].map(v=>{let g=new THREE.IcosahedronGeometry(1,alto?3:2);g.deleteAttribute('normal');g=mergeVertices(g);const p=g.attributes.position;
   const a=1.3+v*.7,b=2.1+v*.4,c=.7+v;
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const k=1+.13*Math.sin(x*3.1*a+c)*Math.sin(y*2.7+b)+.09*Math.sin(z*4.3+x*2.2*b)+.07*Math.sin((x+z)*6.5+y*5.1);
    p.setXYZ(i,x*k*1.18,(y*k)*(y<0?.6:.92),z*k*1.18)}
   g.computeVertexNormals();
   const uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=Math.atan2(p.getZ(i),p.getX(i))/Math.PI;uv[i*2+1]=p.getY(i)*.8}
   g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return g});
  const trunkMat=new THREE.MeshStandardMaterial({color:'#5a4634',roughness:.95});
  const lt=leafTex();lt.repeat.set(2,2);
  const leafMat=new THREE.MeshStandardMaterial({map:lt,color:'#ffffff',roughness:.9});
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,pts.length);trunks.castShadow=true;
  const groups=[[],[],[]];pts.forEach((p,i)=>groups[i%3].push(p));
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(),col=new THREE.Color();
  pts.forEach(([x,z],i)=>{const h=3+R()*2.5;m.compose(v.set(x,0,z),q.identity(),sc.set(1,h,1));trunks.setMatrixAt(i,m)});
  root.add(trunks);
  groups.forEach((list,gi)=>{
   const inst=new THREE.InstancedMesh(canopyGeos[gi],leafMat,list.length);inst.castShadow=true;inst.receiveShadow=true;
   list.forEach(([x,z],i)=>{const r=3+R()*2.6;q.setFromAxisAngle(v.set(0,1,0),R()*6.28);
    m.compose(new THREE.Vector3(x,4+r*.75,z),q,sc.set(r,r*(.8+R()*.3),r));inst.setMatrixAt(i,m);
    inst.setColorAt(i,col.set(pick(['#d9e6c8','#c8dab4','#e6eed8','#bcd0a6','#f0f3e4'])));});
   root.add(inst);
  });
 }

 // ---------- postes ----------
 {
  const pole=new THREE.CylinderGeometry(.12,.18,13,8);pole.translate(0,6.5,0);
  const arm=new THREE.BoxGeometry(3.4,.14,.14);arm.translate(1.6,13,0);
  const lamp=new THREE.BoxGeometry(.9,.25,.4);lamp.translate(3.2,12.9,0);
  const pts=[];for(const s of [-1,1])for(let z=-240;z<790;z+=36)pts.push([s*115.8,z,s]);
  for(const [g,mat] of [[pole,steel],[arm,steel],[lamp,white]]){
   const inst=new THREE.InstancedMesh(g,mat,pts.length);inst.castShadow=true;const m=new THREE.Matrix4(),q=new THREE.Quaternion();
   pts.forEach(([x,z,s],i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),s>0?0:Math.PI);m.compose(new THREE.Vector3(x,0,z),q,new THREE.Vector3(1,1,1));inst.setMatrixAt(i,m)});
   root.add(inst);
  }
 }

 // ---------- carros e ônibus (estacionados e em movimento) ----------
 const carCores=['#f2f2f2','#e8e8e6','#b9bcc0','#8d9094','#1c1d20','#2c2f33','#7a1f1f','#c9c9c4','#3b4f6e','#f2f2f2','#d9d9d6'];
 const bodyGeo=new RoundedBoxGeometry(1.8,.8,4.35,2,.22);bodyGeo.translate(0,.66,0);
 const cabGeo=new RoundedBoxGeometry(1.6,.66,2.35,2,.24);cabGeo.translate(0,1.3,-.25);
 // quatro rodas numa só geometria
 const wheelGeo=(()=>{const parts=[];for(const x of [-.82,.82])for(const z of [-1.35,1.4]){const w=new THREE.CylinderGeometry(.33,.33,.24,10);w.rotateZ(Math.PI/2);w.translate(x,.33,z);parts.push(w)}
  const g=new THREE.BufferGeometry();const pos=[],nor=[],idx=[];let off=0;
  for(const w of parts){const ww=w.index?w.toNonIndexed():w;const p=ww.attributes.position,n=ww.attributes.normal;for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));nor.push(n.getX(i),n.getY(i),n.getZ(i))}}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));return g})();
 const carPaint=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.25,metalness:.6,envMapIntensity:1.2});
 const carGlass=new THREE.MeshStandardMaterial({color:'#151b20',roughness:.06,metalness:.8});
 const tire=new THREE.MeshStandardMaterial({color:'#141414',roughness:.9});
 const parked=[];
 for(const s of [-1,1]){
  for(let z=-235;z<-40;z+=5.2)if(R()<.72)parked.push([s*145.4,z,0]);
  for(let i=0;i<ministryZ.length-1;i++){const zc2=(ministryZ[i]+ministryZ[i+1])/2;for(let x=176;x<268;x+=2.6)for(const row of [-12,12])if(R()<.6)parked.push([s*x,zc2+row,Math.PI/2])}
 }
 const nMov=alto?28:14;
 const moving=[];for(let i=0;i<nMov;i++){const s=i%2?1:-1;const lane=[120.5,125.1,129.7,134.3,138.9,143.5][Math.floor(R()*6)];moving.push({x:s*lane,z:zRoad0+R()*roadLen,v:(s>0?-1:1)*(11+R()*7),bus:R()<.15})}
 const total=parked.length+moving.length;
 const bodies=new THREE.InstancedMesh(bodyGeo,carPaint,total),cabs=new THREE.InstancedMesh(cabGeo,carGlass,total),wheels=new THREE.InstancedMesh(wheelGeo,tire,total);
 for(const im of [bodies,cabs,wheels]){im.castShadow=true;im.receiveShadow=true;root.add(im);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)}
 const cm=new THREE.Matrix4(),cq=new THREE.Quaternion(),cv=new THREE.Vector3(),cs=new THREE.Vector3(),cc=new THREE.Color();
 function setCar(i,x,z,rot,bus){cq.setFromAxisAngle(cv.set(0,1,0),rot);cm.compose(cv.set(x,0,z),cq,bus?cs.set(1.4,2.6,2.8):cs.set(1,1,1));bodies.setMatrixAt(i,cm);cabs.setMatrixAt(i,cm);wheels.setMatrixAt(i,cm)}
 parked.forEach(([x,z,r],i)=>{setCar(i,x,z,r,false);bodies.setColorAt(i,cc.set(pick(carCores)))});
 moving.forEach((c,j)=>{const i=parked.length+j;setCar(i,c.x,c.z,c.v>0?0:Math.PI,c.bus);bodies.setColorAt(i,cc.set(c.bus?pick(['#f1efe6','#e9c84a']):pick(carCores)))});
 updaters.push((dt)=>{
  moving.forEach((c,j)=>{c.z+=c.v*dt;if(c.z>zRoad1)c.z=zRoad0;if(c.z<zRoad0)c.z=zRoad1;setCar(parked.length+j,c.x,c.z,c.v>0?0:Math.PI,c.bus)});
  bodies.instanceMatrix.needsUpdate=cabs.instanceMatrix.needsUpdate=wheels.instanceMatrix.needsUpdate=true;
 });
 // cones laranja na borda do gramado
 {
  const cone=new THREE.ConeGeometry(.22,.7,10);cone.translate(0,.35,0);
  const pts=[];for(const s of [-1,1])for(let z=-100;z<80;z+=6)if(R()<.7)pts.push([s*114.6,z]);
  const inst=new THREE.InstancedMesh(cone,new THREE.MeshStandardMaterial({color:'#ff6a1f',roughness:.6}),pts.length);const m=new THREE.Matrix4();
  pts.forEach(([x,z],i)=>{m.makeTranslation(x,0,z);inst.setMatrixAt(i,m)});inst.castShadow=true;root.add(inst);
 }

 // ---------- marcos distantes: Catedral, Museu, Torre de TV, cidade ao fundo ----------
 {
  const cat=new THREE.Group();cat.position.set(190,0,840);root.add(cat);
  for(let i=0;i<16;i++){
   const a=i/16*Math.PI*2;
   const pts=[[30,0],[20,9],[9,22],[6,30],[9,37],[13,42]].map(([r,y])=>new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));
   const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,1.1,8),white);tube.castShadow=true;cat.add(tube);
  }
  const vidro=new THREE.Mesh(new THREE.LatheGeometry([[0,30],[6.5,30],[9,22],[20,9],[29,.5],[0,.5]].map(([r,y])=>new THREE.Vector2(r,y)),48),new THREE.MeshStandardMaterial({color:'#6f97b8',roughness:.1,metalness:.5,transparent:true,opacity:.55}));
  cat.add(vidro);
  const mus=new THREE.Mesh(new THREE.SphereGeometry(40,48,24,0,Math.PI*2,0,Math.PI/2),white);mus.scale.y=.55;mus.position.set(190,0,960);mus.castShadow=true;root.add(mus);
  // Torre de TV (~224 m)
  const tv=new THREE.Group();tv.position.set(0,0,1950);root.add(tv);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;const leg=boxMesh(1.4,80,1.4,steel,Math.cos(a)*9,40,Math.sin(a)*9,tv);leg.rotation.z=Math.cos(a)*.1;leg.rotation.x=-Math.sin(a)*.1}
  boxMesh(14,5,14,concreteDark,0,77,0,tv);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.6,2.2,145,8),steel);mast.position.set(0,152,0);tv.add(mast);
  // cinturão de árvores no horizonte (Brasília é muito arborizada)
  {
   const g=new THREE.IcosahedronGeometry(1,1);const n=alto?900:450;
   const inst=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),n);
   const m=new THREE.Matrix4(),q=new THREE.Quaternion();let k=0;
   while(k<n){const x=(R()-.5)*4600,z=-1200+R()*3800;
    if(Math.abs(x)<360&&z>-700&&z<1000)continue;
    const r=6+R()*9;m.compose(new THREE.Vector3(x,r*.7,z),q,new THREE.Vector3(r*1.3,r,r*1.3));inst.setMatrixAt(k,m);
    inst.setColorAt(k,new THREE.Color(pick(['#3d5229','#475e2f','#536a35','#3a4a26'])));k++}
   root.add(inst);
  }
  // silhuetas de prédios ao redor, só para o horizonte
  const bg=new THREE.BoxGeometry(1,1,1);bg.translate(0,.5,0);
  const n=alto?320:160;const inst=new THREE.InstancedMesh(bg,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.8}),n);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion();let k=0;
  while(k<n){
   const x=(R()-.5)*5200,z=-1400+R()*4200;
   if(Math.abs(x)<420&&z>-900&&z<1050)continue;
   if(Math.hypot(x,z-200)<1050)continue;
   q.setFromAxisAngle(new THREE.Vector3(0,1,0),R()<.5?0:Math.PI/2);
   m.compose(new THREE.Vector3(x,0,z),q,new THREE.Vector3(30+R()*90,8+R()*55,14+R()*30));inst.setMatrixAt(k,m);
   inst.setColorAt(k,new THREE.Color(pick(['#a9adab','#9da2a4','#b6b4ad','#8f969a','#a3a8aa'])));k++;
  }
  root.add(inst);
 }

 // ---------- nuvens ----------
 {
  const cts=[1,2,3,4,5].map(cloudTex);
  for(let i=0;i<46;i++){
   const mat=new THREE.SpriteMaterial({map:pick(cts),transparent:true,depthWrite:false,opacity:.82+R()*.18,fog:false,toneMapped:false,color:'#f4f7fb'});
   const s=new THREE.Sprite(mat);const a=R()*Math.PI*2,r=1300+R()*2400;
   s.position.set(Math.cos(a)*r,300+R()*520,Math.sin(a)*r);const k=520+R()*820;s.scale.set(k,k*.5,1);root.add(s);
   updaters.push((dt)=>{s.position.x+=dt*2.2})
  }
 }

 // ---------- telões de anúncio (conteúdo desenhado pelo app) ----------
 const teloes=new Map();
 const TELOES=[
  {id:'telao-congresso-norte',x:-62,z:-88,rot:0,w:16,h:9,base:3.2},
  {id:'telao-congresso-sul',x:80,z:-88,rot:0,w:16,h:9,base:3.2},
  {id:'telao-eixo-norte',x:-104,z:120,rot:Math.PI/2,w:12,h:6.75,base:2.6},
  {id:'telao-eixo-sul',x:104,z:120,rot:-Math.PI/2,w:12,h:6.75,base:2.6},
  {id:'telao-ministerios-norte',x:-104,z:420,rot:Math.PI/2,w:10,h:5.625,base:2.4},
  {id:'telao-ministerios-sul',x:104,z:420,rot:-Math.PI/2,w:10,h:5.625,base:2.4},
  {id:'telao-praca',x:0,z:-300,rot:Math.PI,w:14,h:7.875,base:3},
 ];
 const frameMat=new THREE.MeshStandardMaterial({color:'#15181b',roughness:.5,metalness:.4});
 for(const t of TELOES){
  const g=new THREE.Group();g.position.set(t.x,0,t.z);g.rotation.y=t.rot;g.name=t.id;root.add(g);
  const cy=t.base+t.h/2;
  boxMesh(t.w+.7,t.h+.7,.6,frameMat,0,cy,-.05,g);
  for(const sx of [-1,1]){boxMesh(.45,t.base+t.h*.6,.45,steel,sx*(t.w/2-1.2),(t.base+t.h*.6)/2,-.5,g)}
  boxMesh(t.w*.8,.3,.3,steel,0,t.base+.4,-.5,g);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*t.h/t.w);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const tela=new THREE.Mesh(new THREE.PlaneGeometry(t.w,t.h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
  tela.position.set(0,cy,.26);g.add(tela);
  teloes.set(t.id,{canvas,tex,w:t.w,h:t.h});
  const hw=t.w/2+.4,hd=1.2,ver=Math.abs(Math.sin(t.rot))>.5;
  solid(t.x-(ver?hd:hw),t.x+(ver?hd:hw),t.z-(ver?hw:hd),t.z+(ver?hw:hd));
 }

 // ---------- atualização por quadro ----------
 const focus=new THREE.Vector3();
 function update(dt,t,alvo,distCamera){
  for(const u of updaters)u(dt,t);
  focus.copy(alvo);
  const half=THREE.MathUtils.clamp(distCamera*1.1,70,420);
  sc.left=-half;sc.right=half;sc.top=half;sc.bottom=-half;sc.updateProjectionMatrix();
  sun.target.position.copy(focus);sun.position.copy(focus).addScaledVector(sunDir,600);
  sun.target.updateMatrixWorld();
 }
 return {root,update,colliders,limites:LIMITES,spawn:SPAWN,sunDir,teloes,materiais:{concrete,white,steel,darkGlass}};
}

// Empurra o ponto para fora de qualquer obstáculo (colisão simples em planta).
export function resolveCollision(x,z,colliders,raio=.45){
 for(const c of colliders){
  if(x>c.x0-raio&&x<c.x1+raio&&z>c.z0-raio&&z<c.z1+raio){
   const dl=x-(c.x0-raio),dr=(c.x1+raio)-x,db=z-(c.z0-raio),df=(c.z1+raio)-z;
   const mn=Math.min(dl,dr,db,df);
   if(mn===dl)x=c.x0-raio;else if(mn===dr)x=c.x1+raio;else if(mn===db)z=c.z0-raio;else z=c.z1+raio;
  }
 }
 return [x,z];
}
