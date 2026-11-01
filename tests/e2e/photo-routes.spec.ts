import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  (page as Page & { appErrors?: string[] }).appErrors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { appErrors?: string[] }).appErrors).toEqual([]);
});

test('photo marking, favorites, records migration, accessibility and deletion', async ({
  page,
}) => {
  // Axe opens an extra page; keep its audit within this complete create/edit/delete workflow.
  test.setTimeout(60000);
  await page.goto('/#/routes');
  await page.screenshot({
    path: `artifacts/photo-routes-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect(page.locator('.photo-ai-status')).toContainText('DeepSeek');
  await page.getByRole('button', { name: '拍照 / 上传岩壁', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: '保存路线草稿' })).toBeDisabled();
  await expect(dialog.getByRole('checkbox', { name: '保存时同时收藏这条路线' })).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: '拍照', exact: true })).toBeVisible();
  await expect(dialog.getByLabel('拍摄岩壁照片')).toHaveAttribute('capture', 'environment');
  await dialog.getByLabel('上传岩壁照片').setInputFiles('public/images/climb-rock.jpg');
  await expect(dialog.locator('.photo-wall img')).toBeVisible();
  await dialog.getByRole('button', { name: '保存路线草稿' }).click();
  await expect(dialog.getByRole('alert')).toContainText('请标记 2–40 个岩点');
  await dialog.getByLabel('照片路线名称', { exact: true }).fill('平衡路线 A');
  await dialog.getByLabel('岩馆名称（选填）', { exact: true }).fill('我的真实岩馆');
  await dialog.getByLabel('训练目标', { exact: true }).selectOption('balance');
  const wall = dialog.locator('.photo-wall');
  const size = await wall.boundingBox();
  if (!size) throw new Error('Missing wall');
  await wall.click({ position: { x: size.width * 0.3, y: size.height * 0.8 } });
  await wall.click({ position: { x: size.width * 0.7, y: size.height * 0.2 } });
  await dialog.getByRole('button', { name: '在中心添加岩点' }).click();
  await dialog.getByRole('slider', { name: /^水平位置/ }).press('ArrowRight');
  await expect(dialog.getByRole('slider', { name: /^水平位置/ })).toHaveValue('51');
  await dialog.getByRole('button', { name: '上移岩点 3', exact: true }).click();
  await dialog.getByLabel('岩点 2 的类型').selectOption('foot');
  await expect(dialog.getByLabel('岩点 1 的类型')).toHaveValue('start');
  await expect(dialog.getByLabel('岩点 3 的类型')).toHaveValue('finish');
  await dialog.screenshot({ path: `artifacts/photo-editor-${test.info().project.name}.png` });
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(audit.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole('checkbox', { name: '保存时同时收藏这条路线' }).check();
  await dialog.getByRole('button', { name: '保存路线草稿' }).click();
  await expect(page).toHaveURL(/#\/records\?view=photos$/);
  await expect(page.getByRole('button', { name: '编辑照片路线平衡路线 A' })).toBeVisible();
  await page.reload();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('climbmate.v1') || '{}'));
  expect(data.photoRoutes).toHaveLength(1);
  expect(data.photoRoutes[0].source).toBe('manual');
  expect(data.photoRoutes[0].favorite).toBe(true);
  expect(data.photoRoutes[0].holds.map((hold: { role: string }) => hold.role)).toEqual([
    'start',
    'foot',
    'finish',
  ]);
  expect(data.photoRoutes[0].image).toMatch(/^data:image\/jpeg/);
  expect(data.sessions).toEqual([]);
  await expect(page.getByRole('button', { name: '取消收藏照片路线平衡路线 A' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/#/routes');
  await expect(page.locator('.photo-draft-card')).toHaveCount(0);
  await page.goto('/#/profile');
  const favoritesEntry = page.locator('.profile-menu-row').filter({ hasText: '收藏路线' });
  await expect(favoritesEntry).toContainText('1 条照片路线');
  await favoritesEntry.click();
  await expect(page).toHaveURL(/#\/records\?view=photos&favorites=1$/);
  await expect(page.getByRole('button', { name: /^只看收藏/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '取消收藏照片路线平衡路线 A' }).click();
  await expect(page.locator('.photo-draft-card')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '还没有收藏的照片路线' })).toBeVisible();
  const unfavorited = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('climbmate.v1') || '{}'),
  );
  expect(unfavorited.photoRoutes[0].favorite).toBe(false);
  expect(unfavorited.sessions).toEqual([]);
  await page.getByRole('button', { name: /^全部路线/ }).click();
  await expect(page.getByRole('button', { name: '收藏照片路线平衡路线 A' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: '收藏照片路线平衡路线 A' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '取消收藏照片路线平衡路线 A' })).toBeVisible();
  await page
    .locator('.record-views')
    .getByRole('button', { name: '攀岩记录', exact: true })
    .click();
  await expect(page.locator('.stat-card').nth(0)).toContainText('0次');
  await expect(page.locator('.session-card')).toHaveCount(0);
  await page.getByRole('button', { name: '照片路线', exact: true }).click();
  await page.getByRole('button', { name: '编辑照片路线平衡路线 A' }).click();
  await expect(dialog.getByLabel('岩馆名称（选填）')).toHaveValue('我的真实岩馆');
  await expect(dialog.getByRole('checkbox', { name: '保存时同时收藏这条路线' })).toBeChecked();
  await dialog.getByLabel('照片路线名称').fill('平衡路线 B');
  await dialog.getByRole('button', { name: '保存路线草稿' }).click();
  await page.reload();
  await page.getByRole('button', { name: '编辑照片路线平衡路线 B' }).click();
  await dialog.getByRole('button', { name: '删除照片路线', exact: true }).click();
  await dialog.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.locator('.photo-draft-card')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.photo-draft-card')).toHaveCount(0);
});

test('upload errors, cancelled replacement and save failures preserve work', async ({ page }) => {
  await page.goto('/#/routes');
  await page.getByRole('button', { name: '拍照 / 上传岩壁', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('上传岩壁照片').setInputFiles({
    name: 'broken.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('invalid image'),
  });
  await expect(dialog.getByRole('alert')).toContainText('图片无法读取');
  await dialog.getByLabel('上传岩壁照片').setInputFiles({
    name: 'oversized.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  });
  await expect(dialog.getByRole('alert')).toContainText('图片请小于 8 MB');
  await dialog.getByLabel('上传岩壁照片').setInputFiles('public/images/climb-rock.jpg');
  await expect(dialog.locator('.photo-wall img')).toBeVisible();
  await dialog.getByRole('button', { name: '在中心添加岩点' }).click();
  await dialog.getByRole('button', { name: '在中心添加岩点' }).click();
  await dialog.getByRole('button', { name: '更换照片', exact: true }).click();
  await expect(dialog.getByText('换图成功后会清除原照片的岩点标记。')).toBeVisible();
  await dialog.getByRole('button', { name: '保留原照片' }).click();
  await expect(dialog.locator('.photo-hold')).toHaveCount(2);
  await dialog.getByLabel('照片路线名称').fill('保存失败仍保留');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await dialog.getByRole('button', { name: '保存路线草稿' }).click();
  await expect(page.locator('.toast')).toContainText('保存失败');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('照片路线名称')).toHaveValue('保存失败仍保留');
  await expect(dialog.locator('.photo-hold')).toHaveCount(2);
});
