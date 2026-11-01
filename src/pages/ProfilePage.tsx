import {
  ArrowRight,
  Backpack,
  Bell,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Download,
  Dumbbell,
  Flag,
  Mountain,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STAGE_LABELS, TYPE_LABELS } from '../lib';
import { Button, PageTitle, Progress, SectionHead } from '../components/ui';
export function ProfilePage() {
  const { state, stats, update, open, go, notify } = useApp();
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `climbmate-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('数据备份已导出');
  };
  return (
    <>
      <PageTitle
        label="YOUR OWN CLIMBING STORY"
        title="每一步，都是你的故事"
        description="按自己的节奏，成为更好的攀爬者。"
      />
      <section className="profile-card">
        <div className="profile-avatar">
          {state.user.name.slice(0, 1)}
          <Mountain size={19} />
        </div>
        <div className="profile-card-copy">
          <h2>{state.user.name}</h2>
          <p>
            {state.user.preferredTypes.map((type) => TYPE_LABELS[type]).join(' · ') ||
              '探索自己的攀岩偏好'}
          </p>
          <span className="tag">
            <Mountain size={13} />
            {STAGE_LABELS[state.user.stage]}训练阶段 · 用户自选
          </span>
        </div>
        <Button variant="secondary" onClick={() => open({ type: 'profile' })}>
          <Pencil size={15} />
          编辑资料
        </Button>
      </section>
      <div className="profile-stats">
        <div>
          <strong>
            {stats.totalSessions}
            <small>次</small>
          </strong>
          <span>累计攀爬</span>
        </div>
        <div>
          <strong>
            {Math.round((stats.totalMinutes / 60) * 10) / 10}
            <small>小时</small>
          </strong>
          <span>和岩壁相处的时光</span>
        </div>
        <div>
          <strong>
            {stats.completedRoutes}
            <small>条</small>
          </strong>
          <span>完攀路线</span>
        </div>
      </div>
      <div className="two-columns">
        <div>
          <section className="panel profile-goal">
            <SectionHead
              title="我的攀岩目标"
              action={
                <button
                  className="icon-button"
                  aria-label="编辑攀岩目标"
                  onClick={() => open({ type: 'profile' })}
                >
                  <Pencil size={16} />
                </button>
              }
            />
            <span className="soft-icon">
              <Flag size={23} />
            </span>
            <h3>{state.user.goal}</h3>
            <div className="week-goal-line">
              <span>每周 {state.user.weeklyGoal} 次，让习惯慢慢生长</span>
              <strong>
                {stats.weekSessions} / {state.user.weeklyGoal}
              </strong>
            </div>
            <Progress
              value={(stats.weekSessions / state.user.weeklyGoal) * 100}
              label="个人周目标"
            />
            <button className="text-link" onClick={() => go('/training')}>
              用训练靠近目标
              <ArrowRight size={16} />
            </button>
          </section>
          <section className="profile-privacy">
            <ShieldCheck size={25} />
            <div>
              <h3>你的记录，由你保管</h3>
              <p>个人数据仅保存在当前浏览器。可随时导出备份，清除浏览器数据会丢失记录。</p>
              <button className="text-link" onClick={() => open({ type: 'privacy' })}>
                了解隐私与存储
                <ChevronRight size={14} />
              </button>
            </div>
          </section>
        </div>
        <section className="panel profile-menu">
          <h2>我的攀岩空间</h2>
          {[
            {
              icon: Bookmark,
              title: '收藏路线',
              detail: `${state.photoRoutes.filter((route) => route.favorite).length} 条照片路线`,
              path: '/records?view=photos&favorites=1',
            },
            {
              icon: Backpack,
              title: '我的装备',
              detail: `${state.gear.length} 件装备档案`,
              path: '/gear',
            },
            {
              icon: CalendarDays,
              title: '历史与未来行程',
              detail: `${state.trips.length} 次出发计划`,
              path: '/plans',
            },
            {
              icon: Dumbbell,
              title: '我的训练',
              detail: `${state.trainingPlans.length} 份训练安排`,
              path: '/training',
            },
          ].map(({ icon: Icon, title, detail, path }) => (
            <button className="profile-menu-row" key={path} onClick={() => go(path)}>
              <span className="soft-icon">
                <Icon size={19} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
          <div className="profile-menu-row">
            <span className="soft-icon">
              <Bell size={19} />
            </span>
            <span>
              <strong>应用内提醒</strong>
              <small>打开提醒面板时查看行程与装备提示</small>
            </span>
            <button
              role="switch"
              aria-checked={state.user.notifications}
              aria-label="应用内提醒"
              className={`switch ${state.user.notifications ? 'on' : ''}`}
              onClick={() => {
                if (
                  update((s) => ({
                    ...s,
                    user: { ...s.user, notifications: !s.user.notifications },
                  }))
                )
                  notify(state.user.notifications ? '应用内提醒已关闭' : '应用内提醒已开启');
              }}
            >
              <span />
            </button>
          </div>
          <button className="profile-menu-row" onClick={exportData}>
            <span className="soft-icon">
              <Download size={19} />
            </span>
            <span>
              <strong>导出我的数据</strong>
              <small>下载包含全部个人数据的 JSON 备份</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </section>
      </div>
    </>
  );
}
