// O mapa da aventura: todos os módulos e missões, com estrelas e cadeados.
import { useState } from 'react';
import type { Licao, Modulo } from '../api';
import { liberarTudo, progressoDe, totalEstrelas, tudoLiberado } from '../progresso';
import { ir } from '../rotas';

export function licoesEmOrdem(modulos: Modulo[]): Licao[] {
  return modulos.filter((m) => !m.oculto).flatMap((m) => m.licoes);
}

export function liberada(modulos: Modulo[], id: string) {
  if (tudoLiberado()) return true;
  const trilha = trilhaDe(id);
  const todas = licoesEmOrdem(modulos).filter(l => trilhaDe(l.id) === trilha);
  const i = todas.findIndex((l) => l.id === id);
  return i >= 0 && (i === 0 || progressoDe(todas[i - 1].id).concluida || progressoDe(id).concluida);
}

export function proximaPendente(modulos: Modulo[]): Licao | undefined {
  return licoesEmOrdem(modulos).find((l) => !progressoDe(l.id).concluida);
}

export function trilhaDe(id: string): 'java' | 'git' | 'docker' {
  return id.startsWith('git-') ? 'git' : id.startsWith('docker-') ? 'docker' : 'java';
}

export function PaginaMapa({ modulos }: { modulos: Modulo[] }) {
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const visiveis = modulos.filter((m) => !m.oculto);
  const todas = licoesEmOrdem(modulos);
  const feitas = todas.filter((l) => progressoDe(l.id).concluida).length;
  const proxima = todas.find(l => !progressoDe(l.id).concluida && (filtro === 'todas' || trilhaDe(l.id) === filtro));
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const exibidos = visiveis.filter(m => filtro === 'todas' || trilhaDe(m.licoes[0].id) === filtro).map(m => ({ ...m, licoes: m.licoes.filter(l => normalizar(m.titulo + ' ' + l.titulo + ' ' + l.explicacao).includes(normalizar(busca.trim()))) })).filter(m => m.licoes.length);

  return (
    <div className="mapa">
      <header className="mapa-topo">
        <button className="botao fantasma" onClick={() => ir('')}>← Início</button>
        <div className="mapa-resumo">
          <span>🏁 <strong>{feitas}</strong> de {todas.length} missões</span>
          <span>⭐ <strong>{totalEstrelas()}</strong> de {todas.length * 3}</span>
        </div>
        <button className="botao fantasma" onClick={() => ir('dicionario')}>📖 Dicionário</button>
      </header>

      <h1 className="mapa-titulo">Mapa da Aventura</h1>
      <p className="mapa-sub">Java, Spring Boot, Git e Docker. Escolha sua trilha e aprenda fazendo!</p>

      <section className="painel-jornada" aria-label="Seu progresso">
        <div><span className="muted">Sua jornada</span><h2>{feitas === 0 ? 'Todo mestre começa com um passo' : feitas === todas.length ? 'Explorador completo! 🏆' : `${feitas} missões conquistadas!`}</h2><p>Trilhas independentes. Suas estrelas e seu código ficam salvos neste navegador.</p><progress aria-label="Progresso total" value={feitas} max={todas.length} /></div>
        {proxima && <button className="botao" onClick={() => ir(`licao/${proxima.id}`)}>▶ {feitas ? 'Continuar' : 'Começar'}: {proxima.titulo}</button>}
      </section>
      <div className="filtros-trilhas" role="group" aria-label="Filtrar trilha">
        {(['todas', 'java', 'git', 'docker'] as const).map(t => <button className={`botao ${filtro === t ? '' : 'contorno'}`} key={t} aria-pressed={filtro === t} onClick={() => setFiltro(t)}>{({ todas: '🗺️ Todas', java: '☕ Java e Spring', git: '🌱 Git', docker: '🐳 Docker' })[t]}</button>)}
      </div>
      <input className="busca busca-missoes" type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Encontre um assunto: listas, branches, volumes…" aria-label="Buscar missões" />
      <div className="conquistas" aria-label="Conquistas por trilha">{(['java', 'git', 'docker'] as const).map(t => {
        const lista = todas.filter(l => trilhaDe(l.id) === t); const feitasTrilha = lista.filter(l => progressoDe(l.id).concluida).length;
        return <span key={t} className={feitasTrilha === lista.length ? 'conquista completa' : 'conquista'}>{feitasTrilha === lista.length ? '🏅' : '🧭'} {({ java: 'Explorador Java', git: 'Guardião do histórico', docker: 'Capitão dos contêineres' })[t]} · {feitasTrilha}/{lista.length}</span>;
      })}</div>
      {!exibidos.length && <p className="mapa-sub" role="status">Nenhuma missão encontrada. Tente outro assunto ou outra trilha.</p>}
      <ol className="trilha">
        {exibidos.map((m) => {
          const original = modulos.find(item => item.id === m.id)!;
          const prontas = original.licoes.filter((l) => progressoDe(l.id).concluida).length;
          return (
            <li key={m.id} className="ilha" style={{ ['--cor-modulo' as string]: m.cor }}>
              <div className="ilha-cabeca">
                <span className="ilha-emoji" aria-hidden="true">{m.emoji}</span>
                <div>
                  <small>{trilhaDe(m.licoes[0].id).toUpperCase()} · Módulo {visiveis.findIndex(original => original.id === m.id) + 1}</small>
                  <h2>{m.titulo}</h2>
                  <p>{m.descricao}</p>
                </div>
                <div className="ilha-progresso" aria-label={`${prontas} de ${original.licoes.length} missões feitas`}>
                  <div className="barra-progresso"><span style={{ width: `${(prontas / original.licoes.length) * 100}%` }} /></div>
                  <small>{prontas}/{original.licoes.length}</small>
                </div>
              </div>
              <div className="fases">
                {m.licoes.map((l) => {
                  const p = progressoDe(l.id);
                  const aberta = liberada(modulos, l.id);
                  const atual = proxima?.id === l.id;
                  return (
                    <button
                      key={l.id}
                      className={`fase ${p.concluida ? 'feita' : ''} ${atual ? 'atual' : ''} ${aberta ? '' : 'trancada'}`}
                      disabled={!aberta}
                      onClick={() => ir(`licao/${l.id}`)}
                      title={aberta ? l.titulo : 'Termine a missão anterior para abrir esta'}
                    >
                      <span className="fase-bola">{aberta ? (l.desafio ? '⭐' : original.licoes.findIndex(item => item.id === l.id) + 1) : '🔒'}</span>
                      <span className="fase-nome">{l.titulo}</span>
                      <span className="fase-estrelas" aria-label={`${p.estrelas} estrelas`}>
                        {[1, 2, 3].map((n) => <span key={n} className={n <= p.estrelas ? 'acesa' : ''}>★</span>)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mapa-rodape">
        <button className="botao contorno" onClick={() => ir('livre')}>🎨 Modo livre</button>
        <label className="liberar">
          <input type="checkbox" checked={tudoLiberado()} onChange={(e) => liberarTudo(e.target.checked)} />
          Liberar todas as missões (para professores e famílias)
        </label>
      </div>
    </div>
  );
}
