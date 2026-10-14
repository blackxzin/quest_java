package jogo;

import jogo.interno.Mundo;

/**
 * O robô do JavaQuest! Cada {@code new Robo()} cria um robô novo no mapa.
 *
 * <p>Os comandos são em português para ficar fácil de lembrar:
 * <pre>
 *   Robo robo = new Robo();
 *   robo.andar();
 *   robo.virarDireita();
 *   robo.pegarMoeda();
 *   robo.falar("Olá!");
 * </pre>
 */
public class Robo {

    private final int id;
    private final String nome;

    /** Cria um robô chamado Byte. */
    public Robo() {
        this("Byte");
    }

    /** Cria um robô com o nome que você escolher. */
    public Robo(String nome) {
        this(nome, null);
    }

    /** Cria um robô com nome e cor: azul, vermelho, verde, amarelo, roxo, rosa ou laranja. */
    public Robo(String nome, String cor) {
        this.nome = (nome == null || nome.isBlank()) ? "Byte" : nome;
        this.id = Mundo.atual().criarRobo(this.nome, cor);
    }

    /** Anda um quadradinho para a frente. Se tiver parede... bum! */
    public void andar() {
        Mundo.atual().andar(id);
    }

    /** Gira para a esquerda, sem sair do lugar. */
    public void virarEsquerda() {
        Mundo.atual().virar(id, -1);
    }

    /** Gira para a direita, sem sair do lugar. */
    public void virarDireita() {
        Mundo.atual().virar(id, 1);
    }

    /** Pega a moeda que está embaixo do robô. */
    public void pegarMoeda() {
        Mundo.atual().pegarMoeda(id);
    }

    /** Fala alguma coisa num balãozinho. Pode ser texto ou número. */
    public void falar(Object mensagem) {
        Mundo.atual().falar(id, String.valueOf(mensagem));
    }

    /** Responde {@code true} se tem uma moeda embaixo do robô. */
    public boolean temMoeda() {
        return Mundo.atual().temMoeda(id);
    }

    /** Responde {@code true} se o quadradinho da frente não tem parede. */
    public boolean frenteLivre() {
        return Mundo.atual().livre(id, 0);
    }

    /** Responde {@code true} se o quadradinho da esquerda do robô não tem parede. */
    public boolean esquerdaLivre() {
        return Mundo.atual().livre(id, -1);
    }

    /** Responde {@code true} se o quadradinho da direita do robô não tem parede. */
    public boolean direitaLivre() {
        return Mundo.atual().livre(id, 1);
    }

    /** Responde {@code true} se o robô está em cima da bandeira. */
    public boolean chegou() {
        return Mundo.atual().chegou(id);
    }

    /** Quantas moedas este robô já pegou. */
    public int getMoedas() {
        return Mundo.atual().moedasDe(id);
    }

    /** O nome do robô. */
    public String getNome() {
        return nome;
    }

    @Override
    public String toString() {
        return nome;
    }
}
