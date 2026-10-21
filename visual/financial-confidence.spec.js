import { test, expect } from '@playwright/test';

const boot = async page => {
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.App?.isInitialized && document.querySelector('#main-content')?.children.length);
};
const seed = page => page.evaluate(async () => {
    const { Database } = await import('/db.js');
    await Database.replaceAll({ bancos: [{ id: 'bank_text_1', nome: 'Conta de teste', saldo: 1000, saldoInicial: 1000, dataCriacao: '2026-01-01' }], cartoes: [{ id: 'card_text_1', bancoId: 'bank_text_1', nome: 'Cartão de teste', limite: 1000, fechamento: 25, vencimento: 5, final: '1234' }], transacoes: [] }, { mode: 'exact' });
});

test.beforeEach(async ({ page }) => { await boot(page); await seed(page); });

test('duas abas recusam sobrescrita e conservam o lançamento já confirmado', async ({ page, context }) => {
    const second = await context.newPage(); await boot(second);
    await page.evaluate(async () => {
        const { Database } = await import('/db.js');
        await Database.add('transacoes', { id: 'from-a', desc: 'A', tipo: 'despesa', valor: 10, bancoId: 'bank_text_1', data: '2026-10-21' });
    });
    const rejection = await second.evaluate(async () => {
        const { Database } = await import('/db.js');
        try { await Database.add('transacoes', { id: 'from-b', desc: 'B', tipo: 'despesa', valor: 20, bancoId: 'bank_text_1', data: '2026-10-21' }); return null; }
        catch (error) { return error.name; }
    });
    expect(rejection).toBe('DataConflictError');
    await page.reload(); await page.waitForFunction(() => window.App?.isInitialized);
    const persisted = await page.evaluate(async () => { const { db } = await import('/db.js'); return { ids: db.transacoes.map(t => t.id), balance: db.bancos[0].saldo }; });
    expect(persisted).toEqual({ ids: ['from-a'], balance: 990 });
});

test('rascunho sobrevive ao reload e só modifica o saldo após salvar', async ({ page }) => {
    await page.evaluate(() => App.openModal('modal-transacao', 'despesa'));
    await page.locator('#input-desc').fill('Despesa retomada');
    await page.locator('#input-valor').fill('12.34');
    await page.locator('#input-banco-trans').selectOption('bank_text_1');
    await page.reload(); await page.waitForFunction(() => window.App?.isInitialized);
    await expect(page.locator('[data-resume-draft]')).toBeVisible();
    await page.locator('[data-resume-draft]').click();
    await expect(page.locator('#input-desc')).toHaveValue('Despesa retomada');
    await expect(page.locator('#input-valor')).toHaveValue('12.34');
    expect(await page.evaluate(async () => (await import('/db.js')).db.bancos[0].saldo)).toBe(1000);
    await page.locator('#btn-submit-transacao').click();
    await expect(page.locator('#modal-transacao')).toBeHidden();
    await expect.poll(() => page.evaluate(async () => (await import('/db.js')).db.bancos[0].saldo)).toBe(987.66);
    await page.reload(); await page.waitForFunction(() => window.App?.isInitialized);
    expect(await page.evaluate(async () => (await import('/db.js')).db.transacoes.length)).toBe(1);
    await expect(page.locator('[data-resume-draft]')).toHaveCount(0);
});

test('falha de persistência mantém cadastro aberto e não cria conta fictícia', async ({ page }) => {
    await page.evaluate(async () => {
        const m = await import('/db.js');
        m.__setTransactionPersistenceWriterForTests(() => Promise.reject(new Error('Falha de armazenamento de teste')));
        App.openModal('modal-banco');
    });
    await page.locator('#banco-nome').fill('Não salva');
    await page.locator('#banco-saldo').fill('50');
    await page.locator('#banco-instituicao').selectOption({ index: 1 });
    await page.locator('#modal-banco button[type="submit"]').click();
    await expect(page.getByText('Falha de armazenamento de teste', { exact: true })).toBeVisible();
    await expect(page.locator('#modal-banco')).toBeVisible();
    expect(await page.evaluate(async () => (await import('/db.js')).db.bancos.length)).toBe(1);
    await page.reload(); await page.waitForFunction(() => window.App?.isInitialized);
    expect(await page.evaluate(async () => (await import('/db.js')).db.bancos.length)).toBe(1);
    await page.locator('[data-resume-draft]').click();
    await expect(page.locator('#banco-nome')).toHaveValue('Não salva');
});

