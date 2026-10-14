package jogo.interno;

import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jogo.interno.Config.MundoConfig;
import jogo.interno.Config.ObjetivoConfig;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ponto de entrada do processo que roda o código do aluno.
 *
 * <p>Recebe a configuração da missão pela entrada padrão, roda o programa em cada mundo
 * (cada um num ClassLoader novo, para começar sempre do zero) e devolve tudo o que aconteceu
 * numa linha JSON que começa com {@link #MARCADOR}.
 */
public final class Executor {

    public static final String MARCADOR = "@@JAVAQUEST@@";

    static final JsonMapper JSON = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private Executor() {
    }

    public static void main(String[] args) throws Exception {
        PrintStream real = new PrintStream(new FileOutputStream(FileDescriptor.out), true, StandardCharsets.UTF_8);
        Object resultado;
        try {
            Config config = JSON.readValue(System.in.readAllBytes(), Config.class);
            Saida saida = new Saida();
            PrintStream capturada = new PrintStream(saida, true, StandardCharsets.UTF_8);
            System.setOut(capturada);
            System.setErr(capturada);
            resultado = executar(Path.of(args[0]), config, saida);
        } catch (Throwable t) {
            resultado = Map.of("erroInterno", String.valueOf(t));
        }
        real.println(MARCADOR + JSON.writeValueAsString(resultado));
        real.flush();
        Runtime.getRuntime().halt(0);
    }

    static Map<String, Object> executar(Path classes, Config config, Saida saida) throws Exception {
        Set<String> nomes = new HashSet<>(config.classes());
        URL[] urls = {classes.toUri().toURL()};
        List<Map<String, Object>> mundos = new ArrayList<>();
        if ("loja".equals(config.tipo())) {
            Sessao sessao = new Sessao(nomes, config.offsetLinhas());
            Sessao.definir(sessao);
            Mundo.definir(null);
            try (URLClassLoader loader = new URLClassLoader(urls, Executor.class.getClassLoader())) {
                mundos.add(new Loja(sessao, loader, config).executar(saida));
            }
        } else {
            for (MundoConfig mundo : config.mundos()) {
                Sessao sessao = new Sessao(nomes, config.offsetLinhas());
                Sessao.definir(sessao);
                try (URLClassLoader loader = new URLClassLoader(urls, Executor.class.getClassLoader())) {
                    mundos.add(executarMundo(sessao, loader, config, mundo, saida));
                }
            }
        }
        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("mundos", mundos);
        return resultado;
    }

    private static Map<String, Object> executarMundo(Sessao sessao, ClassLoader loader, Config config,
                                                     MundoConfig mundoConfig, Saida saida) {
        Mundo mundo = new Mundo(sessao, mundoConfig, config.maxAcoes());
        Mundo.definir(mundo);
        Map<String, Object> erro = null;
        try {
            Method main = acharMain(loader, config.classes());
            if (main == null) {
                erro = erro("Não encontrei o \"public static void main(String[] args)\". "
                        + "É por ele que o Java começa o programa!", 0);
            } else {
                main.invoke(null, (Object) new String[0]);
            }
        } catch (InvocationTargetException e) {
            erro = erro(sessao, e.getCause());
        } catch (Throwable e) {
            erro = erro(sessao, e);
        }
        try {
            saida.terminar();
        } catch (Throwable e) {
            if (erro == null) {
                erro = erro(sessao, e);
            }
        }
        if (erro == null && !mundo.temRobos()) {
            erro = erro("Nenhum robô foi criado! Para criar um, escreva: Robo robo = new Robo();", 0);
        }
        List<ObjetivoConfig> objetivos = mundoConfig.objetivos() == null ? List.of() : mundoConfig.objetivos();
        List<Map<String, Object>> avaliacao = mundo.avaliar(objetivos);
        boolean sucesso = erro == null && avaliacao.stream().allMatch(o -> Boolean.TRUE.equals(o.get("ok")));

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("eventos", sessao.eventos());
        r.put("objetivos", avaliacao);
        r.put("sucesso", sucesso);
        if (erro != null) {
            r.put("erro", erro);
        }
        return r;
    }

    private static Method acharMain(ClassLoader loader, List<String> classes) throws ClassNotFoundException {
        for (String nome : classes) {
            Class<?> c = Class.forName(nome, false, loader);
            for (Method m : c.getDeclaredMethods()) {
                if (m.getName().equals("main") && Modifier.isStatic(m.getModifiers())
                        && m.getParameterCount() == 1 && m.getParameterTypes()[0] == String[].class) {
                    m.setAccessible(true);
                    return m;
                }
            }
        }
        return null;
    }

    static Map<String, Object> erro(Sessao sessao, Throwable t) {
        if (t instanceof ExceptionInInitializerError && t.getCause() != null) {
            t = t.getCause();
        }
        return erro(Traducao.mensagem(t), sessao.linhaDe(t));
    }

    static Map<String, Object> erro(String mensagem, int linha) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("mensagem", mensagem);
        if (linha > 0) {
            e.put("linha", linha);
        }
        return e;
    }
}
