import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useState, useEffect } from "react";
import HistoryDetailModal from "../components/HistoryDetailModal";

function HistoryView({
  historyList,
  onDeleteHistory,
  onClearCache,
  onExportAllPeers,
  onExportAllZip,
  onShowToast,
  onBack,
}) {
  const [serverList, setServerList] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState("");

  // 弹窗相关状态
  const [showModal, setShowModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState("wireguard");

  // 加载服务端列表
  useEffect(() => {
    const loadServers = async () => {
      try {
        const list = await invoke("get_server_list");
        setServerList(list);
      } catch (err) {
        console.error("加载服务端列表失败:", err);
      }
    };
    loadServers();
  }, []);

  // 获取筛选后的历史记录
  const filteredHistoryList = selectedServerId
    ? historyList.filter(item => item.server_id === selectedServerId)
    : historyList;

  // 查看历史记录详情（打开弹窗）
  const handleViewHistory = async (id) => {
    try {
      const detail = await invoke("get_history_detail", { id });

      // 为历史配置生成二维码
      try {
        const qrcode = await invoke("generate_qrcode", { content: detail.wg_config });
        detail.qrcode = qrcode;
      } catch (err) {
        console.error("生成二维码失败:", err);
      }

      setSelectedHistory(detail);
      setModalActiveTab("wireguard");
      setShowModal(true);
    } catch (err) {
      onShowToast("加载历史详情失败: " + err, "error");
    }
  };

  return (
    <div className="form-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>📜 历史记录</h2>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: "0.9rem" }}>
          ← 返回
        </button>
      </div>

      {historyList.length === 0 ? (
        <p className="hint" style={{ textAlign: "center", padding: "2rem" }}>
          暂无历史记录
        </p>
      ) : (
        <>
          {/* 服务端筛选 */}
          {serverList.length > 0 && (
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>按服务端筛选</label>
              <div className="custom-select">
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                >
                  <option value="">全部服务端</option>
                  {serverList.map(server => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.endpoint})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <p className="hint">
              共 {historyList.length} 条记录
              {selectedServerId && ` | 筛选后: ${filteredHistoryList.length} 条`}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={onClearCache} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                🧹 清空历史记录
              </button>
              {historyList.length > 0 && (
                <>
                  <button onClick={onExportAllZip} className="btn-generate" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                    📦 导出 ZIP
                  </button>
                  <button onClick={onExportAllPeers} className="btn-save" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                    📤 导出 Peers
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            {filteredHistoryList.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  background: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => handleViewHistory(item.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-light)";
                  e.currentTarget.style.borderColor = "var(--primary-color)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{item.ikuai_comment}</strong>
                    <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      (ID: {item.ikuai_id})
                    </span>
                    {item.server_name && (
                      <span style={{ marginLeft: "0.5rem", color: "var(--primary-color)", fontSize: "0.8rem", background: "var(--bg-light)", padding: "0.1rem 0.4rem", borderRadius: "3px" }}>
                        {item.server_name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHistory(item.id);
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

          {/* 历史记录详情弹窗 */}
          {showModal && selectedHistory && (
            <HistoryDetailModal
              history={selectedHistory}
              activeTab={modalActiveTab}
              onSetActiveTab={setModalActiveTab}
              onClose={() => {
                setShowModal(false);
                setSelectedHistory(null);
              }}
              onShowToast={onShowToast}
            />
          )}
        </>
      )}
    </div>
  );
}

export default HistoryView;
