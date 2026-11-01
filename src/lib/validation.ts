import {
  GRADE_OPTIONS,
  type ClimbingSession,
  type GearItem,
  type TrainingPlan,
  type Trip,
  type User,
} from './types';
import { localDateKey, parseLocalDate } from './stats';

export type ValidationErrors = Record<string, string>;
const required = (value: string) => typeof value === 'string' && value.trim().length > 0;

export function validateTrip(trip: Trip): ValidationErrors {
  const errors: ValidationErrors = {};
  if (
    (trip.type === 'indoor' && trip.environment !== 'indoor') ||
    (['sport', 'trad'].includes(trip.type) && trip.environment !== 'outdoor')
  )
    errors.environment = '攀岩类型与环境不匹配';
  if (!required(trip.title)) errors.title = '请填写行程名称';
  if (!required(trip.destination)) errors.destination = '请填写目的地';
  if (!parseLocalDate(trip.date)) errors.date = '请选择有效日期';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trip.departureTime))
    errors.departureTime = '请填写有效出发时间';
  if (
    !Number.isInteger(trip.durationMinutes) ||
    trip.durationMinutes < 1 ||
    trip.durationMinutes > 1440
  )
    errors.durationMinutes = '时长应为 1–1440 分钟';
  if (trip.environment === 'outdoor' && !required(trip.emergencyContact))
    errors.emergencyContact = '户外行程请填写紧急联系人';
  if (trip.environment === 'outdoor' && !required(trip.returnPlan))
    errors.returnPlan = '户外行程请填写返程计划';
  return errors;
}

export function validateSession(session: ClimbingSession, now = new Date()): ValidationErrors {
  const errors: ValidationErrors = {};
  if (session.location.length > 120) errors.location = '攀岩地点最多 120 个字符';
  if (!['bouldering', 'sport', 'trad', 'indoor'].includes(session.type))
    errors.type = '请选择有效攀岩类型';
  if (!parseLocalDate(session.date) || session.date > localDateKey(now))
    errors.date = '记录日期不能晚于今天';
  if (
    !Number.isInteger(session.durationMinutes) ||
    session.durationMinutes < 1 ||
    session.durationMinutes > 1440
  )
    errors.durationMinutes = '时长应为 1–1440 分钟';
  if (!Number.isInteger(session.effort) || session.effort < 1 || session.effort > 10)
    errors.effort = '请选择 1–10 的主观难度';
  if (!session.attempts.length) errors.attempts = '至少添加一条尝试路线';
  for (const [index, attempt] of session.attempts.entries()) {
    if (attempt.routeName.length > 100) errors['attempt-' + index] = '路线名称最多 100 个字符';
    if (attempt.failureReason.length > 300) errors['reason-' + index] = '未完攀原因最多 300 个字符';
    if (
      session.type === 'bouldering'
        ? !['V', 'Font'].includes(attempt.gradeSystem)
        : !['French', 'YDS'].includes(attempt.gradeSystem)
    )
      errors['system-' + index] = '请选择与攀岩类型匹配的难度体系';
    if (!GRADE_OPTIONS[attempt.gradeSystem]?.includes(attempt.grade))
      errors['grade-' + index] = '请选择对应体系中的有效难度';
    if (
      attempt.attempts !== null &&
      (!Number.isInteger(attempt.attempts) || attempt.attempts < 1 || attempt.attempts > 1000)
    )
      errors['count-' + index] = '尝试次数应为 1–1000 的整数';
  }
  return errors;
}

export function validateUser(user: User): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!required(user.name) || user.name.trim().length > 30) errors.name = '昵称应为 1–30 个字符';
  if (!required(user.goal) || user.goal.length > 200) errors.goal = '目标应为 1–200 个字符';
  if (!['beginner', 'novice', 'intermediate', 'advanced'].includes(user.stage))
    errors.stage = '请选择有效训练阶段';
  if (
    !user.preferredTypes.every((type) => ['bouldering', 'sport', 'trad', 'indoor'].includes(type))
  )
    errors.preferences = '请选择有效攀岩类型';
  if (!Number.isInteger(user.weeklyGoal) || user.weeklyGoal < 1 || user.weeklyGoal > 7)
    errors.weeklyGoal = '每周目标应为 1–7 次';
  return errors;
}

export function validateGear(item: GearItem, now = new Date()): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!required(item.name)) errors.name = '请填写装备名称';
  if (
    item.purchaseDate &&
    (!parseLocalDate(item.purchaseDate) || item.purchaseDate > localDateKey(now))
  )
    errors.purchaseDate = '购买日期应为今天或以前';
  for (const inspection of item.inspections) {
    if (
      !parseLocalDate(inspection.date) ||
      inspection.date > localDateKey(now) ||
      !['passed', 'needs-review', 'retired'].includes(inspection.result)
    )
      errors.inspections = '检查记录需要有效的日期和结果';
  }
  return errors;
}

export function validateTrainingPlan(plan: TrainingPlan): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!required(plan.goal)) errors.goal = '请填写训练目标';
  if (!parseLocalDate(plan.date)) errors.date = '请选择有效训练日期';
  if (!plan.exercises.length) errors.exercises = '至少添加一个训练项目';
  for (const [index, exercise] of plan.exercises.entries()) {
    if (
      !required(exercise.name) ||
      !Number.isInteger(exercise.durationMinutes) ||
      exercise.durationMinutes < 1 ||
      exercise.durationMinutes > 240
    )
      errors['exercise-' + index] = '训练名称不能为空，时长应为 1–240 分钟';
  }
  return errors;
}
