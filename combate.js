'use strict';
// Combate PvP: vida, itens, veículos e placar, uma instância por sala.
// Regras do projeto:
// - armas atingem só jogadores e veículos; prédios não têm vida e não sofrem dano;
// - sem fogo amigo; 3 s de proteção ao renascer; a tribuna do debate é zona segura;
// - o cliente simula o tiro e informa o acerto; o servidor valida arma, recarga, alcance, time e
//   que cada tiro só acerta uma vez (bilhete do disparo).

const ARMAS = {
  espada: { dano: 34, alcance: 3.6, recarga: 550, mao: true, corpo: true },
  arco: { dano: 42, alcance: 160, recarga: 850, mao: true },
  bomba: { dano: 90, raio: 7, alcance: 45, recarga: 1200, mao: true, gasta: true },
  metralhadora: { dano: 9, alcance: 220, recarga: 90, veiculo: ['helicoptero'] },
  'missil-heli': { dano: 75, raio: 6, alcance: 500, recarga: 1400, veiculo: ['helicoptero'] },
  'missil-caca': { dano: 95, raio: 8, alcance: 900, recarga: 1700, veiculo: ['caca'] },
  mordida: { dano: 60, alcance: 9, recarga: 1100, veiculo: ['trex'], corpo: true },
  atropelar: { dano: 45, alcance: 7, recarga: 900, veiculo: ['carro', 'moto'], corpo: true },
};
const VEICULOS = {
  carro: { vida: 260 }, moto: { vida: 160 }, helicoptero: { vida: 420 }, caca: { vida: 360 }, trex: { vida: 650 },
};
const VOADORES = new Set(['helicoptero', 'caca']);
const BASES = { vermelho: { x: -70, z: 120 }, amarelo: { x: 70, z: 120 } };
const ZONAS_SEGURAS = [{ x: 42, z: -62, r: 26 }]; // tribuna do debate
const VIDA = 100, RENASCE_MS = 5000, PROTECAO_MS = 3000, ITEM_VOLTA_MS = 20000, VEICULO_VOLTA_MS = 30000, VITORIA = 25;
const MARGEM = 8; // tolerância de rede para posições (m)
const BILHETE_MS = 12000;

// Pontos fixos do mapa (metros, mesmo sistema da cidade.js; gramado central entre x -117 e 117).
const PICKUPS = [
  // Equipamentos visíveis e acessíveis a partir do ponto inicial (0, -30).
  ['espada', -5, -22], ['arco', 0, -19], ['bomba', 5, -22],
  ['espada', -20, 40], ['espada', 20, 40], ['espada', -40, 300], ['espada', 40, 300],
  ['arco', 0, 90], ['arco', -60, 220], ['arco', 60, 220], ['arco', 0, 470],
  ['bomba', -25, 170], ['bomba', 25, 170], ['bomba', -25, 400], ['bomba', 25, 400],
].map(([item, x, z], i) => ({ id: 'i' + i, item, x, z }));
const GARAGEM = [
  // Veículos de teste perto da praça inicial, sem remover as garagens existentes.
  ['moto', -15, -4, 0], ['carro', 15, -4, 0],
  ['trex', 0, 5, Math.PI], ['helicoptero', -37, 12, Math.PI], ['caca', 37, 12, Math.PI],
  ['carro', -124, 60, 0], ['carro', -124, 180, 0], ['carro', 124, 120, Math.PI],
  ['moto', 124, 60, Math.PI], ['moto', 124, 180, Math.PI], ['moto', -124, 120, 0],
  ['helicoptero', -55, 560, Math.PI], ['helicoptero', 55, 560, Math.PI],
  ['caca', -60, 700, Math.PI], ['caca', 60, 700, Math.PI],
  ['trex', 0, 330, Math.PI],
].map(([tipo, x, z, ry], i) => ({ id: 'v' + i, tipo, x, z, ry }));

