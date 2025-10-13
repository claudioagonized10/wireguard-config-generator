import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

function HistoryView({
  historyList,
  selectedHistory,
  historyActiveTab,
  message,
  onViewHistory,
  onDeleteHistory,
  onClearCache,
  onExportAllPeers,
  onExportAllZip,
  onSetMessage,
  onSetHistoryActiveTab,
}) {
  return (
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
              <button onClick={onClearCache} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                🧹 清空所有数据
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
                onClick={() => onViewHistory(item.id)}
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

          {selectedHistory && (
            <div style={{ marginTop: "1rem", background: "var(--bg-light)", padding: "1rem", borderRadius: "8px" }}>
              <h3>{selectedHistory.ikuai_comment} 配置详情</h3>

              {/* 历史记录标签页导航 */}
              <div className="tabs-nav" style={{ marginTop: "1rem" }}>
                <button
                  className={`tab-button ${historyActiveTab === "wireguard" ? "active" : ""}`}
                  onClick={() => onSetHistoryActiveTab("wireguard")}
                >
                  📱 WireGuard
                </button>
                <button
                  className={`tab-button ${historyActiveTab === "qrcode" ? "active" : ""}`}
                  onClick={() => onSetHistoryActiveTab("qrcode")}
                >
                  📷 二维码
                </button>
                {selectedHistory.surge_config && (
                  <button
                    className={`tab-button ${historyActiveTab === "surge" ? "active" : ""}`}
                    onClick={() => onSetHistoryActiveTab("surge")}
                  >
                    🌊 Surge
                  </button>
                )}
                <button
                  className={`tab-button ${historyActiveTab === "ikuai" ? "active" : ""}`}
                  onClick={() => onSetHistoryActiveTab("ikuai")}
                >
                  🖥️ 爱快
                </button>
              </div>

              {/* 历史记录标签页内容 */}
              <div className="tabs-content">
                {/* WireGuard 配置 */}
                {historyActiveTab === "wireguard" && (
                  <div className="tab-panel">
                    <div className="config-result">
                      <div className="config-header">
                        <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>WireGuard 配置</h4>
                        <button
                          onClick={async () => {
                            const filePath = await save({
                              defaultPath: `${selectedHistory.interface_name}.conf`,
                              filters: [{ name: 'WireGuard 配置', extensions: ['conf'] }]
                            });
                            if (filePath) {
                              await invoke("save_config_to_path", { content: selectedHistory.wg_config, filePath });
                              onSetMessage("配置已保存");
                              setTimeout(() => onSetMessage(""), 3000);
                            }
                          }}
                          className="btn-save"
                        >
                          💾 保存为文件
                        </button>
                      </div>
                      <pre className="config-content">{selectedHistory.wg_config}</pre>
                    </div>
                    <div style={{ marginTop: "0.75rem" }}>
                      <p><strong>公钥:</strong> <code>{selectedHistory.public_key}</code></p>
                      <p><strong>创建时间:</strong> {new Date(selectedHistory.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* 二维码 */}
                {historyActiveTab === "qrcode" && (
                  <div className="tab-panel">
                    {selectedHistory.qrcode ? (
                      <div className="qrcode-container">
                        <h4>扫码快速导入</h4>
                        <img src={selectedHistory.qrcode} alt="WireGuard 配置二维码" className="qrcode" />
                        <p className="qrcode-hint">使用 WireGuard 客户端扫描二维码即可导入</p>
                      </div>
                    ) : (
                      <p className="hint">二维码未生成</p>
                    )}
                  </div>
                )}

                {/* Surge 配置 */}
                {historyActiveTab === "surge" && selectedHistory.surge_config && (
                  <div className="tab-panel">
                    <div className="config-result">
                      <div className="config-header">
                        <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Surge 配置</h4>
                        <button
                          onClick={async () => {
                            const filePath = await save({
                              defaultPath: `${selectedHistory.interface_name}_surge.conf`,
                              filters: [{ name: 'Surge 配置', extensions: ['conf'] }]
                            });
                            if (filePath) {
                              await invoke("save_config_to_path", { content: selectedHistory.surge_config, filePath });
                              onSetMessage("Surge 配置已保存");
                              setTimeout(() => onSetMessage(""), 3000);
                            }
                          }}
                          className="btn-save"
                        >
                          💾 保存为文件
                        </button>
                      </div>
                      <pre className="config-content">{selectedHistory.surge_config}</pre>
                    </div>
                  </div>
                )}

                {/* 爱快配置 */}
                {historyActiveTab === "ikuai" && (
                  <div className="tab-panel">
                    <div className="config-result">
                      <div className="config-header">
                        <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>爱快路由器 Peer 配置</h4>
                        <button
                          onClick={async () => {
                            const filePath = await save({
                              defaultPath: `${selectedHistory.ikuai_comment}_peer.txt`,
                              filters: [{ name: 'Peer 配置', extensions: ['txt'] }]
                            });
                            if (filePath) {
                              await invoke("save_config_to_path", { content: selectedHistory.ikuai_config, filePath });
                              onSetMessage("Peer 配置已保存");
                              setTimeout(() => onSetMessage(""), 3000);
                            }
                          }}
                          className="btn-save"
                        >
                          💾 导出为...
                        </button>
                      </div>
                      <pre className="config-content">{selectedHistory.ikuai_config}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HistoryView;
