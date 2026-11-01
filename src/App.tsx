import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RouteDetail, RoutesPage } from './pages/RoutesPage';
import { PlansPage } from './pages/PlansPage';
import { RecordsPage } from './pages/RecordsPage';
import { GearPage } from './pages/GearPage';
import { TrainingPage } from './pages/TrainingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AppDialogs } from './components/AppDialogs';
import { Button, EmptyState } from './components/ui';
function AppContent() {
  const { path, go } = useApp();
  const pathname = path.split('?')[0];
  const page =
    pathname === '/' ? (
      <HomePage />
    ) : pathname === '/routes' ? (
      <RoutesPage />
    ) : pathname.startsWith('/routes/') ? (
      <RouteDetail id={pathname.slice(8)} />
    ) : pathname === '/plans' ? (
      <PlansPage />
    ) : pathname === '/records' ? (
      <RecordsPage />
    ) : pathname === '/gear' ? (
      <GearPage />
    ) : pathname === '/training' ? (
      <TrainingPage />
    ) : pathname === '/profile' ? (
      <ProfilePage />
    ) : (
      <EmptyState
        title="这条路还未开辟"
        description="回到首页，继续下一次探索。"
        action={<Button onClick={() => go('/')}>回到首页</Button>}
      />
    );
  return (
    <>
      <Layout>
        <div className="page-enter" key={path}>
          {page}
        </div>
      </Layout>
      <AppDialogs />
    </>
  );
}
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
