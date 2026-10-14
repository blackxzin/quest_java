package br.javaquest.execucao;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import br.javaquest.execucao.Compilador.Diagnostico;

/**
 * Traduz os erros do compilador Java (em inglês) para mensagens curtas e amigáveis,
 * com dicas do que provavelmente aconteceu.
 */
public class TradutorErros {

    public record ErroAmigavel(long linha, long coluna, String mensagem, String original) {}

    private static final Pattern SIMBOLO = Pattern.compile("symbol:\\s+(\\w+)\\s+([\\w$]+)");
    private static final Pattern LOCAL = Pattern.compile("location:\\s+(?:variable \\w+ of type |class |interface )?([\\w.$<>]+)");
    private static final Pattern TIPOS = Pattern.compile("incompatible types: (?:possible lossy conversion from )?([\\w.<>\\[\\]]+) (?:cannot be converted )?to ([\\w.<>\\[\\]]+)");
    private static final Pattern ESPERADO = Pattern.compile("^'(.+)' expected");
    private static final Pattern VARIAVEL = Pattern.compile("variable (\\w+)");
    private static final Pattern METODO_APLICADO = Pattern.compile("(method|constructor) (\\w+) in (?:class|interface|enum|record) ([\\w.$]+) cannot be applied");
    private static final Pattern SEM_METODO = Pattern.compile("no suitable (?:method|constructor) found for (\\w+)");
    private static final Pattern NAO_ABSTRATA = Pattern.compile("(\\w+) is not abstract and does not override abstract method (\\w+)\\((.*?)\\) in (\\w+)");
    private static final Pattern NAO_ESTATICO = Pattern.compile("non-static (method|variable) (\\w+)");
    private static final Pattern DEREF = Pattern.compile("(\\w+) cannot be dereferenced");
    private static final Pattern OPERADOR = Pattern.compile("bad operand types? for (?:binary|unary) operator '(.+?)'");

    private static final List<String> COMANDOS_ROBO = List.of(
            "andar", "virarEsquerda", "virarDireita", "pegarMoeda", "falar", "temMoeda", "frenteLivre",
            "esquerdaLivre", "direitaLivre", "chegou", "getMoedas", "getNome");

    private static final List<String> PALAVRAS_JAVA = List.of(
            "System", "out", "println", "print", "String", "Robo", "Math", "ArrayList", "List", "Map", "HashMap",
            "Integer", "length", "size", "add", "get", "equals", "main", "args", "true", "false",
            "RestController", "GetMapping", "PostMapping", "PathVariable", "RequestParam", "RequestBody",
            "Service", "Autowired", "RequestMapping", "ResponseEntity", "Override");

    /**
     * @param linhasUsuario quantas linhas o código do aluno tem (para não apontar para linhas escondidas)
     * @param offset quantas linhas escondidas vêm antes do código do aluno (modo "corpo")
     */
    public List<ErroAmigavel> traduzir(List<Diagnostico> diagnosticos, String codigoAluno, int offset, boolean corpo) {
        int linhasUsuario = Math.max(1, codigoAluno.split("\n", -1).length);
        Set<String> vistos = new LinkedHashSet<>();
        return diagnosticos.stream()
                .map(d -> {
                    long linha = d.linha() - offset;
                    long coluna = d.coluna();
                    if (linha < 1) {
                        linha = 1;
                        coluna = 1;
                    } else if (linha > linhasUsuario) {
                        linha = linhasUsuario;
                        coluna = 1;
                    }
                    return new ErroAmigavel(linha, coluna, mensagem(d, codigoAluno, corpo), d.mensagem());
                })
                .filter(e -> vistos.add(e.linha() + ":" + e.mensagem()))
                .sorted(Comparator.comparingLong(ErroAmigavel::linha))
                .limit(5)
                .toList();
    }

