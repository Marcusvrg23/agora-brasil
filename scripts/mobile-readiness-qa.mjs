// Isolated HTTPS/WSS + real Chromium/WebGL. Self-signed loopback TLS is NOT public staging.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import {execFileSync} from 'node:child_process';
import {createHash,X509Certificate} from 'node:crypto';
import puppeteer from 'puppeteer-core';
import {WebSocket} from 'ws';
import {configureQaCdn} from './qa-cdn-transport.mjs';

const out=process.env.QA_OUTPUT||'evidence/assets-mobile';fs.mkdirSync(out,{recursive:true});
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'agora-mobile-qa-'));
process.env.DATA_DIR=path.join(temporary,'data');
const {default:backend}=await import('../server.js');const {server}=backend;
const result={at:new Date().toISOString(),ok:false,scope:'Chromium + SwiftShader; viewport/touch emulation; local self-signed HTTPS/WSS only',physicalDeviceTested:false,publicStagingTested:false,errors:[],failedRequests:[],poses:[],screenshots:[]};
let browser,proxy,peer;const connections=new Set();
const track=socket=>{connections.add(socket);socket.once('close',()=>connections.delete(socket));};
const listen=s=>new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
try{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',temporary+'/key.pem','-out',temporary+'/cert.pem','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 const cert=fs.readFileSync(temporary+'/cert.pem');await listen(server);server.on('connection',track);
 proxy=https.createServer({key:fs.readFileSync(temporary+'/key.pem'),cert},(req,res)=>{
  const upstream=http.request({hostname:'127.0.0.1',port:server.address().port,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 proxy.on('connection',track);
 proxy.on('upgrade',(req,socket,head)=>{
  const upstream=http.request({hostname:'127.0.0.1',port:server.address().port,path:req.url,headers:req.headers});
  upstream.on('upgrade',(response,target,upstreamHead)=>{
   track(target);socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');
   if(upstreamHead.length)socket.write(upstreamHead);if(head.length)target.write(head);
   socket.pipe(target).pipe(socket);socket.on('error',()=>target.destroy());target.on('error',()=>socket.destroy());
   socket.once('close',()=>target.destroy());target.once('close',()=>socket.destroy());
  });
  upstream.on('error',()=>socket.destroy());upstream.end();
 });
 await listen(proxy);const origin=`https://127.0.0.1:${proxy.address().port}`;
 // Browser trusts only the two public keys needed for this execution, never all TLS.
 const certificates=[cert];if(process.env.NODE_EXTRA_CA_CERTS)certificates.push(fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS));
 const spki=certificates.map(pem=>createHash('sha256').update(new X509Certificate(pem).publicKey.export({type:'spki',format:'der'})).digest('base64')).join(',');
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',protocolTimeout:120000,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--ignore-certificate-errors-spki-list='+spki]});
 result.browser=await browser.version();
 const page=await browser.newPage();page.setDefaultTimeout(90000);
 await configureQaCdn(page);
 page.on('pageerror',e=>result.errors.push(e.stack));page.on('requestfailed',r=>result.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 await page.evaluateOnNewDocument(()=>{
  const Original=WebSocket;window.__qaPackets=[];
  window.WebSocket=class extends Original{constructor(...args){super(...args);window.__qaSocket=this;this.addEventListener('message',e=>{try{const m=JSON.parse(e.data);window.__qaPackets.push({type:m.type,id:m.id,role:m.role});}catch{}});}};
 });
 await page.setViewport({width:1000,height:700,deviceScaleFactor:1});
 await page.goto(origin+'/?graficos=leve&figurantes=180',{waitUntil:'domcontentloaded',timeout:90000});
 const snapshot=()=>page.evaluate(async()=>(await import('/app.js')).visualSnapshot());
 await page.waitForFunction(async()=>(await import('/app.js')).visualSnapshot().models.length===6);
 if(process.env.QA_RC==='1'&&process.env.QA_SKIP_SELECTION!=='1'){
  result.selection=[];
  const identities=JSON.parse(fs.readFileSync('assets/original-models.manifest.json')).identities;
  for(const identity of identities){
   await page.click('#base-cards .base-card:nth-child('+({homem:2,mulher:3,idoso:4,idosa:5}[identity.base])+')');await page.select('#team',identity.team);
   const look=await page.evaluate(()=>JSON.parse(localStorage.getItem('agora-look')));
   if(look.base!==identity.base||look.team!==identity.team)throw Error('Seleção não preservada: '+identity.name);
   await (await page.$('#avatar-preview')).screenshot({path:out+'/selection-'+identity.name+'.png'});
   result.selection.push({...identity,look,originalGlbIncluded:identity.base==='homem'});
  }
  await page.click('#base-cards .base-card:nth-child(2)');await page.select('#team','vermelho');
 }
 await page.$eval('#nickname',e=>e.value='Homologacao');await page.click('#enter');
 await page.waitForFunction(()=>document.body.classList.contains('jogando'));
 await page.evaluate(()=>document.fullscreenElement&&document.exitFullscreen());
 await page.waitForFunction(async()=>{const s=(await import('/app.js')).visualSnapshot();return s.player.glb&&s.models.filter(m=>m.glb&&m.walk&&m.run).length>=2&&Object.keys(s.baseStatus).length===4;});
 result.initial=await snapshot();console.log('READY',JSON.stringify(result.initial.models));
 result.transport=await page.evaluate(()=>({secureContext:isSecureContext,url:window.__qaSocket.url,joined:window.__qaPackets.some(p=>p.type==='joined'),webgl:!!document.querySelector('#world').getContext('webgl2')}));
 if(!result.transport.url.startsWith('wss:')||!result.transport.joined||!result.transport.secureContext)throw Error('HTTPS/WSS not established');
 const received=[];peer=new WebSocket(origin.replace('https:','wss:')+'/api/ws',{ca:cert});
 peer.on('message',b=>received.push(JSON.parse(String(b))));
 await new Promise((resolve,reject)=>{peer.once('open',resolve);peer.once('error',reject);});
 peer.send(JSON.stringify({type:'join',room:'5300108',name:'Observador',role:'visitor'}));
 await page.click('[data-hud-panel="hud-cartaz"]');await page.type('#cartaz-input','PAZ E DIALOGO');await page.click('#cartaz-btn');
 await page.waitForFunction(()=>document.querySelector('#cartaz-status').textContent.includes('aparecendo'));
 if(!received.some(p=>p.type==='cartaz'&&p.text==='PAZ E DIALOGO'))throw Error('Independent WSS observer missing sign');
 result.signReceivedByIndependentPeer=true;
 for(const [name,moving,running] of [['idle',false,false],['walk',true,false],['run',true,true]]){
  await page.evaluate(()=>document.activeElement?.blur());if(moving)await page.keyboard.down('w');if(running)await page.keyboard.down('Shift');
  await page.waitForFunction(async({moving,running})=>{const s=(await import('/app.js')).visualSnapshot();return s.player.moving===moving&&(!moving||s.player.running===running);},{},{moving,running});
  const s=await snapshot(),sign=s.signs[0];
  const gap=Math.hypot(...s.player.hand.map((v,i)=>v-sign.position[i]));
  if(gap>.001||sign.haste>.3||!sign.verso||s.localNameTags)throw Error('Sign/hand/name regression');
  if(moving&&!new RegExp(running?'sprint|run':'caminhada','i').test(s.player.locomotion))throw Error('Unexpected GLB clip: '+s.player.locomotion);
  result.poses.push({name,gap,player:s.player,sign});
  const file=`desktop-${name}.png`;await page.screenshot({path:out+'/'+file});result.screenshots.push({file,width:1000,height:700,emulated:false,state:name});
  await page.keyboard.up('w');await page.keyboard.up('Shift');await page.waitForFunction(async()=>!(await import('/app.js')).visualSnapshot().player.moving);
 }
 const beforeId=await page.evaluate(()=>window.__qaPackets.find(p=>p.type==='joined').id);
 await page.evaluate(()=>window.__qaSocket.close());
 await page.waitForFunction(()=>window.__qaPackets.filter(p=>p.type==='joined').length===2);
 const afterId=await page.evaluate(()=>window.__qaPackets.filter(p=>p.type==='joined').at(-1).id);
 if(beforeId!==afterId)throw Error('WSS reconnect changed identity');result.reconnect={sameId:true};
 if(process.env.QA_RC==='1'){
  const context=await browser.createBrowserContext();
  try{
   const second=await context.newPage();second.setDefaultTimeout(90000);second.setDefaultNavigationTimeout(90000);await configureQaCdn(second);
   second.on('pageerror',e=>result.errors.push(e.stack));
   await second.evaluateOnNewDocument(()=>{
    const Original=WebSocket;window.__qaRemoteMoves=[];
    window.WebSocket=class extends Original{constructor(...args){super(...args);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='move')window.__qaRemoteMoves.push({id:m.id,x:m.x,z:m.z})});}};
   });
   await second.setViewport({width:640,height:480,deviceScaleFactor:1});
   await second.goto(origin+'/?graficos=leve&figurantes=0',{waitUntil:'domcontentloaded'});
   await second.$eval('#nickname',e=>e.value='QA-Par');await second.click('#enter');
   await second.waitForFunction(async()=>document.body.classList.contains('jogando')&&(await import('/app.js')).visualSnapshot().player.glb);
   await second.evaluate(()=>document.fullscreenElement&&document.exitFullscreen());
   await second.waitForFunction(async()=>(await import('/app.js')).visualSnapshot().signs.length===1);
   await page.bringToFront();await page.evaluate(()=>document.activeElement?.blur());
   await page.keyboard.down('w');await page.keyboard.down('Shift');
   try{await second.waitForFunction(id=>window.__qaRemoteMoves.some(m=>m.id===id),{},afterId);}
   finally{await page.keyboard.up('Shift');await page.keyboard.up('w');}
   await second.screenshot({path:out+'/two-players-peer.png'});
   result.twoBrowsers={independentContexts:true,remoteMoveReceived:true,remoteSignRendered:true,localNameTags:(await second.evaluate(async()=>(await import('/app.js')).visualSnapshot())).localNameTags,online:await second.$eval('#live-count',e=>e.textContent)};
   if(result.twoBrowsers.localNameTags!==0)throw Error('Nome local duplicado no segundo navegador');
  }finally{await context.close();await page.bringToFront();}
 }
 // Changing isMobile reloads the page in Chromium. Leave deliberately, then enter
 // the new mobile session through the UI instead of clicking the now-hidden HUD.
 await page.click('[data-hud-panel="hud-settings"]');await page.click('#sair-jogo');
 await page.waitForFunction(()=>!document.body.classList.contains('jogando'));
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.waitForFunction(async()=>(await import('/app.js')).visualSnapshot().player.glb);
 await page.click('#enter');await page.waitForFunction(()=>document.body.classList.contains('jogando'));
 await page.evaluate(()=>document.fullscreenElement&&document.exitFullscreen());
 await page.click('[data-hud-panel="hud-cartaz"]');await page.type('#cartaz-input','PAZ E DIALOGO');await page.click('#cartaz-btn');
 await page.waitForFunction(()=>document.querySelector('#cartaz-status').textContent.includes('aparecendo'));
 const center=await page.$eval('#joystick',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
 const input=await page.createCDPSession(),before=(await snapshot()).player.position;
 await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x,y:center.y,id:1}]});
 await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x,y:center.y-40,id:1}]});
 await page.waitForFunction(async before=>{const s=(await import('/app.js')).visualSnapshot();return s.input.intensidade>0&&s.player.moving&&Math.hypot(s.player.position[0]-before[0],s.player.position[2]-before[2])>.01;},{},before);
 await input.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 await page.waitForFunction(async()=>{const s=(await import('/app.js')).visualSnapshot();return s.input.intensidade===0&&!s.player.moving;});
 result.touch={moved:true,cancelStopped:true,source:'CDP emulated touch, not a physical touchscreen'};
 for(const [file,width,height] of [['iphone-13-emulated.png',390,844],['iphone-se-emulated.png',320,568],['iphone-landscape-emulated.png',844,390]]){
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  if(process.env.QA_RC==='1'){
   result.hud??=[];
   for(const panel of ['hud-chat','hud-cartaz','hud-settings']){
    await page.click(`[data-hud-panel="${panel}"]`);
    if(await page.$eval('#'+panel,e=>e.hidden))await page.click(`[data-hud-panel="${panel}"]`);
    const check=await page.evaluate(()=>{
     const boxes=['.game-toolbar','.hud-panel:not([hidden])','#joystick','#mobile-run','.pvp-base','.pvp-acoes'].flatMap(selector=>{
      const e=document.querySelector(selector),r=e?.getBoundingClientRect();return r?.width&&r.height?[{selector,x:r.x,y:r.y,w:r.width,h:r.height}]:[];
     });
     const outside=boxes.filter(b=>b.x<-.5||b.y<-.5||b.x+b.w>innerWidth+.5||b.y+b.h>innerHeight+.5);
     const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1)overlaps.push([a.selector,b.selector]);}
     const joy=document.querySelector('#joystick').getBoundingClientRect();return {boxes,outside,overlaps,circular:Math.abs(joy.width-joy.height)<1};
    });
    result.hud.push({width,height,panel,...check});
    if(check.outside.length||check.overlaps.length||!check.circular)throw Error('HUD sobreposta: '+JSON.stringify(check));
   }
   await page.click('#hud-minimize');
   if(await page.$eval('#game-hud',e=>e.querySelectorAll('.hud-panel:not([hidden])').length))throw Error('Painel não minimizou');
  }
  await page.screenshot({path:out+'/'+file});result.screenshots.push({file,width,height,emulated:true,state:'player with GLB + sign'});
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.click('[data-hud-panel="hud-settings"]');await page.click('#sair-jogo');await page.waitForFunction(()=>!document.body.classList.contains('jogando'));
 await page.click('#enter-visitor');await page.waitForFunction(()=>document.body.classList.contains('observando'));
 result.visitor=await page.evaluate(()=>({actions:getComputedStyle(document.querySelector('.pvp-acoes')).display,life:getComputedStyle(document.querySelector('.pvp-base')).display,disabled:document.querySelector('#pvp-toggle').disabled}));
 if(result.visitor.actions!=='none'||result.visitor.life!=='none'||!result.visitor.disabled)throw Error('Visitor regression');
 await page.screenshot({path:out+'/iphone-visitor-emulated.png'});result.screenshots.push({file:'iphone-visitor-emulated.png',width:390,height:844,emulated:true,state:'visitor'});
 result.final=await snapshot();
 if(process.env.QA_RC==='1'){
  result.density=[];result.densityLimits={p95FrameMs:100,jsHeapMiB:512,sampleFrames:30,maxSeconds:8};
  for(const n of [180,300,600,1200,2000]){
   await page.evaluate(n=>{const e=document.querySelector('#multidao-quantidade');e.value=String(n);e.dispatchEvent(new Event('change'));},n);
   const frames=await page.evaluate(()=>new Promise(resolve=>{
    const frames=[];let last,finished=false;const finish=()=>{if(finished)return;finished=true;resolve(frames);};const timer=setTimeout(finish,8000);
    const tick=now=>{if(finished)return;if(last!==undefined)frames.push(now-last);last=now;if(frames.length>=30){clearTimeout(timer);finish();}else requestAnimationFrame(tick)};requestAnimationFrame(tick);
   }));
   const metrics=await page.metrics(),s=await snapshot(),sorted=frames.toSorted((a,b)=>a-b);
   const sample={requested:n,actual:s.density,virtualTotal:s.density+s.models.length,frames:frames.length,frameP50Ms:sorted[Math.floor(sorted.length*.5)]??null,frameP95Ms:sorted[Math.floor(sorted.length*.95)]??null,jsHeapMiB:metrics.JSHeapUsedSize/1024/1024,render:s.render,scope:'Chromium/SwiftShader; emulação 390x844, não iPhone físico'};
   sample.safe=sample.frames===30&&sample.frameP95Ms<=100&&sample.jsHeapMiB<=512;
   result.density.push(sample);console.log('DENSITY',JSON.stringify(sample));
   if(!sample.safe){result.densityStopped='Limite de frame-time/memória ou amostra incompleta; estágios maiores não executados';break;}
  }
 }
 result.ok=result.errors.length===0;if(!result.ok)process.exitCode=1;
}catch(error){result.error=error.stack;process.exitCode=1;console.error(error.stack);
 if(browser){const pages=await browser.pages();await pages.at(-1)?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
}finally{
 peer?.terminate();await browser?.close();for(const socket of connections)socket.destroy();
 if(proxy)await new Promise(r=>proxy.close(r));await new Promise(r=>server.close(r));fs.rmSync(temporary,{recursive:true,force:true});
 fs.writeFileSync(out+'/browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({ok:result.ok,poses:result.poses.length,screenshots:result.screenshots.length,transport:result.transport,error:result.error}));
}
