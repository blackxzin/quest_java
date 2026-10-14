package br.javaquest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.stream.Stream;

import br.javaquest.execucao.ExecucaoService;
import br.javaquest.execucao.ExecucaoService.Resultado;
import br.javaquest.licoes.Licao;
import br.javaquest.licoes.LicaoService;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Garante que toda lição pode ser resolvida (a solução funciona) e que o código inicial ainda não resolve. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class LicoesTest {

    @Autowired
    LicaoService licoes;

    @Autowired
    ExecucaoService execucao;

    @TestFactory
    Stream<DynamicTest> solucoesFuncionam() {
        return licoes.modulos().stream().flatMap(m -> m.licoes().stream()).map(l -> DynamicTest.dynamicTest(
                "solução de " + l.id(), () -> {
                    assertNotNull(l.solucao(), "lição sem solução");
                    Resultado r = execucao.executar(l, l.solucao());
                    assertEquals("sucesso", r.status(), () -> l.id() + ": " + r.mensagem() + " " + r.erros() + " " + r.mundos());
                }));
    }

    @TestFactory
    Stream<DynamicTest> codigoInicialAindaNaoResolve() {
        return licoes.modulos().stream().flatMap(m -> m.licoes().stream()).filter(l -> !l.livre())
                .map(l -> DynamicTest.dynamicTest("código inicial de " + l.id(), () -> {
                    Resultado r = execucao.executar(l, l.codigoInicial());
                    assertNotEquals("sucesso", r.status(), l.id() + " já começa resolvida");
                    assertNotEquals("erroInterno", r.status(), () -> l.id() + ": " + r.mensagem());
                }));
    }

    @TestFactory
    Stream<DynamicTest> licoesBemEscritas() {
        return licoes.modulos().stream().flatMap(m -> m.licoes().stream()).map(l -> DynamicTest.dynamicTest(
                "conteúdo de " + l.id(), () -> {
                    assertNotNull(l.titulo());
                    assertNotNull(l.explicacao(), "falta explicação");
                    assertNotNull(l.dica(), "falta dica");
                    assertNotNull(l.historia(), "falta história");
                    if (!l.eLoja()) {
                        assertTrue(!l.mundos().isEmpty(), "lição de mapa sem mapa");
                        for (Licao.Mundo mundo : l.mundos()) {
                            int largura = mundo.mapa().get(0).length();
                            for (String linha : mundo.mapa()) {
                                assertEquals(largura, linha.length(), "mapa torto: " + linha);
                            }
                        }
                    } else {
                        assertTrue(!l.pedidos().isEmpty(), "loja sem pedidos");
                    }
                }));
    }
}
