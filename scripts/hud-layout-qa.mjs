// Fast DOM geometry regression: actual HTML/CSS and actual PvP markup, without WebGL.
// Screenshots of the game itself are produced separately by visual-demo-qa.mjs.
import fs from 'node:fs';import {createRequire} from 'node:module';import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url),{server}=require('../server');
const output=process.env.QA_OUTPUT||'evidence/visual';
const result={scope:'DOM geometry only; full 3D screenshots are separate',ok:false,cases:[]};let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();await page.setViewport({width:390,height:844,hasTouch:true});
 await page.setRequestInterception(true);page.on('request',req=>new URL(req.url()).pathname==='/app.js'?req.respond({status:200,contentType:'text/javascript',body:''}):req.continue());
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 const markup=fs.readFileSync('public/pvp.js','utf8').match(/hud.innerHTML=`([\s\S]*?)`;/)[1].replace(/\$\{somLigado\(\)\?'🔊':'🔇'\}/g,'🔊');
 await page.evaluate(async markup=>{
  document.body.classList.add('jogando');document.querySelector('#game-hud').hidden=false;
  const pvp=document.createElement('div');pvp.id='pvp-hud';pvp.innerHTML=markup;document.querySelector('.world-wrap').append(pvp);
  document.querySelector('.pvp-slot').hidden=false;document.querySelector('.pvp-slot').textContent='Helicóptero';
  document.querySelector('#hud-score').append(document.querySelector('.pvp-placar'));
  document.querySelector('#hud-player-name').textContent='Demo';document.querySelector('#hud-online').textContent='2 online';
  document.querySelector('#hud-simulation').textContent='SIMULAÇÃO · 186 figurantes';
  (await import('/hud.mjs')).iniciarHud();
  window.__joy=(await import('/joystick.mjs')).iniciarAnalogico(document.querySelector('#joystick'),document.querySelector('#mobile-run'));
 },markup);
 for(const [width,height] of [[320,568],[375,667],[390,844],[360,800],[412,915],[844,390],[1280,800]]){
  await page.setViewport({width,height,hasTouch:true});
  for(const id of ['hud-chat','hud-cartaz','hud-settings']){
   await page.click(`[data-hud-panel="${id}"]`);
   const check=await page.evaluate(()=>{
    const selectors=['.game-toolbar','.hud-panel:not([hidden])','#joystick','#mobile-run','.pvp-base','.pvp-acoes'];
    const boxes=selectors.map(selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return r?.width&&r.height?{selector,x:r.x,y:r.y,w:r.width,h:r.height}:null}).filter(Boolean);
    const outside=boxes.filter(b=>b.x<0||b.y<0||b.x+b.w>innerWidth+.5||b.y+b.h>innerHeight+.5);
    const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+1&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+1)overlaps.push([a.selector,b.selector]);}
    return {boxes,outside,overlaps,panels:document.querySelectorAll('.hud-panel:not([hidden])').length};
   });
   result.cases.push({width,height,panel:id,...check});
   if(check.outside.length||check.overlaps.length||check.panels!==1)throw Error('Colisão '+width+'x'+height+' '+id+' '+JSON.stringify(check));
  }
  await page.click('#hud-minimize');
  if(await page.$eval('#game-hud',el=>el.querySelectorAll('.hud-panel:not([hidden])').length))throw Error('Painel aberto ao minimizar');
  await page.click('#hud-minimize');
 }
 await page.setViewport({width:390,height:844,hasTouch:true});
 const center=await page.$eval('#joystick',el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+100,center.y-100);
 const axis=await page.evaluate(()=>window.__joy.state);
 if(Math.abs(Math.hypot(axis.x,axis.y)-1)>.0001)throw Error('Captura/limite do analógico incorreto');
 await page.mouse.up();if((await page.evaluate(()=>window.__joy.state)).intensidade!==0)throw Error('Analógico preso ao soltar');
 // Pointer cancellation must release the control even without a pointerup.
 const input=await page.createCDPSession();
 await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x,y:center.y,id:1}]});
 await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+25,y:center.y-25,id:1}]});
 if((await page.evaluate(()=>window.__joy.state)).intensidade===0)throw Error('Toque não iniciou analógico');
 await input.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 if((await page.evaluate(()=>window.__joy.state)).intensidade!==0)throw Error('Analógico preso no cancelamento');
 result.joystick={captureOutside:true,release:true,cancel:true};result.ok=true;
}catch(e){result.error=e.stack;process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/hud-layout.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({ok:result.ok,cases:result.cases.length,joystick:result.joystick,error:result.error}));}
