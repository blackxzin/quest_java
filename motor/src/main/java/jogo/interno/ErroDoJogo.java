package jogo.interno;

/** Um erro "do jogo" (bater na parede, pegar moeda que não existe...) com mensagem já amigável. */
public class ErroDoJogo extends RuntimeException {
    public ErroDoJogo(String mensagem) {
        super(mensagem, null, false, true);
    }
}
