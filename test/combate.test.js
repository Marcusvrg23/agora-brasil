const test = require('node:test');
const assert = require('node:assert/strict');
const { Combate, ARMAS, VITORIA, BASES } = require('../combate');

function novo() {
  let agora = 100000;
  const eventos = [];
  const c = new Combate({ emit: (e) => eventos.push(e), agora: () => agora });
  return { c, eventos, passar: (ms) => { agora += ms; }, tipos: () => eventos.map((e) => e.type) };
}
// Dois jogadores de times diferentes, já sem a proteção de renascimento.
function duelo() {
  const r = novo();
  r.c.entrar('a', 'vermelho', { x: 0, z: 100 });
  r.c.entrar('b', 'amarelo', { x: 2, z: 100 });
  r.passar(4000);
  r.c.definirPvP('a',true);r.c.definirPvP('b',true);
  return r;
}
function darItem(c, id, item) { c.jogadores.get(id).item = item; }

test('espada fere só o time adversário e respeita a recarga', () => {
  const { c, passar } = duelo();
  c.entrar('a2', 'vermelho', { x: 1, z: 100 });
  passar(4000);
  darItem(c, 'a', 'espada');
  assert.equal(c.atacar('a', 'espada', { alvo: 'a2' }).eventos.length, 0); // sem fogo amigo
  assert.equal(c.jogadores.get('a2').vida, 100);
  passar(600);
  c.atacar('a', 'espada', { alvo: 'b' });
  assert.equal(c.jogadores.get('b').vida, 100 - ARMAS.espada.dano);
  assert.equal(c.atacar('a', 'espada', { alvo: 'b' }).motivo, 'recarga');
});

test('sem o item na mão não há ataque; espada de longe não alcança', () => {
  const { c, passar } = duelo();
  assert.equal(c.atacar('a', 'espada', { alvo: 'b' }).motivo, 'sem-item');
  darItem(c, 'a', 'espada');
  c.mover('b', 60, 100);
  passar(600);
  assert.equal(c.atacar('a', 'espada', { alvo: 'b' }).motivo, 'alcance');
  assert.equal(c.jogadores.get('b').vida, 100);
});

test('cada flecha acerta uma vez só (bilhete)', () => {
  const { c } = duelo();
  darItem(c, 'a', 'arco');
  const { tiro } = c.disparar('a', 'arco', { o: { x: 0, y: 1.5, z: 100 }, d: { x: 1, y: 0, z: 0 } });
  assert.ok(tiro);
  c.acertar('a', tiro, { alvo: 'b' });
  assert.equal(c.acertar('a', tiro, { alvo: 'b' }).motivo, 'bilhete');
  assert.equal(c.jogadores.get('b').vida, 100 - ARMAS.arco.dano);
  assert.equal(c.acertar('b', tiro, { alvo: 'a' }).motivo, 'bilhete'); // bilhete de outro jogador
});

test('bomba é gasta, explode no ponto e o dano cai com a distância', () => {
  const { c, tipos } = duelo();
  darItem(c, 'a', 'bomba');
  const { tiro } = c.disparar('a', 'bomba');
  assert.equal(c.jogadores.get('a').item, null);
  c.acertar('a', tiro, { ponto: { x: 2, y: 0, z: 104 } }); // 4 m do alvo
  const vida = c.jogadores.get('b').vida;
  assert.ok(vida > 0 && vida < 100 - 40, 'dano parcial: ' + vida);
  assert.ok(tipos().includes('explosao'));
  assert.equal(c.disparar('a', 'bomba').motivo, 'sem-item');
});

test('explosão longe de quem lançou é recusada', () => {
  const { c } = duelo();
  darItem(c, 'a', 'bomba');
  const { tiro } = c.disparar('a', 'bomba');
  assert.equal(c.acertar('a', tiro, { ponto: { x: 0, y: 0, z: 400 } }).motivo, 'alcance');
});

test('morte soma ponto ao time, renasce na base com proteção', () => {
  const { c, passar, tipos } = duelo();
  darItem(c, 'a', 'espada');
  for (let i = 0; i < 3; i++) { c.atacar('a', 'espada', { alvo: 'b' }); passar(600); }
  assert.equal(c.jogadores.get('b').vivo, false);
  assert.deepEqual(c.placar, { vermelho: 1, amarelo: 0 });
  assert.ok(tipos().includes('morte'));
  assert.equal(c.mover('b', 10, 10), false); // morto não anda
  passar(5000); c.tick();
  const b = c.jogadores.get('b');
  assert.equal(b.vivo, true); assert.equal(b.vida, 100);
  assert.ok(Math.hypot(b.pos.x - BASES.amarelo.x, b.pos.z - BASES.amarelo.z) < 10);
  // protegido nos primeiros 3 s
  c.mover('b', 1, 100); c.mover('a', 0, 100);
  c.atacar('a', 'espada', { alvo: 'b' });
  assert.equal(c.jogadores.get('b').vida, 100);
});

