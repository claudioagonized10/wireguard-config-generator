import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import "./HistoryDetailModal.css";

function HistoryDetailModal({
  history,
  activeTab,
  onSetActiveTab,
  onClose,
  onSetMessage,
}) {
  if (!history) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{history.ikuai_comment} 配置详情</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* 标签页导航 */}
          <div className="tabs-nav" style={{ marginTop: "0" }}>
            <button
              className={`tab-button ${activeTab === "wireguard" ? "active" : ""}`}
              onClick={() => onSetActiveTab("wireguard")}
            >
              📱 WireGuard
            </button>
            <button
              className={`tab-button ${activeTab === "qrcode" ? "active" : ""}`}
              onClick={() => onSetActiveTab("qrcode")}
            >
              📷 二维码
            </button>
            {history.surge_config && (
              <button
                className={`tab-button ${activeTab === "surge" ? "active" : ""}`}
                onClick={() => onSetActiveTab("surge")}
              >
                🌊 Surge
              </button>
            )}
            <button
              className={`tab-button ${activeTab === "ikuai" ? "active" : ""}`}
              onClick={() => onSetActiveTab("ikuai")}
            >
              🖥️ 爱快
            </button>
          </div>

          {/* 标签页内容 */}
          <div className="tabs-content">
            {/* WireGuard 配置 */}
            {activeTab === "wireguard" && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>WireGuard 配置</h4>
                    <button
                      onClick={async () => {
                        const filePath = await save({
                          defaultPath: `${history.interface_name}.conf`,
                          filters: [{ name: 'WireGuard 配置', extensions: ['conf'] }]
                        });
                        if (filePath) {
                          await invoke("save_config_to_path", { content: history.wg_config, filePath });
                          onSetMessage("配置已保存");
                          setTimeout(() => onSetMessage(""), 3000);
                        }
                      }}
                      className="btn-save"
                    >
                      💾 保存为文件
                    </button>
                  </div>
                  <pre className="config-content">{history.wg_config}</pre>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <p><strong>公钥:</strong> <code>{history.public_key}</code></p>
                  <p><strong>创建时间:</strong> {new Date(history.timestamp).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* 二维码 */}
            {activeTab === "qrcode" && (
              <div className="tab-panel">
                {history.qrcode ? (
                  <div className="qrcode-container">
                    <h4>扫码快速导入</h4>
                    <img src={history.qrcode} alt="WireGuard 配置二维码" className="qrcode" />
                    <p className="qrcode-hint">使用 WireGuard 客户端扫描二维码即可导入</p>
                  </div>
                ) : (
                  <p className="hint">二维码未生成</p>
                )}
              </div>
            )}

            {/* Surge 配置 */}
            {activeTab === "surge" && history.surge_config && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Surge 配置</h4>
                    <button
                      onClick={async () => {
                        const filePath = await save({
                          defaultPath: `${history.interface_name}_surge.conf`,
                          filters: [{ name: 'Surge 配置', extensions: ['conf'] }]
                        });
                        if (filePath) {
                          await invoke("save_config_to_path", { content: history.surge_config, filePath });
                          onSetMessage("Surge 配置已保存");
                          setTimeout(() => onSetMessage(""), 3000);
                        }
                      }}
                      className="btn-save"
                    >
                      💾 保存为文件
                    </button>
                  </div>
                  <pre className="config-content">{history.surge_config}</pre>
                </div>
              </div>
            )}

            {/* 爱快配置 */}
            {activeTab === "ikuai" && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>爱快路由器 Peer 配置</h4>
                    <button
                      onClick={async () => {
                        const filePath = await save({
                          defaultPath: `${history.ikuai_comment}_peer.txt`,
                          filters: [{ name: 'Peer 配置', extensions: ['txt'] }]
                        });
                        if (filePath) {
                          await invoke("save_config_to_path", { content: history.ikuai_config, filePath });
                          onSetMessage("Peer 配置已保存");
                          setTimeout(() => onSetMessage(""), 3000);
                        }
                      }}
                      className="btn-save"
                    >
                      💾 导出为...
                    </button>
                  </div>
                  <pre className="config-content">{history.ikuai_config}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default HistoryDetailModal;
