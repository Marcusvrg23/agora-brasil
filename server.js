'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');
const { Debate } = require('./debate');
const { Combate } = require('./combate');
const { Anuncios, Erro } = require('./anuncios');
const pagamentos = require('./pagamentos');

const PORT = Number(process.env.PORT || 80);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = path.join(__dirname, 'public');
const LIMIT_BYTES = 8 * 1024;
const rooms = new Map();
const debates = new Map();
const combates = new Map();
const graffitis = new Map();
const placarTotal = {vermelho:0,amarelo:0};
const salvarPlacar=()=>{try{fs.mkdirSync(DATA,{recursive:true});fs.writeFileSync(path.join(DATA,'vitorias.json'),JSON.stringify(placarTotal))}catch(e){console.warn('Placar nao persistido:',e.message)}};
const TEAMS = new Set(['vermelho','amarelo']);
const OUTFITS = new Set(['terno-faixa','camisa']);
let nextId = 1;
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
try{Object.assign(placarTotal,JSON.parse(fs.readFileSync(path.join(DATA,'vitorias.json'),'utf8')))}catch{}
const anuncios = new Anuncios({ arquivo: path.join(DATA, 'anuncios.json'), pastaImagens: path.join(DATA, 'imagens') });
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
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
const BASES = new Set(['boneco','homem','mulher','idoso','idosa']);
const CABELOS = new Set(['auto','curto','ondulado','longo','cacheado','cacheado-curto','coque','grisalho','careca']);
const HEX = /^#[0-9a-f]{6}$/i;
// Visual completo do personagem; qualquer campo inválido cai no padrão.
function lookOf(input) {
  const src = input && typeof input === 'object' ? input : {};
  const cor = (v, padrao) => HEX.test(String(v || '')) ? String(v).toLowerCase() : padrao;
  return {
    base: BASES.has(src.base) ? src.base : 'homem',
    team: team(src.team), outfit: outfit(src.outfit),
    pele: cor(src.pele, '#c99a74'), cabelo: cor(src.cabelo, '#2b1d14'),
    calca: cor(src.calca, '#28324a'), terno: cor(src.terno, '#2b2f36'),
    acessorio: ACESSORIOS.has(src.acessorio) ? src.acessorio : 'nenhum',
    cabeloEstilo: CABELOS.has(src.cabeloEstilo) ? src.cabeloEstilo : 'auto',
  };
}
function setLook(ws, input) { ws.look = lookOf(input); ws.team = ws.look.team; ws.outfit = ws.look.outfit; }
function player(ws) { return { id: ws.playerId, name: ws.name, team: ws.team }; }
function debateOf(code) {
  if (!debates.has(code)) debates.set(code, new Debate({ emit: packet => broadcast(code, packet) }));
  return debates.get(code);
}
function combateOf(code) {
  if (!combates.has(code)) combates.set(code, new Combate({ emit: packet => broadcast(code, packet), onWin: team => {if(team==='vermelho'||team==='amarelo'){placarTotal[team]++;salvarPlacar();for(const c of rooms.keys())broadcast(c,{type:'vitorias',placar:placarTotal})}} }));
  return combates.get(code);
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
    combates.get(ws.room)?.sair(ws.playerId);
    broadcast(ws.room,{type:'leave',id:ws.playerId});
    if(group.size===0) { rooms.delete(ws.room); debates.delete(ws.room); combates.delete(ws.room); }
    else publishCount(ws.room);
  }
  ws.room=null;
}
function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function lerCorpo(req, limite = 700 * 1024) {
  return new Promise((resolve, reject) => {
    let n = 0; const partes = [];
    req.on('data', (c) => { n += c.length; if (n > limite) { reject(new Erro('Envio muito grande.', 413)); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {}); } catch { reject(new Erro('JSON inválido.')); } });
    req.on('error', reject);
  });
}
function ipDe(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function adminOk(req) {
  const t = String(req.headers['x-admin-token'] || '');
  return ADMIN_TOKEN && t.length === ADMIN_TOKEN.length && require('node:crypto').timingSafeEqual(Buffer.from(t), Buffer.from(ADMIN_TOKEN));
}
// Todos os jogadores, em todas as salas, recebem a grade de telões atualizada.
function publicarTeloes() { const pkt = { type: 'teloes', slots: anuncios.publico() }; for (const code of rooms.keys()) broadcast(code, pkt); }

async function confirmarPagamento(ad) {
  if (!ad?.pagamento || ad.status !== 'aguardando_pagamento' || !pagamentos.configurado()) return ad;
  const p = await pagamentos.consultar(ad.pagamento.id);
  if (p.status === 'approved' && p.referencia === ad.id && Math.abs(p.valor - ad.valor) < 0.01) anuncios.marcarPago(ad.id, 'mercadopago');
  return anuncios.buscar(ad.id);
}

async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  if (p === '/api/placar' && m === 'GET') return json(res,200,{placar:placarTotal,nota:'Vitorias de equipes no jogo, nao votos eleitorais.'});
  if (p === '/api/teloes' && m === 'GET') return json(res, 200, { slots: anuncios.publico(), pagamentoOnline: pagamentos.configurado() });
  if (p === '/api/anuncios' && m === 'POST') {
    const corpo = await lerCorpo(req);
    const ad = anuncios.criar(corpo, ipDe(req));
    let aviso = null;
    if (pagamentos.configurado()) {
      try {
        const cobranca = await pagamentos.criarPix({
          valor: ad.valor, descricao: `Anúncio Ágora Brasil · ${ad.slot} · ${ad.dias} dia(s)`, email: ad.contato, referencia: ad.id,
          notificacao: PUBLIC_URL ? `${PUBLIC_URL}/api/pagamentos/webhook` : null,
        });
        anuncios.registrarCobranca(ad.id, cobranca);
      } catch (e) { aviso = 'Não foi possível gerar o Pix agora. Seu pedido foi salvo; tente consultar de novo em instantes.'; console.error(e.message); }
    } else aviso = 'Pagamento online ainda não está ativo neste servidor. Seu pedido foi salvo e a equipe entra em contato pelo e-mail.';
    return json(res, 201, { ...anuncios.status(anuncios.buscar(ad.id)), chave: ad.chave, aviso });
  }
  const consulta = /^\/api\/anuncios\/([a-f0-9]{16})$/.exec(p);
  if (consulta && m === 'GET') {
    let ad = anuncios.doDono(consulta[1], url.searchParams.get('chave'));
    if (!ad) return json(res, 404, { erro: 'Anúncio não encontrado.' });
    try { ad = await confirmarPagamento(ad); } catch (e) { console.error(e.message); }
    return json(res, 200, anuncios.status(ad));
  }
  if (p === '/api/pagamentos/webhook' && m === 'POST') {
    const corpo = await lerCorpo(req, 64 * 1024).catch(() => ({}));
    const pid = String(corpo?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '');
    if (pid && pagamentos.configurado()) {
      try {
        const pg = await pagamentos.consultar(pid);
        const ad = anuncios.buscar(pg.referencia);
        if (ad && pg.status === 'approved' && Math.abs(pg.valor - ad.valor) < 0.01) anuncios.marcarPago(ad.id, 'mercadopago');
      } catch (e) { console.error(e.message); }
    }
    return json(res, 200, { ok: true });
  }
  if (p.startsWith('/api/admin/')) {
    if (!ADMIN_TOKEN) return json(res, 503, { erro: 'Defina ADMIN_TOKEN no servidor para usar a moderação.' });
    if (!adminOk(req)) return json(res, 401, { erro: 'Token de administrador inválido.' });
    if (p === '/api/admin/anuncios' && m === 'GET') return json(res, 200, { anuncios: anuncios.admin() });
    const acao = /^\/api\/admin\/anuncios\/([a-f0-9]{16})\/(aprovar|recusar|pago)$/.exec(p);
    if (acao && m === 'POST') {
      const corpo = await lerCorpo(req, 8 * 1024).catch(() => ({}));
      const ad = acao[2] === 'aprovar' ? anuncios.aprovar(acao[1]) : acao[2] === 'recusar' ? anuncios.recusar(acao[1], corpo.motivo) : anuncios.marcarPago(acao[1], 'manual');
      if (acao[2] !== 'pago') publicarTeloes();
      const { chave, ...semChave } = ad;
      return json(res, 200, semChave);
    }
  }
  return json(res, 404, { erro: 'Rota não encontrada.' });
}

