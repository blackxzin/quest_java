import type { Licao, Modulo } from '../api';
import { cabeca, executarComando, novoEstado, type Estado } from './motor.ts';

export type Meta = { texto: string; verificar: (e: Estado) => boolean };
export type Oficina = {
  licao: Licao; preparar: string[]; metas: Meta[];
  pergunta: string; alternativas: string[]; resposta: number; revisao: string; fonte: string;
};
const viu = (evento: string) => (e: Estado) => e.vistos.includes(evento);
const meta = (texto: string, verificar: Meta['verificar']): Meta => ({ texto, verificar });
const baseGit = ['git init', 'git add README.md', 'git commit -m "Início da aventura"'];
const baseDocker = ['docker pull nginx:alpine'];
const loja = ['docker build -t byte-loja:1.0 .'];
const branch = [...baseGit, 'git switch -c melhoria', 'git add Missao.java', 'git commit -m "Adiciona missão"', 'git switch main'];
const of = (id: string, titulo: string, historia: string, explicacao: string, dica: string,
  preparar: string[], solucao: string[], metas: Meta[], pergunta: string, alternativas: string[], resposta: number, revisao: string, desafio = false): Oficina => ({
  licao: { id, titulo, historia, explicacao, dica, solucao: solucao.join('\n'), codigoInicial: '', tipo: 'terminal', modo: 'corpo', mundos: [], pedidos: [], desafio, livre: false },
  preparar, metas, pergunta, alternativas, resposta, revisao,
  fonte: id.startsWith('git-') ? 'https://git-scm.com/docs' : 'https://docs.docker.com/get-started/',
});

