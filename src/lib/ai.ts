import type { HoldRole, PhotoRoute } from './types.ts';

export interface AiHold {
  x: number;
  y: number;
  role: HoldRole;
  instruction: string;
}
export interface AiRouteSuggestion {
  name: string;
  summary: string;
  holds: AiHold[];
  limitations: string[];
  model: string;
  generatedAt: string;
}
export interface AiServiceStatus {
  status: 'unconfigured' | 'configured' | 'verified' | 'auth-error' | 'unavailable';
  model: string;
  message: string;
}
export interface AiRouteInput {
  image: string;
  focus: PhotoRoute['focus'];
}
export const AI_FOCUS_LABELS = {
  technique: '脚法与重心',
  balance: '平衡控制',
  reading: '路线阅读',
  endurance: '攀爬耐力',
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

// Validate model output again at both the server boundary and browser boundary.
export function isAiSuggestion(value: unknown): value is AiRouteSuggestion {
  if (
    !record(value) ||
    !text(value.name, 60) ||
    !text(value.summary, 700) ||
    !text(value.model, 150) ||
    !text(value.generatedAt, 50) ||
    !Number.isFinite(Date.parse(value.generatedAt)) ||
    !Array.isArray(value.limitations) ||
    value.limitations.length > 6 ||
    !value.limitations.every((item) => text(item, 200)) ||
    !Array.isArray(value.holds) ||
    value.holds.length < 3 ||
    value.holds.length > 30
  )
    return false;
  const validHolds = value.holds.every(
    (hold) =>
      record(hold) &&
      typeof hold.x === 'number' &&
      Number.isFinite(hold.x) &&
      hold.x >= 3 &&
      hold.x <= 97 &&
      typeof hold.y === 'number' &&
      Number.isFinite(hold.y) &&
      hold.y >= 3 &&
      hold.y <= 97 &&
      ['start', 'hand', 'foot', 'finish'].includes(String(hold.role)) &&
      text(hold.instruction, 220),
  );
  if (!validHolds) return false;
  const holds = value.holds as AiHold[];
  return (
    holds[0].role === 'start' &&
    holds[holds.length - 1].role === 'finish' &&
    holds.slice(1, -1).every((hold) => hold.role === 'hand' || hold.role === 'foot') &&
    new Set(holds.map((hold) => `${hold.x},${hold.y}`)).size === holds.length
  );
}

export function isAiInput(value: unknown): value is AiRouteInput {
  return (
    record(value) &&
    typeof value.image === 'string' &&
    value.image.length <= 2_800_000 &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.image) &&
    Object.hasOwn(AI_FOCUS_LABELS, String(value.focus))
  );
}
