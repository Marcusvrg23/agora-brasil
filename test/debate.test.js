const test = require('node:test');
const assert = require('node:assert/strict');
const { Debate } = require('../debate');
const { team, outfit } = require('../server');

const ROTEIRO = [
  { fase: 'abertura', lado: 'a', segundos: 1 },
  { fase: 'abertura', lado: 'b', segundos: 1 },
  { fase: 'votacao', lado: null, segundos: 1 },
  { fase: 'resultado', lado: null, segundos: 1 },
];
const p = (id, t = 'vermelho') => ({ id, name: id, team: t });

function novo() {
  const eventos = [];
  return { d: new Debate({ emit: e => eventos.push(e), roteiro: ROTEIRO }), eventos };
}

test('time e traje aceitam só valores conhecidos', () => {
  assert.equal(team('amarelo'), 'amarelo');
  assert.equal(team('qualquer'), 'vermelho');
  assert.equal(outfit('terno-faixa'), 'terno-faixa');
  assert.equal(outfit('<x>'), 'camisa');
});

test('debate só começa com dois na fila', () => {
  const { d } = novo();
  d.entrarFila(p('p1'), 0);
  assert.equal(d.estado().fase, 'aguardando');
  d.entrarFila(p('p2'), 0);
  assert.equal(d.estado().fase, 'abertura');
  assert.equal(d.estado().orador, 'a');
});

test('prefere adversário do outro time', () => {
  const { d } = novo();
  d.entrarFila(p('p1', 'vermelho'), 0);
  d.entrarFila(p('p2', 'vermelho'), 0);
  // p1 x p2 já começou; testa a escolha numa fila nova
  const { d: d2 } = novo();
  d2.fila.push(p('a', 'vermelho'), p('b', 'vermelho'), p('c', 'amarelo'));
  d2.tentarIniciar(0);
  assert.equal(d2.estado().b.id, 'c');
});

test('só o orador da vez pode falar', () => {
  const { d, eventos } = novo();
  d.entrarFila(p('p1'), 0); d.entrarFila(p('p2'), 0);
  assert.equal(d.falar('p2', 'oi', 0), null);
  assert.ok(d.falar('p1', 'boa noite', 0));
  assert.equal(d.falar('p1', 'de novo', 500), null, 'respeita intervalo entre falas');
  assert.ok(eventos.some(e => e.type === 'debate-fala' && e.text === 'boa noite'));
});

test('votação: debatedores não votam e cada um vota uma vez', () => {
  const { d } = novo();
  d.entrarFila(p('p1'), 0); d.entrarFila(p('p2'), 0);
  d.tick(1000); d.tick(2000);
  assert.equal(d.estado().fase, 'votacao');
  assert.equal(d.votar('p1', 'a'), false);
  assert.equal(d.votar('v1', 'b'), true);
  assert.equal(d.votar('v1', 'a'), false);
  d.votar('v2', 'b');
  assert.equal(d.estado().votos, null, 'placar fica oculto durante a votação');
  d.tick(3000);
  const s = d.estado();
  assert.equal(s.fase, 'resultado');
  assert.deepEqual(s.votos, { a: 0, b: 2 });
  assert.equal(s.vencedor, 'b');
});

test('debatedor que sai perde por W.O.', () => {
  const { d } = novo();
  d.entrarFila(p('p1'), 0); d.entrarFila(p('p2'), 0);
  d.saiu('p1', 100);
  const s = d.estado();
  assert.equal(s.fase, 'resultado');
  assert.equal(s.vencedor, 'b');
  assert.equal(s.motivo, 'wo');
});

test('depois do resultado, próximo par da fila entra', () => {
  const { d } = novo();
  for (const id of ['p1', 'p2', 'p3', 'p4']) d.entrarFila(p(id), 0);
  for (let t = 1000; t <= 4000; t += 1000) d.tick(t);
  const s = d.estado();
  assert.equal(s.fase, 'abertura');
  assert.deepEqual([s.a.id, s.b.id], ['p3', 'p4']);
});
