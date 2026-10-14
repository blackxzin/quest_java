package jogo.interno;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Parameter;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jogo.interno.Config.PedidoConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ValueConstants;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.JsonNode;

/**
 * Uma "mini Spring Boot" para a Loja do Robô.
 *
 * <p>Ela lê as anotações de verdade do Spring (@RestController, @GetMapping, @PathVariable,
 * @RequestParam, @RequestBody, @Service, @Autowired) do jeitinho que o Spring Boot faz,
 * cria os objetos, entrega os @Service para quem pede e atende os pedidos dos clientes.
 * Assim o código do aluno funciona igual num projeto Spring Boot real.
 */
final class Loja {

    private final Sessao sessao;
    private final Config config;
    private final List<Class<?>> componentes = new ArrayList<>();
    private final Map<Class<?>, Object> objetos = new LinkedHashMap<>();
    private final Set<Class<?>> criando = new HashSet<>();
    private final List<Rota> rotas = new ArrayList<>();

    private record Rota(String metodoHttp, String[] partes, String caminho, Object dono, Method metodo) {}

    private record Resposta(int status, Object corpo) {}

    Loja(Sessao sessao, ClassLoader loader, Config config) throws ClassNotFoundException {
        this.sessao = sessao;
        this.config = config;
        for (String nome : config.classes()) {
            Class<?> c = Class.forName(nome, false, loader);
            if (!c.isInterface() && !c.isAnnotation() && !Modifier.isAbstract(c.getModifiers())
                    && AnnotatedElementUtils.hasAnnotation(c, Component.class)) {
                componentes.add(c);
            }
        }
    }

