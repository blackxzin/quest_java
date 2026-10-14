// A Loja do Robô: os clientes chegam com pedidos HTTP e o Byte responde com o seu código Spring Boot.
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { Evento, PedidoDef } from '../api';
import type { Callbacks } from '../game/palco';
import { Byte } from './Byte';

export type ControleLoja = {
  tocar: (eventos: Evento[], velocidade: number, cb: Callbacks) => void;
  pular: () => void;
  parar: () => void;
  velocidade: (v: number) => void;
};

const CLIENTES = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐰', '🐨', '🦁', '🐯'];
type Fase = 'vazia' | 'entrando' | 'pedindo' | 'respondendo' | 'saindo';
type Linha = { def: PedidoDef; evento?: Evento };

function textoEsperado(p: PedidoDef) {
  if (p.esperadoJson !== undefined && p.esperadoJson !== null) return JSON.stringify(p.esperadoJson);
  return p.esperado ?? '';
}

function corpoTexto(p: PedidoDef) {
  return p.corpo === undefined || p.corpo === null ? undefined : JSON.stringify(p.corpo);
}

export function Loja({ pedidos, ref }: { pedidos: PedidoDef[]; ref: Ref<ControleLoja> }) {
  const [linhas, setLinhas] = useState<Linha[]>(() => pedidos.map((def) => ({ def })));
  const [atual, setAtual] = useState<{ evento: Evento; cliente: string; fase: Fase } | null>(null);
  const fila = useRef<{ eventos: Evento[]; i: number; vel: number; cb: Callbacks; timer?: number; pedidos: number }>({
    eventos: [], i: 0, vel: 1, cb: {}, pedidos: 0,
  });

  useEffect(() => {
    setLinhas(pedidos.map((def) => ({ def })));
    setAtual(null);
  }, [pedidos]);

  useEffect(() => () => window.clearTimeout(fila.current.timer), []);

  const espera = (ms: number, f: () => void) => {
    fila.current.timer = window.setTimeout(f, ms / fila.current.vel);
  };

  const proximo = () => {
    const f = fila.current;
    if (f.i >= f.eventos.length) {
      setAtual((a) => (a ? { ...a, fase: 'saindo' } : a));
      f.cb.onFim?.();
      return;
    }
    const e = f.eventos[f.i++];
    if (e.tipo === 'imprimir') {
      f.cb.onImprimir?.(e.texto ?? '');
      espera(120, proximo);
      return;
    }
    if (e.tipo !== 'pedido') {
      proximo();
      return;
    }
    const indice = f.pedidos++;
    const cliente = CLIENTES[indice % CLIENTES.length];
    setAtual({ evento: e, cliente, fase: 'entrando' });
    espera(550, () => {
      setAtual({ evento: e, cliente, fase: 'pedindo' });
      espera(800, () => {
        setAtual({ evento: e, cliente, fase: 'respondendo' });
        setLinhas((ls) => ls.map((l, i) => (i === indice ? { ...l, evento: e } : l)));
        espera(1300, () => {
          setAtual({ evento: e, cliente, fase: 'saindo' });
          espera(450, proximo);
        });
      });
    });
  };

  useImperativeHandle(ref, () => ({
    tocar: (eventos, vel, cb) => {
      window.clearTimeout(fila.current.timer);
      fila.current = { eventos, i: 0, vel, cb, pedidos: 0 };
      setLinhas(pedidos.map((def) => ({ def })));
      setAtual(null);
      espera(200, proximo);
    },
    pular: () => {
      const f = fila.current;
      window.clearTimeout(f.timer);
      let ultimo: Evento | undefined;
      const novas = pedidos.map((def) => ({ def }) as Linha);
      let n = 0;
      f.eventos.forEach((e, i) => {
        if (e.tipo === 'pedido') {
          if (n < novas.length) novas[n].evento = e;
          n++;
          ultimo = e;
        } else if (e.tipo === 'imprimir' && i >= f.i) {
          f.cb.onImprimir?.(e.texto ?? '');
        }
      });
      f.i = f.eventos.length;
      setLinhas(novas);
      if (ultimo) setAtual({ evento: ultimo, cliente: CLIENTES[(n - 1) % CLIENTES.length], fase: 'respondendo' });
      f.cb.onFim?.();
    },
    parar: () => window.clearTimeout(fila.current.timer),
    velocidade: (v) => {
      fila.current.vel = v;
    },
  }));

  const e = atual?.evento;
  const fase = atual?.fase ?? 'vazia';
  const humor = fase === 'respondendo' && e ? (e.ok ? 'festa' : 'triste') : fase === 'pedindo' ? 'pensando' : 'feliz';

  return (
    <div className="loja">
      <div className="loja-cena">
        <div className="loja-prateleira" aria-hidden="true">🔋 🔩 🛢️ ⚙️ 🔧 💡 🧲 🔋</div>
        <div className="loja-placa">LOJA DO BYTE</div>
        <div className="loja-atendente">
          <Byte humor={humor} tamanho={92} />
          {fase === 'respondendo' && e && (
            <div className={`loja-bolha resposta ${e.ok ? 'ok' : 'erro'}`}>
              <span className={`status s${String(e.status ?? 0)[0]}`}>{e.status}</span>
              <span className="texto">{e.resposta || <em>(resposta vazia)</em>}</span>
            </div>
          )}
        </div>
        <div className="loja-balcao" />
        {atual && (
          <div className={`loja-cliente fase-${fase}`}>
            <span className="emoji" aria-hidden="true">{atual.cliente}</span>
            {(fase === 'pedindo' || fase === 'respondendo') && e && (
              <div className="loja-bolha pedido">
                <strong className={`metodo m-${e.metodo}`}>{e.metodo}</strong> {e.caminho}
                {e.corpo && <code className="corpo">{e.corpo}</code>}
              </div>
            )}
            {fase === 'respondendo' && e && <span className="loja-veredito">{e.ok ? '😄' : '😕'}</span>}
          </div>
        )}
        {!atual && <div className="loja-vazia">Os clientes chegam quando você apertar <strong>▶ Rodar</strong>!</div>}
      </div>
      <table className="loja-tabela">
        <thead>
          <tr><th>Pedido do cliente</th><th>Resposta esperada</th><th>Sua resposta</th><th aria-label="Resultado" /></tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className={l.evento ? (l.evento.ok ? 'ok' : 'erro') : ''}>
              <td>
                <strong className={`metodo m-${l.def.metodo}`}>{l.def.metodo}</strong> <code>{l.def.caminho}</code>
                {corpoTexto(l.def) && <code className="corpo">{corpoTexto(l.def)}</code>}
              </td>
              <td>
                {l.def.status && l.def.status !== 200 && <span className={`status s${String(l.def.status)[0]}`}>{l.def.status}</span>}
                <code>{textoEsperado(l.def) || (l.def.status ? '' : '…')}</code>
              </td>
              <td>
                {l.evento ? (
                  <>
                    <span className={`status s${String(l.evento.status ?? 0)[0]}`}>{l.evento.status}</span>
                    <code>{l.evento.resposta}</code>
                  </>
                ) : <span className="muted">?</span>}
              </td>
              <td className="veredito">{l.evento ? (l.evento.ok ? '✅' : '❌') : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
