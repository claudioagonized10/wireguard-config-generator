import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
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
  const [ikuaiConfigContent, setIkuaiConfigContent] = useState("");
  const [qrcodeDataUrl, setQrcodeDataUrl] = useState("");
  const [workDir, setWorkDir] = useState("");

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
      setIkuaiConfigContent(ikuaiConfig);

      // 生成二维码
      try {
        const qrcode = await invoke("generate_qrcode", { content: wgConfig });
        setQrcodeDataUrl(qrcode);
      } catch (err) {
        console.error("生成二维码失败:", err);
      }

      // 保存持久化配置
      await savePersistentConfig();

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

  // 保存 Peer 配置文件
  const handleSavePeerConfig = async () => {
    try {
      const filePath = await save({
        defaultPath: 'peer.txt',
        filters: [{
          name: '爱快 Peer 配置',
          extensions: ['txt']
        }]
      });

      if (filePath) {
        await invoke("save_config_to_path", { content: ikuaiConfigContent, filePath });
        setMessage("Peer 配置已保存");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("保存失败: " + err);
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
    setIkuaiConfigContent("");
    setQrcodeDataUrl("");
    setMessage("");

    // 重新获取下一个 ID
    invoke("get_next_peer_id").then(setIkuaiId);
  };

  return (
    <div className="container">
      <header>
        <h1>🔐 WireGuard 配置生成器</h1>
        <p className="subtitle">为爱快路由器生成客户端配置</p>
      </header>

      {/* 进度指示器 */}
      <div className="progress-bar">
        <div className={`progress-step ${step >= 1 ? "active" : ""}`}>1. 本地配置</div>
        <div className={`progress-step ${step >= 2 ? "active" : ""}`}>2. 对端配置</div>
        <div className={`progress-step ${step >= 3 ? "active" : ""}`}>3. 爱快配置</div>
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
                rows={2}
              />
              <button onClick={handleGenerateKeypair} disabled={loading}>
                {loading ? "生成中..." : "生成密钥对"}
              </button>
            </div>
          </div>

          {publicKey && (
            <div className="form-group">
              <label>本地公钥（提供给爱快服务端）</label>
              <input
                type="text"
                value={publicKey}
                readOnly
                className="readonly"
              />
            </div>
          )}

          <div className="form-group">
            <label>本地接口 IP 地址</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例如: 192.168.199.10/32"
            />
            <small>VPN 内网中分配给本设备的 IP 地址</small>
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
          <h2>对端配置（爱快服务器）</h2>
          <div className="hint-box">
            💡 此步骤的配置会自动保存，下次无需重复输入
          </div>

          <div className="form-group">
            <label>爱快服务端公钥 *</label>
            <input
              type="text"
              value={peerPublicKey}
              onChange={(e) => setPeerPublicKey(e.target.value)}
              placeholder="从爱快管理界面获取"
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
            <small>爱快服务器的公网 IP 或域名 + 端口</small>
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
              <button onClick={handleGeneratePSK} disabled={loading}>
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
          <h2>爱快 Peer 配置</h2>
          <div className="hint-box">
            💡 爱快接口名称会自动保存
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
              <label>爱快接口名称</label>
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
              <h3>爱快路由器配置（peer.txt）</h3>
              <button onClick={handleSavePeerConfig} className="btn-save">
                💾 另存为...
              </button>
            </div>
            <pre className="config-content">{ikuaiConfigContent}</pre>
            <p className="hint">
              🖥️ 在爱快管理界面 → 网络设置 → VPN → WireGuard → Peer 管理中导入
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
                <strong>peer.txt</strong> - 在爱快路由器中添加此 Peer
              </li>
              <li>客户端公钥: <code>{publicKey}</code></li>
            </ol>
          </div>

          <div className="button-group">
            <button onClick={handleReset} className="btn-primary">
              生成下一个配置
            </button>
          </div>
        </div>
      )}

      <footer>
        <p>WireGuard Client Config Generator for iKuai Router</p>
      </footer>
    </div>
  );
}

export default App;
