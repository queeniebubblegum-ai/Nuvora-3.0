import { spawnSync } from 'node:child_process';

const probe = spawnSync(process.execPath, ['-e', "import('@playwright/test').then(() => process.exit(0)).catch(() => process.exit(1))"], { stdio: 'ignore' });
if (probe.status !== 0) {
    console.error('Opt-in visual tests require @playwright/test. Install it with:');
    console.error('  npm install --save-dev @playwright/test');
    console.error('  npx playwright install chromium');
    console.error('Then run: npm run test:visual');
    process.exit(2);
}

const args = process.argv.slice(2);
const result = spawnSync('npx', ['playwright', 'test', '-c', 'playwright.config.js', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
