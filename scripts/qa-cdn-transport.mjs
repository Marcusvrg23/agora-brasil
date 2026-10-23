import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),cache=new Map();

// Opt-in para executores em que Chromium não herda o proxy/CA. Curl usa o
// proxy e mantém a verificação TLS; apenas módulos Three.js públicos, sem alterar bytes.
export async function configureQaCdn(page,{abortV2=false}={}){
 const viaCurl=process.env.QA_CDN_VIA_CURL==='1';
 if(!viaCurl&&!abortV2)return;
 await page.setRequestInterception(true);
 page.on('request',async request=>{
  const url=request.url();
  if(abortV2&&new URL(url).pathname.startsWith('/assets/veiculos/v2/'))return request.abort();
  if(!viaCurl||!url.startsWith('https://cdn.jsdelivr.net/npm/three@0.169.0/'))return request.continue();
  try{
   if(!cache.has(url))cache.set(url,exec('curl',['--fail','--silent','--show-error','--location','--max-time','30',url],{maxBuffer:4*1024*1024}).then(r=>r.stdout));
   await request.respond({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:await cache.get(url)});
  }catch(e){console.error('QA CDN:',url,e.message);await request.abort();}
 });
}
