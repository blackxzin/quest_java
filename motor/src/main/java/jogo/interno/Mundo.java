package jogo.interno;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jogo.interno.Config.MundoConfig;
import jogo.interno.Config.ObjetivoConfig;

/**
 * O mapa onde os robôs vivem. Símbolos do mapa:
 * <ul>
 *   <li>{@code #} parede</li>
 *   <li>{@code .} chão</li>
 *   <li>{@code R} onde um robô nasce</li>
 *   <li>{@code M} moeda</li>
 *   <li>{@code F} bandeira (o destino)</li>
 * </ul>
 */
public final class Mundo {

    static final int[] DX = {0, 1, 0, -1};
    static final int[] DY = {-1, 0, 1, 0};
    static final List<String> DIRECOES = List.of("norte", "leste", "sul", "oeste");
    static final Set<String> CORES = Set.of("azul", "vermelho", "verde", "amarelo", "roxo", "rosa", "laranja");
    private static final List<String> CORES_PADRAO = List.of("azul", "laranja", "verde", "roxo", "rosa", "amarelo", "vermelho");

    private static Mundo atual;

    private final Sessao sessao;
    private final int largura;
    private final int altura;
    private final boolean[][] parede;
    private final boolean[][] moeda;
    private final boolean[][] bandeira;
    private final List<int[]> inicios = new ArrayList<>();
    private final int direcaoInicial;
    private final int maxAcoes;
    private final List<RoboNoMapa> robos = new ArrayList<>();
    private final List<String> falas = new ArrayList<>();
    private int acoes;
    private int perguntas;

    private static final class RoboNoMapa {
        final String nome;
        int x;
        int y;
        int dir;
        int moedas;

        RoboNoMapa(String nome, int x, int y, int dir) {
            this.nome = nome;
            this.x = x;
            this.y = y;
            this.dir = dir;
        }
    }

    Mundo(Sessao sessao, MundoConfig config, int maxAcoes) {
        this.sessao = sessao;
        this.maxAcoes = maxAcoes > 0 ? maxAcoes : 1000;
        List<String> linhas = config.mapa();
        this.altura = linhas.size();
        this.largura = linhas.stream().mapToInt(String::length).max().orElse(0);
        this.parede = new boolean[altura][largura];
        this.moeda = new boolean[altura][largura];
        this.bandeira = new boolean[altura][largura];
        for (int y = 0; y < altura; y++) {
            String linha = linhas.get(y);
            for (int x = 0; x < largura; x++) {
                char c = x < linha.length() ? linha.charAt(x) : '#';
                switch (c) {
                    case '#' -> parede[y][x] = true;
                    case 'M' -> moeda[y][x] = true;
                    case 'F' -> bandeira[y][x] = true;
                    case 'R' -> inicios.add(new int[] {x, y});
                    default -> { }
                }
            }
        }
        int dir = DIRECOES.indexOf(config.direcao() == null ? "leste" : config.direcao());
        this.direcaoInicial = dir < 0 ? 1 : dir;
    }

    public static Mundo atual() {
        if (atual == null) {
            throw new ErroDoJogo("Nesta missão não tem mapa para robôs: o Byte está trabalhando na loja!");
        }
        return atual;
    }

    static void definir(Mundo mundo) {
        atual = mundo;
    }

    // ---------------------------------------------------------------- comandos

    public int criarRobo(String nome, String cor) {
        if (robos.size() >= inicios.size()) {
            throw new ErroDoJogo(inicios.size() == 1
                    ? "Este mapa só tem lugar para 1 robô! Use \"new Robo\" uma vez só."
                    : "Este mapa só tem lugar para " + inicios.size() + " robôs!");
        }
        String corFinal = cor == null ? CORES_PADRAO.get(robos.size() % CORES_PADRAO.size()) : cor.toLowerCase();
        if (!CORES.contains(corFinal)) {
            throw new ErroDoJogo("Não conheço a cor \"" + cor + "\". Tente: azul, vermelho, verde, amarelo, roxo, rosa ou laranja.");
        }
        int[] inicio = inicios.get(robos.size());
        RoboNoMapa r = new RoboNoMapa(nome, inicio[0], inicio[1], direcaoInicial);
        robos.add(r);
        int id = robos.size() - 1;
        Map<String, Object> e = sessao.evento("criar");
        e.put("robo", id);
        e.put("nome", nome);
        e.put("cor", corFinal);
        e.put("x", r.x);
        e.put("y", r.y);
        e.put("dir", DIRECOES.get(r.dir));
        return id;
    }

    public void andar(int id) {
        RoboNoMapa r = robo(id);
        contarAcao();
        int nx = r.x + DX[r.dir];
        int ny = r.y + DY[r.dir];
        if (eParede(nx, ny)) {
            evento("bater", id);
            throw new ErroDoJogo("Bum! " + r.nome + " bateu na parede. Confira se não faltou virar antes de andar.");
        }
        r.x = nx;
        r.y = ny;
        Map<String, Object> e = evento("andar", id);
        e.put("x", nx);
        e.put("y", ny);
    }

