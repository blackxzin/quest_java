package br.javaquest.execucao;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import br.javaquest.execucao.Compilador.Compilacao;
import br.javaquest.execucao.TradutorErros.ErroAmigavel;
import br.javaquest.licoes.Licao;
import br.javaquest.licoes.Licao.Requisito;

/**
 * O caminho completo do código do aluno: confere as regras da missão, compila,
 * verifica a segurança, roda no processo separado e explica o resultado.
 */
public class ExecucaoService {

    public record Resultado(String status, String mensagem, List<ErroAmigavel> erros,
                            List<Map<String, Object>> mundos) {

        static Resultado simples(String status, String mensagem) {
            return new Resultado(status, mensagem, List.of(), List.of());
        }
    }

    private static final int MAX_CARACTERES = 20_000;
    private static final Pattern PACKAGE = Pattern.compile("(?m)^\\s*package\\s+");

    private final Compilador compilador;
    private final VerificadorBytecode verificador;
    private final TradutorErros tradutor;
    private final Sandbox sandbox;
    private final Semaphore vagas;
    private final long tempoLimiteMs;

    public ExecucaoService(Compilador compilador, VerificadorBytecode verificador, TradutorErros tradutor,
                           Sandbox sandbox, int maxSimultaneos, long tempoLimiteMs) {
        this.compilador = compilador;
        this.verificador = verificador;
        this.tradutor = tradutor;
        this.sandbox = sandbox;
        this.vagas = new Semaphore(maxSimultaneos, true);
        this.tempoLimiteMs = tempoLimiteMs;
    }

    public Resultado executar(Licao licao, String codigo) throws IOException, InterruptedException {
        if (codigo == null || codigo.isBlank()) {
            return Resultado.simples("erroCompilacao", "O editor está vazio! Escreva alguns comandos para o robô.");
        }
        if (codigo.length() > MAX_CARACTERES) {
            return Resultado.simples("bloqueado", "Seu código está gigante! Tente deixá-lo com menos de 20 mil letras.");
        }
        String limpo = CodigoFonte.semComentariosNemTextos(codigo);
        if (PACKAGE.matcher(limpo).find()) {
            return Resultado.simples("bloqueado", "Aqui no JavaQuest não precisa escrever package. Pode apagar essa linha!");
        }
        if (!vagas.tryAcquire(15, TimeUnit.SECONDS)) {
            return Resultado.simples("ocupado", "Tem muita gente rodando código agora. Espere um pouquinho e tente de novo!");
        }
        Path pasta = Files.createTempDirectory("javaquest-");
        try {
            return compilarERodar(licao, codigo, limpo, pasta);
        } finally {
            vagas.release();
            apagar(pasta);
        }
    }

    private Resultado compilarERodar(Licao licao, String codigo, String limpo, Path pasta)
            throws IOException, InterruptedException {
        boolean corpo = licao.eCorpo();
        String fonte = corpo ? CodigoFonte.envolverCorpo(codigo) : codigo;
        int offset = corpo ? CodigoFonte.OFFSET_CORPO : 0;

        Path classes = pasta.resolve("classes");
        Compilacao compilacao = compilador.compilar(fonte, classes);
        if (!compilacao.ok()) {
            List<ErroAmigavel> erros = tradutor.traduzir(compilacao.diagnosticos(), codigo, offset, corpo);
            String mensagem = erros.isEmpty() ? "O Java não conseguiu entender o código."
                    : "Linha " + erros.get(0).linha() + ": " + erros.get(0).mensagem();
            return new Resultado("erroCompilacao", mensagem, erros, List.of());
        }

        Optional<String> proibido = verificador.verificar(classes, compilacao.classes(), licao.eLoja());
        if (proibido.isPresent()) {
            return Resultado.simples("bloqueado", "Por segurança, o JavaQuest não deixa usar " + proibido.get()
                    + " aqui. Tente resolver a missão só com o que aprendeu nas lições!");
        }

        Map<String, Object> config = new LinkedHashMap<>();
        config.put("tipo", licao.tipo());
        config.put("mundos", licao.mundos());
        config.put("pedidos", licao.pedidos());
        config.put("offsetLinhas", offset);
        config.put("maxAcoes", licao.maxAcoes() == null ? 1000 : licao.maxAcoes());
        config.put("classes", compilacao.classes());

        Sandbox.Execucao execucao = sandbox.executar(classes, config);
        return switch (execucao) {
            case Sandbox.Execucao.TempoEsgotado t -> Resultado.simples("tempoEsgotado",
                    "Seu programa demorou demais (mais de " + (tempoLimiteMs / 1000) + " segundos) e foi parado. "
                            + "Será que tem um loop que nunca termina? Confira os seus while!");
            case Sandbox.Execucao.Falhou f -> Resultado.simples("erroInterno",
                    "Ih, deu um problema no JavaQuest (não foi culpa sua!). Tente de novo. Detalhe: " + f.motivo());
            case Sandbox.Execucao.Terminou t -> avaliar(licao, limpo, t.resultado());
        };
    }

