package br.javaquest.execucao;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Roda o código do aluno num processo Java separado, com pouca memória, sem variáveis
 * de ambiente e com tempo limite. Se o programa travar (um loop infinito, por exemplo),
 * o processo é encerrado e o servidor continua funcionando normalmente.
 */
public class Sandbox {

    private static final String MARCADOR = "@@JAVAQUEST@@";
    private static final int MAX_SAIDA = 8 * 1024 * 1024;

    public sealed interface Execucao {
        record Terminou(Map<String, Object> resultado) implements Execucao {}

        record TempoEsgotado() implements Execucao {}

        record Falhou(String motivo) implements Execucao {}
    }

    private final List<Path> bibliotecas;
    private final long tempoLimiteMs;
    private final JsonMapper json;

    public Sandbox(List<Path> bibliotecas, long tempoLimiteMs, JsonMapper json) {
        this.bibliotecas = bibliotecas;
        this.tempoLimiteMs = tempoLimiteMs;
        this.json = json;
    }

    public Execucao executar(Path classes, Map<String, Object> config) throws IOException, InterruptedException {
        String javaBin = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        List<String> comando = new ArrayList<>(List.of(javaBin,
                "-Xmx128m", "-Xss4m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-XX:-UsePerfData",
                "-Djava.awt.headless=true", "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8",
                "-cp", bibliotecas.stream().map(Path::toString).collect(Collectors.joining(java.io.File.pathSeparator)),
                "jogo.interno.Executor", classes.toString()));
        ProcessBuilder pb = new ProcessBuilder(comando).directory(classes.toFile());
        pb.environment().clear();
        Process processo = pb.start();
        try {
            ByteArrayOutputStream saida = new ByteArrayOutputStream();
            Thread leitorSaida = Thread.ofVirtual().start(() -> copiar(processo.getInputStream(), saida, MAX_SAIDA));
            Thread leitorErro = Thread.ofVirtual().start(() -> copiar(processo.getErrorStream(), OutputStream.nullOutputStream(), Long.MAX_VALUE));
            try (OutputStream entrada = processo.getOutputStream()) {
                entrada.write(json.writeValueAsBytes(config));
            }
            if (!processo.waitFor(tempoLimiteMs, TimeUnit.MILLISECONDS)) {
                return new Execucao.TempoEsgotado();
            }
            leitorSaida.join(2000);
            leitorErro.join(500);
            Optional<String> linha = saida.toString(StandardCharsets.UTF_8).lines()
                    .filter(l -> l.startsWith(MARCADOR))
                    .reduce((a, b) -> b);
            if (linha.isEmpty()) {
                return new Execucao.Falhou("O programa terminou sem dar resposta (código " + processo.exitValue() + ").");
            }
            Map<String, Object> resultado = json.readValue(linha.get().substring(MARCADOR.length()),
                    new TypeReference<Map<String, Object>>() { });
            if (resultado.containsKey("erroInterno")) {
                return new Execucao.Falhou(String.valueOf(resultado.get("erroInterno")));
            }
            return new Execucao.Terminou(resultado);
        } finally {
            processo.destroyForcibly();
        }
    }

    private static void copiar(InputStream in, OutputStream out, long limite) {
        byte[] buffer = new byte[8192];
        long total = 0;
        try (in) {
            int lidos;
            while ((lidos = in.read(buffer)) >= 0) {
                if (total < limite) {
                    out.write(buffer, 0, (int) Math.min(lidos, limite - total));
                }
                total += lidos;
            }
        } catch (IOException e) {
            // O processo foi encerrado: tudo bem.
        }
    }
}
