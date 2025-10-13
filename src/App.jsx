import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import ConfirmDialog from "./components/ConfirmDialog";
import HistoryView from "./pages/HistoryView";
import ServerManagementView from "./pages/ServerManagementView";
import "./styles/App.css";

function App() {
  // 基本配置
  const [interfaceName, setInterfaceName] = useState("wg0");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [address, setAddress] = useState("");
  const [listenPort, setListenPort] = useState("");
  const [dns, setDns] = useState("");

  // 对端配置（持久化）
  const [peerPublicKey, setPeerPublicKey] = useState("");
  const [presharedKey, setPresharedKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [allowedIps, setAllowedIps] = useState("0.0.0.0/0, ::/0");
  const [keepalive, setKeepalive] = useState("25");

  // 爱快配置（持久化）
  const [ikuaiId, setIkuaiId] = useState(1);
  const [ikuaiInterface, setIkuaiInterface] = useState("wg_0");
  const [ikuaiComment, setIkuaiComment] = useState("");

  // UI 状态
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [wgConfigContent, setWgConfigContent] = useState("");
  const [surgeConfigContent, setSurgeConfigContent] = useState("");
  const [qrcodeDataUrl, setQrcodeDataUrl] = useState("");
  const [workDir, setWorkDir] = useState("");

  // 累积的 peer 配置列表
  const [allPeerConfigs, setAllPeerConfigs] = useState([]);

  // 服务端相关状态
  const [selectedServerId, setSelectedServerId] = useState("");  // 当前选择的服务端ID
  const [selectedServerName, setSelectedServerName] = useState("");  // 当前选择的服务端名称
  const [serverList, setServerList] = useState([]);  // 服务端列表
  const [showServerManagement, setShowServerManagement] = useState(false);  // 是否显示服务端管理界面

  // 历史记录相关状态
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 标签页状态
  const [activeTab, setActiveTab] = useState("wireguard"); // wireguard, qrcode, surge, ikuai

  // 初始化：加载配置
  useEffect(() => {
    const init = async () => {
      try {
        // 尝试迁移旧配置
        try {
          const migratedServerId = await invoke("migrate_old_config_to_server");
          if (migratedServerId) {
            setMessage("检测到旧版配置，已自动迁移为新服务端");
            console.log("已迁移旧配置，新服务端ID:", migratedServerId);
          }
        } catch (err) {
          console.error("迁移旧配置失败:", err);
        }

        const dir = ".";
        setWorkDir(dir);

        // 加载环境变量
        const envConfig = await invoke("load_env_config", { workDir: dir });
        if (envConfig.interface_name) setInterfaceName(envConfig.interface_name);
        if (envConfig.listen_port) setListenPort(envConfig.listen_port);
        if (envConfig.dns_server) setDns(envConfig.dns_server);

        // 注：旧的持久化配置加载逻辑已移除，现在使用服务端配置
      } catch (err) {
        console.error("初始化失败:", err);
      }
    };

    init();
  }, []);

  // 自动清除消息通知
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);

      // 清理函数：组件卸载或 message 变化时清除定时器
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 生成密钥对
  const handleGenerateKeypair = async () => {
    try {
      setLoading(true);
      const keypair = await invoke("generate_keypair");
      setPrivateKey(keypair.private_key);
      setPublicKey(keypair.public_key);
      setMessage("密钥对已生成");
    } catch (err) {
      setMessage("生成密钥失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  // 生成预共享密钥
  const handleGeneratePSK = async () => {
    try {
      setLoading(true);
      const psk = await invoke("generate_preshared_key");
      setPresharedKey(psk);
      setMessage("预共享密钥已生成");
    } catch (err) {
      setMessage("生成预共享密钥失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  // 从私钥计算公钥
  const handlePrivateKeyChange = async (value) => {
    setPrivateKey(value);
    if (value.length > 40) {
      try {
        const pub = await invoke("private_key_to_public", { privateKey: value });
        setPublicKey(pub);
      } catch (err) {
        setPublicKey("");
      }
    }
  };

  // 验证步骤
  const validateStep1 = () => {
    if (!interfaceName.trim()) {
      setMessage("请输入接口名称");
      return false;
    }
    if (!privateKey.trim()) {
      setMessage("请生成或输入私钥");
      return false;
    }
    if (!address.trim()) {
      setMessage("请输入本地接口 IP 地址");
      return false;
    }
    // 验证 IP 地址格式 (例如: 192.168.1.1/24 或 10.0.0.1/32)
    const ipCidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!ipCidrRegex.test(address.trim())) {
      setMessage("IP 地址格式错误，必须为 CIDR 格式（例如: 192.168.199.10/32）");
      return false;
    }
    // 验证 IP 地址的每个部分是否在有效范围内 (0-255)
    const parts = address.trim().split('/');
    const ip = parts[0].split('.');
    const cidr = parseInt(parts[1]);

    for (let part of ip) {
      const num = parseInt(part);
      if (num < 0 || num > 255) {
        setMessage("IP 地址每个部分必须在 0-255 之间");
        return false;
      }
    }

    // 验证 CIDR 前缀长度是否在有效范围内 (0-32)
    if (cidr < 0 || cidr > 32) {
      setMessage("CIDR 前缀长度必须在 0-32 之间");
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!selectedServerId) {
      setMessage("请选择一个服务端");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!peerPublicKey.trim()) {
      setMessage("请输入服务端公钥");
      return false;
    }
    if (!endpoint.trim()) {
      setMessage("请输入 Endpoint 地址");
      return false;
    }
    if (!allowedIps.trim()) {
      setMessage("请输入允许的 IP 段");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!ikuaiComment.trim()) {
      setMessage("请输入备注名称");
      return false;
    }
    return true;
  };

  // 下一步
  const handleNext = async () => {
    setMessage("");
    if (step === 1 && validateStep1()) {
      // 加载服务端列表
      await loadServerList();
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // 加载选中的服务端配置
      try {
        const server = await invoke("get_server_detail", { id: selectedServerId });
        setPeerPublicKey(server.peer_public_key);
        setPresharedKey(server.preshared_key);
        setEndpoint(server.endpoint);
        setAllowedIps(server.allowed_ips);
        setKeepalive(server.persistent_keepalive);
        setIkuaiInterface(server.ikuai_interface);

        // 获取该服务端的下一个 Peer ID
        const nextId = await invoke("get_next_peer_id_for_server", { serverId: selectedServerId });
        setIkuaiId(nextId);
      } catch (err) {
        setMessage("加载服务端配置失败: " + err);
        return;
      }
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      // 保存修改后的配置到服务端
      try {
        const server = await invoke("get_server_detail", { id: selectedServerId });
        const updatedServer = {
          ...server,
          peer_public_key: peerPublicKey,
          preshared_key: presharedKey,
          endpoint: endpoint,
          allowed_ips: allowedIps,
          persistent_keepalive: keepalive,
          ikuai_interface: ikuaiInterface,
        };
        await invoke("save_server_config", { config: updatedServer });
        setMessage("服务端配置已保存");
      } catch (err) {
        console.error("保存服务端配置失败:", err);
        setMessage("保存服务端配置失败: " + err);
      }
      setStep(4);
    } else if (step === 4 && validateStep4()) {
      await handleGenerate();
    }
  };

  // 上一步
  const handlePrev = () => {
    setMessage("");
    setStep(step - 1);
  };

  // 生成配置
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setMessage("正在生成配置...");

      const config = {
        interface_name: interfaceName,
        private_key: privateKey,
        address: address,
        listen_port: listenPort || null,
        dns: dns || null,
        peer_public_key: peerPublicKey,
        preshared_key: presharedKey || null,
        endpoint: endpoint,
        allowed_ips: allowedIps,
        persistent_keepalive: keepalive || null,
        ikuai_id: ikuaiId,
        ikuai_interface: ikuaiInterface,
        ikuai_comment: ikuaiComment,
      };

      // 生成标准配置
      const wgConfig = await invoke("generate_wg_config", { config, workDir });
      setWgConfigContent(wgConfig);

      // 生成爱快配置
      const ikuaiConfig = await invoke("generate_ikuai_config", { config, workDir });

      // 生成 Surge 配置
      const surgeConfig = await invoke("generate_surge_config", { config, workDir });
      setSurgeConfigContent(surgeConfig);

      // 累积 peer 配置
      setAllPeerConfigs(prev => [...prev, ikuaiConfig]);

      // 生成二维码
      try {
        const qrcode = await invoke("generate_qrcode", { content: wgConfig });
        setQrcodeDataUrl(qrcode);
      } catch (err) {
        console.error("生成二维码失败:", err);
      }

      // 更新服务端的 Peer ID 计数器
      try {
        await invoke("update_server_peer_id", {
          serverId: selectedServerId,
          nextPeerId: ikuaiId + 1
        });
      } catch (err) {
        console.error("更新 Peer ID 失败:", err);
      }

      // 保存到历史记录
      try {
        const historyEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          interface_name: interfaceName,
          ikuai_comment: ikuaiComment,
          ikuai_id: ikuaiId,
          address: address,
          wg_config: wgConfig,
          ikuai_config: ikuaiConfig,
          surge_config: surgeConfig,
          public_key: publicKey,
          server_id: selectedServerId,
          server_name: selectedServerName,
        };
        await invoke("save_to_history", { entry: historyEntry });
      } catch (err) {
        console.error("保存历史记录失败:", err);
      }

      setStep(5);
      setMessage("配置生成成功！");
    } catch (err) {
      setMessage("生成配置失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  // 保存 WireGuard 配置文件
  const handleSaveWgConfig = async () => {
    try {
      const filePath = await save({
        defaultPath: `${interfaceName}.conf`,
        filters: [{
          name: 'WireGuard 配置',
          extensions: ['conf']
        }]
      });

      if (filePath) {
        await invoke("save_config_to_path", { content: wgConfigContent, filePath });
        setMessage("配置文件已保存");
      }
    } catch (err) {
      setMessage("保存失败: " + err);
    }
  };

  // 保存 Peer 配置文件（保存所有累积的配置）
  const handleSavePeerConfig = async () => {
    try {
      const filePath = await save({
        defaultPath: 'peers.txt',
        filters: [{
          name: 'Peer 配置',
          extensions: ['txt']
        }]
      });

      if (filePath) {
        // 将所有 peer 配置合并成一个字符串，每行一个配置
        const allContent = allPeerConfigs.join('\n');
        await invoke("save_config_to_path", { content: allContent, filePath });
        setMessage(`已保存 ${allPeerConfigs.length} 条 Peer 配置`);
      }
    } catch (err) {
      setMessage("保存失败: " + err);
    }
  };

  // 保存 Surge 配置文件
  const handleSaveSurgeConfig = async () => {
    try {
      const filePath = await save({
        defaultPath: `${interfaceName || 'surge'}.conf`,
        filters: [{
          name: 'Surge 配置',
          extensions: ['conf']
        }]
      });

      if (filePath) {
        await invoke("save_config_to_path", { content: surgeConfigContent, filePath });
        setMessage("Surge 配置文件已保存");
      }
    } catch (err) {
      setMessage("保存失败: " + err);
    }
  };

  // 加载服务端列表
  const loadServerList = async () => {
    try {
      const list = await invoke("get_server_list");
      setServerList(list);
    } catch (err) {
      console.error("加载服务端列表失败:", err);
    }
  };

  // 加载历史记录列表
  const loadHistoryList = async (serverId = null) => {
    try {
      let list;
      if (serverId) {
        list = await invoke("get_history_list_by_server", { serverId });
      } else {
        list = await invoke("get_history_list");
      }
      setHistoryList(list);
    } catch (err) {
      console.error("加载历史记录失败:", err);
    }
  };

  // 删除历史记录
  const handleDeleteHistory = async (id) => {
    try {
      await invoke("delete_history", { id });
      await loadHistoryList();
      setMessage("历史记录已删除");
    } catch (err) {
      setMessage("删除失败: " + err);
    }
  };

  // 导出所有 Peers 配置
  const handleExportAllPeers = async () => {
    try {
      if (historyList.length === 0) {
        setMessage("没有可导出的历史记录");
        return;
      }

      // 获取所有历史记录的详细信息
      const allPeers = [];
      for (const item of historyList) {
        try {
          const detail = await invoke("get_history_detail", { id: item.id });
          allPeers.push(detail.ikuai_config);
        } catch (err) {
          console.error(`获取历史记录 ${item.id} 失败:`, err);
        }
      }

      if (allPeers.length === 0) {
        setMessage("没有可导出的配置");
        return;
      }

      // 合并所有配置，每行一个
      const allContent = allPeers.join('\n');

      // 打开保存对话框
      const filePath = await save({
        defaultPath: 'all_peers.txt',
        filters: [{
          name: 'Peer 配置',
          extensions: ['txt']
        }]
      });

      if (filePath) {
        await invoke("save_config_to_path", { content: allContent, filePath });
        setMessage(`已导出 ${allPeers.length} 条 Peer 配置`);
      }
    } catch (err) {
      setMessage("导出失败: " + err);
    }
  };

  // 显示清空确认对话框
  const handleClearCache = () => {
    setShowConfirmDialog(true);
  };

  // 执行清空操作
  const confirmClearCache = async () => {
    try {
      // 只清空历史记录，不清空服务端配置
      await invoke("clear_all_history");

      // 清空历史记录状态
      setHistoryList([]);

      setMessage("历史记录已清空");
    } catch (err) {
      setMessage("清空历史记录失败: " + err);
    }
  };

  // 导出所有配置为 ZIP
  const handleExportAllZip = async () => {
    try {
      if (historyList.length === 0) {
        setMessage("没有可导出的历史记录");
        return;
      }

      // 打开保存对话框
      const filePath = await save({
        defaultPath: 'wireguard-configs.zip',
        filters: [{
          name: 'ZIP 压缩包',
          extensions: ['zip']
        }]
      });

      if (filePath) {
        await invoke("export_all_configs_zip", { zipPath: filePath });
        setMessage(`已导出 ${historyList.length} 条配置到 ZIP 文件`);
      }
    } catch (err) {
      setMessage("导出 ZIP 失败: " + err);
    }
  };

  // 重新开始
  const handleReset = async () => {
    // 重置步骤到第一步
    setStep(1);

    // 清理本地配置
    setInterfaceName("wg0");
    setPrivateKey("");
    setPublicKey("");
    setAddress("");
    setListenPort("");
    setDns("");

    // 清理爱快配置
    setIkuaiComment("");

    // 清理生成的配置内容
    setWgConfigContent("");
    setSurgeConfigContent("");
    setQrcodeDataUrl("");

    // 清理消息
    setMessage("");

    // 重置标签页
    setActiveTab("wireguard");

    // 如果有选中的服务端，重新获取该服务端的下一个 Peer ID
    if (selectedServerId) {
      try {
        const nextId = await invoke("get_next_peer_id_for_server", { serverId: selectedServerId });
        setIkuaiId(nextId);
      } catch (err) {
        console.error("获取下一个 Peer ID 失败:", err);
        setIkuaiId(1);
      }
    }
  };

  return (
    <div className="container">
     <header>
        <div className="header-title-wrapper">
          <h1>🔐 WireGuard 配置生成器</h1>
          <span className="version">v{__APP_VERSION__}</span>
        </div>
      </header>
      {/* 消息提示 - 悬浮通知 */}
      {message && (
        <div className={`toast ${message.includes("失败") || message.includes("错误") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="main-content-wrapper">
      {/* 服务端管理界面 */}
      {showServerManagement ? (
        <ServerManagementView
          onBack={() => {
            setShowServerManagement(false);
            loadServerList();  // 刷新服务端列表
          }}
          onSetMessage={setMessage}
        />
      ) : showHistory ? (
        <HistoryView
          historyList={historyList}
          onDeleteHistory={handleDeleteHistory}
          onClearCache={handleClearCache}
          onExportAllPeers={handleExportAllPeers}
          onExportAllZip={handleExportAllZip}
          onSetMessage={setMessage}
          onBack={() => setShowHistory(false)}
        />
      ) : (
        <>
          {/* 主内容区域 - 左右布局 */}
          <div className="main-layout">
            {/* 左侧进度指示器 */}
            <div className="progress-sidebar">
              <div className={`progress-step ${step >= 0 ? "active" : ""}`}>
                <span className="step-number">🏠</span>
                <span className="step-label">欢迎</span>
              </div>
              <div className={`progress-step ${step >= 1 ? "active" : ""}`}>
                <span className="step-number">1</span>
                <span className="step-label">本地配置</span>
              </div>
              <div className={`progress-step ${step >= 2 ? "active" : ""}`}>
                <span className="step-number">2</span>
                <span className="step-label">选择服务端</span>
              </div>
              <div className={`progress-step ${step >= 3 ? "active" : ""}`}>
                <span className="step-number">3</span>
                <span className="step-label">对端配置</span>
              </div>
              <div className={`progress-step ${step >= 4 ? "active" : ""}`}>
                <span className="step-number">4</span>
                <span className="step-label">路由器配置</span>
              </div>
              <div className={`progress-step ${step >= 5 ? "active" : ""}`}>
                <span className="step-number">5</span>
                <span className="step-label">完成</span>
              </div>

              {/* 导航按钮 */}
              <div className="sidebar-nav-buttons">
                <button
                  onClick={async () => {
                    await loadHistoryList();
                    setShowHistory(true);
                  }}
                  className="btn-sidebar-nav"
                  title="查看历史记录"
                >
                  📜 历史记录
                </button>
                <button
                  onClick={() => setShowServerManagement(true)}
                  className="btn-sidebar-nav"
                  title="管理服务端配置"
                >
                  🖥️ 服务端管理
                </button>
              </div>
            </div>

            {/* 右侧主要内容 */}
            <div className="content-main">

      {/* 步骤 0: 欢迎页 */}
      {step === 0 && (
        <div className="form-section welcome-section">
          <div className="welcome-content">
            <div className="welcome-header">
              <div className="welcome-icon">🎉</div>
              <h2 className="welcome-title">欢迎使用 WireGuard 配置生成器</h2>
            </div>
            <p className="welcome-subtitle">快速为路由器生成 WireGuard 客户端配置</p>

            <div className="welcome-features">
              <div className="feature-card">
                <div className="feature-icon">🔑</div>
                <h3>密钥生成</h3>
                <p>一键生成 WireGuard 密钥对和预共享密钥</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🖥️</div>
                <h3>多平台支持</h3>
                <p>支持标准 WireGuard、Surge、爱快路由器</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>二维码导入</h3>
                <p>生成配置二维码，移动设备快速导入</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💾</div>
                <h3>历史记录</h3>
                <p>自动保存配置历史，随时查看和导出</p>
              </div>
            </div>

            <div className="welcome-actions">
              <button
                onClick={() => setStep(1)}
                className="btn-primary btn-large"
              >
                开始配置 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 1: 本地接口配置 */}
      {step === 1 && (
        <div className="form-section">
          <h2>本地接口配置</h2>

          <div className="form-group">
            <label>配置文件名称</label>
            <input
              type="text"
              value={interfaceName}
              onChange={(e) => setInterfaceName(e.target.value)}
              placeholder="wg0"
            />
          </div>

          <div className="form-group">
            <label>本地私钥</label>
            <div className="key-input-group">
              <input
                type="text"
                value={privateKey}
                onChange={(e) => handlePrivateKeyChange(e.target.value)}
                placeholder="粘贴已有私钥或点击生成"
              />
              <button onClick={handleGenerateKeypair} disabled={loading} className="btn-generate">
                {loading ? "生成中..." : "生成密钥对"}
              </button>
            </div>
          </div>

          {publicKey && (
            <div className="form-group">
              <label>本地公钥（提供给路由器服务端）</label>
              <input
                type="text"
                value={publicKey}
                readOnly
                className="readonly"
              />
            </div>
          )}

          <div className="form-group">
            <label>本地接口 IP 地址 *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例如: 192.168.199.10/32"
            />
            <small>VPN 内网中分配给本设备的 IP 地址，必须使用 CIDR 格式（IP/前缀长度）</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>监听端口（可选）</label>
              <input
                type="text"
                value={listenPort}
                onChange={(e) => setListenPort(e.target.value)}
                placeholder="51820"
              />
            </div>

            <div className="form-group">
              <label>DNS 服务器（可选）</label>
              <input
                type="text"
                value={dns}
                onChange={(e) => setDns(e.target.value)}
                placeholder="8.8.8.8,1.1.1.1"
              />
            </div>
          </div>

          <div className="button-group">
            <button onClick={() => setStep(0)} className="btn-secondary">
              ← 返回开始页
            </button>
            <button onClick={handleNext} className="btn-primary">
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* 步骤 2: 选择服务端 */}
      {step === 2 && (
        <div className="form-section">
          <h2>选择 WireGuard 服务端</h2>
          <div className="hint-box">
            💡 请选择要连接的 WireGuard 服务端，或点击"服务端管理"新建一个
          </div>

          {serverList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p className="hint">暂无服务端配置</p>
              <p className="hint">请先在"服务端管理"中添加服务端</p>
              <button
                onClick={() => setShowServerManagement(true)}
                className="btn-primary"
                style={{ marginTop: "1rem" }}
              >
                打开服务端管理
              </button>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>选择服务端 *</label>
                <select
                  value={selectedServerId}
                  onChange={(e) => {
                    setSelectedServerId(e.target.value);
                    const server = serverList.find(s => s.id === e.target.value);
                    if (server) {
                      setSelectedServerName(server.name);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    fontSize: "0.95rem"
                  }}
                >
                  <option value="">-- 请选择服务端 --</option>
                  {serverList.map(server => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.endpoint})
                    </option>
                  ))}
                </select>
              </div>

              {selectedServerId && (
                <div style={{ background: "var(--bg-light)", padding: "1rem", borderRadius: "6px", marginTop: "1rem" }}>
                  <h4>服务端信息预览</h4>
                  {(() => {
                    const server = serverList.find(s => s.id === selectedServerId);
                    return server ? (
                      <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        <p><strong>名称:</strong> {server.name}</p>
                        <p><strong>Endpoint:</strong> {server.endpoint}</p>
                        <p><strong>下一个 Peer ID:</strong> {server.next_peer_id}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f8f9fa", borderRadius: "6px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  需要添加或管理服务端？
                  <button
                    onClick={() => setShowServerManagement(true)}
                    className="btn-generate"
                    style={{ marginLeft: "0.5rem", fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
                  >
                    服务端管理
                  </button>
                </p>
              </div>
            </>
          )}

          <div className="button-group" style={{ marginTop: "1.5rem" }}>
            <button onClick={() => setStep(0)} className="btn-secondary">
              ← 返回开始页
            </button>
            <button onClick={handlePrev} className="btn-secondary">
              上一步
            </button>
            <button onClick={handleNext} className="btn-primary" disabled={!selectedServerId}>
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* 步骤 3: 对端配置 */}
      {step === 3 && (
        <div className="form-section">
          <h2>对端配置（{selectedServerName}）</h2>
          <div className="hint-box">
            💡 这些配置来自所选服务端，可以根据需要修改。点击"下一步"后，修改会自动保存到服务端配置中。
          </div>

          <div className="form-group">
            <label>路由器服务端公钥 *</label>
            <input
              type="text"
              value={peerPublicKey}
              onChange={(e) => setPeerPublicKey(e.target.value)}
              placeholder="从路由器管理界面获取"
            />
          </div>

          <div className="form-group">
            <label>Endpoint 地址 *</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="example.com:51820 或 1.2.3.4:51820"
            />
            <small>路由器服务端的公网 IP 或域名 + 端口</small>
          </div>

          <div className="form-group">
            <label>预共享密钥（可选，增强安全性）</label>
            <div className="key-input-group">
              <input
                type="text"
                value={presharedKey}
                onChange={(e) => setPresharedKey(e.target.value)}
                placeholder="留空或点击生成"
              />
              <button onClick={handleGeneratePSK} disabled={loading} className="btn-generate">
                生成 PSK
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>AllowedIPs（允许的 IP 段）*</label>
            <input
              type="text"
              value={allowedIps}
              onChange={(e) => setAllowedIps(e.target.value)}
              placeholder="0.0.0.0/0, ::/0"
            />
            <small>
              0.0.0.0/0 = 全局 VPN | 192.168.1.0/24 = 仅局域网流量
            </small>
          </div>

          <div className="form-group">
            <label>PersistentKeepalive（秒）</label>
            <input
              type="text"
              value={keepalive}
              onChange={(e) => setKeepalive(e.target.value)}
              placeholder="25"
            />
            <small>推荐 25 秒，用于保持连接活跃</small>
          </div>

          <div className="button-group">
            <button onClick={() => setStep(0)} className="btn-secondary">
              ← 返回开始页
            </button>
            <button onClick={handlePrev} className="btn-secondary">
              上一步
            </button>
            <button onClick={handleNext} className="btn-primary">
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* 步骤 4: 爱快配置 */}
      {step === 4 && (
        <div className="form-section">
          <h2>路由器 Peer 配置</h2>
          <div className="hint-box">
            💡 接口名称会自动保存（爱快可用此配置导入 Peer，OpenWrt 仅供参考）
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Peer ID</label>
              <input
                type="number"
                value={ikuaiId}
                onChange={(e) => setIkuaiId(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label>路由器接口名称</label>
              <input
                type="text"
                value={ikuaiInterface}
                onChange={(e) => setIkuaiInterface(e.target.value)}
                placeholder="wg_0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>备注名称 *</label>
            <input
              type="text"
              value={ikuaiComment}
              onChange={(e) => setIkuaiComment(e.target.value)}
              placeholder="例如: iphone, macbook, laptop"
            />
            <small>用于识别设备的备注信息</small>
          </div>

          <div className="button-group">
            <button onClick={() => setStep(0)} className="btn-secondary">
              ← 返回开始页
            </button>
            <button onClick={handlePrev} className="btn-secondary">
              上一步
            </button>
            <button onClick={handleNext} className="btn-primary" disabled={loading}>
              {loading ? "生成中..." : "生成配置"}
            </button>
          </div>
        </div>
      )}

      {/* 步骤 5: 配置结果 */}
      {step === 5 && (
        <div className="form-section">
          <h2>✅ 配置生成成功！</h2>

          {/* 标签页导航 */}
          <div className="tabs-nav">
            <button
              className={`tab-button ${activeTab === "wireguard" ? "active" : ""}`}
              onClick={() => setActiveTab("wireguard")}
            >
              📱 WireGuard
            </button>
            <button
              className={`tab-button ${activeTab === "qrcode" ? "active" : ""}`}
              onClick={() => setActiveTab("qrcode")}
            >
              📷 二维码
            </button>
            <button
              className={`tab-button ${activeTab === "surge" ? "active" : ""}`}
              onClick={() => setActiveTab("surge")}
            >
              🌊 Surge
            </button>
            <button
              className={`tab-button ${activeTab === "ikuai" ? "active" : ""}`}
              onClick={() => setActiveTab("ikuai")}
            >
              🖥️ 爱快
            </button>
          </div>

          {/* 标签页内容 */}
          <div className="tabs-content">
            {/* 标准 WireGuard 配置 */}
            {activeTab === "wireguard" && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h3>标准 WireGuard 配置（{interfaceName}.conf）</h3>
                    <button onClick={handleSaveWgConfig} className="btn-save">
                      💾 另存为...
                    </button>
                  </div>
                  <pre className="config-content">{wgConfigContent}</pre>
                  <p className="hint">
                    📱 用于手机、电脑等客户端，可直接导入 WireGuard 应用
                  </p>
                </div>

                <div className="success-info">
                  <h4>📋 使用说明：</h4>
                  <ol>
                    <li>点击 <strong>"💾 另存为..."</strong> 按钮保存为 <strong>{interfaceName}.conf</strong></li>
                    <li>将配置文件导入到客户端设备，或使用二维码扫描导入</li>
                    <li>客户端公钥: <code>{publicKey}</code></li>
                  </ol>
                </div>
              </div>
            )}

            {/* 二维码 */}
            {activeTab === "qrcode" && (
              <div className="tab-panel">
                {qrcodeDataUrl ? (
                  <div className="qrcode-container">
                    <h4>扫码快速导入</h4>
                    <img src={qrcodeDataUrl} alt="WireGuard 配置二维码" className="qrcode" />
                    <p className="qrcode-hint">使用 WireGuard 客户端扫描二维码即可快速导入配置</p>
                    <div className="hint-box" style={{ marginTop: "1rem" }}>
                      💡 支持 iOS、Android 等移动设备的 WireGuard 官方客户端
                    </div>
                  </div>
                ) : (
                  <p className="hint">二维码生成失败，请使用配置文件导入</p>
                )}
              </div>
            )}

            {/* Surge 配置 */}
            {activeTab === "surge" && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h3>Surge WireGuard 配置</h3>
                    <button onClick={handleSaveSurgeConfig} className="btn-save">
                      💾 另存为...
                    </button>
                  </div>
                  <pre className="config-content">{surgeConfigContent}</pre>
                </div>

                <div className="success-info">
                  <h4>📋 使用说明：</h4>
                  <ol>
                    <li>点击 <strong>"💾 另存为..."</strong> 按钮保存配置文件</li>
                    <li>打开 Surge 应用，进入配置编辑模式</li>
                    <li>将保存的配置内容复制粘贴到 Surge 配置文件中</li>
                    <li>在 <code>[Proxy Group]</code> 中引用此代理: <code>wireguard-{interfaceName.replace(/\s+/g, '')}</code></li>
                  </ol>
                </div>

                <div className="hint-box">
                  💡 <strong>Surge 支持平台：</strong>iOS、macOS
                  <br />
                  📖 <strong>参考文档：</strong><a href="https://manual.nssurge.com/policy/wireguard.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-color)", marginLeft: "0.5rem" }}>Surge WireGuard 官方文档</a>
                </div>
              </div>
            )}

            {/* 爱快配置 */}
            {activeTab === "ikuai" && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h3>爱快路由器 Peer 配置 {allPeerConfigs.length > 1 && ` - 已累积 ${allPeerConfigs.length} 条`}</h3>
                    <button onClick={handleSavePeerConfig} className="btn-save">
                      💾 另存为...
                    </button>
                  </div>
                  <pre className="config-content">{allPeerConfigs.join('\n')}</pre>
                  <p className="hint">
                    {allPeerConfigs.length > 1 && `包含本次会话生成的所有 ${allPeerConfigs.length} 条配置`}
                  </p>
                </div>

                <div className="success-info">
                  <h4>📋 使用说明：</h4>
                  <ol>
                    <li>点击 <strong>"💾 另存为..."</strong> 按钮保存为 <strong>peer.txt</strong></li>
                    <li><strong>爱快路由器</strong>：在管理界面 → 网络设置 → VPN → WireGuard → Peer 管理中导入</li>
                    <li><strong>OpenWrt</strong>：请参考配置中的参数手动添加 Peer</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="button-group">
            <button onClick={() => setStep(0)} className="btn-secondary">
              ← 返回开始页
            </button>
            {allPeerConfigs.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`确定要清空已累积的 ${allPeerConfigs.length} 条配置吗？`)) {
                    setAllPeerConfigs([]);
                    setMessage("已清空累积配置");
                  }
                }}
                className="btn-secondary"
              >
                清空累积配置
              </button>
            )}
            <button onClick={handleReset} className="btn-primary">
              生成下一个配置
            </button>
          </div>
        </div>
      )}
            </div>
          </div>
        </>
      )}
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="⚠️ 清空历史记录"
        message={`确定要清空所有历史记录吗？

这会删除：
• 所有历史记录（共 ${historyList.length} 条）

注意：服务端配置不会被删除
此操作不可恢复！`}
        onConfirm={() => {
          setShowConfirmDialog(false);
          confirmClearCache();
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}

export default App;
