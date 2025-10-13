import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function ServerManagementView({
  onBack,
  onSetMessage,
}) {
  const [serverList, setServerList] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 表单字段
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    peer_public_key: "",
    preshared_key: "",
    endpoint: "",
    allowed_ips: "0.0.0.0/0, ::/0",
    persistent_keepalive: "25",
    ikuai_interface: "wg_0",
    next_peer_id: 1,
  });

  // 加载服务端列表
  const loadServerList = async () => {
    try {
      const list = await invoke("get_server_list");
      setServerList(list);
    } catch (err) {
      console.error("加载服务端列表失败:", err);
      onSetMessage("加载服务端列表失败: " + err);
    }
  };

  // 初始化加载
  useState(() => {
    loadServerList();
  }, []);

  // 查看服务端详情
  const handleViewServer = async (id) => {
    try {
      const detail = await invoke("get_server_detail", { id });
      setSelectedServer(detail);
    } catch (err) {
      onSetMessage("加载服务端详情失败: " + err);
    }
  };

  // 新建服务端
  const handleNewServer = () => {
    setFormData({
      id: Date.now().toString(),
      name: "",
      peer_public_key: "",
      preshared_key: "",
      endpoint: "",
      allowed_ips: "0.0.0.0/0, ::/0",
      persistent_keepalive: "25",
      ikuai_interface: "wg_0",
      next_peer_id: 1,
    });
    setIsEditing(false);
    setShowForm(true);
  };

  // 编辑服务端
  const handleEditServer = (server) => {
    setFormData({
      id: server.id,
      name: server.name,
      peer_public_key: server.peer_public_key,
      preshared_key: server.preshared_key,
      endpoint: server.endpoint,
      allowed_ips: server.allowed_ips,
      persistent_keepalive: server.persistent_keepalive,
      ikuai_interface: server.ikuai_interface,
      next_peer_id: server.next_peer_id,
    });
    setIsEditing(true);
    setShowForm(true);
    setSelectedServer(null);
  };

  // 保存服务端
  const handleSaveServer = async () => {
    // 验证必填项
    if (!formData.name.trim()) {
      onSetMessage("请输入服务端名称");
      return;
    }
    if (!formData.peer_public_key.trim()) {
      onSetMessage("请输入服务端公钥");
      return;
    }
    if (!formData.endpoint.trim()) {
      onSetMessage("请输入 Endpoint 地址");
      return;
    }

    try {
      const serverConfig = {
        ...formData,
        created_at: isEditing
          ? (serverList.find(s => s.id === formData.id)?.created_at || Date.now())
          : Date.now(),
      };

      await invoke("save_server_config", { config: serverConfig });
      onSetMessage(isEditing ? "服务端已更新" : "服务端已创建");

      setShowForm(false);
      setFormData({
        id: "",
        name: "",
        peer_public_key: "",
        preshared_key: "",
        endpoint: "",
        allowed_ips: "0.0.0.0/0, ::/0",
        persistent_keepalive: "25",
        ikuai_interface: "wg_0",
        next_peer_id: 1,
      });

      await loadServerList();
    } catch (err) {
      onSetMessage("保存服务端失败: " + err);
    }
  };

  // 删除服务端
  const handleDeleteServer = async (id, name) => {
    if (!confirm(`确定要删除服务端 "${name}" 吗？\n\n注意：删除后，关联的历史记录将无法正常显示服务端信息。`)) {
      return;
    }

    try {
      await invoke("delete_server", { id });
      onSetMessage("服务端已删除");

      if (selectedServer && selectedServer.id === id) {
        setSelectedServer(null);
      }

      await loadServerList();
    } catch (err) {
      onSetMessage("删除服务端失败: " + err);
    }
  };

  // 生成预共享密钥
  const handleGeneratePSK = async () => {
    try {
      const psk = await invoke("generate_preshared_key");
      setFormData({ ...formData, preshared_key: psk });
      onSetMessage("预共享密钥已生成");
    } catch (err) {
      onSetMessage("生成预共享密钥失败: " + err);
    }
  };

  return (
    <div className="form-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>🖥️ 服务端管理</h2>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: "0.9rem" }}>
          ← 返回
        </button>
      </div>

      {/* 表单界面 */}
      {showForm ? (
        <div>
          <h3>{isEditing ? "编辑服务端" : "新建服务端"}</h3>

          <div className="form-group">
            <label>服务端名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 家里路由器、办公室、云服务器"
            />
            <small>用于识别不同的 WireGuard 服务端</small>
          </div>

          <div className="form-group">
            <label>服务端公钥 *</label>
            <input
              type="text"
              value={formData.peer_public_key}
              onChange={(e) => setFormData({ ...formData, peer_public_key: e.target.value })}
              placeholder="从路由器管理界面获取"
            />
          </div>

          <div className="form-group">
            <label>Endpoint 地址 *</label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="example.com:51820 或 1.2.3.4:51820"
            />
            <small>路由器服务端的公网 IP 或域名 + 端口</small>
          </div>

          <div className="form-group">
            <label>预共享密钥（可选）</label>
            <div className="key-input-group">
              <input
                type="text"
                value={formData.preshared_key}
                onChange={(e) => setFormData({ ...formData, preshared_key: e.target.value })}
                placeholder="留空或点击生成"
              />
              <button onClick={handleGeneratePSK} className="btn-generate">
                生成 PSK
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>AllowedIPs *</label>
            <input
              type="text"
              value={formData.allowed_ips}
              onChange={(e) => setFormData({ ...formData, allowed_ips: e.target.value })}
              placeholder="0.0.0.0/0, ::/0"
            />
            <small>0.0.0.0/0 = 全局 VPN | 192.168.1.0/24 = 仅局域网流量</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>PersistentKeepalive（秒）</label>
              <input
                type="text"
                value={formData.persistent_keepalive}
                onChange={(e) => setFormData({ ...formData, persistent_keepalive: e.target.value })}
                placeholder="25"
              />
              <small>推荐 25 秒，用于保持连接活跃</small>
            </div>

            <div className="form-group">
              <label>路由器接口名称</label>
              <input
                type="text"
                value={formData.ikuai_interface}
                onChange={(e) => setFormData({ ...formData, ikuai_interface: e.target.value })}
                placeholder="wg_0"
              />
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({
                  id: "",
                  name: "",
                  peer_public_key: "",
                  preshared_key: "",
                  endpoint: "",
                  allowed_ips: "0.0.0.0/0, ::/0",
                  persistent_keepalive: "25",
                  ikuai_interface: "wg_0",
                  next_peer_id: 1,
                });
              }}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleSaveServer} className="btn-primary">
              保存
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 列表界面 */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center" }}>
            <p className="hint">共 {serverList.length} 个服务端</p>
            <button onClick={handleNewServer} className="btn-primary" style={{ fontSize: "0.9rem" }}>
              + 新建服务端
            </button>
          </div>

          {serverList.length === 0 ? (
            <p className="hint" style={{ textAlign: "center", padding: "2rem" }}>
              暂无服务端配置，点击"新建服务端"开始添加
            </p>
          ) : (
            <>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {serverList.map((server) => (
                  <div
                    key={server.id}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      background: selectedServer?.id === server.id ? "var(--bg-light)" : "white",
                      cursor: "pointer",
                    }}
                    onClick={() => handleViewServer(server.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "1rem" }}>{server.name}</strong>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          {server.endpoint} | Peer ID 计数: {server.next_peer_id}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditServer(server);
                          }}
                          className="btn-generate"
                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                        >
                          编辑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteServer(server.id, server.name);
                          }}
                          className="btn-secondary"
                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 详情显示 */}
              {selectedServer && (
                <div style={{ marginTop: "1rem", background: "var(--bg-light)", padding: "1rem", borderRadius: "8px" }}>
                  <h3>{selectedServer.name} - 详细信息</h3>
                  <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                    <p><strong>服务端公钥:</strong> <code style={{ wordBreak: "break-all" }}>{selectedServer.peer_public_key}</code></p>
                    <p><strong>Endpoint:</strong> {selectedServer.endpoint}</p>
                    {selectedServer.preshared_key && (
                      <p><strong>预共享密钥:</strong> <code style={{ wordBreak: "break-all" }}>{selectedServer.preshared_key}</code></p>
                    )}
                    <p><strong>AllowedIPs:</strong> {selectedServer.allowed_ips}</p>
                    <p><strong>PersistentKeepalive:</strong> {selectedServer.persistent_keepalive} 秒</p>
                    <p><strong>路由器接口:</strong> {selectedServer.ikuai_interface}</p>
                    <p><strong>下一个 Peer ID:</strong> {selectedServer.next_peer_id}</p>
                    <p><strong>创建时间:</strong> {new Date(selectedServer.created_at).toLocaleString()}</p>
                  </div>
                  <div className="button-group" style={{ marginTop: "1rem" }}>
                    <button onClick={() => handleEditServer(selectedServer)} className="btn-primary">
                      编辑此服务端
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ServerManagementView;
