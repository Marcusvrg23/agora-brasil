import fs from 'node:fs';
import {createRequire} from 'node:module';
import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url);
const {server}=require('../server.js');
const evidence='evidence/vehicle-run-smoke';
fs.mkdirSync(evidence,{recursive:true});
let browser;
const result={at:new Date().toISOString(),ok:false,vehicles:[],run:null,errors:[],limitations:['Chromium + SwiftShader emulado; não equivale a Safari em iPhone físico.']};
const opts={timeout:35000};
try{
 await new Promise((yes,no)=>server.listen(0,'127.0.0.1',err=>err?no(err):yes()));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader',
   '--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 result.browser=await browser.version();
 const page=await browser.newPage();page.on('pageerror',e=>result.errors.push(String(e.stack||e)));
 await page.setViewport({width:1150,height:780,deviceScaleFactor:1});
 await page.goto(origin+'/preview-caminhoes.html',{waitUntil:'domcontentloaded',timeout:45000});
 const selections=[['caminhao-lula','lula','caminhao-vermelho'],['caminhao-bolsonaro','bolsonaro','caminhao-verde'],['carro','carro','carro-esportivo']];
 for(const [tipo,button,nome] of selections){
  if(button!=='lula')await page.click('#'+button);
  await page.waitForFunction(tipo=>window.__truckPreview?.tipo===tipo&&['ok','procedural'].includes(window.__truckPreview.status),opts,tipo);
  await new Promise(done=>setTimeout(done,700));
  const data=await page.evaluate(()=>window.__truckPreview);
  if(data.tipo!==tipo)throw Error('Preview apresentou tipo incorreto '+tipo);
  if(tipo.startsWith('caminhao')&&data.status!=='ok')throw Error('GLB original não carregou para '+tipo);
  if(data.procedural&&data.rodas<4)throw Error('Reserva sem quatro pneus independentes '+tipo);
  await page.screenshot({path:evidence+'/'+nome+'.png'});
  result.vehicles.push(data);
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,hasTouch:true});
 await page.screenshot({path:evidence+'/carro-mobile-emulado.png'});
 await page.goto(origin+'/preview-corrida.html',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.__avatarPreviewStatus?.rigged===true,opts);
 for(const mode of ['walk','run']){
  await page.click('[data-mode="'+mode+'"]');
  await page.waitForFunction(mode=>window.__avatarPreviewStatus?.mode===mode,opts,mode);
  await new Promise(done=>setTimeout(done,500));
  await page.screenshot({path:evidence+'/personagem-'+mode+'.png'});
 }
 result.run=await page.evaluate(()=>window.__avatarPreviewStatus);
 if(!result.run?.rigged)throw Error('Run GLB não foi comprovado na prévia');
 if(result.errors.length)throw Error('Erros de JavaScript '+result.errors.join('\n').slice(0,3000));
 result.ok=true;
}catch(e){result.error=String(e.stack||e);process.exitCode=1;
}finally{
 fs.writeFileSync(evidence+'/result.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 await browser?.close().catch(()=>{});
 if(server.listening)await new Promise(done=>server.close(done));
}
