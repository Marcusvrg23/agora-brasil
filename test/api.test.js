const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'api-'));
process.env.ADMIN_TOKEN = 'segredo-de-teste';
delete process.env.MP_ACCESS_TOKEN;
const { server } = require('../server');

let base;
test.before(() => new Promise((r) => server.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
test.after(() => new Promise((r) => server.close(r)));

const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('API dos telões: pedido, consulta do dono, moderação e publicação', async () => {
  const lista = await (await fetch(base + '/api/teloes')).json();
  assert.equal(lista.pagamentoOnline, false);
  assert.ok(lista.slots.length >= 7);

  const r = await post('/api/anuncios', { slot: 'telao-praca', dias: 2, titulo: 'Feira de artesanato', texto: 'Sábado no Setor Comercial', contato: 'feira@exemplo.com' });
  assert.equal(r.status, 201);
  const ad = await r.json();
  assert.equal(ad.valor, 119.8);
  assert.equal(ad.status, 'aguardando_pagamento');
  assert.match(ad.aviso, /não está ativo/);

  assert.equal((await fetch(`${base}/api/anuncios/${ad.id}?chave=errada`)).status, 404);
  const meu = await (await fetch(`${base}/api/anuncios/${ad.id}?chave=${ad.chave}`)).json();
  assert.equal(meu.id, ad.id);

  assert.equal((await post(`/api/admin/anuncios/${ad.id}/aprovar`, {}, { 'x-admin-token': 'errado' })).status, 401);
  const adm = { 'x-admin-token': 'segredo-de-teste' };
  assert.equal((await post(`/api/admin/anuncios/${ad.id}/aprovar`, {}, adm)).status, 409, 'não aprova sem pagamento');
  assert.equal((await post(`/api/admin/anuncios/${ad.id}/pago`, {}, adm)).status, 200);
  const ap = await post(`/api/admin/anuncios/${ad.id}/aprovar`, {}, adm);
  assert.equal((await ap.json()).status, 'no_ar');

  const depois = await (await fetch(base + '/api/teloes')).json();
  const praca = depois.slots.find((s) => s.id === 'telao-praca');
  assert.equal(praca.anuncios[0].titulo, 'Feira de artesanato');

  const pol = await post('/api/anuncios', { slot: 'telao-praca', dias: 1, titulo: 'Vote 22', texto: '', contato: 'x@exemplo.com' });
  assert.equal(pol.status, 400);
});
