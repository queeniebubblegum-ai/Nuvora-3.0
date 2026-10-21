import { test, expect } from '@playwright/test';
import { seedLayoutFixture } from './layout-fixture.js';

test.beforeEach(async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.App?.isInitialized);
    await seedLayoutFixture(page);
});

test('vencimentos mantêm nome, data e valor em colunas legíveis', async ({ page }) => {
    await page.evaluate(() => App.navigate('Planejamento'));
    const rows = page.locator('.nv-planning-due-row');
    await expect(rows).toHaveCount(5);
    const dimensions = await rows.evaluateAll(elements => elements.map(row => {
        const copy = row.querySelector('.nv-planning-due-copy').getBoundingClientRect();
        const value = row.querySelector('b').getBoundingClientRect();
        const label = row.querySelector('.nv-planning-due-copy span');
        return { width: copy.width, right: copy.right, valueLeft: value.left, dateHeight: label.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(label).lineHeight) };
    }));
    for (const row of dimensions) {
        expect(row.width).toBeGreaterThan(120);
        expect(row.right).toBeLessThanOrEqual(row.valueLeft - 8);
        expect(row.dateHeight).toBeLessThanOrEqual(row.lineHeight + 1);
    }
});

test('cada dia agrupa seus lançamentos e as ações não quebram palavras', async ({ page }) => {
    await page.evaluate(() => App.navigate('Transacoes'));
    await expect(page.locator('.nv-tx-date-group')).toHaveCount(7);
    await expect(page.locator('.nv-tx-date-group').last().locator('.nv-tx-row')).toHaveCount(3);
    const rows = await page.locator('.nv-tx-row').evaluateAll(elements => elements.map(row => ({
        width: row.getBoundingClientRect().width, scroll: row.scrollWidth,
        titleLeft: row.querySelector('.nv-tx-title-line strong').getBoundingClientRect().left,
        copyLeft: row.querySelector('.nv-tx-description').getBoundingClientRect().left,
        actions: [...row.querySelectorAll('.nv-tx-row-actions button')].map(button => {
            const s = getComputedStyle(button.querySelector('span'));
            return { display: s.display, height: button.querySelector('span').getBoundingClientRect().height, line: parseFloat(s.lineHeight) };
        })
    })));
    for (const row of rows) {
        expect(row.scroll).toBeLessThanOrEqual(row.width + 1);
        expect(row.titleLeft).toBeCloseTo(row.copyLeft, 0);
        for (const action of row.actions) if (action.display !== 'none') expect(action.height).toBeLessThanOrEqual(action.line + 1);
    }
    await page.locator('.nv-tx-row').first().getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: /Apagar selecionadas/ })).toBeVisible();
});

test('ícone de categoria mantém a mesma cor na lista e no cadastro', async ({ page }) => {
    await page.evaluate(() => App.navigate('Transacoes'));
    const transactionColor = await page.locator('[data-id="layout-market"] .nv-tx-category-icon').evaluate(el => getComputedStyle(el).color);
    await page.evaluate(() => App.navigate('Categorias'));
    const group = page.locator('.nv-category-card').filter({ has: page.locator('.nv-category-card__main strong', { hasText: /^Alimentação$/ }) });
    await group.locator('summary').first().click();
    const categoryColor = await page.locator('[data-category-id="cat_padrao_2"] .nv-category-row-icon').evaluate(el => getComputedStyle(el).color);
    const groupColor = await group.locator('.nv-category-card__icon').evaluate(el => getComputedStyle(el).color);
    expect(categoryColor).toBe(transactionColor);
    expect(groupColor).toBe(categoryColor);
});