    @SuppressWarnings("unchecked")
    private Resultado avaliar(Licao licao, String codigoLimpo, Map<String, Object> resultado) {
        List<Map<String, Object>> mundos = (List<Map<String, Object>>) resultado.getOrDefault("mundos", List.of());
        List<Integer> deramCerto = new ArrayList<>();
        Map<String, Object> primeiroErro = null;
        for (int i = 0; i < mundos.size(); i++) {
            Map<String, Object> m = mundos.get(i);
            if (Boolean.TRUE.equals(m.get("sucesso"))) {
                deramCerto.add(i);
            } else if (primeiroErro == null && m.get("erro") instanceof Map<?, ?> erro) {
                primeiroErro = (Map<String, Object>) erro;
            }
        }
        boolean tudoCerto = !mundos.isEmpty() && deramCerto.size() == mundos.size();
        if (tudoCerto) {
            Optional<String> faltou = requisitoFaltando(licao.requisitos(), codigoLimpo);
            if (faltou.isPresent()) {
                return new Resultado("quase", "Funcionou! Mas tem um desafio extra: " + faltou.get(), List.of(), mundos);
            }
            return new Resultado("sucesso", "Missão cumprida!", List.of(), mundos);
        }
        String mensagem;
        if (primeiroErro != null) {
            Object linha = primeiroErro.get("linha");
            mensagem = (linha != null ? "Linha " + linha + ": " : "") + primeiroErro.get("mensagem");
        } else if (licao.eLoja()) {
            mensagem = "Alguns clientes não receberam a resposta certa. Veja a tabela de pedidos!";
        } else if (mundos.size() > 1 && !deramCerto.isEmpty()) {
            mensagem = "Funcionou em " + (deramCerto.size() == 1 ? "um mundo" : deramCerto.size() + " mundos")
                    + ", mas não em todos! Seu código precisa funcionar em qualquer mundo: use as perguntas do robô "
                    + "(como frenteLivre() e temMoeda()).";
        } else {
            mensagem = "O programa rodou, mas ainda falta cumprir alguns objetivos. Veja a lista da missão!";
        }
        return new Resultado("falhou", mensagem, List.of(), mundos);
    }

    static Optional<String> requisitoFaltando(List<Requisito> requisitos, String codigoLimpo) {
        for (Requisito r : requisitos) {
            Matcher m = Pattern.compile(r.padrao()).matcher(codigoLimpo);
            int vezes = 0;
            while (m.find()) {
                vezes++;
            }
            boolean ok = r.maximo() == null ? vezes > 0 : vezes <= r.maximo();
            if (!ok) {
                return Optional.of(r.mensagem());
            }
        }
        return Optional.empty();
    }

    private static void apagar(Path pasta) {
        try (Stream<Path> s = Files.walk(pasta)) {
            s.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        } catch (IOException e) {
            // Pasta temporária: se sobrar, o sistema limpa depois.
        }
    }
}
