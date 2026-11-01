import { GRADE_OPTIONS, type ClimbingSession, type ClimbingType, type GradeSystem } from './types';

export function localDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(year, month - 1, day);
  return result.getFullYear() === year &&
    result.getMonth() === month - 1 &&
    result.getDate() === day
    ? result
    : null;
}

export interface GradeBest {
  type: ClimbingType;
  gradeSystem: GradeSystem;
  grade: string;
  date: string;
}
export interface SessionStats {
  totalSessions: number;
  weekSessions: number;
  monthSessions: number;
  totalMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  totalRoutes: number;
  completedRoutes: number;
  routesWithOutcome: number;
  totalAttempts: number;
  completionRate: number | null;
  weeklyActivity: { date: string; label: string; sessions: number; minutes: number }[];
  bestBySystem: GradeBest[];
  gradeHistory: { date: string; type: ClimbingType; gradeSystem: GradeSystem; grade: string }[];
}

export function computeSessionStats(sessions: ClimbingSession[], now = new Date()): SessionStats {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const valid = sessions.filter((session) => {
    const date = parseLocalDate(session.date);
    return date && date <= today;
  });
  const week = valid.filter((session) => {
    const date = parseLocalDate(session.date)!;
    return date >= monday && date < nextMonday;
  });
  const month = valid.filter((session) => {
    const date = parseLocalDate(session.date)!;
    return date >= monthStart && date < nextMonth;
  });
  const minutes = (records: ClimbingSession[]) =>
    records.reduce((sum, session) => sum + session.durationMinutes, 0);
  const attempts = valid.flatMap((session) => session.attempts);
  const completed = attempts.filter((attempt) => attempt.completed);
  const outcomes = attempts.filter((attempt) => typeof attempt.completed === 'boolean');
  const best = new Map<string, GradeBest>();
  const gradeHistory: SessionStats['gradeHistory'] = [];
  for (const session of [...valid].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const attempt of session.attempts.filter((item) => item.completed)) {
      const order = GRADE_OPTIONS[attempt.gradeSystem];
      const index = order.indexOf(attempt.grade);
      if (index < 0) continue;
      const key = session.type + ':' + attempt.gradeSystem;
      const prior = best.get(key);
      if (!prior || index > order.indexOf(prior.grade))
        best.set(key, {
          type: session.type,
          gradeSystem: attempt.gradeSystem,
          grade: attempt.grade,
          date: session.date,
        });
      gradeHistory.push({
        date: session.date,
        type: session.type,
        gradeSystem: attempt.gradeSystem,
        grade: attempt.grade,
      });
    }
  }
  const labels = ['一', '二', '三', '四', '五', '六', '日'];
  return {
    totalSessions: valid.length,
    weekSessions: week.length,
    monthSessions: month.length,
    totalMinutes: minutes(valid),
    weekMinutes: minutes(week),
    monthMinutes: minutes(month),
    totalRoutes: attempts.length,
    completedRoutes: completed.length,
    routesWithOutcome: outcomes.length,
    totalAttempts: attempts.reduce((sum, attempt) => sum + (attempt.attempts ?? 0), 0),
    completionRate: outcomes.length
      ? Math.round((completed.length / outcomes.length) * 100)
      : attempts.length
        ? null
        : 0,
    weeklyActivity: labels.map((label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = localDateKey(date);
      const records = week.filter((session) => session.date === key);
      return { date: key, label, sessions: records.length, minutes: minutes(records) };
    }),
    bestBySystem: [...best.values()],
    gradeHistory,
  };
}
