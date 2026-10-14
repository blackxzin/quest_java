// O Dicionário do Byte: as palavras da programação explicadas com exemplos.
import { useState } from 'react';
import { CodigoColorido } from '../components/CodigoColorido';
import { ir } from '../rotas';

type Termo = { palavra: string; emoji: string; grupo: string; explica: string; exemplo?: string };

const TERMOS: Termo[] = [
  { grupo: 'Começo', emoji: '📜', palavra: 'Programa', explica: 'Uma lista de ordens que o computador segue, uma de cada vez, de cima para baixo.' },
  { grupo: 'Começo', emoji: '⏹️', palavra: 'Ponto e vírgula ;', explica: 'É o ponto final de cada ordem no Java. Esqueceu? O Java reclama!', exemplo: 'robo.andar();' },
  { grupo: 'Começo', emoji: '💬', palavra: 'String', explica: 'Um texto. Fica sempre entre aspas duplas.', exemplo: 'String nome = "Byte";' },
  { grupo: 'Começo', emoji: '🖨️', palavra: 'System.out.println', explica: 'Escreve uma linha no terminal. É o jeito mais usado de mostrar algo na tela.', exemplo: 'System.out.println("Oi!");' },
  { grupo: 'Começo', emoji: '💭', palavra: 'Comentário', explica: 'Um recado para pessoas. O Java ignora tudo depois de //.', exemplo: '// isto é só um recado\nrobo.andar();' },
  { grupo: 'Memória', emoji: '📦', palavra: 'Variável', explica: 'Uma caixinha com nome que guarda um valor. O valor pode mudar!', exemplo: 'int moedas = 0;\nmoedas = moedas + 1;' },
  { grupo: 'Memória', emoji: '🔢', palavra: 'int', explica: 'Tipo de caixinha para números inteiros (sem vírgula).', exemplo: 'int idade = 7;' },
  { grupo: 'Memória', emoji: '🔀', palavra: 'boolean', explica: 'Tipo que só pode ser true (verdadeiro) ou false (falso). As perguntas do robô respondem boolean.', exemplo: 'boolean livre = robo.frenteLivre();' },
  { grupo: 'Memória', emoji: '🗄️', palavra: 'Array', explica: 'Uma prateleira com gavetas numeradas a partir do 0. Tem tamanho fixo.', exemplo: 'int[] passos = {4, 3, 2};\nrobo.falar(passos[0]); // 4' },
  { grupo: 'Memória', emoji: '🎒', palavra: 'ArrayList', explica: 'Uma lista que cresce: dá para ir colocando coisas com add.', exemplo: 'ArrayList<String> amigos = new ArrayList<>();\namigos.add("Ana");' },
  { grupo: 'Memória', emoji: '📖', palavra: 'Map', explica: 'Um dicionário: liga uma chave a um valor.', exemplo: 'Map<String, Integer> estoque = new HashMap<>();\nestoque.put("bateria", 5);' },
  { grupo: 'Controle', emoji: '🔁', palavra: 'for', explica: 'Repete as ordens um número certo de vezes.', exemplo: 'for (int i = 0; i < 3; i++) {\n    robo.andar();\n}' },
  { grupo: 'Controle', emoji: '⏳', palavra: 'while', explica: 'Repete enquanto a pergunta for verdadeira.', exemplo: 'while (!robo.chegou()) {\n    robo.andar();\n}' },
  { grupo: 'Controle', emoji: '♾️', palavra: 'Loop infinito', explica: 'Um while que nunca termina, porque a pergunta nunca muda. O JavaQuest para o programa depois de um tempo.' },
  { grupo: 'Controle', emoji: '🤔', palavra: 'if / else', explica: 'Toma decisões: SE a pergunta for verdade, faz uma coisa; SENÃO, faz outra.', exemplo: 'if (robo.temMoeda()) {\n    robo.pegarMoeda();\n} else {\n    robo.andar();\n}' },
  { grupo: 'Controle', emoji: '⚖️', palavra: 'Comparações', explica: '== igual, != diferente, > maior, < menor, >= maior ou igual, <= menor ou igual. && é "e", || é "ou", ! é "não".' },
  { grupo: 'Métodos', emoji: '🧩', palavra: 'Método', explica: 'Um comando que você inventa, dando um nome para um grupo de ordens.', exemplo: 'static void virarAtras() {\n    robo.virarDireita();\n    robo.virarDireita();\n}' },
  { grupo: 'Métodos', emoji: '🎯', palavra: 'Parâmetro', explica: 'Uma informação que você manda para o método, entre os parênteses.', exemplo: 'static void andarVarios(int passos) { ... }\nandarVarios(3);' },
  { grupo: 'Métodos', emoji: '↩️', palavra: 'return', explica: 'Faz o método devolver uma resposta para quem chamou.', exemplo: 'static int dobro(int n) {\n    return n * 2;\n}' },
  { grupo: 'Métodos', emoji: '🚪', palavra: 'main', explica: 'A porta de entrada do programa: o Java sempre começa por aqui.', exemplo: 'public static void main(String[] args) { }' },
  { grupo: 'Objetos', emoji: '🍪', palavra: 'Classe', explica: 'A fôrma de biscoito: diz como os objetos daquele tipo são e o que sabem fazer.', exemplo: 'class Placar {\n    int pontos;\n}' },
  { grupo: 'Objetos', emoji: '🤖', palavra: 'Objeto', explica: 'Um biscoito feito com a fôrma! Cada objeto tem os seus próprios valores.', exemplo: 'Robo bia = new Robo("Bia");' },
  { grupo: 'Objetos', emoji: '✨', palavra: 'new', explica: 'Cria um objeto novo a partir de uma classe.' },
  { grupo: 'Objetos', emoji: '🏗️', palavra: 'Construtor', explica: 'O que acontece quando o objeto nasce. Tem o mesmo nome da classe.', exemplo: 'Placar(String dono) {\n    this.dono = dono;\n}' },
  { grupo: 'Objetos', emoji: '🪞', palavra: 'this', explica: 'Quer dizer "eu mesmo, este objeto".' },
  { grupo: 'Objetos', emoji: '🔒', palavra: 'private', explica: 'Só a própria classe pode mexer. Protege os dados (encapsulamento).' },
  { grupo: 'Objetos', emoji: '👪', palavra: 'Herança (extends)', explica: 'Uma classe nova que herda tudo de outra e ainda ganha coisas a mais.', exemplo: 'class RoboEsperto extends Robo { }' },
  { grupo: 'Objetos', emoji: '🎭', palavra: 'Polimorfismo', explica: 'A mesma ordem, cada objeto fazendo do seu jeito. Usa @Override para trocar um método do pai.' },
  { grupo: 'Objetos', emoji: '🔌', palavra: 'Interface', explica: 'Um contrato: quem implementa promete ter certos métodos.', exemplo: 'interface Trabalho {\n    void executar(Robo r);\n}' },
  { grupo: 'Spring Boot', emoji: '🖥️', palavra: 'Servidor', explica: 'Um computador que recebe pedidos pela internet e manda respostas.' },
  { grupo: 'Spring Boot', emoji: '📨', palavra: 'GET e POST', explica: 'Tipos de pedido. GET é "me mostra"; POST é "toma, estou enviando isto".' },
  { grupo: 'Spring Boot', emoji: '🏷️', palavra: 'Anotação (@)', explica: 'Uma etiqueta que dá instruções ao Spring, como @RestController e @GetMapping.' },
  { grupo: 'Spring Boot', emoji: '🧾', palavra: 'JSON', explica: 'O jeito que os programas trocam informações.', exemplo: '{"nome": "Bateria", "preco": 10}' },
  { grupo: 'Spring Boot', emoji: '🚦', palavra: 'Status HTTP', explica: '200 deu certo, 404 não encontrado, 400 pedido errado, 500 erro no servidor.' },
  { grupo: 'Spring Boot', emoji: '💉', palavra: 'Injeção de dependência', explica: 'O Spring cria os @Service e entrega para quem pede no construtor.' },
];

