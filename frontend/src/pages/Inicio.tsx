// A tela inicial do JavaQuest.
import type { Modulo } from '../api';
import { Byte } from '../components/Byte';
import { CodigoColorido } from '../components/CodigoColorido';
import { progressoDe } from '../progresso';
import { ir } from '../rotas';
import { proximaPendente } from './Mapa';

const EXEMPLO = `for (int i = 0; i < 3; i++) {
    robo.andar();
    if (robo.temMoeda()) {
        robo.pegarMoeda();
    }
}
robo.falar("Consegui!");`;

export function PaginaInicio({ modulos }: { modulos: Modulo[] | null }) {
  const proxima = modulos ? proximaPendente(modulos) : undefined;
  const comecou = proxima ? progressoDe(proxima.id).codigo !== undefined || modulos!.some((m) => m.licoes.some((l) => progressoDe(l.id).concluida)) : false;
  const visiveis = modulos?.filter((m) => !m.oculto) ?? [];

  return (
    <div className="inicio">
      <section className="heroi">
        <div className="heroi-texto">
          <span className="marca">☕ JavaQuest</span>
          <h1>Aprenda <span className="destaque">Java</span> programando um robô!</h1>
          <p>
            Dê ordens para o <strong>Byte</strong>, pegue moedas, fuja de labirintos e
            monte uma loja com <strong>Spring Boot</strong>. Aprenda também <strong>Git e Docker</strong>
            em laboratórios interativos, com desafios, dicas e conquistas. Java de verdade e ferramentas explicadas passo a passo.
          </p>
          <div className="heroi-botoes">
            <button className="botao grande" onClick={() => (proxima ? ir(`licao/${proxima.id}`) : ir('mapa'))}>
              {comecou ? 'Continuar aventura ▶' : 'Começar aventura ▶'}
            </button>
            <button className="botao grande contorno" onClick={() => ir('mapa')}>🗺️ Ver o mapa</button>
          </div>
        </div>
        <div className="heroi-arte">
          <div className="heroi-byte"><Byte humor="festa" tamanho={170} acenando /></div>
          <div className="heroi-codigo"><CodigoColorido codigo={EXEMPLO} /></div>
        </div>
      </section>

      <section className="como-funciona">
        <h2>Como funciona?</h2>
        <div className="passos">
          <div className="passo"><span>📜</span><h3>1. Leia a missão</h3><p>Cada missão conta uma historinha e ensina uma coisa nova, com exemplos.</p></div>
          <div className="passo"><span>⌨️</span><h3>2. Escreva o código</h3><p>Você escreve Java de verdade. Se errar, o Byte explica o que aconteceu.</p></div>
          <div className="passo"><span>🤖</span><h3>3. Veja o Byte fazer!</h3><p>Aperte ▶ Rodar e veja o robô seguir suas ordens, linha por linha.</p></div>
        </div>
      </section>

      {visiveis.length > 0 && (
        <section className="jornada">
          <h2>Três trilhas, uma grande aventura</h2><p>Java e Spring, Git ou Docker: você escolhe por onde começar. {visiveis.reduce((n, m) => n + m.licoes.length, 0)} missões para explorar.</p>
          <ol>
            {visiveis.map((m) => (
              <li key={m.id} style={{ ['--cor-modulo' as string]: m.cor }}>
                <span aria-hidden="true">{m.emoji}</span>
                <strong>{m.titulo}</strong>
                <small>{m.licoes.length} missões</small>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="rodape">
        <button className="link" onClick={() => ir('livre')}>🎨 Modo livre</button>
        <button className="link" onClick={() => ir('dicionario')}>📖 Dicionário do Byte</button>
        <span>Feito com Java, Spring Boot e React.</span>
      </footer>
    </div>
  );
}
