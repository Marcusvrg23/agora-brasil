import fs from 'node:fs';
import {createRequire} from 'node:module';
import {X509Certificate,createHash} from 'node:crypto';
import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url),{server}=require('../server.js');
const out='evidence/visual';fs.mkdirSync(out,{recursive:true});
const continuing=process.argv.includes('--controls-only');
const result=continuing?JSON.parse(fs.readFileSync(out+'/layout-and-pose.json','utf8')):{at:new Date().toISOString(),ok:false,viewports:[],poses:[],density:[],errors:[],requests:[],limitations:['Browser viewport emulation and SwiftShader do not certify physical mobile performance.']};
if(continuing){delete result.error;result.continuationAt=new Date().toISOString();}
let browser,peer;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'];
 if(process.env.NODE_EXTRA_CA_CERTS){const c=new X509Certificate(fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS));args.push('--ignore-certificate-errors-spki-list='+createHash('sha256').update(c.publicKey.export({type:'spki',format:'der'})).digest('base64'));}
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args,protocolTimeout:90000});
 result.browser=await browser.version();
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>{result.errors.push(e.stack);console.log('PAGE_ERROR',e.message)});
 page.on('requestfailed',r=>result.requests.push({url:r.url(),error:r.failure()?.errorText}));
 await page.evaluateOnNewDocument(()=>{
  const WS=window.WebSocket;window.__qaPackets=[];
  window.WebSocket=class extends WS{constructor(...args){super(...args);window.__qaSocket=this;this.addEventListener('message',e=>{try{window.__qaPackets.push(JSON.parse(e.data))}catch{}})}};
 });
 await page.setViewport({width:continuing?390:1280,height:continuing?844:800,deviceScaleFactor:1,isMobile:false,hasTouch:true});
 const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base+'/?graficos=leve&figurantes=180',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.querySelector('#figuras-info')?.textContent.includes('186 figurantes'),{timeout:60000});
 await page.$eval('#nickname',el=>{el.value=''});await page.type('#nickname','Demo');await page.click('#enter');
 await page.waitForFunction(()=>document.body.classList.contains('jogando'));
 await page.evaluate(()=>document.fullscreenElement&&document.exitFullscreen());
 const snapshot=()=>page.evaluate(async()=> (await import('/app.js')).visualSnapshot());
 await page.waitForFunction(async()=> (await import('/app.js')).visualSnapshot().player.glb);
 const state=await snapshot();console.log('READY',JSON.stringify(state.models));
 result.models=state.models;
 // Independent real WebSocket observer verifies the same cartaz text and movement.
 const {WebSocket}=require('ws');peer=new WebSocket(base.replace('http:','ws:')+'/api/ws');
 const received=[];peer.on('message',raw=>received.push(JSON.parse(String(raw))));peer.on('error',e=>result.errors.push(e.message));
 await new Promise((r,e)=>{peer.once('open',r);peer.once('error',e)});peer.send(JSON.stringify({type:'join',room:'5300108',name:'Observador',role:'visitor'}));
 await page.click('[data-hud-panel="hud-cartaz"]');
 await page.type('#cartaz-input','PAZ E DIALOGO');await page.click('#cartaz-btn');
 await page.waitForFunction(()=>document.querySelector('#cartaz-status').textContent.includes('aparecendo'));
 await pause(100);
 if(!received.some(m=>m.type==='cartaz'&&m.text==='PAZ E DIALOGO'))throw Error('Cartaz ausente no cliente independente');
 if(!continuing){
 const distances=(s)=>{const hand=s.player.hand,sign=s.signs[0];if(!hand||!sign)throw Error('Mão/cartaz ausente');const gap=Math.hypot(...hand.map((v,i)=>v-sign.position[i]));if(gap>.001||sign.haste>.3||!sign.verso||s.localNameTags!==0)throw Error('Pose/pega/etiqueta inválida');return {gap,haste:sign.haste,verso:sign.verso};};
 for(const [name,moving,run] of [['parado',false,false],['andando',true,false],['correndo',true,true]]){
  await page.evaluate(()=>document.activeElement?.blur());
  if(moving)await page.keyboard.down('w');if(run)await page.keyboard.down('Shift');
  await page.waitForFunction(async({moving,run})=>{const s=(await import('/app.js')).visualSnapshot();return s.player.moving===moving&&(!moving||s.player.running===run);},{},{moving,run});
  const s=await snapshot();
  if(s.player.moving!==moving|| (moving&&s.player.running!==run))throw Error('Locomoção incorreta: '+name);
  if(moving&&!new RegExp(run?'run':'caminhada','i').test(s.player.locomotion))throw Error('Clip GLB incorreto: '+s.player.locomotion);
  result.poses.push({name,...distances(s),player:s.player});
  await page.screenshot({path:`${out}/desktop-cartaz-${name}.png`});
  await page.keyboard.up('w');await page.keyboard.up('Shift');await page.waitForFunction(async()=>!(await import('/app.js')).visualSnapshot().player.moving);
 }
 console.log('POSES_OK');
 await page.click('#cartaz-remover');await pause(2400); // server cartaz rate limit, then remove again if needed
 await page.click('#cartaz-remover');await page.waitForFunction(async()=>!(await import('/app.js')).visualSnapshot().signs.length);
 // Show inventory through the actual server's pickup protocol for layout verification.
 await page.evaluate(async()=>{const p=window.__qaPackets.find(m=>m.type==='pvp').estado.pickups[0];window.__qaSocket.send(JSON.stringify({type:'move',x:p.x,z:p.z}));await new Promise(r=>setTimeout(r,100));window.__qaSocket.send(JSON.stringify({type:'pvp-pegar',pickup:p.id}));});
 await page.waitForFunction(()=>!document.querySelector('.pvp-slot').hidden);
 const overlapCheck=()=>page.evaluate(()=>{
  const selectors=['.game-toolbar','.hud-panel:not([hidden])','#joystick','#mobile-run','.pvp-base','.pvp-acoes'];
  const boxes=selectors.map(selector=>{const el=document.querySelector(selector);if(!el||getComputedStyle(el).display==='none')return null;const r=el.getBoundingClientRect();return r.width&&r.height?{selector,x:r.x,y:r.y,w:r.width,h:r.height}:null;}).filter(Boolean);
  const outside=boxes.filter(b=>b.x<-.5||b.y<-.5||b.x+b.w>innerWidth+.5||b.y+b.h>innerHeight+.5);
  const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1)overlaps.push([a.selector,b.selector]);}
  return {width:innerWidth,height:innerHeight,boxes,outside,overlaps,panels:document.querySelectorAll('.hud-panel:not([hidden])').length};
 });
 for(const [label,width,height] of [['iphone-se',320,568],['iphone-8',375,667],['iphone-13',390,844],['android-small',360,800],['android-large',412,915],['landscape',844,390],['desktop',1280,800]]){
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:false,hasTouch:true});
  await page.waitForFunction(()=>document.body.classList.contains('jogando'));
  for(const panel of ['hud-chat','hud-cartaz','hud-settings']){
   await page.click(`[data-hud-panel="${panel}"]`);await pause(80);
   const check=await overlapCheck();
   result.viewports.push({label,panel,...check});if(check.outside.length||check.overlaps.length||check.panels!==1)throw Error('HUD layout: '+label+' '+panel+' '+JSON.stringify(check));
  }
  await page.click('#hud-minimize');const minimized=await overlapCheck();if(minimized.panels!==0)throw Error('Minimizar não esconde painéis');
  await page.screenshot({path:`${out}/${label}-hud.png`});
  await page.click('#hud-minimize');
  console.log('VIEWPORT_OK',label);
 }
 }
 if((await snapshot()).localNameTags!==0)throw Error('Nome local duplicado');
 // Real captured pointer movement is tested on a touch-sized viewport.
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:false,hasTouch:true});
 if(await page.$eval('#hud-settings',e=>!e.hidden))await page.click('[data-hud-panel="hud-settings"]');
 const joy=await page.$eval('#joystick',el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
 const before=(await snapshot()).player.position;
 await page.mouse.move(joy.x,joy.y);await page.mouse.down();await page.mouse.move(joy.x,joy.y-40);
 await page.waitForFunction(async()=>{const s=(await import('/app.js')).visualSnapshot();return s.input.intensidade>0&&s.player.moving;});
 await page.waitForFunction(async before=>{const p=(await import('/app.js')).visualSnapshot().player.position;return Math.hypot(p[0]-before[0],p[2]-before[2])>.01;},{},before);
 const during=await snapshot();await page.mouse.up();
 await page.waitForFunction(async()=>{const s=(await import('/app.js')).visualSnapshot();return s.input.intensidade===0&&!s.player.moving;});const after=await snapshot();
 if(!during.player.moving||after.player.moving||Math.hypot(during.player.position[0]-before[0],during.player.position[2]-before[2])<=0)throw Error('Analógico não move/paralisa jogador');
 result.joystick={moved:true,released:true};
 await page.click('[data-hud-panel="hud-settings"]');await page.click('#sair-jogo');
 await page.waitForFunction(()=>!document.body.classList.contains('jogando'));
 await page.click('#enter-visitor');await page.waitForFunction(()=>document.body.classList.contains('observando'));
 const visitor=await page.evaluate(()=>({pvpActions:getComputedStyle(document.querySelector('.pvp-acoes')).display,life:getComputedStyle(document.querySelector('.pvp-base')).display,disabled:document.querySelector('#pvp-toggle').disabled}));
 if(visitor.pvpActions!=='none'||visitor.life!=='none'||!visitor.disabled)throw Error('Visitante mostra ações PvP');
 result.visitor=visitor;await page.screenshot({path:out+'/mobile-visitante.png'});
 await page.setViewport({width:800,height:600,deviceScaleFactor:1,isMobile:false,hasTouch:true});
 for(const n of [180,600,1200,2000]){
  await page.evaluate(n=>{const s=document.querySelector('#multidao-quantidade');s.value=String(n);s.dispatchEvent(new Event('change'));},n);
  const sample=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[];let previous=performance.now(),done=false;
   const finish=()=>{if(done)return;done=true;resolve(frames)};
   setTimeout(finish,12000);
   const tick=now=>{if(done)return;frames.push(now-previous);previous=now;if(frames.length>=20)finish();else requestAnimationFrame(tick)};requestAnimationFrame(tick);
  }));
  const actual=await snapshot();const sorted=[...sample].sort((a,b)=>a-b),mean=sample.reduce((a,b)=>a+b,0)/sample.length;
  const measurement={requested:n,actual:actual.density,frames:sample.length,frameMeanMs:mean,frameP95Ms:sorted[Math.floor(sorted.length*.95)],fps:1000/mean,render:actual.render,renderer:'SwiftShader desktop 800x600; not mobile certification'};
  result.density.push(measurement);console.log('DENSITY',JSON.stringify(measurement));
 }
 result.ok=result.errors.length===0;
 if(!result.ok)process.exitCode=1;
}catch(error){result.error=error.stack;console.log('FAIL',error.stack);process.exitCode=1;
 if(browser){const pages=await browser.pages();await pages.at(-1)?.screenshot({path:out+'/failure.png'}).catch(()=>{})}
}finally{
 peer?.terminate();await browser?.close();await new Promise(r=>server.close(r));
 fs.writeFileSync(out+'/results.json',JSON.stringify(result,null,2)+'\n');console.log('RESULT',JSON.stringify({ok:result.ok,errors:result.errors.length,viewports:result.viewports.length,poses:result.poses.length}));
}
