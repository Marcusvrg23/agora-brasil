import test from 'node:test';
import assert from 'node:assert/strict';
import {FATOR_DURACAO_CORRIDA,temposCorrida,modoLocomocao,deslocamentoRoda,ondulacaoBandeira} from '../public/movimento.mjs';
const {Combate,VEICULOS,GARAGEM}=await import('../combate.js');
test('correr acelera todos os keyframes sem alterar o comprimento original',()=>{
  const original=new Float32Array([0,.2,.5,1,1.75,2]);
  const tempos=temposCorrida(original);
  assert.ok(Math.abs(tempos.at(-1)-original.at(-1)*FATOR_DURACAO_CORRIDA)<1e-6);
  assert.equal(original.at(-1),2);
  for(let i=1;i<tempos.length;i++)assert.ok(tempos[i]>tempos[i-1]);
  assert.throws(()=>temposCorrida(original,0),RangeError);
});
test('transições parado, andando, correndo via Shift',()=>{
  assert.equal(modoLocomocao(false,2.3),'idle');
  assert.equal(modoLocomocao(true,1.35),'walk');
  assert.equal(modoLocomocao(true,2.3),'run');
});
test('rodas giram por distância e bandeiras oscilam sem NaN',()=>{
  assert.equal(deslocamentoRoda(0,.016),0);
  assert.ok(deslocamentoRoda(18,.016)>.3);
  assert.ok(deslocamentoRoda(-18,.016)<0);
  assert.equal(deslocamentoRoda(Infinity,.016),0);
  for(const t of [0,1,5,20])assert.ok(Math.abs(ondulacaoBandeira(t,2,20))<=.075);
});
test('caminhões reais constam na garagem e têm estado de vida',()=>{
  for(const tipo of ['caminhao-lula','caminhao-bolsonaro']){
    assert.equal(VEICULOS[tipo].vida,620);
    assert.ok(GARAGEM.some(v=>v.tipo===tipo));
    const g=new Combate();
    const v=g.veiculos.find(v=>v.tipo===tipo);
    assert.ok(v);
    assert.equal(v.vida,620);
    assert.equal(v.vel,0);
  }
});
