import test from 'node:test';
import assert from 'node:assert/strict';
import {DURACAO_EMBARQUE_MS,poseParaVeiculo,progressoDeEmbarque,ritmoDeVeiculo,deveExibirPiloto} from '../public/montaria.mjs';

test('cinco veículos possuem poses diferentes',()=>{
 const tipos=['trex','carro','moto','helicoptero','caca'];
 assert.equal(new Set(tipos.map(poseParaVeiculo)).size,5);
 assert.equal(poseParaVeiculo('desconhecido'),'sentado');
});
test('embarque suave, monotônico e sem teleporte final',()=>{
 const t=1000;assert.equal(progressoDeEmbarque(t,t),0);
 assert.equal(progressoDeEmbarque(t,t+DURACAO_EMBARQUE_MS),1);
 assert.equal(progressoDeEmbarque(t,t+450),.5);
 assert.equal(progressoDeEmbarque(t,t-500),0);
 assert.equal(progressoDeEmbarque(t,Infinity),1);
 let old=-1;for(let ms=0;ms<=900;ms+=30){const k=progressoDeEmbarque(t,t+ms);assert.ok(k>=old);old=k}
});
test('ritmos de animação distintos e dependentes da velocidade',()=>{
 assert.notEqual(ritmoDeVeiculo('trex',1,0),ritmoDeVeiculo('caca',1,0));
 assert.ok(ritmoDeVeiculo('moto',2,40)>ritmoDeVeiculo('moto',2,0));
 assert.equal(ritmoDeVeiculo('moto',NaN),0);
});
test('exibição externa segura para montarias abertas',()=>{
 assert.equal(deveExibirPiloto('trex'),true);assert.equal(deveExibirPiloto('moto'),true);
 assert.equal(deveExibirPiloto('carro'),false);assert.equal(deveExibirPiloto('helicoptero'),false);
});
