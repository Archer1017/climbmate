import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Flag,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GRADE_OPTIONS,
  TYPE_LABELS,
  computeSessionStats,
  type ClimbingType,
  type GradeSystem,
} from '../lib';
import { durationLabel, formatDate } from '../lib/format';
import { Button, EmptyState, PageTitle, Progress, SectionHead } from '../components/ui';
import { PhotoRouteCollection } from '../components/PhotoRouteCollection';
export function RecordsPage() {
  const { path, go, open } = useApp();
  const photos = new URLSearchParams(path.split('?')[1]).get('view') !== 'climbs';
  return (
    <>
      <PageTitle
        label="YOUR CLIMBING JOURNAL"
        title="留住每一次攀爬的灵感"
        description="照片路线、心动收藏与攀爬日记，都收在这里。"
        action={
          <Button onClick={() => open({ type: 'session' })}>
            <Plus size={17} />
            记录攀岩
          </Button>
        }
      />
      <div className="record-views segmented" aria-label="记录类型">
        <button
          aria-pressed={photos}
          className={photos ? 'active' : ''}
          onClick={() => go('/records?view=photos')}
        >
          照片路线
        </button>
        <button
          aria-pressed={!photos}
          className={!photos ? 'active' : ''}
          onClick={() => go('/records?view=climbs')}
        >
          攀岩记录
        </button>
      </div>
      {photos ? <PhotoRouteCollection /> : <ClimbingRecords />}
    </>
  );
}
function ClimbingRecords() {
  const { state, stats, open } = useApp();
  const [period, setPeriod] = useState('all');
  const [trendGroup, setTrendGroup] = useState('');
  const weekDates = stats.weeklyActivity.map((d) => d.date);
  const monthKey =
    new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  const sessions = state.sessions
    .filter((s) =>
      period === 'week'
        ? weekDates.includes(s.date)
        : period === 'month'
          ? s.date.startsWith(monthKey)
          : true,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const scoped = useMemo(() => computeSessionStats(sessions), [state.sessions, period]);
  const groups = [...new Set(stats.gradeHistory.map((g) => `${g.type}:${g.gradeSystem}`))];
  const group = groups.includes(trendGroup) ? trendGroup : groups[0];
  const [type, system] = (group || 'bouldering:V').split(':') as [ClimbingType, GradeSystem];
  const history = stats.gradeHistory.filter((g) => `${g.type}:${g.gradeSystem}` === group);
  const daily = [...new Set(history.map((h) => h.date))]
    .map((date) => ({
      date,
      index: Math.max(
        ...history
          .filter((h) => h.date === date)
          .map((h) => GRADE_OPTIONS[system].indexOf(h.grade)),
      ),
    }))
    .slice(-10);
  const max = Math.max(1, ...daily.map((d) => d.index));
  const min = Math.max(0, Math.min(...daily.map((d) => d.index)) - 1);
  const latestBest = scoped.bestBySystem;
  return (
    <>
      <div className="records-toolbar">
        <div className="segmented">
          {[
            ['all', '全部记录'],
            ['week', '本周'],
            ['month', '本月'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={key === period ? 'active' : ''}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="muted">统计仅来自你的实际记录</span>
      </div>
      <div className="stats-grid">
        {[
          { label: '攀岩次数', value: scoped.totalSessions, unit: '次', icon: CalendarDays },
          {
            label: '累计攀爬时长',
            value: Math.round((scoped.totalMinutes / 60) * 10) / 10,
            unit: '小时',
            icon: Clock3,
          },
          { label: '完攀路线', value: scoped.completedRoutes, unit: '条', icon: Flag },
          {
            label: '路线完成率',
            value: scoped.completionRate ?? '—',
            unit: scoped.completionRate === null ? '' : '%',
            icon: Check,
          },
        ].map(({ label, value, unit, icon: Icon }) => (
          <section key={label} className="stat-card">
            <div>
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
          </section>
        ))}
      </div>
      <div className="two-columns records-analysis">
        <section className="panel">
          <SectionHead
            title="难度足迹"
            action={
              groups.length > 0 && (
                <select
                  className="mini-select"
                  aria-label="难度趋势类型与体系"
                  value={group}
                  onChange={(e) => setTrendGroup(e.target.value)}
                >
                  {groups.map((g) => {
                    const [t, s] = g.split(':');
                    return (
                      <option value={g} key={g}>
                        {TYPE_LABELS[t as ClimbingType]} · {s}
                      </option>
                    );
                  })}
                </select>
              )
            }
          />
          {daily.length ? (
            <>
              <div className="grade-chart">
                <div className="chart-axis">
                  <span>{GRADE_OPTIONS[system][max]}</span>
                  <span>{GRADE_OPTIONS[system][min]}</span>
                </div>
                <div className="grade-chart-bars">
                  {daily.map((d) => (
                    <div key={d.date} title={`${d.date} ${GRADE_OPTIONS[system][d.index]}`}>
                      <span className="chart-grade">{GRADE_OPTIONS[system][d.index]}</span>
                      <div
                        style={{
                          height: `${24 + ((d.index - min) / Math.max(1, max - min)) * 95}px`,
                        }}
                      />
                      <small>{formatDate(d.date, { month: 'numeric', day: 'numeric' })}</small>
                    </div>
                  ))}
                </div>
              </div>
              <p className="chart-note">
                每个日期展示 {TYPE_LABELS[type]} · {system} 体系内最高完攀难度。
              </p>
            </>
          ) : (
            <EmptyState
              compact
              icon={TrendingUp}
              title="每一次尝试，都是一笔积累"
              description="记录完攀后，在同一类型与评级体系内查看难度变化。"
            />
          )}
        </section>
        <section className="panel personal-best">
          <SectionHead title="属于你的里程碑" />
          <div className="week-goal-line">
            <span>本周攀爬目标</span>
            <strong>
              {stats.weekSessions} / {state.user.weeklyGoal} 次
            </strong>
          </div>
          <Progress
            value={(stats.weekSessions / state.user.weeklyGoal) * 100}
            label="本周攀爬目标"
          />
          <div className="best-list">
            {latestBest.length ? (
              latestBest.map((best) => (
                <div key={best.type + best.gradeSystem}>
                  <span className="best-icon">
                    <Flag size={18} />
                  </span>
                  <div>
                    <span>
                      {TYPE_LABELS[best.type]} · {best.gradeSystem} 个人最佳
                    </span>
                    <small>{formatDate(best.date)}</small>
                  </div>
                  <strong>{best.grade}</strong>
                </div>
              ))
            ) : (
              <div className="milestone-empty">
                <Flag size={23} />
                <p>
                  第一条完攀，第一份成就。
                  <br />
                  新的里程碑正在等你。
                </p>
              </div>
            )}
          </div>
          <p className="chart-note">
            完成率仅统计已记录完攀结果的路线。精简记录未填写结果时，不计入完成率或最佳完攀成绩。
          </p>
        </section>
      </div>
      <SectionHead title="攀岩日记" subtitle={`${sessions.length} 次攀爬，每一次都值得记住。`} />
      {!sessions.length ? (
        <div className="panel">
          <EmptyState
            icon={BookOpen}
            title={state.sessions.length ? '这个时段还没有攀岩记录' : '记录你的第一次向上'}
            description="路线、时长、感受，给今天的攀爬留一点记忆。"
            action={
              <Button variant="secondary" onClick={() => open({ type: 'session' })}>
                写一条攀岩记录
                <Plus size={16} />
              </Button>
            }
          />
        </div>
      ) : (
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={session.id}
              className="session-card"
              onClick={() => open({ type: 'session', id: session.id })}
            >
              <div className="session-calendar">
                <strong>{session.date.slice(8)}</strong>
                <span>{formatDate(session.date, { month: 'short' })}</span>
              </div>
              <div className="session-info">
                <div>
                  <h3>{session.location || `${TYPE_LABELS[session.type]}记录`}</h3>
                  <span className="tag">{TYPE_LABELS[session.type]}</span>
                </div>
                <p>
                  {durationLabel(session.durationMinutes)}
                  <span>·</span>
                  {session.attempts.length} 条路线<span>·</span>
                  主观难度 {session.effort}/10
                </p>
                {session.notes && <small>{session.notes}</small>}
              </div>
              <div className="session-grades">
                {[...new Set(session.attempts.map((a) => `${a.grade} ${a.gradeSystem}`))]
                  .slice(0, 3)
                  .map((g) => (
                    <span key={g}>{g}</span>
                  ))}
              </div>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
