import { useState, useEffect, useCallback } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import type { Account } from '../shared/types.ts';
import { LoginPage } from './pages/LoginPage.tsx';
import { TimelinePage } from './pages/TimelinePage.tsx';

type Page = 'login' | 'timeline';

function AppContent(): React.JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [page, setPage] = useState<Page>('login');
  const [loaded, setLoaded] = useState(false);

  const loadAccounts = useCallback(async () => {
    const list = await window.api.listAccounts();
    setAccounts(list);
    return list;
  }, []);

  useEffect(() => {
    loadAccounts().then((list) => {
      setPage(list.length > 0 ? 'timeline' : 'login');
      setLoaded(true);
    });
  }, [loadAccounts]);

  const handleLoginSuccess = useCallback(async () => {
    const list = await loadAccounts();
    if (list.length > 0) {
      setPage('timeline');
    }
  }, [loadAccounts]);

  if (!loaded) return <></>;

  if (page === 'timeline' && accounts.length > 0) {
    return <TimelinePage accounts={accounts} onNavigateToLogin={() => setPage('login')} />;
  }

  return (
    <LoginPage
      onLoginSuccess={handleLoginSuccess}
      onNavigateToTimeline={accounts.length > 0 ? () => setPage('timeline') : undefined}
    />
  );
}

export function App(): React.JSX.Element {
  return (
    <ConfigProvider>
      <AntApp>
        <AppContent />
      </AntApp>
    </ConfigProvider>
  );
}
