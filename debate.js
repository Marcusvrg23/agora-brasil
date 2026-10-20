'use strict';
// Modo debate: dois jogadores na tribuna, turnos cronometrados e votação da plateia.
// Máquina de estados pura; o servidor chama tick(now) periodicamente.

const ROTEIRO = [
  { fase: 'abertura', lado: 'a', segundos: 60 },
  { fase: 'abertura', lado: 'b', segundos: 60 },
  { fase: 'replica', lado: 'a', segundos: 45 },
  { fase: 'replica', lado: 'b', segundos: 45 },
  { fase: 'treplica', lado: 'a', segundos: 30 },
  { fase: 'treplica', lado: 'b', segundos: 30 },
  { fase: 'votacao', lado: null, segundos: 30 },
  { fase: 'resultado', lado: null, segundos: 10 },
];
const FALA_MAX = 280;
const FALA_INTERVALO_MS = 2000;

function resumo(p) {
  return p ? { id: p.id, name: p.name, team: p.team } : null;
}

class Debate {
  constructor({ emit, roteiro = ROTEIRO } = {}) {
    this.emit = emit || (() => {});
    this.roteiro = roteiro;
    this.fila = [];
    this.reset();
  }

  reset() {
    this.a = null; this.b = null;
    this.etapa = -1; this.terminaEm = 0;
    this.votos = new Map();
    this.vencedor = null; this.motivo = null;
    this.ultimaFala = new Map();
  }

  get ativo() { return this.etapa >= 0; }
  get passo() { return this.ativo ? this.roteiro[this.etapa] : null; }

  estado() {
    const passo = this.passo;
    const contagem = { a: 0, b: 0 };
    for (const lado of this.votos.values()) contagem[lado]++;
    const mostrarVotos = passo?.fase === 'resultado';
    return {
      fase: passo ? passo.fase : 'aguardando',
      orador: passo?.lado || null,
      a: resumo(this.a), b: resumo(this.b),
      terminaEm: this.terminaEm,
      fila: this.fila.map(resumo),
      votosTotal: this.votos.size,
      votos: mostrarVotos ? contagem : null,
      vencedor: mostrarVotos ? this.vencedor : null,
      motivo: mostrarVotos ? this.motivo : null,
    };
  }

  publicar() { this.emit({ type: 'debate', state: this.estado() }); }

  entrarFila(jogador, now) {
    if (this.fila.some(p => p.id === jogador.id)) return false;
    if (this.a?.id === jogador.id || this.b?.id === jogador.id) return false;
    this.fila.push(jogador);
    this.tentarIniciar(now);
    this.publicar();
    return true;
  }

  sairFila(id) {
    const antes = this.fila.length;
    this.fila = this.fila.filter(p => p.id !== id);
    if (this.fila.length !== antes) this.publicar();
  }

  tentarIniciar(now) {
    if (this.ativo || this.fila.length < 2) return false;
    const a = this.fila.shift();
    // Prefere adversário do outro time; se não houver, pega o próximo da fila.
    let idx = this.fila.findIndex(p => p.team && p.team !== a.team);
    if (idx < 0) idx = 0;
    const b = this.fila.splice(idx, 1)[0];
    this.reset();
    this.a = a; this.b = b;
    this.irPara(0, now);
    return true;
  }

  irPara(etapa, now) {
    this.etapa = etapa;
    this.terminaEm = now + this.roteiro[etapa].segundos * 1000;
    if (this.roteiro[etapa].fase === 'resultado' && !this.vencedor) this.apurar();
    this.publicar();
  }

  apurar() {
    let a = 0, b = 0;
    for (const lado of this.votos.values()) lado === 'a' ? a++ : b++;
    this.vencedor = a === b ? 'empate' : (a > b ? 'a' : 'b');
    this.motivo = 'votacao';
  }

  tick(now) {
    if (!this.ativo) return;
    if (now < this.terminaEm) return;
    const proxima = this.etapa + 1;
    if (proxima < this.roteiro.length) { this.irPara(proxima, now); return; }
    this.reset();
    if (!this.tentarIniciar(now)) this.publicar();
  }

  // Avança o turno atual antes do tempo (o orador passa a vez).
  passarVez(id, now) {
    const passo = this.passo;
    if (!passo?.lado || this[passo.lado].id !== id) return false;
    this.terminaEm = now;
    this.tick(now);
    return true;
  }

  falar(id, texto, now) {
    const passo = this.passo;
    if (!passo?.lado) return null;
    const orador = this[passo.lado];
    if (orador.id !== id) return null;
    if (this.ultimaFala.has(id) && now - this.ultimaFala.get(id) < FALA_INTERVALO_MS) return null;
    const text = String(texto || '').slice(0, FALA_MAX);
    if (!text) return null;
    this.ultimaFala.set(id, now);
    const pacote = { type: 'debate-fala', side: passo.lado, name: orador.name, team: orador.team, text, time: now };
    this.emit(pacote);
    return pacote;
  }

  votar(id, lado) {
    if (this.passo?.fase !== 'votacao') return false;
    if (lado !== 'a' && lado !== 'b') return false;
    if (id === this.a.id || id === this.b.id) return false;
    if (this.votos.has(id)) return false;
    this.votos.set(id, lado);
    this.publicar();
    return true;
  }

  // Jogador saiu da sala: tira da fila; se estava debatendo, o outro vence por W.O.
  saiu(id, now) {
    this.sairFila(id);
    if (!this.ativo) return;
    const lado = this.a.id === id ? 'a' : (this.b.id === id ? 'b' : null);
    if (!lado) { this.votos.delete(id); return; }
    if (this.passo.fase === 'resultado') return;
    this.vencedor = lado === 'a' ? 'b' : 'a';
    this.motivo = 'wo';
    this.irPara(this.roteiro.length - 1, now);
  }
}

module.exports = { Debate, ROTEIRO };
