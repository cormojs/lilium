import { useState } from 'react';
import { Button, Flex, InputNumber, Switch, Typography, App } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { AppSettings } from '../../shared/types.ts';
import { useSettings, DEFAULT_SETTINGS } from '../hooks/useSettings.ts';

const { Title, Text } = Typography;

interface SettingsPageProps {
  onBack: () => void;
}

type NumericSettingKey = Exclude<keyof AppSettings, 'disableCompactDisplay'>;
type BooleanSettingKey = Extract<keyof AppSettings, 'disableCompactDisplay'>;

const PageContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
`;

const SettingsBody = styled.div`
  padding: 24px;
  max-width: 480px;
`;

const SettingRow = styled.div`
  margin-bottom: 24px;
`;

const PreviewArea = styled.div`
  margin-top: 32px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
`;

const PreviewPost = styled.div<{ $avatarSize: number }>`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const PreviewAvatar = styled.div<{ $size: number }>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 4px;
  background: #d9d9d9;
  flex-shrink: 0;
`;

const PreviewBoostAvatar = styled.div<{ $size: number }>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 2px;
  background: #bfbfbf;
  flex-shrink: 0;
`;

export function SettingsPage({ onBack }: SettingsPageProps): React.JSX.Element {
  const { message } = App.useApp();
  const { settings, updateSettings } = useSettings();
  const [draft, setDraft] = useState<AppSettings>({ ...settings });

  const handleSave = async (): Promise<void> => {
    await updateSettings(draft);
    message.success('設定を保存しました');
  };

  const handleReset = (): void => {
    setDraft({ ...DEFAULT_SETTINGS });
  };

  const updateNumber = (key: NumericSettingKey, value: number | null): void => {
    if (value !== null) {
      setDraft((prev) => ({ ...prev, [key]: value }));
    }
  };

  const updateBoolean = (key: BooleanSettingKey, value: boolean): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PageContainer>
      <Header>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} />
        <Title level={4} style={{ margin: 0 }}>
          設定
        </Title>
      </Header>
      <SettingsBody>
        <SettingRow>
          <Text strong>アイコン画像の大きさ (px)</Text>
          <br />
          <InputNumber
            min={16}
            max={128}
            value={draft.avatarSize}
            onChange={(v) => updateNumber('avatarSize', v)}
            style={{ marginTop: 8 }}
          />
        </SettingRow>

        <SettingRow>
          <Text strong>ブーストアイコン画像の大きさ (px)</Text>
          <br />
          <InputNumber
            min={12}
            max={64}
            value={draft.boostAvatarSize}
            onChange={(v) => updateNumber('boostAvatarSize', v)}
            style={{ marginTop: 8 }}
          />
        </SettingRow>

        <SettingRow>
          <Text strong>TLの本文の文字の大きさ (px)</Text>
          <br />
          <InputNumber
            min={8}
            max={32}
            value={draft.postFontSize}
            onChange={(v) => updateNumber('postFontSize', v)}
            style={{ marginTop: 8 }}
          />
        </SettingRow>

        <SettingRow>
          <Text strong>その他の文字の大きさ (px)</Text>
          <br />
          <InputNumber
            min={8}
            max={32}
            value={draft.uiFontSize}
            onChange={(v) => updateNumber('uiFontSize', v)}
            style={{ marginTop: 8 }}
          />
        </SettingRow>

        <SettingRow>
          <Text strong>縮小表示の文字の大きさ (px)</Text>
          <br />
          <InputNumber
            min={8}
            max={24}
            value={draft.compactFontSize}
            onChange={(v) => updateNumber('compactFontSize', v)}
            style={{ marginTop: 8 }}
          />
        </SettingRow>

        <SettingRow>
          <Text strong>常時拡大表示（縮小表示を使用しない）</Text>
          <br />
          <Switch
            checked={draft.disableCompactDisplay}
            onChange={(checked) => updateBoolean('disableCompactDisplay', checked)}
            style={{ marginTop: 8 }}
          />
        </SettingRow>

        <Flex gap={12}>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
          <Button onClick={handleReset}>デフォルトに戻す</Button>
        </Flex>

        <PreviewArea>
          <Text strong style={{ marginBottom: 12, display: 'block' }}>
            プレビュー
          </Text>
          <PreviewPost $avatarSize={draft.avatarSize}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PreviewAvatar $size={draft.avatarSize} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                <PreviewBoostAvatar $size={draft.boostAvatarSize} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: draft.uiFontSize, fontWeight: 600 }}>@user</div>
              <div style={{ fontSize: draft.uiFontSize, color: '#8c8c8c' }}>Display Name</div>
              <div style={{ fontSize: draft.postFontSize, lineHeight: 1.6, marginTop: 4 }}>
                これはプレビュー用のサンプル投稿です。文字サイズやアイコンの大きさを確認できます。
              </div>
              <div style={{ fontSize: draft.uiFontSize, color: '#8c8c8c', marginTop: 4 }}>
                2025/01/01 12:00:00
              </div>
            </div>
          </PreviewPost>
          <div
            style={{
              marginTop: 12,
              border: '1px solid #f0f0f0',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 100px 1fr',
                alignItems: 'center',
                height: Math.max(draft.compactFontSize + 10, 20),
              }}
            >
              <div
                style={{
                  background: '#d9f7be',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PreviewAvatar $size={20} style={{ height: 14 }} />
              </div>
              <div
                style={{
                  background: '#fffbe6',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px',
                  fontSize: draft.compactFontSize,
                  lineHeight: 1.1,
                }}
              >
                @user
              </div>
              <div
                style={{
                  background: '#e6f7ff',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 6px',
                  fontSize: draft.compactFontSize,
                  lineHeight: 1.1,
                }}
              >
                縮小表示プレビュー
              </div>
            </div>
          </div>
        </PreviewArea>
      </SettingsBody>
    </PageContainer>
  );
}
