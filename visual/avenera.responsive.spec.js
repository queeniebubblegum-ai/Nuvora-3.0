import { test, expect } from '@playwright/test';

const pages = [
    ['Dashboard', 'dashboard'],
    ['Transactions', 'transacoes'],
    ['Planning', 'planejamento'],
    ['Accounts-Cards', 'contas'],
    ['Reports', 'relatorios'],
    ['Categories', 'categorias']
];

test.describe('Avenera responsive visual smoke suite', () => {
    for (const [name, hash] of pages) {
        test(`${name} stays visible and within viewport`, async ({ page }, testInfo) => {
            await page.goto(`/index.html#${hash}`, { waitUntil: 'networkidle' });
            await expect(page.locator('#main-content')).toBeVisible();
            await expect(page.locator('#main-content > *').first()).toBeVisible();

            const layout = await page.evaluate(() => ({
                viewport: window.innerWidth,
                documentWidth: document.documentElement.scrollWidth,
                mainWidth: document.querySelector('main')?.scrollWidth || 0
            }));
            // This is a structural responsive assertion, not a pixel snapshot.
            expect(layout.documentWidth, `${name} overflows at ${layout.viewport}px`).toBeLessThanOrEqual(layout.viewport + 1);
            expect(layout.mainWidth, `${name} main content overflows at ${layout.viewport}px`).toBeLessThanOrEqual(layout.viewport + 1);

            const fileName = `${name.toLowerCase()}-${testInfo.project.name}.png`;
            await page.screenshot({ path: testInfo.outputPath(fileName), fullPage: true });
        });
    }
});
