/**
 * Teste de ponta a ponta no navegador, contra um servidor rodando (npm run dev).
 *   BASE_URL=http://localhost:3000 npm run teste:e2e
 * Percorre: login → cliente → obra → vistoria → orçamento → envio → aprovação do cliente →
 * pré-reserva na agenda → sinal registrado → agenda confirmada → "Minha semana" do Anderson →
 * entrega → saldo registrado → recibo de quitação (PDF) → contrato recorrente → fatura (PDF) →
 * despesa da obra → lucro real no relatório.
 */
import { mkdir } from 'node:fs/promises';
import { chromium, type Page } from 'playwright-core';
import { hojeSP, somarDias } from '../src/lib/agenda';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SAIDA = 'saida/e2e';
const sufixo = Date.now().toString().slice(-5);
const obraNome = `Apto ${sufixo}`;
const amanha = somarDias(hojeSP(), 1);
const pdf = async (p: Page, url: string) => {
  const resp = await p.request.get(url.startsWith('http') ? url : `${BASE}${url}`);
  if (resp.headers()['content-type'] !== 'application/pdf') throw new Error(`PDF não gerado (${resp.status()}): ${url}`);
  return resp.headers()['content-disposition'] ?? '';
};
await mkdir(SAIDA, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const erros: string[] = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

const passo = async (nome: string, fn: () => Promise<void>) => {
  process.stdout.write(`• ${nome}… `);
  await fn();
  console.log('ok');
};
// caret: 'initial' — sem isso o Playwright injeta caret-color e, antes da hidratação, o React acusa diferença.
const foto = (p: Page, nome: string) => p.screenshot({ path: `${SAIDA}/${nome}.png`, fullPage: true, caret: 'initial' });

try {
  await passo('login (Bruna)', async () => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name=email]', 'bruna@lubian.local');
    await page.fill('input[name=senha]', process.env.SENHA_INICIAL ?? 'lubian2026');
    await page.click('button[type=submit]');
    await page.waitForURL(`${BASE}/`);
    await page.getByText('Olá, Bruna!').waitFor();
    await foto(page, '01-painel');
  });

  await passo('cadastrar cliente', async () => {
    await page.goto(`${BASE}/clientes/novo`);
    await page.fill('input[name=nome]', `Cliente Teste ${sufixo}`);
    await page.selectOption('select[name=tipo]', 'pessoa_fisica');
    await page.fill('input[name=telefone]', '(49) 98888-7777');
    await page.click('button:has-text("Cadastrar cliente")');
    await page.waitForURL(/\/clientes\/[0-9a-f-]{36}$/);
  });

  await passo('cadastrar obra', async () => {
    await page.click('a:has-text("+ Obra")');
    await page.waitForURL(/\/obras\/nova/);
    await page.fill('input[name=nome]', obraNome);
    await page.fill('input[name=endereco]', 'Rua Marechal Deodoro, 100 - Chapecó/SC');
    await page.fill('input[name=areaM2]', '95');
    await page.click('button:has-text("Cadastrar obra")');
    await page.waitForURL(/\/obras\/[0-9a-f-]{36}$/);
  });

  await passo('vistoria com medições', async () => {
    await page.click('a:has-text("+ Vistoria técnica")');
    await page.waitForURL(/\/vistorias\/nova/);
    await page.click('button:has-text("Iniciar vistoria")');
    await page.waitForURL(/\/vistorias\/[0-9a-f-]{36}$/);
    await page.fill('input[placeholder^="Ambiente"]', 'Sala e cozinha');
    await page.fill('input[placeholder="m²"]', '60');
    await page.selectOption('select[name=nivelSujeira]', { index: 2 });
    await page.fill('textarea[name=observacoes]', 'Esquadrias pretas sensíveis.');
    await page.click('button:has-text("Salvar vistoria")');
    await page.getByText('Vistoria salva').waitFor();
    await foto(page, '02-vistoria');
  });

  await passo('orçamento a partir da vistoria', async () => {
    await page.click('a:has-text("Gerar orçamento desta vistoria")');
    await page.waitForURL(/\/orcamentos\/novo/);
    await page.getByText('Resumo financeiro').waitFor();
    // 2 dias de força-tarefa + custos variáveis
    const dias = page.locator('input[inputmode=decimal]').nth(2);
    await dias.fill('2');
    await page.locator('input[inputmode=decimal]').nth(3).fill('80'); // transporte
    await page.fill('input[placeholder="Item 1: título"]', 'Detalhamento de esquadrias e vidros');
    // Datas previstas: amanhã e depois de amanhã
    await page.fill('#nova-data', amanha);
    await page.click('button:has-text("Adicionar data")');
    await page.click('button:has-text("+ dia seguinte")');
    await foto(page, '03-editor');
    await page.click('button:has-text("Criar orçamento")');
    await page.waitForURL(/\/orcamentos\/[0-9a-f-]{36}$/);
    await page.getByText('Enviar ao cliente').waitFor();
  });

  const urlOrcamento = page.url();
  let linkCliente = '';
  await passo('PDF do orçamento', async () => {
    const resp = await page.request.get(`${urlOrcamento.replace('/orcamentos/', '/api/orcamentos/')}/pdf`);
    if (resp.headers()['content-type'] !== 'application/pdf') throw new Error(`PDF não gerado: ${resp.status()}`);
  });

  await passo('marcar como enviado', async () => {
    await page.click('button:has-text("Marcar como enviado")');
    await page.locator('input[readonly]').waitFor();
    linkCliente = await page.locator('input[readonly]').inputValue();
    await foto(page, '04-orcamento');
  });

  await passo('cliente aprova pelo link (sem login)', async () => {
    const anonimo = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await anonimo.goto(linkCliente);
    await anonimo.check('input[name=concordo]');
    await anonimo.click('button:has-text("Aprovar orçamento")');
    await anonimo.getByText('Orçamento aprovado').waitFor();
    await foto(anonimo, '05-cliente-aprovou');
  });

  await passo('status aprovado no sistema', async () => {
    await page.reload();
    await page.getByText('✓ Aprovado em').waitFor();
    await page.getByText('Agenda, sinal e entrega').waitFor();
  });

  const chip = (status: string) => page.locator(`[data-grade] a[data-status=${status}]`, { hasText: obraNome }).first();

  await passo('pré-reserva na agenda', async () => {
    await page.goto(`${BASE}/agenda?data=${amanha}`);
    await chip('pre_reserva').waitFor();
    await foto(page, '06-agenda-pre-reserva');
  });

  await passo('registrar sinal pago', async () => {
    await page.goto(urlOrcamento);
    await page.click('button:has-text("Registrar sinal pago")');
    await page.getByText('✓ Sinal pago').waitFor();
  });

  await passo('agenda confirmada', async () => {
    await page.goto(`${BASE}/agenda?data=${amanha}`);
    await chip('confirmada').waitFor();
    if (await chip('pre_reserva').count()) throw new Error('Ainda há pré-reserva após o sinal');
    await foto(page, '07-agenda-confirmada');
  });

  await passo('Anderson vê em "Minha semana"', async () => {
    const anderson = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await anderson.goto(`${BASE}/login`);
    await anderson.fill('input[name=email]', 'anderson@lubian.local');
    await anderson.fill('input[name=senha]', process.env.SENHA_INICIAL ?? 'lubian2026');
    await anderson.click('button[type=submit]');
    await anderson.waitForURL(`${BASE}/minha-semana`);
    const card = anderson.locator(`[data-obra="${obraNome}"]`).first();
    await card.waitFor();
    await card.getByText('Confirmada').waitFor();
    await card.getByText('abrir no Maps').waitFor();
    await foto(anderson, '08-minha-semana');
  });

  await passo('serviço entregue → saldo registrado → recibo de quitação em PDF', async () => {
    await page.goto(urlOrcamento);
    page.once('dialog', (d) => d.accept());
    await page.click('button:has-text("Serviço entregue")');
    await page.getByText('✓ Serviço entregue em').waitFor();
    await page.goto(`${BASE}/financeiro?q=${encodeURIComponent(obraNome)}`);
    const saldo = page.locator(`li[data-cobranca="${obraNome}"][data-tipo=saldo]`);
    await saldo.locator('summary').click();
    await saldo.locator('button:has-text("Registrar pagamento")').click();
    const recibo = saldo.locator('a[data-recibo]');
    await recibo.waitFor();
    const nome = await pdf(page, (await recibo.getAttribute('href'))!);
    if (!/Recibo-Quitacao-REC-\d{4}-\d{4}\.pdf/.test(nome)) throw new Error(`Não é recibo de quitação: ${nome}`);
    await foto(page, '09-financeiro');
  });

  await passo('contrato recorrente → fatura em PDF', async () => {
    await page.goto(`${BASE}/contratos`);
    const novo = page.locator('form', { has: page.locator('button:has-text("Cadastrar contrato")') });
    const opcao = await novo.locator('select[name=obraId] option', { hasText: obraNome }).first().getAttribute('value');
    await novo.locator('select[name=obraId]').selectOption(opcao!);
    await novo.locator('input[name=saudacao]').fill('Querida cliente');
    for (const d of ['1', '3', '5']) await novo.locator(`input[name=diasSemana][value="${d}"]`).check();
    await novo.locator('button:has-text("Cadastrar contrato")').click();
    const contrato = page.locator(`[data-contrato="${obraNome}"]`);
    await contrato.waitFor();
    await contrato.locator('input[name=faltas]').fill('1');
    await contrato.locator('button:has-text("Gerar fatura")').click();
    await contrato.getByText(/Fatura FAT-\d{4}-\d{4} gerada/).waitFor();
    await contrato.locator('[data-fatura]').first().waitFor();
    await pdf(page, (await contrato.locator('a:has-text("PDF")').first().getAttribute('href'))!);
    // Link público enviado pelo WhatsApp (sem login).
    const whats = decodeURIComponent((await contrato.locator('a:has-text("WhatsApp")').first().getAttribute('href'))!);
    const publico = whats.match(/https?:\/\/\S+\/f\/[\w-]+/)?.[0];
    if (!publico) throw new Error('Mensagem sem link da fatura');
    const anonimo = await browser.newContext();
    await pdf(await anonimo.newPage(), publico);
    await anonimo.close();
    await foto(page, '10-contratos');
  });

  await passo('despesa da obra → lucro real no relatório', async () => {
    await page.goto(`${BASE}/despesas`);
    const opcao = await page.locator('select[name=orcamentoId] option', { hasText: obraNome }).first().getAttribute('value');
    await page.selectOption('select[name=orcamentoId]', opcao!);
    await page.selectOption('select[name=categoria]', 'transporte');
    await page.fill('input[name=descricao]', 'Uber equipe');
    await page.fill('input[name=valor]', '123,45');
    await page.click('button:has-text("Lançar despesa")');
    await page.getByText('Despesa lançada').waitFor();
    await page.goto(`${BASE}/relatorios?mes=${hojeSP().slice(0, 7)}`);
    const linha = page.locator(`tr[data-lucro-obra="${obraNome}"]`);
    await linha.waitFor();
    await linha.locator('[data-despesas]', { hasText: 'R$ 123,45' }).waitFor();
    await foto(page, '11-relatorios');
  });

  await passo('auxiliar não acessa o sistema', async () => {
    const outro = await (await browser.newContext()).newPage();
    await outro.goto(`${BASE}/orcamentos`);
    if (!outro.url().endsWith('/login')) throw new Error('Rota protegida acessível sem login');
  });

  if (erros.length) throw new Error(`Erros no navegador:\n${erros.join('\n')}`);
  console.log(`\nTudo certo. Capturas em ${SAIDA}/`);
} catch (e) {
  await foto(page, 'erro').catch(() => {});
  console.error('\nFALHOU:', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
