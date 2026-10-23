const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs=require('node:fs');
(async()=>{
  fs.mkdirSync('screenshots',{recursive:true});
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3108'},stdio:'pipe'});
  let browser;
  try {
    for(let n=0;n<45;n++){try{if((await fetch('http://127.0.0.1:3108/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,350))}
    browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
    await page.goto('http://127.0.0.1:3108/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(8000);
    await page.screenshot({path:'screenshots/01-home-desktop.png',timeout:9000,animations:'disabled'}).catch(e=>console.log('CAPTURE_WARN home',e.message));
    await page.locator('#nickname').fill('Rocha');
    await page.locator('#enter').click({timeout:15000});
    await page.waitForFunction(()=>document.querySelector('#game-hud')?.hidden===false,{timeout:25000});
    await page.waitForTimeout(3500);
    await page.screenshot({path:'screenshots/02-jogo-desktop.png',timeout:9000,animations:'disabled'}).catch(e=>console.log('CAPTURE_WARN gameplay',e.message));
    console.log('MULTIPLAYER_SMOKE',{status:await page.locator('#live-count').textContent(),hud:await page.locator('#game-hud').isVisible()});
    await page.locator('[data-hud-panel="hud-settings"]').click();await page.locator('#sair-jogo').click();
    await page.locator('#creator-panel').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.screenshot({path:'screenshots/03-criador-personagens.png',timeout:9000,animations:'disabled'}).catch(e=>console.log('CAPTURE_WARN creator',e.message));
    const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
    await mobile.goto('http://127.0.0.1:3108/',{waitUntil:'domcontentloaded'});
    await mobile.waitForTimeout(6500);
    await mobile.screenshot({path:'screenshots/04-home-mobile.png',timeout:9000,animations:'disabled'}).catch(e=>console.log('CAPTURE_WARN mobile',e.message));
    await mobile.close();
  }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error('VISUAL_SMOKE_ERROR',e.stack);process.exitCode=1});