const d3 = (a, b) => Math.hypot(a.x - b.x, (a.y || 0) - (b.y || 0), a.z - b.z);
const num = (v, min, max) => (v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : null);
function ponto(p, lim = 3000) {
  if (!p || typeof p !== 'object') return null;
  const x = num(p.x, -lim, lim), y = num(p.y, -lim, lim), z = num(p.z, -lim, lim);
  return x === null || y === null || z === null ? null : { x, y, z };
}
const naZonaSegura = (p) => ZONAS_SEGURAS.some((z) => Math.hypot(p.x - z.x, p.z - z.z) < z.r);

class Combate {
  constructor({ emit = () => {}, agora = () => Date.now(), onWin = () => {} } = {}) {
     this.onWin = onWin;
    this.emit = emit; this.agora = agora;
    this.jogadores = new Map();
    this.placar = { vermelho: 0, amarelo: 0 };
    this.vencedor = null; this.reinicioEm = 0;
    this.pickups = PICKUPS.map((p) => ({ ...p, disponivel: true, voltaEm: 0 }));
    this.veiculos = GARAGEM.map((g) => this.novoVeiculo(g));
    this.tiros = new Map(); this.nTiro = 0;
  }

  novoVeiculo(g) {
    return { id: g.id, tipo: g.tipo, spawn: g, x: g.x, y: 0, z: g.z, ry: g.ry, rx: 0, rz: 0, vel: 0, vida: VEICULOS[g.tipo].vida, motorista: null, destruidoEm: 0 };
  }
  veiculo(id) { return this.veiculos.find((v) => v.id === id) || null; }
  posDe(j) {
    if (j.veiculo) { const v = this.veiculo(j.veiculo); if (v) return v; }
    return j.pos;
  }
  pub(j) { return { id: j.id, team: j.team, vida: j.vida, vivo: j.vivo, item: j.item, veiculo: j.veiculo, pvp: !!j.pvp }; }
  pubV(v) { return { id: v.id, tipo: v.tipo, x: v.x, y: v.y, z: v.z, ry: v.ry, rx: v.rx, rz: v.rz, vida: v.vida, max: VEICULOS[v.tipo].vida, motorista: v.motorista, ativo: !v.destruidoEm }; }

  estado() {
    return {
      jogadores: [...this.jogadores.values()].map((j) => this.pub(j)),
      veiculos: this.veiculos.map((v) => this.pubV(v)),
      pickups: this.pickups.map((p) => ({ id: p.id, item: p.item, x: p.x, z: p.z, disponivel: p.disponivel })),
      placar: { ...this.placar }, vencedor: this.vencedor, bases: BASES, zonas: ZONAS_SEGURAS, vitoria: VITORIA,
    };
  }

  entrar(id, team, pos) {
    const j = { id, team: team === 'amarelo' ? 'amarelo' : 'vermelho', vida: VIDA, vivo: true, item: null, veiculo: null,
      pos: { x: pos?.x ?? 0, y: 0, z: pos?.z ?? 0 }, pvp: false, protegidoAte: this.agora() + PROTECAO_MS, mortoEm: 0, ultimo: {} };
    this.jogadores.set(id, j);
    this.emit({ type: 'jogador', jogador: this.pub(j) });
    return j;
  }
  trocarTime(id, team) {
    const j = this.jogadores.get(id); if (!j) return;
    j.team = team === 'amarelo' ? 'amarelo' : 'vermelho';
    this.emit({ type: 'jogador', jogador: this.pub(j) });
  }
  definirPvP(id, ativo) {
    const j=this.jogadores.get(id);if(!j)return false;
    j.pvp=ativo===true;
    if(!j.pvp){j.protegidoAte=this.agora()+1000;}
    this.emit({type:'jogador',jogador:this.pub(j)});
    return true;
  }
  sair(id) {
    if (!this.jogadores.has(id)) return;
    this.sairVeiculo(id);
    this.jogadores.delete(id);
  }
  vivo(id) { const j = this.jogadores.get(id); return !!j && j.vivo; }

