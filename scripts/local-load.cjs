'use strict';
// Starts its own loopback server. No target URL and no production access.
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {WebSocket}=require('ws');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const quantile=(xs,q)=>xs.length?[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*q))]:null;
const output=process.argv[2]||'evidence/load.json';
const result={at:new Date().toISOString(),node:process.version,platform:`${os.platform()} ${os.arch()}`,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,roomLimitOverride:250,scope:'loopback only; one room; 5 moves/s/client; 20 s/stage; not an Internet or hosting certification',limits:{maxConnections:200,maxRssMiB:512,maxCpuPercentOneCore:90,maxP95Ms:250,maxDisconnects:0},stages:[],ok:false};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agora-load-'));
const worker=`const {server,tickCombates,tickDebates}=require('./server');const {monitorEventLoopDelay}=require('node:perf_hooks');const delay=monitorEventLoopDelay({resolution:20});delay.enable();let cpu=process.cpuUsage(),at=performance.now();setInterval(()=>{const now=performance.now(),used=process.cpuUsage();process.send({rss:process.memoryUsage().rss,cpu:((used.user-cpu.user)+(used.system-cpu.system))/(now-at)/10,eventLoopP95Ms:delay.percentile(95)/1e6});cpu=used;at=now;delay.reset()},1000).unref();setInterval(tickCombates,250).unref();setInterval(tickDebates,500).unref();server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));`;
const child=spawn(process.execPath,['-e',worker],{cwd:path.join(__dirname,'..'),env:{...process.env,DATA_DIR:temp,MAX_ROOM_PLAYERS:'250',MP_ACCESS_TOKEN:'',ADMIN_TOKEN:''},stdio:['ignore','pipe','pipe','ipc']});
let endpoint,metrics=[],clients=[],errors=0,unexpected=0,active=false,moveTimer;
child.stderr.on('data',data=>process.stderr.write(data));
const pending=new Map();let sync=[],rtt=[],joinedTimes=[],reconnectTimes=[],syncMessages=0;
child.on('message',m=>{if(m.port)endpoint=`ws://127.0.0.1:${m.port}/api/ws`;else if(active)metrics.push(m);});
async function connect(token){
 const started=performance.now(),ws=new WebSocket(endpoint,{handshakeTimeout:3000});
 const c={ws,token,expected:false,id:null};
 ws.on('error',()=>errors++);
 ws.on('close',()=>{if(active&&!c.expected)unexpected++});
 ws.on('message',raw=>{
  const m=JSON.parse(String(raw));
  if(m.type==='joined'){c.id=m.id;c.token=m.resumeToken;c.joined=true;}
  if(m.type==='move'&&c===clients[0]){const key=`${m.id}:${m.x}`,sent=pending.get(key);if(sent!==undefined){sync.push(performance.now()-sent);pending.delete(key);syncMessages++;}}
 });
 let pingAt=0;ws.on('pong',()=>{if(pingAt){rtt.push(performance.now()-pingAt);pingAt=0}});
 c.ping=()=>{pingAt=performance.now();ws.ping()};
 await once(ws,'open');ws.send(JSON.stringify({type:'join',room:'5300108',name:'Load',resumeToken:token}));
 const end=Date.now()+3000;while(!c.joined&&Date.now()<end)await sleep(5);
 if(!c.joined)throw Error('Join timeout');
 (token?reconnectTimes:joinedTimes).push(performance.now()-started);
 return c;
}
(async()=>{
 try{
  const end=Date.now()+5000;while(!endpoint&&Date.now()<end)await sleep(10);if(!endpoint)throw Error('Server startup timeout');
  for(const target of [25,50,100,200]){
   metrics=[];sync=[];rtt=[];joinedTimes=[];reconnectTimes=[];pending.clear();errors=0;unexpected=0;syncMessages=0;
   while(clients.length<target){clients.push(await connect());await sleep(10)}
   active=true;let tick=0,minOpen=target;
   moveTimer=setInterval(()=>{
    tick++;const x=Number((tick*.01).toFixed(2));
    for(const c of clients){if(c.ws.readyState!==WebSocket.OPEN)continue;if(c!==clients[0])pending.set(`${c.id}:${x}`,performance.now());c.ws.send(JSON.stringify({type:'move',x,z:-30}));if(tick%5===0)c.ping()}
    minOpen=Math.min(minOpen,clients.filter(c=>c.ws.readyState===WebSocket.OPEN).length);
   },200);
   await sleep(10000);
   const count=Math.max(1,Math.floor(target*.1));
   for(let i=1;i<=count;i++){const old=clients[i];old.expected=true;old.ws.terminate();clients[i]=await connect(old.token)}
   await sleep(10000);clearInterval(moveTimer);active=false;
   const sustained=clients.filter(c=>c.ws.readyState===WebSocket.OPEN).length;
   const health=await (await fetch(endpoint.replace('ws:','http:').replace('/api/ws','/health'))).json();
   const stage={target,durationSeconds:20,reconnections:reconnectTimes.length,minOpenDuringSample:minOpen,sustained,serverPlayers:health.players,errors,unexpectedDisconnects:unexpected,joinP95Ms:quantile(joinedTimes,.95),reconnectP95Ms:quantile(reconnectTimes,.95),pingP50Ms:quantile(rtt,.5),pingP95Ms:quantile(rtt,.95),syncP50Ms:quantile(sync,.5),syncP95Ms:quantile(sync,.95),syncMessages,maxRssMiB:Math.max(...metrics.map(m=>m.rss))/1024/1024,maxCpuPercentOneCore:Math.max(...metrics.map(m=>m.cpu)),eventLoopP95MaxMs:Math.max(...metrics.map(m=>m.eventLoopP95Ms))};
   stage.safe=sustained===target&&health.players===target&&errors===0&&unexpected===0&&stage.maxRssMiB<512&&stage.maxCpuPercentOneCore<90&&stage.syncP95Ms!==null&&stage.syncP95Ms<250&&stage.pingP95Ms!==null&&stage.pingP95Ms<250;
   result.stages.push(stage);console.log(JSON.stringify(stage));
   if(!stage.safe){result.stopped='Safety threshold reached';break;}
  }
  result.ok=result.stages.length===4&&result.stages.every(s=>s.safe);
 }catch(e){result.error=e.stack;process.exitCode=1}
 finally{active=false;clearInterval(moveTimer);for(const c of clients){c.expected=true;if(c.ws.readyState===WebSocket.OPEN)c.ws.send(JSON.stringify({type:'leave'}));c.ws.terminate()}child.kill();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');fs.rmSync(temp,{recursive:true,force:true});if(!result.ok)process.exitCode=1}
})();
