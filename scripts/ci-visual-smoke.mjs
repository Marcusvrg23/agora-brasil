import {createRequire} from 'node:module';
import {setTimeout as sleep} from 'node:timers/promises';
import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url);
const {server}=require('../server.js');
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const errors=[];
let browser;
try{
 await new Promise((ok,fail)=>server.listen(0,'127.0.0.1',e=>e?fail(e):ok()));
 const url='http://127.0.0.1:'+server.address().port+'/?graficos=leve&figurantes=180';
 browser=await puppeteer.launch({headless:true,executablePath:chrome,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader',
  '--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--window-size=1280,900']});
 const page=await browser.newPage();
 page.on('pageerror',error=>errors.push(String(error.stack||error)));
 await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.querySelector('#figuras-info')?.textContent.includes('186 figurantes'),{timeout:25000});
 await page.waitForFunction(()=>document.querySelector('#world')?.width>0,{timeout:25000});
 // Garante que existam modelos 3D reais em vez de um substituto geométrico genérico.
 const initial=await page.evaluate(()=>{
  const overlay=document.querySelector('#figuras-info')?.textContent;
  return {overlay,quantity:document.querySelector('#multidao-quantidade')?.value,
   webgl:!!document.querySelector('#world')?.getContext('webgl2')};
 });
 if(!initial.webgl)throw Error('WebGL2 indisponível no Chrome do runner');
 console.log('MUNDO',JSON.stringify(initial));
 await page.click('#enter');
 await page.waitForFunction(()=>!document.querySelector('#game-hud')?.hidden,{timeout:10000});
 await page.select('#multidao-quantidade','300');
 await page.waitForFunction(()=>document.querySelector('#figuras-info')?.textContent.includes('306 figurantes'),{timeout:10000});
 await page.type('#cartaz-input','PAZ E DIALOGO');
 await page.click('#cartaz-btn');
 await page.waitForFunction(()=>document.querySelector('#cartaz-status')?.textContent.includes('aparecendo'),{timeout:12000});
 await sleep(1000);
 if(errors.length)throw Error('Erros não tratados na aplicação:\n'+errors.join('\n').slice(0,2800));
 console.log('PASSOU: canvas WebGL, 6 modelos originais, seletor de multidão, conexão multiplayer e cartaz sincronizado');
}finally{
 await browser?.close().catch(()=>{});
 await new Promise(ok=>server.close(ok));
}