  mover(id, x, z) {
    const j = this.jogadores.get(id); if (!j || !j.vivo || j.veiculo) return false;
    j.pos = { x, y: 0, z };
    return true;
  }

  pegar(id, pickupId) {
    const j = this.jogadores.get(id), p = this.pickups.find((q) => q.id === pickupId);
    if (!j || !p || !j.vivo || j.veiculo || !p.disponivel) return false;
    if (Math.hypot(j.pos.x - p.x, j.pos.z - p.z) > 3.5 + MARGEM) return false;
    j.item = p.item; p.disponivel = false; p.voltaEm = this.agora() + ITEM_VOLTA_MS;
    this.emit({ type: 'pickup', id: p.id, disponivel: false });
    this.emit({ type: 'jogador', jogador: this.pub(j) });
    return true;
  }
  largar(id) {
    const j = this.jogadores.get(id);
    if (j && j.item) { j.item = null; this.emit({ type: 'jogador', jogador: this.pub(j) }); }
  }

  entrarVeiculo(id, vid) {
    const j = this.jogadores.get(id), v = this.veiculo(vid);
    if (!j || !v || !j.vivo || j.veiculo || v.motorista || v.destruidoEm) return false;
    if (Math.hypot(j.pos.x - v.x, j.pos.z - v.z) > 10 + MARGEM) return false;
    v.motorista = id; j.veiculo = vid;
    this.emit({ type: 'veiculo', veiculo: this.pubV(v) });
    this.emit({ type: 'jogador', jogador: this.pub(j) });
    return true;
  }
  sairVeiculo(id) {
    const j = this.jogadores.get(id); if (!j || !j.veiculo) return false;
    const v = this.veiculo(j.veiculo); j.veiculo = null;
    if (v) {
      v.motorista = null; v.vel = 0;
      j.pos = { x: v.x + Math.cos(v.ry) * 3, y: 0, z: v.z - Math.sin(v.ry) * 3 };
      if (v.y > 0.5) { v.y = 0; v.rx = 0; v.rz = 0; } // aeronave abandonada pousa onde está
      this.emit({ type: 'veiculo', veiculo: this.pubV(v) });
    }
    this.emit({ type: 'jogador', jogador: this.pub(j), pos: j.pos });
    return true;
  }
  moverVeiculo(id, s) {
    const j = this.jogadores.get(id); if (!j || !j.veiculo || !s) return null;
    const v = this.veiculo(j.veiculo); if (!v || v.motorista !== id) return null;
    const x = num(s.x, -2500, 2500), z = num(s.z, -2500, 2500), y = num(s.y, 0, 600);
    if (x === null || z === null || y === null) return null;
    v.x = x; v.z = z; v.y = VOADORES.has(v.tipo) ? y : 0;
    v.ry = num(s.ry, -1000, 1000) ?? v.ry; v.rx = num(s.rx, -3.2, 3.2) ?? 0; v.rz = num(s.rz, -3.2, 3.2) ?? 0;
    v.vel = num(s.vel, -200, 200) ?? 0;
    return v;
  }

  // 1º passo de todo ataque: valida e devolve um bilhete. O efeito visual vai para a sala.
  disparar(id, arma, vis = {}) {
    const agora = this.agora(), j = this.jogadores.get(id), a = ARMAS[arma];
    if (!j || !j.vivo || !a) return { ok: false, motivo: 'indisponivel' };
    if (this.vencedor) return { ok: false, motivo: 'fim-de-partida' };
    if (a.mao && (j.item !== arma || j.veiculo)) return { ok: false, motivo: 'sem-item' };
    if (a.veiculo) { const v = j.veiculo && this.veiculo(j.veiculo); if (!v || !a.veiculo.includes(v.tipo)) return { ok: false, motivo: 'sem-veiculo' }; }
    if (agora - (j.ultimo[arma] || 0) < a.recarga * 0.8) return { ok: false, motivo: 'recarga' };
    j.ultimo[arma] = agora;
    if (a.gasta) { j.item = null; this.emit({ type: 'jogador', jogador: this.pub(j) }); }
    const origem = { ...this.posDe(j) };
    const tiro = 't' + (++this.nTiro);
    this.tiros.set(tiro, { autor: id, arma, origem, em: agora, usado: false });
    if (this.tiros.size > 400) for (const [k, t] of this.tiros) if (agora - t.em > BILHETE_MS) this.tiros.delete(k);
    if (!a.corpo) {
      const o = ponto(vis.o), d = ponto(vis.d, 2);
      this.emit({ type: 'disparo', de: id, arma, tiro, o: o || origem, d: d || { x: 0, y: 0, z: 1 } });
    } else this.emit({ type: 'golpe', de: id, arma });
    return { ok: true, tiro };
  }

