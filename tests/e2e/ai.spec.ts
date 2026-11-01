import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const suggestion = {
  name: '重心候选路线',
  summary: '围绕可见岩点进行重心控制练习，需现场确认。',
  holds: [
    { x: 30, y: 85, role: 'start', instruction: '核对起点再准备。' },
    { x: 45, y: 55, role: 'foot', instruction: '观察脚点与重心。' },
    { x: 60, y: 20, role: 'finish', instruction: '终点需现场确认。' },
  ],
  limitations: ['照片无法确认岩点牢固程度。'],
  model: 'test-vision-model',
  generatedAt: '2026-10-18T00:00:00.000Z',
};
// All AI responses in this suite are explicit test doubles; no provider is called.
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  (page as Page & { appErrors?: string[] }).appErrors = errors;
  await page.route('**/api/ai/status', (route) =>
    route.fulfill({
      json: {
        status: 'configured',
        model: 'test-vision-model',
        message: '测试接口已配置，尚未验证',
      },
    }),
  );
  await page.route('**/api/ai/check', (route) =>
    route.fulfill({
      json: { status: 'verified', model: 'test-vision-model', message: '测试连接检查通过' },
    }),
  );
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { appErrors?: string[] }).appErrors).toEqual([]);
});
async function editor(page: Page) {
  await page.goto('/#/routes');
  await page.getByRole('button', { name: '拍照 / 上传岩壁', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('上传岩壁照片').setInputFiles('public/images/climb-rock.jpg');
  await expect(dialog.locator('.photo-wall img')).toBeVisible();
  return dialog;
}
test('AI preview needs confirmation, saves analysis and invalidates it after manual editing', async ({
  page,
}) => {
  test.setTimeout(60000);
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/ai/photo-route', (route) => {
    expect(route.request().headers().authorization).toBeUndefined();
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: suggestion });
  });
  const dialog = await editor(page);
  await dialog.getByRole('button', { name: '检查连接', exact: true }).click();
  await expect(dialog.getByText('测试连接检查通过')).toBeVisible();
  await dialog.getByRole('button', { name: '在中心添加岩点' }).click();
  await dialog.getByRole('button', { name: '在中心添加岩点' }).click();
  await dialog.getByLabel('照片路线名称').fill('原有手动路线');
  await dialog.getByLabel('AI 训练目标', { exact: true }).selectOption('balance');
  await dialog.getByRole('button', { name: 'AI 识别并生成路线', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '确认并应用到草稿' })).toBeVisible();
  expect(Object.keys(submitted || {}).sort()).toEqual(['focus', 'image']);
  expect(submitted?.focus).toBe('balance');
  expect(submitted?.image).toMatch(/^data:image\/jpeg/);
  await expect(dialog.getByLabel('照片路线名称')).toHaveValue('原有手动路线');
  await expect(dialog.locator('.photo-edit-fields .photo-hold')).toHaveCount(2);
  await expect(dialog.locator('.ai-preview-wall .photo-hold')).toHaveCount(3);
  await dialog.screenshot({ path: `artifacts/deepseek-preview-${test.info().project.name}.png` });
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(audit.violations).toEqual([]);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: '确认并应用到草稿' }).click();
  await expect(dialog.getByLabel('照片路线名称')).toHaveValue(suggestion.name);
  await expect(dialog.locator('.photo-edit-fields .photo-hold')).toHaveCount(3);
  await dialog.getByRole('button', { name: '保存路线草稿' }).click();
  await expect(page).toHaveURL(/#\/records\?view=photos$/);
  await page.reload();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('climbmate.v1') || '{}'),
  );
  expect(stored.photoRoutes[0].source).toBe('deepseek');
  expect(stored.photoRoutes[0].favorite).toBe(false);
  expect(stored.photoRoutes[0].ai).toEqual(suggestion);
  expect(stored.sessions).toEqual([]);
  await page.getByRole('button', { name: `收藏照片路线${suggestion.name}` }).click();
  await expect(
    page.getByRole('button', { name: `取消收藏照片路线${suggestion.name}` }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: `编辑照片路线${suggestion.name}` }).click();
  await expect(dialog.getByText('查看已保存的 AI 动作建议')).toBeVisible();
  await dialog.getByRole('button', { name: '选择岩点 1', exact: true }).click();
  await dialog.getByRole('slider', { name: /^水平位置/ }).press('ArrowRight');
  await expect(dialog.getByText('查看已保存的 AI 动作建议')).toHaveCount(0);
  await dialog.getByRole('button', { name: '保存路线草稿' }).click();
  const manual = await page.evaluate(
    () => JSON.parse(localStorage.getItem('climbmate.v1') || '{}').photoRoutes[0],
  );
  expect(manual.source).toBe('manual');
  expect(manual.favorite).toBe(true);
  expect(manual.ai).toBeUndefined();
});

test('AI failures, cancellation and changed targets preserve the existing route', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.route('**/api/ai/photo-route', (route) =>
    route.fulfill({
      status: 502,
      json: { error: { code: 'auth_error', message: 'DeepSeek 鉴权失败，请检查中转配置' } },
    }),
  );
  const dialog = await editor(page);
  await dialog.getByRole('button', { name: '在中心添加岩点' }).click();
  await dialog.getByLabel('照片路线名称').fill('不被覆盖');
  await dialog.getByRole('button', { name: 'AI 识别并生成路线' }).click();
  await expect(dialog.getByRole('alert')).toContainText('DeepSeek 鉴权失败');
  await expect(dialog.getByLabel('照片路线名称')).toHaveValue('不被覆盖');
  await expect(dialog.locator('.photo-edit-fields .photo-hold')).toHaveCount(1);
  let finish: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.unroute('**/api/ai/photo-route');
  await page.route('**/api/ai/photo-route', async (route) => {
    await pending;
    await route.fulfill({ json: suggestion }).catch(() => {});
  });
  await dialog.getByRole('button', { name: 'AI 识别并生成路线' }).click();
  await expect(dialog.getByRole('button', { name: '保存路线草稿' })).toBeDisabled();
  await dialog.getByRole('button', { name: '取消生成', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('已取消生成');
  finish();
  await expect(dialog.getByRole('button', { name: '确认并应用到草稿' })).toHaveCount(0);
  await expect(dialog.getByLabel('照片路线名称')).toHaveValue('不被覆盖');
  await page.unroute('**/api/ai/photo-route');
  await page.route('**/api/ai/photo-route', (route) => route.fulfill({ json: suggestion }));
  await dialog.getByRole('button', { name: 'AI 识别并生成路线' }).click();
  await expect(dialog.getByRole('button', { name: '确认并应用到草稿' })).toBeVisible();
  await dialog.getByLabel('AI 训练目标', { exact: true }).selectOption('reading');
  await expect(dialog.getByRole('button', { name: '确认并应用到草稿' })).toHaveCount(0);
  await expect(dialog.locator('.photo-edit-fields .photo-hold')).toHaveCount(1);
});
