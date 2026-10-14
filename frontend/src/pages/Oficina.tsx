import { useEffect, useRef, useState } from 'react';
import type { Licao, Modulo } from '../api';
import { Byte } from '../components/Byte';
import { Confete } from '../components/Confete';
import { Markdown } from '../components/Markdown';
import { oficinaPorId, prepararOficina } from '../laboratorio/catalogo';
import { executarComando, type Estado } from '../laboratorio/motor';
import { concluir, guardarCodigo, marcarDica, marcarSolucao, progressoDe } from '../progresso';
import { ir } from '../rotas';

type Linha = { comando: string; saida: string; ok: boolean };
export function PaginaOficina({ licao, modulo, proxima }: { licao: Licao; modulo: Modulo; proxima: Licao | null }) {
  const oficina = oficinaPorId.get(licao.id)!;
  const [estado, setEstado] = useState<Estado>(() => prepararOficina(oficina));
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [comando, setComando] = useState(() => progressoDe(licao.id).codigo ?? '');
  const [dica, setDica] = useState(false);
  const [solucao, setSolucao] = useState(false);
  const [resposta, setResposta] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [estrelas, setEstrelas] = useState<number | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  const metas = oficina.metas.map(m => m.verificar(estado));
  const pronto = metas.every(Boolean);
  useEffect(() => { guardarCodigo(licao.id, comando); }, [comando, licao.id]);
  useEffect(() => {
    const terminal = fim.current?.parentElement;
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
  }, [linhas]);
  const executar = () => {
    if (!comando.trim()) return;
    const r = executarComando(estado, comando);
    setEstado(r.estado);
    setLinhas(l => [...l.slice(-99), { comando, saida: r.saida, ok: r.ok }]);
    setComando(''); setFeedback(''); entrada.current?.focus();
  };
  const finalizar = () => {
    if (!pronto) { setFeedback('Complete os objetivos do laboratório antes de concluir.'); return; }
    if (resposta === null) { setFeedback('Escolha uma resposta para revisar o que aprendeu.'); return; }
    if (resposta !== oficina.resposta) { setFeedback('Ainda não. Releia a explicação e experimente outra resposta. Errar faz parte!'); return; }
    setEstrelas(concluir(licao.id)); setFeedback(oficina.revisao);
  };
  const reiniciar = () => {
    if (linhas.length && !confirm('Reiniciar este cenário? O histórico de comandos desta tentativa será limpo. Suas conquistas continuam salvas.')) return;
    setEstado(prepararOficina(oficina)); setLinhas([]); setResposta(null); setEstrelas(null); setFeedback(''); setComando(''); entrada.current?.focus();
  };
  return <div className="oficina">
    <header className="licao-topo" style={{ ['--cor-modulo' as string]: modulo.cor }}>
      <button className="botao fantasma" onClick={() => ir('mapa')}>← Mapa</button>
      <div className="licao-titulo"><span className="licao-emoji">{modulo.emoji}</span><div><small>{modulo.titulo} · Missão {modulo.licoes.indexOf(licao) + 1} de {modulo.licoes.length}</small><h1>{licao.titulo} {licao.desafio && <span className="selo-desafio">Desafio</span>}</h1></div></div>
      <button className="botao fantasma" onClick={() => ir('dicionario')}>📖 Dicionário</button>
    </header>
    <p className="oficina-aviso">🧪 Laboratório simulado · pratique sem instalar nada. Comandos não alteram seu computador. Ao sair, o cenário reinicia; suas estrelas ficam salvas.</p>
    <div className="oficina-grade">
      <aside className="cartao oficina-aprenda">
        <div className="historia"><Byte humor="feliz" tamanho={56} /><Markdown texto={licao.historia} /></div>
        <h2>📘 Aprenda e experimente</h2><Markdown texto={licao.explicacao} />
        <button className="botao contorno pequeno" aria-expanded={dica} onClick={() => { setDica(!dica); marcarDica(licao.id); }}>💡 {dica ? 'Fechar dica' : 'Preciso de uma dica'}</button>
        {dica && <div className="dica"><Markdown texto={licao.dica} /><p className="muted">Com dica, a tentativa vale até 2 estrelas. Aprender com ajuda também vale!</p>
          <button className="botao fantasma pequeno" onClick={() => { marcarSolucao(licao.id); setSolucao(true); }}>Ver roteiro resolvido (1 estrela)</button>
          {solucao && <pre className="oficina-codigo">{licao.solucao}</pre>}
        </div>}
        <p className="oficina-fonte"><a href={oficina.fonte} target="_blank" rel="noreferrer">Consultar documentação oficial ↗</a></p>
      </aside>
      <main className="oficina-pratica">
        <section className="cartao oficina-objetivos"><h2>🎯 Sua missão</h2><ul>{oficina.metas.map((m, i) => <li key={m.texto} className={metas[i] ? 'meta-pronta' : ''}>{metas[i] ? '✓' : '○'} {m.texto}</li>)}</ul><progress aria-label="Objetivos concluídos" max={metas.length} value={metas.filter(Boolean).length} /></section>
        <section className="cartao oficina-console"><div className="barra"><h2 className="barra-titulo">⌨️ Terminal do Byte</h2><span className="espaco" /><button className="botao fantasma pequeno" onClick={reiniciar}>↺ Reiniciar cenário</button></div>
          <div className="oficina-saida" role="log" aria-label="Histórico do terminal" aria-live="polite" tabIndex={0}>
            <p>Ambiente pronto! Digite help para ver os comandos disponíveis.</p>
            {oficina.preparar.length > 0 && <p>O cenário já inclui os recursos descritos na missão. Consulte o painel abaixo.</p>}
            {linhas.map((l, i) => <div key={i}><div className="comando-eco">$ {l.comando}</div><pre className={l.ok ? '' : 'comando-erro'}>{l.saida}</pre></div>)}<div ref={fim} />
          </div>
          <form className="oficina-entrada" onSubmit={e => { e.preventDefault(); executar(); }}><label htmlFor="comando"><span aria-hidden="true">$</span><span className="visualmente-escondido">Comando do terminal</span></label><input id="comando" ref={entrada} value={comando} maxLength={2000} onChange={e => setComando(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Digite um comando e aperte Enter" /><button className="botao pequeno" disabled={!comando.trim()}>Executar</button></form>
        </section>
        <section className="cartao oficina-estado"><h2>🔎 Por dentro do laboratório</h2>
          {licao.id.startsWith('git-') ? <div className="estado-grade">
            <div><h3>🌿 Branch atual</h3><strong>{estado.repo ? estado.branch : 'Sem repositório'}</strong><p>{Object.keys(estado.branches).join(' · ')}</p></div>
            <div><h3>🎒 Preparação</h3><p>{Object.keys(estado.stage).join(', ') || 'Vazia'}</p></div>
            <div><h3>📸 Commits criados</h3><strong>{estado.commits.length}</strong><p>{estado.commits.at(-1)?.mensagem ?? 'Seu histórico começa aqui'}</p></div>
            <div><h3>🏷️ Tags e remoto</h3><p>{Object.keys(estado.tags).join(', ') || 'Sem tags'}</p><p>{estado.remoto || 'Somente local'}</p></div>
          </div> : <div className="estado-grade">
            <div><h3>📦 Imagens</h3><p>{estado.imagens.join(', ') || 'Nenhuma ainda'}</p></div>
            <div><h3>🐳 Contêineres</h3>{Object.entries(estado.containers).map(([n,c]) => <p key={n}><strong>{n}</strong>: {c.ativo ? '🟢 ativo' : '⏸ parado'}<br />{c.porta && `Portas: ${c.porta}`}{c.volume && <><br />Volume: {c.volume}</>}</p>)}{!Object.keys(estado.containers).length && <p>Nenhum ainda</p>}</div>
            <div><h3>🧰 Volumes</h3><p>{estado.volumes.join(', ') || 'Nenhum ainda'}</p></div>
          </div>}
        </section>
        <section className="cartao oficina-revisao"><h2>🧠 Antes de decolar</h2><fieldset disabled={estrelas !== null}><legend>{oficina.pergunta}</legend>{oficina.alternativas.map((a,i) => <label key={a} className={resposta === i ? 'selecionada' : ''}><input type="radio" name="revisao" value={i} checked={resposta === i} onChange={() => { setResposta(i); setFeedback(''); }} />{a}</label>)}</fieldset>
          {estrelas === null ? <button className="botao" onClick={finalizar}>{pronto ? 'Concluir missão ✓' : 'Verificar missão'}</button> : <div className="oficina-vitoria"><Confete /><h3>Missão cumprida! {'⭐'.repeat(estrelas)}</h3><p>Você praticou, investigou e explicou o que aprendeu.</p><button className="botao" onClick={() => ir(proxima ? `licao/${proxima.id}` : 'mapa')}>{proxima ? 'Próxima missão →' : 'Ver minhas conquistas 🏆'}</button></div>}
          <p role="status" className="oficina-feedback">{feedback}</p>
        </section>
      </main>
    </div>
  </div>;
}
