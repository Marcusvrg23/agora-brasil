// Telões: desenha os anúncios aprovados (em rodízio) e o formulário para anunciar.
const ROTACAO_MS = 12000;
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const imagens = new Map();
function carregarImagem(url, aoCarregar) {
  if (!url) return null;
  if (!imagens.has(url)) { const img = new Image(); img.onload = aoCarregar; img.src = url; imagens.set(url, img); }
  const img = imagens.get(url);
  return img.complete && img.naturalWidth ? img : null;
}
function quebrarLinhas(g, texto, largura, maxLinhas) {
  const palavras = String(texto || '').split(/\s+/); const linhas = []; let atual = '';
  for (const p of palavras) {
    const teste = atual ? atual + ' ' + p : p;
    if (g.measureText(teste).width > largura && atual) { linhas.push(atual); atual = p; if (linhas.length === maxLinhas) break; } else atual = teste;
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual);
  return linhas;
}
function brilhoLed(g, w, h) {
  g.fillStyle = 'rgba(0,0,0,.07)';
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
}

// Desenha um anúncio (ou o convite "Anuncie aqui") em qualquer canvas — usado nos telões e na prévia do formulário.
export function desenharAnuncio(canvas, slot, ad, redesenhar) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height, u = w / 1024;
  g.save();
  if (!ad) {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0b2230'); gr.addColorStop(1, '#06121a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#43d5a8'; g.lineWidth = 8 * u; g.strokeRect(18 * u, 18 * u, w - 36 * u, h - 36 * u);
    g.textAlign = 'center'; g.fillStyle = '#43d5a8'; g.font = `800 ${92 * u}px Inter,system-ui,sans-serif`;
    g.fillText('ANUNCIE AQUI', w / 2, h * .38);
    g.fillStyle = '#e8f3f1'; g.font = `600 ${40 * u}px Inter,system-ui,sans-serif`;
    g.fillText(slot?.nome || 'Telão da Esplanada', w / 2, h * .53);
    if (slot?.precoDia) { g.fillStyle = '#f4c20d'; g.font = `800 ${58 * u}px Inter,system-ui,sans-serif`; g.fillText(brl(slot.precoDia) + ' / dia', w / 2, h * .7); }
    g.fillStyle = '#8fb3bd'; g.font = `500 ${28 * u}px Inter,system-ui,sans-serif`;
    g.fillText('Painel ao lado → "Anunciar nos telões"', w / 2, h * .86);
  } else {
    g.fillStyle = ad.cor || '#0e2a3a'; g.fillRect(0, 0, w, h);
    const img = carregarImagem(ad.imagem, redesenhar);
    if (img) {
      const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      g.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
      const gr = g.createLinearGradient(0, h * .45, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.72)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    g.textAlign = 'left'; g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10 * u;
    g.font = `800 ${img ? 74 : 96}px Inter,system-ui,sans-serif`.replace(/(\d+)px/, (_, n) => `${n * u}px`);
    const tl = quebrarLinhas(g, ad.titulo, w - 120 * u, 2);
    let y = img ? h * .66 : h * .4;
    for (const l of tl) { g.fillText(l, 60 * u, y); y += (img ? 80 : 104) * u; }
    g.font = `500 ${(img ? 36 : 46) * u}px Inter,system-ui,sans-serif`; g.fillStyle = 'rgba(255,255,255,.92)';
    for (const l of quebrarLinhas(g, ad.texto, w - 120 * u, 2)) { g.fillText(l, 60 * u, y + 8 * u); y += 52 * u; }
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(28 * u, 28 * u, 170 * u, 46 * u);
    g.fillStyle = '#ffffff'; g.font = `700 ${24 * u}px Inter,system-ui,sans-serif`; g.fillText('ANÚNCIO', 48 * u, 60 * u);
  }
  brilhoLed(g, w, h);
  g.restore();
}

export function iniciarTeloes(city) {
  let slots = [];
  const estado = new Map(); // id -> {idx, desde}
  function pintar(id) {
    const t = city.teloes.get(id); const slot = slots.find((s) => s.id === id);
    if (!t) return;
    const lista = slot?.anuncios || []; const e = estado.get(id) || { idx: 0 };
    const ad = lista.length ? lista[e.idx % lista.length] : null;
    desenharAnuncio(t.canvas, slot, ad, () => pintar(id));
    t.tex.needsUpdate = true;
  }
  function atualizar(novos) {
    slots = Array.isArray(novos) ? novos : [];
    for (const id of city.teloes.keys()) { if (!estado.has(id)) estado.set(id, { idx: 0 }); pintar(id); }
    preencherFormulario(slots);
  }
  setInterval(() => {
    for (const [id, e] of estado) { const n = slots.find((s) => s.id === id)?.anuncios.length || 0; if (n > 1) { e.idx = (e.idx + 1) % n; pintar(id); } }
  }, ROTACAO_MS);
  for (const id of city.teloes.keys()) pintar(id);
  fetch('/api/teloes').then((r) => r.json()).then((d) => { atualizar(d.slots); pagamentoOnline = d.pagamentoOnline; }).catch(() => {});
  return { atualizar };
}

