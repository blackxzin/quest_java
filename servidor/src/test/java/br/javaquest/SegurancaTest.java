package br.javaquest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.javaquest.execucao.ExecucaoService;
import br.javaquest.execucao.ExecucaoService.Resultado;
import br.javaquest.licoes.Licao;
import br.javaquest.licoes.LicaoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** O código do aluno não pode mexer no computador do servidor, e os erros precisam ser amigáveis. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class SegurancaTest {

    @Autowired
    LicaoService licoes;

    @Autowired
    ExecucaoService execucao;

    private Resultado rodarCorpo(String codigo) throws Exception {
        return execucao.executar(licoes.licao("ola-byte").orElseThrow(), codigo);
    }

    private Resultado rodarCompleto(String codigo) throws Exception {
        Licao base = licoes.licao("ola-byte").orElseThrow();
        Licao completa = new Licao(base.id(), base.titulo(), base.tipo(), "completo", base.historia(),
                base.explicacao(), base.dica(), base.codigoInicial(), base.solucao(), base.direcao(), null,
                base.mundos(), base.objetivos(), base.requisitos(), base.pedidos(), base.maxAcoes(), false, false);
        return execucao.executar(completa, codigo);
    }

    @Test
    void naoDeixaRodarOutrosProgramas() throws Exception {
        Resultado r = rodarCorpo("try { Runtime.getRuntime().exec(\"ls\"); } catch (Exception e) { }");
        assertEquals("bloqueado", r.status(), r.mensagem());
    }

    @Test
    void naoDeixaMexerEmArquivos() throws Exception {
        Resultado r = rodarCorpo("try { java.nio.file.Files.readString(java.nio.file.Path.of(\"/etc/passwd\")); } catch (Exception e) { }");
        assertEquals("bloqueado", r.status(), r.mensagem());
        r = rodarCorpo("new java.io.File(\"x\").delete();");
        assertEquals("bloqueado", r.status(), r.mensagem());
    }

    @Test
    void naoDeixaSairDoPrograma() throws Exception {
        assertEquals("bloqueado", rodarCorpo("System.exit(0);").status());
        assertEquals("bloqueado", rodarCorpo("System.getenv(\"HOME\");").status());
        assertEquals("bloqueado", rodarCorpo("new Thread(() -> {}).start();").status());
    }

    @Test
    void naoDeixaUsarReflexao() throws Exception {
        Resultado r = rodarCorpo("robo.getClass().getClassLoader();");
        assertEquals("bloqueado", r.status(), r.mensagem());
        r = rodarCorpo("String.class.getDeclaredMethods();");
        assertEquals("bloqueado", r.status(), r.mensagem());
        r = rodarCorpo("java.lang.invoke.MethodHandles.lookup();");
        assertEquals("bloqueado", r.status(), r.mensagem());
    }

    @Test
    void naoEnganaComUnicode() throws Exception {
        // R = R: o javac transforma antes de compilar, mas a verificação é no bytecode.
        Resultado r = rodarCorpo("\\u0052untime.getRuntime().halt(0);");
        assertEquals("bloqueado", r.status(), r.mensagem());
    }

    @Test
    void loopInfinitoComRoboParaSozinho() throws Exception {
        Resultado r = rodarCorpo("while (true) { robo.virarDireita(); }");
        assertEquals("falhou", r.status());
        assertTrue(r.mensagem().contains("loop"), r.mensagem());
    }

    @Test
    void loopInfinitoSemRoboEhParado() throws Exception {
        Resultado r = rodarCorpo("int x = 0; while (true) { x++; }");
        assertEquals("tempoEsgotado", r.status(), r.mensagem());
    }

    @Test
    void permiteCoisasNormais() throws Exception {
        Resultado r = rodarCorpo("""
                List<Integer> l = new ArrayList<>(List.of(3, 1, 2));
                Collections.sort(l);
                String s = "moedas: " + l + " " + Math.max(1, 2);
                Runnable r = () -> System.out.println(s);
                r.run();
                record Ponto(int x, int y) {}
                System.out.println(new Ponto(1, 2));
                for (int i = 0; i < 4; i++) robo.andar();
                """);
        assertEquals("sucesso", r.status(), r.mensagem() + r.erros());
    }

    @Test
    void erroDePontoEVirgula() throws Exception {
        Resultado r = rodarCorpo("robo.andar()\nrobo.andar();");
        assertEquals("erroCompilacao", r.status());
        assertEquals(1, r.erros().get(0).linha());
        assertTrue(r.erros().get(0).mensagem().contains("ponto e vírgula"), r.erros().get(0).mensagem());
    }

    @Test
    void erroDeMaiuscula() throws Exception {
        Resultado r = rodarCorpo("robo.andar();\nrobo.Andar();");
        assertEquals(2, r.erros().get(0).linha());
        assertTrue(r.erros().get(0).mensagem().contains("maiúsculas"), r.erros().get(0).mensagem());
    }

    @Test
    void erroDeDigitacao() throws Exception {
        Resultado r = rodarCorpo("robo.anda();");
        assertTrue(r.erros().get(0).mensagem().contains("andar"), r.erros().get(0).mensagem());
    }

    @Test
    void chaveFaltando() throws Exception {
        Resultado r = rodarCorpo("for (int i = 0; i < 4; i++) {\n  robo.andar();\n");
        assertEquals("erroCompilacao", r.status());
        assertTrue(r.mensagem().contains("chave"), r.mensagem());
    }

    @Test
    void baterNaParedeMostraALinha() throws Exception {
        Resultado r = rodarCorpo("robo.andar();\nrobo.virarEsquerda();\nrobo.andar();");
        assertEquals("falhou", r.status());
        assertTrue(r.mensagem().startsWith("Linha 3"), r.mensagem());
    }

    @Test
    void esqueceuImport() throws Exception {
        Resultado r = rodarCompleto("public class Missao { public static void main(String[] a) { Robo r = new Robo(); } }");
        assertTrue(r.mensagem().contains("import jogo"), r.mensagem());
    }

    @Test
    void classePublicaComOutroNome() throws Exception {
        Resultado r = rodarCompleto("""
                import jogo.*;
                public class MeuPrograma {
                    public static void main(String[] args) {
                        Robo r = new Robo();
                        for (int i = 0; i < 4; i++) r.andar();
                    }
                }
                """);
        assertEquals("sucesso", r.status(), r.mensagem());
    }
}
