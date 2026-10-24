import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {setTimeout as sleep} from 'node:timers/promises';
import puppeteer from 'puppeteer-core';
import {configureQaCdn} from './qa-cdn-transport.mjs';
const require=createRequire(import.meta.url),{server}=require('../server.js');
const out=process.env.QA_OUT||'evidence/trucks-v2';
fs.mkdirSync(out,{recursive:true});
const result={at:new Date().toISOString(),ok:false,vehicles:[],locomotion:[],errors:[],requestFailures:[],limitations:['Chromium/SwiftShader; viewport mobile emulado, sem homologação de GPU móvel/Safari/iPhone físico.']};
let browser;
async function configure(page){
 page.on('pageerror',e=>result.errors.push(String(e.stack||e)));
 page.on('requestfailed',r=>result.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
 if(process.env.QA_CDN_VIA_CURL==='1')result.cdnTransport='curl pelo proxy do ambiente, TLS verificado, módulos sem alteração';
 await configureQaCdn(page);
}
async function inspectTruck(page){return page.evaluate(async()=>{
 const THREE=await import('three'),v=window.__truckPreviewScene.vehicle;
 v.raiz.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(v.modelo);
 const meshes=[];v.modelo.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,vertices:o.geometry.attributes.position.count,vertexColors:o.material.vertexColors,color:o.material.color?.getHexString(),roughness:o.material.roughness,metalness:o.material.metalness})});
 // Medir no referencial da carroceria exclui a suspensão global do veículo.
 const centers=()=>v.rodasTruck.map(w=>{w.geometry.computeBoundingBox();return v.corpo.worldToLocal(w.localToWorld(w.geometry.boundingBox.getCenter(new THREE.Vector3()))).toArray()});
 const before=centers(),radii=v.animPneus.map(p=>p.raio);
 const anchors=()=>v.bandeirasTruck.map(b=>{b.geometry.computeBoundingBox();return v.corpo.worldToLocal(b.localToWorld(new THREE.Vector3(0,b.geometry.boundingBox.max.y,0))).toArray()});
 const anchorsBefore=anchors();
 const spinBefore=v.animPneus.map(p=>p.pivot.rotation.x);
 v.s.vel=10;v.s.acel=0;v.s.lat=0;v.animar(.02,1,window.__truckPreviewScene.camera);v.raiz.updateMatrixWorld(true);
 const after=centers();
 const anchorsAfter=anchors(),camera=window.__truckPreviewScene.camera;camera.updateMatrixWorld(true);
 const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).project(camera));
 const glass=v.modelo.getObjectByName('Static_glass');
 return {...window.__truckPreview,viewport:{width:innerWidth,height:innerHeight,maxProjectedX:Math.max(...corners.map(c=>Math.abs(c.x))),maxProjectedY:Math.max(...corners.map(c=>Math.abs(c.y)))},frontGlassZ:glass?new THREE.Box3().setFromObject(glass).getCenter(new THREE.Vector3()).z:null,flagAnchorDrift:Math.max(0,...anchorsBefore.map((a,i)=>Math.hypot(...a.map((n,j)=>n-anchorsAfter[i][j])))),box:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()},meshes,radii,animatedWheels:v.animPneus.length,wheelCenterDrift:Math.max(0,...before.map((a,i)=>Math.hypot(...a.map((n,j)=>n-after[i][j])))),wheelSpinDelta:v.animPneus.map((p,i)=>p.pivot.rotation.x-spinBefore[i]),flags:v.bandeirasTruck.map(b=>({name:b.name,rotation:b.rotation.toArray(),localBounds:(b.geometry.computeBoundingBox(),{min:b.geometry.boundingBox.min.toArray(),max:b.geometry.boundingBox.max.toArray()})}))};
 });}
