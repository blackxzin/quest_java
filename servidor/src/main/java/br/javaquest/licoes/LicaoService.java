package br.javaquest.licoes;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.dataformat.yaml.YAMLMapper;

/** Lê as lições dos arquivos YAML em {@code resources/licoes}. */
@Service
public class LicaoService {

    private final List<Modulo> modulos;
    private final Map<String, Licao> porId = new HashMap<>();

    public LicaoService() throws IOException {
        YAMLMapper yaml = YAMLMapper.builder()
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
                .build();
        Resource[] arquivos = new PathMatchingResourcePatternResolver().getResources("classpath:licoes/*.yml");
        Arrays.sort(arquivos, Comparator.comparing(Resource::getFilename));
        List<Modulo> lidos = new ArrayList<>();
        for (Resource arquivo : arquivos) {
            Modulo m;
            try (InputStream in = arquivo.getInputStream()) {
                m = yaml.readValue(in, Modulo.class);
            }
            List<Licao> licoes = m.licoes().stream().map(Licao::normalizada).toList();
            for (Licao l : licoes) {
                if (porId.put(l.id(), l) != null) {
                    throw new IllegalStateException("Lição repetida: " + l.id());
                }
            }
            lidos.add(new Modulo(m.id(), m.titulo(), m.emoji(), m.cor(), m.descricao(), m.oculto(), licoes));
        }
        this.modulos = List.copyOf(lidos);
    }

    public List<Modulo> modulos() {
        return modulos;
    }

    public Optional<Licao> licao(String id) {
        return Optional.ofNullable(porId.get(id));
    }
}
