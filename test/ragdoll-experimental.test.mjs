import test from 'node:test';
import assert from 'node:assert/strict';
import {ragdollHabilitado,criarRagdollExperimental} from '../public/ragdoll-experimental.mjs';

function avatar(){
  return {userData:{baseModel:{rotation:{x:0},position:{x:0}},morto:0}};
}
const player=()=>({pvp:true,vivo:true,veiculo:null});

test('ragdoll de prévia exige opt-in explícito',()=>{
  assert.equal(ragdollHabilitado('?ragdoll=1'),true);
  for(const query of ['', '?ragdoll=0', '?ragdoll=true', '?figurantes=180'])
    assert.equal(ragdollHabilitado(query),false);
  const fx=criarRagdollExperimental();
  assert.equal(fx.impacto('a',avatar(),{vidaAnterior:100,vidaNova:40,pvp:true,vivo:true}),false);
  assert.equal(fx.ativos(),0);
});

test('somente dano autorizado em jogador PvP vivo, fora de veículo',()=>{
  const fx=criarRagdollExperimental({habilitado:true});
  const av=avatar();
  for(const dados of [
    {vidaAnterior:100,vidaNova:100,pvp:true,vivo:true},
    {vidaAnterior:100,vidaNova:30,pvp:false,vivo:true},
    {vidaAnterior:100,vidaNova:30,pvp:true,vivo:false},
    {vidaAnterior:100,vidaNova:30,pvp:true,vivo:true,veiculo:'truck'},
    {vidaAnterior:30,vidaNova:0,pvp:true,vivo:true},
    {vidaAnterior:30,vidaNova:40,pvp:true,vivo:true},
  ])assert.equal(fx.impacto('a',av,dados),false);
  assert.equal(fx.impacto('a',av,{vidaAnterior:100,vidaNova:65,pvp:true,vivo:true}),true);
  assert.equal(fx.ativos(),1);
});

test('reação é local, limitada no tempo e restaura modelo sem alterar raiz',()=>{
  const fx=criarRagdollExperimental({habilitado:true});
  const av=avatar();
  av.position={x:10,y:0,z:20};
  assert.equal(fx.impacto('a',av,{vidaAnterior:100,vidaNova:45,pvp:true,vivo:true}),true);
  for(let i=0;i<12;i++)fx.atualizar(1/60,()=>av,player);
  assert.notEqual(av.userData.baseModel.rotation.x,0);
  assert.deepEqual(av.position,{x:10,y:0,z:20});
  for(let i=0;i<90;i++)fx.atualizar(1/60,()=>av,player);
  assert.equal(fx.ativos(),0);
  assert.equal(av.userData.baseModel.rotation.x,0);
  assert.equal(av.userData.baseModel.position.x,0);
});

test('respawn, troca de modelo e PvP desligado removem efeitos sem vazamento',()=>{
  const fx=criarRagdollExperimental({habilitado:true,maxAtivos:1});
  const a=avatar(),b=avatar(),evento={vidaAnterior:100,vidaNova:50,pvp:true,vivo:true};
  assert.equal(fx.impacto('a',a,evento),true);
  assert.equal(fx.impacto('b',b,evento),false);
  fx.atualizar(.016,()=>a,()=>({...player(),pvp:false}));
  assert.equal(fx.ativos(),0);
  assert.equal(fx.impacto('a',a,evento),true);
  a.userData.baseModel={rotation:{x:0},position:{x:0}};
  fx.atualizar(.016,()=>a,player);
  assert.equal(fx.ativos(),0);
  fx.limpar();
});
