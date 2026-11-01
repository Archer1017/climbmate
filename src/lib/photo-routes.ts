import type { HoldRole, PhotoRoute } from './types';
import { isAiSuggestion } from './ai';

export const HOLD_LABELS: Record<HoldRole, string> = {
  start: '起点',
  hand: '手点',
  foot: '脚点',
  finish: '终点',
};
export const PHOTO_FOCUS_LABELS: Record<PhotoRoute['focus'], string> = {
  technique: '脚法与重心',
  balance: '平衡控制',
  reading: '路线阅读',
  endurance: '攀爬耐力',
};

export function validatePhotoRoute(route: PhotoRoute): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!route.name.trim() || route.name.length > 60) errors.name = '请填写 1–60 字的路线名称';
  if (route.location.length > 100) errors.location = '岩馆名称请控制在 100 字以内';
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(route.image))
    errors.image = '请先拍摄或上传一张可用的岩壁照片';
  if (route.holds.length < 2 || route.holds.length > 40)
    errors.holds = '请标记 2–40 个岩点，包含起点和终点';
  else if (route.holds[0].role !== 'start' || route.holds[route.holds.length - 1].role !== 'finish')
    errors.holds = '请将第一个岩点设为起点，最后一个设为终点';
  if (
    route.holds.some(
      (hold) =>
        !Number.isFinite(hold.x) ||
        !Number.isFinite(hold.y) ||
        hold.x < 0 ||
        hold.x > 100 ||
        hold.y < 0 ||
        hold.y > 100 ||
        !Object.hasOwn(HOLD_LABELS, hold.role),
    ) ||
    new Set(route.holds.map((hold) => hold.id)).size !== route.holds.length
  )
    errors.holds = '岩点数据无效，请重新标记';
  if (!Object.hasOwn(PHOTO_FOCUS_LABELS, route.focus)) errors.focus = '请选择训练目标';
  if (route.notes.length > 1000) errors.notes = '备注请控制在 1000 字以内';
  if (
    !route.id.trim() ||
    !route.ownerId.trim() ||
    typeof route.favorite !== 'boolean' ||
    !['manual', 'deepseek'].includes(route.source) ||
    !Number.isFinite(Date.parse(route.createdAt)) ||
    !Number.isFinite(Date.parse(route.updatedAt))
  )
    errors.data = '路线草稿信息无效，请重新创建';
  if (route.source === 'deepseek') {
    if (
      !isAiSuggestion(route.ai) ||
      route.ai.holds.length !== route.holds.length ||
      !route.ai.holds.every(
        (hold, index) =>
          hold.x === route.holds[index].x &&
          hold.y === route.holds[index].y &&
          hold.role === route.holds[index].role,
      )
    )
      errors.ai = 'AI 分析与当前岩点不一致，请重新确认建议或手动调整';
  } else if (route.ai !== undefined) errors.ai = '手动草稿不应包含过期的 AI 分析';
  return errors;
}
