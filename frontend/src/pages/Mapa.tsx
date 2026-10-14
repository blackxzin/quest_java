// O mapa da aventura: todos os módulos e missões, com estrelas e cadeados.
import type { Licao, Modulo } from '../api';
import { liberarTudo, progressoDe, totalEstrelas, tudoLiberado } from '../progresso';
import { ir } from '../rotas';

export function licoesEmOrdem(modulos: Modulo[]): Licao[] {
  return modulos.filter((m) => !m.oculto).flatMap((m) => m.licoes);
}

export function liberada(modulos: Modulo[], id: string) {
  if (tudoLiberado()) return true;
  const todas = licoesEmOrdem(modulos);
  const i = todas.findIndex((l) => l.id === id);
  return i <= 0 || progressoDe(todas[i - 1].id).concluida || progressoDe(id).concluida;
}

export function proximaPendente(modulos: Modulo[]): Licao | undefined {
  return licoesEmOrdem(modulos).find((l) => !progressoDe(l.id).concluida);
}

export function PaginaMapa({ modulos }: { modulos: Modulo[] }) {
  const visiveis = modulos.filter((m) => !m.oculto);
  const todas = licoesEmOrdem(modulos);
  const feitas = todas.filter((l) => progressoDe(l.id).concluida).length;
  const proxima = proximaPendente(modulos);

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
      <p className="mapa-sub">Do primeiro <code>robo.andar();</code> até o Spring Boot. Uma missão de cada vez!</p>

      <ol className="trilha">
        {visiveis.map((m, mi) => {
          const prontas = m.licoes.filter((l) => progressoDe(l.id).concluida).length;
          return (
            <li key={m.id} className="ilha" style={{ ['--cor-modulo' as string]: m.cor }}>
              <div className="ilha-cabeca">
                <span className="ilha-emoji" aria-hidden="true">{m.emoji}</span>
                <div>
                  <small>Módulo {mi + 1}</small>
                  <h2>{m.titulo}</h2>
                  <p>{m.descricao}</p>
                </div>
                <div className="ilha-progresso" aria-label={`${prontas} de ${m.licoes.length} missões feitas`}>
                  <div className="barra-progresso"><span style={{ width: `${(prontas / m.licoes.length) * 100}%` }} /></div>
                  <small>{prontas}/{m.licoes.length}</small>
                </div>
              </div>
              <div className="fases">
                {m.licoes.map((l, li) => {
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
                      <span className="fase-bola">{aberta ? (l.desafio ? '⭐' : li + 1) : '🔒'}</span>
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
