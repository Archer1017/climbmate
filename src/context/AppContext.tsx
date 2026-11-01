import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  computeSessionStats,
  createLocalRepository,
  type AppState,
  type SessionStats,
} from '../lib';

export type ModalState = {
  type:
    | 'trip'
    | 'session'
    | 'gear'
    | 'training'
    | 'profile'
    | 'notifications'
    | 'privacy'
    | 'photo-route';
  id?: string;
  routeId?: string;
} | null;
interface AppContextValue {
  state: AppState;
  stats: SessionStats;
  path: string;
  modal: ModalState;
  update: (change: (state: AppState) => AppState) => boolean;
  go: (path: string) => void;
  open: (modal: ModalState) => void;
  close: () => void;
  notify: (message: string, error?: boolean) => void;
  storageError: string | null;
}
const AppContext = createContext<AppContextValue | null>(null);
const repository = createLocalRepository();
const initial = repository.load();
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial.state);
  const stateRef = useRef(state);
  const [path, setPath] = useState(() => location.hash.slice(1) || '/');
  const [modal, open] = useState<ModalState>(null);
  const [storageError, setStorageError] = useState(initial.error);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const handler = () => {
      setPath(location.hash.slice(1) || '/');
      open(null);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const notify = (message: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), 3600);
  };
  const update = (change: (previous: AppState) => AppState) => {
    const next = change(stateRef.current);
    // Never overwrite unreadable data with a new, empty profile.
    if (initial.error?.includes('原始数据')) {
      notify('已保护原始数据，请先从浏览器备份或修复本地数据。', true);
      return false;
    }
    const error = repository.save(next);
    if (error) {
      setStorageError(error);
      notify(error, true);
      return false;
    }
    stateRef.current = next;
    setState(next);
    setStorageError(null);
    return true;
  };
  const stats = useMemo(() => computeSessionStats(state.sessions), [state.sessions]);
  return (
    <AppContext.Provider
      value={{
        state,
        stats,
        path,
        modal,
        update,
        go: (next) => {
          location.hash = next;
        },
        open,
        close: () => open(null),
        notify,
        storageError,
      }}
    >
      {children}
      <div role="status" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`toast ${toast.error ? 'toast-error' : ''}`}>
            <span className="toast-check" aria-hidden="true">
              {toast.error ? '!' : '✓'}
            </span>
            {toast.message}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is required');
  return value;
}
