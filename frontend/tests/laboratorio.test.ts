import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oficinas, prepararOficina } from '../src/laboratorio/catalogo.ts';
import { novoEstado, executarComando, cabeca } from '../src/laboratorio/motor.ts';

for (const o of oficinas) {
  test(`${o.licao.id}: cenário incompleto, solução executável e objetivos cumpridos`, () => {
    let e = prepararOficina(o);
    assert.ok(!o.metas.every(m => m.verificar(e)), 'O cenário não pode começar resolvido');
    for (const comando of o.licao.solucao.split('\n')) {
      const r = executarComando(e, comando);
      assert.ok(r.ok, `${comando}: ${r.saida}`); e = r.estado;
    }
    for (const meta of o.metas) assert.ok(meta.verificar(e), meta.texto);
    assert.ok(o.resposta >= 0 && o.resposta < o.alternativas.length);
  });
}
function rodar(comandos: string[]) {
  let e = novoEstado();
  for (const c of comandos) { const r = executarComando(e, c); assert.ok(r.ok, `${c}: ${r.saida}`); e = r.estado; }
  return e;
}
test('IDs únicos e nenhum comando desconhecido modifica o ambiente', () => {
  assert.equal(new Set(oficinas.map(o => o.licao.id)).size, oficinas.length);
  const e = novoEstado();
  for (const c of ['rm -rf /', 'git init && echo oi', 'docker run --privileged ubuntu', 'git init extra', 'docker compose down --volumes']) {
    const r = executarComando(e,c); assert.equal(r.ok, false); assert.deepEqual(r.estado, e);
  }
});
test('commit exige preparação e guarda o snapshot preparado, não edições posteriores', () => {
  let e = rodar(['git init']);
  assert.equal(executarComando(e, 'git commit -m "vazio"').ok, false);
  e = executarComando(e, 'git add README.md').estado;
  const anterior = e.arquivos['README.md']; e.arquivos['README.md'] = 'Alteração depois do add';
  e = executarComando(e, 'git commit -m "Primeira versão"').estado;
  assert.equal(cabeca(e)['README.md'], anterior);
  assert.equal(e.arquivos['README.md'], 'Alteração depois do add');
});
test('restore staged preserva o arquivo e impede commit vazio', () => {
  const e = rodar(['git init','git add README.md','git commit -m "Base"','git add Missao.java','git restore --staged Missao.java']);
  assert.equal(e.arquivos['Missao.java'], 'class Missao {}'); assert.deepEqual(e.stage, {});
  assert.equal(executarComando(e, 'git commit -m "Nada"').ok, false);
});
test('switch mantém isolamento e merge fast-forward integra o histórico', () => {
  let e = rodar(['git init','git add README.md','git commit -m "Base"','git switch -c melhoria','git add Missao.java','git commit -m "Missão"','git switch main']);
  assert.equal(e.arquivos['Missao.java'], undefined);
  assert.ok(!executarComando(e,'git log --oneline').saida.includes('Missão'));
  e = executarComando(e, 'git merge melhoria').estado;
  assert.equal(e.arquivos['Missao.java'], 'class Missao {}');
});
test('docker detecta nomes duplicados, portas ocupadas e remoção de contêiner ativo', () => {
  const e = rodar(['docker run -d --name site -p 8080:80 nginx:alpine']);
  for (const c of ['docker run -d --name site nginx:alpine','docker run -d --name outro -p 8080:80 nginx:alpine','docker rm site', 'docker run -d --name outro -p 99999:80 nginx:alpine']) {
    const r = executarComando(e,c); assert.equal(r.ok,false); assert.deepEqual(r.estado,e);
  }
});
test('remover contêiner preserva imagem e volume; Compose down preserva volume', () => {
  const e = rodar(['docker run -d --name loja -v dados:/app/dados byte-loja:1.0','docker stop loja','docker rm loja']);
  assert.ok(e.volumes.includes('dados')); assert.ok(e.imagens.includes('byte-loja:1.0')); assert.equal(e.containers.loja, undefined);
  const c = rodar(['docker build -t byte-loja:1.0 .','docker compose up -d','docker compose down']);
  assert.ok(c.volumes.includes('javaquest_dados')); assert.deepEqual(c.containers, {});
});
test('aspas e opções inválidas retornam explicações sem sucesso falso', () => {
  const e = rodar(['git init','git add README.md']);
  assert.equal(executarComando(e,'git commit -m "incompleta').ok,false);
  assert.equal(executarComando(e,"git commit -m 'Mensagem com espaços'").ok,true);
  assert.equal(executarComando(e,'git commit -m ""').ok,false);
});
test('nomes herdados não são arquivos ou contêineres e aspas internas são texto', () => {
  for (const c of ['cat constructor', 'docker logs constructor', 'docker stop __proto__']) {
    assert.equal(executarComando(novoEstado(), c).ok, false);
  }
  const e = rodar(['git init','git add README.md']);
  assert.equal(executarComando(e, `git commit -m "Arquivo d'água"`).ok, true);
  assert.equal(executarComando(e, 'git status\ngit log').ok, false);
});