    String mensagem(Diagnostico d, String codigo, boolean corpo) {
        String msg = d.mensagem();
        String primeira = msg.lines().findFirst().orElse(msg);
        Matcher m;

        if ((m = ESPERADO.matcher(primeira)).find()) {
            return switch (m.group(1)) {
                case ";" -> "Faltou o ponto e vírgula ; no final do comando. No Java, todo comando termina com ; "
                        + "(é como o ponto final de uma frase!).";
                case ")" -> "Faltou fechar um parêntese ). Cada ( precisa do seu ).";
                case "(" -> "Faltou abrir um parêntese ( aqui.";
                case "]" -> "Faltou fechar um colchete ].";
                case "{" -> "Faltou abrir uma chave { aqui.";
                case "}" -> "Faltou fechar uma chave }.";
                case "<identifier>" -> corpo
                        ? "Tem algo fora do lugar aqui. Confira se você escreveu o comando direitinho, tipo: robo.andar();"
                        : "O Java esperava um nome aqui (de variável, método ou classe). Será que tem comando fora de um método?";
                case "class, interface, enum, or record" -> "Tem uma chave } sobrando, ou um código fora da classe. "
                        + "Confira se cada { tem só um }.";
                default -> "O Java esperava encontrar " + m.group(1) + " aqui.";
            };
        }
        if (primeira.startsWith("class, interface, enum, or record expected")) {
            return "Tem uma chave } sobrando, ou um código fora da classe. Confira se cada { tem só um }.";
        }
        if (primeira.startsWith("reached end of file while parsing")) {
            return "O programa acabou antes da hora: faltou fechar uma chave }. Cada { precisa do seu }.";
        }
        if (primeira.startsWith("cannot find symbol")) {
            return simboloDesconhecido(msg, codigo, corpo);
        }
        if ((m = TIPOS.matcher(primeira)).find()) {
            String de = nomeTipo(m.group(1));
            String para = nomeTipo(m.group(2));
            if (primeira.contains("lossy")) {
                return "Você tentou guardar um " + de + " numa caixinha de " + para
                        + ". Os números depois da vírgula iriam se perder!";
            }
            return "Tipos que não combinam: você tentou usar " + de + " onde o Java esperava " + para + ".";
        }
        if (primeira.startsWith("not a statement")) {
            return "Isso não é um comando completo. Se for um comando do robô, não esqueça dos parênteses: robo.andar();";
        }
        if (primeira.startsWith("unclosed string literal")) {
            return "Você abriu aspas \" e esqueceu de fechar. Todo texto fica entre duas aspas: \"assim\".";
        }
        if (primeira.startsWith("unclosed character literal") || primeira.startsWith("illegal line end in character literal")
                || primeira.startsWith("empty character literal")) {
            return "Em Java, texto usa aspas duplas: \"assim\". Aspas simples (') são só para uma letra sozinha, como 'a'.";
        }
        if (primeira.startsWith("missing return statement")) {
            return "Esse método prometeu devolver um valor, mas está faltando o return no final.";
        }
        if (primeira.contains("might not have been initialized") && (m = VARIAVEL.matcher(primeira)).find()) {
            return "A caixinha \"" + m.group(1) + "\" ainda está vazia! Dê um valor para ela antes de usar, tipo: "
                    + m.group(1) + " = 0;";
        }
        if (primeira.contains("is already defined") && (m = VARIAVEL.matcher(primeira)).find()) {
            return "Já existe uma variável chamada \"" + m.group(1) + "\" aqui. Use outro nome, ou tire o tipo "
                    + "(int, String...) para só mudar o valor dela.";
        }
        if (primeira.contains("is already defined")) {
            return "Já existe alguma coisa com esse nome aqui. Escolha outro nome.";
        }
        if ((m = METODO_APLICADO.matcher(primeira)).find()) {
            String nome = m.group(2);
            if (m.group(1).equals("constructor")) {
                return "O construtor de " + nome + " não recebe esses valores. Confira o que vai entre os parênteses de new "
                        + nome + "(...).";
            }
            return "O comando " + nome + "(...) não aceita esses valores entre parênteses."
                    + (COMANDOS_ROBO.contains(nome) && !nome.equals("falar") ? " Tente " + nome + "() sem nada dentro." : "");
        }
        if ((m = SEM_METODO.matcher(primeira)).find()) {
            return "O comando " + m.group(1) + "(...) não aceita esses valores entre parênteses.";
        }
        if (primeira.startsWith("illegal start of expression") || primeira.startsWith("illegal start of type")) {
            if (corpo && codigo.matches("(?s).*\\b(static|public|private|void)\\b.*")) {
                return "Aqui você só pode escrever comandos. Métodos e classes vão aparecer mais para frente na aventura!";
            }
            return "Tem algo fora do lugar aqui. Confira os parênteses ( ), as chaves { } e os ponto e vírgulas ;.";
        }
        if ((m = NAO_ESTATICO.matcher(primeira)).find()) {
            return "O main é static, então ele só enxerga coisas static. Coloque static antes de \"" + m.group(2)
                    + "\" (ex.: static Robo robo = new Robo();).";
        }
        if ((m = NAO_ABSTRATA.matcher(primeira)).find()) {
            return "A classe " + m.group(1) + " prometeu (implements) que teria o método " + m.group(2) + "("
                    + m.group(3) + "), mas ele ainda não existe nela. Lembre de colocar public antes dele!";
        }
        if (primeira.startsWith("'else' without 'if'")) {
            return "Esse else está sozinho! Ele precisa vir logo depois do } de um if.";
        }
        if (primeira.startsWith("unreachable statement")) {
            return "Esse código nunca vai rodar: ele vem depois de um return (ou de um loop que nunca termina).";
        }
        if (primeira.contains("attempting to assign weaker access privileges")) {
            return "Para trocar (sobrescrever) um método da classe mãe, ele precisa continuar public. "
                    + "Escreva public antes, ex.: public void andar()";
        }
        if (primeira.startsWith("method does not override or implement a method from a supertype")) {
            return "Você colocou @Override, mas a classe mãe não tem um método com esse nome. Confira o nome e os parênteses.";
        }
        if (primeira.startsWith("invalid method declaration; return type required")) {
            return "Faltou dizer o que esse método devolve (use void se ele não devolve nada). "
                    + "Se era para ser um construtor, o nome precisa ser igualzinho ao da classe.";
        }
        if (primeira.startsWith("call to super must be first statement")) {
            return "O super(...) precisa ser a primeira coisa dentro do construtor.";
        }
        Matcher op = OPERADOR.matcher(primeira);
        boolean temOperador = op.find();
        if (primeira.startsWith("incomparable types") || temOperador) {
            String operador = temOperador ? op.group(1) : "";
            if (operador.equals("&&") || operador.equals("||") || operador.equals("!")) {
                return "O " + operador + " só funciona com perguntas de sim ou não (true/false).";
            }
            return "Essas duas coisas não combinam para usar " + (operador.isEmpty() ? "essa comparação" : operador)
                    + ". Para comparar textos, use .equals(), ex.: nome.equals(\"Byte\").";
        }
        if ((m = DEREF.matcher(primeira)).find()) {
            return "Um " + nomeTipo(m.group(1)) + " não tem comandos com ponto (.). Só objetos têm!";
        }
        if (primeira.startsWith("missing method body")) {
            return "Faltou o corpo do método: as chaves { } com os comandos dentro.";
        }
        if (primeira.contains("cannot assign a value to final variable")) {
            return "Essa variável é final (não pode mudar depois de receber um valor).";
        }
        if (primeira.contains("cannot return a value from method whose result type is void")) {
            return "Esse método é void (não devolve nada), então não pode ter return com valor.";
        }
        if (primeira.startsWith("duplicate class")) {
            return "Tem duas classes com o mesmo nome. Cada classe precisa de um nome diferente.";
        }
        if (primeira.contains("modifier") && primeira.contains("not allowed here")) {
            return "Essa palavra (" + primeira.replaceAll(".*modifier (\\w+).*", "$1") + ") não pode ser usada aqui.";
        }
        if (primeira.startsWith("unreported exception")) {
            return "Esse comando pode dar erro, e o Java exige que você trate isso com try/catch. "
                    + "Mas aqui no JavaQuest você não vai precisar dele!";
        }
        if (primeira.contains("does not take parameters")) {
            return "Isso não recebe valores entre parênteses.";
        }
        return "O Java encontrou um problema aqui. Confira essa linha com calma! (Mensagem do Java: " + primeira + ")";
    }

