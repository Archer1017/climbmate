import { describe, expect, it } from 'vitest';
import {
  checklistProgress,
  computeSessionStats,
  createInitialState,
  createLocalRepository,
  createTrainingPlan,
  generateChecklist,
  getTrainingSuggestion,
  isAppState,
  parseLocalDate,
  STORAGE_KEY,
  validateGear,
  validateSession,
  validateTrainingPlan,
  validateTrip,
  validateUser,
  type AppState,
  type ClimbingSession,
  type StorageAdapter,
  type Trip,
} from '../src/lib';
const owner = 'local-user';
function session(part: Partial<ClimbingSession> = {}): ClimbingSession {
  return {
    id: 'session-1',
    ownerId: owner,
    date: '2026-10-18',
    location: '真实岩馆',
    type: 'bouldering',
    durationMinutes: 90,
    effort: 5,
    mood: 'good',
    notes: '',
    attempts: [
      {
        routeId: '',
        routeName: '蓝线',
        gradeSystem: 'V',
        grade: 'V3',
        completed: true,
        attempts: 3,
        failureReason: '',
        notes: '',
      },
    ],
    ...part,
  };
}
function quickSession(part: Partial<ClimbingSession> = {}): ClimbingSession {
  const record = session({ location: '', mood: null, ...part });
  return {
    ...record,
    attempts: record.attempts.map((attempt) => ({
      ...attempt,
      routeName: '',
      attempts: null,
      completed: null,
    })),
  };
}
function trip(part: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    ownerId: owner,
    title: '周末抱石',
    date: '2026-10-20',
    destination: '我的岩馆',
    type: 'bouldering',
    environment: 'indoor',
    departureTime: '10:00',
    durationMinutes: 120,
    companions: '',
    routeIds: [],
    transport: '',
    emergencyContact: '',
    returnPlan: '',
    checklist: generateChecklist('bouldering', 'indoor'),
    notes: '',
    ...part,
  };
}
function memory(): StorageAdapter {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}
describe('真实记录统计', () => {
  it('新用户没有虚构的成绩或行程', () => {
    const state = createInitialState();
    expect(state.sessions).toEqual([]);
    expect(state.trips).toEqual([]);
    const stats = computeSessionStats(state.sessions, new Date(2026, 9, 18));
    expect(stats.totalMinutes).toBe(0);
    expect(stats.completionRate).toBe(0);
  });
  it('周一至周日统计独立于月统计，并排除未来日期', () => {
    const records = [
      session(),
      session({ id: '2', date: '2026-10-12', durationMinutes: 60 }),
      session({ id: '3', date: '2026-10-11', durationMinutes: 30 }),
      session({ id: '4', date: '2026-09-30', durationMinutes: 20 }),
      session({ id: '5', date: '2026-10-19' }),
    ];
    const stats = computeSessionStats(records, new Date(2026, 9, 18));
    expect(stats.totalSessions).toBe(4);
    expect(stats.weekSessions).toBe(2);
    expect(stats.monthSessions).toBe(3);
    expect(stats.weekMinutes).toBe(150);
    expect(stats.monthMinutes).toBe(180);
    expect(stats.weeklyActivity[6].minutes).toBe(90);
    expect(stats.weeklyActivity[0].minutes).toBe(60);
  });
  it('分开计算不同类型与体系中的最佳成绩，完成率不混用尝试次数', () => {
    const records = [
      session(),
      session({
        id: '2',
        type: 'sport',
        attempts: [
          {
            routeId: '',
            routeName: '石灰岩',
            gradeSystem: 'French',
            grade: '6a',
            completed: true,
            attempts: 2,
            failureReason: '',
            notes: '',
          },
          {
            routeId: '',
            routeName: '未完成',
            gradeSystem: 'YDS',
            grade: '5.12a',
            completed: false,
            attempts: 6,
            failureReason: '耐力',
            notes: '',
          },
        ],
      }),
    ];
    const stats = computeSessionStats(records, new Date(2026, 9, 18));
    expect(stats.bestBySystem).toHaveLength(2);
    expect(stats.bestBySystem.map((b) => b.grade)).toEqual(['V3', '6a']);
    expect(stats.totalAttempts).toBe(11);
    expect(stats.completionRate).toBe(67);
  });
  it('精简记录保留实际时长与路线，不把未知结果计成失败或完攀', () => {
    const stats = computeSessionStats([quickSession()], new Date(2026, 9, 18));
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalMinutes).toBe(90);
    expect(stats.totalRoutes).toBe(1);
    expect(stats.routesWithOutcome).toBe(0);
    expect(stats.completedRoutes).toBe(0);
    expect(stats.totalAttempts).toBe(0);
    expect(stats.completionRate).toBeNull();
    expect(stats.bestBySystem).toEqual([]);
    expect(stats.gradeHistory).toEqual([]);
  });
  it('新旧记录混合时未知结果不稀释完成率，也不成为个人最佳', () => {
    const unknown = quickSession({ id: 'unknown' });
    unknown.attempts[0].grade = 'V9';
    const stopped = quickSession({ id: 'stopped' });
    stopped.attempts[0] = {
      ...stopped.attempts[0],
      completed: false,
      failureReason: '动作阅读',
    };
    const stats = computeSessionStats([session(), unknown, stopped], new Date(2026, 9, 18));
    expect(stats.totalRoutes).toBe(3);
    expect(stats.routesWithOutcome).toBe(2);
    expect(stats.completedRoutes).toBe(1);
    expect(stats.totalAttempts).toBe(3);
    expect(stats.completionRate).toBe(50);
    expect(stats.bestBySystem.map((best) => best.grade)).toEqual(['V3']);
    expect(stats.gradeHistory.map((entry) => entry.grade)).toEqual(['V3']);
  });
  it('支持月界、年界与合法本地日期', () => {
    expect(parseLocalDate('2026-02-29')).toBeNull();
    expect(parseLocalDate('2028-02-29')).not.toBeNull();
    const stats = computeSessionStats(
      [session({ date: '2025-12-31' }), session({ date: '2026-01-01' })],
      new Date(2026, 0, 2),
    );
    expect(stats.weekSessions).toBe(2);
    expect(stats.monthSessions).toBe(1);
  });
});
describe('按攀岩场景生成清单', () => {
  it('室内抱石不强加绳索和安全带，户外抱石增加落地与天气检查', () => {
    const indoor = generateChecklist('bouldering', 'indoor');
    expect(indoor.some((i) => ['rope', 'harness', 'belay', 'quickdraws'].includes(i.id))).toBe(
      false,
    );
    const outdoor = generateChecklist('bouldering', 'outdoor');
    expect(outdoor.some((i) => i.id === 'pads')).toBe(true);
    expect(outdoor.some((i) => i.id === 'weather')).toBe(true);
    expect(outdoor.some((i) => i.id === 'rope')).toBe(false);
  });
  it('运动攀与传统攀按场景区分器材，清单状态不会串行程', () => {
    const a = generateChecklist('sport', 'outdoor'),
      b = generateChecklist('sport', 'outdoor');
    a[0].checked = true;
    expect(b[0].checked).toBe(false);
    expect(a.find((i) => i.id === 'quickdraws')).toBeDefined();
    expect(a.find((i) => i.id === 'trad-rack')).toBeUndefined();
    expect(generateChecklist('trad', 'outdoor').find((i) => i.id === 'trad-rack')?.critical).toBe(
      true,
    );
    expect(checklistProgress([])).toBe(0);
    expect(checklistProgress([{ ...a[0], checked: true }])).toBe(100);
  });
});
describe('表单边界与校验', () => {
  it('允许选填地点，但禁止未来记录、分数时长、错误评级体系与无效尝试次数', () => {
    const now = new Date(2026, 9, 18);
    expect(validateSession(session(), now)).toEqual({});
    expect(validateSession(quickSession(), now)).toEqual({});
    expect(validateSession(session({ location: ' ' }), now)).toEqual({});
    expect(
      validateSession(session({ location: ' ', date: '2026-10-19', durationMinutes: 1.5 }), now),
    ).toHaveProperty('date');
    const s = session();
    s.attempts[0] = { ...s.attempts[0], gradeSystem: 'French', grade: '6a', attempts: 0 };
    expect(validateSession(s, now)).toHaveProperty('system-0');
    expect(validateSession(s, now)).toHaveProperty('count-0');
  });
  it('精简输入仍限制地点、历史路线名称与未完攀原因的长度', () => {
    const now = new Date(2026, 9, 18);
    expect(validateSession(quickSession({ location: '岩'.repeat(121) }), now)).toHaveProperty(
      'location',
    );
    const record = quickSession({ location: '岩'.repeat(120) });
    record.attempts[0].routeName = '线'.repeat(100);
    record.attempts[0].failureReason = '因'.repeat(300);
    record.attempts[0].completed = false;
    expect(validateSession(record, now)).toEqual({});
    record.attempts[0].routeName += '线';
    expect(validateSession(record, now)).not.toEqual({});
    record.attempts[0].routeName = '';
    record.attempts[0].failureReason += '因';
    expect(validateSession(record, now)).not.toEqual({});
  });
  it('户外需要联系人和返程安排，并验证类型与环境', () => {
    expect(validateTrip(trip())).toEqual({});
    const errors = validateTrip(trip({ type: 'sport', environment: 'outdoor' }));
    expect(errors).toHaveProperty('emergencyContact');
    expect(errors).toHaveProperty('returnPlan');
    expect(validateTrip(trip({ type: 'indoor', environment: 'outdoor' }))).toHaveProperty(
      'environment',
    );
  });
  it('资料、装备与训练必须满足约束', () => {
    const initial = createInitialState();
    expect(validateUser({ ...initial.user, weeklyGoal: 8 })).toHaveProperty('weeklyGoal');
    expect(
      validateGear(
        {
          id: 'g',
          ownerId: owner,
          name: '',
          category: 'basic',
          brand: '',
          model: '',
          purchaseDate: '2099-01-01',
          inspections: [],
          notes: '',
        },
        new Date(2026, 9, 18),
      ),
    ).toHaveProperty('purchaseDate');
    const plan = createTrainingPlan(owner, 'beginner', '脚法', '2026-10-18');
    expect(validateTrainingPlan(plan)).toEqual({});
    plan.exercises = [];
    expect(validateTrainingPlan(plan)).toHaveProperty('exercises');
    expect(createTrainingPlan(owner, 'advanced', '耐力').exercises.length).toBeGreaterThan(
      createTrainingPlan(owner, 'beginner', '基础').exercises.length,
    );
  });
});
describe('本地持久化与归属隔离', () => {
  it('空地点与未知结果可刷新保存，旧记录的完整元信息原样保留', () => {
    const state = createInitialState();
    const legacy = session({
      notes: '旧日记',
      image: 'data:image/jpeg;base64,bGVnYWN5',
      mood: 'great',
    });
    legacy.attempts[0] = {
      ...legacy.attempts[0],
      routeId: 'legacy-route',
      notes: '旧路线感受',
    };
    state.sessions = [quickSession({ id: 'quick' }), legacy];
    const storage = memory();
    expect(createLocalRepository(storage).save(state)).toBeNull();
    const reloaded = createLocalRepository(storage).load();
    expect(reloaded.error).toBeNull();
    expect(reloaded.state.sessions).toEqual(state.sessions);
    expect(reloaded.state.sessions[0]).toMatchObject({ location: '', mood: null });
    expect(reloaded.state.sessions[0].attempts[0]).toMatchObject({
      routeName: '',
      attempts: null,
      completed: null,
    });
    expect(isAppState(reloaded.state)).toBe(true);
  });
  it('完整往返保存，过滤其他用户的私人实体', () => {
    const storage = memory();
    const repo = createLocalRepository(storage);
    const state = createInitialState();
    state.sessions = [session(), session({ id: 'other', ownerId: 'other-user' })];
    state.favoriteRouteIds = ['forest-line'];
    expect(repo.save(state)).toBeNull();
    const result = repo.load();
    expect(result.error).toBeNull();
    expect(result.state.sessions).toHaveLength(1);
    expect(result.state.favoriteRouteIds).toEqual(['forest-line']);
    expect(isAppState(result.state)).toBe(true);
  });
  it('损坏、结构不兼容、存储满、浏览器拒绝访问均返回可见错误', () => {
    const storage = memory();
    storage.setItem(STORAGE_KEY, '{invalid');
    const repo = createLocalRepository(storage);
    expect(repo.load().error).toContain('原始数据');
    expect(storage.getItem(STORAGE_KEY)).toBe('{invalid');
    storage.setItem(STORAGE_KEY, '{"version":99}');
    expect(repo.load().error).toContain('不兼容');
    expect(repo.save({ version: 99 } as unknown as AppState)).toContain('无效');
    const broken = createLocalRepository({
      getItem: () => {
        throw new Error();
      },
      setItem: () => {
        throw new Error();
      },
      removeItem: () => {
        throw new Error();
      },
    });
    expect(broken.load().error).toBeTruthy();
    expect(broken.save(createInitialState())).toContain('保存失败');
    expect(broken.clear()).toBeTruthy();
  });
});

