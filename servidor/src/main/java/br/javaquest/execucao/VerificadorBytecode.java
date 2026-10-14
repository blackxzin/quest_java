package br.javaquest.execucao;

import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Confere os .class compilados antes de rodar: o código do aluno só pode usar uma lista de
 * classes "seguras" (String, Math, listas, o Robo, as anotações do Spring...). Assim ninguém
 * consegue mexer em arquivos, internet ou outros programas a partir do JavaQuest.
 *
 * <p>A conferência é feita no bytecode (e não no texto do código) para não dar para enganar
 * escrevendo as coisas de um jeito esquisito.
 */
public class VerificadorBytecode {

    private static final Set<String> CLASSES_JAVA_LANG = Set.of(
            "Object", "String", "StringBuilder", "CharSequence", "Math", "StrictMath", "Integer", "Long", "Double",
            "Float", "Short", "Byte", "Boolean", "Character", "Number", "Enum", "Record", "Iterable", "Comparable",
            "Override", "FunctionalInterface", "Deprecated", "SuppressWarnings", "SafeVarargs", "Throwable",
            "Exception", "RuntimeException", "Error", "IllegalArgumentException", "IllegalStateException",
            "ArithmeticException", "IndexOutOfBoundsException", "ArrayIndexOutOfBoundsException",
            "StringIndexOutOfBoundsException", "NullPointerException", "NumberFormatException",
            "UnsupportedOperationException", "ClassCastException", "CloneNotSupportedException", "MatchException",
            "AutoCloseable", "Runnable", "Void", "Character$UnicodeBlock", "System");

    private static final Set<String> MEMBROS_SYSTEM = Set.of(
            "out", "currentTimeMillis", "nanoTime", "arraycopy", "lineSeparator", "identityHashCode");

    private static final Set<String> MEMBROS_PROIBIDOS = Set.of(
            "java/lang/Integer.getInteger", "java/lang/Long.getLong", "java/lang/Boolean.getBoolean",
            "java/lang/Object.wait", "java/lang/Object.notify", "java/lang/Object.notifyAll",
            "java/lang/Object.finalize", "java/util/stream/BaseStream.parallel",
            "java/util/Collection.parallelStream", "java/util/List.parallelStream",
            "java/util/ArrayList.parallelStream", "java/util/Arrays.parallelSort");

    private static final List<String> PACOTES_PERMITIDOS = List.of(
            "java/util/function/", "java/util/stream/",
            "org/springframework/web/bind/annotation/", "org/springframework/stereotype/",
            "org/springframework/beans/factory/annotation/");

    private static final Set<String> CLASSES_PERMITIDAS = Set.of(
            "jogo/Robo", "java/io/PrintStream",
            "java/util/List", "java/util/ArrayList", "java/util/LinkedList", "java/util/Map", "java/util/HashMap",
            "java/util/LinkedHashMap", "java/util/TreeMap", "java/util/Map$Entry", "java/util/Set",
            "java/util/HashSet", "java/util/LinkedHashSet", "java/util/TreeSet", "java/util/Collection",
            "java/util/Collections", "java/util/Arrays", "java/util/Iterator", "java/util/Objects",
            "java/util/Optional", "java/util/Random", "java/util/Deque", "java/util/ArrayDeque",
            "java/util/Queue", "java/util/Comparator", "java/util/StringJoiner", "java/util/NoSuchElementException",
            "java/util/AbstractMap$SimpleEntry",
            "org/springframework/http/ResponseEntity", "org/springframework/http/ResponseEntity$BodyBuilder",
            "org/springframework/http/ResponseEntity$HeadersBuilder", "org/springframework/http/HttpStatus",
            "org/springframework/http/HttpStatusCode",
            // Usadas pelo próprio javac para juntar textos (+), lambdas, records e switch.
            "java/lang/invoke/MethodHandles", "java/lang/invoke/MethodHandles$Lookup", "java/lang/invoke/MethodHandle", "java/lang/invoke/MethodType",
            "java/lang/invoke/StringConcatFactory", "java/lang/invoke/LambdaMetafactory",
            "java/lang/runtime/ObjectMethods", "java/lang/runtime/SwitchBootstraps", "java/lang/invoke/CallSite",
            "java/lang/invoke/TypeDescriptor");

    /** Métodos de java/lang/invoke e java/lang/runtime que só o javac usa (como "bootstrap"). */
    private static final Set<String> BOOTSTRAPS = Set.of(
            "java/lang/invoke/StringConcatFactory.makeConcatWithConstants",
            "java/lang/invoke/LambdaMetafactory.metafactory", "java/lang/invoke/LambdaMetafactory.altMetafactory",
            "java/lang/runtime/ObjectMethods.bootstrap", "java/lang/runtime/SwitchBootstraps.typeSwitch",
            "java/lang/runtime/SwitchBootstraps.enumSwitch");

    private record Membro(String dono, String nome) {}