    private String simboloDesconhecido(String msg, String codigo, boolean corpo) {
        Matcher s = SIMBOLO.matcher(msg);
        if (!s.find()) {
            return "O Java não conhece essa palavra. Confira se está escrita certinho (maiúsculas e minúsculas contam!).";
        }
        String tipo = s.group(1);
        String nome = s.group(2);
        Matcher l = LOCAL.matcher(msg);
        String local = l.find() ? l.group(1) : "";

        if (tipo.equals("class")) {
            if (nome.equals("Robo")) {
                return "O Java não conhece o Robo! Coloque import jogo.*; na primeira linha do programa.";
            }
            if (nome.equals("string")) {
                return "Em Java é String, com S maiúsculo!";
            }
            if (Set.of("ArrayList", "List", "Map", "HashMap", "Arrays", "Set", "HashSet").contains(nome)) {
                return "O Java não conhece " + nome + " ainda. Coloque import java.util.*; no começo do programa.";
            }
            if (Set.of("RestController", "GetMapping", "PostMapping", "PathVariable", "RequestParam", "RequestBody",
                    "RequestMapping", "PutMapping", "DeleteMapping").contains(nome)) {
                return "O Java não conhece @" + nome
                        + ". Coloque import org.springframework.web.bind.annotation.*; no começo do programa.";
            }
            if (nome.equals("Service") || nome.equals("Component")) {
                return "O Java não conhece @" + nome + ". Coloque import org.springframework.stereotype.*; no começo.";
            }
            if (nome.equals("Autowired")) {
                return "O Java não conhece @Autowired. Coloque import org.springframework.beans.factory.annotation.*; no começo.";
            }
            if (nome.equals("ResponseEntity")) {
                return "O Java não conhece ResponseEntity. Coloque import org.springframework.http.*; no começo.";
            }
        }
        Optional<String> sugestao = sugerir(nome, codigo, tipo.equals("method") && local.contains("Robo"));
        if (sugestao.isPresent()) {
            String certo = sugestao.get();
            if (certo.equalsIgnoreCase(nome)) {
                return "Cuidado com maiúsculas e minúsculas! Você escreveu \"" + nome + "\", mas o certo é \"" + certo
                        + "\". Para o Java, A e a são letras diferentes.";
            }
            return "O Java não conhece \"" + nome + "\". Você quis dizer \"" + certo + "\"?";
        }
        return switch (tipo) {
            case "method" -> local.contains("Robo")
                    ? "O robô não conhece o comando \"" + nome + "\". Os comandos dele são: andar(), virarEsquerda(), "
                    + "virarDireita(), pegarMoeda(), falar(...), temMoeda(), frenteLivre(), chegou()..."
                    : "O Java não conhece o método \"" + nome + "\". Você já criou esse método?";
            case "variable" -> "O Java não conhece \"" + nome + "\". Você criou essa variável antes? Ex.: int "
                    + nome + " = 0;" + (corpo ? "" : " (Se ela está em outro método, ela não aparece aqui!)");
            case "class" -> "O Java não conhece a classe \"" + nome + "\". Confira o nome, ou se você criou essa classe.";
            default -> "O Java não conhece \"" + nome + "\". Confira se está escrito certinho.";
        };
    }

