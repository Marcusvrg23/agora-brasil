import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out='previews/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,400))});
const base='http://127.0.0.1:3000';
let good=0;
try{
 await page.goto(base+'/?graficos=leve',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(9000);
 await page.screenshot({path:path.join(out,'brasilia-cidade-desktop.png'),fullPage:false});
 console.log('city status:',await page.locator('#model-status').innerText().catch(()=>null));
}catch(e){console.warn('City screenshot issue:',String(e))}
try{
 await page.goto(base+'/preview-interacoes.html',{waitUntil:'domcontentloaded',timeout:45000});
 for(const type of ['trex','carro','moto','helicoptero','caca']){
  await page.evaluate(type=>window.__agoraSelect?.(type),type);
  await page.waitForFunction(type=>window.__agoraPreviewStatus?.ready===true&&window.__agoraPreviewStatus?.type===type,type,{timeout:50000});
  await page.waitForTimeout(1100);
  const data=await page.evaluate(()=>window.__agoraPreviewStatus);
  await page.screenshot({path:path.join(out,'animacao-'+type+'.png'),fullPage:false});
  console.log('animation:',type,JSON.stringify(data));
  if(data.original) good++;
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.__agoraSelect('trex'));
 await page.waitForFunction(()=>window.__agoraPreviewStatus?.ready===true&&window.__agoraPreviewStatus?.type==='trex',{timeout:30000});
 await page.waitForTimeout(1200);
 await page.screenshot({path:path.join(out,'animacao-mobile.png'),fullPage:false});
}catch(e){console.error('Preview issue:',String(e))}
await fs.writeFile(path.join(out,'qa-result.json'),JSON.stringify({originalsLoaded:good,totalVehicles:5,errors},null,2));
console.log('Original models loaded:',good,'/5');
console.log('browser errors:',errors.slice(0,15));
await browser.close();
if(good<5)process.exitCode=1;
