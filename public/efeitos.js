import * as THREE from 'three';
// Efeitos visuais em código: partículas (fogo, fumaça, faíscas, poeira), explosões com onda de choque,
// rastros de míssil, traçantes, clarões e marcas no chão. Nada aqui danifica prédios: é só visual.

function texRadial(stops){
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 const gr=g.createRadialGradient(32,32,0,32,32,32);for(const [p,cor] of stops)gr.addColorStop(p,cor);
 g.fillStyle=gr;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function texFumaca(){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 for(let i=0;i<26;i++){
  const x=64+(Math.random()-.5)*50,y=64+(Math.random()-.5)*50,r=18+Math.random()*26;
  const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);
 }
 const m=g.createRadialGradient(64,64,30,64,64,64);m.addColorStop(0,'rgba(0,0,0,0)');m.addColorStop(1,'rgba(0,0,0,1)');
 g.globalCompositeOperation='destination-out';g.fillStyle=m;g.fillRect(0,0,128,128);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

// Sistema de partículas com pontos: posição, velocidade, vida, tamanho e cor por partícula.
class Particulas{
 constructor(scene,{max=2000,mapa,aditivo=false,gravidade=0,arrasto=0,crescer=1,profundidade=true}){
  this.max=max;this.g=gravidade;this.arrasto=arrasto;this.crescer=crescer;
  const geo=new THREE.BufferGeometry();
  this.pos=new Float32Array(max*3);this.cor=new Float32Array(max*4);this.tam=new Float32Array(max);
  this.vel=new Float32Array(max*3);this.vida=new Float32Array(max);this.vidaMax=new Float32Array(max);this.tam0=new Float32Array(max);this.cor0=new Float32Array(max*4);this.rot=new Float32Array(max);
  geo.setAttribute('position',new THREE.BufferAttribute(this.pos,3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('cor',new THREE.BufferAttribute(this.cor,4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('tam',new THREE.BufferAttribute(this.tam,1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('rot',new THREE.BufferAttribute(this.rot,1).setUsage(THREE.DynamicDrawUsage));
  this.mat=new THREE.ShaderMaterial({
   uniforms:{mapa:{value:mapa},escala:{value:600}},
   vertexShader:`attribute vec4 cor;attribute float tam;attribute float rot;varying vec4 vCor;varying float vRot;uniform float escala;
    void main(){vCor=cor;vRot=rot;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=tam*escala/max(.1,-mv.z);}`,
   fragmentShader:`uniform sampler2D mapa;varying vec4 vCor;varying float vRot;
    void main(){vec2 p=gl_PointCoord-.5;float c=cos(vRot),s=sin(vRot);p=mat2(c,-s,s,c)*p+.5;vec4 t=texture2D(mapa,p);gl_FragColor=vec4(vCor.rgb*t.rgb,vCor.a*t.a);if(gl_FragColor.a<.01)discard;}`,
   transparent:true,depthWrite:false,depthTest:profundidade,blending:aditivo?THREE.AdditiveBlending:THREE.NormalBlending
  });
  this.pts=new THREE.Points(geo,this.mat);this.pts.frustumCulled=false;this.pts.renderOrder=aditivo?3:2;scene.add(this.pts);
  this.n=0;this.prox=0;
 }
 emitir(x,y,z,vx,vy,vz,vida,tam,r,g,b,a=1){
  const i=this.prox;this.prox=(this.prox+1)%this.max;
  this.pos[i*3]=x;this.pos[i*3+1]=y;this.pos[i*3+2]=z;this.vel[i*3]=vx;this.vel[i*3+1]=vy;this.vel[i*3+2]=vz;
  this.vida[i]=vida;this.vidaMax[i]=vida;this.tam0[i]=tam;this.rot[i]=Math.random()*6.28;
  this.cor0[i*4]=r;this.cor0[i*4+1]=g;this.cor0[i*4+2]=b;this.cor0[i*4+3]=a;
 }
 update(dt){
  const {pos,vel,vida,vidaMax,tam,tam0,cor,cor0}=this,fr=Math.exp(-this.arrasto*dt);
  for(let i=0;i<this.max;i++){
   if(vida[i]<=0){if(cor[i*4+3]!==0){cor[i*4+3]=0;tam[i]=0}continue}
   vida[i]-=dt;const k=1-Math.max(0,vida[i])/vidaMax[i];
   vel[i*3]*=fr;vel[i*3+1]=vel[i*3+1]*fr-this.g*dt;vel[i*3+2]*=fr;
   pos[i*3]+=vel[i*3]*dt;pos[i*3+1]+=vel[i*3+1]*dt;pos[i*3+2]+=vel[i*3+2]*dt;
   if(pos[i*3+1]<.05){pos[i*3+1]=.05;vel[i*3+1]*=-.3}
   tam[i]=tam0[i]*(1+k*this.crescer);
   const fade=k<.1?k/.1:1-(k-.1)/.9;
   cor[i*4]=cor0[i*4];cor[i*4+1]=cor0[i*4+1]*(1-k*.5);cor[i*4+2]=cor0[i*4+2]*(1-k*.7);cor[i*4+3]=cor0[i*4+3]*Math.max(0,fade);
   this.rot[i]+=dt*.4;
  }
  const g=this.pts.geometry;g.attributes.position.needsUpdate=true;g.attributes.cor.needsUpdate=true;g.attributes.tam.needsUpdate=true;g.attributes.rot.needsUpdate=true;
 }
}

export function criarEfeitos(scene,camera,renderer){
 const fogo=new Particulas(scene,{max:2600,mapa:texRadial([[0,'rgba(255,255,255,1)'],[.3,'rgba(255,220,150,.9)'],[1,'rgba(255,120,20,0)']]),aditivo:true,arrasto:2.2,crescer:1.6,gravidade:-2});
 const fumaca=new Particulas(scene,{max:2600,mapa:texFumaca(),arrasto:1.1,crescer:3,gravidade:-1.2});
 const faisca=new Particulas(scene,{max:1500,mapa:texRadial([[0,'rgba(255,255,255,1)'],[.4,'rgba(255,230,160,.8)'],[1,'rgba(255,160,40,0)']]),aditivo:true,gravidade:9.8,arrasto:.6,crescer:-.6});
 const poeira=new Particulas(scene,{max:1200,mapa:texFumaca(),arrasto:1.8,crescer:2.5,gravidade:-.3});
 const ajustar=()=>{const h=renderer.domElement.clientHeight||600;for(const p of [fogo,fumaca,faisca,poeira])p.mat.uniforms.escala.value=h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))};
 ajustar();window.addEventListener('resize',ajustar);

 const vivos=[]; // efeitos com malha própria (onda de choque, clarão, traçante, marca)
 const anelGeo=new THREE.RingGeometry(.8,1,48);anelGeo.rotateX(-Math.PI/2);
 const marcaTex=texRadial([[0,'rgba(10,8,6,.85)'],[.55,'rgba(25,20,15,.55)'],[1,'rgba(30,25,20,0)']]);
 const marcaGeo=new THREE.PlaneGeometry(1,1);marcaGeo.rotateX(-Math.PI/2);
 const luzes=[];for(let i=0;i<3;i++){const l=new THREE.PointLight('#ffb35c',0,60,1.6);scene.add(l);luzes.push({l,t:0,dur:1})}
 let tremor=0;
 const destroco=new THREE.InstancedMesh(new THREE.BoxGeometry(.25,.18,.3),new THREE.MeshStandardMaterial({color:'#2d2a27',roughness:.9}),160);
 destroco.instanceMatrix.setUsage(THREE.DynamicDrawUsage);destroco.castShadow=true;destroco.frustumCulled=false;scene.add(destroco);
 const dest=[];for(let i=0;i<160;i++)dest.push({p:new THREE.Vector3(0,-50,0),v:new THREE.Vector3(),r:new THREE.Euler(),w:new THREE.Vector3(),vida:0});
 let dProx=0;const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(1,1,1);

 function clarao(x,y,z,forca,dur=.5){const L=luzes.reduce((a,b)=>a.t<b.t?a:b);L.l.position.set(x,y+1,z);L.t=dur;L.dur=dur;L.forca=forca}
 const R=(a)=>(Math.random()-.5)*a;

 const api={
  // Explosão completa: bola de fogo, fumaça, faíscas, destroços, onda de choque, clarão e marca no chão.
  explosao(x,y,z,raio=6){
   const n=Math.round(40+raio*14);
   for(let i=0;i<n;i++){const d=new THREE.Vector3(R(2),Math.random()*1.2,R(2)).normalize().multiplyScalar(raio*(1.5+Math.random()*2.2));
    fogo.emitir(x+R(raio*.3),y+Math.random()*raio*.25,z+R(raio*.3),d.x,d.y,d.z,.45+Math.random()*.55,raio*(.35+Math.random()*.35),1,.75+Math.random()*.2,.4)}
   for(let i=0;i<n*.8;i++){const d=new THREE.Vector3(R(2),Math.random()*1.5+.3,R(2)).normalize().multiplyScalar(raio*(.6+Math.random()*1.3));
    const c=.16+Math.random()*.16;fumaca.emitir(x+R(raio*.4),y+Math.random()*raio*.3,z+R(raio*.4),d.x,d.y,d.z,2.5+Math.random()*2.5,raio*(.45+Math.random()*.4),c,c*.95,c*.9,.85)}
   for(let i=0;i<n;i++){const d=new THREE.Vector3(R(2),Math.random()*1.6+.2,R(2)).normalize().multiplyScalar(8+Math.random()*raio*4);
    faisca.emitir(x,y+.5,z,d.x,d.y,d.z,.6+Math.random()*.9,.18+Math.random()*.15,1,.85,.5)}
   for(let i=0;i<Math.min(24,6+raio*2);i++){const D=dest[dProx];dProx=(dProx+1)%dest.length;
    D.p.set(x+R(1),y+.5,z+R(1));D.v.set(R(16),6+Math.random()*12,R(16));D.w.set(R(14),R(14),R(14));D.vida=4;D.esc=.6+Math.random()*1.6}
   const anel=new THREE.Mesh(anelGeo,new THREE.MeshBasicMaterial({color:'#ffe2b0',transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
   anel.position.set(x,Math.max(.15,y),z);scene.add(anel);vivos.push({m:anel,t:0,dur:.55,tipo:'anel',raio:raio*3.2});
   const bola=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:'#fff1c9',transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending}));
   bola.position.set(x,y+raio*.2,z);scene.add(bola);vivos.push({m:bola,t:0,dur:.28,tipo:'bola',raio:raio*.9});
   if(y<3){const marca=new THREE.Mesh(marcaGeo,new THREE.MeshBasicMaterial({map:marcaTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4}));
    marca.position.set(x,.06,z);marca.scale.setScalar(raio*2.2);marca.rotation.y=Math.random()*6;scene.add(marca);vivos.push({m:marca,t:0,dur:30,tipo:'marca'})}
   clarao(x,y,z,raio*90,.6);
   const d=camera.position.distanceTo(new THREE.Vector3(x,y,z));tremor=Math.max(tremor,Math.min(1.2,raio*4/Math.max(8,d)));
  },
  impacto(x,y,z,cor=[1,.85,.5]){for(let i=0;i<14;i++)faisca.emitir(x,y,z,R(8),Math.random()*6,R(8),.25+Math.random()*.3,.12,...cor);
   for(let i=0;i<4;i++)poeira.emitir(x,y,z,R(1.5),Math.random()*1.2,R(1.5),.9,.5,.55,.5,.45,.5)},
  fumacaRastro(x,y,z,forca=1){fumaca.emitir(x+R(.2),y+R(.2),z+R(.2),R(.6),R(.6)+.3,R(.6),1.6+Math.random()*1.4,.55*forca,.82,.8,.78,.55);
   fogo.emitir(x,y,z,R(1),R(1),R(1),.08,.5*forca,1,.7,.3)},
  chama(x,y,z,vx,vy,vz,tam=.5){fogo.emitir(x,y,z,vx,vy,vz,.12+Math.random()*.08,tam,1,.6+Math.random()*.2,.25)},
  escapamento(x,y,z,vx,vz,forca=1){if(Math.random()>.35*forca+.15)return;const c=.35+Math.random()*.15;fumaca.emitir(x,y,z,vx+R(.4),.4+Math.random()*.3,vz+R(.4),.8+Math.random()*.6,.18+.12*forca,c,c,c,.35)},
  poeira(x,z,raio,forca=1){for(let i=0;i<3*forca;i++){const a=Math.random()*6.28,r=raio*(.6+Math.random()*.5);
   poeira.emitir(x+Math.cos(a)*r,.3,z+Math.sin(a)*r,Math.cos(a)*6*forca,.6,Math.sin(a)*6*forca,1.2,1.4,.72,.66,.55,.45)}},
  faiscas(x,y,z,n=2){for(let i=0;i<n;i++)faisca.emitir(x,y,z,R(2.5),1+Math.random()*2.5,R(2.5),.25+Math.random()*.25,.07+Math.random()*.05,1,.8,.4)},
  pegadas(x,z){for(let i=0;i<10;i++)poeira.emitir(x+R(1.5),.2,z+R(1.5),R(3),1+Math.random(),R(3),1,.9,.62,.58,.5,.5)},
  // Traçante da metralhadora: linha brilhante que some rápido.
  tracante(a,b){const g=new THREE.BufferGeometry().setFromPoints([a,b]);
   const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#ffe69a',transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
   scene.add(l);vivos.push({m:l,t:0,dur:.08,tipo:'linha'})},
  claraoBoca(x,y,z,forca=40){clarao(x,y,z,forca,.06);for(let i=0;i<3;i++)fogo.emitir(x,y,z,R(2),R(2),R(2),.05,.5,1,.8,.4)},
  clarao,
  tremor(){return tremor},
  update(dt){
   fogo.update(dt);fumaca.update(dt);faisca.update(dt);poeira.update(dt);
   for(let i=vivos.length-1;i>=0;i--){const v=vivos[i];v.t+=dt;const k=v.t/v.dur;
    if(k>=1){scene.remove(v.m);v.m.geometry!==anelGeo&&v.m.geometry!==marcaGeo&&v.m.geometry.dispose();v.m.material.dispose();vivos.splice(i,1);continue}
    if(v.tipo==='anel'){const s=.5+v.raio*Math.sqrt(k);v.m.scale.set(s,1,s);v.m.material.opacity=.7*(1-k)}
    if(v.tipo==='bola'){v.m.scale.setScalar(v.raio*(.4+k));v.m.material.opacity=1-k}
    if(v.tipo==='linha')v.m.material.opacity=1-k;
    if(v.tipo==='marca'&&k>.8)v.m.material.opacity=(1-k)/.2;
   }
   for(const L of luzes){if(L.t>0){L.t-=dt;L.l.intensity=Math.max(0,L.t/L.dur)*L.forca}else L.l.intensity=0}
   for(let i=0;i<dest.length;i++){const D=dest[i];
    if(D.vida>0){D.vida-=dt;D.v.y-=9.8*dt;D.p.addScaledVector(D.v,dt);if(D.p.y<.1){D.p.y=.1;D.v.multiplyScalar(.45);D.v.y=Math.abs(D.v.y)*.4;D.w.multiplyScalar(.5)}
     D.r.x+=D.w.x*dt;D.r.y+=D.w.y*dt;D.r.z+=D.w.z*dt;if(D.vida<=0)D.p.y=-50}
    _m.compose(D.p,_q.setFromEuler(D.r),_s.setScalar(D.esc||1));destroco.setMatrixAt(i,_m);
   }
   destroco.instanceMatrix.needsUpdate=true;
   tremor=Math.max(0,tremor-dt*2.2);
  }
 };
 return api;
}
