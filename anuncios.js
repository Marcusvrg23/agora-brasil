'use strict';
// Telões de anúncio pago: cadastro, pagamento, moderação e rodízio.
// Fluxo: aguardando_pagamento → em_moderacao → no_ar → encerrado (ou recusado).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SLOTS = [
  { id: 'telao-congresso-norte', nome: 'Telão do Congresso (norte)', local: 'Gramado em frente ao Congresso, lado do Senado', precoDia: 79.9 },
  { id: 'telao-congresso-sul', nome: 'Telão do Congresso (sul)', local: 'Gramado em frente ao Congresso, lado da Câmara', precoDia: 79.9 },
  { id: 'telao-eixo-norte', nome: 'Painel do Eixo (norte)', local: 'Borda do gramado, pista N1', precoDia: 49.9 },
  { id: 'telao-eixo-sul', nome: 'Painel do Eixo (sul)', local: 'Borda do gramado, pista S1', precoDia: 49.9 },
  { id: 'telao-ministerios-norte', nome: 'Painel dos Ministérios (norte)', local: 'Gramado, altura dos ministérios', precoDia: 39.9 },
  { id: 'telao-ministerios-sul', nome: 'Painel dos Ministérios (sul)', local: 'Gramado, altura dos ministérios', precoDia: 39.9 },
  { id: 'telao-praca', nome: 'Telão da Praça dos Três Poderes', local: 'Entrada da Praça dos Três Poderes', precoDia: 59.9 },
];
const DIAS_MAX = 30;
const IMG_MAX_BYTES = 400 * 1024;
const POR_IP_HORA = 5;

// Propaganda político-eleitoral não é aceita (regra do projeto + legislação eleitoral). A moderação manual é a palavra final.
const BLOQUEADOS = [
  /\bvot(e|o|os|ar|em|ando|ação|acao)\b/, /elei[çc](ão|ao|ões|oes)/, /candidat/, /\bpartido/, /\burna/, /\btse\b/,
  /\blula\b/, /bolsonaro/, /fl[áa]vio\b/, /\bpt\b/, /\bpl\b/, /deputad/, /senador/, /governador/, /prefeit/, /vereador/,
  /presidente da rep/, /segundo turno/, /primeiro turno/, /campanha eleitoral/,
];
function normalizar(t) { return String(t || '').toLowerCase(); }
function politico(...textos) { const t = textos.map(normalizar).join(' '); return BLOQUEADOS.some((re) => re.test(t)); }
function limpar(t, max) { return String(t ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max); }
const HEX = /^#[0-9a-f]{6}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const centavos = (v) => Math.round(v * 100) / 100;

function decodeImagem(dataUrl) {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) throw new Erro('Imagem inválida. Use PNG, JPG ou WEBP.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > IMG_MAX_BYTES) throw new Erro('Imagem maior que 400 KB.');
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpg = buf[0] === 0xff && buf[1] === 0xd8;
  const webp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  const ext = png ? 'png' : jpg ? 'jpg' : webp ? 'webp' : null;
  if (!ext) throw new Erro('O arquivo não é uma imagem válida.');
  return { buf, ext };
}

class Erro extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

