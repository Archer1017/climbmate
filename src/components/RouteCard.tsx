import { ArrowUpRight, Bookmark, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TYPE_LABELS, type ClimbingRoute } from '../lib';
import { Photo } from './ui';
export function RouteCard({ route }: { route: ClimbingRoute }) {
  const { state, update, go, notify } = useApp();
  const saved = state.favoriteRouteIds.includes(route.id);
  function toggle() {
    if (
      update((s) => ({
        ...s,
        favoriteRouteIds: saved
          ? s.favoriteRouteIds.filter((id) => id !== route.id)
          : [...s.favoriteRouteIds, route.id],
      }))
    )
      notify(saved ? '已移出收藏' : '路线已收藏，下次一起出发');
  }
  return (
    <article className="route-card">
      <div className="route-photo">
        <button
          className="photo-link"
          onClick={() => go('/routes/' + route.id)}
          aria-label={`查看${route.name}详情`}
        >
          <Photo src={route.image} alt={`${route.name}攀岩场景参考摄影`} />
        </button>
        <button
          className={`bookmark-button ${saved ? 'saved' : ''}`}
          aria-label={`${saved ? '取消收藏' : '收藏'}${route.name}`}
          onClick={toggle}
        >
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="route-card-body">
        <div className="route-meta">
          <span>
            {TYPE_LABELS[route.type]}
            <span className="meta-separator">/</span>
            {route.environment === 'outdoor' ? '户外' : '室内'}
          </span>
          <span className="grade-pill">
            {route.grade}
            <small>{route.gradeSystem}</small>
          </span>
        </div>
        <button className="route-name" onClick={() => go('/routes/' + route.id)}>
          <h3>{route.name}</h3>
          <ArrowUpRight size={17} />
        </button>
        <p className="location">
          <MapPin size={13} />
          {route.location}
        </p>
        <div className="route-card-foot">
          <span>{route.styles.join(' · ')}</span>
          <span>{route.lengthMeters} m</span>
        </div>
      </div>
    </article>
  );
}