  // 2º passo: o cliente informa o que o tiro atingiu (um jogador, um veículo ou o ponto da explosão).
  acertar(id, tiroId, alvo = {}) {
    const agora = this.agora(), t = this.tiros.get(tiroId), j = this.jogadores.get(id);
    if (!t || t.autor !== id || t.usado || agora - t.em > BILHETE_MS || !j) return { ok: false, motivo: 'bilhete' };
    t.usado = true;
    const a = ARMAS[t.arma], eventos = [];
    if (a.raio) {
      const p = ponto(alvo.ponto);
      if (!p || d3(t.origem, p) > a.alcance + MARGEM * 2) return { ok: false, motivo: 'alcance' };
      this.emit({ type: 'explosao', arma: t.arma, de: id, x: p.x, y: p.y, z: p.z, raio: a.raio });
      for (const alvoJ of this.jogadores.values()) {
        if (alvoJ.team === j.team || !alvoJ.vivo) continue;
        const dist = d3(this.posDe(alvoJ), p);
        if (dist <= a.raio + 1) eventos.push(...this.ferir(alvoJ, Math.round(a.dano * (1 - 0.6 * Math.min(1, dist / a.raio))), j, t.arma));
      }
      for (const v of this.veiculos) {
        if (v.destruidoEm || v.id === j.veiculo || this.mesmoTime(v, j)) continue;
        const dist = d3(v, p);
        if (dist <= a.raio + 3) eventos.push(...this.ferirVeiculo(v, Math.round(a.dano * 1.2 * (1 - 0.5 * Math.min(1, dist / (a.raio + 3)))), j, t.arma));
      }
      return { ok: true, eventos };
    }
    const folga = a.corpo ? MARGEM : MARGEM * 2;
    if (typeof alvo.alvo === 'string') {
      const alvoJ = this.jogadores.get(alvo.alvo);
      if (!alvoJ || !alvoJ.vivo || alvoJ.team === j.team) return { ok: true, eventos };
      if (d3(a.corpo ? this.posDe(j) : t.origem, this.posDe(alvoJ)) > a.alcance + folga) return { ok: false, motivo: 'alcance' };
      eventos.push(...this.ferir(alvoJ, a.dano, j, t.arma));
    } else if (typeof alvo.alvoVeiculo === 'string') {
      const v = this.veiculo(alvo.alvoVeiculo);
      if (!v || v.destruidoEm || v.id === j.veiculo || this.mesmoTime(v, j)) return { ok: true, eventos };
      if (d3(a.corpo ? this.posDe(j) : t.origem, v) > a.alcance + folga + 5) return { ok: false, motivo: 'alcance' };
      eventos.push(...this.ferirVeiculo(v, a.dano, j, t.arma));
    }
    return { ok: true, eventos };
  }

  // Golpe corpo a corpo (espada, mordida, atropelar): disparo e acerto juntos.
  atacar(id, arma, alvo) {
    const r = this.disparar(id, arma);
    return r.ok ? this.acertar(id, r.tiro, alvo) : r;
  }

  mesmoTime(v, j) { const m = v.motorista && this.jogadores.get(v.motorista); return !!m && m.team === j.team; }

