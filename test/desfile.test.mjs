import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_FIGURANTES,QUANTIDADES,quantidadeInicial,posicaoFigurante,CARTAZES,NOMES,varianteFigurante,CARTAZ_POR_PERFIL} from '../public/desfile-dados.mjs';
import {BOT_SEEDS} from '../public/bot-paths.mjs';
import {readFileSync} from 'node:fs';

test('densidades são progressivas e o celular usa perfil seguro',()=>{
 assert.equal(MAX_FIGURANTES,2000);
 assert.deepEqual(QUANTIDADES,[0,180,300,600,1200,2000]);
 assert.equal(quantidadeInicial({mobile:true}),180);
 assert.equal(quantidadeInicial({alto:true}),600);
 assert.equal(quantidadeInicial({param:'2000'}),2000);
 assert.equal(quantidadeInicial({param:'999999',mobile:true}),180);
});
test('multidão de 2.000 distribui os dois grupos sem contar como usuários reais',()=>{
 const pos=new Set(),contagens=[0,0];
 for(let id=0;id<2000;id++){
  const p=posicaoFigurante(id,3,2000);
  contagens[p.team]++;
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
  assert.ok(Math.abs(p.x)<50&&p.z>-85&&p.z<345);
  const key=Math.round(p.x*10)+':'+Math.round(p.z*10);
  assert.ok(!pos.has(key),'figurantes não podem ocupar posições idênticas');
  pos.add(key);
 }
 const setores=[{red:0,yellow:0},{red:0,yellow:0}];
 for(let id=0;id<2000;id++){
  const p=posicaoFigurante(id,3,2000),side=p.x<0?0:1;
  if(p.team===0)setores[side].red++;else setores[side].yellow++;
 }
 assert.ok(setores.every(s=>s.red>0&&s.yellow>0),'as duas cores devem coexistir em ambas as alas');
 assert.deepEqual(contagens,[1000,1000]);
 assert.equal(pos.size,2000);
});
test('cartazes padrão descrevem ambos os grupos e evitam simular contagem real',()=>{
 assert.equal(CARTAZES.length,6);
 assert.equal(CARTAZES.filter(x=>x.team===0).length,3);
 assert.equal(CARTAZES.filter(x=>x.team===1).length,3);
 assert.ok(NOMES.includes('Rafael')&&NOMES.includes('Gabriel'));
 assert.ok(CARTAZES.every(x=>x.text.length<30));
});

test('as seis identidades do desfile usam exatamente as mesmas bases dos seis NPCs existentes',()=>{
 const seen=new Set();
 for(let id=0;id<2000;id++){
  const index=varianteFigurante(id),base=BOT_SEEDS[index];
  assert.ok(index>=0&&index<BOT_SEEDS.length);
  assert.equal(base.team,id%2===0?'vermelho':'amarelo');
  assert.equal(CARTAZES[CARTAZ_POR_PERFIL[index]].team,id%2);
  seen.add(index);
 }
 assert.equal(seen.size,6);
 const src=readFileSync(new URL('../public/desfile.js',import.meta.url),'utf8');
 for(const helper of ['lookDaSemente','criarPlaca','encaixarPlaca','criarEtiqueta']){
  assert.ok(src.includes('function '+helper+'('),'função necessária ao modelo: '+helper);
 }
 assert.match(src,/dressAvatar\(avatar,lookDaSemente\(i\)\)/);
 assert.match(src,/new THREE\.InstancedMesh/);
 const crowd=src.slice(src.indexOf('function buildCrowd('),src.indexOf('function buildCaravan('));
 assert.doesNotMatch(crowd,/new THREE\.BoxGeometry/,'não permitir bonecos geométricos simplificados');
});
