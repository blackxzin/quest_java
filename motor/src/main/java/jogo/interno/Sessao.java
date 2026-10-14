package jogo.interno;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Guarda tudo o que aconteceu durante uma execução (os "eventos" que o site anima)
 * e descobre em qual linha do código do aluno cada coisa aconteceu.
 */
public final class Sessao {

    static final int MAX_EVENTOS = 5000;
    static final int MAX_LINHAS_IMPRESSAS = 300;

    private static Sessao atual;

    private final Set<String> classesUsuario;
    private final int offsetLinhas;
    private final List<Map<String, Object>> eventos = new ArrayList<>();
    private final List<String> impressoes = new ArrayList<>();

    Sessao(Set<String> classesUsuario, int offsetLinhas) {
        this.classesUsuario = classesUsuario;
        this.offsetLinhas = offsetLinhas;
    }

    static Sessao atual() {
        return atual;
    }

    static void definir(Sessao sessao) {
        atual = sessao;
    }

    List<Map<String, Object>> eventos() {
        return eventos;
    }

    List<String> impressoes() {
        return impressoes;
    }

    Map<String, Object> evento(String tipo) {
        if (eventos.size() >= MAX_EVENTOS) {
            throw new ErroDoJogo("Aconteceu coisa demais! Mais de " + MAX_EVENTOS
                    + " ações... Será que tem um loop que nunca termina?");
        }
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("tipo", tipo);
        int linha = linhaAtual();
        if (linha > 0) {
            e.put("linha", linha);
        }
        eventos.add(e);
        return e;
    }

    void imprimir(String texto) {
        if (impressoes.size() >= MAX_LINHAS_IMPRESSAS) {
            throw new ErroDoJogo("Você escreveu mais de " + MAX_LINHAS_IMPRESSAS
                    + " linhas no terminal! Será que tem um loop que nunca termina?");
        }
        impressoes.add(texto);
        evento("imprimir").put("texto", texto);
    }

    /** A linha do código do aluno que está rodando agora. */
    int linhaAtual() {
        return StackWalker.getInstance().walk(frames -> frames
                .filter(f -> classesUsuario.contains(f.getClassName()))
                .findFirst()
                .map(f -> ajustar(f.getLineNumber()))
                .orElse(0));
    }

    /** A linha do código do aluno onde um erro aconteceu. */
    int linhaDe(Throwable erro) {
        for (Throwable t = erro; t != null; t = t.getCause()) {
            for (StackTraceElement el : t.getStackTrace()) {
                if (classesUsuario.contains(el.getClassName())) {
                    return ajustar(el.getLineNumber());
                }
            }
        }
        return 0;
    }

    private int ajustar(int linha) {
        return Math.max(0, linha - offsetLinhas);
    }
}