test('conferência de conta permanece pendente até referência e revisão explícita', async ({ page }) => {
    await page.evaluate(async () => {
        const { Database } = await import('/db.js');
        await Database.add('transacoes', { id: 'cash', desc: 'Mercado', tipo: 'despesa', valor: 100, bancoId: 'bank_text_1', data: new Date().toLocaleDateString('en-CA') });
        App.navigate('Conciliacao');
    });
    await page.locator('[name="reference"]').fill('900');
    await page.locator('[name="source"]').fill('Extrato consultado no banco');
    await page.getByRole('button', { name: 'Salvar referência', exact: true }).click();
    await expect(page.locator('[data-review-complete]')).toBeDisabled();
    await page.locator('[data-review-check="cash"]').click();
    await expect(page.locator('[data-review-complete]')).toBeEnabled();
    await page.locator('[data-review-complete]').click();
    await expect(page.getByText(/Conferência concluída em/)).toBeVisible();
    await page.reload(); await page.waitForFunction(() => window.App?.isInitialized);
    await expect(page.getByText(/Conferência concluída em/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('pagamento parcial pela interface mantém restante e não duplica consumo', async ({ page }) => {
    await page.evaluate(async () => {
        const { Database } = await import('/db.js');
        await Database.addCardExpense({ id: 'card-purchase', desc: 'Compra', total: 100, parcelas: 1, cartaoId: 'card_text_1', data: new Date().toLocaleDateString('en-CA') });
        await App.openInvoicePaymentForCard('card_text_1');
    });
    await page.locator('#invoice-payment-value').fill('40');
    await page.locator('#invoice-payment-confirm').click();
    await expect(page.locator('#modal-pagar-fatura')).toBeHidden();
    const result = await page.evaluate(async () => { const { db, Database } = await import('/db.js'); return { balance: db.bancos[0].saldo, expense: Database.getTotals().despesas, remaining: db.agendamentos.find(s => s.categoria === 'Fatura Cartão').saldoDevedor }; });
    expect(result).toEqual({ balance: 960, expense: 100, remaining: 60 });
});

test('relatórios continuam consultáveis quando Chart.js não está disponível', async ({ page }) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.evaluate(async () => {
        const { Database } = await import('/db.js');
        await Database.add('transacoes', { id: 'cash', desc: 'Mercado', valor: 10, tipo: 'despesa', bancoId: 'bank_text_1', data: new Date().toLocaleDateString('en-CA') });
        window.Chart = undefined; App.navigate('Relatorios');
    });
    await expect(page.locator('#main-content')).toContainText('Fluxo de Caixa');
    await page.waitForTimeout(100);
    expect(errors).toEqual([]);
});

test('arquivo de referência sugere vínculo e retoma sem importar despesas automaticamente', async ({ page }) => {
    const date = await page.evaluate(async () => {
        const date = new Date().toLocaleDateString('en-CA');
        await (await import('/db.js')).Database.add('transacoes', { id: 'cash', desc: 'Mercado Central', tipo: 'despesa', valor: 100, bancoId: 'bank_text_1', data: date });
        App.navigate('Conciliacao'); return date;
    });
    await page.locator('[name="reference"]').fill('900');
    await page.locator('[name="source"]').fill('Extrato local');
    await page.getByRole('button', { name: 'Salvar referência', exact: true }).click();
    await page.locator('[data-review-file]').setInputFiles({ name: 'extrato.csv', mimeType: 'text/csv', buffer: Buffer.from(`data;valor;descricao\n${date};-100;Mercado Central`) });
    await expect(page.getByText(/Possível correspondência: Direção/)).toBeVisible();
    await expect(page.locator('[data-review-complete]')).toBeDisabled();
    expect(await page.evaluate(async () => (await import('/db.js')).db.transacoes.length)).toBe(1);
    await page.reload(); await page.waitForFunction(() => window.App?.isInitialized);
    await page.locator('[data-reference-for="cash"]').selectOption('reference-1');
    await page.locator('[data-review-check="cash"]').click();
    await page.locator('[data-review-complete]').click();
    await expect(page.getByText(/Conferência concluída em/)).toBeVisible();
});

test('atualização aguarda abas antigas e mostra recuperação em vez de uma tela vazia', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const legacy = await context.newPage(); await legacy.goto(`${baseURL}/privacidade/`);
    await legacy.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('NuvoraDB', 2);
        request.onupgradeneeded = () => request.result.createObjectStore('keyval');
        request.onsuccess = () => { window.legacyDatabase = request.result; resolve(); };
        request.onerror = () => reject(request.error);
    }));
    const current = await context.newPage(); await current.goto(`${baseURL}/index.html`);
    await expect(current.getByRole('alert')).toContainText('Feche as outras abas antigas');
    await legacy.close();
    await current.getByRole('button', { name: 'Tentar novamente' }).click();
    await current.waitForFunction(() => window.App?.isInitialized);
    await expect(current.locator('#main-content')).toContainText('Visão geral');
    await context.close();
});

