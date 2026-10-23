const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { WebSocket } = require('ws');
const { server, combates } = require('../server');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let endpoint;
test.before(async () => { server.listen(0, '127.0.0.1'); await once(server, 'listening'); endpoint = `ws://127.0.0.1:${server.address().port}/api/ws`; });
test.after(() => new Promise(r => server.close(r)));
async function client(t, room, extra = {}) {
  const ws = new WebSocket(endpoint), messages = [];
  ws.on('message', raw => messages.push(JSON.parse(String(raw))));
  ws.on('error', () => {});
  t.after(() => ws.terminate());
  const wait = async predicate => {
    const end = Date.now() + 2000;
    while (Date.now() < end) { const i = messages.findIndex(predicate); if (i >= 0) return messages.splice(i, 1)[0]; await sleep(5); }
    throw Error('Mensagem ausente: ' + predicate);
  };
  const send = data => ws.send(JSON.stringify(data));
  await once(ws, 'open');
  const hello = await wait(m => m.type === 'hello');
  send({ type: 'join', room, name: 'Teste', ...extra });
  const joined = await wait(m => m.type === 'joined');
  const state = (await wait(m => m.type === 'pvp')).estado;
  return { ws, messages, wait, send, hello, joined, state, id: joined.id || hello.id };
}

test('clientes independentes: salas isolam posição, chat e cartaz; entrada tardia recebe estado', {timeout:10000}, async t => {
  const a = await client(t, '1100001'), b = await client(t, '1100001'), other = await client(t, '1100002');
  a.send({type:'move',x:8,z:12});
  assert.equal((await b.wait(m => m.type==='move' && m.id===a.id)).x,8);
  a.send({type:'chat',text:'isolado'}); await b.wait(m=>m.type==='chat' && m.text==='isolado');
  a.send({type:'cartaz',text:'PAZ'}); await b.wait(m=>m.type==='cartaz' && m.id===a.id);
  const late = await client(t, '1100001');
  const peer = late.joined.peers.find(p=>p.id===a.id);
  assert.equal(peer.position.x,8); assert.equal(peer.cartaz,'PAZ');
  await sleep(80);
  assert.equal(other.messages.some(m=>['move','chat','cartaz','enter'].includes(m.type)),false);
});

test('veículo: disputa concorrente tem um motorista, movimento e liberação sincronizados', {timeout:10000}, async t => {
  const a = await client(t,'1100003'), b=await client(t,'1100003');
  const v=a.state.veiculos.find(v=>v.tipo==='carro');
  a.send({type:'move',x:v.x,z:v.z}); b.send({type:'move',x:v.x,z:v.z}); await sleep(85);
  a.send({type:'pvp-entrar',veiculo:v.id}); b.send({type:'pvp-entrar',veiculo:v.id});
  const event=await b.wait(m=>m.type==='veiculo' && m.veiculo.id===v.id && m.veiculo.motorista);
  const driver=event.veiculo.motorista===a.id?a:b, passenger=driver===a?b:a;
  assert.equal(combates.get('1100003').jogadores.get(passenger.id).veiculo,null);
  passenger.send({type:'pvp-veiculo',x:400,y:0,z:400});
  driver.send({type:'pvp-veiculo',x:v.x+2,y:0,z:v.z,ry:1});
  assert.equal((await passenger.wait(m=>m.type==='veiculo-mov')).x,v.x+2);
  driver.send({type:'pvp-sair'});
  await passenger.wait(m=>m.type==='veiculo' && m.veiculo.id===v.id && !m.veiculo.motorista);
});

test('visitante observa sem entrar no combate nem modificar itens, veículos, cartazes ou debate', {timeout:10000}, async t => {
  const a=await client(t,'1100004'), visitor=await client(t,'1100004',{role:'visitor'});
  assert.equal(visitor.joined.role,'visitor');
  const c=combates.get('1100004');
  assert.equal(c.jogadores.has(visitor.id),false);
  const p=a.state.pickups[0],v=a.state.veiculos[0];
  for(const message of [{type:'move',x:p.x,z:p.z},{type:'modo-pvp',ativo:true},{type:'pvp-pegar',pickup:p.id},{type:'pvp-entrar',veiculo:v.id},{type:'cartaz',text:'INVALIDO'},{type:'chat',text:'INVALIDO'},{type:'debate-join'}])visitor.send(message);
  await sleep(100);
  assert.equal(c.pickups.find(q=>q.id===p.id).disponivel,true);
  assert.equal(a.messages.some(m=>['cartaz','chat'].includes(m.type)),false);
  assert.equal(c.jogadores.has(visitor.id),false);
});

