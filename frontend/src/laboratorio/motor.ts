/** Terminal didático: nenhuma entrada é enviada ao shell ou à rede. */
export type Commit = { id: number; mensagem: string; arquivos: Record<string, string>; pais: number[] };
export type Container = { imagem: string; ativo: boolean; porta?: string; volume?: string; compose?: boolean };
export type Estado = {
  arquivos: Record<string, string>; repo: boolean; branch: string; branches: Record<string, number>;
  stage: Record<string, string>; commits: Commit[]; tags: Record<string, number>; remoto: string;
  enviados: number; imagens: string[]; containers: Record<string, Container>; volumes: string[]; vistos: string[];
};
export function novoEstado(): Estado {
  return { arquivos: { 'README.md': 'Meu primeiro projeto com Byte!', 'Missao.java': 'class Missao {}',
    'Dockerfile': 'FROM eclipse-temurin:21-jre\nWORKDIR /app\nCOPY app.jar app.jar\nEXPOSE 8080\nENTRYPOINT ["java", "-jar", "app.jar"]',
    'app.jar': '(artefato de exemplo: já fornecido pelo laboratório)',
    'compose.yaml': 'services:\n  loja:\n    image: byte-loja:1.0\n    ports:\n      - "8080:8080"\n    volumes:\n      - dados:/app/dados\nvolumes:\n  dados:' },
    repo: false, branch: 'main', branches: { main: 0 }, stage: {}, commits: [], tags: {}, remoto: '', enviados: 0,
    imagens: [], containers: {}, volumes: [], vistos: [] };
}
export function cabeca(e: Estado): Record<string, string> {
  return e.commits.find(c => c.id === e.branches[e.branch])?.arquivos ?? {};
}
export function alterados(e: Estado) {
  const base = cabeca(e);
  return Object.keys(e.arquivos).filter(f => e.arquivos[f] !== (e.stage[f] ?? base[f]));
}
export function executarComando(anterior: Estado, entrada: string): { estado: Estado; saida: string; ok: boolean } {
  const e = structuredClone(anterior);
  const sucesso = (saida: string, visto?: string) => {
    if (visto && !e.vistos.includes(visto)) e.vistos.push(visto);
    return { estado: e, saida, ok: true };
  };
  const erro = (saida: string) => ({ estado: anterior, saida, ok: false });
  if (entrada.length > 2000) return erro('Comando muito longo. Use um comando por vez.');
  // Aspas simples/duplas preservam argumentos, sem expansão, pipes ou execução de scripts.
  if (/[\r\n]/.test(entrada)) return erro('Execute um comando por vez, sem quebras de linha.');
  const t: string[] = [];
  let token = '', aspas = '', iniciou = false;
  for (const caractere of entrada.trim()) {
    if (aspas) {
      if (caractere === aspas) aspas = ''; else token += caractere;
    } else if (caractere === '"' || caractere === "'") { aspas = caractere; iniciou = true; }
    else if (/\s/.test(caractere)) { if (iniciou) { t.push(token); token = ''; iniciou = false; } }
    else { token += caractere; iniciou = true; }
  }
  if (aspas) return erro('Feche as aspas antes de executar.');
  if (iniciou) t.push(token);
  const [programa, cmd, ...a] = t;
  if (!programa) return erro('Digite um comando.');
  if (programa === 'help') return sucesso('Comandos: ls, cat ARQUIVO; git init/status/add/commit/log/diff/switch/branch/merge/restore/tag/remote/push; docker pull/images/run/ps/logs/stop/start/rm/build/volume/compose. Use os exemplos da missão. Este laboratório implementa apenas esse subconjunto.');
  if (programa === 'ls' && t.length === 1) return sucesso(Object.keys(e.arquivos).join('\n'), 'ls');
  if (programa === 'cat' && t.length === 2) return Object.hasOwn(e.arquivos, cmd) ? sucesso(e.arquivos[cmd], `cat:${cmd}`) : erro('Arquivo não encontrado. Use ls.');
  if (programa === 'git') {
    if (cmd === 'init' && a.length === 0) { e.repo = true; return sucesso('Repositório inicializado. Branch inicial deste laboratório: main.', 'git:init'); }
    if (!e.repo) return erro('Ainda não há repositório. Comece com git init.');
    const head = cabeca(e);
    if (cmd === 'status' && a.length === 0) return sucesso(`Na branch ${e.branch}\nPreparados: ${Object.keys(e.stage).join(', ') || 'nenhum'}\nNão preparados: ${alterados(e).join(', ') || 'nenhum'}`, 'git:status');
    if (cmd === 'add' && a.length > 0) {
      const arquivos = a.includes('.') ? Object.keys(e.arquivos) : a;
      if (arquivos.some(f => !Object.hasOwn(e.arquivos, f))) return erro('Arquivo não encontrado. Use ls para conferir o nome.');
      for (const f of arquivos) { if (e.arquivos[f] !== head[f]) e.stage[f] = e.arquivos[f]; else delete e.stage[f]; }
      return sucesso('Arquivos preparados. Confira com git status.', 'git:add');
    }
    if (cmd === 'commit' && a.length === 2 && a[0] === '-m' && a[1].trim()) {
      if (!Object.keys(e.stage).length) return erro('Nada preparado. Use git add antes do commit.');
      const id = e.commits.length + 1;
      e.commits.push({ id, mensagem: a[1], arquivos: { ...head, ...e.stage }, pais: [e.branches[e.branch]] });
      e.branches[e.branch] = id; e.stage = {};
      return sucesso(`[${e.branch} ${id.toString(16).padStart(7, '0')}] ${a[1]}`, 'git:commit');
    }
    if (cmd === 'log' && (a.length === 0 || (a.length === 1 && a[0] === '--oneline'))) {
      const ids = new Set<number>();
      const visitar = (id: number) => { if (ids.has(id)) return; ids.add(id); e.commits.find(c => c.id === id)?.pais.forEach(visitar); };
      visitar(e.branches[e.branch]);
      return sucesso(e.commits.filter(c => ids.has(c.id)).reverse().map(c => `${c.id.toString(16).padStart(7, '0')} ${c.mensagem}`).join('\n') || 'Nenhum commit ainda.', 'git:log');
    }
    if (cmd === 'diff' && (a.length === 0 || (a.length === 1 && a[0] === '--staged'))) {
      const staged = a[0] === '--staged'; const arquivos = staged ? e.stage : e.arquivos;
      return sucesso(Object.keys(arquivos).filter(f => arquivos[f] !== (staged ? head[f] : e.stage[f] ?? head[f]) && (staged || f in head || f in e.stage))
        .map(f => `${f}\n- ${ (staged ? head[f] : e.stage[f] ?? head[f]) ?? ''}\n+ ${arquivos[f]}`).join('\n') || 'Nenhuma diferença em arquivos rastreados.', staged ? 'git:diff-staged' : 'git:diff');
    }
    if (cmd === 'branch' && a.length === 0) return sucesso(Object.keys(e.branches).map(b => `${b === e.branch ? '*' : ' '} ${b}`).join('\n'), 'git:branch');
    if (cmd === 'switch' && (a.length === 1 || (a.length === 2 && a[0] === '-c'))) {
      const criar = a[0] === '-c'; const nome = a[criar ? 1 : 0];
      if (!/^[a-zA-Z0-9][\w/-]*$/.test(nome)) return erro('Use um nome simples para a branch, como melhoria.');
      if (Object.keys(e.stage).length || Object.keys(head).some(f => e.arquivos[f] !== head[f])) return erro('Salve as mudanças com add e commit antes de trocar de branch neste laboratório.');
      if (criar ? nome in e.branches : !(nome in e.branches)) return erro(criar ? 'Essa branch já existe.' : 'Branch não encontrada. Use git branch.');
      if (criar) e.branches[nome] = e.branches[e.branch];
      Object.keys(head).forEach(f => delete e.arquivos[f]); e.branch = nome;
      e.arquivos = { ...e.arquivos, ...cabeca(e) };
      return sucesso(`Agora na branch ${nome}.`, 'git:switch');
    }
    if (cmd === 'merge' && a.length === 1) {
      if (!Object.hasOwn(e.branches, a[0])) return erro('Branch não encontrada.');
      if (Object.keys(e.stage).length || Object.keys(head).some(f => e.arquivos[f] !== head[f])) return erro('Faça commit das alterações antes de unir branches.');
      const destino = e.branches[a[0]]; const origem = e.branches[e.branch];
      const ancestral = (alvo: number, id: number): boolean => alvo === id || !!e.commits.find(c => c.id === id)?.pais.some(p => ancestral(alvo, p));
      if (ancestral(destino, origem)) return sucesso('Já está atualizado.', 'git:merge');
      if (!ancestral(origem, destino)) return erro('As branches divergiram. Este laboratório ensina merge fast-forward; conflitos precisam de resolução manual no Git real.');
      e.branches[e.branch] = destino; e.arquivos = { ...e.arquivos, ...cabeca(e) };
      return sucesso('Fast-forward: histórico da branch integrado.', 'git:merge');
    }
    if (cmd === 'restore' && a.length === 2 && a[0] === '--staged') {
      if (!(a[1] in e.stage)) return erro('Esse arquivo não está na preparação.');
      delete e.stage[a[1]]; return sucesso('Retirado da preparação. Seu arquivo continua intacto.', 'git:restore');
    }
    if (cmd === 'tag' && a.length === 1 && /^[\w.-]+$/.test(a[0])) {
      if (!e.branches[e.branch]) return erro('Faça um commit antes de marcar uma versão.');
      if (a[0] in e.tags) return erro('Essa tag já existe.');
      e.tags[a[0]] = e.branches[e.branch]; return sucesso(`Versão ${a[0]} marcada.`, 'git:tag');
    }
    if (cmd === 'remote' && a.length === 3 && a[0] === 'add' && a[1] === 'origin' && /^https:\/\/.+/.test(a[2])) {
      if (e.remoto) return erro('O remoto origin já existe.');
      e.remoto = a[2]; return sucesso('Endereço remoto cadastrado (simulado; nenhuma conexão real).', 'git:remote');
    }
    if (cmd === 'push' && (a.join(' ') === '-u origin main' || a.join(' ') === 'origin main')) {
      if (!e.remoto || !e.branches.main) return erro('Cadastre origin e faça um commit na main primeiro.');
      e.enviados = e.branches.main; return sucesso('main enviada ao remoto simulado. No Git real, o servidor pode exigir autenticação.', 'git:push');
    }
  }
  if (programa === 'docker') {
    if (cmd === 'pull' && a.length === 1 && /^[\w./:-]+$/.test(a[0])) {
      if (!e.imagens.includes(a[0])) e.imagens.push(a[0]); return sucesso(`Imagem ${a[0]} disponível (download simulado).`, 'docker:pull');
    }
    if (cmd === 'images' && !a.length) return sucesso(e.imagens.join('\n') || 'Nenhuma imagem local.', 'docker:images');
    if (cmd === 'build' && a.length === 3 && a[0] === '-t' && a[2] === '.') {
      if (!e.arquivos.Dockerfile?.includes('FROM ') || !e.arquivos.Dockerfile.includes('COPY app.jar app.jar') || !e.arquivos['app.jar']) return erro('Confira Dockerfile e app.jar no contexto de construção.');
      if (!e.imagens.includes(a[1])) e.imagens.push(a[1]); return sucesso(`Imagem ${a[1]} construída a partir do Dockerfile fornecido (simulação).`, 'docker:build');
    }
    if (cmd === 'run') {
      let nome = '', porta: string | undefined, volume: string | undefined, imagem = '';
      for (let i = 0; i < a.length; i++) {
        if (imagem) return erro('Coloque as opções antes da imagem. Comandos personalizados do contêiner não são simulados.');
        if (a[i] === '-d' || a[i] === '--detach') continue;
        if (['--name', '-p', '--publish', '-v', '--volume'].includes(a[i])) {
          const flag = a[i], valor = a[++i]; if (!valor || valor.startsWith('-')) return erro(`Falta o valor de ${flag}.`);
          if (flag === '--name') nome = valor; else if (flag === '-p' || flag === '--publish') porta = valor; else volume = valor;
        } else if (!a[i].startsWith('-') && !imagem) imagem = a[i]; else return erro('Opção não suportada. Exemplo: docker run -d --name loja -p 8080:8080 byte-loja:1.0');
      }
      if (!nome || !imagem) return erro('Neste laboratório, informe --name NOME e a imagem.');
      if (e.containers[nome]) return erro('Esse nome já está em uso. Remova o contêiner antigo ou escolha outro nome.');
      if (porta && !/^\d{1,5}:\d{1,5}$/.test(porta)) return erro('Use porta-do-computador:porta-do-contêiner, por exemplo 8080:80.');
      if (porta && porta.split(':').some(p => +p < 1 || +p > 65535)) return erro('Portas devem estar entre 1 e 65535.');
      if (porta && Object.values(e.containers).some(c => c.ativo && c.porta?.split(':')[0] === porta.split(':')[0])) return erro('Essa porta do computador já está ocupada.');
      if (volume && !/^[\w-]+:\/[\w/.-]+$/.test(volume)) return erro('Use volume-nomeado:/caminho, por exemplo dados:/app/dados.');
      if (!e.imagens.includes(imagem)) e.imagens.push(imagem);
      if (volume && !e.volumes.includes(volume.split(':')[0])) e.volumes.push(volume.split(':')[0]);
      e.containers[nome] = { imagem, porta, volume, ativo: true };
      return sucesso(`Contêiner ${nome} iniciado. ${porta ? `Portas: ${porta}.` : 'Nenhuma porta publicada.'} (simulado)`, 'docker:run');
    }
    if (cmd === 'ps' && (!a.length || (a.length === 1 && a[0] === '-a'))) return sucesso(Object.entries(e.containers).filter(([, c]) => c.ativo || a[0] === '-a').map(([n,c]) => `${n} | ${c.imagem} | ${c.ativo ? 'Up' : 'Exited'} | ${c.porta ?? '-'}`).join('\n') || 'Nenhum contêiner nesta lista.', a[0] === '-a' ? 'docker:ps-all' : 'docker:ps');
    if (['logs', 'stop', 'start', 'rm'].includes(cmd) && a.length === 1) {
      const c = Object.hasOwn(e.containers, a[0]) ? e.containers[a[0]] : undefined; if (!c) return erro('Contêiner não encontrado. Confira docker ps -a.');
      if (cmd === 'logs') return sucesso(`${a[0]}: serviço iniciado. Pronto para receber pedidos. (log de exemplo)`, `docker:logs:${a[0]}`);
      if (cmd === 'rm' && c.ativo) return erro('Pare o contêiner com docker stop antes de remover.');
      if (cmd === 'start' && c.porta && Object.entries(e.containers).some(([n, outro]) => n !== a[0] && outro.ativo && outro.porta?.split(':')[0] === c.porta?.split(':')[0])) return erro('A porta está ocupada por outro contêiner.');
      if (cmd === 'rm') delete e.containers[a[0]]; else c.ativo = cmd === 'start';
      return sucesso(`${a[0]}: ${cmd === 'rm' ? 'removido' : c.ativo ? 'iniciado' : 'parado'}. Volumes nomeados preservados.`, `docker:${cmd}`);
    }
    if (cmd === 'volume' && a[0] === 'create' && a.length === 2) {
      if (!/^[\w-]+$/.test(a[1])) return erro('Use um nome simples para o volume.');
      if (!e.volumes.includes(a[1])) e.volumes.push(a[1]); return sucesso(`Volume ${a[1]} disponível.`, 'docker:volume');
    }
    if (cmd === 'volume' && a.join(' ') === 'ls') return sucesso(e.volumes.join('\n') || 'Nenhum volume.', 'docker:volume-ls');
    if (cmd === 'compose') {
      // Modelo fixo, explicitamente apresentado ao aluno; não interpreta YAML arbitrário.
      if (a.join(' ') === 'up -d') {
        if (!e.imagens.includes('byte-loja:1.0')) return erro('Construa byte-loja:1.0 antes de iniciar esta loja.');
        if (Object.entries(e.containers).some(([n,c]) => n !== 'javaquest-loja-1' && c.ativo && c.porta?.startsWith('8080:'))) return erro('A porta 8080 já está ocupada.');
        e.containers['javaquest-loja-1'] = { imagem: 'byte-loja:1.0', ativo: true, porta: '8080:8080', volume: 'javaquest_dados:/app/dados', compose: true };
        if (!e.volumes.includes('javaquest_dados')) e.volumes.push('javaquest_dados');
        return sucesso('Projeto javaquest: serviço loja iniciado e volume javaquest_dados conectado.', 'docker:compose-up');
      }
      if (a.join(' ') === 'ps') return sucesso(Object.entries(e.containers).filter(([,c]) => c.compose).map(([n,c]) => `${n}: ${c.ativo ? 'Up' : 'Exited'}`).join('\n') || 'Nenhum serviço criado.', 'docker:compose-ps');
      if (a.join(' ') === 'down') {
        for (const [n,c] of Object.entries(e.containers)) if (c.compose) delete e.containers[n];
        return sucesso('Serviços removidos. O volume javaquest_dados foi preservado.', 'docker:compose-down');
      }
    }
  }
  return erro('Comando ou opção fora deste laboratório. Digite help e confira os exemplos da missão. Execute um comando por vez.');
}
