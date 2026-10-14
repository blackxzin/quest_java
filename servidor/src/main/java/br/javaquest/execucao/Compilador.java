package br.javaquest.execucao;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.StandardLocation;
import javax.tools.ToolProvider;

/** Compila o código do aluno com o javac de verdade, guardando os .class numa pasta. */
public class Compilador {

    private static final Pattern ARQUIVO_PUBLICO =
            Pattern.compile("class (\\w+) is public, should be declared in a file named");

    public record Diagnostico(long linha, long coluna, String codigo, String mensagem) {}

    public record Compilacao(boolean ok, List<Diagnostico> diagnosticos, List<String> classes) {}

    private final JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
    private final List<Path> bibliotecas;

    public Compilador(List<Path> bibliotecas) {
        if (javac == null) {
            throw new IllegalStateException("O JavaQuest precisa de um JDK (com javac), não só de um JRE.");
        }
        this.bibliotecas = bibliotecas;
    }

    public Compilacao compilar(String fonte, Path saida) throws IOException {
        Compilacao c = tentar("Missao", fonte, saida);
        if (!c.ok()) {
            // Se o aluno chamou a classe pública de outro nome, o arquivo precisa ter esse nome.
            for (Diagnostico d : c.diagnosticos()) {
                Matcher m = ARQUIVO_PUBLICO.matcher(d.mensagem());
                if (m.find()) {
                    return tentar(m.group(1), fonte, saida);
                }
            }
        }
        return c;
    }

    private Compilacao tentar(String nomeArquivo, String fonte, Path saida) throws IOException {
        limpar(saida);
        DiagnosticCollector<JavaFileObject> coletor = new DiagnosticCollector<>();
        try (StandardJavaFileManager arquivos = javac.getStandardFileManager(coletor, Locale.ENGLISH, StandardCharsets.UTF_8)) {
            arquivos.setLocationFromPaths(StandardLocation.CLASS_OUTPUT, List.of(saida));
            arquivos.setLocationFromPaths(StandardLocation.CLASS_PATH, bibliotecas);
            List<String> opcoes = List.of("-proc:none", "-parameters", "-g", "-implicit:none",
                    "-Xlint:none", "-nowarn", "-Xmaxerrs", "20", "-encoding", "UTF-8");
            JavaFileObject arquivo = new Fonte(nomeArquivo, fonte);
            boolean ok = javac.getTask(null, arquivos, coletor, opcoes, null, List.of(arquivo)).call();
            List<Diagnostico> diagnosticos = new ArrayList<>();
            for (Diagnostic<? extends JavaFileObject> d : coletor.getDiagnostics()) {
                if (d.getKind() == Diagnostic.Kind.ERROR) {
                    diagnosticos.add(new Diagnostico(d.getLineNumber(), d.getColumnNumber(), d.getCode(),
                            d.getMessage(Locale.ENGLISH)));
                }
            }
            return new Compilacao(ok, diagnosticos, ok ? classesEm(saida) : List.of());
        }
    }

    private static List<String> classesEm(Path pasta) throws IOException {
        try (Stream<Path> s = Files.walk(pasta)) {
            return s.filter(p -> p.toString().endsWith(".class"))
                    .map(p -> pasta.relativize(p).toString().replace('/', '.').replace('\\', '.'))
                    .map(n -> n.substring(0, n.length() - ".class".length()))
                    .sorted()
                    .toList();
        }
    }

    private static void limpar(Path pasta) throws IOException {
        if (Files.exists(pasta)) {
            try (Stream<Path> s = Files.walk(pasta)) {
                for (Path p : s.sorted((a, b) -> b.getNameCount() - a.getNameCount()).toList()) {
                    if (!p.equals(pasta)) {
                        Files.delete(p);
                    }
                }
            }
        }
        Files.createDirectories(pasta);
    }

    private static final class Fonte extends SimpleJavaFileObject {
        private final String codigo;

        Fonte(String nomeClasse, String codigo) {
            super(URI.create("string:///" + nomeClasse + Kind.SOURCE.extension), Kind.SOURCE);
            this.codigo = codigo;
        }

        @Override
        public CharSequence getCharContent(boolean ignoreEncodingErrors) {
            return codigo;
        }
    }
}
