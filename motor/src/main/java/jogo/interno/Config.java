package jogo.interno;

import java.util.List;

import tools.jackson.databind.JsonNode;

/** O que o servidor manda para o executor: o mapa, os objetivos e as regras da missão. */
public record Config(
        String tipo,
        List<MundoConfig> mundos,
        List<PedidoConfig> pedidos,
        int offsetLinhas,
        int maxAcoes,
        List<String> classes) {

    public record MundoConfig(List<String> mapa, String direcao, List<ObjetivoConfig> objetivos) {}

    public record ObjetivoConfig(String tipo, String texto, Integer quantidade) {}

    public record PedidoConfig(String metodo, String caminho, JsonNode corpo, String esperado,
                               JsonNode esperadoJson, Integer status) {}
}
