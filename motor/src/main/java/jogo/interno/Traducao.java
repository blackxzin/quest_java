package jogo.interno;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Transforma os erros do Java (em inglês e cheios de termos difíceis) em frases que uma criança entende. */
final class Traducao {

    private static final Pattern INDICE = Pattern.compile("Index (-?\\d+) out of bounds for length (\\d+)");
    private static final Pattern NUMERO = Pattern.compile("For input string: \"(.*)\"");

    private Traducao() {
    }

    static String mensagem(Throwable t) {
        String msg = t.getMessage() == null ? "" : t.getMessage();
        if (t instanceof ErroDoJogo) {
            return msg;
        }
        if (t instanceof StackOverflowError) {
            return "Um método ficou chamando ele mesmo para sempre (isso se chama recursão infinita). "
                    + "Ele precisa de um momento para parar!";
        }
        if (t instanceof OutOfMemoryError) {
            return "Seu programa usou memória demais! Será que está criando coisas sem parar num loop?";
        }
        if (t instanceof ArithmeticException && msg.contains("zero")) {
            return "Divisão por zero! Nem o Byte consegue dividir um número por 0.";
        }
        if (t instanceof IndexOutOfBoundsException) {
            Matcher m = INDICE.matcher(msg);
            if (m.find()) {
                int tamanho = Integer.parseInt(m.group(2));
                return "Você tentou abrir a gaveta número " + m.group(1) + ", mas a lista só tem " + tamanho
                        + (tamanho == 1 ? " gaveta" : " gavetas")
                        + (tamanho > 0 ? " (de 0 até " + (tamanho - 1) + ")." : ".")
                        + " Lembre: a contagem começa no 0!";
            }
            return "Você tentou pegar uma posição que não existe na lista.";
        }
        if (t instanceof NumberFormatException) {
            Matcher m = NUMERO.matcher(msg);
            return m.find() ? "O texto \"" + m.group(1) + "\" não é um número!" : "Esse texto não é um número!";
        }
        if (t instanceof NullPointerException) {
            return "Você tentou usar algo que está vazio (null). Esqueceu de criar com \"new\" ou de dar um valor?";
        }
        if (t instanceof ClassCastException) {
            return "Você tentou transformar um tipo de coisa em outro que não combina.";
        }
        if (t instanceof ExceptionInInitializerError && t.getCause() != null) {
            return mensagem(t.getCause());
        }
        if (!msg.isBlank()) {
            return "Seu programa deu um erro (" + t.getClass().getSimpleName() + "): " + msg;
        }
        return "Seu programa deu um erro do tipo " + t.getClass().getSimpleName() + ".";
    }
}