try{
 await new Promise((yes,no)=>server.listen(0,'127.0.0.1',e=>e?no(e):yes()));
 const origin='http://127.0.0.1:'+server.address().port;result.origin=origin;
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||(fs.existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':'/usr/bin/chromium'),args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 result.browser=await browser.version();
 const page=await browser.newPage();await configure(page);
 for(const mobile of (process.env.QA_QUICK?[false]:[false,true]))for(const version of (process.env.QA_QUICK?[2]:[1,2])){
  await page.goto('about:blank'); // trocar emulação não deve recarregar uma cena com assets remotos
  await page.setViewport(mobile?{width:390,height:844,deviceScaleFactor:1,hasTouch:true,isMobile:true}:{width:1150,height:780,deviceScaleFactor:1});
  await page.goto(origin+'/preview-caminhoes.html'+(version===2?'?trucksV2=1':''),{waitUntil:'domcontentloaded'});
  for(const [button,name,wheels] of [['lula','vermelho',4],['bolsonaro','verde',6]]){
   await page.click('#'+button);
   await page.waitForFunction(tipo=>window.__truckPreview?.tipo===tipo&&window.__truckPreview.status==='ok',{timeout:45000},button==='lula'?'caminhao-lula':'caminhao-bolsonaro');
   await sleep(250);
   const data=await inspectTruck(page);data.version=version;data.mobile=mobile;
   result.vehicles.push(data);
   assert.equal(data.origem,version===2?'v2':'original');
   assert.ok(Math.abs(data.box.size[2]-17)<.1,'comprimento normalizado em 17m');
   if(version===2){assert.equal(data.rodas,wheels);assert.equal(data.animatedWheels,wheels);assert.equal(data.bandeiras,3);assert.ok(data.wheelCenterDrift<.005,'rodas devem girar no eixo');}
   if(version===2){
    assert.ok(data.radii.every(r=>r>.7&&r<.85),'raio das rodas medido em metros após escala de 17m');
    assert.ok(data.flags.every(f=>Math.abs(f.rotation[0])<1e-8),'bandeiras V2 devem preservar a haste vertical');
    assert.ok(data.flagAnchorDrift<.0001,'tecido continua preso à haste');
    assert.ok(data.frontGlassZ>0,'frente e para-brisa orientados para +Z');
    assert.ok(data.viewport.maxProjectedX<1&&data.viewport.maxProjectedY<1,'modelo completo dentro da câmera');
    assert.ok(data.meshes.filter(m=>m.name.startsWith('Static_')).some(m=>m.metalness===0),'pintura V2 não pode herdar metalness=1 padrão do glTF');
   }
   await page.screenshot({path:`${out}/${name}-v${version}${mobile?'-mobile':''}.png`});
   if(!mobile){
    await page.evaluate(()=>{const q=window.__truckPreviewScene;q.camera.position.set(22,7,0);q.controls.target.set(0,3.4,0);q.controls.update()});
    await page.screenshot({path:`${out}/${name}-v${version}-lateral.png`});
    await page.evaluate(()=>{const q=window.__truckPreviewScene;q.camera.position.set(18,13,20);q.controls.update()});
   }
   await page.click('#ligar');await sleep(350);
   await page.screenshot({path:`${out}/${name}-v${version}${mobile?'-mobile':''}-movimento.png`});
   const timings=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last=performance.now();function f(now){times.push(now-last);last=now;if(times.length<45)requestAnimationFrame(f);else resolve(times.slice(5))}requestAnimationFrame(f)}));
   data.frameMs={median:timings.toSorted((a,b)=>a-b)[20],p95:timings.toSorted((a,b)=>a-b)[38]};
   console.log('PASS veículo',JSON.stringify({version,mobile,name,wheels:data.animatedWheels,radius:data.radii[0],flagAnchorDrift:data.flagAnchorDrift}));
   await page.click('#ligar');
  }
 }
 // Fallback real de carregamento: falha de V2 mantém os originais disponíveis.
 const fallback=await browser.newPage();await configureQaCdn(fallback,{abortV2:true});
 await fallback.goto(origin+'/preview-caminhoes.html?trucksV2=1',{waitUntil:'domcontentloaded'});
 await fallback.waitForFunction(()=>window.__truckPreview?.status==='ok');
 result.fallback=[];
 for(const button of ['lula','bolsonaro']){
  await fallback.click('#'+button);
  await fallback.waitForFunction(tipo=>window.__truckPreview?.tipo===tipo&&window.__truckPreview.status==='ok'&&window.__truckPreview.origem==='original',{timeout:45000},button==='lula'?'caminhao-lula':'caminhao-bolsonaro');
  const state=await fallback.evaluate(()=>window.__truckPreview);assert.equal(state.origem,'original');result.fallback.push(state);
 }
 await fallback.close();
 // A flag na URL principal não deve sequer solicitar os binários V2.
 await page.goto(origin+'/index.html?trucksV2=1',{waitUntil:'domcontentloaded'});
 const gameState=await page.evaluate(async()=>{
  const THREE=await import('three'),{Veiculo,origemModelos,statusModelos}=await import('./veiculos.js');
  const model=new Veiculo(new THREE.Scene(),{id:'qa',tipo:'caminhao-lula',x:0,z:0,vida:620,max:620},{});
  return new Promise((resolve,reject)=>{let tries=0;const poll=()=>{if(statusModelos.get('caminhao-lula')==='ok'){model.remover();resolve({source:origemModelos.get('caminhao-lula')})}else if(++tries>100)reject(Error('timeout V1 no jogo'));else setTimeout(poll,50)};poll()});
 });
 assert.equal(gameState.source,'original');result.mainPageWithV2Flag=gameState;
 // Clipes separados e contato dos pés, amostrados na malha com skinning.
 await page.goto('about:blank');
 await page.setViewport({width:1150,height:780,deviceScaleFactor:1,isMobile:false,hasTouch:false});
 await page.goto(origin+'/preview-corrida.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__avatarPreviewStatus?.rigged===true,{timeout:45000});
 for(const mode of ['walk','run']){
  await page.click(`[data-mode="${mode}"]`);await sleep(400);
  const data=await page.evaluate(async mode=>{
   const THREE=await import('three'),avatar=window.previewModel,q=window.__avatarPreviewScene;
   q.paused=true;avatar.position.y=0;avatar.rotation.y=0;
   const holder=avatar.userData.baseModel,{mixer,walk,run}=holder.userData;
   mixer.stopAllAction();const action=mode==='walk'?walk:run;action.reset().setEffectiveWeight(1).play();
   const model=holder.children[0],meshes=[];model.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m)});
   const feet={};
   for(const side of ['Left','Right'])feet[side]=meshes.flatMap(m=>{
    const ids=new Set(m.skeleton.bones.flatMap((b,i)=>b.name.startsWith(side)&&/Foot|Toe/.test(b.name)?[i]:[])),indices=[];
    const index=m.geometry.attributes.skinIndex,weight=m.geometry.attributes.skinWeight;
    for(let i=0;i<index.count;i++){let w=0;for(let c=0;c<4;c++)if(ids.has(index.getComponent(i,c)))w+=weight.getComponent(i,c);if(w>.5)indices.push(i)}
    return indices.length?[{mesh:m,indices}]:[];
   });
   const samples=[];
   for(let frame=0;frame<61;frame++){
    const t=action.getClip().duration*frame/60;action.time=t;mixer.update(0);avatar.updateMatrixWorld(true);
    for(const m of meshes)m.skeleton.update();
    const sole={};
    for(const [side,parts] of Object.entries(feet)){
     let y=Infinity;for(const {mesh,indices} of parts)for(const i of indices){const p=mesh.getVertexPosition(i,new THREE.Vector3());mesh.localToWorld(p);y=Math.min(y,p.y)}sole[side]=y;
    }
    samples.push({time:t,...sole});
   }
   return {mode,clip:action.getClip().name,duration:action.getClip().duration,timeScale:action.timeScale,tracks:action.getClip().tracks.length,footVertices:Object.fromEntries(Object.entries(feet).map(([s,p])=>[s,p.reduce((sum,a)=>sum+a.indices.length,0)])),samples};
  },mode);
  data.contact={floorY:-.025,toleranceMetres:.02,minGap:Math.min(...data.samples.map(s=>Math.min(s.Left,s.Right)+.025)),maxGap:Math.max(...data.samples.map(s=>Math.min(s.Left,s.Right)+.025)),framesNearFloor:data.samples.filter(s=>Math.abs(Math.min(s.Left,s.Right)+.025)<=.02).length,totalFrames:data.samples.length};
  result.locomotion.push(data);
  for(const [phase,t] of [['fase-15',.15],['fase-55',.55]]){
   await page.evaluate(({mode,t})=>{const a=window.previewModel,h=a.userData.baseModel,u=h.userData,q=window.__avatarPreviewScene;const action=mode==='walk'?u.walk:u.run;action.time=t*action.getClip().duration;u.mixer.update(0);q.camera.position.set(4.5,1.25,0);q.camera.lookAt(0,1.0,0);q.renderer.render(q.scene,q.camera)},{mode,t});
   await page.screenshot({path:`${out}/${mode}-${phase}.png`});
  }
  await page.evaluate(()=>window.__avatarPreviewScene.paused=false);
 }
 result.footContactApproved=result.locomotion.find(l=>l.mode==='run').contact.framesNearFloor>0;
 result.replacementApproved=false;
 result.replacementBlockers=['Acabamento procedural ainda requer aceite visual; sem texturas fotográficas.','Desempenho/controles/colisões em iPhone físico e Safari não homologados.'];
 assert.equal(result.errors.length,0,JSON.stringify(result.errors));result.ok=true;
}catch(e){result.error=String(e.stack||e);process.exitCode=1;
}finally{
 fs.writeFileSync(out+'/browser.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({ok:result.ok,browser:result.browser,vehicles:result.vehicles.map(v=>({version:v.version,tipo:v.tipo,mobile:v.mobile,wheels:v.animatedWheels,drift:v.wheelCenterDrift})),locomotion:result.locomotion.map(l=>({mode:l.mode,duration:l.duration,min:Math.min(...l.samples.map(s=>Math.min(s.Left,s.Right))),maxSupport:Math.max(...l.samples.map(s=>Math.min(s.Left,s.Right)))})),error:result.error,errors:result.errors},null,2));
 await browser?.close();if(server.listening)await new Promise(done=>server.close(done));
}
