import { App as AntApp, ConfigProvider } from 'antd';
import { LoginPage } from './pages/LoginPage.tsx';

export function App(): React.JSX.Element {
  return (
    <ConfigProvider>
      <AntApp>
        <LoginPage />
      </AntApp>
    </ConfigProvider>
  );
}
