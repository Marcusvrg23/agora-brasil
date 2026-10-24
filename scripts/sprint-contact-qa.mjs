// Measures the existing clip. Does not regenerate, retarget differently or fix its pose.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {configureQaCdn} from './qa-cdn-transport.mjs';
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'agora-contact-'));
process.env.DATA_DIR=temporary;
const {default:{server}}=await import('../server.js');
const out=process.env.QA_OUTPUT||'evidence/release-candidate/contact';fs.mkdirSync(out,{recursive:true});
const result={at:new Date().toISOString(),scope:'Rendered original GLB and skinning; game scale .84, floor 0; inferred forward translation from game speed, not physical motion capture',ok:false,physicalDeviceTested:false,modes:[]};
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 result.browser=await browser.version();
 const page=await browser.newPage();await configureQaCdn(page);
 await page.setViewport({width:1000,height:700,deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:'+server.address().port+'/preview-corrida.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__avatarPreviewStatus?.rigged,{timeout:45000});
 for(const mode of ['walk','run']){
  await page.click(`[data-mode="${mode}"]`);
  const data=await page.evaluate(async mode=>{
   const THREE=await import('three'),avatar=window.previewModel,q=window.__avatarPreviewScene;
   q.paused=true;avatar.position.set(0,0,0);avatar.rotation.set(0,0,0);avatar.scale.setScalar(.84);
   // The deployed preview floor is -0.025. This measurement instead reproduces
   // the game's world floor and avatar scale; report both scopes separately.
   q.scene.children.filter(o=>o.isMesh).forEach(o=>o.position.y=0);
   const holder=avatar.userData.baseModel,{mixer,walk,run}=holder.userData;
   mixer.stopAllAction();const action=mode==='walk'?walk:run;
   action.reset().setEffectiveWeight(1).play();
   const meshes=[];holder.children[0].traverse(m=>{if(m.isSkinnedMesh)meshes.push(m)});
   const feet={};
   for(const side of ['Left','Right'])feet[side]=meshes.flatMap(mesh=>{
    const bones=new Set(mesh.skeleton.bones.flatMap((b,i)=>b.name.startsWith(side)&&/Foot|Toe/.test(b.name)?[i]:[]));
    const indices=[],skin=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
    for(let i=0;i<skin.count;i++){let weight=0;for(let c=0;c<4;c++)if(bones.has(skin.getComponent(i,c)))weight+=weights.getComponent(i,c);if(weight>.5)indices.push(i)}
    return indices.length?[{mesh,indices}]:[];
   });
   const samples=[],duration=action.getClip().duration;
   for(let frame=0;frame<=120;frame++){
    action.time=duration*frame/120;mixer.update(0);avatar.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
    const sample={time:duration*frame/120};
    for(const [side,parts] of Object.entries(feet)){
     let sole=Infinity,count=0;const center=new THREE.Vector3();
     for(const {mesh,indices} of parts)for(const i of indices){const v=mesh.localToWorld(mesh.getVertexPosition(i,new THREE.Vector3()));sole=Math.min(sole,v.y);center.add(v);count++;}
     sample[side]={sole,center:center.divideScalar(count).toArray()};
    }
    samples.push(sample);
   }
   return {mode,clip:action.getClip().name,duration,timeScale:action.timeScale,gameScale:.84,floorY:0,contactToleranceM:.02,samples};
  },mode);
  data.support={minGapM:Math.min(...data.samples.map(s=>Math.min(s.Left.sole,s.Right.sole))),maxGapM:Math.max(...data.samples.map(s=>Math.min(s.Left.sole,s.Right.sole))),nearFloorFrames:data.samples.filter(s=>Math.abs(Math.min(s.Left.sole,s.Right.sole))<=.02).length,totalFrames:data.samples.length};
  const slip=[],speed=mode==='run'?7.5:3.2;
  for(let i=1;i<data.samples.length;i++)for(const side of ['Left','Right']){
   const a=data.samples[i-1],b=data.samples[i],dt=b.time-a.time;
   if(Math.abs(a[side].sole)>.02||Math.abs(b[side].sole)>.02)continue;
   const ca=a[side].center,cb=b[side].center;
   slip.push({side,time:a.time,worldSpeedMps:Math.hypot((cb[0]-ca[0])/dt,speed+(cb[2]-ca[2])/dt)});
  }
  data.stanceDrift={method:'Finite difference of a fixed set of foot-weighted vertices during two consecutive near-floor phases; add nominal +Z player speed. Diagnostic estimate, not live-video tracking.',nominalSpeedMps:speed,intervals:slip.length,meanMps:slip.length?slip.reduce((n,s)=>n+s.worldSpeedMps,0)/slip.length:null,maxMps:slip.length?Math.max(...slip.map(s=>s.worldSpeedMps)):null,samples:slip};
  result.modes.push(data);
  for(const phase of [.15,.55]){
   await page.evaluate(({mode,phase})=>{const a=window.previewModel,u=a.userData.baseModel.userData,q=window.__avatarPreviewScene;const action=mode==='run'?u.run:u.walk;action.time=phase*action.getClip().duration;u.mixer.update(0);a.updateMatrixWorld(true);q.camera.position.set(3.4,1.15,0);q.camera.lookAt(0,.85,0);q.renderer.render(q.scene,q.camera)},{mode,phase});
   await page.screenshot({path:`${out}/${mode}-${phase}.png`});
  }
 }
 if(result.modes[1].clip!=='Sprint_V2_RealStride'||result.modes[0].clip===result.modes[1].clip)throw Error('Clipes esperados não comprovados');
 result.ok=true; // successful measurement is NOT approval of foot contact or drift
 result.footSlideApproved=false;
}catch(e){result.error=e.stack;process.exitCode=1;}
finally{
 await browser?.close();await new Promise(r=>server.close(r));fs.rmSync(temporary,{recursive:true,force:true});
 fs.writeFileSync(out+'/metrics.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({...result,modes:result.modes.map(({samples,...m})=>({...m,stanceDrift:{...m.stanceDrift,samples:undefined}}))},null,2));
}