test('tribuna do debate é zona segura', () => {
  const { c, passar } = duelo();
  c.mover('a', 40, -60); c.mover('b', 42, -61);
  darItem(c, 'a', 'espada'); passar(600);
  c.atacar('a', 'espada', { alvo: 'b' });
  assert.equal(c.jogadores.get('b').vida, 100);
});

test('pegar item exige estar perto e o item volta depois', () => {
  const { c, passar } = duelo();
  const p = c.pickups[0];
  assert.equal(c.pegar('a', p.id), false); // longe
  c.mover('a', p.x + 1, p.z);
  assert.equal(c.pegar('a', p.id), true);
  assert.equal(c.jogadores.get('a').item, p.item);
  assert.equal(c.pegar('b', p.id), false);
  passar(21000); c.tick();
  assert.equal(c.pickups[0].disponivel, true);
});

test('veículo: entra, dirige, só o motorista move; armas do veículo certo', () => {
  const { c, passar } = duelo();
  const heli = c.veiculos.find((v) => v.tipo === 'helicoptero');
  c.mover('a', heli.x + 2, heli.z);
  assert.equal(c.entrarVeiculo('a', heli.id), true);
  assert.equal(c.entrarVeiculo('b', heli.id), false);
  assert.equal(c.moverVeiculo('b', { x: 0, y: 0, z: 0 }), null);
  c.moverVeiculo('a', { x: 0, y: 30, z: 120, ry: 1 });
  assert.equal(heli.y, 30);
  assert.equal(c.disparar('a', 'missil-caca').motivo, 'sem-veiculo');
  assert.ok(c.disparar('a', 'missil-heli').ok);
  passar(100);
  assert.ok(c.disparar('a', 'metralhadora').ok);
  // carro não voa
  const carro = c.veiculos.find((v) => v.tipo === 'carro');
  c.mover('b', carro.x, carro.z); c.entrarVeiculo('b', carro.id);
  c.moverVeiculo('b', { x: carro.x, y: 50, z: carro.z + 5 });
  assert.equal(carro.y, 0);
  assert.equal(c.sairVeiculo('a'), true);
  assert.equal(heli.motorista, null); assert.equal(heli.y, 0);
});

test('míssil destrói veículo inimigo e fere o motorista; prédios não têm vida', () => {
  const { c, passar, tipos } = duelo();
  const caca = c.veiculos.find((v) => v.tipo === 'caca');
  const carro = c.veiculos.find((v) => v.tipo === 'carro');
  c.mover('a', caca.x, caca.z); c.entrarVeiculo('a', caca.id);
  c.mover('b', carro.x, carro.z); c.entrarVeiculo('b', carro.id);
  c.moverVeiculo('a', { x: carro.x, y: 120, z: carro.z + 200 });
  for (let i = 0; i < 4 && carro.vida > 0; i++) {
    const { tiro } = c.disparar('a', 'missil-caca');
    c.acertar('a', tiro, { ponto: { x: carro.x, y: 0, z: carro.z } });
    passar(1800);
  }
  assert.equal(carro.vida, 0);
  assert.ok(tipos().includes('explosao-veiculo'));
  assert.equal(c.jogadores.get('b').veiculo, null);
  assert.ok(c.jogadores.get('b').vida < 100);
  assert.equal(Object.keys(c.estado()).includes('predios'), false);
  passar(31000); c.tick();
  assert.equal(c.veiculos.find((v) => v.id === carro.id).vida, 260);
});

test('vitória com o placar máximo e nova partida depois', () => {
  const { c, passar, tipos } = duelo();
  c.placar.vermelho = VITORIA - 1;
  darItem(c, 'a', 'espada');
  for (let i = 0; i < 3; i++) { c.atacar('a', 'espada', { alvo: 'b' }); passar(600); }
  assert.equal(c.vencedor, 'vermelho');
  assert.ok(tipos().includes('vitoria'));
  passar(600);
  assert.equal(c.disparar('a', 'espada').motivo, 'fim-de-partida');
  passar(12000); c.tick();
  assert.equal(c.vencedor, null);
  assert.deepEqual(c.placar, { vermelho: 0, amarelo: 0 });
});
