import { useState, useEffect, useCallback } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import type { Account, AppSettings } from '../shared/types.ts';
import { LoginPage } from './pages/LoginPage.tsx';
import { TimelinePage } from './pages/TimelinePage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { SettingsContext, DEFAULT_SETTINGS } from './hooks/useSettings.ts';

type Page = 'login' | 'timeline' | 'settings';

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

  if (page === 'settings') {
    return <SettingsPage onBack={() => setPage('timeline')} />;
  }

  if (page === 'timeline' && accounts.length > 0) {
    return (
      <TimelinePage
        accounts={accounts}
        onNavigateToLogin={() => setPage('login')}
        onNavigateToSettings={() => setPage('settings')}
      />
    );
  }

  return (
    <LoginPage
      onLoginSuccess={handleLoginSuccess}
      onNavigateToTimeline={accounts.length > 0 ? () => setPage('timeline') : undefined}
    />
  );
}

function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    await window.api.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  useEffect(() => {
    window.api.loadSettings().then(setSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function App(): React.JSX.Element {
  return (
    <ConfigProvider>
      <AntApp>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AntApp>
    </ConfigProvider>
  );
}