const gitInicio = [
  of('git-iniciar', 'A máquina do tempo', 'Byte cansou de arquivos chamados final-agora-vai.java. Vamos dar uma memória ao projeto!',
    '### Seu primeiro repositório\nGit registra versões do projeto. Um **repositório** reúne arquivos e seu histórico.\n\nDigite `ls` para conhecer a pasta, `git init` para iniciar o repositório e `git status` para ver o que ainda não foi salvo.\n\nAqui a branch inicial se chama **main**. No Git real, o nome depende da configuração. Inicializar não cria um commit.',
    'Faça uma inspeção com ls, inicialize com git init e consulte git status.', [], ['ls', 'git init', 'git status'],
    [meta('Conhecer os arquivos da pasta', viu('ls')), meta('Inicializar o repositório', e => e.repo), meta('Consultar o estado do Git', viu('git:status'))],
    'O que git init faz?', ['Publica arquivos na internet', 'Cria um repositório local', 'Salva automaticamente cada edição'], 1, 'O histórico começa localmente. Publicação e commits são etapas diferentes.'),
  of('git-preparar', 'A mochila do próximo commit', 'A mochila do Byte está cheia. Escolha só o README para a primeira fotografia!',
    '### Área de preparação\n`git add README.md` coloca a versão atual desse arquivo na **staging area**, a seleção do próximo commit.\n\n`git add .` seleciona todos os arquivos novos e modificados da pasta atual e abaixo dela. Para esta missão, seja específico: prepare **somente README.md**. Confira a mochila com `git status`.\n\nO Git real respeita as regras do .gitignore para arquivos não rastreados; essa regra não é simulada aqui.',
    'Use git add README.md. Depois confira com git status.', ['git init'], ['git add README.md', 'git status'],
    [meta('Preparar apenas README.md', e => Object.keys(e.stage).length === 1 && !!e.stage['README.md']), meta('Consultar a preparação', viu('git:status'))],
    'git add já cria uma versão no histórico?', ['Sim, e publica no remoto', 'Sim, mas só localmente', 'Não, seleciona conteúdo para o próximo commit'], 2, 'Preparar e salvar no histórico são duas ações diferentes.'),
  of('git-commit', 'Uma foto com legenda', 'O README está preparado. Tire a primeira foto da aventura e dê a ela uma legenda útil.',
    '### Commit é um ponto do histórico\n`git commit -m "Descreve o projeto"` salva o conteúdo preparado e uma mensagem. Prefira mensagens que expliquem a mudança, como **Adiciona instruções de execução**.\n\nUse `git log --oneline` para ler o histórico de forma compacta. Cada commit tem um identificador; neste laboratório ele é simplificado. A identidade do autor já está configurada no ambiente didático.',
    'Faça um commit com -m e uma mensagem entre aspas. Depois abra git log --oneline.', ['git init', 'git add README.md'], ['git commit -m "Descreve o projeto"', 'git log --oneline'],
    [meta('Criar o primeiro commit', e => e.commits.length === 1), meta('Ler o histórico', viu('git:log'))],
    'Qual conteúdo entra no commit?', ['A versão preparada com git add', 'Todos os arquivos do computador', 'Somente o nome dos arquivos'], 0, 'Um commit guarda um retrato dos arquivos rastreados, incluindo as mudanças preparadas.'),
  of('git-inspecionar', 'Detetive das mudanças', 'Um novo arquivo Java chegou à estação. Investigue exatamente o que será salvo.',
    '### Compare antes de salvar\n`git diff` mostra mudanças rastreadas que ainda não foram preparadas. `git diff --staged` compara a preparação com o último commit.\n\nArquivos novos não aparecem no diff comum até serem rastreados. Prepare `Missao.java`, examine `git diff --staged` e só então crie um commit. Use `cat Missao.java` para ler o arquivo inteiro.',
    'Leia o arquivo, prepare Missao.java, confira git diff --staged e faça o commit.', baseGit, ['cat Missao.java', 'git add Missao.java', 'git diff --staged', 'git commit -m "Adiciona missão Java"'],
    [meta('Ler Missao.java', viu('cat:Missao.java')), meta('Inspecionar a diferença preparada', viu('git:diff-staged')), meta('Salvar Missao.java no histórico', e => !!cabeca(e)['Missao.java'])],
    'Qual comando compara a preparação com o último commit?', ['git log', 'git diff --staged', 'git init'], 1, 'Inspecionar o diff antes do commit ajuda a evitar mudanças acidentais.'),
  of('git-despreparar', 'Desfazendo sem perder', 'Byte colocou o arquivo errado na mochila! Retire Missao.java da preparação, mantendo o arquivo.',
    '### Corrigir a seleção\n`git restore --staged Missao.java` retira a mudança da preparação. O conteúdo de trabalho continua lá e você pode prepará-lo novamente depois.\n\nCuidado com a diferença: **git restore sem --staged** pode descartar edições do arquivo de trabalho. Essa forma não faz parte deste laboratório. Confira o resultado com `git status` e `cat Missao.java`.',
    'Use git restore --staged Missao.java. O arquivo deve continuar na pasta.', [...baseGit, 'git add Missao.java'], ['git restore --staged Missao.java', 'git status', 'cat Missao.java'],
    [meta('Retirar Missao.java da preparação', e => !('Missao.java' in e.stage) && viu('git:restore')(e)), meta('Conferir o arquivo preservado', e => !!e.arquivos['Missao.java'] && viu('cat:Missao.java')(e))],
    'O que --staged protege nesta operação?', ['Apaga todo o histórico', 'Publica um backup', 'Mantém o conteúdo do arquivo de trabalho'], 2, 'Desfazer uma seleção não é o mesmo que descartar seu trabalho.'),
  of('git-desafio-local', 'Guardião do histórico', 'Desafio: organize a cápsula do tempo do Byte do zero. O README e a missão precisam viajar juntos!',
    '### Junte as peças\nInicialize o repositório, prepare **README.md e Missao.java**, faça um commit com uma mensagem e leia o histórico.\n\nVocê pode selecionar os dois em um comando: `git add README.md Missao.java`. Evite adicionar o projeto inteiro quando só esses arquivos interessam.\n\nPense no ciclo: editar → preparar → conferir → salvar. Não é preciso decorar, é preciso entender o papel de cada etapa.',
    'A sequência é init, add dos dois arquivos, commit -m e log --oneline.', [], ['git init', 'git add README.md Missao.java', 'git commit -m "Cria projeto do Byte"', 'git log --oneline'],
    [meta('Salvar exatamente os dois arquivos pedidos', e => Object.keys(cabeca(e)).length === 2 && !!cabeca(e)['README.md'] && !!cabeca(e)['Missao.java']), meta('Consultar o histórico final', viu('git:log'))],
    'Qual é a ordem para registrar uma alteração?', ['add → commit → push, obrigatoriamente', 'Editar → add → commit', 'commit → editar → add'], 1, 'Push é opcional para salvar localmente. Seu primeiro checkpoint está pronto!', true),
];
const gitEquipe = [
  of('git-branch', 'Universo paralelo', 'Byte quer experimentar sem mexer na linha principal. Abra um universo chamado melhoria.',
    '### Branches\nUma **branch** é um ponteiro para uma linha de desenvolvimento. `git switch -c melhoria` cria uma branch e muda para ela. `git branch` lista as branches; o asterisco indica a atual.\n\nNão é uma cópia completa da pasta. Os commits são compartilhados até as histórias se separarem. Aqui trabalhamos com a árvore limpa antes de trocar de branch.',
    'Use git switch -c melhoria e git branch.', baseGit, ['git switch -c melhoria', 'git branch'],
    [meta('Criar e entrar na branch melhoria', e => e.branch === 'melhoria'), meta('Listar as branches', viu('git:branch'))],
    'Para que serve uma branch?', ['Desenvolver uma mudança separadamente', 'Criar um servidor na internet', 'Apagar commits antigos'], 0, 'Branches permitem experimentar e depois integrar o trabalho.'),
  of('git-trabalho-branch', 'Uma melhoria de verdade', 'Sua branch está pronta. Registre Missao.java nela e volte à base principal.',
    '### Cada branch tem sua ponta\nFaça `git add Missao.java` e um commit. Depois use `git switch main`.\n\nA main continua no commit anterior. O arquivo rastreado que existe só na melhoria sai da pasta ao voltar para main e reaparece ao voltar para melhoria. Arquivos não rastreados podem permanecer.\n\nTrocar de branch não integra as mudanças; isso é trabalho do merge.',
    'Adicione Missao.java, faça um commit e use git switch main.', [...baseGit, 'git switch -c melhoria'], ['git add Missao.java', 'git commit -m "Cria missão"', 'git switch main'],
    [meta('Salvar um novo commit na melhoria', e => e.branches.melhoria > e.branches.main), meta('Voltar à main', e => e.branch === 'main')],
    'Voltar para main traz automaticamente a melhoria?', ['Sim, sempre', 'Não, é preciso integrar as branches', 'Apaga a branch melhoria'], 1, 'Switch escolhe uma linha de trabalho; merge integra histórias.'),
  of('git-merge', 'Reunindo a equipe', 'A melhoria já está salva em outra branch. Traga a missão para a main!',
    '### Merge\nEstando na branch que vai **receber** a mudança, execute `git merge melhoria`. Aqui a main não recebeu novos commits: ela só avança até a melhoria. Isso se chama **fast-forward**.\n\nNo Git real, histórias que divergiram podem gerar um commit de merge e conflitos. Um conflito exige revisar o conteúdo e escolher uma solução; não significa que seu trabalho foi perdido. Este laboratório simula somente o fast-forward.',
    'Você está na main. Execute git merge melhoria e leia git log --oneline.', branch, ['git merge melhoria', 'git log --oneline'],
    [meta('Integrar a melhoria na main', e => e.branch === 'main' && !!cabeca(e)['Missao.java']), meta('Revisar o histórico integrado', viu('git:log'))],
    'Em qual branch você fica para trazer melhoria para main?', ['Na melhoria', 'Em qualquer branch', 'Na main, que recebe a mudança'], 2, 'A branch atual é o destino do merge.'),
  of('git-versao', 'A bandeira da versão', 'O primeiro lançamento merece uma bandeira: marque a versão v1.0.',
    '### Tags\n`git tag v1.0` cria uma tag leve no commit atual. Diferente da branch, ela não avança automaticamente nos próximos commits. É útil para localizar um lançamento.\n\nNo Git real, tags anotadas também guardam mensagem e autor, e publicar tags exige um envio específico. Nesta missão vamos apenas marcar a versão local.',
    'Use git tag v1.0 depois do commit já preparado no cenário.', baseGit, ['git tag v1.0'],
    [meta('Marcar o commit atual com v1.0', e => e.tags['v1.0'] === e.branches.main)],
    'Uma tag avança automaticamente com novos commits?', ['Não, marca um ponto específico', 'Sim, como uma branch', 'Só quando o editor está aberto'], 0, 'Tags são referências úteis para reencontrar versões.'),
  of('git-remoto', 'Uma ponte para a equipe', 'Agora o projeto vai ganhar um destino compartilhado. A rede aqui é de faz de conta: pode explorar!',
    '### Local e remoto\nUm remoto é um endereço de outro repositório. `git remote add origin https://exemplo.com/byte.git` dá a esse endereço o apelido **origin**.\n\n`git push -u origin main` envia a main e configura seu acompanhamento. No mundo real, o endereço precisa existir e você precisa ter permissão.\n\nGit é a ferramenta; serviços como GitHub hospedam repositórios. Cadastrar um remoto não envia commits sozinho.',
    'Cadastre origin com o endereço do exemplo e execute git push -u origin main.', baseGit, ['git remote add origin https://exemplo.com/byte.git', 'git push -u origin main'],
    [meta('Cadastrar origin', e => !!e.remoto), meta('Enviar a main ao remoto simulado', e => e.enviados === e.branches.main && e.enviados > 0)],
    'Qual ação envia os commits locais?', ['git add', 'git push', 'git status'], 1, 'Commit salva localmente; push compartilha com o remoto.'),
  of('git-desafio-equipe', 'Lançamento da nave', 'Missão final de Git: integre a melhoria, marque v1.0 e compartilhe a main com a equipe!',
    '### Checklist de lançamento\nA branch melhoria já tem um commit pronto. Você está na main. Integre a melhoria, marque `v1.0`, cadastre origin e envie a main.\n\nFora do laboratório, antes de enviar confira o trabalho da equipe: `git fetch` busca referências remotas sem integrar; `git pull` busca e integra conforme sua configuração. Esses dois comandos não são simulados aqui.\n\nUm **pull request** é um pedido de revisão na plataforma de hospedagem, não um comando básico do Git.',
    'Merge melhoria → tag v1.0 → remote add origin → push -u origin main.', branch, ['git merge melhoria', 'git tag v1.0', 'git remote add origin https://exemplo.com/byte.git', 'git push -u origin main'],
    [meta('Integrar Missao.java na main', e => e.branch === 'main' && !!cabeca(e)['Missao.java']), meta('Marcar a versão integrada', e => e.tags['v1.0'] === e.branches.melhoria), meta('Enviar a versão integrada', e => e.enviados === e.branches.melhoria)],
    'Se duas pessoas mudam a mesma parte e aparece um conflito, o melhor é…', ['Apagar o repositório', 'Forçar o envio sem revisar', 'Revisar as mudanças e resolver junto da equipe'], 2, 'Revisão, comunicação e testes fazem parte do trabalho com Git.', true),
];
const dockerInicio = [
  of('docker-imagem', 'Receita na mochila', 'Byte vai levar a loja para outro computador. Primeiro, consiga uma receita pronta!',
    '### Imagem e contêiner\nUma **imagem** é um pacote com o necessário para executar um processo. Um **contêiner** é uma instância dessa imagem, com isolamento. Não é uma máquina virtual completa.\n\n`docker pull nginx:alpine` baixa uma imagem. `nginx` é o nome e `alpine` é a tag. Confira o estoque com `docker images`. Tags podem ser atualizadas; em produção é possível fixar um digest. Aqui o download é simulado.',
    'Execute docker pull nginx:alpine e docker images.', [], ['docker pull nginx:alpine', 'docker images'],
    [meta('Obter nginx:alpine', e => e.imagens.includes('nginx:alpine')), meta('Listar imagens', viu('docker:images'))],
    'Qual é a diferença?', ['Imagem é a instância em execução', 'Imagem é o pacote; contêiner é uma instância', 'São dois nomes para a mesma coisa'], 1, 'Você pode criar vários contêineres usando uma imagem.'),
  of('docker-executar', 'Acorda, contêiner!', 'A receita chegou. Inicie um servidor chamado site e encontre-o na lista.',
    '### Executar um processo\n`docker run -d --name site nginx:alpine` cria e inicia um contêiner. `-d` deixa a execução em segundo plano; `--name` escolhe o nome.\n\n`docker ps` lista os contêineres em execução. `docker ps -a` inclui os parados. Run cria um novo contêiner; start inicia um que já existe. Se faltar a imagem local, o Docker tenta obtê-la.',
    'Use docker run -d --name site nginx:alpine e docker ps.', baseDocker, ['docker run -d --name site nginx:alpine', 'docker ps'],
    [meta('Iniciar site com nginx:alpine', e => e.containers.site?.ativo === true && e.containers.site.imagem === 'nginx:alpine'), meta('Consultar contêineres ativos', viu('docker:ps'))],
    'O que -d significa em docker run?', ['Apagar depois de executar', 'Duplicar o computador', 'Executar em segundo plano'], 2, 'O processo continua no contêiner enquanto você usa o terminal.'),
  of('docker-portas', 'A porta da lojinha', 'O servidor está isolado. Construa uma passagem da porta 8080 do computador até a porta 80 do site.',
    '### Publicar portas\nUse `docker run -d --name site -p 8080:80 nginx:alpine`. A ordem é **computador:contêiner**.\n\nNo Docker real, isso permite acessar o servidor por localhost:8080 se ele estiver ouvindo na porta 80. `EXPOSE` no Dockerfile documenta uma porta, mas não a publica sozinho.\n\nAqui nenhuma porta real é aberta: acompanhe o mapeamento no painel do laboratório.',
    'O mapeamento pedido é -p 8080:80, com o nome site.', baseDocker, ['docker run -d --name site -p 8080:80 nginx:alpine'],
    [meta('Publicar site em 8080:80', e => e.containers.site?.ativo === true && e.containers.site.porta === '8080:80' && e.containers.site.imagem === 'nginx:alpine')],
    'Em -p 8080:80, qual porta fica no computador?', ['8080', '80', 'As duas ficam só no contêiner'], 0, 'A porta à esquerda é a do computador; a da direita é a do contêiner.'),
  of('docker-logs', 'O diário do servidor', 'A loja não fala por balões. Aprenda a consultar o diário do processo!',
    '### Observar antes de adivinhar\n`docker logs site` mostra a saída registrada do processo. No Docker real, `-f` acompanha novas mensagens; neste laboratório mostramos um registro de exemplo.\n\nUse `docker ps` para conferir se o processo está ativo. Estar ativo não garante que a aplicação esteja saudável: logs e verificações de saúde ajudam a investigar.',
    'Consulte docker ps e docker logs site.', [...baseDocker, 'docker run -d --name site nginx:alpine'], ['docker ps', 'docker logs site'],
    [meta('Consultar processos ativos', viu('docker:ps')), meta('Ler o diário de site', viu('docker:logs:site'))],
    'Um contêiner Up garante que a aplicação responde corretamente?', ['Sim, sem exceções', 'Não; é preciso verificar a aplicação', 'Significa que ele foi removido'], 1, 'Observar estado e logs é um primeiro passo para diagnosticar problemas.'),
  of('docker-ciclo', 'Pausa para recarregar', 'Pare o site para manutenção, veja os parados e ligue o mesmo contêiner novamente.',
    '### Ciclo de vida\n`docker stop site` pede que o processo pare. `docker ps -a` inclui o site parado. `docker start site` inicia novamente o mesmo contêiner.\n\nParar não remove o contêiner nem a imagem. Já `docker rm site` remove o contêiner parado. A camada gravável dele se perde na remoção; volumes têm vida separada.',
    'Use stop site, ps -a e start site.', [...baseDocker, 'docker run -d --name site nginx:alpine'], ['docker stop site', 'docker ps -a', 'docker start site'],
    [meta('Parar o site', viu('docker:stop')), meta('Consultar também os parados', viu('docker:ps-all')), meta('Reiniciar o mesmo site', e => !!e.containers.site?.ativo && viu('docker:start')(e))],
    'docker stop remove a imagem?', ['Sim', 'Só se houver porta publicada', 'Não, apenas para o contêiner'], 2, 'Imagem, contêiner e execução têm ciclos de vida diferentes.'),
  of('docker-desafio-site', 'Festival na porta 8080', 'Desafio: prepare um site para o festival e confira seu diário antes de abrir os portões!',
    '### Um serviço completo\nObtenha `nginx:alpine`, inicie um contêiner chamado **festival**, publique **8080:80** e consulte seus logs.\n\nO mesmo comando run reúne nome, execução em segundo plano, portas e imagem. Você pode colocar as opções em outra ordem antes da imagem. No Docker real, argumentos depois da imagem pertencem ao processo executado.',
    'Pull nginx:alpine; run -d --name festival -p 8080:80 nginx:alpine; logs festival.', [], ['docker pull nginx:alpine', 'docker run -d --name festival -p 8080:80 nginx:alpine', 'docker logs festival'],
    [meta('Iniciar festival com a imagem e portas pedidas', e => e.containers.festival?.ativo === true && e.containers.festival.porta === '8080:80' && e.containers.festival.imagem === 'nginx:alpine'), meta('Ler os logs do festival', viu('docker:logs:festival'))],
    'Para criar um segundo contêiner da mesma imagem, você precisa…', ['De outro nome e uma porta livre, se publicar', 'Baixar a imagem obrigatoriamente de novo', 'Apagar o primeiro sempre'], 0, 'Imagens são reutilizáveis; nomes e portas publicadas precisam evitar conflitos.', true),
];
const dockerProjeto = [
  of('docker-receita', 'Lendo o Dockerfile', 'Byte deixou uma receita pronta para sua aplicação Java. Descubra os ingredientes antes de construir.',
    '### Uma receita em etapas\nLeia `cat Dockerfile`.\n\n- `FROM` escolhe a imagem base.\n- `WORKDIR` define a pasta de trabalho.\n- `COPY` copia arquivos do contexto de construção.\n- `EXPOSE` documenta a porta esperada.\n- `ENTRYPOINT` define o processo inicial.\n\nO arquivo app.jar já é fornecido como exemplo. Em um projeto real, você precisa gerar um JAR executável antes desta receita. O laboratório não executa esse artefato.',
    'Digite cat Dockerfile e observe o ENTRYPOINT.', [], ['cat Dockerfile'],
    [meta('Ler a receita fornecida', viu('cat:Dockerfile'))],
    'EXPOSE 8080 publica a porta no computador sozinho?', ['Sim', 'Não; é preciso publicar com -p ou ports', 'Só quando usa Java'], 1, 'EXPOSE é documentação da porta usada pela aplicação.'),
  of('docker-construir', 'Da receita ao pacote', 'Transforme o Dockerfile da loja em uma imagem chamada byte-loja:1.0.',
    '### Construção\n`docker build -t byte-loja:1.0 .` constrói a imagem. `-t` dá nome e tag; o ponto define a pasta atual como **contexto de construção**. COPY lê arquivos desse contexto.\n\nUse `docker images` para conferir o resultado. No projeto real, um .dockerignore evita enviar arquivos desnecessários ao contexto. Esta atividade usa a receita pronta e simula a construção.',
    'Execute docker build -t byte-loja:1.0 . e docker images.', [], ['docker build -t byte-loja:1.0 .', 'docker images'],
    [meta('Construir byte-loja:1.0', e => e.imagens.includes('byte-loja:1.0') && viu('docker:build')(e)), meta('Conferir as imagens', viu('docker:images'))],
    'O ponto no fim do build indica…', ['O fim obrigatório de qualquer comando', 'A porta do servidor', 'A pasta usada como contexto'], 2, 'O contexto fornece os arquivos que a construção pode copiar.'),
  of('docker-volume', 'O baú que permanece', 'A loja precisa guardar dados além da vida de um contêiner. Conecte um baú chamado dados.',
    '### Volumes nomeados\n`docker volume create dados` cria o volume. Execute a loja com `-v dados:/app/dados`. A parte à esquerda é o volume; a da direita é onde ele aparece no contêiner.\n\nA aplicação precisa escrever nesse caminho para aproveitar o volume. Um volume não é automaticamente um backup, mas pode sobreviver à remoção do contêiner. Aqui verificamos a conexão e a existência do volume; não simulamos dados de banco.',
    'Crie dados e rode docker run -d --name loja -v dados:/app/dados byte-loja:1.0.', loja, ['docker volume create dados', 'docker run -d --name loja -v dados:/app/dados byte-loja:1.0'],
    [meta('Criar o volume dados', e => e.volumes.includes('dados')), meta('Conectar dados à loja em /app/dados', e => e.containers.loja?.volume === 'dados:/app/dados' && e.containers.loja.imagem === 'byte-loja:1.0' && e.containers.loja.ativo)],
    'Para persistir os dados nesse volume, a aplicação deve…', ['Gravar em /app/dados', 'Gravar em qualquer pasta', 'Só executar EXPOSE'], 0, 'A persistência depende de usar o caminho que está montado.'),
  of('docker-preservar', 'Trocar a nave, manter o baú', 'O contêiner da loja envelheceu. Remova-o e confirme que o volume continua disponível.',
    '### Remoção e persistência\nPare a loja com `docker stop loja`, remova com `docker rm loja` e consulte `docker volume ls`.\n\nA imagem e o volume nomeado continuam. Você pode criar outro contêiner e conectar o mesmo volume. Evite tratar a camada gravável do contêiner como armazenamento permanente.',
    'Stop loja → rm loja → volume ls. O volume dados deve continuar lá.', [...loja, 'docker run -d --name loja -v dados:/app/dados byte-loja:1.0'], ['docker stop loja', 'docker rm loja', 'docker volume ls'],
    [meta('Remover o contêiner loja', e => !e.containers.loja && viu('docker:rm')(e)), meta('Conferir que dados foi preservado', e => e.volumes.includes('dados') && viu('docker:volume-ls')(e))],
    'O que docker rm loja remove nesta missão?', ['A imagem e todos os volumes', 'O contêiner, preservando o volume nomeado', 'O código Java no seu computador'], 1, 'Separar o processo de seus dados permite substituir contêineres.'),
  of('docker-compose', 'A orquestra da loja', 'Chega de repetir opções: o Byte escreveu um compose.yaml para descrever o serviço.',
    '### Configuração declarativa\nLeia `cat compose.yaml`. **services** descreve os serviços; **ports** publica portas; **volumes** monta e declara volumes.\n\n`docker compose up -d` cria e inicia a aplicação descrita. `docker compose ps` mostra os serviços. O Compose real também permite várias aplicações e redes.\n\nAqui o projeto se chama javaquest, tem um serviço loja e usa exatamente o arquivo fornecido, sem edição de YAML. O volume recebe o prefixo do projeto: javaquest_dados.',
    'Leia compose.yaml; execute docker compose up -d e docker compose ps.', loja, ['cat compose.yaml', 'docker compose up -d', 'docker compose ps'],
    [meta('Ler compose.yaml', viu('cat:compose.yaml')), meta('Iniciar a loja pelo Compose', e => !!e.containers['javaquest-loja-1']?.ativo), meta('Consultar os serviços', viu('docker:compose-ps'))],
    'Por que guardar a configuração no compose.yaml?', ['Para substituir todos os testes', 'Para evitar qualquer uso de imagens', 'Para descrever e repetir a configuração dos serviços'], 2, 'Compose reúne configurações que podem acompanhar o projeto no Git.'),
  of('docker-desafio-entrega', 'Entrega intergaláctica', 'Desafio final: construa a loja, suba com Compose, inspecione e encerre preservando o baú!',
    '### Entregar também é saber encerrar\nConstrua **byte-loja:1.0**, execute `docker compose up -d`, confira `docker compose ps` e encerre com `docker compose down`.\n\nDown remove contêineres e redes do projeto. Os volumes nomeados são preservados por padrão. No Docker real, adicionar **--volumes** pode removê-los; essa opção não é simulada aqui.\n\nPróximo passo fora do jogo: versionar seu projeto, rodar testes e construir a imagem real. O laboratório ensina o fluxo, mas não substitui testar sua aplicação.',
    'Build -t byte-loja:1.0 . → compose up -d → compose ps → compose down.', [], ['docker build -t byte-loja:1.0 .', 'docker compose up -d', 'docker compose ps', 'docker compose down'],
    [meta('Construir a imagem da loja', e => e.imagens.includes('byte-loja:1.0')), meta('Iniciar e inspecionar com Compose', e => viu('docker:compose-up')(e) && viu('docker:compose-ps')(e)), meta('Encerrar preservando o volume', e => viu('docker:compose-down')(e) && !Object.values(e.containers).some(c => c.compose) && e.volumes.includes('javaquest_dados'))],
    'O que acontece com volumes nomeados no compose down sem --volumes?', ['São preservados por padrão', 'São sempre apagados', 'Viraram imagens'], 0, 'Você concluiu o ciclo: construir, executar, observar e encerrar com consciência.', true),
];
export const oficinas = [...gitInicio, ...gitEquipe, ...dockerInicio, ...dockerProjeto];
export const oficinaPorId = new Map(oficinas.map(o => [o.licao.id, o]));
export function prepararOficina(o: Oficina): Estado {
  let e = novoEstado();
  for (const comando of o.preparar) {
    const r = executarComando(e, comando);
    if (!r.ok) throw new Error(`Cenário inválido ${o.licao.id}: ${r.saida}`);
    e = r.estado;
  }
  e.vistos = [];
  return e;
}
function modulo(id: string, titulo: string, emoji: string, cor: string, descricao: string, lista: Oficina[]): Modulo {
  return { id, titulo, emoji, cor, descricao, oculto: false, licoes: lista.map(o => o.licao) };
}
export const modulosOficina = [
  modulo('git-fundamentos', 'Git: máquina do tempo', '🌱', '#168266', 'Do primeiro repositório ao histórico bem cuidado.', gitInicio),
  modulo('git-equipe', 'Git: missão em equipe', '🌿', '#138576', 'Branches, integração, versões e compartilhamento.', gitEquipe),
  modulo('docker-fundamentos', 'Docker: porto dos contêineres', '🐳', '#277bb5', 'Imagens, contêineres, portas e investigação.', dockerInicio),
  modulo('docker-projeto', 'Docker: estação de entrega', '🚢', '#4265bc', 'Dockerfile, construção, volumes e Compose.', dockerProjeto),
];
