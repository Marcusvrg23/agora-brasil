import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_SEEDS,posicaoBot} from '../public/bot-paths.mjs';
test('NPCs sempre identificados e nao representam humanos conectados',()=>{
 assert.equal(BOT_SEEDS.length,6);
 assert.equal(new Set(BOT_SEEDS.map(x=>x.id)).size,6);
 for(const b of BOT_SEEDS){
  assert.ok(b.id.startsWith('npc'));
  assert.ok(b.speed>0);
  assert.ok(['vermelho','amarelo'].includes(b.team));
  for(const t of [0,3,12,60,500]){const p=posicaoBot(b,t);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));assert.ok(Math.abs(p.x)<320&&p.z>-665&&p.z<790)}
 }
});
