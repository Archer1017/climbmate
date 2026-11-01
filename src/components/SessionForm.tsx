import { useState, type FormEvent } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DEMO_ROUTES,
  GRADE_OPTIONS,
  TYPE_LABELS,
  createId,
  validateSession,
  type ClimbingSession,
  type ClimbingType,
  type GradeSystem,
  type RouteAttempt,
} from '../lib';
import { today } from '../lib/format';
import { Button, ConfirmDelete, FormErrors, FormField, Modal } from './ui';
function blankAttempt(type: ClimbingType): RouteAttempt {
  return {
    routeId: '',
    routeName: '',
    gradeSystem: type === 'bouldering' ? 'V' : 'French',
    grade: type === 'bouldering' ? 'V0' : '5a',
    attempts: null,
    completed: null,
    failureReason: '',
    notes: '',
  };
}
export function SessionForm({ id, routeId }: { id?: string; routeId?: string }) {
  const { state, update, close, notify, path, go } = useApp();
  const existing = state.sessions.find((s) => s.id === id);
  const route = DEMO_ROUTES.find((r) => r.id === routeId);
  const initialType = route?.type || state.user.preferredTypes[0] || 'bouldering';
  const [session, setSession] = useState<ClimbingSession>(
    existing || {
      id: createId('session'),
      ownerId: state.user.id,
      date: today(),
      location: route?.location || '',
      type: initialType,
      durationMinutes: 60,
      attempts: [
        route
          ? {
              ...blankAttempt(route.type),
              routeId: route.id,
              routeName: route.name,
              gradeSystem: route.gradeSystem,
              grade: route.grade,
            }
          : blankAttempt(initialType),
      ],
      effort: 5,
      mood: null,
      notes: '',
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const patch = (part: Partial<ClimbingSession>) => setSession((s) => ({ ...s, ...part }));
  const patchAttempt = (index: number, part: Partial<RouteAttempt>) =>
    setSession((s) => ({
      ...s,
      attempts: s.attempts.map((a, i) => (i === index ? { ...a, ...part } : a)),
    }));
  const systems: GradeSystem[] = session.type === 'bouldering' ? ['V', 'Font'] : ['French', 'YDS'];
  function submit(event: FormEvent) {
    event.preventDefault();
    const next = {
      ...session,
      location: session.location.trim(),
      attempts: session.attempts.map((a) => ({
        ...a,
        routeName: a.routeName.trim(),
        failureReason: a.failureReason.trim(),
        completed: a.failureReason.trim() ? false : a.attempts === null ? null : a.completed,
      })),
    };
    const issues = validateSession(next);
    setErrors(issues);
    if (Object.keys(issues).length) return;
    if (
      update((s) => ({
        ...s,
        sessions: existing
          ? s.sessions.map((item) => (item.id === id ? next : item))
          : [next, ...s.sessions],
      }))
    ) {
      close();
      if (path.split('?')[0] === '/records') go('/records?view=climbs');
      notify(existing ? '攀岩记录已更新' : '这次向上，已为你记住');
    }
  }
  return (
    <Modal
      title={existing ? '回看这一次攀爬' : '记住这一次向上'}
      description="记下难度与时长，留下今天的进步。"
      onClose={close}
    >
      <form noValidate onSubmit={submit}>
        <div className="modal-body">
          <div className="form-grid">
            <FormField label="攀岩日期" error={errors.date}>
              <input
                type="date"
                max={today()}
                value={session.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </FormField>
            <FormField label="攀岩类型" error={errors.type}>
              <select
                value={session.type}
                onChange={(e) => {
                  const type = e.target.value as ClimbingType;
                  patch({ type, attempts: [blankAttempt(type)] });
                }}
              >
                {Object.entries(TYPE_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="攀岩地点（选填）" error={errors.location}>
              <input
                value={session.location}
                maxLength={120}
                placeholder="岩馆或岩场名称"
                onChange={(e) => patch({ location: e.target.value })}
              />
            </FormField>
            <FormField label="攀爬时长（分钟）" error={errors.durationMinutes}>
              <input
                type="number"
                min="1"
                max="1440"
                value={session.durationMinutes || ''}
                onChange={(e) => patch({ durationMinutes: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <div className="form-section-title">
            <h3>尝试的路线</h3>
            <span>更换类型会重置路线条目</span>
          </div>
          {session.attempts.map((attempt, index) => (
            <fieldset className="attempt-fieldset" key={index}>
              <legend>路线 {index + 1}</legend>
              <div className="form-grid">
                <FormField
                  label={`路线难度 ${index + 1}`}
                  error={errors['grade-' + index] || errors['system-' + index]}
                  full
                >
                  <select
                    value={`${attempt.gradeSystem}:${attempt.grade}`}
                    onChange={(e) => {
                      const [gradeSystem, grade] = e.target.value.split(':') as [
                        GradeSystem,
                        string,
                      ];
                      patchAttempt(index, {
                        gradeSystem,
                        grade,
                        routeId: '',
                        ...(attempt.routeId ? { routeName: '' } : {}),
                      });
                    }}
                  >
                    {systems.map((system) => (
                      <optgroup key={system} label={`${system} 体系`}>
                        {GRADE_OPTIONS[system].map((grade) => (
                          <option key={grade} value={`${system}:${grade}`}>
                            {grade} · {system}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label={`未完攀原因 ${index + 1}（选填）`}
                  error={errors['reason-' + index]}
                  full
                >
                  <select
                    value={attempt.failureReason}
                    onChange={(e) => patchAttempt(index, { failureReason: e.target.value })}
                  >
                    {[
                      '',
                      '脚法与重心',
                      '动作阅读',
                      '力量不足',
                      '耐力不足',
                      '心理状态',
                      '主动停止 / 恢复',
                      '其他',
                    ].map((value) => (
                      <option key={value} value={value}>
                        {value || '不填写'}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              {session.attempts.length > 1 && (
                <button
                  type="button"
                  className="text-link delete-button"
                  onClick={() =>
                    patch({ attempts: session.attempts.filter((_, i) => i !== index) })
                  }
                >
                  <Trash2 size={14} />
                  移除此路线
                </button>
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="full-width"
            onClick={() => patch({ attempts: [...session.attempts, blankAttempt(session.type)] })}
          >
            <Plus size={16} />
            再添加一条路线
          </Button>
          <div className="form-grid form-space">
            <FormField label={`主观难度：${session.effort} / 10`} error={errors.effort} full>
              <input
                type="range"
                min="1"
                max="10"
                value={session.effort}
                onChange={(e) => patch({ effort: Number(e.target.value) })}
              />
              <span className="range-labels">
                <small>轻松自如</small>
                <small>接近极限</small>
              </span>
            </FormField>
          </div>
          <FormErrors errors={errors} />
        </div>
        <div className="modal-footer">
          {existing ? (
            <ConfirmDelete
              label="删除记录"
              onDelete={() => {
                if (
                  update((s) => ({ ...s, sessions: s.sessions.filter((item) => item.id !== id) }))
                ) {
                  close();
                  notify('攀岩记录已删除');
                }
              }}
            />
          ) : (
            <Button type="button" variant="ghost" onClick={close}>
              取消
            </Button>
          )}
          <Button type="submit">
            <Save size={16} />
            保存攀岩记录
          </Button>
        </div>
      </form>
    </Modal>
  );
}
