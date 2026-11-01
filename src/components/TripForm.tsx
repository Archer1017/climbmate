import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DEMO_ROUTES,
  TYPE_LABELS,
  createId,
  generateChecklist,
  validateTrip,
  type ClimbingType,
  type Environment,
  type Trip,
} from '../lib';
import { today } from '../lib/format';
import { Button, ConfirmDelete, FormErrors, FormField, Modal, SafetyNote } from './ui';
export function TripForm({ id, routeId }: { id?: string; routeId?: string }) {
  const { state, update, close, notify, go } = useApp();
  const existing = state.trips.find((t) => t.id === id);
  const route = DEMO_ROUTES.find((r) => r.id === routeId);
  const initialType = route?.type || state.user.preferredTypes[0] || 'bouldering';
  const initialEnvironment =
    route?.environment ||
    (initialType === 'sport' || initialType === 'trad' ? 'outdoor' : 'indoor');
  const [trip, setTrip] = useState<Trip>(
    existing || {
      id: createId('trip'),
      ownerId: state.user.id,
      title: route ? `${route.name} · 攀岩计划` : '',
      destination: route?.location || '',
      date: today(),
      departureTime: '09:00',
      durationMinutes: 120,
      type: initialType,
      environment: initialEnvironment,
      companions: '',
      routeIds: route ? [route.id] : [],
      transport: '自行安排',
      emergencyContact: '',
      returnPlan: '',
      checklist: generateChecklist(initialType, initialEnvironment),
      notes: '',
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addTo, setAddTo] = useState('');
  const compatible = route
    ? state.trips.filter(
        (t) => t.type === route.type && t.environment === route.environment && t.date >= today(),
      )
    : [];
  const patch = (part: Partial<Trip>) => setTrip((t) => ({ ...t, ...part }));
  const changeKind = (type: ClimbingType, environment: Environment) =>
    patch({ type, environment, routeIds: [], checklist: generateChecklist(type, environment) });
  const routes = DEMO_ROUTES.filter(
    (r) => r.type === trip.type && r.environment === trip.environment,
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    if (addTo && route) {
      if (
        update((s) => ({
          ...s,
          trips: s.trips.map((t) =>
            t.id === addTo ? { ...t, routeIds: [...new Set([...t.routeIds, route.id])] } : t,
          ),
        }))
      ) {
        close();
        notify('路线已加入行程');
        go('/plans?trip=' + addTo);
      }
      return;
    }
    const next = { ...trip, title: trip.title.trim(), destination: trip.destination.trim() };
    const issues = validateTrip(next);
    setErrors(issues);
    if (Object.keys(issues).length) return;
    if (
      update((s) => ({
        ...s,
        trips: existing ? s.trips.map((t) => (t.id === trip.id ? next : t)) : [next, ...s.trips],
      }))
    ) {
      close();
      notify(existing ? '行程已更新' : '行程已创建，准备出发');
      go('/plans?trip=' + trip.id);
    }
  }
  return (
    <Modal
      wide
      title={existing ? '编辑攀岩行程' : route ? '把路线放进行程' : '计划下一次出发'}
      description="目的地、同行岩友和装备，提前准备更从容。"
      onClose={close}
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-body">
          {compatible.length > 0 && (
            <div className="add-existing">
              <FormField label="加入已有行程，或新建">
                <select value={addTo} onChange={(e) => setAddTo(e.target.value)}>
                  <option value="">新建攀岩行程</option>
                  {compatible.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.date} · {t.title}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )}
          {addTo ? (
            <p className="inline-note">
              将「{route?.name}」加入选中的行程，保留该行程已有的装备清单。
            </p>
          ) : (
            <>
              <div className="form-grid">
                <FormField label="行程名称" error={errors.title} full>
                  <input
                    required
                    maxLength={80}
                    value={trip.title}
                    placeholder="例如：周末一起去抱石"
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </FormField>
                <FormField label="目的地" error={errors.destination} full>
                  <input
                    required
                    maxLength={120}
                    placeholder="攀岩馆或岩场名称"
                    value={trip.destination}
                    onChange={(e) => patch({ destination: e.target.value })}
                  />
                </FormField>
                <FormField label="攀岩日期" error={errors.date}>
                  <input
                    required
                    type="date"
                    value={trip.date}
                    onChange={(e) => patch({ date: e.target.value })}
                  />
                </FormField>
                <FormField label="出发时间" error={errors.departureTime}>
                  <input
                    required
                    type="time"
                    value={trip.departureTime}
                    onChange={(e) => patch({ departureTime: e.target.value })}
                  />
                </FormField>
                <FormField label="攀岩类型">
                  <select
                    value={trip.type}
                    onChange={(e) => {
                      const type = e.target.value as ClimbingType;
                      changeKind(type, type === 'sport' || type === 'trad' ? 'outdoor' : 'indoor');
                    }}
                  >
                    {Object.entries(TYPE_LABELS).map(([key, value]) => (
                      <option value={key} key={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="攀岩环境">
                  <select
                    value={trip.environment}
                    onChange={(e) => changeKind(trip.type, e.target.value as Environment)}
                  >
                    <option value="indoor" disabled={trip.type === 'sport' || trip.type === 'trad'}>
                      室内岩馆
                    </option>
                    <option value="outdoor" disabled={trip.type === 'indoor'}>
                      户外岩场
                    </option>
                  </select>
                </FormField>
                <FormField label="预计时长（分钟）" error={errors.durationMinutes}>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={trip.durationMinutes || ''}
                    onChange={(e) => patch({ durationMinutes: Number(e.target.value) })}
                  />
                </FormField>
                <FormField label="交通方式">
                  <select
                    value={trip.transport}
                    onChange={(e) => patch({ transport: e.target.value })}
                  >
                    {['自行安排', '公共交通', '自驾', '步行 / 骑行', '拼车'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="同行人员" full>
                  <input
                    value={trip.companions}
                    maxLength={200}
                    placeholder="岩友昵称，或注明独自前往"
                    onChange={(e) => patch({ companions: e.target.value })}
                  />
                </FormField>
                <FormField
                  label={
                    trip.environment === 'outdoor' ? '紧急联系人（户外必填）' : '紧急联系人（选填）'
                  }
                  error={errors.emergencyContact}
                  full
                >
                  <input
                    value={trip.emergencyContact}
                    maxLength={100}
                    placeholder="姓名与联系电话"
                    onChange={(e) => patch({ emergencyContact: e.target.value })}
                  />
                </FormField>
                {trip.environment === 'outdoor' && (
                  <FormField label="返程计划（户外必填）" error={errors.returnPlan} full>
                    <input
                      value={trip.returnPlan}
                      maxLength={300}
                      placeholder="例如：17:00 收队，18:00 前返回停车场"
                      onChange={(e) => patch({ returnPlan: e.target.value })}
                    />
                  </FormField>
                )}
              </div>
              <fieldset className="route-select">
                <legend>计划路线（可多选）</legend>
                {routes.map((r) => (
                  <label key={r.id}>
                    <input
                      type="checkbox"
                      checked={trip.routeIds.includes(r.id)}
                      onChange={(e) =>
                        patch({
                          routeIds: e.target.checked
                            ? [...trip.routeIds, r.id]
                            : trip.routeIds.filter((item) => item !== r.id),
                        })
                      }
                    />
                    <span>{r.name}</span>
                    <small>
                      {r.grade} · {r.gradeSystem}
                    </small>
                  </label>
                ))}
                <small>此处为匹配类型与环境的演示路线，可稍后从路线库继续添加。</small>
              </fieldset>
              <FormField label="行程备注" full>
                <textarea
                  rows={2}
                  value={trip.notes}
                  maxLength={1000}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="集合地点、身体状况、其他安排…"
                />
              </FormField>
              <p className="inline-note">
                更换类型或环境会重新生成准备清单。户外天气、岩壁状况与通行需自行核实。
              </p>
              <SafetyNote />
            </>
          )}
          <FormErrors errors={errors} />
        </div>
        <div className="modal-footer">
          {existing && !addTo ? (
            <ConfirmDelete
              label="删除行程"
              onDelete={() => {
                if (update((s) => ({ ...s, trips: s.trips.filter((t) => t.id !== id) }))) {
                  close();
                  notify('行程已删除');
                  go('/plans');
                }
              }}
            />
          ) : (
            <Button type="button" variant="ghost" onClick={close}>
              取消
            </Button>
          )}
          <Button type="submit">
            <Plus size={16} />
            {addTo ? '加入选中行程' : existing ? '保存修改' : '创建行程'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
