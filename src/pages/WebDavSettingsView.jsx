import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/WebDavSettingsView.css';

function WebDavSettingsView({ onBack, onConfigChange }) {
  const [config, setConfig] = useState({
    enabled: false,
    server_url: '',
    username: '',
    password: '',
    sync_interval: 300,
    auto_sync_enabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [lastSyncType, setLastSyncType] = useState(null); // 记录最后使用的同步类型

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  // 注意：自动同步定时器已在 App.jsx 中全局管理，这里不再重复设置

  const loadConfig = async () => {
    try {
      const loadedConfig = await invoke('load_webdav_config');
      setConfig(loadedConfig);
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await invoke('save_webdav_config', { config });
      alert('配置保存成功！');
      setTestResult(null); // 清除测试结果
      // 通知父组件配置已更改
      if (onConfigChange) {
        onConfigChange();
      }
    } catch (error) {
      alert(`保存失败: ${error}`);
    }
  };

  const handleTest = async () => {
    if (!config.server_url || !config.username || !config.password) {
      alert('请填写完整的服务器地址、用户名和密码');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await invoke('test_webdav_connection', { config });
      setTestResult({ success: true, message: '连接成功！' });
    } catch (error) {
      setTestResult({ success: false, message: `连接失败: ${error}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (syncType) => {
    if (!config.enabled) {
      alert('请先启用 WebDAV 同步并保存配置');
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    setLastSyncType(syncType); // 记录当前同步类型

    try {
      let result;
      switch (syncType) {
        case 'bidirectional':
          result = await invoke('sync_bidirectional_webdav');
          break;
        case 'upload':
          result = await invoke('sync_to_webdav');
          break;
        case 'download':
          result = await invoke('sync_from_webdav');
          break;
        default:
          throw new Error('未知的同步类型');
      }

      setSyncResult({
        success: true,
        type: syncType,
        data: result,
      });
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncResult({
        success: false,
        message: `同步失败: ${error}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  // 处理自动同步开关变化
  const handleAutoSyncToggle = async (enabled) => {
    const newConfig = { ...config, auto_sync_enabled: enabled };
    setConfig(newConfig);

    // 立即保存配置
    try {
      await invoke('save_webdav_config', { config: newConfig });
      // 通知父组件配置已更改
      if (onConfigChange) {
        onConfigChange();
      }
    } catch (error) {
      console.error('保存自动同步设置失败:', error);
      alert(`保存失败: ${error}`);
      // 恢复原状态
      setConfig(config);
    }
  };

  const getSyncTypeText = (type) => {
    switch (type) {
      case 'bidirectional':
        return '双向同步';
      case 'upload':
        return '上传';
      case 'download':
        return '下载';
      default:
        return '同步';
    }
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return '从未同步';
    const now = new Date();
    const diff = Math.floor((now - lastSyncTime) / 1000); // 秒
    if (diff < 60) return `${diff} 秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  };

  if (loading) {
    return (
      <div className="form-section">
        <div className="webdav-settings-view">
          <div className="webdav-loading">加载配置中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-section">
      <div className="webdav-settings-view">
        <div className="webdav-header">
          <h2>☁️ WebDAV 同步设置</h2>
          <button className="webdav-back-button" onClick={onBack}>
            ← 返回
          </button>
        </div>

        <div className="webdav-content">
          {/* 基本配置 */}
          <div className="webdav-section">
            <h3>基本设置</h3>
            <div className="webdav-form-group">
              <label className="webdav-checkbox-label">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                <span>启用 WebDAV 同步</span>
              </label>
            </div>

            <div className="webdav-form-group">
              <label>服务器地址</label>
              <input
                type="text"
                placeholder="https://your-webdav-server.com/dav"
                value={config.server_url}
                onChange={(e) => setConfig({ ...config, server_url: e.target.value })}
                disabled={!config.enabled}
              />
              <small className="webdav-help-text">
                WebDAV 服务器地址，例如：https://dav.example.com/remote.php/dav/files/username/
              </small>
            </div>

            <div className="webdav-form-group">
              <label>用户名</label>
              <input
                type="text"
                placeholder="用户名"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                disabled={!config.enabled}
              />
            </div>

            <div className="webdav-form-group">
              <label>密码</label>
              <input
                type="password"
                placeholder="密码"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                disabled={!config.enabled}
              />
              <small className="webdav-help-text webdav-warning">
                ⚠️ 密码将以明文存储在本地，请确保使用 HTTPS 连接
              </small>
            </div>

            <div className="webdav-form-group">
              <label>自动同步间隔（秒）</label>
              <input
                type="number"
                min="60"
                step="60"
                value={config.sync_interval}
                onChange={(e) => setConfig({ ...config, sync_interval: parseInt(e.target.value) || 300 })}
                disabled={!config.enabled}
              />
              <small className="webdav-help-text">
                设置自动同步的时间间隔，最少 60 秒。默认 300 秒（5 分钟）
              </small>
            </div>

            <div className="webdav-button-group">
              <button
                className="webdav-btn-primary"
                onClick={handleSave}
                disabled={!config.enabled || !config.server_url || !config.username || !config.password}
              >
                保存配置
              </button>
              <button
                className="webdav-btn-secondary"
                onClick={handleTest}
                disabled={testing || !config.server_url || !config.username || !config.password}
              >
                {testing ? '测试中...' : '测试连接'}
              </button>
            </div>

            {/* 测试结果 */}
            {testResult && (
              <div className={`webdav-test-result ${testResult.success ? 'webdav-success' : 'webdav-error'}`}>
                {testResult.success ? '✓' : '✗'} {testResult.message}
              </div>
            )}
          </div>

          {/* 同步控制 */}
          <div className="webdav-section">
            <h3>同步控制</h3>

            <div className="webdav-form-group">
              <div className="webdav-toggle-container">
                <label className="webdav-toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.auto_sync_enabled}
                    onChange={(e) => handleAutoSyncToggle(e.target.checked)}
                    disabled={!config.enabled}
                  />
                  <span className="webdav-toggle-slider"></span>
                </label>
                <span className="webdav-toggle-label">
                  启用自动同步
                  {config.auto_sync_enabled && (
                    <span className="webdav-toggle-status">已启用</span>
                  )}
                </span>
              </div>
              {config.auto_sync_enabled && (
                <small className="webdav-help-text webdav-success" style={{ marginTop: '0.5rem' }}>
                  ✓ 自动同步已启用，将每 {config.sync_interval} 秒同步一次
                </small>
              )}
            </div>

            <div className="webdav-sync-status">
              <div>
                <span className="webdav-status-label">上次同步：</span>
                <span className="webdav-status-value">{formatLastSyncTime()}</span>
              </div>
              {lastSyncType && (
                <div >
                  <span className="webdav-status-label">同步模式：</span>
                  <span className="webdav-status-value webdav-sync-mode-badge">
                    {getSyncTypeText(lastSyncType)}
                  </span>
                </div>
              )}
            </div>

            <div className="webdav-button-group">
              <button
                className={`webdav-btn-sync ${lastSyncType === 'bidirectional' && !syncing ? 'webdav-btn-active' : ''}`}
                onClick={() => handleSync('bidirectional')}
                disabled={syncing || !config.enabled}
              >
                {syncing && lastSyncType === 'bidirectional' ? '同步中...' : '双向智能同步'}
              </button>
              <button
                className={`webdav-btn-sync-secondary ${lastSyncType === 'upload' && !syncing ? 'webdav-btn-active' : ''}`}
                onClick={() => handleSync('upload')}
                disabled={syncing || !config.enabled}
              >
                {syncing && lastSyncType === 'upload' ? '上传中...' : '仅上传到云端'}
              </button>
              <button
                className={`webdav-btn-sync-secondary ${lastSyncType === 'download' && !syncing ? 'webdav-btn-active' : ''}`}
                onClick={() => handleSync('download')}
                disabled={syncing || !config.enabled}
              >
                {syncing && lastSyncType === 'download' ? '下载中...' : '仅从云端下载'}
              </button>
            </div>

            {/* 同步结果 */}
            {syncResult && (
              <div className={`webdav-sync-result ${syncResult.success ? 'webdav-success' : 'webdav-error'}`}>
                {syncResult.success ? (
                  <>
                    <h4>✓ {getSyncTypeText(syncResult.type)}完成</h4>
                    <div className="webdav-sync-details">
                      <div className="webdav-sync-item">
                        <span className="webdav-label">服务端配置：</span>
                        <span className="webdav-value">
                          ↑ {syncResult.data.servers_uploaded} 个上传，
                          ↓ {syncResult.data.servers_downloaded} 个下载
                        </span>
                      </div>
                      <div className="webdav-sync-item">
                        <span className="webdav-label">历史记录：</span>
                        <span className="webdav-value">
                          ↑ {syncResult.data.history_uploaded} 个上传，
                          ↓ {syncResult.data.history_downloaded} 个下载
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>✗ {syncResult.message}</p>
                )}
              </div>
            )}
          </div>

          {/* 说明信息 */}
          <div className="webdav-section webdav-info-section">
            <h3>使用说明</h3>
            <ul className="webdav-info-list">
              <li>
                <strong>双向智能同步：</strong>自动比较本地和远程文件的时间戳，上传较新的本地文件，下载较新的远程文件
              </li>
              <li>
                <strong>仅上传：</strong>将所有本地配置和历史记录上传到云端（不会下载）
              </li>
              <li>
                <strong>仅下载：</strong>从云端下载所有配置和历史记录到本地（不会上传）
              </li>
              <li>
                <strong>自动同步：</strong>启用后，将按设定的时间间隔自动执行双向智能同步
              </li>
              <li>
                <strong>安全提示：</strong>请使用 HTTPS 协议连接 WebDAV 服务器，密码存储在本地配置文件中
              </li>
            </ul>
          </div>

          {/* 兼容的 WebDAV 服务 */}
          <div className="webdav-section webdav-info-section">
            <h3>兼容的 WebDAV 服务</h3>
            <ul className="webdav-info-list">
              <li>Nextcloud / ownCloud</li>
              <li>坚果云</li>
              <li>群晖 NAS (Synology)</li>
              <li>威联通 NAS (QNAP)</li>
              <li>阿里云盘 (WebDAV 第三方工具)</li>
              <li>其他标准 WebDAV 服务</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebDavSettingsView;
