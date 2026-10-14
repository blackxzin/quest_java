package br.javaquest.licoes;

import java.util.ArrayList;
import java.util.List;

import tools.jackson.databind.JsonNode;

/**
 * Uma lição (missão). Pode ser do tipo "mapa" (o robô anda no mapa) ou "loja" (Spring Boot).
 *
 * <p>No modo "corpo" o aluno escreve só os comandos (o servidor coloca a classe e o main em volta).
 * No modo "completo" o aluno escreve o programa inteiro.
 */
public record Licao(
        String id,
        String titulo,
        String tipo,
        String modo,
        String historia,
        String explicacao,
        String dica,
        String codigoInicial,
        String solucao,
        String direcao,
        List<String> mapa,
        List<Mundo> mundos,
        List<Objetivo> objetivos,
        List<Requisito> requisitos,
        List<Pedido> pedidos,
        Integer maxAcoes,
        boolean desafio,
        boolean livre) {

    public record Mundo(List<String> mapa, String direcao, List<Objetivo> objetivos) {}

    /** chegar, moedas, falar (texto), imprimir (texto) ou robos (quantidade). */
    public record Objetivo(String tipo, String texto, Integer quantidade) {}

    /** O código precisa ter (ou ter no máximo {@code maximo} vezes) algo que combine com {@code padrao}. */
    public record Requisito(String padrao, Integer maximo, String mensagem) {}

    public record Pedido(String metodo, String caminho, JsonNode corpo, String esperado, JsonNode esperadoJson,
                         Integer status) {}

    public boolean eLoja() {
        return "loja".equals(tipo);
    }

    public boolean eCorpo() {
        return "corpo".equals(modo);
    }

    /** Preenche os valores padrão e junta os objetivos gerais com os de cada mundo. */
    Licao normalizada() {
        String tipoFinal = tipo == null ? "mapa" : tipo;
        String modoFinal = modo == null ? ("loja".equals(tipoFinal) ? "completo" : "corpo") : modo;
        List<Objetivo> gerais = objetivos == null ? List.of() : objetivos;
        List<Mundo> base = mundos != null && !mundos.isEmpty() ? mundos
                : mapa != null ? List.of(new Mundo(mapa, null, null)) : List.of();
        List<Mundo> finais = new ArrayList<>();
        for (Mundo m : base) {
            List<Objetivo> todos = new ArrayList<>(gerais);
            if (m.objetivos() != null) {
                todos.addAll(m.objetivos());
            }
            finais.add(new Mundo(m.mapa(), m.direcao() != null ? m.direcao() : direcao != null ? direcao : "leste", todos));
        }
        return new Licao(id, titulo, tipoFinal, modoFinal, historia, explicacao, dica,
                codigoInicial == null ? "" : codigoInicial, solucao, direcao, null, finais, gerais,
                requisitos == null ? List.of() : requisitos, pedidos == null ? List.of() : pedidos,
                maxAcoes, desafio, livre);
    }
}