    public void virar(int id, int lado) {
        RoboNoMapa r = robo(id);
        contarAcao();
        r.dir = Math.floorMod(r.dir + lado, 4);
        evento("virar", id).put("dir", DIRECOES.get(r.dir));
    }

    public void pegarMoeda(int id) {
        RoboNoMapa r = robo(id);
        contarAcao();
        if (!moeda[r.y][r.x]) {
            evento("semMoeda", id);
            throw new ErroDoJogo("Ué, não tem moeda aqui! " + r.nome
                    + " ficou confuso. Só use pegarMoeda() quando estiver em cima de uma moeda.");
        }
        moeda[r.y][r.x] = false;
        r.moedas++;
        Map<String, Object> e = evento("pegar", id);
        e.put("x", r.x);
        e.put("y", r.y);
        e.put("total", r.moedas);
    }

    public void falar(int id, String texto) {
        robo(id);
        contarAcao();
        String curto = texto.length() > 200 ? texto.substring(0, 200) + "…" : texto;
        falas.add(curto);
        evento("falar", id).put("texto", curto);
    }

    // ---------------------------------------------------------------- perguntas (sensores)

    public boolean temMoeda(int id) {
        RoboNoMapa r = robo(id);
        contarPergunta();
        return moeda[r.y][r.x];
    }

    public boolean livre(int id, int lado) {
        RoboNoMapa r = robo(id);
        contarPergunta();
        int d = Math.floorMod(r.dir + lado, 4);
        return !eParede(r.x + DX[d], r.y + DY[d]);
    }

    public boolean chegou(int id) {
        RoboNoMapa r = robo(id);
        contarPergunta();
        return bandeira[r.y][r.x];
    }

    public int moedasDe(int id) {
        return robo(id).moedas;
    }

    // ---------------------------------------------------------------- objetivos

    List<Map<String, Object>> avaliar(List<ObjetivoConfig> objetivos) {
        List<Map<String, Object>> resultado = new ArrayList<>();
        for (ObjetivoConfig o : objetivos) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("tipo", o.tipo());
            r.put("ok", cumpriu(o));
            resultado.add(r);
        }
        return resultado;
    }

    private boolean cumpriu(ObjetivoConfig o) {
        return switch (o.tipo()) {
            case "chegar" -> todasBandeirasOcupadas();
            case "moedas" -> semMoedas();
            case "falar" -> falas.stream().anyMatch(f -> parecidos(f, o.texto()));
            case "imprimir" -> sessao.impressoes().stream().anyMatch(f -> parecidos(f, o.texto()));
            case "robos" -> robos.size() >= (o.quantidade() == null ? 1 : o.quantidade());
            default -> false;
        };
    }

    private boolean todasBandeirasOcupadas() {
        for (int y = 0; y < altura; y++) {
            for (int x = 0; x < largura; x++) {
                if (bandeira[y][x]) {
                    final int bx = x;
                    final int by = y;
                    if (robos.stream().noneMatch(r -> r.x == bx && r.y == by)) {
                        return false;
                    }
                }
            }
        }
        return !robos.isEmpty();
    }

    private boolean semMoedas() {
        for (boolean[] linha : moeda) {
            for (boolean m : linha) {
                if (m) {
                    return false;
                }
            }
        }
        return true;
    }

    boolean temRobos() {
        return !robos.isEmpty();
    }

    /** Compara textos sem ligar para maiúsculas, acentos, espaços extras ou pontuação no final. */
    static boolean parecidos(String a, String b) {
        return normalizar(a).equals(normalizar(b));
    }

    static String normalizar(String s) {
        if (s == null) {
            return "";
        }
        String semAcento = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.toLowerCase().trim().replaceAll("\\s+", " ").replaceAll("[.!?]+$", "").trim();
    }

    // ---------------------------------------------------------------- ajudantes

    private RoboNoMapa robo(int id) {
        return robos.get(id);
    }

    private boolean eParede(int x, int y) {
        return x < 0 || y < 0 || x >= largura || y >= altura || parede[y][x];
    }

    private Map<String, Object> evento(String tipo, int id) {
        Map<String, Object> e = sessao.evento(tipo);
        e.put("robo", id);
        return e;
    }

    private void contarAcao() {
        if (++acoes > maxAcoes) {
            throw new ErroDoJogo("Ufa! Os robôs fizeram mais de " + maxAcoes
                    + " ações e cansaram. Será que tem um loop que nunca termina?");
        }
    }

    private void contarPergunta() {
        if (++perguntas > 20_000) {
            throw new ErroDoJogo("O robô fez perguntas demais (mais de 20 mil!) sem sair do lugar. "
                    + "Será que tem um loop que nunca termina?");
        }
    }
}
