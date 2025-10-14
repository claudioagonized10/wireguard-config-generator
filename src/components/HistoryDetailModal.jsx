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

  // 复制到剪贴板
  const handleCopyToClipboard = async (content, name) => {
    try {
      await navigator.clipboard.writeText(content);
      onSetMessage(`${name}已复制到剪贴板`);
      setTimeout(() => onSetMessage(""), 3000);
    } catch (err) {
      onSetMessage("复制失败: " + err);
      setTimeout(() => onSetMessage(""), 3000);
    }
  };

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
              WireGuard
            </button>
            <button
              className={`tab-button ${activeTab === "qrcode" ? "active" : ""}`}
              onClick={() => onSetActiveTab("qrcode")}
            >
              二维码
            </button>
            {history.surge_config && (
              <button
                className={`tab-button ${activeTab === "surge" ? "active" : ""}`}
                onClick={() => onSetActiveTab("surge")}
              >
                Surge
              </button>
            )}
            <button
              className={`tab-button ${activeTab === "ikuai" ? "active" : ""}`}
              onClick={() => onSetActiveTab("ikuai")}
            >
              爱快
            </button>
            {history.mikrotik_config && (
              <button
                className={`tab-button ${activeTab === "mikrotik" ? "active" : ""}`}
                onClick={() => onSetActiveTab("mikrotik")}
              >
                MikroTik
              </button>
            )}
            {history.openwrt_config && (
              <button
                className={`tab-button ${activeTab === "openwrt" ? "active" : ""}`}
                onClick={() => onSetActiveTab("openwrt")}
              >
                OpenWrt
              </button>
            )}
          </div>

          {/* 标签页内容 */}
          <div className="tabs-content">
            {/* WireGuard 配置 */}
            {activeTab === "wireguard" && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>WireGuard 配置</h4>
                    <div className="button-group-inline">
                      <button
                        onClick={() => handleCopyToClipboard(history.wg_config, "WireGuard 配置")}
                        className="btn-save"
                      >
                        📋 复制
                      </button>
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
                        💾 另存为...
                      </button>
                    </div>
                  </div>
                  <pre className="config-content">{history.wg_config}</pre>
                </div>

                <div className="success-info" style={{ marginTop: "1rem" }}>
                  <h4>📋 配置信息</h4>
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
                    <div className="button-group-inline">
                      <button
                        onClick={() => handleCopyToClipboard(history.surge_config, "Surge 配置")}
                        className="btn-save"
                      >
                        📋 复制
                      </button>
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
                        💾 另存为...
                      </button>
                    </div>
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
                      💾 另存为...
                    </button>
                  </div>
                  <pre className="config-content">{history.ikuai_config}</pre>
                </div>
              </div>
            )}

            {/* MikroTik 配置 */}
            {activeTab === "mikrotik" && history.mikrotik_config && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>MikroTik RouterOS Peer 配置</h4>
                    <div className="button-group-inline">
                      <button
                        onClick={() => handleCopyToClipboard(history.mikrotik_config, "MikroTik 配置")}
                        className="btn-save"
                      >
                        📋 复制
                      </button>
                      <button
                        onClick={async () => {
                          const filePath = await save({
                            defaultPath: `${history.ikuai_comment}_mikrotik.rsc`,
                            filters: [{ name: 'MikroTik 脚本', extensions: ['rsc', 'txt'] }]
                          });
                          if (filePath) {
                            await invoke("save_config_to_path", { content: history.mikrotik_config, filePath });
                            onSetMessage("MikroTik 配置已保存");
                            setTimeout(() => onSetMessage(""), 3000);
                          }
                        }}
                        className="btn-save"
                      >
                        💾 另存为...
                      </button>
                    </div>
                  </div>
                  <pre className="config-content">{history.mikrotik_config}</pre>
                </div>

                <div className="info-row" style={{ marginTop: "1rem" }}>
                  <div className="success-info">
                    <h4>📋 使用说明</h4>
                    <ol>
                      <li>复制上方生成的命令</li>
                      <li>登录到 MikroTik RouterOS 设备终端（SSH 或 Winbox）</li>
                      <li>粘贴并执行命令，即可添加 WireGuard Peer</li>
                    </ol>
                  </div>

                  <div className="hint-box">
                    <h4>💡 注意事项</h4>
                    <p>• 确保 WireGuard 接口已在 RouterOS 中创建</p>
                    <p>• <code>interface</code> 参数需与实际接口名称匹配</p>
                    <p>• 执行命令前建议先备份当前配置</p>
                  </div>
                </div>
              </div>
            )}

            {/* OpenWrt 配置 */}
            {activeTab === "openwrt" && history.openwrt_config && (
              <div className="tab-panel">
                <div className="config-result">
                  <div className="config-header">
                    <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>OpenWrt UCI Peer 配置</h4>
                    <div className="button-group-inline">
                      <button
                        onClick={() => handleCopyToClipboard(history.openwrt_config, "OpenWrt 配置")}
                        className="btn-save"
                      >
                        📋 复制
                      </button>
                      <button
                        onClick={async () => {
                          const filePath = await save({
                            defaultPath: `${history.ikuai_comment}_openwrt.sh`,
                            filters: [{ name: 'Shell 脚本', extensions: ['sh', 'txt'] }]
                          });
                          if (filePath) {
                            await invoke("save_config_to_path", { content: history.openwrt_config, filePath });
                            onSetMessage("OpenWrt 配置已保存");
                            setTimeout(() => onSetMessage(""), 3000);
                          }
                        }}
                        className="btn-save"
                      >
                        💾 另存为...
                      </button>
                    </div>
                  </div>
                  <pre className="config-content">{history.openwrt_config}</pre>
                </div>

                <div className="info-row" style={{ marginTop: "1rem" }}>
                  <div className="success-info">
                    <h4>📋 使用说明</h4>
                    <ol>
                      <li>复制上方生成的 UCI 命令</li>
                      <li>登录到 OpenWrt 设备的 SSH 终端</li>
                      <li>粘贴并执行命令，即可添加 WireGuard Peer</li>
                    </ol>
                  </div>

                  <div className="hint-box">
                    <h4>💡 注意事项</h4>
                    <p>• 确保已安装软件包：<code>luci-proto-wireguard</code></p>
                    <p>• 命令会自动提交配置并重启接口</p>
                    <p>• 执行前建议备份：<code>sysupgrade -b /tmp/backup.tar.gz</code></p>
                  </div>
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
