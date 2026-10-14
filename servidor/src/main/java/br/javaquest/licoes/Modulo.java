package br.javaquest.licoes;

import java.util.List;

/** Um módulo (um "mundo" do mapa de aventuras) com várias lições. */
public record Modulo(String id, String titulo, String emoji, String cor, String descricao, boolean oculto,
                     List<Licao> licoes) {}
