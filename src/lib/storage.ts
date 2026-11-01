import { createInitialState } from './demo-data';
import type { AppState } from './types';
import { validatePhotoRoute } from './photo-routes';
import { isAiSuggestion } from './ai';
import {
  validateUser,
  validateTrip,
  validateSession,
  validateGear,
  validateTrainingPlan,
} from './validation';

export const STORAGE_KEY = 'climbmate.v1';
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface LoadResult {
  state: AppState;
  error: string | null;
}

// Replace this interface with a user-authenticated API implementation for cloud sync.
export interface AppRepository {
  load(): LoadResult;
  save(state: AppState): string | null;
  clear(): string | null;
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const textValue = (value: unknown) => typeof value === 'string';
const numberValue = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const list = (value: unknown, check: (item: unknown) => boolean): boolean =>
  Array.isArray(value) && value.every(check);
const type = (value: unknown) => ['bouldering', 'sport', 'trad', 'indoor'].includes(String(value));
const environment = (value: unknown) => value === 'indoor' || value === 'outdoor';
const stage = (value: unknown) =>
  ['beginner', 'novice', 'intermediate', 'advanced'].includes(String(value));
const system = (value: unknown) => ['V', 'Font', 'French', 'YDS'].includes(String(value));

function checklist(value: unknown): boolean {
  return (
    record(value) &&
    textValue(value.id) &&
    textValue(value.name) &&
    ['basic', 'safety', 'outdoor', 'planning'].includes(String(value.category)) &&
    typeof value.checked === 'boolean' &&
    typeof value.critical === 'boolean' &&
    textValue(value.note)
  );
}
function trip(value: unknown): boolean {
  return (
    record(value) &&
    [
      'id',
      'ownerId',
      'title',
      'destination',
      'date',
      'departureTime',
      'companions',
      'transport',
      'emergencyContact',
      'returnPlan',
      'notes',
    ].every((key) => textValue(value[key])) &&
    numberValue(value.durationMinutes) &&
    type(value.type) &&
    environment(value.environment) &&
    list(value.routeIds, textValue) &&
    list(value.checklist, checklist)
  );
}
function session(value: unknown): boolean {
  return (
    record(value) &&
    ['id', 'ownerId', 'date', 'location', 'notes'].every((key) => textValue(value[key])) &&
    type(value.type) &&
    numberValue(value.durationMinutes) &&
    numberValue(value.effort) &&
    (value.mood === null || ['great', 'good', 'okay', 'tired'].includes(String(value.mood))) &&
    (value.image === undefined || textValue(value.image)) &&
    list(
      value.attempts,
      (item) =>
        record(item) &&
        ['routeId', 'routeName', 'grade', 'failureReason', 'notes'].every((key) =>
          textValue(item[key]),
        ) &&
        system(item.gradeSystem) &&
        (item.attempts === null || numberValue(item.attempts)) &&
        (item.completed === null || typeof item.completed === 'boolean'),
    )
  );
}
function gear(value: unknown): boolean {
  return (
    record(value) &&
    ['id', 'ownerId', 'name', 'brand', 'model', 'purchaseDate', 'notes'].every((key) =>
      textValue(value[key]),
    ) &&
    ['basic', 'safety', 'outdoor', 'care'].includes(String(value.category)) &&
    list(
      value.inspections,
      (item) =>
        record(item) &&
        textValue(item.date) &&
        textValue(item.notes) &&
        ['passed', 'needs-review', 'retired'].includes(String(item.result)),
    )
  );
}
function training(value: unknown): boolean {
  return (
    record(value) &&
    ['id', 'ownerId', 'goal', 'date', 'recoveryNotes'].every((key) => textValue(value[key])) &&
    stage(value.stage) &&
    list(
      value.exercises,
      (item) =>
        record(item) &&
        textValue(item.id) &&
        textValue(item.name) &&
        textValue(item.instructions) &&
        numberValue(item.durationMinutes) &&
        typeof item.completed === 'boolean',
    )
  );
}

function photoRoute(value: unknown): boolean {
  return (
    record(value) &&
    ['id', 'ownerId', 'name', 'location', 'image', 'notes', 'createdAt', 'updatedAt'].every((key) =>
      textValue(value[key]),
    ) &&
    typeof value.favorite === 'boolean' &&
    ['manual', 'deepseek'].includes(String(value.source)) &&
    (value.ai === undefined || isAiSuggestion(value.ai)) &&
    ['technique', 'balance', 'reading', 'endurance'].includes(String(value.focus)) &&
    list(
      value.holds,
      (hold) =>
        record(hold) &&
        textValue(hold.id) &&
        numberValue(hold.x) &&
        numberValue(hold.y) &&
        ['start', 'hand', 'foot', 'finish'].includes(String(hold.role)),
    )
  );
}

export function isAppState(value: unknown): value is AppState {
  if (!record(value) || value.version !== 1 || !record(value.user)) return false;
  const user = value.user;
  const structurallyValid =
    ['id', 'name', 'goal'].every((key) => textValue(user[key])) &&
    stage(user.stage) &&
    list(user.preferredTypes, type) &&
    numberValue(user.weeklyGoal) &&
    typeof user.notifications === 'boolean' &&
    list(value.favoriteRouteIds, textValue) &&
    list(value.trips, trip) &&
    list(value.sessions, session) &&
    list(value.gear, gear) &&
    list(value.trainingPlans, training) &&
    list(value.photoRoutes, photoRoute) &&
    list(
      value.savedChecklists,
      (item) =>
        record(item) &&
        textValue(item.id) &&
        textValue(item.name) &&
        type(item.type) &&
        environment(item.environment) &&
        list(item.items, checklist),
    );
  if (!structurallyValid) return false;
  const state = value as unknown as AppState;
  const valid = (errors: Record<string, string>) => Object.keys(errors).length === 0;
  return (
    state.user.id.trim().length > 0 &&
    valid(validateUser(state.user)) &&
    state.trips.every((item) => valid(validateTrip(item))) &&
    state.sessions.every((item) => valid(validateSession(item))) &&
    state.gear.every((item) => valid(validateGear(item))) &&
    state.trainingPlans.every((item) => valid(validateTrainingPlan(item))) &&
    state.photoRoutes.every((item) => valid(validatePhotoRoute(item)))
  );
}

function browserStorage(): StorageAdapter | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function createLocalRepository(
  storage: StorageAdapter | undefined = browserStorage(),
): AppRepository {
  return {
    load() {
      if (!storage)
        return {
          state: createInitialState(),
          error: '浏览器未允许本地存储；本次修改可能无法在刷新后保留。',
        };
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return { state: createInitialState(), error: null };
        const value: unknown = JSON.parse(raw);
        // Normalize v1 photo-route data added after the first local release.
        if (record(value) && value.version === 1) {
          if (value.photoRoutes === undefined) value.photoRoutes = [];
          if (Array.isArray(value.photoRoutes))
            value.photoRoutes = value.photoRoutes.map((route) =>
              record(route) && route.favorite === undefined ? { ...route, favorite: false } : route,
            );
        }
        if (!isAppState(value))
          return {
            state: createInitialState(),
            error: '已保存的数据格式不兼容，原始数据仍保留在浏览器中。',
          };
        // Local MVP has one browser profile; ownership prevents accidental cross-profile mixing.
        // This is not server-side authorization. A backend must enforce authenticated access.
        const ownerId = value.user.id;
        return {
          state: {
            ...value,
            trips: value.trips.filter((item) => item.ownerId === ownerId),
            sessions: value.sessions.filter((item) => item.ownerId === ownerId),
            gear: value.gear.filter((item) => item.ownerId === ownerId),
            trainingPlans: value.trainingPlans.filter((item) => item.ownerId === ownerId),
            photoRoutes: value.photoRoutes.filter((item) => item.ownerId === ownerId),
          },
          error: null,
        };
      } catch {
        return { state: createInitialState(), error: '无法读取本地数据，原始数据未被删除。' };
      }
    },
    save(state) {
      if (!storage) return '本地存储不可用，修改暂未保存。';
      if (!isAppState(state)) return '数据格式无效，未覆盖已保存的数据。';
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
        return null;
      } catch {
        return '保存失败，可能是浏览器存储空间不足。请导出数据后重试。';
      }
    },
    clear() {
      if (!storage) return '本地存储不可用。';
      try {
        storage.removeItem(STORAGE_KEY);
        return null;
      } catch {
        return '无法清除本地数据，请检查浏览器设置。';
      }
    },
  };
}

export function createId(prefix = 'item'): string {
  return (
    prefix +
    '-' +
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10))
  );
}
