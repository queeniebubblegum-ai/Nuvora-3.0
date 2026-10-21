import { defineConfig, devices } from '@playwright/test';

// npm is named npm.cmd on Windows; keeping the server behind an npm script
// also avoids relying on shell-specific Python commands.
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export default defineConfig({
    testDir: './visual',
    timeout: 30_000,
    fullyParallel: false,
    reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },
    webServer: {
        command: `${npmCommand} run serve:visual -- 4173`,
        url: 'http://127.0.0.1:4173/index.html',
        reuseExistingServer: true,
        timeout: 15_000
    },
    projects: [
        { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
        { name: 'tablet-768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
        { name: 'mobile-400', use: { ...devices['Pixel 5'], viewport: { width: 400, height: 844 }, isMobile: true } },
        { name: 'mobile-375', use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 }, isMobile: true } }
    ]
});
