'use strict';
// Pix via Mercado Pago (API de pagamentos v1). Só funciona com MP_ACCESS_TOKEN configurado.
// Sem token, o servidor aceita o pedido e o pagamento é confirmado à mão pelo painel /admin.
const crypto = require('node:crypto');

const API = 'https://api.mercadopago.com/v1/payments';

function configurado() { return Boolean(process.env.MP_ACCESS_TOKEN); }

async function criarPix({ valor, descricao, email, referencia, notificacao }) {
  const corpo = {
    transaction_amount: Number(valor.toFixed(2)),
    description: descricao.slice(0, 120),
    payment_method_id: 'pix',
    payer: { email },
    external_reference: referencia,
  };
  if (notificacao) corpo.notification_url = notificacao;
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.createHash('sha256').update('pix:' + referencia).digest('hex'),
    },
    body: JSON.stringify(corpo),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago recusou a cobrança (${r.status}): ${json.message || 'erro'}`);
  const td = json.point_of_interaction?.transaction_data || {};
  return { provedor: 'mercadopago', id: String(json.id), status: json.status, qr: td.qr_code || null, qrBase64: td.qr_code_base64 || null, ticket: td.ticket_url || null };
}

async function consultar(id) {
  const r = await fetch(`${API}/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } });
  if (!r.ok) throw new Error(`Falha ao consultar pagamento (${r.status})`);
  const json = await r.json();
  return { id: String(json.id), status: json.status, referencia: json.external_reference, valor: json.transaction_amount };
}

module.exports = { configurado, criarPix, consultar };
