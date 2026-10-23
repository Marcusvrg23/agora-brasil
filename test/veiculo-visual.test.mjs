import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rodaNomeada,bandeiraNomeada,giroDaRoda,afastamentoModelo,pecaIsolada} from '../public/veiculo-visual.mjs';
import {modoLocomocao} from '../public/movimento.mjs';

test('detecção de peças para GLBs novos e antigos',()=>{
 for(const n of ['Pneu_FR','pneu traseiro','Wheel_1','Tire.003'])assert.equal(rodaNomeada(n),true,n);
 for(const n of ['Bandeira_1','Flag_2'])assert.equal(bandeiraNomeada(n),true,n);
 for(const n of ['Cabine','Roda_som','Bandolim','PneuSemSeparador'])assert.equal(rodaNomeada(n),false,n);
 assert.equal(bandeiraNomeada('Bandeira_sem_fundo'),true);
 assert.equal(bandeiraNomeada('PALCO_roof'),false);
});
test('rotação de roda reversível, consistente e limitada em quedas de FPS',()=>{
 const a=giroDaRoda(10,.02,.5);assert.ok(Math.abs(a-.4)<1e-9);
 assert.ok(Math.abs(giroDaRoda(-10,.02,.5)+a)<1e-9);
 assert.ok(Math.abs(giroDaRoda(10,.5,.5)-1)<1e-9);
 assert.equal(giroDaRoda(10,.02,0),0);
 assert.equal(giroDaRoda(Number.NaN,.02,.5),0);
});
test('teleporte remoto não interpola através do Congresso',()=>{
 assert.equal(afastamentoModelo(22.01),true);
 assert.equal(afastamentoModelo(20),false);
 assert.equal(afastamentoModelo(Number.NaN),false);
});
test('assets binários originais continuam versionados, sem sobrescrita',()=>{
 for(const name of ['caminhao-lula.glb','caminhao-bolsonaro.glb']){
  const bytes=readFileSync(new URL('../public/assets/veiculos/'+name,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF',name);
  assert.ok(bytes.length>100_000,name);
 }
});
test('corrida separada do walk e fallback visual de reserva disponíveis',()=>{
 assert.equal(modoLocomocao(true,2.3),'run');
 const anim=readFileSync(new URL('../public/avatar.js',import.meta.url),'utf8');
 const reserva=readFileSync(new URL('../public/veiculo-reserva.js',import.meta.url),'utf8');
 assert.match(anim,/sharedRun\(\)/);
 assert.match(anim,/target===walk\?1:1/);
 assert.doesNotMatch(anim,/target===walk\?Math\.max/);
 assert.match(reserva,/export function criarCarroReserva/);
 assert.match(reserva,/export function criarCaminhaoReserva/);
 assert.match(reserva,/Pneu_/);
 assert.match(reserva,/Bandeira_/);
});

test('não animar malhas que agregam todas as rodas ou bandeiras',()=>{
 assert.equal(pecaIsolada({x:1.7,y:1.7,z:1.6}),true,'pneu individual GLB V2');
 assert.equal(pecaIsolada({x:2,y:1,z:12}),false,'pneus agrupados no comprimento');
 assert.equal(pecaIsolada({x:0.1,y:.8,z:9},{limite:3}),false,'várias bandeiras numa malha');
 assert.equal(pecaIsolada({x:.04,y:.8,z:1.1},{limite:3}),true,'bandeira isolada');
});