// ---------- formulário ----------
let pagamentoOnline = false;
const $ = (s) => document.querySelector(s);
let slotsForm = [];
function preencherFormulario(slots) {
  slotsForm = slots;
  const sel = $('#ad-slot'); if (!sel) return;
  const atual = sel.value;
  sel.replaceChildren(...slots.map((s) => { const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.nome} · ${brl(s.precoDia)}/dia`; return o; }));
  if (atual && slots.some((s) => s.id === atual)) sel.value = atual;
  atualizarPrevia();
}
let imagemDataUrl = null;
function lerAnuncio() {
  return {
    slot: $('#ad-slot').value, dias: Number($('#ad-dias').value), titulo: $('#ad-titulo').value.trim(),
    texto: $('#ad-texto').value.trim(), cor: $('#ad-cor').value, contato: $('#ad-email').value.trim(), imagem: imagemDataUrl,
  };
}
function atualizarPrevia() {
  const a = lerAnuncio(); const slot = slotsForm.find((s) => s.id === a.slot);
  const dias = Math.min(30, Math.max(1, Math.floor(a.dias) || 1));
  $('#ad-total').textContent = slot ? brl(Math.round(slot.precoDia * dias * 100) / 100) : '—';
  const prev = $('#ad-previa');
  desenharAnuncio(prev, slot, a.titulo ? { titulo: a.titulo, texto: a.texto, cor: a.cor, imagem: imagemDataUrl } : null, atualizarPrevia);
}
// Reduz a imagem no navegador para caber no limite do servidor (400 KB).
function prepararImagem(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { reject(new Error('Use PNG, JPG ou WEBP.')); return; }
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1280 / img.naturalWidth, 720 / img.naturalHeight);
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let q = .86, out = c.toDataURL('image/jpeg', q);
      while (out.length > 520000 && q > .4) { q -= .12; out = c.toDataURL('image/jpeg', q); }
      if (out.length > 540000) reject(new Error('Imagem muito grande mesmo comprimida.')); else resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui ler a imagem.')); };
    img.src = url;
  });
}
function mostrarResultado(r) {
  const box = $('#ad-resultado'); box.hidden = false; box.replaceChildren();
  const p = (txt, cls) => { const el = document.createElement('p'); el.textContent = txt; if (cls) el.className = cls; box.append(el); return el; };
  const nomes = { aguardando_pagamento: 'Aguardando pagamento', em_moderacao: 'Pago · em moderação', no_ar: 'No ar', encerrado: 'Encerrado', recusado: 'Recusado' };
  p(`Pedido ${r.id} · ${brl(r.valor)} · ${nomes[r.status] || r.status}`, 'ad-status');
  if (r.motivo) p('Motivo: ' + r.motivo);
  if (r.aviso) p(r.aviso, 'fineprint');
  if (r.pix) {
    if (r.pix.qrBase64) { const img = document.createElement('img'); img.alt = 'QR Code Pix'; img.src = 'data:image/png;base64,' + r.pix.qrBase64; img.className = 'ad-qr'; box.append(img); }
    if (r.pix.copiaECola) {
      const ta = document.createElement('textarea'); ta.readOnly = true; ta.value = r.pix.copiaECola; ta.rows = 3; box.append(ta);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary'; b.textContent = 'Copiar código Pix';
      b.onclick = () => { navigator.clipboard?.writeText(r.pix.copiaECola); b.textContent = 'Copiado'; }; box.append(b);
    }
  }
  if (r.status === 'em_moderacao') p('Pagamento confirmado. Seu anúncio entra no ar assim que a moderação aprovar.');
}
let consulta = null;
function acompanhar(id, chave) {
  clearInterval(consulta);
  const passo = async () => {
    try {
      const r = await (await fetch(`/api/anuncios/${id}?chave=${encodeURIComponent(chave)}`)).json();
      if (r.id) { mostrarResultado(r); if (r.status !== 'aguardando_pagamento') clearInterval(consulta); }
    } catch {}
  };
  consulta = setInterval(passo, 6000);
}
export function iniciarFormulario() {
  const form = $('#ad-form'); if (!form) return;
  for (const id of ['#ad-slot', '#ad-dias', '#ad-titulo', '#ad-texto', '#ad-cor']) $(id).addEventListener('input', atualizarPrevia);
  $('#ad-imagem').addEventListener('change', async (e) => {
    const f = e.target.files[0]; $('#ad-erro').textContent = '';
    if (!f) { imagemDataUrl = null; atualizarPrevia(); return; }
    try { imagemDataUrl = await prepararImagem(f); } catch (err) { imagemDataUrl = null; $('#ad-erro').textContent = err.message; }
    atualizarPrevia();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); $('#ad-erro').textContent = '';
    const btn = $('#ad-enviar'); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const resp = await fetch('/api/anuncios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lerAnuncio()) });
      const r = await resp.json();
      if (!resp.ok) throw new Error(r.erro || 'Não foi possível enviar.');
      try { const meus = JSON.parse(localStorage.getItem('agora-anuncios') || '[]'); meus.push({ id: r.id, chave: r.chave }); localStorage.setItem('agora-anuncios', JSON.stringify(meus.slice(-20))); } catch {}
      mostrarResultado(r);
      if (r.pix) acompanhar(r.id, r.chave);
    } catch (err) { $('#ad-erro').textContent = err.message; }
    btn.disabled = false; btn.textContent = pagamentoOnline ? 'Gerar Pix' : 'Enviar pedido';
  });
  atualizarPrevia();
}
