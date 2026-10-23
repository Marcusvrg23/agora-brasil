import {createRequire} from 'node:module';
import fs from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url),{server}=require('../server.js');
const evidence='evidence';fs.mkdirSync(evidence,{recursive:true});
const result={at:new Date().toISOString(),ok:false,scenarios:[],pageErrors:[],failedRequests:[]};
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'];
 // Trust only the public CA injected by this managed environment, never all certificates.
 const ca=process.env.NODE_EXTRA_CA_CERTS;
 if(ca&&fs.existsSync(ca)){
  const cert=new X509Certificate(fs.readFileSync(ca));
  const spki=createHash('sha256').update(cert.publicKey.export({type:'spki',format:'der'})).digest('base64');
  args.push('--ignore-certificate-errors-spki-list='+spki);
  result.environmentCaTrusted=cert.subject;
 }
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args});
 result.browser=await browser.version();
 const url=`http://127.0.0.1:${server.address().port}/?graficos=leve&figurantes=180`;
 const page=await browser.newPage();
 page.on('pageerror',e=>result.pageErrors.push(e.stack));page.on('requestfailed',r=>result.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 // Observe the actual WebSocket protocol without exposing session credentials in evidence.
 await page.evaluateOnNewDocument(()=>{
  const Original=window.WebSocket;window.__packets=[];
  window.WebSocket=class extends Original{constructor(...args){super(...args);window.__socket=this;this.addEventListener('message',e=>{try{const m=JSON.parse(e.data);window.__packets.push({type:m.type,id:m.id,role:m.role,count:m.count});}catch{}})}};
 });
 await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.querySelector('#figuras-info')?.textContent.includes('186 figurantes'),{timeout:30000});
 await page.click('#enter');
 await page.waitForFunction(()=>document.body.classList.contains('jogando'),{timeout:15000});
 await page.click('[data-hud-panel="hud-cartaz"]');
 await page.type('#cartaz-input','PAZ E DIALOGO');await page.click('#cartaz-btn');
 await page.waitForFunction(()=>document.querySelector('#cartaz-status')?.textContent.includes('aparecendo'),{timeout:15000});
 await page.screenshot({path:evidence+'/desktop-manifestacao.png'});
 const original=await page.evaluate(()=>window.__packets.find(m=>m.type==='joined').id);
 await page.evaluate(()=>window.__socket.close());
 await page.waitForFunction(()=>window.__packets.filter(m=>m.type==='joined').length>=2,{timeout:15000});
 const resumed=await page.evaluate(()=>window.__packets.filter(m=>m.type==='joined').at(-1).id);
 if(original!==resumed)throw Error('Reconexão mudou identidade');
 result.scenarios.push({name:'desktop: manifestação, cartaz e reconexão automática',ok:true,idPreserved:true});
 await page.evaluate(()=>{if(document.fullscreenElement)return document.exitFullscreen()});
 await page.click('[data-hud-panel="hud-settings"]');await page.click('#sair-jogo');
 await page.waitForFunction(()=>!document.body.classList.contains('jogando'));
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.click('#enter-visitor');
 await page.waitForFunction(()=>window.__packets.filter(m=>m.type==='joined').at(-1)?.role==='visitor',{timeout:15000});
 const visitor=await page.evaluate(()=>({disabled:document.querySelector('#pvp-toggle').disabled,cartazDisabled:document.querySelector('#cartaz-btn').disabled,legend:document.querySelector('#figuras-info').textContent,status:document.querySelector('#pvp-label').textContent,webgl:!!document.querySelector('#world').getContext('webgl2')}));
 if(!visitor.disabled||!visitor.cartazDisabled||!visitor.webgl)throw Error('Visitante/WebGL inválido');
 await page.screenshot({path:evidence+'/mobile-visitante.png'});
 result.scenarios.push({name:'mobile: visitante com controles bloqueados',ok:true,...visitor});
 if(result.pageErrors.length)throw Error('Erro JavaScript na página');
 result.ok=true;
}catch(e){result.error=e.stack;process.exitCode=1;
 if(browser){const pages=await browser.pages();await pages.at(-1)?.screenshot({path:evidence+'/browser-failure.png'}).catch(()=>{})}
}finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(evidence+'/browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2))}
