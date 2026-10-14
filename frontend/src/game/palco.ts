// O "palco": desenha o mapa no canvas e anima os eventos que o servidor devolveu.
import type { Evento, MundoDef } from '../api';
import { corDoRobo } from '../components/Byte';

const DIRECOES = ['norte', 'leste', 'sul', 'oeste'];

type RoboVis = {
  id: number;
  nome: string;
  cor: string;
  x: number;
  y: number;
  ang: number; // em "quartos de volta": 0 norte, 1 leste, 2 sul, 3 oeste
  bolha: { texto: string; ate: number; tipo: 'fala' | 'duvida' } | null;
  tremerAte: number;
  nasceu: number;
};

type Efeito = { tipo: 'brilho' | 'bum'; x: number; y: number; t0: number; texto?: string };

export type Callbacks = {
  onLinha?: (linha: number | null) => void;
  onImprimir?: (texto: string) => void;
  onEvento?: (e: Evento) => void;
  onFim?: () => void;
};

const DURACAO: Record<string, number> = {
  criar: 380, andar: 380, virar: 260, pegar: 360, falar: 900, bater: 700, semMoeda: 700, imprimir: 140,
};

const facil = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class MotorPalco {
  private ctx: CanvasRenderingContext2D;
  private mapa: string[] = [];
  private colunas = 0;
  private linhas = 0;
  private tile = 48;
  private paredes = new Set<string>();
  private bandeiras: [number, number][] = [];
  private inicios: [number, number][] = [];
  private direcaoInicial = 1;
  private moedas = new Set<string>();
  private robos = new Map<number, RoboVis>();
  private efeitos: Efeito[] = [];
  private previa = true;

  private fila: Evento[] = [];
  private indice = 0;
  private inicioEvento = 0;
  private velocidade = 1;
  private cb: Callbacks = {};
  private tocando = false;
  private quadro = 0;
  private largura = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    const loop = (t: number) => {
      this.passo(t);
      this.desenhar(t);
      this.quadro = requestAnimationFrame(loop);
    };
    this.quadro = requestAnimationFrame(loop);
  }

  destruir() {
    cancelAnimationFrame(this.quadro);
  }

  definirMundo(m: MundoDef) {
    this.mapa = m.mapa;
    this.linhas = m.mapa.length;
    this.colunas = Math.max(...m.mapa.map((l) => l.length));
    this.direcaoInicial = Math.max(0, DIRECOES.indexOf(m.direcao ?? 'leste'));
    this.reiniciar();
    this.redimensionar(this.largura || this.canvas.parentElement?.clientWidth || 480);
  }

  /** Volta tudo para o começo: moedas no lugar e robôs "fantasmas" de prévia. */
  reiniciar() {
    this.paredes.clear();
    this.moedas.clear();
    this.bandeiras = [];
    this.inicios = [];
    this.mapa.forEach((linha, y) => {
      [...linha].forEach((c, x) => {
        if (c === '#') this.paredes.add(`${x},${y}`);
        if (c === 'M') this.moedas.add(`${x},${y}`);
        if (c === 'F') this.bandeiras.push([x, y]);
        if (c === 'R') this.inicios.push([x, y]);
      });
    });
    this.robos.clear();
    this.efeitos = [];
    this.previa = true;
    this.tocando = false;
    this.fila = [];
    this.indice = 0;
  }

  redimensionar(largura: number) {
    this.largura = largura;
    if (!this.colunas) return;
    const maxAltura = Math.min(window.innerHeight * 0.5, 460);
    this.tile = Math.max(18, Math.min(64, Math.floor(largura / this.colunas), Math.floor(maxAltura / this.linhas)));
    const w = this.tile * this.colunas;
    const h = this.tile * this.linhas;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  tocar(eventos: Evento[], velocidade: number, cb: Callbacks) {
    this.reiniciar();
    this.previa = false;
    this.fila = eventos;
    this.velocidade = velocidade;
    this.cb = cb;
    this.tocando = true;
    this.indice = -1;
    this.proximo(performance.now());
  }

  mudarVelocidade(v: number) {
    this.velocidade = v;
  }

  /** Aplica todos os eventos que faltam de uma vez. */
  pular() {
    if (!this.tocando) return;
    const agora = performance.now();
    while (this.tocando) {
      this.terminarEvento(agora);
      this.proximo(agora, true);
    }
  }

  parar() {
    this.tocando = false;
    this.cb.onLinha?.(null);
  }

  // ------------------------------------------------------------ reprodução

  private duracao(e: Evento) {
    return (DURACAO[e.tipo] ?? 100) / this.velocidade;
  }

  private proximo(agora: number, silencioso = false) {
    this.indice++;
    if (this.indice >= this.fila.length) {
      this.tocando = false;
      this.cb.onLinha?.(null);
      this.cb.onFim?.();
      return;
    }
    const e = this.fila[this.indice];
    this.inicioEvento = agora;
    if (!silencioso || this.indice === this.fila.length - 1) this.cb.onLinha?.(e.linha ?? null);
    this.cb.onEvento?.(e);
    this.comecarEvento(e, agora);
  }

  private comecarEvento(e: Evento, agora: number) {
    const r = e.robo !== undefined ? this.robos.get(e.robo) : undefined;
    switch (e.tipo) {
      case 'criar':
        this.robos.set(e.robo!, {
          id: e.robo!, nome: e.nome ?? 'Byte', cor: e.cor ?? 'azul', x: e.x!, y: e.y!,
          ang: Math.max(0, DIRECOES.indexOf(e.dir ?? 'leste')), bolha: null, tremerAte: 0, nasceu: agora,
        });
        break;
      case 'falar':
        if (r) r.bolha = { texto: e.texto ?? '', ate: agora + Math.max(1800, 2600 / this.velocidade), tipo: 'fala' };
        break;
      case 'semMoeda':
        if (r) r.bolha = { texto: '?', ate: agora + 99999999, tipo: 'duvida' };
        break;
      case 'bater':
        if (r) {
          r.tremerAte = agora + 700 / this.velocidade;
          const d = this.vetor(r.ang);
          this.efeitos.push({ tipo: 'bum', x: r.x + d[0] * 0.5, y: r.y + d[1] * 0.5, t0: agora });
        }
        break;
      case 'pegar':
        this.moedas.delete(`${e.x},${e.y}`);
        this.efeitos.push({ tipo: 'brilho', x: e.x!, y: e.y!, t0: agora, texto: '+1' });
        break;
      case 'imprimir':
        this.cb.onImprimir?.(e.texto ?? '');
        break;
    }
  }

  private terminarEvento(_agora: number) {
    const e = this.fila[this.indice];
    if (!e) return;
    const r = e.robo !== undefined ? this.robos.get(e.robo) : undefined;
    if (!r) return;
    if (e.tipo === 'andar') {
      r.x = e.x!;
      r.y = e.y!;
    } else if (e.tipo === 'virar') {
      r.ang = DIRECOES.indexOf(e.dir!);
    }
  }

  private passo(agora: number) {
    if (!this.tocando) return;
    const e = this.fila[this.indice];
    if (agora - this.inicioEvento >= this.duracao(e)) {
      this.terminarEvento(agora);
      this.proximo(agora);
    }
  }

  /** Posição e direção do robô neste instante (no meio do movimento, se for o caso). */
  private estadoVisual(r: RoboVis, agora: number) {
    let { x, y, ang } = r;
    const e = this.tocando ? this.fila[this.indice] : undefined;
    if (e && e.robo === r.id) {
      const t = facil(Math.min(1, (agora - this.inicioEvento) / this.duracao(e)));
      if (e.tipo === 'andar') {
        x = r.x + (e.x! - r.x) * t;
        y = r.y + (e.y! - r.y) * t;
      } else if (e.tipo === 'virar') {
        let alvo = DIRECOES.indexOf(e.dir!);
        let diff = alvo - r.ang;
        if (diff > 2) diff -= 4;
        if (diff < -2) diff += 4;
        alvo = r.ang + diff;
        ang = r.ang + (alvo - r.ang) * t;
      } else if (e.tipo === 'bater') {
        const d = this.vetor(r.ang);
        const empurrao = Math.sin(t * Math.PI) * 0.25;
        x += d[0] * empurrao;
        y += d[1] * empurrao;
      }
    }
    if (r.tremerAte > agora) x += Math.sin(agora / 25) * 0.04;
    return { x, y, ang };
  }

  private vetor(ang: number): [number, number] {
    const a = (ang * Math.PI) / 2;
    return [Math.sin(a), -Math.cos(a)];
  }

  // ------------------------------------------------------------ desenho

  private desenhar(agora: number) {
    const ctx = this.ctx;
    const T = this.tile;
    if (!this.colunas) return;
    ctx.clearRect(0, 0, this.colunas * T, this.linhas * T);

    for (let y = 0; y < this.linhas; y++) {
      for (let x = 0; x < this.colunas; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#f6f3ff' : '#ece6ff';
        ctx.fillRect(x * T, y * T, T, T);
      }
    }
    for (const [x, y] of this.inicios) {
      ctx.strokeStyle = '#c3b8ff';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((x + 0.5) * T, (y + 0.5) * T, T * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const [x, y] of this.bandeiras) this.desenharBandeira(x, y, agora);
    for (const chave of this.moedas) {
      const [x, y] = chave.split(',').map(Number);
      this.desenharMoeda(x, y, agora);
    }
    for (const chave of this.paredes) {
      const [x, y] = chave.split(',').map(Number);
      this.desenharParede(x, y);
    }

    if (this.previa) {
      this.inicios.forEach(([x, y], i) => {
        this.desenharRobo({ x, y, ang: this.direcaoInicial }, i === 0 ? 'azul' : 'laranja', this.inicios.length > 1 ? 0.45 : 1, agora);
      });
    }
    const varios = this.robos.size > 1;
    for (const r of this.robos.values()) {
      const v = this.estadoVisual(r, agora);
      const nascendo = Math.min(1, (agora - r.nasceu) / 300);
      this.desenharRobo(v, r.cor, 1, agora, 0.6 + 0.4 * nascendo);
      if (varios || r.nome !== 'Byte') this.desenharEtiqueta(v.x, v.y, r.nome, r.cor);
    }
    this.efeitos = this.efeitos.filter((ef) => agora - ef.t0 < 800);
    for (const ef of this.efeitos) this.desenharEfeito(ef, agora);
    for (const r of this.robos.values()) {
      if (r.bolha && r.bolha.ate > agora) {
        const v = this.estadoVisual(r, agora);
        this.desenharBolha(v.x, v.y, r.bolha.texto, r.bolha.tipo);
      }
    }
  }

  private desenharParede(x: number, y: number) {
    const ctx = this.ctx;
    const T = this.tile;
    const px = x * T;
    const py = y * T;
    ctx.fillStyle = '#4b3db0';
    ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#6f5ee6';
    this.retanguloRedondo(px + 2, py + 2, T - 4, T - 8, T * 0.14);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    this.retanguloRedondo(px + 5, py + 5, T * 0.45, T * 0.12, T * 0.06);
    ctx.fill();
  }

  private desenharMoeda(x: number, y: number, agora: number) {
    const ctx = this.ctx;
    const T = this.tile;
    const pulo = Math.sin(agora / 300 + x + y) * T * 0.04;
    const cx = (x + 0.5) * T;
    const cy = (y + 0.5) * T + pulo;
    const r = T * 0.22;
    ctx.fillStyle = 'rgba(45,42,74,0.12)';
    ctx.beginPath();
    ctx.ellipse(cx, (y + 0.78) * T, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a90c';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a90c';
    ctx.font = `bold ${Math.round(r * 1.1)}px Fredoka, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(1.5, T * 0.035);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, Math.PI * 1.1, Math.PI * 1.45);
    ctx.stroke();
  }

  private desenharBandeira(x: number, y: number, agora: number) {
    const ctx = this.ctx;
    const T = this.tile;
    const base = (x + 0.36) * T;
    ctx.fillStyle = 'rgba(45,42,74,0.15)';
    ctx.beginPath();
    ctx.ellipse((x + 0.45) * T, (y + 0.84) * T, T * 0.22, T * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a5780';
    ctx.lineWidth = Math.max(2, T * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(base, (y + 0.84) * T);
    ctx.lineTo(base, (y + 0.14) * T);
    ctx.stroke();
    const onda = Math.sin(agora / 200 + x) * T * 0.04;
    ctx.fillStyle = '#ff4f7b';
    ctx.beginPath();
    ctx.moveTo(base, (y + 0.15) * T);
    ctx.quadraticCurveTo(base + T * 0.25, (y + 0.15) * T + onda, base + T * 0.46, (y + 0.28) * T);
    ctx.quadraticCurveTo(base + T * 0.25, (y + 0.4) * T - onda, base, (y + 0.44) * T);
    ctx.closePath();
    ctx.fill();
  }

  private desenharRobo(v: { x: number; y: number; ang: number }, cor: string, opacidade: number, agora: number, escala = 1) {
    const ctx = this.ctx;
    const T = this.tile;
    const cx = (v.x + 0.5) * T;
    const cy = (v.y + 0.5) * T;
    const s = T * 0.7 * escala;
    const [dx, dy] = this.vetor(v.ang);
    ctx.save();
    ctx.globalAlpha = opacidade;

    ctx.fillStyle = 'rgba(45,42,74,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.48, s * 0.42, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // setinha mostrando para onde o robô olha
    const corCorpo = corDoRobo(cor);
    ctx.fillStyle = corCorpo;
    ctx.beginPath();
    const px = cx + dx * s * 0.68;
    const py = cy + dy * s * 0.68;
    const lado: [number, number] = [-dy, dx];
    ctx.moveTo(px + dx * s * 0.14, py + dy * s * 0.14);
    ctx.lineTo(px + lado[0] * s * 0.14, py + lado[1] * s * 0.14);
    ctx.lineTo(px - lado[0] * s * 0.14, py - lado[1] * s * 0.14);
    ctx.closePath();
    ctx.fill();

    // antena
    ctx.strokeStyle = '#5a5780';
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.42);
    ctx.lineTo(cx, cy - s * 0.58);
    ctx.stroke();
    ctx.fillStyle = Math.floor(agora / 600) % 3 === 0 ? '#ffe28a' : '#ffc83d';
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.6, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // corpo
    ctx.fillStyle = corCorpo;
    this.retanguloRedondo(cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.9, s * 0.26);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    this.retanguloRedondo(cx - s * 0.38, cy - s * 0.42, s * 0.76, s * 0.22, s * 0.11);
    ctx.fill();

    // rosto
    ctx.fillStyle = '#ffffff';
    this.retanguloRedondo(cx - s * 0.32, cy - s * 0.28, s * 0.64, s * 0.52, s * 0.16);
    ctx.fill();
    const piscando = Math.floor(agora / 140) % 28 === 0;
    ctx.fillStyle = '#2d2a4a';
    for (const lx of [-0.14, 0.14]) {
      const ox = cx + lx * s + dx * s * 0.07;
      const oy = cy - s * 0.04 + dy * s * 0.07;
      ctx.beginPath();
      ctx.ellipse(ox, oy, s * 0.055, piscando ? s * 0.012 : s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#2d2a4a';
    ctx.lineWidth = Math.max(1.2, s * 0.04);
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.08, s * 0.1, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  private desenharEtiqueta(x: number, y: number, nome: string, cor: string) {
    const ctx = this.ctx;
    const T = this.tile;
    ctx.font = `700 ${Math.max(10, Math.round(T * 0.22))}px Nunito, sans-serif`;
    const w = ctx.measureText(nome).width + 10;
    const cx = (x + 0.5) * T;
    const cy = (y + 0.98) * T;
    ctx.fillStyle = corDoRobo(cor);
    this.retanguloRedondo(cx - w / 2, cy - T * 0.15, w, T * 0.3, T * 0.15);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nome, cx, cy + 1);
  }

  private desenharEfeito(ef: Efeito, agora: number) {
    const ctx = this.ctx;
    const T = this.tile;
    const t = (agora - ef.t0) / 800;
    const cx = (ef.x + 0.5) * T;
    const cy = (ef.y + 0.5) * T;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    if (ef.tipo === 'brilho') {
      ctx.fillStyle = '#ffc83d';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const d = T * (0.15 + t * 0.45);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, T * 0.05 * (1 - t), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e8a90c';
      ctx.font = `800 ${Math.round(T * 0.32)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ef.texto ?? '', cx, cy - T * (0.3 + t * 0.4));
    } else {
      ctx.font = `${Math.round(T * (0.45 + t * 0.2))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💥', cx, cy);
    }
    ctx.restore();
  }

  private desenharBolha(x: number, y: number, texto: string, tipo: 'fala' | 'duvida') {
    const ctx = this.ctx;
    const T = this.tile;
    const fonte = Math.max(12, Math.min(16, Math.round(T * 0.3)));
    ctx.font = `800 ${fonte}px Nunito, sans-serif`;
    const larguraMax = Math.min(220, this.colunas * T - 12);
    const linhas = this.quebrar(texto, larguraMax - 16);
    const w = Math.max(...linhas.map((l) => ctx.measureText(l).width)) + 18;
    const h = linhas.length * (fonte + 4) + 12;
    const cx = (x + 0.5) * T;
    const acima = y * T - h - 10 > 0;
    let bx = cx - w / 2;
    bx = Math.max(4, Math.min(this.colunas * T - w - 4, bx));
    const by = acima ? y * T - h - 4 : (y + 1) * T + 6;
    ctx.fillStyle = tipo === 'duvida' ? '#fff3c4' : '#ffffff';
    ctx.strokeStyle = '#2d2a4a';
    ctx.lineWidth = 2;
    this.retanguloRedondo(bx, by, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    const pontaY = acima ? by + h : by;
    const dir = acima ? 1 : -1;
    ctx.moveTo(cx - 6, pontaY - dir);
    ctx.lineTo(cx, pontaY + dir * 8);
    ctx.lineTo(cx + 6, pontaY - dir);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 6, pontaY);
    ctx.lineTo(cx, pontaY + dir * 8);
    ctx.lineTo(cx + 6, pontaY);
    ctx.stroke();
    ctx.fillStyle = '#2d2a4a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    linhas.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 7 + i * (fonte + 4)));
  }

  private quebrar(texto: string, largura: number): string[] {
    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let atual = '';
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (this.ctx.measureText(teste).width > largura && atual) {
        linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas.slice(0, 4);
  }

  private retanguloRedondo(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
}