const server=http.createServer((req,res)=>{
  let url;
  try { url=new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400).end('Bad Request'); return; }
  if(url.pathname.startsWith('/api/')) {
    api(req,res,url).catch((e)=>json(res,e.status||500,{erro:e.status?e.message:'Erro interno.'}));
    return;
  }
  const img=/^\/anuncios\/img\/([a-f0-9]{16}\.(png|jpg|webp))$/.exec(url.pathname);
  if(img) {
    const arq=path.join(DATA,'imagens',img[1]);
    fs.stat(arq,(err,st)=>{
      if(err||!st.isFile()){res.writeHead(404).end('Not Found');return;}
      res.writeHead(200,{'content-type':{png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[img[2]],'x-content-type-options':'nosniff','cache-control':'public, max-age=3600'});
      fs.createReadStream(arq).pipe(res);
    });
    return;
  }
  if(url.pathname==='/admin') url.pathname='/admin.html';
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
        id:p.playerId,name:p.name,look:p.look,position:p.position||{x:0,z:-30}
      }));
      rooms.get(ws.room).add(ws);
      send(ws,{type:'joined',room:ws.room,peers:occupants,count:peers(ws.room).length});
      broadcast(ws.room,{type:'enter',id:ws.playerId,name:ws.name,look:ws.look,position:ws.position||{x:0,z:-30}},ws);
      publishCount(ws.room);
      send(ws,{type:'debate',state:debateOf(ws.room).estado()});
      send(ws,{type:'teloes',slots:anuncios.publico()});
      send(ws,{type:'vitorias',placar:placarTotal});
      send(ws,{type:'graffitis',items:[...(graffitis.get(ws.room)||[])]});
      combateOf(ws.room).entrar(ws.playerId,ws.team,ws.position||{x:0,z:-30});
      send(ws,{type:'pvp',estado:combateOf(ws.room).estado()});
      return;
    }
    if(!ws.room) return;
    if(msg.type==='look') {
      setLook(ws,msg.look||msg);
      broadcast(ws.room,{type:'look',id:ws.playerId,look:ws.look});
      combateOf(ws.room).trocarTime(ws.playerId,ws.team);
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
    if(msg.type==='modo-pvp'){combateOf(ws.room).definirPvP(ws.playerId,msg.ativo===true);return;}
    if(msg.type==='grafite'){
      const now=Date.now();if(now-(ws.lastGrafite||0)<12000)return;
      const texto=clean(msg.text,48);const x=Number(msg.x),z=Number(msg.z);
      if(!texto||!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>310||z< -650||z>770)return;
      const j=combateOf(ws.room).jogadores.get(ws.playerId);
      if(!j||Math.hypot(j.pos.x-x,j.pos.z-z)>9)return;
      ws.lastGrafite=now;const roomTags=graffitis.get(ws.room)||[];
      const item={id:'g'+now+'-'+ws.playerId,autor:ws.name,text:texto,x,z,at:now};roomTags.push(item);
      if(roomTags.length>70)roomTags.shift();graffitis.set(ws.room,roomTags);
      broadcast(ws.room,{type:'grafite',item});return;
    }
    if(typeof msg.type==='string'&&msg.type.startsWith('pvp-')) { pvp(ws,msg); return; }
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
      const c=combateOf(ws.room);
      if(!c.mover(ws.playerId,x,z)&&c.jogadores.has(ws.playerId)) return; // morto ou dirigindo
      ws.position={x,z};
      broadcast(ws.room,{type:'move',id:ws.playerId,x,z},ws);
    }
  });
  ws.on('close',()=>leave(ws));
  ws.on('error',()=>leave(ws));
});
// Mensagens do modo PvP. O servidor decide vida, dano, itens e veículos.
const ID = (v) => (typeof v === 'string' ? v.slice(0, 16) : '');
function pvp(ws, msg) {
  const c = combateOf(ws.room), id = ws.playerId, now = Date.now();
  ws.pvpN = (now - (ws.pvpT || 0) > 1000) ? 0 : (ws.pvpN || 0); if (!ws.pvpN) ws.pvpT = now;
  if (++ws.pvpN > 40) return; // no máximo 40 mensagens de combate por segundo
  switch (msg.type) {
    case 'pvp-pegar': c.pegar(id, ID(msg.pickup)); break;
    case 'pvp-largar': c.largar(id); break;
    case 'pvp-entrar': c.entrarVeiculo(id, ID(msg.veiculo)); break;
    case 'pvp-sair': {
      if (c.sairVeiculo(id)) { const j = c.jogadores.get(id); ws.position = { x: j.pos.x, z: j.pos.z }; }
      break;
    }
    case 'pvp-veiculo': {
      if (now - (ws.lastVeh || 0) < 45) return; ws.lastVeh = now;
      const v = c.moverVeiculo(id, msg);
      if (v) { ws.position = { x: v.x, z: v.z }; broadcast(ws.room, { type: 'veiculo-mov', id: v.id, x: v.x, y: v.y, z: v.z, ry: v.ry, rx: v.rx, rz: v.rz, vel: v.vel }, ws); }
      break;
    }
    case 'pvp-disparo': {
      const r = c.disparar(id, ID(msg.arma), { o: msg.o, d: msg.d });
      send(ws, { type: 'pvp-bilhete', ref: Number(msg.ref) || 0, ok: r.ok, tiro: r.tiro, motivo: r.motivo });
      break;
    }
    case 'pvp-acerto': c.acertar(id, ID(msg.tiro), { alvo: msg.alvo, alvoVeiculo: msg.alvoVeiculo, ponto: msg.ponto }); break;
    case 'pvp-ataque': c.atacar(id, ID(msg.arma), { alvo: msg.alvo, alvoVeiculo: msg.alvoVeiculo }); break;
    case 'pvp-golpe-visual': {
      if (now - (ws.lastGolpe || 0) < 300 || !c.vivo(id)) return; ws.lastGolpe = now;
      broadcast(ws.room, { type: 'golpe-visual', de: id, rugido: !!msg.rugido }, ws);
      break;
    }
  }
}
function tickCombates() { for (const c of combates.values()) c.tick(); }
function tickDebates(now=Date.now()) { for(const debate of debates.values()) debate.tick(now); }
if(require.main===module) {
  setInterval(tickDebates,500).unref();
  setInterval(tickCombates,250).unref();
  setInterval(()=>{ if(anuncios.expirar()) publicarTeloes(); },60e3).unref();
  server.listen(PORT,HOST,()=>console.log('Ágora Brasil em http://localhost:'+PORT));
}
module.exports={server,clean,roomCode,team,outfit,lookOf,tickDebates,tickCombates,anuncios,combates};
