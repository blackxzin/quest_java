package br.javaquest.api;

import java.io.IOException;
import java.util.List;

import br.javaquest.execucao.ExecucaoService;
import br.javaquest.execucao.ExecucaoService.Resultado;
import br.javaquest.licoes.Licao;
import br.javaquest.licoes.LicaoService;
import br.javaquest.licoes.Modulo;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * A API do JavaQuest. (Curiosidade: este arquivo usa as mesmas anotações que você aprende
 * na Loja do Robô — @RestController, @GetMapping, @PostMapping e @RequestBody!)
 */
@RestController
@RequestMapping("/api")
public class ApiController {

    public record PedidoExecucao(String licao, String codigo) {}

    private final LicaoService licoes;
    private final ExecucaoService execucao;

    public ApiController(LicaoService licoes, ExecucaoService execucao) {
        this.licoes = licoes;
        this.execucao = execucao;
    }

    @GetMapping("/modulos")
    public List<Modulo> modulos() {
        return licoes.modulos();
    }

    @PostMapping("/executar")
    public Resultado executar(@RequestBody PedidoExecucao pedido) throws IOException, InterruptedException {
        Licao licao = licoes.licao(pedido.licao())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lição não encontrada"));
        return execucao.executar(licao, pedido.codigo());
    }
}
