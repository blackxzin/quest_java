package br.javaquest.execucao;

/** Ajudantes para olhar o código do aluno como texto. */
final class CodigoFonte {

    /** Cabeçalho escondido do modo "corpo": o aluno escreve só o que vai dentro do main. */
    static final String CABECALHO_CORPO = """
            import jogo.*;
            import java.util.*;

            public class Missao {
                public static void main(String[] args) { Robo robo = new Robo();
            """;

    /** O robô é criado na última linha do cabeçalho, então as linhas do aluno começam logo depois. */
    static final int OFFSET_CORPO = (int) CABECALHO_CORPO.lines().count();

    private CodigoFonte() {
    }

    static String envolverCorpo(String codigo) {
        return CABECALHO_CORPO + codigo + "\n    }\n}\n";
    }

    /**
     * Troca comentários e o conteúdo de textos ("...") por espaços, mantendo as quebras de linha.
     * Assim dá para procurar palavras como "for" sem achar as que estão dentro de comentários.
     */
    static String semComentariosNemTextos(String codigo) {
        StringBuilder sb = new StringBuilder(codigo.length());
        int i = 0;
        int n = codigo.length();
        while (i < n) {
            char c = codigo.charAt(i);
            char prox = i + 1 < n ? codigo.charAt(i + 1) : '\0';
            if (c == '/' && prox == '/') {
                while (i < n && codigo.charAt(i) != '\n') {
                    sb.append(' ');
                    i++;
                }
            } else if (c == '/' && prox == '*') {
                sb.append("  ");
                i += 2;
                while (i < n && !(codigo.charAt(i) == '*' && i + 1 < n && codigo.charAt(i + 1) == '/')) {
                    sb.append(codigo.charAt(i) == '\n' ? '\n' : ' ');
                    i++;
                }
                if (i < n) {
                    sb.append("  ");
                    i += 2;
                }
            } else if (c == '"' || c == '\'') {
                sb.append(c);
                i++;
                while (i < n && codigo.charAt(i) != c && codigo.charAt(i) != '\n') {
                    if (codigo.charAt(i) == '\\' && i + 1 < n) {
                        sb.append(' ');
                        i++;
                    }
                    sb.append(' ');
                    i++;
                }
                if (i < n && codigo.charAt(i) == c) {
                    sb.append(c);
                    i++;
                }
            } else {
                sb.append(c);
                i++;
            }
        }
        return sb.toString();
    }
}
