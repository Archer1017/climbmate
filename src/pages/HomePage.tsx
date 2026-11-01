import {
  ArrowRight,
  ArrowUpRight,
  Backpack,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Dumbbell,
  Mountain,
  ShieldCheck,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STAGE_LABELS, getTrainingSuggestion } from '../lib';
import { formatDate, greeting, today } from '../lib/format';
import { Button, Photo } from '../components/ui';
export function HomePage() {
  const { state, stats, go, open } = useApp();
  const training = state.trainingPlans.find((plan) => plan.date === today());
  const suggestion = getTrainingSuggestion(state.sessions, state.user.goal);
  const goalProgress = Math.min(
    100,
    Math.round((stats.weekSessions / state.user.weeklyGoal) * 100),
  );
  return (
    <>
      <div className="welcome">
        <div>
          <div className="welcome-label">
            <span /> 今天，也向上一步
          </div>
          <h1>
            {greeting()}，{state.user.name}
            <span className="greeting-sun">
              <Sun size={26} strokeWidth={1.6} />
            </span>
          </h1>
          <p>攀爬有计划，进步有迹可循。</p>
        </div>
        <div className="today-date">
          <CalendarDays size={16} />
          {formatDate(today())}
        </div>
      </div>
      <div className="home-main-grid">
        <div className="home-left">
          <section className="hero">
            <Photo
              className="hero-photo"
              src="/images/climb-hero.jpg"
              alt="攀岩者在海岸石灰岩壁上向上攀爬"
              eager
            />
            <div className="hero-shade" />
            <div className="hero-content">
              <div className="hero-kicker">
                <Mountain size={16} /> GO A LITTLE HIGHER
              </div>
              <h2>
                向上一步，
                <br />
                看见新的自己。
              </h2>
              <p>{training ? `今日计划：${training.goal}` : '不必急于登顶，享受每一次攀爬。'}</p>
              <Button onClick={() => open({ type: 'session' })}>
                开始攀岩
                <ArrowUpRight size={18} />
              </Button>
            </div>
            <button className="hero-stage" onClick={() => open({ type: 'profile' })}>
              <span className="stage-icon">
                <Mountain size={21} />
              </span>
              <span>
                <small>当前训练阶段</small>
                <strong>{STAGE_LABELS[state.user.stage]}</strong>
              </span>
              <ChevronRight size={16} />
            </button>
          </section>
          <div className="quick-actions">
            {[
              { icon: Compass, title: '发现路线', text: '找到下一个挑战', path: '/routes' },
              { icon: Backpack, title: '准备装备', text: '出发前再确认', path: '/gear' },
              { icon: Dumbbell, title: '训练计划', text: '让进步有方向', path: '/training' },
              {
                icon: TrendingUp,
                title: '成长记录',
                text: '看见每一点进步',
                path: '/records?view=climbs',
              },
            ].map(({ icon: Icon, title, text, path }) => (
              <button key={path} onClick={() => go(path)}>
                <span className="quick-action-icon">
                  <Icon size={21} strokeWidth={1.6} />
                </span>
                <strong>{title}</strong>
                <small>{text}</small>
                <ArrowUpRight className="quick-arrow" size={14} />
              </button>
            ))}
          </div>
        </div>
        <aside className="home-right">
          <section className="weekly-card">
            <div className="rail-heading">
              <h2>本周，向上的足迹</h2>
              <button
                className="icon-button"
                aria-label="查看成长数据"
                onClick={() => go('/records?view=climbs')}
              >
                <ArrowUpRight size={17} />
              </button>
            </div>
            <div className="weekly-top">
              <div>
                <span className="weekly-label">本周已攀爬</span>
                <div className="weekly-number">
                  {stats.weekSessions}
                  <small>/ {state.user.weeklyGoal} 次</small>
                </div>
                <p>
                  {stats.weekSessions >= state.user.weeklyGoal
                    ? '本周目标已达成，记得恢复'
                    : '保持自己的节奏，就很好'}
                </p>
              </div>
              <div
                className="goal-ring"
                style={{ '--progress': `${goalProgress}%` } as React.CSSProperties}
              >
                <span>
                  <Mountain size={23} />
                </span>
              </div>
            </div>
            <div className="week-chart" aria-label="本周每日攀爬时长">
              {stats.weeklyActivity.map((day) => (
                <div
                  key={day.date}
                  className={day.date === today() ? 'is-today' : ''}
                  title={`${day.date}：${day.minutes} 分钟`}
                >
                  <div className="bar-track">
                    <span
                      style={{
                        height: day.minutes
                          ? `${Math.max(8, (day.minutes / Math.max(60, ...stats.weeklyActivity.map((item) => item.minutes))) * 100)}%`
                          : '3px',
                      }}
                    />
                  </div>
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
            <div className="weekly-bottom">
              <div>
                <Clock3 size={15} />
                <strong>{stats.weekMinutes}</strong>
                <span>分钟攀爬</span>
              </div>
              <div>
                <Check size={15} />
                <strong>
                  {state.sessions
                    .filter((s) => stats.weeklyActivity.some((d) => d.date === s.date))
                    .reduce((sum, s) => sum + s.attempts.filter((a) => a.completed).length, 0)}
                </strong>
                <span>条完攀</span>
              </div>
            </div>
          </section>
          <section className="training-teaser">
            <div className="training-teaser-title">
              <span>
                <Dumbbell size={18} />
              </span>
              <small>循序渐进，稳步向上</small>
            </div>
            <h3>{training?.goal || suggestion.title}</h3>
            <p>
              {training
                ? `${training.exercises.filter((e) => e.completed).length} / ${training.exercises.length} 项已完成`
                : suggestion.reason}
            </p>
            <button onClick={() => go('/training')}>
              {training ? '继续今日训练' : '探索训练计划'}
              <ArrowRight size={16} />
            </button>
          </section>
          <div className="home-safety">
            <ShieldCheck size={20} />
            <p>
              认真准备，自由攀爬。
              <br />
              <span>辅助工具不能替代专业培训与现场安全检查。</span>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