    /**
     * Confere todas as classes. Devolve o nome da primeira coisa proibida encontrada, se houver.
     *
     * @param permitirSpringApplication na Loja o aluno pode escrever o main do Spring Boot (ele não roda).
     */
    public Optional<String> verificar(Path pasta, List<String> classes, boolean permitirSpringApplication)
            throws IOException {
        Set<String> doAluno = new java.util.HashSet<>();
        for (String c : classes) {
            doAluno.add(c.replace('.', '/'));
        }
        for (String c : classes) {
            Path arquivo = pasta.resolve(c.replace('.', '/') + ".class");
            Optional<String> problema;
            try (InputStream in = Files.newInputStream(arquivo)) {
                problema = verificarClasse(in, doAluno, permitirSpringApplication);
            }
            if (problema.isPresent()) {
                return problema;
            }
        }
        return Optional.empty();
    }

    private Optional<String> verificarClasse(InputStream bytes, Set<String> doAluno, boolean spring) throws IOException {
        DataInputStream in = new DataInputStream(bytes);
        if (in.readInt() != 0xCAFEBABE) {
            return Optional.of("arquivo estranho");
        }
        in.readUnsignedShort();
        in.readUnsignedShort();
        int total = in.readUnsignedShort();
        Object[] pool = new Object[total];
        int[] tags = new int[total];
        for (int i = 1; i < total; i++) {
            int tag = in.readUnsignedByte();
            tags[i] = tag;
            switch (tag) {
                case 1 -> pool[i] = in.readUTF();
                case 3, 4 -> in.readInt();
                case 5, 6 -> {
                    in.readLong();
                    i++;
                }
                case 7, 8, 16, 19, 20 -> pool[i] = in.readUnsignedShort();
                case 9, 10, 11, 12, 17, 18 -> pool[i] = new int[] {in.readUnsignedShort(), in.readUnsignedShort()};
                case 15 -> {
                    in.readUnsignedByte();
                    pool[i] = in.readUnsignedShort();
                }
                default -> {
                    return Optional.of("arquivo estranho");
                }
            }
        }
        // Os métodos usados só como bootstrap (por invokedynamic) são liberados.
        Set<Integer> referenciasDeBootstrap = new java.util.HashSet<>();
        for (int i = 1; i < total; i++) {
            if (tags[i] == 15) {
                referenciasDeBootstrap.add((Integer) pool[i]);
            }
        }
        List<String> classesUsadas = new ArrayList<>();
        for (int i = 1; i < total; i++) {
            if (tags[i] == 7) {
                classesUsadas.add((String) pool[(Integer) pool[i]]);
            }
        }
        for (String nome : classesUsadas) {
            String limpo = semArray(nome);
            if (limpo != null && !classePermitida(limpo, doAluno, spring)) {
                return Optional.of(paraJava(limpo));
            }
        }
        for (int i = 1; i < total; i++) {
            if (tags[i] == 9 || tags[i] == 10 || tags[i] == 11) {
                int[] ref = (int[]) pool[i];
                String dono = semArray((String) pool[(Integer) pool[ref[0]]]);
                int[] nomeETipo = (int[]) pool[ref[1]];
                Membro m = new Membro(dono, (String) pool[nomeETipo[0]]);
                Optional<String> problema = verificarMembro(m, doAluno, spring, referenciasDeBootstrap.contains(i));
                if (problema.isPresent()) {
                    return problema;
                }
            }
        }
        return Optional.empty();
    }

    private Optional<String> verificarMembro(Membro m, Set<String> doAluno, boolean spring, boolean bootstrap) {
        if (m.dono() == null || doAluno.contains(m.dono())) {
            return Optional.empty();
        }
        String completo = m.dono() + "." + m.nome();
        if (m.dono().startsWith("java/lang/invoke/") || m.dono().startsWith("java/lang/runtime/")) {
            return bootstrap && BOOTSTRAPS.contains(completo) ? Optional.empty() : Optional.of(paraJava(m.dono()));
        }
        if (m.dono().equals("java/lang/System") && !MEMBROS_SYSTEM.contains(m.nome())) {
            return Optional.of("System." + m.nome());
        }
        if (m.dono().equals("org/springframework/boot/SpringApplication")) {
            return spring && m.nome().equals("run") ? Optional.empty() : Optional.of("SpringApplication." + m.nome());
        }
        if (MEMBROS_PROIBIDOS.contains(completo) || m.nome().equals("parallelStream") || m.nome().equals("parallel")) {
            return Optional.of(paraJava(m.dono()) + "." + m.nome());
        }
        return Optional.empty();
    }

    private boolean classePermitida(String nome, Set<String> doAluno, boolean spring) {
        if (doAluno.contains(nome) || CLASSES_PERMITIDAS.contains(nome)) {
            return true;
        }
        if (nome.startsWith("java/lang/") && nome.indexOf('/', "java/lang/".length()) < 0) {
            return CLASSES_JAVA_LANG.contains(nome.substring("java/lang/".length()));
        }
        if (spring && nome.equals("org/springframework/boot/SpringApplication")) {
            return true;
        }
        return PACOTES_PERMITIDOS.stream().anyMatch(nome::startsWith);
    }

    /** "[[Ljava/lang/String;" vira "java/lang/String"; arrays de tipos primitivos viram null (são sempre ok). */
    private static String semArray(String nome) {
        if (nome == null || !nome.startsWith("[")) {
            return nome;
        }
        String s = nome.replaceFirst("^\\[+", "");
        return s.startsWith("L") && s.endsWith(";") ? s.substring(1, s.length() - 1) : null;
    }

    private static String paraJava(String nome) {
        return nome.replace('/', '.').replace('$', '.');
    }
}
