package br.javaquest.execucao;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

/** Monta as peças da execução com as configurações do application.properties. */
@Configuration
public class ExecucaoConfig {

    @Bean
    List<Path> bibliotecasSandbox(@Value("${javaquest.sandbox.libs}") Path pasta) throws IOException {
        if (!Files.isDirectory(pasta)) {
            throw new IllegalStateException("Não achei a pasta das bibliotecas do motor em " + pasta.toAbsolutePath()
                    + ". Rode \"./gradlew :motor:sandboxLibs\" ou configure javaquest.sandbox.libs.");
        }
        try (Stream<Path> s = Files.list(pasta)) {
            return s.filter(p -> p.toString().endsWith(".jar")).map(Path::toAbsolutePath).sorted().toList();
        }
    }

    @Bean
    ExecucaoService execucaoService(List<Path> bibliotecasSandbox,
                                    @Value("${javaquest.tempo-limite-ms:6000}") long tempoLimiteMs,
                                    @Value("${javaquest.max-simultaneos:4}") int maxSimultaneos) {
        JsonMapper json = JsonMapper.builder().build();
        return new ExecucaoService(new Compilador(bibliotecasSandbox), new VerificadorBytecode(), new TradutorErros(),
                new Sandbox(bibliotecasSandbox, tempoLimiteMs, json), maxSimultaneos, tempoLimiteMs);
    }
}