    private Optional<String> sugerir(String nome, String codigo, boolean soRobo) {
        Set<String> candidatos = new LinkedHashSet<>(COMANDOS_ROBO);
        if (!soRobo) {
            candidatos.addAll(PALAVRAS_JAVA);
            Matcher m = Pattern.compile("\\b[A-Za-z_]\\w*\\b").matcher(codigo);
            while (m.find()) {
                candidatos.add(m.group());
            }
        }
        candidatos.remove(nome);
        String melhor = null;
        int melhorDistancia = Integer.MAX_VALUE;
        for (String c : candidatos) {
            int d = c.equalsIgnoreCase(nome) ? 0 : distancia(c.toLowerCase(), nome.toLowerCase());
            if (d < melhorDistancia) {
                melhorDistancia = d;
                melhor = c;
            }
        }
        int limite = nome.length() <= 3 ? 1 : 2;
        return melhorDistancia <= limite ? Optional.ofNullable(melhor) : Optional.empty();
    }

    private static int distancia(String a, String b) {
        int[] anterior = new int[b.length() + 1];
        int[] atual = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            anterior[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            atual[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int custo = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                atual[j] = Math.min(Math.min(atual[j - 1] + 1, anterior[j] + 1), anterior[j - 1] + custo);
            }
            int[] t = anterior;
            anterior = atual;
            atual = t;
        }
        return anterior[b.length()];
    }

    private static String nomeTipo(String tipo) {
        return switch (tipo) {
            case "int", "long", "short", "byte" -> "número inteiro (" + tipo + ")";
            case "double", "float" -> "número com vírgula (" + tipo + ")";
            case "String", "java.lang.String" -> "texto (String)";
            case "boolean" -> "sim/não (boolean)";
            case "char" -> "letra (char)";
            case "void" -> "nada (void)";
            default -> tipo;
        };
    }
}
