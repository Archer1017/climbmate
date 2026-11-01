import {
  ArrowUpRight,
  Backpack,
  Bell,
  BookOpen,
  ChevronRight,
  Compass,
  Dumbbell,
  Flag,
  Home,
  Leaf,
  LockKeyhole,
  Mountain,
  Plus,
  Search,
  UserRound,
  CalendarDays,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { STAGE_LABELS } from '../lib';
const nav = [
  { path: '/', label: '首页', icon: Home },
  { path: '/routes', label: '找路线', icon: Compass },
  { path: '/plans', label: '出发计划', icon: CalendarDays },
  { path: '/records', label: '攀岩记录', icon: BookOpen },
  { path: '/training', label: '训练计划', icon: Dumbbell },
  { path: '/gear', label: '装备中心', icon: Backpack },
];
export function Logo() {
  const { go } = useApp();
  return (
    <button className="brand" onClick={() => go('/')} aria-label="ClimbMate 首页">
      <span className="brand-icon">
        <Mountain size={29} strokeWidth={2} />
      </span>
      <span>
        Climb<span>Mate</span>
        <small>每一步，都向上。</small>
      </span>
    </button>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { state, path, go, open, storageError } = useApp();
  const [search, setSearch] = useState('');
  const active = (target: string) => (target === '/' ? path === '/' : path.startsWith(target));
  const mobileActive = (target: string) =>
    active(target) || (target === '/plans' && (active('/training') || active('/gear')));
  const current =
    nav.find((item) => active(item.path))?.label ||
    (path.startsWith('/profile') ? '个人中心' : '探索');
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="sidebar-caption">你的攀岩伙伴</div>
        <nav className="desktop-nav" aria-label="主导航">
          {nav.map(({ path: target, label, icon: Icon }) => (
            <button
              key={target}
              onClick={() => go(target)}
              className={active(target) ? 'active' : ''}
              aria-current={active(target) ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
              {active(target) && <span className="nav-active-mark" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-inspiration">
            <span className="tiny-mountain">
              <Flag size={20} />
            </span>
            <h3>下一座岩壁，等你探索。</h3>
            <p>把想去的地方，变成下一次出发。</p>
            <button onClick={() => open({ type: 'trip' })}>
              规划一场攀爬 <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`profile-nav ${active('/profile') ? 'active' : ''}`}
            onClick={() => go('/profile')}
          >
            <span className="avatar">{state.user.name.slice(0, 1)}</span>
            <span>
              <strong>{state.user.name}</strong>
              <small>{STAGE_LABELS[state.user.stage]} · 自选训练阶段</small>
            </span>
            <ChevronRight size={15} />
          </button>
          <div className="local-label">
            <LockKeyhole size={12} /> 数据保存在此浏览器
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>我的攀岩空间</span>
            <ChevronRight size={13} />
            <strong>{current}</strong>
          </div>
          <form
            className="header-search"
            onSubmit={(event) => {
              event.preventDefault();
              go('/records?view=photos&q=' + encodeURIComponent(search.trim()));
            }}
          >
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索我的照片路线"
              aria-label="搜索我的照片路线"
            />
            <kbd>↵</kbd>
          </form>
          <div className="header-actions">
            <button
              className="icon-button notification-button"
              aria-label="通知与提醒"
              onClick={() => open({ type: 'notifications' })}
            >
              <Bell size={19} />
            </button>
            <span className="header-divider" />
            <button className="avatar small" aria-label="个人中心" onClick={() => go('/profile')}>
              {state.user.name.slice(0, 1)}
            </button>
          </div>
        </header>
        <main className="main-content" id="main">
          {storageError && (
            <div className="storage-alert" role="alert">
              {storageError}
            </div>
          )}
          {children}
          <footer className="app-footer">
            <span>
              <Mountain size={14} /> 每一步，都向上。
            </span>
            <button onClick={() => open({ type: 'privacy' })}>
              <Leaf size={13} /> 本地优先，安心记录
            </button>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="移动导航">
        {[
          nav[0],
          nav[1],
          { ...nav[2], label: '计划' },
          { ...nav[3], label: '记录' },
          { path: '/profile', label: '我的', icon: UserRound },
        ].map(({ path: target, label, icon: Icon }) => (
          <button
            className={mobileActive(target) ? 'active' : ''}
            aria-current={mobileActive(target) ? 'page' : undefined}
            key={target}
            onClick={() => go(target)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
export function NewSessionButton() {
  const { open } = useApp();
  return (
    <button className="btn btn-primary" onClick={() => open({ type: 'session' })}>
      <Plus size={17} />
      记录攀岩
    </button>
  );
}
