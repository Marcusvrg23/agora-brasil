const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Anuncios, politico, decodeImagem } = require('../anuncios');

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const base = { slot: 'telao-congresso-norte', dias: 3, titulo: 'Pizzaria do Zé', texto: 'Entrega em toda Brasília', contato: 'ze@exemplo.com.br' };

function novo() {
  let agora = 1_000_000;
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-'));
  const a = new Anuncios({ arquivo: path.join(pasta, 'a.json'), pastaImagens: path.join(pasta, 'img'), agora: () => agora });
  return { a, pasta, avancar: (ms) => { agora += ms; } };
}

test('calcula o valor pelo preço do telão e número de dias', () => {
  const { a } = novo();
  const ad = a.criar(base);
  assert.equal(ad.valor, 239.7);
  assert.equal(ad.status, 'aguardando_pagamento');
});

test('recusa conteúdo político-eleitoral', () => {
  const { a } = novo();
  assert.throws(() => a.criar({ ...base, texto: 'Vote no candidato 13 no segundo turno' }), /político-eleitoral/);
  assert.equal(politico('Promoção de pastel'), false);
  assert.equal(politico('Lula'), true);
});

test('valida telão, dias, título e e-mail', () => {
  const { a } = novo();
  assert.throws(() => a.criar({ ...base, slot: 'x' }), /telão válido/);
  assert.throws(() => a.criar({ ...base, dias: 0 }), /1 a 30/);
  assert.throws(() => a.criar({ ...base, dias: 31 }), /1 a 30/);
  assert.throws(() => a.criar({ ...base, titulo: '  ' }), /título/);
  assert.throws(() => a.criar({ ...base, contato: 'semarroba' }), /e-mail/);
});

test('fluxo completo: pago → moderação → no ar → encerrado', () => {
  const { a, avancar } = novo();
  const ad = a.criar(base);
  assert.equal(a.publico().find((s) => s.id === base.slot).anuncios.length, 0, 'não aparece antes de pagar');
  assert.throws(() => a.aprovar(ad.id), /pagos e em moderação/);
  a.marcarPago(ad.id);
  assert.equal(a.buscar(ad.id).status, 'em_moderacao');
  a.aprovar(ad.id);
  const slot = a.publico().find((s) => s.id === base.slot);
  assert.equal(slot.anuncios.length, 1);
  assert.equal(slot.anuncios[0].titulo, 'Pizzaria do Zé');
  assert.equal(JSON.stringify(slot).includes('ze@exemplo'), false, 'não expõe o e-mail');
  avancar(3 * 86400e3 + 1);
  assert.equal(a.expirar(), true);
  assert.equal(a.buscar(ad.id).status, 'encerrado');
  assert.equal(a.publico().find((s) => s.id === base.slot).anuncios.length, 0);
});

test('recusa pela moderação e chave do dono', () => {
  const { a } = novo();
  const ad = a.criar(base);
  assert.equal(a.doDono(ad.id, 'errada'), null);
  assert.equal(a.doDono(ad.id, ad.chave).id, ad.id);
  a.marcarPago(ad.id);
  a.recusar(ad.id, 'Imagem fora das regras');
  assert.equal(a.buscar(ad.id).status, 'recusado');
  assert.equal(a.status(a.buscar(ad.id)).motivo, 'Imagem fora das regras');
});

test('imagem: aceita PNG real, recusa arquivo falso', () => {
  const { a, pasta } = novo();
  const ad = a.criar({ ...base, imagem: PNG_1PX });
  assert.match(ad.imagem, /\.png$/);
  assert.ok(fs.existsSync(path.join(pasta, 'img', ad.imagem)));
  const falso = 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');
  assert.throws(() => decodeImagem(falso), /não é uma imagem/);
});

test('limite de 5 pedidos por hora por IP e persistência em arquivo', () => {
  const { a, pasta } = novo();
  for (let i = 0; i < 5; i++) a.criar(base, '1.2.3.4');
  assert.throws(() => a.criar(base, '1.2.3.4'), /Muitos pedidos/);
  a.criar(base, '5.6.7.8');
  const b = new Anuncios({ arquivo: path.join(pasta, 'a.json') });
  assert.equal(b.lista.length, 6);
});
