// A tela de uma missão: história e explicação, o editor, o mapa (ou a loja) e o resultado.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { descreverObjetivo, executar, type Licao, type Modulo, type Resultado } from '../api';
import { Byte, type Humor } from '../components/Byte';
import { Confete } from '../components/Confete';
import { Editor, type MarcaErro } from '../components/Editor';
import { Loja, type ControleLoja } from '../components/Loja';
import { Markdown } from '../components/Markdown';
import { Palco, type ControlePalco } from '../components/Palco';
import { concluir, guardarCodigo, marcarDica, marcarSolucao, progressoDe } from '../progresso';
import { ir } from '../rotas';

type Fase = 'editando' | 'rodando' | 'animando' | 'pronto';
type LinhaTerminal = { texto: string; tipo: 'saida' | 'erro' | 'info' };

const VELOCIDADES = [
  { valor: 0.5, rotulo: '🐢 Devagar' },
  { valor: 1, rotulo: '🚶 Normal' },
  { valor: 2, rotulo: '🐇 Rápido' },
  { valor: 4, rotulo: '🚀 Turbo' },
];

function lerVelocidade() {
  try {
    return Number(localStorage.getItem('javaquest:velocidade')) || 1;
  } catch {
    return 1;
  }
}

export function PaginaLicao({ modulo, licao, proxima, posicao }: {
  modulo: Modulo;
  licao: Licao;
  proxima: Licao | null;
  posicao: { atual: number; total: number };
}) {
  const [codigo, setCodigo] = useState(() => progressoDe(licao.id).codigo ?? licao.codigoInicial);
  const [fase, setFase] = useState<Fase>('editando');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mundoSel, setMundoSel] = useState(0);
  const [linhaAtual, setLinhaAtual] = useState<number | null>(null);
  const [terminal, setTerminal] = useState<LinhaTerminal[]>([]);
  const [velocidade, setVelocidade] = useState(lerVelocidade);
  const [falhas, setFalhas] = useState(0);
  const [verDica, setVerDica] = useState(() => !!progressoDe(licao.id).dica);
  const [festa, setFesta] = useState<number | null>(null);
  const [aba, setAba] = useState<'explicacao' | 'dica'>('explicacao');
  const palco = useRef<ControlePalco>(null);
  const loja = useRef<ControleLoja>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const eLoja = licao.tipo === 'loja';

  useEffect(() => {
    guardarCodigo(licao.id, codigo);
  }, [codigo, licao.id]);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight });
  }, [terminal]);

  const animarMundo = useCallback((res: Resultado, indice: number, aoTerminar?: () => void) => {
    const m = res.mundos[indice];
    if (!m) return;
    setFase('animando');
    setTerminal([]);
    setLinhaAtual(null);
    const cb = {
      onLinha: setLinhaAtual,
      onImprimir: (texto: string) => setTerminal((t) => [...t, { texto, tipo: 'saida' as const }]),
      onFim: () => {
        setFase('pronto');
        if (m.erro) setTerminal((t) => [...t, { texto: m.erro!.mensagem, tipo: 'erro' }]);
        aoTerminar?.();
      },
    };
    if (eLoja) loja.current?.tocar(m.eventos, velocidade, cb);
    else palco.current?.tocar(licao.mundos[indice], m.eventos, velocidade, cb);
  }, [eLoja, licao.mundos, velocidade]);

  const rodar = useCallback(async () => {
    if (fase === 'rodando') return;
    palco.current?.parar();
    loja.current?.parar();
    setFase('rodando');
    setResultado(null);
    setLinhaAtual(null);
    setTerminal([{ texto: 'Compilando o seu código... ⚙️', tipo: 'info' }]);
    const res = await executar(licao.id, codigo);
    setResultado(res);
    if (res.mundos.length === 0) {
      setFase('pronto');
      setTerminal(res.erros.length
        ? res.erros.map((e) => ({ texto: `Linha ${e.linha}: ${e.mensagem}`, tipo: 'erro' as const }))
        : [{ texto: res.mensagem, tipo: 'erro' }]);
      setFalhas((f) => f + 1);
      return;
    }
    const primeiroRuim = res.mundos.findIndex((m) => !m.sucesso);
    const indice = primeiroRuim >= 0 ? primeiroRuim : Math.min(mundoSel, res.mundos.length - 1);
    setMundoSel(indice);
    animarMundo(res, indice, () => {
      if (res.status === 'sucesso') {
        setFesta(licao.livre ? null : concluir(licao.id));
      } else {
        setFalhas((f) => f + 1);
      }
    });
  }, [animarMundo, codigo, fase, licao.id, licao.livre, mundoSel]);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        rodar();
      }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, [rodar]);

  const escolherMundo = (i: number) => {
    setMundoSel(i);
    if (resultado && resultado.mundos[i]) animarMundo(resultado, i);
    else palco.current?.parar();
  };

  const mudarVelocidade = (v: number) => {
    setVelocidade(v);
    palco.current?.velocidade(v);
    loja.current?.velocidade(v);
    try {
      localStorage.setItem('javaquest:velocidade', String(v));
    } catch {
      // ignorado
    }
  };

  const recomecar = () => {
    if (codigo !== licao.codigoInicial && !confirm('Apagar o seu código e começar de novo?')) return;
    setCodigo(licao.codigoInicial);
    setResultado(null);
    setTerminal([]);
    setFase('editando');
  };

  const mostrarDica = () => {
    marcarDica(licao.id);
    setVerDica(true);
    setAba('dica');
  };

  const mostrarSolucao = () => {
    if (!confirm('Tem certeza? Tentar sozinho é o melhor jeito de aprender! Vendo a solução, esta missão vale só 1 estrela.')) return;
    marcarSolucao(licao.id);
    setCodigo(licao.solucao);
    setResultado(null);
  };

  // O que mostrar no editor: erros de compilação ou a linha do erro na execução.
  const erros: MarcaErro[] = useMemo(() => resultado?.erros ?? [], [resultado]);
  const mundoRes = fase === 'pronto' ? resultado?.mundos[mundoSel] : undefined;
  const erroLinha = fase === 'pronto' ? (mundoRes?.erro?.linha ?? resultado?.erros[0]?.linha ?? null) : null;
  const mundo = licao.mundos[mundoSel] ?? licao.mundos[0];
  const objetivos = mundo?.objetivos ?? [];

  const balao = useMemo((): { humor: Humor; texto: string; tipo: string } => {
    if (fase === 'rodando') return { humor: 'pensando', texto: 'Hmm, deixa eu ler o seu código...', tipo: 'info' };
    if (fase === 'animando') return { humor: 'feliz', texto: eLoja ? 'Atendendo os clientes!' : 'Lá vou eu! 🚀', tipo: 'info' };
    if (!resultado) {
      return {
        humor: 'feliz',
        texto: licao.livre ? 'Invente o que quiser e aperte ▶ Rodar!' : 'Escreva o código e aperte ▶ Rodar para eu fazer!',
        tipo: 'info',
      };
    }
    switch (resultado.status) {
      case 'sucesso': return { humor: 'festa', texto: licao.livre ? 'Que legal! Funcionou! 🎉' : 'Missão cumprida! Você é demais! 🎉', tipo: 'sucesso' };
      case 'quase': return { humor: 'pensando', texto: resultado.mensagem, tipo: 'quase' };
      default: return { humor: 'triste', texto: resultado.mensagem, tipo: 'erro' };
    }
  }, [eLoja, fase, licao.livre, resultado]);

  const ocupado = fase === 'rodando';

  return (
    <div className="licao">
      <header className="licao-topo" style={{ ['--cor-modulo' as string]: modulo.cor }}>
        <button className="botao fantasma" onClick={() => ir('mapa')} aria-label="Voltar para o mapa">← Mapa</button>
        <div className="licao-titulo">
          <span className="licao-emoji" aria-hidden="true">{modulo.emoji}</span>
          <div>
            <small>{licao.livre ? 'Sem regras, só diversão' : `${modulo.titulo} · Missão ${posicao.atual} de ${posicao.total}`}</small>
            <h1>{licao.titulo} {licao.desafio && <span className="selo-desafio">Desafio</span>}</h1>
          </div>
        </div>
        <button className="botao fantasma" onClick={() => ir('dicionario')}>📖 Dicionário</button>
      </header>

      <div className="licao-grade">
        <aside className="cartao missao">
          <div className="historia">
            <Byte humor="feliz" tamanho={56} />
            <div className="historia-texto"><Markdown texto={licao.historia} /></div>
          </div>

          {objetivos.length > 0 && (
            <section className="objetivos">
              <h2>🎯 Objetivos</h2>
              <ul>
                {objetivos.map((o, i) => {
                  const ok = mundoRes?.objetivos[i]?.ok;
                  return (
                    <li key={i} className={ok === true ? 'ok' : ok === false ? 'nao' : ''}>
                      <span className="marca" aria-hidden="true">{ok === true ? '✔' : ok === false ? '✘' : '○'}</span>
                      {descreverObjetivo(o)}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {eLoja && (
            <section className="objetivos">
              <h2>🎯 Objetivo</h2>
              <p>Responda todos os pedidos dos clientes do jeito certo (veja a tabela da loja).</p>
            </section>
          )}

          <div className="abas" role="tablist">
            <button role="tab" aria-selected={aba === 'explicacao'} onClick={() => setAba('explicacao')}>📘 Aprenda</button>
            <button role="tab" aria-selected={aba === 'dica'} onClick={() => (verDica ? setAba('dica') : mostrarDica())}>💡 Dica</button>
          </div>
          <div className="aba-conteudo">
            {aba === 'explicacao' ? <Markdown texto={licao.explicacao} /> : (
              <div className="dica">
                <Markdown texto={licao.dica} />
                {!licao.livre && (falhas >= 2 || progressoDe(licao.id).concluida) && (
                  <button className="botao pequeno contorno" onClick={mostrarSolucao}>👀 Ver a solução</button>
                )}
                {!licao.livre && falhas < 2 && !progressoDe(licao.id).concluida && (
                  <p className="muted">A solução aparece aqui depois de algumas tentativas. Você consegue! 💪</p>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="cartao area-editor">
          <div className="barra">
            <button className="botao rodar" onClick={rodar} disabled={ocupado} title="Rodar (Ctrl + Enter)">
              {ocupado ? '⚙️ Pensando...' : '▶ Rodar'}
            </button>
            <label className="velocidade">
              <span className="visualmente-escondido">Velocidade</span>
              <select value={velocidade} onChange={(e) => mudarVelocidade(Number(e.target.value))}>
                {VELOCIDADES.map((v) => <option key={v.valor} value={v.valor}>{v.rotulo}</option>)}
              </select>
            </label>
            <span className="espaco" />
            <button className="botao fantasma pequeno" onClick={recomecar}>↺ Recomeçar</button>
          </div>
          <Editor valor={codigo} onChange={setCodigo} linhaAtual={fase === 'animando' ? linhaAtual : null}
            erroLinha={erroLinha} erros={erros} />
          <div className={`byte-diz ${balao.tipo}`} role="status" aria-live="polite">
            <Byte humor={balao.humor} tamanho={52} />
            <div className="byte-diz-texto">
              <p>{balao.texto}</p>
              {resultado?.status === 'erroCompilacao' && resultado.erros.length > 1 && (
                <details>
                  <summary>Ver todos os {resultado.erros.length} problemas</summary>
                  <ul>{resultado.erros.map((e, i) => <li key={i}><strong>Linha {e.linha}:</strong> {e.mensagem}</li>)}</ul>
                </details>
              )}
              {resultado?.status === 'erroCompilacao' && resultado.erros[0] && (
                <details>
                  <summary>Mensagem original do Java (em inglês)</summary>
                  <pre className="original">{resultado.erros[0].original}</pre>
                </details>
              )}
              {fase === 'pronto' && resultado?.status === 'sucesso' && proxima && festa === null && (
                <button className="botao pequeno" onClick={() => ir(`licao/${proxima.id}`)}>Próxima missão →</button>
              )}
            </div>
          </div>
        </section>

        <section className="cartao area-palco">
          <div className="barra">
            {licao.mundos.length > 1 ? (
              <div className="mundos" role="tablist" aria-label="Mundos">
                {licao.mundos.map((_, i) => {
                  const r = fase === 'pronto' || i !== mundoSel ? resultado?.mundos[i] : undefined;
                  return (
                    <button key={i} role="tab" aria-selected={i === mundoSel} onClick={() => escolherMundo(i)}
                      className={r ? (r.sucesso ? 'ok' : 'nao') : ''} disabled={ocupado}>
                      Mundo {i + 1} {r ? (r.sucesso ? '✔' : '✘') : ''}
                    </button>
                  );
                })}
              </div>
            ) : <h2 className="barra-titulo">{eLoja ? '🏪 Loja do Byte' : '🗺️ Mapa'}</h2>}
            <span className="espaco" />
            {fase === 'animando' && (
              <button className="botao fantasma pequeno" onClick={() => (eLoja ? loja.current?.pular() : palco.current?.pular())}>
                ⏭ Pular
              </button>
            )}
          </div>
          {eLoja ? <Loja ref={loja} pedidos={licao.pedidos} /> : <Palco ref={palco} mundo={mundo} />}
          {licao.mundos.length > 1 && !resultado && (
            <p className="nota">Seu código vai ser testado em <strong>{licao.mundos.length} mundos</strong>. Clique nas abas para ver cada um!</p>
          )}
          <div className="terminal" ref={terminalRef} aria-label="Terminal">
            <div className="terminal-titulo">Terminal</div>
            {terminal.length === 0 && <div className="terminal-vazio">O que o seu programa escrever com System.out.println aparece aqui.</div>}
            {terminal.map((l, i) => <div key={i} className={`terminal-linha ${l.tipo}`}>{l.tipo === 'saida' ? '> ' : ''}{l.texto}</div>)}
          </div>
        </section>
      </div>

      {festa !== null && (
        <>
          <Confete />
          <div className="festa-fundo" onClick={() => setFesta(null)}>
            <div className="festa" role="dialog" aria-modal="true" aria-label="Missão cumprida" onClick={(e) => e.stopPropagation()}>
              <Byte humor="festa" tamanho={110} acenando />
              <h2>Missão cumprida!</h2>
              <div className="estrelas-grandes" aria-label={`${festa} de 3 estrelas`}>
                {[1, 2, 3].map((n) => <span key={n} className={n <= festa ? 'acesa' : ''} style={{ animationDelay: `${n * 0.18}s` }}>★</span>)}
              </div>
              <p>
                {festa === 3 ? 'Perfeito! Sem nenhuma ajuda!' : festa === 2 ? 'Muito bem! Na próxima, tente sem a dica.' : 'Você conseguiu! Que tal refazer sozinho depois?'}
              </p>
              <div className="festa-botoes">
                <button className="botao fantasma" onClick={() => setFesta(null)}>Ficar aqui</button>
                {proxima
                  ? <button className="botao" onClick={() => ir(`licao/${proxima.id}`)}>Próxima missão →</button>
                  : <button className="botao" onClick={() => ir('mapa')}>Voltar ao mapa 🏆</button>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