  ferir(alvo, dano, autor, arma) {
    if (!autor?.pvp || !alvo.pvp || this.agora() < alvo.protegidoAte || dano <= 0 || !alvo.vivo) return [];
    if (!alvo.veiculo && naZonaSegura(alvo.pos)) return [];
    alvo.vida = Math.max(0, alvo.vida - dano);
    const ev = { type: 'dano', alvo: alvo.id, vida: alvo.vida, de: autor.id, arma };
    this.emit(ev);
    return alvo.vida === 0 ? [ev, ...this.matar(alvo, autor, arma)] : [ev];
  }

  ferirVeiculo(v, dano, autor, arma) {
    if (dano <= 0 || !autor?.pvp) return [];
    const piloto=v.motorista&&this.jogadores.get(v.motorista);
    if (!piloto?.pvp) return [];
    v.vida = Math.max(0, v.vida - dano);
    const ev = [{ type: 'dano-veiculo', veiculo: v.id, vida: v.vida, de: autor.id, arma }];
    this.emit(ev[0]);
    if (v.vida === 0) {
      v.destruidoEm = this.agora();
      const motorista = v.motorista && this.jogadores.get(v.motorista);
      const e = { type: 'explosao-veiculo', veiculo: v.id, x: v.x, y: v.y, z: v.z };
      if (motorista) this.sairVeiculo(motorista.id);
      v.motorista = null;
      this.emit(e); ev.push(e);
      this.emit({ type: 'veiculo', veiculo: this.pubV(v) });
      if (motorista) { motorista.protegidoAte = 0; ev.push(...this.ferir(motorista, 70, autor, arma)); }
    }
    return ev;
  }

  matar(alvo, autor, arma) {
    alvo.vivo = false; alvo.mortoEm = this.agora(); alvo.item = null;
    if (alvo.veiculo) this.sairVeiculo(alvo.id);
    const ev = [{ type: 'morte', alvo: alvo.id, de: autor.id, arma }];
    this.emit(ev[0]);
    if (autor.team !== alvo.team && !this.vencedor) {
      this.placar[autor.team]++;
      this.emit({ type: 'placar', placar: { ...this.placar } });
      if (this.placar[autor.team] >= VITORIA) {
        this.vencedor = autor.team; this.reinicioEm = this.agora() + 12000;
        this.emit({ type: 'vitoria', time: autor.team, placar: { ...this.placar } });
         this.onWin(autor.team);
      }
    }
    return ev;
  }

  tick() {
    const agora = this.agora();
    for (const j of this.jogadores.values()) {
      if (!j.vivo && agora - j.mortoEm >= RENASCE_MS) {
        const b = BASES[j.team];
        j.vivo = true; j.vida = VIDA; j.protegidoAte = agora + PROTECAO_MS;
        j.pos = { x: b.x + (Math.random() - 0.5) * 10, y: 0, z: b.z + (Math.random() - 0.5) * 10 };
        this.emit({ type: 'renasceu', id: j.id, pos: j.pos, vida: j.vida });
      }
    }
    for (const p of this.pickups) if (!p.disponivel && agora >= p.voltaEm) { p.disponivel = true; this.emit({ type: 'pickup', id: p.id, disponivel: true }); }
    for (let i = 0; i < this.veiculos.length; i++) {
      const v = this.veiculos[i];
      if (v.destruidoEm && agora - v.destruidoEm >= VEICULO_VOLTA_MS) {
        this.veiculos[i] = this.novoVeiculo(v.spawn);
        this.emit({ type: 'veiculo', veiculo: this.pubV(this.veiculos[i]) });
      }
    }
    if (this.vencedor && agora >= this.reinicioEm) {
      this.vencedor = null; this.placar = { vermelho: 0, amarelo: 0 };
      this.emit({ type: 'placar', placar: { ...this.placar }, novaPartida: true });
    }
  }
}

module.exports = { Combate, ARMAS, VEICULOS, BASES, PICKUPS, GARAGEM, VITORIA, ZONAS_SEGURAS };