test('reconexão com bilhete restaura identidade, posição, cartaz e inventário sem duplicação', {timeout:10000}, async t => {
  const a=await client(t,'1100005'), b=await client(t,'1100005');
  assert.equal(typeof a.joined.resumeToken,'string');
  const p=a.state.pickups[0];
  a.send({type:'move',x:p.x,z:p.z}); await b.wait(m=>m.type==='move' && m.id===a.id);
  a.send({type:'pvp-pegar',pickup:p.id}); await b.wait(m=>m.type==='pickup' && !m.disponivel);
  b.messages.length=0;
  a.send({type:'cartaz',text:'VOLTEI'}); await b.wait(m=>m.type==='cartaz');
  a.ws.terminate(); await once(a.ws,'close'); await sleep(30);
  const restored=await client(t,'1100005',{resumeToken:a.joined.resumeToken});
  assert.equal(restored.id,a.id); assert.equal(restored.joined.cartaz,'VOLTEI');
  assert.equal(restored.joined.position.x,p.x);
  assert.equal(restored.state.jogadores.find(j=>j.id===a.id).item,p.item);
  assert.equal(restored.state.jogadores.filter(j=>j.id===a.id).length,1);
  assert.equal(restored.joined.count,2);
  const restoredPeer=await b.wait(m=>m.type==='jogador' && m.jogador.id===a.id && m.jogador.item===p.item);
  assert.equal(restoredPeer.jogador.item,p.item);
});

test('reenvio de join não cura jogador nem remove inventário e bilhete não cruza salas', {timeout:10000}, async t => {
  const a=await client(t,'1100006'); const c=combates.get('1100006');
  c.jogadores.get(a.id).vida=30;
  a.send({type:'join',room:'1100006'}); await a.wait(m=>m.type==='joined');
  assert.equal(c.jogadores.get(a.id).vida,30);
  const thief=await client(t,'1100007',{resumeToken:a.joined.resumeToken});
  assert.notEqual(thief.id,a.id);
});

test('heartbeat encerra socket sem pong e reconexão substitui transporte ainda aberto', {timeout:10000}, async t => {
  const {sweepConnections}=require('../server');
  const ws=new WebSocket(endpoint,{autoPong:false});t.after(()=>ws.terminate());ws.on('error',()=>{});
  await once(ws,'open');
  const closed=once(ws,'close');sweepConnections();await sleep(20);sweepConnections();await closed;
  assert.equal(ws.readyState,WebSocket.CLOSED);
  const a=await client(t,'1100008');
  const oldClosed=once(a.ws,'close');
  const resumed=await client(t,'1100008',{resumeToken:a.joined.resumeToken});
  await oldClosed;
  assert.equal(resumed.id,a.id);assert.equal(resumed.joined.count,1);
  assert.notEqual(resumed.joined.resumeToken,a.joined.resumeToken);
  resumed.send({type:'leave'});await sleep(20);
  assert.equal(combates.has('1100008'),false);
});

test('mensagem grande é recusada sem derrubar outros clientes', {timeout:10000}, async t =>{
  const a=await client(t,'1100009'),b=await client(t,'1100009');
  const closed=once(a.ws,'close');a.ws.send('x'.repeat(9000));
  assert.equal((await closed)[0],1009);
  b.send({type:'chat',text:'ativo'});assert.equal((await b.wait(m=>m.type==='chat')).text,'ativo');
});

test('capacidade padrão limita sala a 100 e permite retomada no limite', {timeout:10000}, async t =>{
  const clients=[];for(let i=0;i<100;i++)clients.push(await client(t,'1100010'));
  const blocked=new WebSocket(endpoint);t.after(()=>blocked.terminate());blocked.on('error',()=>{});
  const refusal=new Promise(resolve=>blocked.on('message',raw=>{const m=JSON.parse(String(raw));if(m.type==='error')resolve(m)}));
  await once(blocked,'open');blocked.send(JSON.stringify({type:'join',room:'1100010'}));
  assert.equal((await refusal).code,'capacity');
  const resumed=await client(t,'1100010',{resumeToken:clients[0].joined.resumeToken});
  assert.equal(resumed.joined.count,100);assert.equal(resumed.id,clients[0].id);
});
