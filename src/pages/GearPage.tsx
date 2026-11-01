import { ArrowRight, Backpack, PackageCheck, Plus, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  TYPE_LABELS,
  checklistProgress,
  createId,
  generateChecklist,
  type ChecklistItem,
  type ClimbingType,
  type Environment,
} from '../lib';
import {
  Button,
  CheckButton,
  EmptyState,
  PageTitle,
  Progress,
  SafetyNote,
  SectionHead,
} from '../components/ui';
export function GearPage() {
  const { state, update, notify, open, go } = useApp();
  const [type, setType] = useState<ClimbingType>('bouldering');
  const [environment, setEnvironment] = useState<Environment>('indoor');
  const template = useMemo(() => generateChecklist(type, environment), [type, environment]);
  const list = state.savedChecklists.find((l) => l.type === type && l.environment === environment);
  const items = list?.items || template;
  const progress = checklistProgress(items);
  const save = (nextItems: ChecklistItem[]) => {
    const next = list
      ? { ...list, items: nextItems }
      : {
          id: createId('checklist'),
          name: `${environment === 'indoor' ? '室内' : '户外'}${TYPE_LABELS[type]}清单`,
          type,
          environment,
          items: nextItems,
        };
    return update((s) => ({
      ...s,
      savedChecklists: list
        ? s.savedChecklists.map((l) => (l.id === list.id ? next : l))
        : [...s.savedChecklists, next],
    }));
  };
  const criticalCount = state.gear.filter(
    (g) =>
      g.category === 'safety' &&
      (!g.inspections.length || g.inspections.at(-1)?.result !== 'passed'),
  ).length;
  return (
    <>
      <PageTitle
        label="READY FOR THE WALL"
        title="装备就绪，安心向上"
        description="带上需要的每一件，为每一次攀爬做好准备。"
        action={
          <Button onClick={() => open({ type: 'gear' })}>
            <Plus size={17} />
            添加我的装备
          </Button>
        }
      />
      <div className="gear-layout">
        <section className="panel checklist-panel">
          <SectionHead
            title="你的出发清单"
            action={
              <span className="soft-icon">
                <Backpack size={22} />
              </span>
            }
          />
          <p className="muted">选择类型与环境，生成专属辅助清单。</p>
          <div className="form-grid gear-generator">
            <label className="field">
              <span>攀岩类型</span>
              <select
                aria-label="攀岩类型"
                value={type}
                onChange={(e) => {
                  const next = e.target.value as ClimbingType;
                  setType(next);
                  if (next === 'indoor') setEnvironment('indoor');
                  else if (next === 'sport' || next === 'trad') setEnvironment('outdoor');
                }}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>攀岩环境</span>
              <select
                aria-label="攀岩环境"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
              >
                <option value="indoor" disabled={type === 'sport' || type === 'trad'}>
                  室内岩馆
                </option>
                <option value="outdoor" disabled={type === 'indoor'}>
                  户外岩场
                </option>
              </select>
            </label>
          </div>
          <Button
            variant="secondary"
            className="full-width"
            onClick={() => {
              if (save(items)) notify(list ? '已载入保存的清单' : '装备清单已生成并保存');
            }}
          >
            <PackageCheck size={17} />
            {list ? '载入已保存清单' : '生成并保存清单'}
          </Button>
          <div className="checklist-progress">
            <span>
              {items.filter((i) => i.checked).length} / {items.length} 项已准备
            </span>
            <strong>{progress}%</strong>
          </div>
          <Progress value={progress} label="装备清单准备进度" />
          <div className="checklist">
            {items.map((item) => (
              <CheckButton
                key={item.id}
                checked={item.checked}
                critical={item.critical}
                detail={item.note}
                onClick={() =>
                  save(items.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
                }
              >
                {item.name}
              </CheckButton>
            ))}
          </div>
          <div className="inline-note">勾选即自动保存。行程中的准备清单单独管理。</div>
        </section>
        <div className="gear-library">
          <section className="panel">
            <SectionHead
              title="我的装备库"
              action={<span className="count-bubble">{state.gear.length}</span>}
            />
            {!state.gear.length ? (
              <EmptyState
                compact
                icon={Backpack}
                title="每一件装备，都有自己的档案"
                description="记录品牌、型号、购买时间与检查情况。"
                action={
                  <Button variant="secondary" onClick={() => open({ type: 'gear' })}>
                    <Plus size={15} />
                    添加第一件装备
                  </Button>
                }
              />
            ) : (
              <div className="gear-inventory">
                {state.gear.map((item) => (
                  <button key={item.id} onClick={() => open({ type: 'gear', id: item.id })}>
                    <span className="inventory-icon">
                      {item.category === 'safety' ? (
                        <ShieldCheck size={21} />
                      ) : (
                        <Backpack size={21} />
                      )}
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {[item.brand, item.model].filter(Boolean).join(' · ') || '品牌与型号待补充'}
                      </small>
                    </span>
                    <span
                      className={`inspection-status ${item.inspections.at(-1)?.result === 'passed' ? 'passed' : ''}`}
                    >
                      {item.inspections.at(-1)?.result === 'passed'
                        ? '已检查'
                        : item.inspections.at(-1)?.result === 'retired'
                          ? '已退役'
                          : '待检查'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="gear-advice">
            <div className="soft-icon">
              <ShieldCheck size={23} />
            </div>
            <h2>多一分检查，多一分从容</h2>
            <p>
              {criticalCount
                ? `有 ${criticalCount} 件关键装备尚无通过的检查记录，请按制造商要求检查。`
                : '每次使用前，按制造商说明检查装备状态。异常或已退役装备请停止使用。'}
            </p>
            <div>
              <strong>装备选择小贴士</strong>
              <p>
                {type === 'bouldering'
                  ? '抱石无需绳索装备。室外抱石需根据落地区域安排足够的抱石垫与受过训练的同行。'
                  : '绳索、保护器和锁扣需与真实路线及保护系统相容。清单不提供统一绳长、数量或使用教学。'}
              </p>
            </div>
          </section>
          <button className="gear-trip-link" onClick={() => go('/plans')}>
            <span>
              <CalendarIcon />
              把装备放进你的下一次出发
            </span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
      <SafetyNote />
    </>
  );
}
const CalendarIcon = () => <Backpack size={18} />;
