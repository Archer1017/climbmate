import { CalendarDays, Dumbbell, Footprints, Heart, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  STAGE_LABELS,
  createTrainingPlan,
  getTrainingSuggestion,
  localDateKey,
  type TrainingStage,
} from '../lib';
import { formatDate, today } from '../lib/format';
import {
  Button,
  CheckButton,
  EmptyState,
  PageTitle,
  Progress,
  SectionHead,
} from '../components/ui';
const modules = [
  { icon: Footprints, title: '脚法与重心', text: '在轻松线路上练习精准落脚，让重心跟随脚点。' },
  { icon: Target, title: '预读与平衡', text: '先观察，再尝试。寻找稳定姿态与可休息的位置。' },
  { icon: Dumbbell, title: '耐力与力量', text: '控制强度，充分组间休息。避免疲劳状态下冲击极限。' },
  {
    icon: Heart,
    title: '柔韧与恢复',
    text: '给身体恢复的时间。疼痛时停止训练，必要时咨询专业人员。',
  },
];
export function TrainingPage() {
  const { state, update, open, notify } = useApp();
  const [stage, setStage] = useState(state.user.stage);
  const [selectedDate, setSelectedDate] = useState(today());
  const [weekOffset, setWeekOffset] = useState(0);
  const suggestion = getTrainingSuggestion(state.sessions, state.user.goal);
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      date: localDateKey(date),
      day: ['一', '二', '三', '四', '五', '六', '日'][i],
      number: date.getDate(),
    };
  });
  const plans = state.trainingPlans.filter((p) => p.date === selectedDate);
  function generate() {
    const plan = createTrainingPlan(
      state.user.id,
      stage,
      suggestion.title,
      selectedDate,
      suggestion.focus,
    );
    if (update((s) => ({ ...s, trainingPlans: [plan, ...s.trainingPlans] })))
      notify('训练计划已生成，可以按身体状态调整');
  }
  return (
    <>
      <PageTitle
        label="PROGRESS AT YOUR OWN PACE"
        title="稳一点，也能走得更远"
        description="把大目标拆成小练习，找到适合自己的训练节奏。"
        action={
          <Button onClick={() => open({ type: 'training' })}>
            <Plus size={17} />
            自定义训练
          </Button>
        }
      />
      <section className="training-banner">
        <div>
          <span className="tag">
            <Dumbbell size={14} />
            你的训练起点
          </span>
          <h2>{state.user.goal}</h2>
          <p>{suggestion.reason}</p>
        </div>
        <div className="training-generator">
          <label className="field">
            <span>选择训练阶段</span>
            <select
              aria-label="选择训练阶段"
              value={stage}
              onChange={(e) => setStage(e.target.value as TrainingStage)}
            >
              {Object.entries(STAGE_LABELS).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={generate}>
            {selectedDate === today() ? '生成今日训练' : '生成当天训练'}
            <Plus size={16} />
          </Button>
        </div>
      </section>
      <div className="training-disclaimer">
        以上为产品内部训练阶段，非统一专业等级；系统不会依据训练次数自动评级。
      </div>
      <section className="training-calendar">
        <div className="section-head">
          <div>
            <h2>这一周，按你的节奏</h2>
            <p className="muted">
              {formatDate(week[0].date)} 至 {formatDate(week[6].date)}
            </p>
          </div>
          <div className="calendar-controls">
            <Button
              variant="secondary"
              aria-label="上一周"
              onClick={() => {
                setWeekOffset(weekOffset - 1);
                const d = new Date(monday);
                d.setDate(d.getDate() - 7);
                setSelectedDate(localDateKey(d));
              }}
            >
              ‹
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setWeekOffset(0);
                setSelectedDate(today());
              }}
            >
              本周
            </Button>
            <Button
              variant="secondary"
              aria-label="下一周"
              onClick={() => {
                setWeekOffset(weekOffset + 1);
                const d = new Date(monday);
                d.setDate(d.getDate() + 7);
                setSelectedDate(localDateKey(d));
              }}
            >
              ›
            </Button>
          </div>
        </div>
        <div className="training-week">
          {week.map((day) => {
            const count = state.trainingPlans.filter((p) => p.date === day.date).length;
            return (
              <button
                key={day.date}
                className={selectedDate === day.date ? 'selected' : ''}
                aria-pressed={selectedDate === day.date}
                onClick={() => setSelectedDate(day.date)}
              >
                <span>周{day.day}</span>
                <strong>{day.number}</strong>
                <small>{count ? `${count} 份训练` : '留给自己'}</small>
              </button>
            );
          })}
        </div>
      </section>
      <SectionHead
        title={selectedDate === today() ? '今日训练安排' : formatDate(selectedDate) + '的训练安排'}
        subtitle="完成情况自动保存，计划可随时调整。"
      />
      {!plans.length ? (
        <div className="panel">
          <EmptyState
            icon={Dumbbell}
            title="找到你的攀爬节奏"
            description="生成一份基础计划，或创建属于自己的训练与恢复安排。"
            action={
              <Button variant="secondary" onClick={generate}>
                生成第一份训练计划
              </Button>
            }
          />
        </div>
      ) : (
        <div className="training-plan-grid">
          {plans.map((plan) => {
            const done = plan.exercises.filter((e) => e.completed).length;
            return (
              <section className="panel training-plan" key={plan.id}>
                <div className="training-plan-meta">
                  <span>
                    <CalendarDays size={14} />
                    {plan.date === today() ? '今天' : formatDate(plan.date)}
                  </span>
                  <button
                    className="text-link"
                    onClick={() => open({ type: 'training', id: plan.id })}
                  >
                    编辑计划
                  </button>
                </div>
                <h2>{plan.goal}</h2>
                <div className="training-plan-summary">
                  <span>
                    {STAGE_LABELS[plan.stage]} · 共{' '}
                    {plan.exercises.reduce((sum, e) => sum + e.durationMinutes, 0)} 分钟
                  </span>
                  <strong>
                    {done} / {plan.exercises.length} 项
                  </strong>
                </div>
                <Progress
                  value={(done / plan.exercises.length) * 100}
                  label={`${plan.goal}完成进度`}
                />
                {plan.exercises.map((exercise) => (
                  <CheckButton
                    key={exercise.id}
                    checked={exercise.completed}
                    detail={`${exercise.durationMinutes} 分钟 · ${exercise.instructions}`}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        trainingPlans: s.trainingPlans.map((p) =>
                          p.id === plan.id
                            ? {
                                ...p,
                                exercises: p.exercises.map((e) =>
                                  e.id === exercise.id ? { ...e, completed: !e.completed } : e,
                                ),
                              }
                            : p,
                        ),
                      }))
                    }
                  >
                    {exercise.name}
                  </CheckButton>
                ))}
                <div className="recovery-note">
                  <Heart size={16} />
                  <p>{plan.recoveryNotes}</p>
                </div>
              </section>
            );
          })}
        </div>
      )}
      <SectionHead title="每一种练习，都有意义" />
      <div className="training-modules">
        {modules.map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <span className="soft-icon">
              <Icon size={22} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
