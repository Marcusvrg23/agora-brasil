import fs from 'node:fs';
import WebSocket from 'ws';
const endpoint=process.env.AGORA_WSS_URL||'wss://agora-brasil-claude-3d-14erv73o7-marcusviniciustony-4392.vercel.app/api/ws';
const result={endpoint,checkedAt:new Date().toISOString(),steps:[],ok:false};
let ws1,ws2;
function mark(step,detail){result.steps.push({step,detail})}
function create(label){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(endpoint,{handshakeTimeout:12000});
  ws.queue=[];ws.waiters=[];
  const timer=setTimeout(()=>{ws.terminate();reject(Error(label+' handshake timeout'))},16000);
  ws.on('message',data=>{
   let p;try{p=JSON.parse(String(data))}catch{return}
   const waiter=ws.waiters.find(w=>w.type===p.type);
   if(waiter){ws.waiters.splice(ws.waiters.indexOf(waiter),1);waiter.resolve(p)}else ws.queue.push(p);
  });
  ws.once('open',()=>{clearTimeout(timer);mark(label+'-handshake','OK');resolve(ws)});
  ws.once('unexpected-response',(_,response)=>{clearTimeout(timer);mark(label+'-HTTP',response.statusCode);reject(Error(label+' HTTP '+response.statusCode))});
  ws.once('error',e=>{clearTimeout(timer);reject(Error(label+': '+e.message))});
 })
}
function get(ws,type,ms=9000){
 const index=ws.queue.findIndex(p=>p.type===type);
 if(index>=0)return Promise.resolve(ws.queue.splice(index,1)[0]);
 return new Promise((resolve,reject)=>{
  const item={type,resolve:v=>{clearTimeout(timer);resolve(v)}};
  const timer=setTimeout(()=>{ws.waiters.splice(ws.waiters.indexOf(item),1);reject(Error('Missing '+type))},ms);
  ws.waiters.push(item);
 });
}
try{
 ws1=await create('player1');
 const hello1=await get(ws1,'hello');mark('hello1',hello1.id);
 const enter1=get(ws1,'joined'),pvp1=get(ws1,'pvp');
 ws1.send(JSON.stringify({type:'join',room:'5300108',name:'SmokeP1',look:{team:'vermelho'}}));
 const j1=await enter1;const state=await pvp1;
 mark('joined1',j1.count);
 const s=state.estado||{};mark('pvp-data',{pickups:s.pickups?.length,vehicles:s.veiculos?.length,players:s.jogadores?.length});
 if(s.pickups?.length!==15||s.veiculos?.length!==16)throw Error('Wrong item counts: '+s.pickups?.length+'/'+s.veiculos?.length);
 ws2=await create('player2');await get(ws2,'hello');
 const ent2=get(ws2,'joined');
 const seeP2=get(ws1,'enter');
 ws2.send(JSON.stringify({type:'join',room:'5300108',name:'SmokeP2',look:{team:'amarelo'}}));
 const j2=await ent2;await seeP2;mark('joined2',j2.count);
 const recvMove=get(ws2,'move');
 ws1.send(JSON.stringify({type:'move',x:1,z:-29}));await recvMove;mark('movement','received');
 const recvChat=get(ws1,'chat');
 ws2.send(JSON.stringify({type:'chat',text:'Smoke OK'}));await recvChat;mark('chat','received');
 result.ok=true;
}catch(e){mark('error',String(e.message||e))}
finally{
 for(const s of [ws1,ws2])try{s?.close()}catch{}
 fs.mkdirSync('deploy',{recursive:true});
 fs.writeFileSync('deploy/ws-smoke-result.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exitCode=1;
}
