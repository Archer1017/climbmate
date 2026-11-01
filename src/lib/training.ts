import { createId } from './storage';
import { localDateKey } from './stats';
import type { ClimbingSession, TrainingPlan, TrainingStage } from './types';
export interface TrainingSuggestion {
  title: string;
  reason: string;
  focus: 'technique' | 'reading' | 'endurance' | 'strength' | 'recovery';
}
export function getTrainingSuggestion(
  sessions: ClimbingSession[],
  goal: string,
): TrainingSuggestion {
  const latest = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (latest && (latest.effort >= 8 || latest.mood === 'tired'))
    return {
      title: '今天，先听听身体的声音',
      reason: `你最近一次攀爬的主观难度为 ${latest.effort}/10，状态是${latest.mood === 'tired' ? '有些疲惫' : '强度较高'}。先确认是否恢复，再决定是否训练。`,
      focus: 'recovery',
    };
  const reasons = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .flatMap((s) => s.attempts.filter((a) => !a.completed).map((a) => a.failureReason))
    .filter(Boolean);
  const common = [...new Set(reasons)].sort(
    (a, b) => reasons.filter((r) => r === b).length - reasons.filter((r) => r === a).length,
  )[0];
  if (common === '动作阅读')
    return {
      title: '先读懂路线，再开始攀爬',
      reason: '最近的未完攀记录中提到了动作阅读。可以从轻松线路预读与休息位置观察开始。',
      focus: 'reading',
    };
  if (common === '耐力不足' || /耐力/.test(goal))
    return {
      title: '练习连续动作，也练习休息',
      reason: '结合你的目标与近期记录，尝试在可控强度下练习连续动作，组间充分恢复。',
      focus: 'endurance',
    };
  if (common === '力量不足' || /力量/.test(goal))
    return {
      title: '先打好基础，再逐渐加量',
      reason: '结合你的目标与近期记录，从轻松可控的全身力量与动作控制开始，避免疲劳下冲击极限。',
      focus: 'strength',
    };
  return {
    title: '从安静的脚步开始',
    reason: latest
      ? '结合近期记录，继续在轻松线路上专注脚点与重心。按当天身体状态调整计划。'
      : '先热身，再从轻松线路出发。让双脚帮助你找到重心与节奏。',
    focus: 'technique',
  };
}
export function createTrainingPlan(
  ownerId: string,
  stage: TrainingStage,
  goal: string,
  date = localDateKey(),
  focus: TrainingSuggestion['focus'] = 'technique',
): TrainingPlan {
  const basics = [
    {
      name: '全身热身',
      durationMinutes: 10,
      instructions: '先做轻松活动与关节活动，逐渐进入状态。',
    },
    {
      name: '安静脚步',
      durationMinutes: 15,
      instructions: '选择轻松可控的线路，注视脚点再轻轻落脚，移动重心后再抬手。',
    },
    {
      name: '路线预读',
      durationMinutes: 10,
      instructions: '攀爬前观察手点、脚点、移动顺序与可休息的位置，再按身体状态尝试。',
    },
    {
      name: '放松与恢复',
      durationMinutes: 10,
      instructions: '以轻松活动结束，舒适范围内活动关节并记录疲劳，留出恢复时间。',
    },
  ];
  if (focus === 'recovery')
    return {
      id: createId('training'),
      ownerId,
      goal,
      date,
      stage,
      exercises: [
        {
          id: createId('exercise'),
          name: '身体状态回顾',
          durationMinutes: 5,
          instructions: '回顾疲劳、睡眠与不适；身体未恢复时可取消本次训练。',
          completed: false,
        },
        {
          id: createId('exercise'),
          name: '轻松活动与恢复',
          durationMinutes: 10,
          instructions: '只在舒适无痛范围内进行轻松活动。不适时停止，持续疼痛应咨询专业人员。',
          completed: false,
        },
      ],
      recoveryNotes: '恢复也是训练的一部分。这不是医疗或康复处方，按身体状态决定是否活动。',
    };
  if (focus === 'reading') basics[2].durationMinutes = 15;
  if (focus === 'strength')
    basics.splice(3, 0, {
      name: '轻量全身动作控制',
      durationMinutes: 10,
      instructions: '选择熟悉、轻松可控的基础力量动作，保留余力；不安排新手高强度指力或极限悬挂。',
    });
  if (focus === 'endurance' || stage === 'intermediate' || stage === 'advanced')
    basics.splice(3, 0, {
      name: '轻松线路耐力',
      durationMinutes: stage === 'beginner' ? 10 : 15,
      instructions: '在可控强度下练习连续动作，组间充分休息；可按个人状态调整或移除此项。',
    });
  return {
    id: createId('training'),
    ownerId,
    goal,
    date,
    stage,
    exercises: basics.map((item) => ({ ...item, id: createId('exercise'), completed: false })),
    recoveryNotes:
      '这是可编辑的训练起点。训练间安排恢复，不追求连续高强度；不适时停止，训练阶段由用户自行选择，不按次数自动评级。',
  };
}
