import { ArrowUpRight, Bookmark, Camera, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PHOTO_FOCUS_LABELS } from '../lib';
import { formatDate } from '../lib/format';
import { Button, EmptyState, Photo } from './ui';

export function PhotoRouteCollection() {
  const { state, path, go, open, update, notify } = useApp();
  const params = new URLSearchParams(path.split('?')[1]);
  const [favorites, setFavorites] = useState(params.has('favorites'));
  const [query, setQuery] = useState(params.get('q') || '');
  const favoriteCount = state.photoRoutes.filter((route) => route.favorite).length;
  const routes = [...state.photoRoutes]
    .filter(
      (route) =>
        (!favorites || route.favorite) &&
        `${route.name} ${route.location}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <section className="photo-records" aria-labelledby="photo-records-heading">
      <div className="photo-records-heading">
        <div>
          <h2 id="photo-records-heading">我的照片路线</h2>
          <p>保存岩壁上的灵感，收藏下一次想尝试的路线。</p>
        </div>
        <Button variant="secondary" onClick={() => go('/routes')}>
          <Camera size={16} />
          拍照找路线
        </Button>
      </div>
      <div className="photo-records-toolbar">
        <div className="segmented" aria-label="照片路线筛选">
          <button
            aria-pressed={!favorites}
            className={!favorites ? 'active' : ''}
            onClick={() => setFavorites(false)}
          >
            全部路线 · {state.photoRoutes.length}
          </button>
          <button
            aria-pressed={favorites}
            className={favorites ? 'active' : ''}
            onClick={() => setFavorites(true)}
          >
            只看收藏 · {favoriteCount}
          </button>
        </div>
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label="搜索照片路线"
            placeholder="搜索名称或岩馆"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              aria-label="清空照片路线搜索"
              onClick={() => setQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {routes.length ? (
        <div className="photo-draft-grid">
          {routes.map((route) => (
            <article className="photo-draft-card" key={route.id}>
              <button
                className="photo-draft-open"
                onClick={() => open({ type: 'photo-route', id: route.id })}
                aria-label={`编辑照片路线${route.name}`}
              >
                <div className="photo-draft-image">
                  <Photo src={route.image} alt={`${route.name}的岩壁照片`} />
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <polyline points={route.holds.map((hold) => `${hold.x},${hold.y}`).join(' ')} />
                  </svg>
                  {route.holds.map((hold, index) => (
                    <span
                      key={hold.id}
                      className={`photo-draft-hold ${hold.role}`}
                      style={{ left: `${hold.x}%`, top: `${hold.y}%` }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  ))}
                  <span className="photo-draft-source">
                    {route.source === 'deepseek' ? 'AI 辅助定线' : '手动定线'}
                  </span>
                </div>
                <span className="photo-draft-copy">
                  <strong>{route.name}</strong>
                  <small>
                    {route.location || '未填写岩馆'} · {PHOTO_FOCUS_LABELS[route.focus]}
                  </small>
                  <small>
                    {route.holds.length} 个岩点 · {formatDate(route.updatedAt.slice(0, 10))} 更新
                  </small>
                </span>
              </button>
              <div className="photo-draft-actions">
                <button
                  className={`text-link ${route.favorite ? 'is-favorite' : ''}`}
                  aria-label={`${route.favorite ? '取消收藏' : '收藏'}照片路线${route.name}`}
                  aria-pressed={route.favorite}
                  onClick={() => {
                    if (
                      update((previous) => ({
                        ...previous,
                        photoRoutes: previous.photoRoutes.map((item) =>
                          item.id === route.id ? { ...item, favorite: !item.favorite } : item,
                        ),
                      }))
                    )
                      notify(route.favorite ? '已取消收藏' : '照片路线已收藏');
                  }}
                >
                  <Bookmark size={16} fill={route.favorite ? 'currentColor' : 'none'} />
                  {route.favorite ? '已收藏' : '收藏路线'}
                </button>
                <button
                  className="text-link"
                  onClick={() => open({ type: 'photo-route', id: route.id })}
                >
                  查看与编辑 <ArrowUpRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            icon={favorites ? Bookmark : Camera}
            title={
              query
                ? '没有找到这条照片路线'
                : favorites
                  ? '还没有收藏的照片路线'
                  : '第一条照片路线，从这里开始'
            }
            description={
              query
                ? '试试其他名称或岩馆，或清空搜索。'
                : favorites
                  ? '在全部路线中点击收藏，把想尝试的路线留下来。'
                  : '拍下室内岩壁，确认岩点并保存后，就能在这里回看和收藏。'
            }
            action={
              query || favorites ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setFavorites(false);
                  }}
                >
                  查看全部照片路线
                </Button>
              ) : (
                <Button onClick={() => go('/routes')}>
                  <Camera size={16} />
                  去拍一面岩壁
                </Button>
              )
            }
          />
        </div>
      )}
      <p className="chart-note">
        照片路线保存在当前浏览器。攀爬后可另记一次活动，照片定线本身不计入攀岩成绩。
      </p>
    </section>
  );
}
