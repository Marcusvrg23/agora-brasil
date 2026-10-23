'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {server}=require('../server');
test('cartaz 3D: sincronização autorizada, limites e estado ao entrar',async(t)=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='ws://127.0.0.1:'+server.address().port+'/api/ws';
 const sockets=[];
 t.after(async()=>{
  for(const ws of sockets)ws.terminate();
  await new Promise(ok=>server.close(ok));
 });
 function make(nome){
  return new Promise((ok,fail)=>{
   const ws=new WebSocket(url),msgs=[];sockets.push(ws);
   ws.on('error',fail);
   ws.on('message',chunk=>msgs.push(JSON.parse(String(chunk))));
   ws.on('open',()=>{
    ws.send(JSON.stringify({type:'join',name:nome,room:'5300108'}));
    ok({ws,msgs,send:o=>ws.send(JSON.stringify(o)),async wait(pred,timeout=2500){
     const start=Date.now();
     while(Date.now()-start<timeout){
      const got=msgs.find(pred);if(got)return got;
      await new Promise(r=>setTimeout(r,12));
     }
     throw Error('timeout aguardando mensagem '+nome);
    }});
   });
  });
 }
 const rafael=await make('Rafael');
 await rafael.wait(m=>m.type==='joined');
 rafael.send({type:'cartaz',text:'Lula 13'});
 await rafael.wait(m=>m.type==='cartaz'&&m.text==='Lula 13');
 const gabriel=await make('Gabriel');
 const joined=await gabriel.wait(m=>m.type==='joined');
 assert.equal(joined.peers.find(x=>x.name==='Rafael')?.cartaz,'Lula 13');
 await new Promise(ok=>setTimeout(ok,2250));
 rafael.send({type:'cartaz',text:'<b>Bolsonaro 22</b>'});
 const sanitized=await gabriel.wait(m=>m.type==='cartaz'&&m.text==='bBolsonaro 22/b');
 assert.ok(sanitized);
 rafael.send({type:'cartaz',text:'https://site.example'});
 await new Promise(ok=>setTimeout(ok,70));
 assert.ok(!gabriel.msgs.some(m=>m.type==='cartaz'&&m.text.includes('https')));
});
