package jogo.interno;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Recebe o que o aluno escreve com System.out.println e transforma cada linha num evento. */
final class Saida extends OutputStream {

    private final ByteArrayOutputStream linha = new ByteArrayOutputStream();

    @Override
    public void write(int b) {
        if (b == '\n') {
            terminarLinha();
        } else if (b != '\r') {
            linha.write(b);
            if (linha.size() > 2000) {
                terminarLinha();
            }
        }
    }

    @Override
    public void flush() {
        // As linhas viram eventos só quando terminam (ou no fim do programa).
    }

    void terminar() {
        if (linha.size() > 0) {
            terminarLinha();
        }
    }

    private void terminarLinha() {
        String texto = linha.toString(StandardCharsets.UTF_8);
        linha.reset();
        Sessao sessao = Sessao.atual();
        if (sessao != null) {
            sessao.imprimir(texto);
        }
    }
}