describe('基于实际记录的训练建议', () => {
  it('疲劳与高主观强度优先提示恢复，训练不改变用户等级', () => {
    const suggestion = getTrainingSuggestion([session({ effort: 9, mood: 'tired' })], '提高耐力');
    expect(suggestion.focus).toBe('recovery');
    const plan = createTrainingPlan(
      owner,
      'beginner',
      suggestion.title,
      '2026-10-18',
      suggestion.focus,
    );
    expect(plan.exercises.some((e) => e.name === '轻松活动与恢复')).toBe(true);
    expect(plan.stage).toBe('beginner');
  });
  it('参考近期未完攀原因及个人目标选择练习方向', () => {
    const record = session();
    record.attempts[0] = { ...record.attempts[0], completed: false, failureReason: '动作阅读' };
    expect(getTrainingSuggestion([record], '进步').focus).toBe('reading');
    expect(getTrainingSuggestion([], '提高耐力').focus).toBe('endurance');
    expect(getTrainingSuggestion([], '享受攀爬').focus).toBe('technique');
  });
  it('持久层拒绝语义无效的数据，避免加载除零等状态', () => {
    const state = createInitialState();
    state.user.weeklyGoal = 0;
    expect(isAppState(state)).toBe(false);
    expect(createLocalRepository(memory()).save(state)).toContain('无效');
  });
});
