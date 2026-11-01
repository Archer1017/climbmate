import {
  ArrowUpRight,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  CloudSun,
  Compass,
  MapPin,
  Phone,
  Plus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEMO_ROUTES, TYPE_LABELS, checklistProgress } from '../lib';
import { durationLabel, formatDate, today } from '../lib/format';
import {
  Button,
  CheckButton,
  EmptyState,
  PageTitle,
  Progress,
  SafetyNote,
  SectionHead,
} from '../components/ui';
export function PlansPage() {
  const { state, path, open, update, go } = useApp();
  const [selectedId, setSelected] = useState(
    new URLSearchParams(path.split('?')[1]).get('trip') || '',
  );
  const trips = [...state.trips].sort((a, b) => {
    const pastA = a.date < today(),
      pastB = b.date < today();
    return (
      Number(pastA) - Number(pastB) ||
      (pastA ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))
    );
  });
  const trip = trips.find((t) => t.id === selectedId) || trips[0];
  const progress = trip ? checklistProgress(trip.checklist) : 0;
  return (
    <>
      <PageTitle
        label="PLAN YOUR NEXT ADVENTURE"
        title="把每次出发，准备好"
        description="选一面岩壁，约几个岩友，剩下的交给计划。"
        action={
          <Button onClick={() => open({ type: 'trip' })}>
            <Plus size={17} />
            新建行程
          </Button>
        }
      />
      <div className="subnav">
        <span className="active">
          攀岩行程<span>{state.trips.length}</span>
        </span>
        <button onClick={() => go('/training')}>
          训练计划
          <ArrowUpRight size={14} />
        </button>
        <button onClick={() => go('/gear')}>
          装备清单
          <ArrowUpRight size={14} />
        </button>
      </div>
      {!trip ? (
        <div className="panel plan-empty">
          <EmptyState
            icon={CalendarDays}
            title="下一次攀爬，由你计划"
            description="目的地、同行岩友、路线和装备，在一份行程里准备妥当。"
            action={
              <Button onClick={() => open({ type: 'trip' })}>
                <Plus size={16} />
                创建第一份行程
              </Button>
            }
          />
          <div className="plan-empty-features">
            <span>
              <MapPin size={19} />
              选定目的地
            </span>
            <span>
              <Compass size={19} />
              安排目标路线
            </span>
            <span>
              <Check size={19} />
              检查出发装备
            </span>
          </div>
        </div>
      ) : (
        <div className="plans-layout">
          <aside className="trip-list">
            <h2>
              我的行程 <span>{trips.length}</span>
            </h2>
            {trips.map((t) => (
              <button
                className={`trip-list-card ${trip.id === t.id ? 'selected' : ''}`}
                key={t.id}
                onClick={() => setSelected(t.id)}
              >
                <span className="trip-list-date">
                  {formatDate(t.date, { month: 'short', day: 'numeric' })}
                  <small>{t.date < today() ? '历史行程' : TYPE_LABELS[t.type]}</small>
                </span>
                <strong>{t.title}</strong>
                <span className="location">
                  <MapPin size={13} />
                  {t.destination}
                </span>
                <Progress value={checklistProgress(t.checklist)} label={`${t.title}准备进度`} />
                <span className="trip-list-percent">准备 {checklistProgress(t.checklist)}%</span>
              </button>
            ))}
          </aside>
          <div className="trip-main">
            <section className="panel trip-overview">
              <div className="section-head">
                <span className="tag">
                  <CalendarDays size={14} />
                  {formatDate(trip.date)}
                </span>
                <Button variant="secondary" onClick={() => open({ type: 'trip', id: trip.id })}>
                  编辑行程
                </Button>
              </div>
              <h2>{trip.title}</h2>
              <p className="location">
                <MapPin size={16} />
                {trip.destination}
                <span className="demo-badge">
                  {trip.environment === 'outdoor' ? '户外' : '室内'} · {TYPE_LABELS[trip.type]}
                </span>
              </p>
              <div className="trip-info-grid">
                {[
                  {
                    icon: Clock3,
                    label: '出发 / 时长',
                    value: `${trip.departureTime} / ${durationLabel(trip.durationMinutes)}`,
                  },
                  { icon: Users, label: '同行岩友', value: trip.companions || '暂未填写' },
                  { icon: CarFront, label: '交通方式', value: trip.transport || '暂未填写' },
                  { icon: Phone, label: '紧急联系人', value: trip.emergencyContact || '暂未填写' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <Icon size={18} />
                    <span>
                      {label}
                      <strong>{value}</strong>
                    </span>
                  </div>
                ))}
              </div>
              <div className="weather-notice">
                <CloudSun size={21} />
                <div>
                  <strong>天气、通行与开放状态待自行核实</strong>
                  <p>
                    尚未接入实时天气与地图服务。
                    {trip.environment === 'outdoor'
                      ? '请确认降雨、岩壁干燥情况、岩场开放、交通与返程安排。'
                      : '请提前向场馆确认营业时间、保护方式与准入要求。'}
                  </p>
                </div>
              </div>
              {trip.returnPlan && (
                <p className="trip-note">
                  <strong>返程安排</strong>
                  {trip.returnPlan}
                </p>
              )}
              {trip.notes && (
                <p className="trip-note">
                  <strong>行程备注</strong>
                  {trip.notes}
                </p>
              )}
            </section>
            <section className="panel">
              <SectionHead
                title="计划攀爬的路线"
                action={
                  <button className="text-link" onClick={() => go('/routes')}>
                    找更多路线
                    <ArrowUpRight size={15} />
                  </button>
                }
              />
              {trip.routeIds.length ? (
                <div className="planned-routes">
                  {trip.routeIds.map((id) => {
                    const route = DEMO_ROUTES.find((r) => r.id === id);
                    return route ? (
                      <button key={id} onClick={() => go('/routes/' + id)}>
                        <span className="planned-grade">
                          {route.grade}
                          <small>{route.gradeSystem}</small>
                        </span>
                        <span>
                          <strong>{route.name}</strong>
                          <small>{route.location}</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="muted padded">还没有安排路线。编辑行程或从路线详情加入。</p>
              )}
            </section>
            <section className="panel">
              <SectionHead
                title="出发准备清单"
                action={
                  <span className="progress-number">
                    {progress}
                    <small>%</small>
                  </span>
                }
              />
              <p className="muted">
                {trip.checklist.filter((item) => item.checked).length} / {trip.checklist.length}{' '}
                项已确认 · 每份行程独立保存
              </p>
              <Progress value={progress} label="当前行程准备进度" />
              <div className="checklist">
                {trip.checklist.map((item) => (
                  <CheckButton
                    checked={item.checked}
                    critical={item.critical}
                    detail={item.note}
                    key={item.id}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        trips: s.trips.map((t) =>
                          t.id === trip.id
                            ? {
                                ...t,
                                checklist: t.checklist.map((i) =>
                                  i.id === item.id ? { ...i, checked: !i.checked } : i,
                                ),
                              }
                            : t,
                        ),
                      }))
                    }
                  >
                    {item.name}
                  </CheckButton>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
      <SafetyNote />
    </>
  );
}