test('edição explicita redistribuição de parcelas e preserva as anteriores', async ({ page }) => {
    await page.evaluate(async () => {
        const { Database } = await import('/db.js');
        await Database.addCardExpense({ id: 'split', desc: 'Compra parcelada', total: 100, parcelas: 3, cartaoId: 'card_text_1', data: new Date().toLocaleDateString('en-CA') });
        App.navigate('Transacoes'); App.openEditModal('split-2');
    });
    await page.locator('#btn-unlock-edit').click();
    await page.locator('#edit-purchase-scope').selectOption('remaining');
    await page.locator('#edit-purchase-total').fill('90');
    await page.locator('#btn-save-edit').click();
    await expect(page.locator('#modal-editar-transacao')).toBeHidden();
    const result = await page.evaluate(async () => (await import('/db.js')).db.transacoes.map(t => ({ id: t.id, valor: t.valor }))) ;
    expect(result.find(t => t.id === 'split-1').valor).toBe(33.34);
    expect(result.filter(t => t.id !== 'split-1').map(t => t.valor)).toEqual([45,45]);
});

test('limpeza integral remove também chaves financeiras legadas em uma única gravação', async ({ page }) => {
    const result = await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open('NuvoraDB');
            request.onsuccess = () => {
                const connection = request.result, transaction = connection.transaction('keyval', 'readwrite');
                transaction.objectStore('keyval').put({ valor: 25 }, 'old-financial-cache');
                transaction.oncomplete = () => { connection.close(); resolve(); };
                transaction.onerror = () => reject(transaction.error);
            };
        });
        const { Database, db } = await import('/db.js'); await Database.clearAll();
        const legacy = await new Promise((resolve, reject) => {
            const request = indexedDB.open('NuvoraDB');
            request.onsuccess = () => {
                const connection = request.result, transaction = connection.transaction('keyval', 'readonly');
                const read = transaction.objectStore('keyval').get('old-financial-cache');
                transaction.oncomplete = () => { connection.close(); resolve(read.result); };
                transaction.onerror = () => reject(transaction.error);
            };
        });
        return { banks: db.bancos.length, transactions: db.transacoes.length, legacyAbsent: legacy === undefined };
    });
    expect(result).toEqual({ banks: 0, transactions: 0, legacyAbsent: true });
});