    Map<String, Object> executar(Saida saida) {
        Map<String, Object> erro = null;
        boolean todosOk = true;
        try {
            prepararRotas();
            if (rotas.isEmpty()) {
                erro = Executor.erro("A loja ainda não tem nenhum atendente! Crie uma classe com @RestController "
                        + "e um método com @GetMapping.", 0);
            } else {
                for (PedidoConfig pedido : config.pedidos()) {
                    todosOk &= atender(pedido);
                }
            }
        } catch (Throwable t) {
            erro = Executor.erro(sessao, t instanceof InvocationTargetException ite ? ite.getCause() : t);
        }
        try {
            saida.terminar();
        } catch (Throwable t) {
            if (erro == null) {
                erro = Executor.erro(sessao, t);
            }
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("eventos", sessao.eventos());
        r.put("objetivos", List.of());
        r.put("sucesso", erro == null && todosOk);
        if (erro != null) {
            r.put("erro", erro);
        }
        return r;
    }

    // ---------------------------------------------------------------- criando os objetos (beans)

    private void prepararRotas() throws Exception {
        for (Class<?> c : componentes) {
            if (!AnnotatedElementUtils.hasAnnotation(c, Controller.class)) {
                continue;
            }
            Object dono = obter(c);
            RequestMapping base = AnnotatedElementUtils.findMergedAnnotation(c, RequestMapping.class);
            String[] prefixos = base == null || caminhos(base).length == 0 ? new String[] {""} : caminhos(base);
            for (Method m : c.getDeclaredMethods()) {
                RequestMapping rm = AnnotatedElementUtils.findMergedAnnotation(m, RequestMapping.class);
                if (rm == null) {
                    continue;
                }
                m.setAccessible(true);
                String[] fins = caminhos(rm).length == 0 ? new String[] {""} : caminhos(rm);
                RequestMethod[] verbos = rm.method().length == 0 ? new RequestMethod[] {null} : rm.method();
                for (String prefixo : prefixos) {
                    for (String fim : fins) {
                        String caminho = juntar(prefixo, fim);
                        for (RequestMethod verbo : verbos) {
                            rotas.add(new Rota(verbo == null ? null : verbo.name(), partes(caminho), caminho, dono, m));
                        }
                    }
                }
            }
        }
    }

    private static String[] caminhos(RequestMapping rm) {
        return rm.path().length > 0 ? rm.path() : rm.value();
    }

    private Object obter(Class<?> tipo) throws Exception {
        Object existente = objetos.get(tipo);
        if (existente != null) {
            return existente;
        }
        if (!criando.add(tipo)) {
            throw new ErroDoJogo("A classe " + tipo.getSimpleName()
                    + " precisa dela mesma para ser criada (um pede o outro em círculo)! O Spring não consegue resolver isso.");
        }
        Constructor<?> construtor = escolherConstrutor(tipo);
        construtor.setAccessible(true);
        Object[] args = new Object[construtor.getParameterCount()];
        Class<?>[] tipos = construtor.getParameterTypes();
        for (int i = 0; i < args.length; i++) {
            args[i] = obter(componentePara(tipos[i], tipo));
        }
        Object objeto;
        try {
            objeto = construtor.newInstance(args);
        } catch (InvocationTargetException e) {
            throw e.getCause() instanceof Exception ex ? ex : e;
        }
        for (Field f : tipo.getDeclaredFields()) {
            if (f.isAnnotationPresent(Autowired.class)) {
                f.setAccessible(true);
                f.set(objeto, obter(componentePara(f.getType(), tipo)));
            }
        }
        criando.remove(tipo);
        objetos.put(tipo, objeto);
        return objeto;
    }

    private static Constructor<?> escolherConstrutor(Class<?> tipo) {
        Constructor<?>[] todos = tipo.getDeclaredConstructors();
        if (todos.length == 1) {
            return todos[0];
        }
        for (Constructor<?> c : todos) {
            if (c.isAnnotationPresent(Autowired.class)) {
                return c;
            }
        }
        for (Constructor<?> c : todos) {
            if (c.getParameterCount() == 0) {
                return c;
            }
        }
        throw new ErroDoJogo("A classe " + tipo.getSimpleName()
                + " tem vários construtores e o Spring não sabe qual usar. Coloque @Autowired em um deles.");
    }

    private Class<?> componentePara(Class<?> pedido, Class<?> quemPediu) {
        for (Class<?> c : componentes) {
            if (pedido.isAssignableFrom(c)) {
                return c;
            }
        }
        throw new ErroDoJogo("A classe " + quemPediu.getSimpleName() + " precisa de um " + pedido.getSimpleName()
                + ", mas o Spring não achou nenhum. Você esqueceu de colocar @Service na classe "
                + pedido.getSimpleName() + "?");
    }

    // ---------------------------------------------------------------- atendendo pedidos

    private boolean atender(PedidoConfig pedido) {
        String metodoHttp = pedido.metodo() == null ? "GET" : pedido.metodo().toUpperCase();
        String caminhoCompleto = pedido.caminho();
        int interrogacao = caminhoCompleto.indexOf('?');
        String caminho = interrogacao >= 0 ? caminhoCompleto.substring(0, interrogacao) : caminhoCompleto;
        Map<String, String> query = interrogacao >= 0 ? lerQuery(caminhoCompleto.substring(interrogacao + 1)) : Map.of();

        Map<String, Object> e = sessao.evento("pedido");
        e.put("metodo", metodoHttp);
        e.put("caminho", caminhoCompleto);
        if (pedido.corpo() != null && !pedido.corpo().isNull()) {
            e.put("corpo", Executor.JSON.writeValueAsString(pedido.corpo()));
        }

        Resposta resposta = responder(metodoHttp, caminho, query, pedido.corpo(), e);
        String texto = textoDe(resposta.corpo());
        e.put("status", resposta.status());
        e.put("resposta", texto);

        int statusEsperado = pedido.status() == null ? 200 : pedido.status();
        boolean ok = resposta.status() == statusEsperado;
        String esperadoTexto = null;
        if (pedido.esperadoJson() != null && !pedido.esperadoJson().isNull()) {
            esperadoTexto = Executor.JSON.writeValueAsString(pedido.esperadoJson());
            ok &= jsonIgual(texto, pedido.esperadoJson());
        } else if (pedido.esperado() != null) {
            esperadoTexto = pedido.esperado();
            ok &= Mundo.parecidos(texto, pedido.esperado());
        }
        if (esperadoTexto != null) {
            e.put("esperado", esperadoTexto);
        }
        e.put("statusEsperado", statusEsperado);
        e.put("ok", ok);
        return ok;
    }

    private Resposta responder(String metodoHttp, String caminho, Map<String, String> query, JsonNode corpo,
                               Map<String, Object> evento) {
        String[] pedidoPartes = partes(caminho);
        boolean caminhoExiste = false;
        for (Rota rota : rotas) {
            Map<String, String> variaveis = casar(rota.partes(), pedidoPartes);
            if (variaveis == null) {
                continue;
            }
            caminhoExiste = true;
            if (rota.metodoHttp() != null && !rota.metodoHttp().equals(metodoHttp)) {
                continue;
            }
            evento.put("atendente", rota.dono().getClass().getSimpleName() + "." + rota.metodo().getName() + "()");
            return chamar(rota, variaveis, query, corpo);
        }
        if (caminhoExiste) {
            return new Resposta(405, "Esse endereço existe, mas não atende pedidos do tipo " + metodoHttp + ".");
        }
        return new Resposta(404, "Ninguém na loja atende o endereço " + caminho + " (erro 404: não encontrado).");
    }

    private Resposta chamar(Rota rota, Map<String, String> variaveis, Map<String, String> query, JsonNode corpo) {
        Parameter[] params = rota.metodo().getParameters();
        Object[] args = new Object[params.length];
        for (int i = 0; i < params.length; i++) {
            Parameter p = params[i];
            PathVariable pv = AnnotatedElementUtils.findMergedAnnotation(p, PathVariable.class);
            RequestParam rp = AnnotatedElementUtils.findMergedAnnotation(p, RequestParam.class);
            RequestBody rb = AnnotatedElementUtils.findMergedAnnotation(p, RequestBody.class);
            try {
                if (pv != null) {
                    String nome = pv.name().isEmpty() ? p.getName() : pv.name();
                    args[i] = converter(variaveis.get(nome), p.getType(), nome);
                } else if (rb != null) {
                    if (corpo == null || corpo.isNull()) {
                        return new Resposta(400, "Esse pedido precisava vir com um corpo (@RequestBody), mas veio vazio.");
                    }
                    JavaType tipo = Executor.JSON.getTypeFactory().constructType(p.getParameterizedType());
                    args[i] = Executor.JSON.convertValue(corpo, tipo);
                } else if (rp != null || simples(p.getType())) {
                    String nome = rp == null || rp.name().isEmpty() ? p.getName() : rp.name();
                    String valor = query.get(nome);
                    if (valor == null && rp != null && !ValueConstants.DEFAULT_NONE.equals(rp.defaultValue())) {
                        valor = rp.defaultValue();
                    }
                    if (valor == null) {
                        if (rp == null || rp.required()) {
                            return new Resposta(400, "Faltou o parâmetro \"" + nome + "\" no pedido (ex.: ?" + nome + "=...).");
                        }
                        args[i] = p.getType().isPrimitive() ? converter("0", p.getType(), nome) : null;
                    } else {
                        args[i] = converter(valor, p.getType(), nome);
                    }
                } else {
                    return new Resposta(500, "Não sei de onde tirar o parâmetro \"" + p.getName()
                            + "\". Use @PathVariable, @RequestParam ou @RequestBody.");
                }
            } catch (IllegalArgumentException ex) {
                return new Resposta(400, ex.getMessage());
            }
        }
        try {
            Object retorno = rota.metodo().invoke(rota.dono(), args);
            if (retorno instanceof ResponseEntity<?> re) {
                return new Resposta(re.getStatusCode().value(), re.getBody());
            }
            return new Resposta(200, retorno);
        } catch (InvocationTargetException ex) {
            Throwable causa = ex.getCause();
            if (causa instanceof Error err) {
                throw err;
            }
            if (causa instanceof ErroDoJogo erroDoJogo) {
                throw erroDoJogo;
            }
            Map<String, Object> erro = Executor.erro(sessao, causa);
            return new Resposta(500, "Erro 500 dentro do atendente: " + erro.get("mensagem")
                    + (erro.containsKey("linha") ? " (linha " + erro.get("linha") + ")" : ""));
        } catch (IllegalAccessException ex) {
            return new Resposta(500, "Não consegui chamar o método " + rota.metodo().getName() + ".");
        }
    }

    private static boolean simples(Class<?> t) {
        return t.isPrimitive() || t == String.class || t == Integer.class || t == Long.class
                || t == Double.class || t == Boolean.class;
    }

    private static Object converter(String valor, Class<?> tipo, String nome) {
        if (valor == null) {
            throw new IllegalArgumentException("Faltou o valor de \"" + nome + "\" no endereço.");
        }
        try {
            if (tipo == String.class) {
                return valor;
            } else if (tipo == int.class || tipo == Integer.class) {
                return Integer.parseInt(valor.trim());
            } else if (tipo == long.class || tipo == Long.class) {
                return Long.parseLong(valor.trim());
            } else if (tipo == double.class || tipo == Double.class) {
                return Double.parseDouble(valor.trim());
            } else if (tipo == boolean.class || tipo == Boolean.class) {
                return Boolean.parseBoolean(valor.trim());
            }
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("O valor \"" + valor + "\" de \"" + nome + "\" deveria ser um número (erro 400).");
        }
        throw new IllegalArgumentException("Não sei transformar \"" + valor + "\" em " + tipo.getSimpleName() + ".");
    }

    // ---------------------------------------------------------------- caminhos e textos

    private static String juntar(String a, String b) {
        String s = ("/" + a + "/" + b).replaceAll("/+", "/");
        return s.length() > 1 && s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private static String[] partes(String caminho) {
        String limpo = caminho.replaceAll("^/+|/+$", "");
        return limpo.isEmpty() ? new String[0] : limpo.split("/+");
    }

    private static Map<String, String> casar(String[] modelo, String[] pedido) {
        if (modelo.length != pedido.length) {
            return null;
        }
        Map<String, String> variaveis = new LinkedHashMap<>();
        for (int i = 0; i < modelo.length; i++) {
            String m = modelo[i];
            String valor = URLDecoder.decode(pedido[i], StandardCharsets.UTF_8);
            if (m.startsWith("{") && m.endsWith("}")) {
                String nome = m.substring(1, m.length() - 1);
                int doisPontos = nome.indexOf(':');
                variaveis.put(doisPontos >= 0 ? nome.substring(0, doisPontos) : nome, valor);
            } else if (!m.equals(valor)) {
                return null;
            }
        }
        return variaveis;
    }

    private static Map<String, String> lerQuery(String query) {
        Map<String, String> r = new LinkedHashMap<>();
        for (String par : query.split("&")) {
            if (par.isEmpty()) {
                continue;
            }
            int igual = par.indexOf('=');
            String k = igual >= 0 ? par.substring(0, igual) : par;
            String v = igual >= 0 ? par.substring(igual + 1) : "";
            r.put(URLDecoder.decode(k, StandardCharsets.UTF_8), URLDecoder.decode(v, StandardCharsets.UTF_8));
        }
        return r;
    }

    private static String textoDe(Object corpo) {
        if (corpo == null) {
            return "";
        }
        if (corpo instanceof CharSequence cs) {
            return cs.toString();
        }
        return Executor.JSON.writeValueAsString(corpo);
    }

    private static boolean jsonIgual(String texto, JsonNode esperado) {
        try {
            JsonNode recebido = Executor.JSON.readTree(texto);
            return Executor.JSON.readTree(Executor.JSON.writeValueAsString(esperado)).equals(recebido);
        } catch (RuntimeException e) {
            return false;
        }
    }
}
