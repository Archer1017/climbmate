import { test, expect, type Page } from '@playwright/test';
import { createInitialState } from '../../src/lib/demo-data';
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('climbmate.v1') || '{}'));
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

test('route discovery keeps the photo workflow and home keeps its simplified sections', async ({
  page,
}) => {
  await page.goto('/#/routes');
  await expect(page.getByRole('heading', { name: '拍下岩壁，发现新的攀爬可能' })).toBeVisible();
  await expect(page.getByRole('button', { name: '拍照 / 上传岩壁', exact: true })).toBeVisible();
  await expect(page.locator('.route-card')).toHaveCount(0);
  await expect(page.locator('.photo-draft-card')).toHaveCount(0);
  await expect(page.locator('.route-search-row, .routes-filters, .grade-note')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '每条路线，都是新的可能' })).toHaveCount(0);
  await page.goto('/#/records');
  await expect(page.getByRole('button', { name: '照片路线', exact: true })).toBeVisible();
  await expect(page.locator('.stat-card')).toHaveCount(0);
  await page
    .locator('.record-views')
    .getByRole('button', { name: '攀岩记录', exact: true })
    .click();
  await expect(page).toHaveURL(/#\/records\?view=climbs$/);
  await expect(page.locator('.stat-card')).toHaveCount(4);
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: '下一次出发', exact: true })).toHaveCount(0);
  await expect(page.locator('.departure-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '下一条，值得一攀', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '最近的攀爬', exact: true })).toHaveCount(0);
  await expect(page.locator('.route-card, .recent-section, .recent-record')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '本周，向上的足迹', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /开始攀岩/ })).toBeVisible();
});

