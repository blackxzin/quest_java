const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const base = process.env.JAVAQUEST_URL || 'http://127.0.0.1:8080';
    await page.goto(base + '/#/mapa');
    await page.getByRole('button', { name: '🌱 Git', exact: true }).click();
    assert.equal(await page.locator('.ilha').count(), 2);
    assert.equal(await page.locator('.fase:not([disabled])').count(), 1);
    await page.locator('.fase').filter({ hasText: 'A máquina do tempo' }).click();
    console.log('Laboratório Git aberto');
    await page.getByRole('button', { name: 'Verificar missão' }).click();
    assert.match(await page.locator('.oficina-feedback').innerText(), /Complete os objetivos/);
    for (const comando of ['ls', 'git init', 'git status']) {
      await page.getByRole('textbox', { name: 'Comando do terminal', exact: true }).fill(comando);
      await page.getByRole('textbox', { name: 'Comando do terminal', exact: true }).press('Enter');
    }
    await page.getByLabel('Publica arquivos na internet', { exact: true }).check();
    await page.getByRole('button', { name: 'Concluir missão' }).click();
    assert.equal(await page.locator('.oficina-vitoria').count(), 0);
    await page.getByLabel('Cria um repositório local', { exact: true }).check();
    await page.getByRole('button', { name: 'Concluir missão' }).click();
    await page.locator('.oficina-vitoria').waitFor();
    console.log('Conclusão e revisão validadas');
    await page.getByRole('button', { name: 'Próxima missão' }).click();
    await page.getByRole('heading', { name: 'A mochila do próximo commit', exact: true }).waitFor();
    await page.getByRole('button', { name: '← Mapa', exact: true }).click();
    await page.getByRole('button', { name: '🌱 Git', exact: true }).click();
    assert.equal(await page.locator('.fase:not([disabled])').count(), 2);
    await page.reload();
    assert.match(await page.locator('.mapa-resumo').innerText(), /1 de 67/);
    // O toggle precisa redesenhar mesmo sem mudança no total de estrelas.
    await page.getByLabel('Liberar todas as missões').check();
    assert.equal(await page.locator('.fase[disabled]').count(), 0);
    await page.getByLabel('Liberar todas as missões').uncheck();
    assert.ok(await page.locator('.fase[disabled]').count() > 0);
    await page.getByRole('button', { name: '🐳 Docker', exact: true }).click();
    await page.locator('.fase').filter({ hasText: 'Receita na mochila' }).click();
    for (const comando of ['docker pull nginx:alpine','docker images']) {
      await page.getByRole('textbox', { name: 'Comando do terminal', exact: true }).fill(comando);
      await page.getByRole('textbox', { name: 'Comando do terminal', exact: true }).press('Enter');
    }
    await page.getByLabel('Imagem é o pacote; contêiner é uma instância', { exact: true }).check();
    await page.getByRole('button', { name: 'Concluir missão' }).click();
    await page.locator('.oficina-vitoria').waitFor();
    console.log('Conclusão e revisão validadas');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: '/tmp/javaquest-oficina-desktop.png', fullPage: true });
    await page.getByRole('button', { name: '← Mapa', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Buscar missões' }).fill('zzzz-nao-existe');
    assert.equal(await page.locator('.ilha').count(), 0);
    await page.getByRole('searchbox', { name: 'Buscar missões' }).fill('preparacao');
    assert.ok(await page.locator('.fase').count() > 0);
    await page.getByRole('searchbox', { name: 'Buscar missões' }).fill('');
    await page.getByLabel('Liberar todas as missões').check();
    await page.goto(base + '/#/licao/texto-cracha');
    await page.getByRole('heading', { name: 'O crachá do Byte', exact: true }).waitFor();
    await page.locator('.cm-content').waitFor();
    const modules = await (await page.request.get(base + '/api/modulos')).json();
    const lesson = modules.flatMap(m => m.licoes).find(l => l.id === 'texto-cracha');
    await page.locator('.cm-content').fill(lesson.solucao);
    await page.getByRole('button', { name: '▶ Rodar', exact: true }).click();
    await page.getByRole('dialog', { name: 'Missão cumprida' }).waitFor({ timeout: 30000 });
    // Telas estreitas e tema escuro: sem rolagem horizontal da página.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const route of ['mapa','licao/git-iniciar','licao/docker-compose','dicionario']) {
      await page.goto(base + '/?teste=' + encodeURIComponent(route) + '#/' + route);
      await page.locator('h1').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow em ${route}`);
    }
    await page.goto(base + '/#/licao/docker-compose');
    await page.locator('.oficina').waitFor();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: '/tmp/javaquest-oficina-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Navegação validada: trilhas, desbloqueio, progresso persistido, revisão, terminal, execução Java e layout mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
