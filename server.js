'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');
const { Debate } = require('./debate');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = path.join(__dirname, 'public');
const LIMIT_BYTES = 8 * 1024;
const rooms = new Map();
const debates = new Map();
const TEAMS = new Set(['vermelho','amarelo']);
const OUTFITS = new Set(['terno-faixa','camisa']);
let nextId = 1;
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
 '.glb':'model/gltf-binary', '.png':'image/png', '.jpg':'image/jpeg',
 '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

function clean(text, limit=180) {
  return String(text ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0,limit);
}
function roomCode(value) {
  const text=String(value || '');
  return /^(5300108|[0-9]{7})$/.test(text) ? text : '5300108';
}
function team(value) { return TEAMS.has(value) ? value : 'vermelho'; }
function outfit(value) { return OUTFITS.has(value) ? value : 'camisa'; }
const ACESSORIOS = new Set(['nenhum','bone','chapeu','oculos','megafone']);
const HEX = /^#[0-9a-f]{6}$/i;
// Visual completo do personagem; qualquer campo inválido cai no padrão.
function lookOf(input) {
  const src = input && typeof input === 'object' ? input : {};
  const cor = (v, padrao) => HEX.test(String(v || '')) ? String(v).toLowerCase() : padrao;
  return {
    team: team(src.team), outfit: outfit(src.outfit),
    pele: cor(src.pele, '#c99a74'), cabelo: cor(src.cabelo, '#2b1d14'),
    calca: cor(src.calca, '#28324a'), terno: cor(src.terno, '#2b2f36'),
    acessorio: ACESSORIOS.has(src.acessorio) ? src.acessorio : 'nenhum',
  };
}
function setLook(ws, input) { ws.look = lookOf(input); ws.team = ws.look.team; ws.outfit = ws.look.outfit; }
function player(ws) { return { id: ws.playerId, name: ws.name, team: ws.team }; }
function debateOf(code) {
  if (!debates.has(code)) debates.set(code, new Debate({ emit: packet => broadcast(code, packet) }));
  return debates.get(code);
}
function send(ws, packet) {
  if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(packet));
}
function peers(code) { return [...(rooms.get(code)||[])].filter(ws=>ws.readyState===WebSocket.OPEN); }
function broadcast(code, data, except) {
  for(const client of peers(code)) if(client!==except) send(client,data);
}
function publishCount(code) {
  broadcast(code,{type:'presence',count:peers(code).length});
}
function leave(ws) {
  if(!ws.room) return;
  const group=rooms.get(ws.room);
  if(group) {
    group.delete(ws);
    debates.get(ws.room)?.saiu(ws.playerId, Date.now());
    broadcast(ws.room,{type:'leave',id:ws.playerId});
    if(group.size===0) { rooms.delete(ws.room); debates.delete(ws.room); }
    else publishCount(ws.room);
  }
  ws.room=null;
}
const server=http.createServer((req,res)=>{
  let url;
  try { url=new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400).end('Bad Request'); return; }
  if(url.pathname==='/health') {
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
    res.end(JSON.stringify({ok:true,rooms:rooms.size,players:[...rooms.values()].reduce((n,s)=>n+s.size,0)}));
    return;
  }
  let pathname;
  try { pathname=decodeURIComponent(url.pathname); }
  catch {res.writeHead(400).end('Bad Request');return;}
  if(pathname==='/'||pathname==='') pathname='/index.html';
  const full=path.resolve(PUBLIC,'.'+pathname);
  if(!full.startsWith(PUBLIC+path.sep) && full!==PUBLIC) {
    res.writeHead(403).end('Forbidden');return;
  }
  fs.stat(full,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('Not Found');return;}
    res.writeHead(200,{
      'content-type': MIME[path.extname(full).toLowerCase()]||'application/octet-stream',
      'x-content-type-options':'nosniff',
      'cache-control':/\.(glb|png|webp)$/.test(full)?'public, max-age=600':'no-cache'
    });
    fs.createReadStream(full).pipe(res);
  });
});
const wss=new WebSocketServer({server,maxPayload:LIMIT_BYTES});
wss.on('connection',(ws)=>{
  ws.playerId='p'+nextId++;
  ws.room=null;ws.name='Visitante';ws.lastChat=0;ws.lastMove=0;setLook(ws,null);
  send(ws,{type:'hello',id:ws.playerId});
  ws.on('message',(raw)=>{
    let msg;try { msg=JSON.parse(String(raw)); }catch{return;}
    if(!msg||typeof msg!=='object') return;
    if(msg.type==='join') {
      leave(ws);
      ws.room=roomCode(msg.room);
      ws.name=clean(msg.name,24)||'Visitante';
      setLook(ws,msg.look||msg);
      if(!rooms.has(ws.room)) rooms.set(ws.room,new Set());
      const occupants=peers(ws.room).map(p=>({
        id:p.playerId,name:p.name,look:p.look,position:p.position||{x:0,z:-75}
      }));
      rooms.get(ws.room).add(ws);
      send(ws,{type:'joined',room:ws.room,peers:occupants,count:peers(ws.room).length});
      broadcast(ws.room,{type:'enter',id:ws.playerId,name:ws.name,look:ws.look,position:ws.position||{x:0,z:-75}},ws);
      publishCount(ws.room);
      send(ws,{type:'debate',state:debateOf(ws.room).estado()});
      return;
    }
    if(!ws.room) return;
    if(msg.type==='look') {
      setLook(ws,msg.look||msg);
      broadcast(ws.room,{type:'look',id:ws.playerId,look:ws.look});
      return;
    }
    if(typeof msg.type==='string'&&msg.type.startsWith('debate-')) {
      const debate=debateOf(ws.room),now=Date.now();
      if(msg.type==='debate-join') debate.entrarFila(player(ws),now);
      if(msg.type==='debate-leave') debate.sairFila(ws.playerId);
      if(msg.type==='debate-say') debate.falar(ws.playerId,clean(msg.text,280),now);
      if(msg.type==='debate-pass') debate.passarVez(ws.playerId,now);
      if(msg.type==='debate-vote') debate.votar(ws.playerId,msg.side);
      return;
    }
    if(msg.type==='chat') {
      const now=Date.now();
      if(now-ws.lastChat<1200) return;
      ws.lastChat=now;
      const text=clean(msg.text,180);
      if(text) broadcast(ws.room,{type:'chat',id:ws.playerId,name:ws.name,text,time:now});
    }
    if(msg.type==='move') {
      const now=Date.now();
      if(now-ws.lastMove<70) return;ws.lastMove=now;
      const x=Number(msg.x),z=Number(msg.z);
      if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>350||Math.abs(z)>950) return;
      ws.position={x,z};
      broadcast(ws.room,{type:'move',id:ws.playerId,x,z},ws);
    }
  });
  ws.on('close',()=>leave(ws));
  ws.on('error',()=>leave(ws));
});
function tickDebates(now=Date.now()) { for(const debate of debates.values()) debate.tick(now); }
if(require.main===module) {
  setInterval(tickDebates,500).unref();
  server.listen(PORT,HOST,()=>console.log('Ágora Brasil em http://localhost:'+PORT));
}
module.exports={server,clean,roomCode,team,outfit,lookOf,tickDebates};
