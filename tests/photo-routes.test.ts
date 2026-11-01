import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  createLocalRepository,
  isAppState,
  validatePhotoRoute,
  type AppState,
  type PhotoRoute,
} from '../src/lib';

function draft(overrides: Partial<PhotoRoute> = {}): PhotoRoute {
  return {
    id: 'photo-1',
    ownerId: 'local-user',
    name: '平衡练习',
    location: '我的岩馆',
    image: 'data:image/jpeg;base64,AA==',
    holds: [
      { id: 'start', x: 25, y: 80, role: 'start' },
      { id: 'finish', x: 60, y: 20, role: 'finish' },
    ],
    focus: 'balance',
    notes: '',
    favorite: false,
    source: 'manual',
    createdAt: '2026-10-18T00:00:00.000Z',
    updatedAt: '2026-10-18T00:00:00.000Z',
    ...overrides,
  };
}
describe('照片路线草稿', () => {
  it('旧版资料自动补充照片路线集合，保留原有个人数据', () => {
    const legacy: Partial<AppState> = {
      ...createInitialState(),
      favoriteRouteIds: ['forest-line'],
    };
    delete legacy.photoRoutes;
    let raw = JSON.stringify(legacy);
    const repo = createLocalRepository({
      getItem: () => raw,
      setItem: (_, value) => {
        raw = value;
      },
      removeItem: () => {},
    });
    const loaded = repo.load();
    expect(loaded.error).toBeNull();
    expect(loaded.state.photoRoutes).toEqual([]);
    expect(loaded.state.favoriteRouteIds).toEqual(['forest-line']);
    expect(repo.save(loaded.state)).toBeNull();
    expect(JSON.parse(raw).photoRoutes).toEqual([]);
  });
  it('旧照片路线缺少收藏字段时补充 false，并保留原照片和攀岩记录', () => {
    const oldRoute: Partial<PhotoRoute> = draft();
    delete oldRoute.favorite;
    let raw = JSON.stringify({ ...createInitialState(), photoRoutes: [oldRoute] });
    const repo = createLocalRepository({
      getItem: () => raw,
      setItem: (_, value) => {
        raw = value;
      },
      removeItem: () => {},
    });
    const loaded = repo.load();
    expect(loaded.error).toBeNull();
    expect(loaded.state.photoRoutes).toEqual([draft()]);
    expect(loaded.state.sessions).toEqual([]);
    expect(repo.save(loaded.state)).toBeNull();
    expect(JSON.parse(raw).photoRoutes[0].favorite).toBe(false);
  });
  it('照片收藏保存往返，拒绝非布尔收藏字段而不覆盖已存数据', () => {
    let raw: string | null = null;
    const repo = createLocalRepository({
      getItem: () => raw,
      setItem: (_, value) => {
        raw = value;
      },
      removeItem: () => {},
    });
    const state = { ...createInitialState(), photoRoutes: [draft({ favorite: true })] };
    expect(repo.save(state)).toBeNull();
    expect(repo.load().state.photoRoutes[0].favorite).toBe(true);
    expect(repo.load().state.sessions).toEqual([]);
    const invalid = draft({ favorite: 'true' as unknown as boolean });
    expect(validatePhotoRoute(invalid)).not.toEqual({});
    expect(isAppState({ ...state, photoRoutes: [invalid] })).toBe(false);
    expect(repo.save({ ...state, photoRoutes: [invalid] })).toContain('无效');
    expect(JSON.parse(raw!).photoRoutes[0].favorite).toBe(true);
    state.photoRoutes[0].favorite = false;
    expect(repo.save(state)).toBeNull();
    expect(repo.load().state.photoRoutes[0].favorite).toBe(false);
  });
  it('校验照片、起终点、重复岩点、坐标范围与训练目标', () => {
    expect(validatePhotoRoute(draft())).toEqual({});
    expect(validatePhotoRoute(draft({ name: ' ', image: '', holds: [] }))).toMatchObject({
      name: expect.any(String),
      image: expect.any(String),
      holds: expect.any(String),
    });
    expect(
      validatePhotoRoute(
        draft({
          holds: [
            { id: 'x', x: 50, y: 90, role: 'hand' },
            { id: 'y', x: 50, y: 30, role: 'finish' },
          ],
        }),
      ),
    ).toHaveProperty('holds');
    expect(
      validatePhotoRoute(
        draft({
          holds: [
            { id: 'x', x: -1, y: 90, role: 'start' },
            { id: 'x', x: 50, y: 30, role: 'finish' },
          ],
        }),
      ),
    ).toHaveProperty('holds');
    expect(validatePhotoRoute(draft({ focus: 'invented' as PhotoRoute['focus'] }))).toHaveProperty(
      'focus',
    );
  });
  it('草稿保存往返、隔离归属并拒绝损坏的岩点数据', () => {
    let raw: string | null = null;
    const repo = createLocalRepository({
      getItem: () => raw,
      setItem: (_, value) => {
        raw = value;
      },
      removeItem: () => {
        raw = null;
      },
    });
    const state = createInitialState();
    state.photoRoutes = [draft(), draft({ id: 'other', ownerId: 'other-user' })];
    expect(repo.save(state)).toBeNull();
    expect(repo.load().state.photoRoutes).toEqual([draft()]);
    const invalid = { ...state, photoRoutes: [draft({ holds: [] })] };
    expect(isAppState(invalid)).toBe(false);
    expect(repo.save(invalid)).toContain('无效');
    expect(JSON.parse(raw!).photoRoutes).toHaveLength(2);
  });
});
