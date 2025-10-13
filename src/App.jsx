import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import ConfirmDialog from "./ConfirmDialog";
import "./App.css";

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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [wgConfigContent, setWgConfigContent] = useState("");
  const [qrcodeDataUrl, setQrcodeDataUrl] = useState("");
  const [workDir, setWorkDir] = useState("");

  // 累积的 peer 配置列表
  const [allPeerConfigs, setAllPeerConfigs] = useState([]);

  // 历史记录相关状态
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 初始化：加载配置
  useEffect(() => {
    const init = async () => {
      try {
        const dir = ".";
        setWorkDir(dir);

        // 加载环境变量
        const envConfig = await invoke("load_env_config", { workDir: dir });
        if (envConfig.interface_name) setInterfaceName(envConfig.interface_name);
        if (envConfig.listen_port) setListenPort(envConfig.listen_port);
        if (envConfig.dns_server) setDns(envConfig.dns_server);

        // 加载持久化配置（优先级高于环境变量）
        const persistentConfig = await invoke("load_persistent_config");
        if (persistentConfig.peer_public_key) setPeerPublicKey(persistentConfig.peer_public_key);
        if (persistentConfig.preshared_key) setPresharedKey(persistentConfig.preshared_key);
        if (persistentConfig.endpoint) setEndpoint(persistentConfig.endpoint);
        if (persistentConfig.allowed_ips) setAllowedIps(persistentConfig.allowed_ips);
        if (persistentConfig.persistent_keepalive) setKeepalive(persistentConfig.persistent_keepalive);
        if (persistentConfig.ikuai_interface) setIkuaiInterface(persistentConfig.ikuai_interface);

        // 如果持久化配置为空，使用环境变量
        if (!persistentConfig.peer_public_key && envConfig.peer_public_key) {
          setPeerPublicKey(envConfig.peer_public_key);
        }
        if (!persistentConfig.endpoint && envConfig.endpoint) {
          setEndpoint(envConfig.endpoint);
        }
        if (!persistentConfig.preshared_key && envConfig.preshared_key) {
          setPresharedKey(envConfig.preshared_key);
        }
        if (!persistentConfig.allowed_ips && envConfig.allowed_ips) {
          setAllowedIps(envConfig.allowed_ips);
        }
        if (!persistentConfig.ikuai_interface && envConfig.ikuai_interface) {
          setIkuaiInterface(envConfig.ikuai_interface);
        }
        if (!persistentConfig.persistent_keepalive && envConfig.keepalive) {
          setKeepalive(envConfig.keepalive);
        }

        // 获取下一个 Peer ID
        const nextId = await invoke("get_next_peer_id");
        setIkuaiId(nextId);
      } catch (err) {
        console.error("初始化失败:", err);
      }
    };

    init();
  }, []);

  // 保存持久化配置
  const savePersistentConfig = async () => {
    try {
      const config = {
        peer_public_key: peerPublicKey,
        preshared_key: presharedKey,
        endpoint: endpoint,
        allowed_ips: allowedIps,
        persistent_keepalive: keepalive,
        ikuai_interface: ikuaiInterface,
        next_peer_id: ikuaiId + 1, // 保存下一个可用的 ID
      };
      await invoke("save_persistent_config", { config });
    } catch (err) {
      console.error("保存配置失败:", err);
    }
  };

  // 生成密钥对
  const handleGenerateKeypair = async () => {
    try {
      setLoading(true);
      const keypair = await invoke("generate_keypair");
      setPrivateKey(keypair.private_key);
      setPublicKey(keypair.public_key);
      setMessage("密钥对已生成");
      setTimeout(() => setMessage(""), 3000);
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
      setTimeout(() => setMessage(""), 3000);
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
    if (!peerPublicKey.trim()) {
      setMessage("请输入爱快服务端公钥");
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

  const validateStep3 = () => {
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
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // 保存持久化配置
      await savePersistentConfig();
      setStep(3);
    } else if (step === 3 && validateStep3()) {
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

      // 累积 peer 配置
      setAllPeerConfigs(prev => [...prev, ikuaiConfig]);

      // 生成二维码
      try {
        const qrcode = await invoke("generate_qrcode", { content: wgConfig });
        setQrcodeDataUrl(qrcode);
      } catch (err) {
        console.error("生成二维码失败:", err);
      }

      // 保存持久化配置
      await savePersistentConfig();

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
          public_key: publicKey,
        };
        await invoke("save_to_history", { entry: historyEntry });
      } catch (err) {
        console.error("保存历史记录失败:", err);
      }

      setStep(4);
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
        setTimeout(() => setMessage(""), 3000);
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
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("保存失败: " + err);
    }
  };

  // 加载历史记录列表
  const loadHistoryList = async () => {
    try {
      const list = await invoke("get_history_list");
      setHistoryList(list);
    } catch (err) {
      console.error("加载历史记录失败:", err);
    }
  };

  // 查看历史记录详情
  const handleViewHistory = async (id) => {
    try {
      const detail = await invoke("get_history_detail", { id });

      // 为历史配置生成二维码
      try {
        const qrcode = await invoke("generate_qrcode", { content: detail.wg_config });
        detail.qrcode = qrcode; // 将二维码添加到详情对象
      } catch (err) {
        console.error("生成二维码失败:", err);
      }

      setSelectedHistory(detail);
    } catch (err) {
      setMessage("加载历史详情失败: " + err);
    }
  };

  // 删除历史记录
  const handleDeleteHistory = async (id) => {
    try {
      await invoke("delete_history", { id });
      await loadHistoryList();
      if (selectedHistory && selectedHistory.id === id) {
        setSelectedHistory(null);
      }
      setMessage("历史记录已删除");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("删除失败: " + err);
    }
  };

  // 导出所有 Peers 配置
  const handleExportAllPeers = async () => {
    try {
      if (historyList.length === 0) {
        setMessage("没有可导出的历史记录");
        setTimeout(() => setMessage(""), 3000);
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
        setTimeout(() => setMessage(""), 3000);
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
        setTimeout(() => setMessage(""), 3000);
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
      // 清空缓存配置
      await invoke("clear_cached_config");

      // 清空历史记录
      await invoke("clear_all_history");

      // 清空前端状态
      setPeerPublicKey("");
      setPresharedKey("");
      setEndpoint("");
      setAllowedIps("0.0.0.0/0, ::/0");
      setKeepalive("25");
      setIkuaiInterface("wg_0");

      // 清空历史记录状态
      setHistoryList([]);
      setSelectedHistory(null);

      // 重新获取下一个 ID（应该返回 1）
      const nextId = await invoke("get_next_peer_id");
      setIkuaiId(nextId);

      setMessage("所有数据已清空");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("清空数据失败: " + err);
    }
  };

  // 导出所有配置为 ZIP
  const handleExportAllZip = async () => {
    try {
      if (historyList.length === 0) {
        setMessage("没有可导出的历史记录");
        setTimeout(() => setMessage(""), 3000);
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
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("导出 ZIP 失败: " + err);
    }
  };

  // 重新开始
  const handleReset = () => {
    setStep(1);
    setInterfaceName("wg0");
    setPrivateKey("");
    setPublicKey("");
    setAddress("");
    setListenPort("");
    setDns("");
    setIkuaiComment("");
    setWgConfigContent("");
    setQrcodeDataUrl("");
    setMessage("");

    // 重新获取下一个 ID
    invoke("get_next_peer_id").then(setIkuaiId);
  };

  return (
    <div className="container">
      <header>
        <h1>🔐 WireGuard 配置生成器</h1>
        <p className="subtitle">为路由器生成 WireGuard 客户端配置</p>
        <button
          onClick={async () => {
            setShowHistory(!showHistory);
            if (!showHistory) {
              await loadHistoryList();
            }
          }}
          className="btn-history pull-right"
          style={{ marginTop: "0.5rem" }}
        >
          {showHistory ? "← 返回主界面" : "📜 查看历史记录"}
        </button>
      </header>

      {/* 历史记录界面 */}
      {showHistory ? (
        <div className="form-section">
          <h2>📜 历史记录</h2>

          {historyList.length === 0 ? (
            <p className="hint" style={{ textAlign: "center", padding: "2rem" }}>
              暂无历史记录
            </p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <p className="hint">共 {historyList.length} 条记录</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button onClick={handleClearCache} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                    🧹 清空所有数据
                  </button>
                  {historyList.length > 0 && (
                    <>
                      <button onClick={handleExportAllZip} className="btn-generate" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                        📦 导出 ZIP
                      </button>
                      <button onClick={handleExportAllPeers} className="btn-save" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                        📤 导出 Peers
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      background: selectedHistory?.id === item.id ? "var(--bg-light)" : "white",
                      cursor: "pointer",
                    }}
                    onClick={() => handleViewHistory(item.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>{item.ikuai_comment}</strong>
                        <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          (ID: {item.ikuai_id})
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(item.id);
                        }}
                        className="btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                      >
                        删除
                      </button>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      {item.interface_name} | {item.address} | {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {selectedHistory && (
                <div className="config-result" style={{ marginTop: "1rem" }}>
                  <h3>{selectedHistory.ikuai_comment} 配置详情</h3>

                  <div style={{ marginTop: "0.75rem" }}>
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>WireGuard 配置:</h4>
                    <pre className="config-content">{selectedHistory.wg_config}</pre>
                    <button
                      onClick={async () => {
                        const filePath = await save({
                          defaultPath: `${selectedHistory.interface_name}.conf`,
                          filters: [{ name: 'WireGuard 配置', extensions: ['conf'] }]
                        });
                        if (filePath) {
                          await invoke("save_config_to_path", { content: selectedHistory.wg_config, filePath });
                          setMessage("配置已保存");
                          setTimeout(() => setMessage(""), 3000);
                        }
                      }}
                      className="btn-save"
                      style={{ marginTop: "0.5rem" }}
                    >
                      💾 保存为文件
                    </button>

                    {selectedHistory.qrcode && (
                      <div className="qrcode-container" style={{ marginTop: "1rem" }}>
                        <h4>扫码快速导入</h4>
                        <img src={selectedHistory.qrcode} alt="WireGuard 配置二维码" className="qrcode" />
                        <p className="qrcode-hint">使用 WireGuard 客户端扫描二维码即可导入</p>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: "0.75rem" }}>
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>爱快路由器 Peer 配置:</h4>
                    <pre className="config-content">{selectedHistory.ikuai_config}</pre>
                    <button
                      onClick={async () => {
                        const filePath = await save({
                          defaultPath: `${selectedHistory.ikuai_comment}_peer.txt`,
                          filters: [{ name: 'Peer 配置', extensions: ['txt'] }]
                        });
                        if (filePath) {
                          await invoke("save_config_to_path", { content: selectedHistory.ikuai_config, filePath });
                          setMessage("Peer 配置已保存");
                          setTimeout(() => setMessage(""), 3000);
                        }
                      }}
                      className="btn-save"
                      style={{ marginTop: "0.5rem" }}
                    >
                      💾 导出为...
                    </button>
                  </div>

                  <div style={{ marginTop: "0.75rem" }}>
                    <p><strong>公钥:</strong> <code>{selectedHistory.public_key}</code></p>
                    <p><strong>创建时间:</strong> {new Date(selectedHistory.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* 进度指示器 */}
          <div className="progress-bar">
            <div className={`progress-step ${step >= 1 ? "active" : ""}`}>1. 本地配置</div>
            <div className={`progress-step ${step >= 2 ? "active" : ""}`}>2. 对端配置</div>
            <div className={`progress-step ${step >= 3 ? "active" : ""}`}>3. 路由器配置</div>
            <div className={`progress-step ${step >= 4 ? "active" : ""}`}>4. 完成</div>
          </div>

      {/* 消息提示 */}
      {message && (
        <div className={`message ${message.includes("失败") || message.includes("错误") ? "error" : "success"}`}>
          {message}
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
              <textarea
                value={privateKey}
                onChange={(e) => handlePrivateKeyChange(e.target.value)}
                placeholder="粘贴已有私钥或点击生成"
                rows={1}
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
            <button onClick={handleNext} className="btn-primary">
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* 步骤 2: 对端配置 */}
      {step === 2 && (
        <div className="form-section">
          <h2>对端配置（路由器服务端）</h2>
          <div className="hint-box">
            💡 此步骤的配置会自动保存，下次无需重复输入
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
            <button onClick={handlePrev} className="btn-secondary">
              ← 上一步
            </button>
            <button onClick={handleNext} className="btn-primary">
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* 步骤 3: 爱快配置 */}
      {step === 3 && (
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
            <button onClick={handlePrev} className="btn-secondary">
              ← 上一步
            </button>
            <button onClick={handleNext} className="btn-primary" disabled={loading}>
              {loading ? "生成中..." : "生成配置"}
            </button>
          </div>
        </div>
      )}

      {/* 步骤 4: 配置结果 */}
      {step === 4 && (
        <div className="form-section">
          <h2>✅ 配置生成成功！</h2>

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

            {qrcodeDataUrl && (
              <div className="qrcode-container">
                <h4>扫码快速导入</h4>
                <img src={qrcodeDataUrl} alt="WireGuard 配置二维码" className="qrcode" />
                <p className="qrcode-hint">使用 WireGuard 客户端扫描二维码即可导入</p>
              </div>
            )}
          </div>

          <div className="config-result">
            <div className="config-header">
              <h3>爱快路由器 Peer 配置 {allPeerConfigs.length > 1 && ` - 已累积 ${allPeerConfigs.length} 条`}</h3>
              <button onClick={handleSavePeerConfig} className="btn-save">
                💾 另存为...
              </button>
            </div>
            <pre className="config-content">{allPeerConfigs.join('\n')}</pre>
            <p className="hint">
              🖥️ 爱快路由器：在管理界面 → 网络设置 → VPN → WireGuard → Peer 管理中导入<br/>
              OpenWrt：请手动添加 Peer（参考配置中的参数）
              {allPeerConfigs.length > 1 && `，包含本次会话生成的所有 ${allPeerConfigs.length} 条配置`}
            </p>
          </div>

          <div className="success-info">
            <h4>📋 下一步操作：</h4>
            <ol>
              <li>点击 <strong>"💾 另存为..."</strong> 按钮保存配置文件</li>
              <li>
                <strong>{interfaceName}.conf</strong> - 导入到客户端设备（或扫码导入）
              </li>
              <li>
                <strong>peer.txt</strong> - 在路由器中添加此 Peer（爱快可直接导入，OpenWrt 需手动配置）
              </li>
              <li>客户端公钥: <code>{publicKey}</code></li>
            </ol>
          </div>

          <div className="button-group">
            {allPeerConfigs.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`确定要清空已累积的 ${allPeerConfigs.length} 条配置吗？`)) {
                    setAllPeerConfigs([]);
                    setMessage("已清空累积配置");
                    setTimeout(() => setMessage(""), 3000);
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
        </>
      )}

      <footer>
        <p>WireGuard Client Config Generator</p>
        <p style={{ fontSize: "0.85rem", color: "white", marginTop: "0.5rem" }}>v{__APP_VERSION__}</p>
      </footer>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="⚠️ 清空所有数据"
        message={`确定要清空所有数据吗？

这会删除：
• 保存的对端配置、爱快配置和 Peer ID 计数器
• 所有历史记录（共 ${historyList.length} 条）

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