class Anuncios {
  constructor({ arquivo = null, pastaImagens = null, agora = () => Date.now() } = {}) {
    this.arquivo = arquivo; this.pasta = pastaImagens; this.agora = agora;
    this.lista = []; this.porIp = new Map();
    if (arquivo && fs.existsSync(arquivo)) {
      try { this.lista = JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { this.lista = []; }
    }
    if (this.pasta) fs.mkdirSync(this.pasta, { recursive: true });
  }

  salvar() {
    if (!this.arquivo) return;
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    const tmp = this.arquivo + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.lista, null, 1));
    fs.renameSync(tmp, this.arquivo);
  }

  slots() { return SLOTS; }

  criar(input, ip = 'local') {
    const agora = this.agora();
    const janela = (this.porIp.get(ip) || []).filter((t) => agora - t < 3600e3);
    if (janela.length >= POR_IP_HORA) throw new Erro('Muitos pedidos. Tente de novo em uma hora.', 429);
    const slot = SLOTS.find((s) => s.id === input?.slot);
    if (!slot) throw new Erro('Escolha um telão válido.');
    const dias = Math.floor(Number(input.dias));
    if (!(dias >= 1 && dias <= DIAS_MAX)) throw new Erro(`Escolha de 1 a ${DIAS_MAX} dias.`);
    const titulo = limpar(input.titulo, 40), texto = limpar(input.texto, 90);
    if (!titulo) throw new Erro('Escreva um título.');
    const contato = limpar(input.contato, 254);
    if (!EMAIL.test(contato)) throw new Erro('Informe um e-mail válido para o recibo.');
    if (politico(titulo, texto)) throw new Erro('Anúncio político-eleitoral não é aceito nos telões.');
    const cor = HEX.test(input.cor || '') ? input.cor.toLowerCase() : '#0e2a3a';
    const img = decodeImagem(input.imagem);
    const id = crypto.randomBytes(8).toString('hex');
    const chave = crypto.randomBytes(12).toString('hex');
    let imagem = null;
    if (img && this.pasta) { imagem = `${id}.${img.ext}`; fs.writeFileSync(path.join(this.pasta, imagem), img.buf); }
    const ad = {
      id, chave, slot: slot.id, dias, titulo, texto, cor, imagem, contato,
      valor: centavos(slot.precoDia * dias), status: 'aguardando_pagamento', criadoEm: agora,
      pagamento: null, inicio: null, fim: null, motivo: null,
    };
    this.lista.push(ad); janela.push(agora); this.porIp.set(ip, janela); this.salvar();
    return ad;
  }

  buscar(id) { return this.lista.find((a) => a.id === id) || null; }
  doDono(id, chave) {
    const a = this.buscar(id);
    if (!a || !chave || a.chave.length !== String(chave).length) return null;
    return crypto.timingSafeEqual(Buffer.from(a.chave), Buffer.from(String(chave))) ? a : null;
  }

  registrarCobranca(id, pagamento) { const a = this.buscar(id); if (a) { a.pagamento = pagamento; this.salvar(); } return a; }

  marcarPago(id, origem = 'manual') {
    const a = this.buscar(id);
    if (!a) throw new Erro('Anúncio não encontrado.', 404);
    if (a.status !== 'aguardando_pagamento') return a;
    a.status = 'em_moderacao'; a.pagoEm = this.agora(); a.pagoPor = origem; this.salvar();
    return a;
  }

  aprovar(id) {
    const a = this.buscar(id);
    if (!a) throw new Erro('Anúncio não encontrado.', 404);
    if (a.status !== 'em_moderacao') throw new Erro('Só anúncios pagos e em moderação podem ser aprovados.', 409);
    const agora = this.agora();
    a.status = 'no_ar'; a.inicio = agora; a.fim = agora + a.dias * 86400e3; this.salvar();
    return a;
  }

  recusar(id, motivo) {
    const a = this.buscar(id);
    if (!a) throw new Erro('Anúncio não encontrado.', 404);
    if (a.status === 'encerrado' || a.status === 'recusado') return a;
    a.status = 'recusado'; a.motivo = limpar(motivo, 200) || 'Fora das regras dos telões.'; this.salvar();
    return a;
  }

  // Encerra os que venceram. Retorna true se algo mudou.
  expirar() {
    const agora = this.agora(); let mudou = false;
    for (const a of this.lista) if (a.status === 'no_ar' && a.fim <= agora) { a.status = 'encerrado'; mudou = true; }
    if (mudou) this.salvar();
    return mudou;
  }

  // O que os jogadores veem: telões com preço e anúncios no ar (sem e-mail nem chave).
  publico() {
    const agora = this.agora();
    return SLOTS.map((s) => ({
      id: s.id, nome: s.nome, local: s.local, precoDia: s.precoDia,
      anuncios: this.lista
        .filter((a) => a.slot === s.id && a.status === 'no_ar' && a.fim > agora)
        .map((a) => ({ id: a.id, titulo: a.titulo, texto: a.texto, cor: a.cor, imagem: a.imagem ? `/anuncios/img/${a.imagem}` : null })),
    }));
  }

  // Visão do dono do anúncio.
  status(a) {
    return {
      id: a.id, slot: a.slot, dias: a.dias, valor: a.valor, status: a.status, motivo: a.motivo, inicio: a.inicio, fim: a.fim,
      pix: a.pagamento && a.status === 'aguardando_pagamento' ? { copiaECola: a.pagamento.qr, qrBase64: a.pagamento.qrBase64, link: a.pagamento.ticket } : null,
    };
  }

  admin() { return this.lista.map(({ chave, ...resto }) => resto).sort((x, y) => y.criadoEm - x.criadoEm); }
}

module.exports = { Anuncios, SLOTS, Erro, politico, decodeImagem, DIAS_MAX };
