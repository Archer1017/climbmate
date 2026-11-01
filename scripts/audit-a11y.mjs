import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.CLIMBMATE_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch();
const reports = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1024 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const audit = async (surface) => {
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      reports.push({ width, surface, violations: result.violations });
      console.log(`${width}px ${surface}: ${result.violations.length} violations`);
    };
    for (const path of [
      '/',
      '/routes',
      '/routes/forest-line',
      '/plans',
      '/gear',
      '/training',
      '/records',
      '/profile',
    ]) {
      await page.goto(baseURL + '/#' + path);
      await audit(path);
    }
    for (const [path, name] of [
      ['/plans', '新建行程'],
      ['/records', '记录攀岩'],
      ['/gear', '添加我的装备'],
      ['/training', '自定义训练'],
      ['/profile', '编辑资料'],
    ]) {
      await page.goto(baseURL + '/#' + path);
      await page.getByRole('button', { name, exact: true }).click();
      await audit(`dialog:${name}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/accessibility-audit.json', JSON.stringify(reports, null, 2));
if (reports.some((report) => report.violations.length)) process.exitCode = 1;