test('outdoor trip validation, independent checklists, and route addition', async ({ page }) => {
  await page.goto('/#/routes/forest-line');
  await page.getByRole('button', { name: '加入攀岩行程' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '创建行程', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('户外行程请填写紧急联系人');
  await dialog.getByLabel('紧急联系人（户外必填）').fill('岩友 10000000000');
  await dialog.getByLabel('返程计划（户外必填）').fill('17:00 收队，18:00 返回集合点');
  await dialog.getByRole('button', { name: '创建行程', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '林间回响 · 攀岩计划', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('尚未接入实时天气与地图服务。', { exact: false })).toBeVisible();
  const shoes = page.getByRole('checkbox', { name: '攀岩鞋', exact: true });
  await shoes.click();
  await expect(shoes).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '攀岩鞋', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  const first = (await stored(page)).trips[0];
  await page.goto('/#/routes/sunset-ridge');
  await page.getByRole('button', { name: '加入攀岩行程' }).click();
  await page.getByRole('dialog').getByLabel('加入已有行程，或新建').selectOption(first.id);
  await page.getByRole('button', { name: '加入选中行程' }).click();
  await expect(page.getByRole('button', { name: /日落山脊/ })).toBeVisible();
  expect((await stored(page)).trips[0].routeIds).toEqual(['forest-line', 'sunset-ridge']);
  await page.getByRole('button', { name: '新建行程', exact: true }).click();
  await page.getByLabel('行程名称', { exact: true }).fill('独立的室内抱石行程');
  await page.getByLabel('目的地', { exact: true }).fill('真实岩馆');
  await page.getByRole('dialog').getByRole('button', { name: '创建行程', exact: true }).click();
  await expect(page.getByRole('heading', { name: '独立的室内抱石行程' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '攀岩鞋', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(page.getByRole('checkbox', { name: /绳索/ })).toHaveCount(0);
});

test('a quick session needs no location and refreshes, edits, and deletes without invented results', async ({
  page,
}) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /开始攀岩/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('攀岩日期', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('攀岩类型', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('攀岩地点（选填）', { exact: true })).toBeVisible();
  await expect(dialog.locator('input, select, textarea')).toHaveCount(7);
  await expect(dialog.locator('input[type="file"], input[type="checkbox"], textarea')).toHaveCount(
    0,
  );
  await expect(
    dialog.getByLabel(/路线名称|尝试次数|今天的状态|从路线库选择|今天的感受/),
  ).toHaveCount(0);
  await dialog.getByLabel('攀爬时长（分钟）').fill('');
  await dialog.getByRole('button', { name: '保存攀岩记录' }).click();
  await expect(dialog.getByRole('alert')).toContainText('时长应为 1–1440 分钟');
  await dialog.getByLabel('攀爬时长（分钟）').fill('90');
  await dialog.getByLabel('路线难度 1', { exact: true }).selectOption('V:V3');
  await dialog.screenshot({ path: `artifacts/quick-session-${test.info().project.name}.png` });
  await dialog.getByRole('button', { name: '保存攀岩记录' }).click();
  await expect(dialog).toHaveCount(0);
  let record = (await stored(page)).sessions[0];
  expect(record).toMatchObject({ location: '', durationMinutes: 90, mood: null, effort: 5 });
  expect(record.attempts).toEqual([
    expect.objectContaining({
      routeName: '',
      gradeSystem: 'V',
      grade: 'V3',
      attempts: null,
      completed: null,
      failureReason: '',
    }),
  ]);
  await page.goto('/#/records?view=climbs');
  await expect(page.locator('.session-card')).toHaveCount(1);
  await expect(page.locator('.session-card')).toContainText('抱石记录');
  await expect(page.locator('.session-card')).toContainText(/1\s*条路线/);
  await expect(page.locator('.session-card')).toContainText(/主观难度\s*5\s*\/\s*10/);
  await expect(page.locator('.session-card')).toContainText('V3');
  await expect(page.locator('.session-card')).not.toContainText('状态不错');
  await expect(page.locator('.stat-card').nth(0)).toContainText('1次');
  await expect(page.locator('.stat-card').nth(1)).toContainText('1.5小时');
  await expect(page.locator('.stat-card').nth(2)).toContainText('0条');
  await expect(page.locator('.stat-card').nth(3)).toContainText('—');
  await expect(page.locator('.best-list')).not.toContainText('V3');
  await page.reload();
  record = (await stored(page)).sessions[0];
  expect(record.location).toBe('');
  expect(record.attempts[0].completed).toBeNull();
  await expect(page.locator('.stat-card').nth(3)).toContainText('—');
  await page.goto('/#/');
  await expect(page.locator('.weekly-number')).toContainText('1');
  await page.goto('/#/records?view=climbs');
  await page.locator('.session-card').click();
  await dialog.getByLabel('攀岩地点（选填）', { exact: true }).fill('真实岩馆');
  await dialog.getByLabel('未完攀原因 1（选填）', { exact: true }).selectOption('动作阅读');
  await dialog.getByRole('button', { name: '保存攀岩记录' }).click();
  await expect(page.locator('.session-card')).toContainText('真实岩馆');
  await expect(page.locator('.stat-card').nth(3)).toContainText('0%');
  record = (await stored(page)).sessions[0];
  expect(record.attempts[0]).toMatchObject({
    completed: false,
    attempts: null,
    failureReason: '动作阅读',
  });
  await page.reload();
  await page.locator('.session-card').click();
  await expect(dialog.getByLabel('未完攀原因 1（选填）', { exact: true })).toHaveValue('动作阅读');
  await dialog.getByLabel('未完攀原因 1（选填）', { exact: true }).selectOption('');
  await dialog.getByRole('button', { name: '保存攀岩记录' }).click();
  await expect(page.locator('.stat-card').nth(3)).toContainText('—');
  expect((await stored(page)).sessions[0].attempts[0].completed).toBeNull();
  await page.reload();
  await page.locator('.session-card').click();
  await dialog.getByRole('button', { name: '删除记录', exact: true }).click();
  await dialog.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.locator('.session-card')).toHaveCount(0);
  await expect(page.locator('.stat-card').nth(0)).toContainText('0次');
});

test('the single difficulty selector supports separate grading systems and multiple routes', async ({
  page,
}) => {
  await page.goto('/#/records?view=climbs');
  await page.getByRole('button', { name: '记录攀岩', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const firstGrade = dialog.getByLabel('路线难度 1', { exact: true });
  await expect(firstGrade.locator('optgroup')).toHaveCount(2);
  await firstGrade.selectOption('Font:6A');
  await dialog.getByRole('button', { name: '再添加一条路线', exact: true }).click();
  await dialog.getByLabel('路线难度 2', { exact: true }).selectOption('V:V2');
  await dialog.getByRole('button', { name: '保存攀岩记录' }).click();
  expect((await stored(page)).sessions[0].attempts).toEqual([
    expect.objectContaining({ gradeSystem: 'Font', grade: '6A', completed: null }),
    expect.objectContaining({ gradeSystem: 'V', grade: 'V2', completed: null }),
  ]);
  await page.reload();
  await page.locator('.session-card').click();
  await expect(dialog.getByLabel('路线难度 1', { exact: true })).toHaveValue('Font:6A');
  await expect(dialog.getByLabel('路线难度 2', { exact: true })).toHaveValue('V:V2');
  await dialog.locator('fieldset').first().getByRole('button', { name: '移除此路线' }).click();
  await expect(dialog.getByLabel('路线难度 2', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('路线难度 1', { exact: true })).toHaveValue('V:V2');
  await dialog.getByLabel('攀岩类型', { exact: true }).selectOption('sport');
  await expect(
    dialog.getByLabel('路线难度 1', { exact: true }).locator('option[value="V:V2"]'),
  ).toHaveCount(0);
  await dialog.getByLabel('路线难度 1', { exact: true }).selectOption('YDS:5.10a');
  await dialog.getByRole('button', { name: '保存攀岩记录' }).click();
  expect((await stored(page)).sessions[0]).toMatchObject({
    type: 'sport',
    attempts: [expect.objectContaining({ gradeSystem: 'YDS', grade: '5.10a' })],
  });
});

test('editing a legacy session keeps completion, attempt counts, and hidden memories', async ({
  page,
}) => {
  const state = createInitialState();
  const legacy = {
    id: 'legacy-session',
    ownerId: state.user.id,
    date: '2026-10-18',
    location: '旧岩馆',
    type: 'bouldering' as const,
    durationMinutes: 90,
    effort: 6,
    mood: 'great' as const,
    notes: '以前写下的日记',
    image: 'data:image/jpeg;base64,bGVnYWN5',
    attempts: [
      {
        routeId: 'legacy-route',
        routeName: '旧蓝线',
        gradeSystem: 'V' as const,
        grade: 'V3',
        attempts: 4,
        completed: true,
        failureReason: '',
        notes: '以前记录的动作感受',
      },
    ],
  };
  state.sessions = [legacy];
  await page.goto('/#/records?view=climbs');
  await page.evaluate(
    (value) => localStorage.setItem('climbmate.v1', JSON.stringify(value)),
    state,
  );
  await page.reload();
  await expect(page.locator('.stat-card').nth(3)).toContainText('100%');
  await expect(page.locator('.best-list')).toContainText('V3');
  await page.locator('.session-card').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('路线难度 1', { exact: true })).toHaveValue('V:V3');
  await dialog.getByLabel('攀爬时长（分钟）').fill('75');
  await dialog.getByRole('button', { name: '保存攀岩记录' }).click();
  await page.reload();
  expect((await stored(page)).sessions[0]).toEqual({ ...legacy, durationMinutes: 75 });
  await expect(page.locator('.stat-card').nth(2)).toContainText('1条');
  await expect(page.locator('.stat-card').nth(3)).toContainText('100%');
});

test('gear lists adapt to environment and inventory inspections persist', async ({ page }) => {
  await page.goto('/#/gear');
  await expect(page.getByRole('checkbox', { name: /安全带/ })).toHaveCount(0);
  await page.getByRole('checkbox', { name: '攀岩鞋', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '攀岩鞋', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByLabel('攀岩环境', { exact: true }).selectOption('outdoor');
  await expect(page.getByRole('checkbox', { name: /抱石垫/ })).toHaveCount(1);
  await expect(page.getByRole('checkbox', { name: /绳索/ })).toHaveCount(0);
  await page.getByLabel('攀岩类型', { exact: true }).selectOption('sport');
  await expect(page.getByRole('checkbox', { name: /适配路线的绳索/ })).toHaveCount(1);
  await page.getByRole('button', { name: '添加我的装备', exact: true }).click();
  await page.getByLabel('装备名称', { exact: true }).fill('我的保护器');
  await page.getByLabel('装备分类', { exact: true }).selectOption('safety');
  await page.getByLabel('品牌（选填）').fill('测试品牌');
  await page.getByRole('checkbox', { name: '添加一次检查记录' }).check();
  await page.getByLabel('检查结果', { exact: true }).selectOption('needs-review');
  await page.getByRole('button', { name: '保存装备', exact: true }).click();
  await expect(page.getByRole('button', { name: /我的保护器/ })).toContainText('待检查');
  await page.reload();
  await page.getByRole('button', { name: /我的保护器/ }).click();
  await expect(page.getByRole('dialog').getByText('需核查', { exact: true })).toBeVisible();
  expect((await stored(page)).gear[0].inspections[0].result).toBe('needs-review');
});

test('training can be adjusted and completed without auto-rating the user', async ({ page }) => {
  await page.goto('/#/training');
  await page.getByRole('button', { name: '生成今日训练', exact: true }).click();
  await expect(page.locator('.training-plan')).toHaveCount(1);
  await page.getByRole('checkbox', { name: /^全身热身/ }).click();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /^全身热身/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: '编辑计划', exact: true }).click();
  await page.getByLabel('训练目标', { exact: true }).fill('练习安静脚步');
  await page.getByLabel('时长（分钟）1', { exact: true }).fill('12');
  await page.getByRole('button', { name: '保存训练计划', exact: true }).click();
  await expect(page.getByRole('heading', { name: '练习安静脚步', exact: true })).toBeVisible();
  expect((await stored(page)).user.stage).toBe('beginner');
  expect((await stored(page)).trainingPlans[0].exercises[0].durationMinutes).toBe(12);
  await page.getByRole('button', { name: '下一周', exact: true }).click();
  await expect(page.locator('.training-plan')).toHaveCount(0);
  await page.getByRole('button', { name: '生成当天训练', exact: true }).click();
  await expect(page.locator('.training-plan')).toHaveCount(1);
  await page.getByRole('button', { name: '本周', exact: true }).click();
  await expect(page.getByRole('heading', { name: '练习安静脚步', exact: true })).toBeVisible();
});

test('profile and notifications persist, every page fits phone and desktop', async ({ page }) => {
  await page.goto('/#/profile');
  await page.getByRole('button', { name: '编辑资料', exact: true }).click();
  await page.getByLabel('你的昵称', { exact: true }).fill('小岩');
  await page.getByLabel('每周目标（次）').fill('3');
  await page.getByRole('button', { name: '保存资料', exact: true }).click();
  await page.getByRole('switch', { name: '应用内提醒', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '小岩', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: '应用内提醒', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  for (const path of [
    '/',
    '/routes',
    '/routes/forest-line',
    '/plans',
    '/gear',
    '/training',
    '/records',
    '/records?view=climbs',
    '/records?view=photos&favorites=1',
    '/profile',
  ]) {
    await page.goto('/#' + path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.mobile-nav [aria-current="page"]')).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole('button', { name: '通知与提醒', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('暂时没有待处理的提醒');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('corrupt saved data is visible and protected from overwrite', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('climbmate.v1', '{unreadable-data'));
  await page.reload();
  await expect(page.locator('.storage-alert')).toContainText('原始数据未被删除');
  await page.goto('/#/profile');
  await page.getByRole('button', { name: '编辑资料', exact: true }).click();
  await page.getByLabel('你的昵称', { exact: true }).fill('不覆盖原数据');
  await page.getByRole('button', { name: '保存资料', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保护原始数据');
  expect(await page.evaluate(() => localStorage.getItem('climbmate.v1'))).toBe('{unreadable-data');
  await expect(page.getByRole('dialog')).toBeVisible();
});
