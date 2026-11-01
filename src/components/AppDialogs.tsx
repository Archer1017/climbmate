import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  LockKeyhole,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  STAGE_LABELS,
  TYPE_LABELS,
  createId,
  createTrainingPlan,
  parseLocalDate,
  validateGear,
  validateTrainingPlan,
  validateUser,
  type GearInspection,
  type GearItem,
  type TrainingPlan,
  type TrainingStage,
} from '../lib';
import { formatDate, today } from '../lib/format';
import { Button, ConfirmDelete, EmptyState, FormErrors, FormField, Modal } from './ui';
import { TripForm } from './TripForm';
import { SessionForm } from './SessionForm';
import { PhotoRouteForm } from './PhotoRouteForm';
export function AppDialogs() {
  const { modal } = useApp();
  if (!modal) return null;
  switch (modal.type) {
    case 'photo-route':
      return <PhotoRouteForm id={modal.id} />;
    case 'trip':
      return <TripForm id={modal.id} routeId={modal.routeId} />;
    case 'session':
      return <SessionForm id={modal.id} routeId={modal.routeId} />;
    case 'gear':
      return <GearForm id={modal.id} />;
    case 'training':
      return <TrainingForm id={modal.id} />;
    case 'profile':
      return <ProfileForm />;
    case 'notifications':
      return <Notifications />;
    case 'privacy':
      return <Privacy />;
  }
}
function ProfileForm() {
  const { state, update, close, notify } = useApp();
  const [user, setUser] = useState(state.user);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...user, name: user.name.trim(), goal: user.goal.trim() };
    const issues = validateUser(next);
    setErrors(issues);
    if (!Object.keys(issues).length && update((s) => ({ ...s, user: next }))) {
      close();
      notify('资料与目标已更新');
    }
  }
  return (
    <Modal
      title="按自己的节奏向上"
      description="选择你的目标与偏好，随时都可以调整。"
      onClose={close}
    >
      <form noValidate onSubmit={submit}>
        <div className="modal-body">
          <div className="form-grid">
            <FormField full label="你的昵称" error={errors.name}>
              <input
                value={user.name}
                maxLength={30}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
              />
            </FormField>
            <FormField full label="攀岩目标" error={errors.goal}>
              <textarea
                rows={2}
                value={user.goal}
                maxLength={200}
                onChange={(e) => setUser({ ...user, goal: e.target.value })}
              />
            </FormField>
            <FormField label="自选训练阶段">
              <select
                value={user.stage}
                onChange={(e) => setUser({ ...user, stage: e.target.value as TrainingStage })}
              >
                {Object.entries(STAGE_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="每周目标（次）" error={errors.weeklyGoal}>
              <input
                type="number"
                min="1"
                max="7"
                value={user.weeklyGoal || ''}
                onChange={(e) => setUser({ ...user, weeklyGoal: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <fieldset className="preferences">
            <legend>喜欢的攀岩类型</legend>
            {Object.entries(TYPE_LABELS).map(([key, value]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={user.preferredTypes.includes(key as keyof typeof TYPE_LABELS)}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      preferredTypes: e.target.checked
                        ? [...user.preferredTypes, key as keyof typeof TYPE_LABELS]
                        : user.preferredTypes.filter((type) => type !== key),
                    })
                  }
                />
                {value}
              </label>
            ))}
          </fieldset>
          <p className="inline-note">
            训练阶段仅为产品内部分类，不代表统一专业等级，也不会随记录次数自动升级。
          </p>
          <FormErrors errors={errors} />
        </div>
        <div className="modal-footer">
          <Button variant="ghost" type="button" onClick={close}>
            取消
          </Button>
          <Button type="submit">
            <Save size={16} />
            保存资料
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function GearForm({ id }: { id?: string }) {
  const { state, update, close, notify } = useApp();
  const existing = state.gear.find((g) => g.id === id);
  const [gear, setGear] = useState<GearItem>(
    existing || {
      id: createId('gear'),
      ownerId: state.user.id,
      name: '',
      category: 'basic',
      brand: '',
      model: '',
      purchaseDate: '',
      inspections: [],
      notes: '',
    },
  );
  const [inspect, setInspect] = useState(false);
  const [inspection, setInspection] = useState<GearInspection>({
    date: today(),
    result: 'passed',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const patch = (part: Partial<GearItem>) => setGear((g) => ({ ...g, ...part }));
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      ...gear,
      name: gear.name.trim(),
      inspections: inspect
        ? [...gear.inspections, inspection].sort((a, b) => a.date.localeCompare(b.date))
        : gear.inspections,
    };
    const issues = validateGear(next);
    if (inspect && (!parseLocalDate(inspection.date) || inspection.date > today()))
      issues.inspection = '检查日期应为今天或以前';
    setErrors(issues);
    if (Object.keys(issues).length) return;
    if (
      update((s) => ({
        ...s,
        gear: existing ? s.gear.map((g) => (g.id === id ? next : g)) : [next, ...s.gear],
      }))
    ) {
      close();
      notify('装备档案已保存');
    }
  }
  return (
    <Modal
      title={existing ? '装备档案' : '添加一件攀岩装备'}
      description="记录装备信息，按制造商说明检查和维护。"
      onClose={close}
    >
      <form noValidate onSubmit={submit}>
        <div className="modal-body">
          <div className="form-grid">
            <FormField label="装备名称" error={errors.name} full>
              <input
                value={gear.name}
                maxLength={80}
                placeholder="例如：我的攀岩鞋"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </FormField>
            <FormField label="装备分类">
              <select
                value={gear.category}
                onChange={(e) => patch({ category: e.target.value as GearItem['category'] })}
              >
                {Object.entries({
                  basic: '基础装备',
                  safety: '关键安全装备',
                  outdoor: '户外用品',
                  care: '维护与其他',
                }).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="购买日期（选填）" error={errors.purchaseDate}>
              <input
                type="date"
                max={today()}
                value={gear.purchaseDate}
                onChange={(e) => patch({ purchaseDate: e.target.value })}
              />
            </FormField>
            <FormField label="品牌（选填）">
              <input
                value={gear.brand}
                maxLength={80}
                onChange={(e) => patch({ brand: e.target.value })}
              />
            </FormField>
            <FormField label="型号（选填）">
              <input
                value={gear.model}
                maxLength={80}
                onChange={(e) => patch({ model: e.target.value })}
              />
            </FormField>
            <FormField label="使用场景与备注" full>
              <textarea
                rows={2}
                value={gear.notes}
                maxLength={1000}
                placeholder="适用场景、保养注意事项…"
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </FormField>
          </div>
          <label className="inspection-toggle">
            <input
              type="checkbox"
              checked={inspect}
              onChange={(e) => setInspect(e.target.checked)}
            />
            <ShieldCheck size={17} />
            添加一次检查记录
          </label>
          {inspect && (
            <div className="inspection-form form-grid">
              <FormField label="检查日期">
                <input
                  type="date"
                  max={today()}
                  value={inspection.date}
                  onChange={(e) => setInspection({ ...inspection, date: e.target.value })}
                />
              </FormField>
              <FormField label="检查结果">
                <select
                  value={inspection.result}
                  onChange={(e) =>
                    setInspection({
                      ...inspection,
                      result: e.target.value as GearInspection['result'],
                    })
                  }
                >
                  <option value="passed">按说明检查通过</option>
                  <option value="needs-review">需进一步核查，暂停使用</option>
                  <option value="retired">退役，停止使用</option>
                </select>
              </FormField>
              <FormField label="检查说明" full>
                <textarea
                  rows={2}
                  value={inspection.notes}
                  maxLength={500}
                  onChange={(e) => setInspection({ ...inspection, notes: e.target.value })}
                />
              </FormField>
            </div>
          )}
          {gear.inspections.length > 0 && (
            <div className="inspection-history">
              <h3>检查历史</h3>
              {[...gear.inspections].reverse().map((item, i) => (
                <div key={i}>
                  <span>{formatDate(item.date)}</span>
                  <strong>
                    {item.result === 'passed'
                      ? '检查通过'
                      : item.result === 'retired'
                        ? '已退役'
                        : '需核查'}
                  </strong>
                  {item.notes && <p>{item.notes}</p>}
                </div>
              ))}
            </div>
          )}
          <p className="inline-note">检查记录为你自行填写，不等同于专业检验或安全认证。</p>
          <FormErrors errors={errors} />
        </div>
        <div className="modal-footer">
          {existing ? (
            <ConfirmDelete
              label="删除装备"
              onDelete={() => {
                if (update((s) => ({ ...s, gear: s.gear.filter((g) => g.id !== id) }))) {
                  close();
                  notify('装备档案已删除');
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
            保存装备
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function TrainingForm({ id }: { id?: string }) {
  const { state, update, close, notify } = useApp();
  const existing = state.trainingPlans.find((p) => p.id === id);
  const [plan, setPlan] = useState<TrainingPlan>(
    existing || createTrainingPlan(state.user.id, state.user.stage, '基础脚法与重心练习'),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const patch = (part: Partial<TrainingPlan>) => setPlan((p) => ({ ...p, ...part }));
  function submit(e: FormEvent) {
    e.preventDefault();
    const issues = validateTrainingPlan(plan);
    setErrors(issues);
    if (
      !Object.keys(issues).length &&
      update((s) => ({
        ...s,
        trainingPlans: existing
          ? s.trainingPlans.map((p) => (p.id === id ? plan : p))
          : [plan, ...s.trainingPlans],
      }))
    ) {
      close();
      notify('训练计划已保存');
    }
  }
  return (
    <Modal
      wide
      title={existing ? '调整训练计划' : '给进步一个小计划'}
      description="训练应匹配身体状态，保留热身、休息与恢复的时间。"
      onClose={close}
    >
      <form noValidate onSubmit={submit}>
        <div className="modal-body">
          <div className="form-grid">
            <FormField label="训练目标" error={errors.goal} full>
              <input
                value={plan.goal}
                maxLength={120}
                onChange={(e) => patch({ goal: e.target.value })}
              />
            </FormField>
            <FormField label="训练日期" error={errors.date}>
              <input
                type="date"
                value={plan.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </FormField>
            <FormField label="自选训练阶段">
              <select
                value={plan.stage}
                onChange={(e) => patch({ stage: e.target.value as TrainingStage })}
              >
                {Object.entries(STAGE_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <h3 className="form-section-title">训练项目</h3>
          {plan.exercises.map((exercise, index) => (
            <div className="exercise-editor" key={exercise.id}>
              <div className="form-grid">
                <FormField label={`项目名称 ${index + 1}`}>
                  <input
                    value={exercise.name}
                    maxLength={80}
                    onChange={(e) =>
                      patch({
                        exercises: plan.exercises.map((item) =>
                          item.id === exercise.id ? { ...item, name: e.target.value } : item,
                        ),
                      })
                    }
                  />
                </FormField>
                <FormField label={`时长（分钟）${index + 1}`}>
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={exercise.durationMinutes || ''}
                    onChange={(e) =>
                      patch({
                        exercises: plan.exercises.map((item) =>
                          item.id === exercise.id
                            ? { ...item, durationMinutes: Number(e.target.value) }
                            : item,
                        ),
                      })
                    }
                  />
                </FormField>
                <FormField label={`练习方式 ${index + 1}`} full>
                  <input
                    value={exercise.instructions}
                    maxLength={300}
                    onChange={(e) =>
                      patch({
                        exercises: plan.exercises.map((item) =>
                          item.id === exercise.id
                            ? { ...item, instructions: e.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </FormField>
              </div>
              <button
                type="button"
                className="text-link delete-button"
                onClick={() =>
                  patch({ exercises: plan.exercises.filter((item) => item.id !== exercise.id) })
                }
              >
                <Trash2 size={14} />
                移除项目
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="full-width"
            onClick={() =>
              patch({
                exercises: [
                  ...plan.exercises,
                  {
                    id: createId('exercise'),
                    name: '',
                    durationMinutes: 10,
                    instructions: '',
                    completed: false,
                  },
                ],
              })
            }
          >
            <Plus size={16} />
            添加训练项目
          </Button>
          <div className="form-space">
            <FormField full label="休息与恢复安排">
              <textarea
                rows={3}
                maxLength={1000}
                value={plan.recoveryNotes}
                onChange={(e) => patch({ recoveryNotes: e.target.value })}
              />
            </FormField>
          </div>
          <FormErrors errors={errors} />
        </div>
        <div className="modal-footer">
          {existing ? (
            <ConfirmDelete
              label="删除计划"
              onDelete={() => {
                if (
                  update((s) => ({
                    ...s,
                    trainingPlans: s.trainingPlans.filter((p) => p.id !== id),
                  }))
                ) {
                  close();
                  notify('训练计划已删除');
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
            保存训练计划
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function Notifications() {
  const { state, close, go, update } = useApp();
  const upcoming = state.trips
    .filter((t) => t.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const gear = state.gear.filter(
    (g) => g.category === 'safety' && g.inspections.at(-1)?.result !== 'passed',
  );
  return (
    <Modal
      title="留意这些小事"
      description="这是应用内提醒，未接入后台推送或系统通知。"
      onClose={close}
    >
      <div className="modal-body">
        {!state.user.notifications ? (
          <EmptyState
            compact
            icon={Bell}
            title="为下一次出发留一份提醒"
            description="打开此面板时，查看接下来的行程和待检查装备。"
            action={
              <Button
                onClick={() => update((s) => ({ ...s, user: { ...s.user, notifications: true } }))}
              >
                启用应用内提醒
              </Button>
            }
          />
        ) : (
          <>
            {upcoming.map((t) => (
              <button
                className="notification-row"
                key={t.id}
                onClick={() => {
                  close();
                  go('/plans?trip=' + t.id);
                }}
              >
                <CalendarDays size={20} />
                <span>
                  <strong>{t.title}</strong>
                  <small>
                    {t.date} · {t.departureTime} 出发，记得检查准备清单
                  </small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
            {gear.length > 0 && (
              <button
                className="notification-row"
                onClick={() => {
                  close();
                  go('/gear');
                }}
              >
                <ShieldCheck size={20} />
                <span>
                  <strong>{gear.length} 件关键装备待检查或暂停使用</strong>
                  <small>请按制造商说明确认装备状态</small>
                </span>
                <ArrowRight size={15} />
              </button>
            )}
            {!upcoming.length && !gear.length && (
              <EmptyState
                compact
                icon={Bell}
                title="暂时没有待处理的提醒"
                description="新的行程和装备检查提示会显示在这里。"
              />
            )}
          </>
        )}
        <p className="inline-note">提醒偏好可在「我的」页面调整。</p>
      </div>
    </Modal>
  );
}
function Privacy() {
  const { close } = useApp();
  return (
    <Modal
      title="你的攀岩记录，由你保管"
      description="当前版本采用浏览器本地存储。"
      onClose={close}
    >
      <div className="modal-body privacy-content">
        <LockKeyhole size={34} />
        <h3>本地个人空间</h3>
        <p>
          个人资料、收藏、行程、装备、训练和攀岩记录保存在当前浏览器的 localStorage
          中。无需注册，当前版本没有云端同步或多人账户。
        </p>
        <p>
          公开演示路线与个人数据分开管理。个人实体带有所属用户标识；这只是本地数据隔离，无法替代服务器身份认证。请在自己的设备和浏览器中使用。
        </p>
        <h3>备份与服务</h3>
        <p>
          照片路线草稿保存在当前浏览器。仅点击「AI
          识别并生成路线」时，压缩墙面照片与所选训练目标会经本地服务端发送至配置的 DeepSeek
          服务商（可能为中转平台），并按服务商规则处理和计费。其他个人记录、地点与紧急联系人不会随该请求发送。API
          Key 只由服务端保管。
        </p>
        <p>
          可在「我的」页面导出 JSON
          备份。清除浏览器数据、更换浏览器或设备后，记录不会自动恢复。当前版本暂不提供备份导入。
        </p>
        <p>
          未接入实时天气、地图、岩场开放状态、交通或系统通知。路线名称、场地与定线均为演示，摄影仅作场景参考。
        </p>
        <p>训练建议与装备清单用于辅助准备，不能替代专业培训、现场判断、制造商说明或医疗建议。</p>
      </div>
      <div className="modal-footer">
        <Button onClick={close}>
          了解了
          <ShieldCheck size={16} />
        </Button>
      </div>
    </Modal>
  );
}
