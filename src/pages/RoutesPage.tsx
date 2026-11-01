import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarPlus,
  Check,
  MapPin,
  Mountain,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEMO_ROUTES, TYPE_LABELS } from '../lib';
import { Button, EmptyState, Photo, SafetyNote } from '../components/ui';
import { PhotoRouteModule } from '../components/PhotoRouteModule';
export function RoutesPage() {
  return <PhotoRouteModule />;
}
export function RouteDetail({ id }: { id: string }) {
  const { state, update, go, open, notify } = useApp();
  const route = DEMO_ROUTES.find((r) => r.id === id);
  if (!route)
    return (
      <EmptyState
        title="路线暂未找到"
        description="回到路线库继续探索。"
        action={<Button onClick={() => go('/routes')}>浏览路线</Button>}
      />
    );
  const saved = state.favoriteRouteIds.includes(id);
  const attempts = [...state.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((session) => session.attempts.filter((a) => a.routeId === id));
  const sent = attempts.some((a) => a.completed);
  return (
    <>
      <button className="back-link" onClick={() => go('/routes')}>
        <ArrowLeft size={16} />
        返回路线库
      </button>
      <div className="route-detail-layout">
        <div className="route-detail-image">
          <Photo src={route.image} alt={`${route.name}场景参考摄影`} eager />
          <span className="image-footnote">场景参考摄影，非真实路线拓扑图</span>
        </div>
        <section className="route-detail-summary">
          <div className="route-meta">
            <span>
              {TYPE_LABELS[route.type]} · {route.environment === 'outdoor' ? '户外' : '室内'}
            </span>
            <span className="demo-badge">演示路线</span>
          </div>
          <h1>{route.name}</h1>
          <p className="location">
            <MapPin size={16} />
            {route.location}
          </p>
          <div className="detail-grade">
            <strong>{route.grade}</strong>
            <span>
              {route.gradeSystem} 难度体系<small>同体系内参考，不直接跨体系比较</small>
            </span>
          </div>
          <div className="route-specs">
            <div>
              <span>路线长度</span>
              <strong>{route.lengthMeters} m</strong>
            </div>
            <div>
              <span>岩壁与风格</span>
              <strong>{route.styles.join(' / ')}</strong>
            </div>
          </div>
          <p className="route-description">{route.description}</p>
          <div className="detail-action-stack">
            <Button onClick={() => open({ type: 'trip', routeId: id })}>
              <CalendarPlus size={17} />
              加入攀岩行程
            </Button>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  if (
                    update((s) => ({
                      ...s,
                      favoriteRouteIds: saved
                        ? s.favoriteRouteIds.filter((item) => item !== id)
                        : [...s.favoriteRouteIds, id],
                    }))
                  )
                    notify(saved ? '已取消收藏' : '路线已收藏');
                }}
              >
                <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
                {saved ? '已收藏' : '收藏路线'}
              </Button>
              <Button variant="secondary" onClick={() => open({ type: 'session', routeId: id })}>
                <Mountain size={16} />
                记录尝试
              </Button>
            </div>
          </div>
        </section>
      </div>
      <div className="two-columns detail-bottom">
        <section className="panel">
          <h2>这条路线的装备准备</h2>
          <p className="muted">根据实际条件与受训范围调整，清单并非完整器材配置。</p>
          <div className="gear-tags">
            {route.requiredGear.map((item) => (
              <span key={item}>
                <Check size={14} />
                {item}
              </span>
            ))}
          </div>
          <Button variant="secondary" onClick={() => go('/gear')}>
            前往装备中心
            <ArrowUpRight size={16} />
          </Button>
        </section>
        <section className="panel">
          <h2>我的路线足迹</h2>
          <div className="route-personal-stats">
            <div>
              <strong>
                {attempts.some((a) => a.attempts !== null)
                  ? attempts.reduce((s, a) => s + (a.attempts ?? 0), 0)
                  : '—'}
              </strong>
              <span>已记录尝试次数</span>
            </div>
            <div>
              <strong>
                {sent
                  ? '已完攀'
                  : attempts.some((a) => a.completed === false)
                    ? '未完攀'
                    : '未记录'}
              </strong>
              <span>路线状态</span>
            </div>
            <div>
              <strong>{attempts.filter((a) => a.completed).length}</strong>
              <span>完攀记录</span>
            </div>
          </div>
          {attempts[0]?.notes && <p className="muted">最近评价：{attempts[0]?.notes}</p>}
          <Button variant="ghost" onClick={() => open({ type: 'session', routeId: id })}>
            记录一次新的尝试
            <ArrowRightIcon />
          </Button>
        </section>
      </div>
      <SafetyNote />
    </>
  );
}
const ArrowRightIcon = () => <ArrowUpRight size={16} />;