export function PaginaDicionario() {
  const [busca, setBusca] = useState('');
  const filtro = busca.trim().toLowerCase();
  const lista = TERMOS.filter((t) => !filtro || (t.palavra + t.explica).toLowerCase().includes(filtro));
  const grupos = [...new Set(lista.map((t) => t.grupo))];

  return (
    <div className="dicionario">
      <header className="mapa-topo">
        <button className="botao fantasma" onClick={() => history.length > 1 ? history.back() : ir('mapa')}>← Voltar</button>
        <h1>📖 Dicionário do Byte</h1>
        <span />
      </header>
      <input className="busca" type="search" placeholder="Procure uma palavra... (ex.: for, classe, JSON)"
        value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Procurar no dicionário" />
      {grupos.map((g) => (
        <section key={g}>
          <h2>{g}</h2>
          <div className="termos">
            {lista.filter((t) => t.grupo === g).map((t) => (
              <article key={t.palavra} className="cartao termo">
                <h3><span aria-hidden="true">{t.emoji}</span> {t.palavra}</h3>
                <p>{t.explica}</p>
                {t.exemplo && <CodigoColorido codigo={t.exemplo} />}
              </article>
            ))}
          </div>
        </section>
      ))}
      {lista.length === 0 && <p className="muted">Nenhuma palavra encontrada. Tente outra!</p>}
    </div>
  );
}
