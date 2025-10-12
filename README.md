# WireGuard 配置生成器 (Tauri 版) 🔐

为爱快路由器 WireGuard 服务端生成客户端配置的现代化桌面应用

## ✨ 功能特性

### 核心功能
- ✅ **自动生成密钥对** - 使用 Curve25519 算法生成 WireGuard 密钥
- ✅ **多步骤向导** - 友好的图形界面，分步引导配置
- ✅ **持久化配置** - 对端配置和爱快配置自动保存，无需重复输入
- ✅ **智能 ID 管理** - 自动递增 Peer ID，避免冲突
- ✅ **双格式输出** - 同时生成标准配置和爱快格式配置

### 新增功能 🎉
- ✨ **配置持久化** - 爱快服务器配置自动保存到 config.json
- ✨ **文件保存对话框** - 通过系统对话框选择保存位置
- ✨ **二维码生成** - 扫码即可导入 WireGuard 配置
- ✨ **环境变量支持** - 从 wg.env 文件加载默认配置

### 界面特点
- 🎨 **现代化界面** - 响应式设计，支持深色模式
- 🌐 **跨平台支持** - Windows、macOS、Linux 全平台支持
- 📱 **移动端友好** - 二维码扫描快速导入

## 🚀 快速开始

### 开发环境

```bash
# 安装前端依赖
npm install
# 或使用 yarn
# yarn install

# 启动 Tauri 开发模式（包含热重载）
npm run tauri dev
# 或使用 yarn
# yarn tauri dev

# 构建生产版本
npm run tauri build
# 或使用 yarn
# yarn tauri build
```

### 环境变量配置（可选）

创建 `wg.env` 文件预设常用参数：

```bash
cp wg.env.example wg.env
```

编辑 `wg.env`：

```bash
# 爱快服务端配置
WG_PEER_PUBLIC_KEY="从爱快管理界面获取的服务端公钥"
WG_ENDPOINT="your-domain.com:51820"

# 网络配置
WG_ALLOWED_IPS="0.0.0.0/0, ::/0"
WG_DNS_SERVER="8.8.8.8,1.1.1.1"
WG_KEEPALIVE="25"

# 接口配置
WG_INTERFACE_NAME="wg0"
WG_IKUAI_INTERFACE="wg_0"
```

## 📖 使用说明

### 1. 本地接口配置
- **配置文件名称**: 自定义配置文件名（默认 wg0）
- **生成密钥对**: 点击按钮自动生成 WireGuard 密钥对
- **本地接口 IP**: 分配给客户端的 VPN 内网 IP（如 192.168.199.10/32）
- **监听端口**: 可选，客户端监听端口
- **DNS 服务器**: 可选，VPN 使用的 DNS

### 2. 对端配置（自动保存）
- **服务端公钥**: 从爱快路由器获取
- **Endpoint 地址**: 爱快服务器的公网 IP 或域名 + 端口
- **预共享密钥**: 可选，增强安全性
- **AllowedIPs**: 路由规则
- **PersistentKeepalive**: 保活间隔（推荐 25 秒）

💡 **此步骤的配置会保存到 config.json，下次使用时自动加载**

### 3. 爱快 Peer 配置（自动保存）
- **Peer ID**: 自动递增
- **接口名称**: 爱快中的接口名称（会自动保存）
- **备注名称**: 设备标识（如 iphone、macbook）

### 4. 完成
- 📱 **扫描二维码** - 使用 WireGuard 客户端扫码导入
- 💾 **另存为** - 通过系统对话框选择保存位置保存配置文件
- 📋 **复制配置** - 手动复制配置内容

**重要提示:** 所有配置文件(wg0.conf 和 peer.txt)都需要用户手动选择保存位置,不会自动保存到应用目录,这样可以避免生产环境中的只读文件系统错误。

## 📱 客户端使用

### 扫码导入（推荐）
1. 打开 WireGuard 客户端
2. 点击 "扫描二维码" 或 "+"
3. 扫描应用生成的二维码
4. 完成导入

### 文件导入

#### iPhone/iPad
1. 安装 [WireGuard App](https://apps.apple.com/app/wireguard/id1441195209)
2. 通过 AirDrop 传输 `.conf` 文件或扫码导入

#### Android
1. 安装 [WireGuard App](https://play.google.com/store/apps/details?id=com.wireguard.android)
2. 从文件导入或扫码

#### Windows
1. 安装 [WireGuard for Windows](https://www.wireguard.com/install/)
2. 导入 `.conf` 文件

#### macOS
1. 安装 [WireGuard for macOS](https://apps.apple.com/app/wireguard/id1451685025)
2. 导入配置文件

#### Linux
```bash
sudo cp wg0.conf /etc/wireguard/
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0  # 开机自启
```

## 🖥️ 爱快路由器配置

1. 登录爱快管理界面
2. 进入：**网络设置** → **VPN** → **WireGuard** → **Peer 管理**
3. 点击 **导入** 或 **手动添加**
4. 使用应用生成的配置信息

## 📁 文件说明

```
.
├── wg.env              # 环境变量配置（可选，开发环境使用）
├── wg0.conf            # 生成的标准配置（需用户选择保存位置）
└── peer.txt            # 爱快 Peer 配置（需用户选择保存位置）
```

**配置持久化:**
- `config.json` - 存储在系统应用数据目录中，包含对端配置、爱快配置和 Peer ID 计数器
  - macOS: `~/Library/Application Support/net.pyer.wg-ikuai-client-gen/`
  - Windows: `%APPDATA%/net.pyer.wg-ikuai-client-gen/`
  - Linux: `~/.local/share/net.pyer.wg-ikuai-client-gen/`

## 🔒 安全建议

1. **使用预共享密钥 (PSK)** - 增强后量子密码学保护
2. **限制 AllowedIPs** - 仅路由必要流量
3. **定期更换密钥** - 建议每年更换一次
4. **妥善保管配置文件** - 包含敏感密钥信息
5. **及时删除无效 Peer** - 从爱快中移除不再使用的设备

## 🛠️ 技术栈

- **前端**: React 19 + Vite 7
- **桌面框架**: Tauri 2
- **后端**: Rust
- **密码学**: curve25519-dalek
- **二维码**: qrcode-rs

## 📝 开发

### 添加新功能
1. 在 `src-tauri/src/lib.rs` 中添加 `#[tauri::command]`
2. 在 `invoke_handler` 中注册命令
3. 前端使用 `invoke("command_name", { args })`

### 调试
```bash
cd src-tauri && cargo check      # Rust 代码检查
cargo test                       # 运行测试
npm run tauri dev -- --verbose   # 查看详细日志
```

## 🐛 故障排除

### 客户端无法连接
- 检查爱快是否正确添加了客户端公钥
- 验证 Endpoint 地址是否正确
- 确认防火墙是否开放了端口
- 检查 AllowedIPs 是否包含目标网段

### 连接后无法访问网络
- 检查爱快路由器 NAT 配置
- 验证 DNS 设置
- 确认 AllowedIPs 配置正确

## 📄 许可证

MIT License

## 🔗 相关链接

- [WireGuard 官网](https://www.wireguard.com/)
- [Tauri 文档](https://tauri.app/)
- [原始 Bash 脚本版本](./wg-ikuai-client-gen.sh)
