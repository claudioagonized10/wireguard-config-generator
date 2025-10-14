# 🔐 WireGuard 配置生成器

一个基于 Tauri 2 + React 19 构建的桌面应用程序，用于快速生成 WireGuard 客户端配置。支持多种客户端和路由器平台，包括标准 WireGuard、Surge、爱快、MikroTik、OpenWrt 等。

![配置生成界面](./screens/iShot_2025-10-14_00.13.26.png)



## ✨ 特性

- 📦 **跨平台桌面应用** - 基于 Tauri 2，支持 macOS、Windows、Linux
- 🎉 **欢迎引导页面** - 首次启动显示功能介绍和快速开始指南
- 🗄️ **多服务端管理** - 支持管理多个 WireGuard 服务端配置，一键切换
- 🔑 **密钥管理** - 一键生成 WireGuard 密钥对和预共享密钥（PSK）
- 📄 **多平台配置生成** - 一键生成 5 种平台配置格式：
  - 标准 WireGuard 客户端配置
  - Surge VPN 客户端配置
  - 爱快路由器 Peer 配置
  - MikroTik RouterOS 脚本配置
  - OpenWrt UCI 脚本配置
- 🌐 **全面的路由器支持** - 支持爱快、MikroTik、OpenWrt 等主流路由器系统
- 🚀 **多客户端支持** - 同时支持桌面端、移动端、Surge 等多种 WireGuard 客户端
- 📱 **二维码导入** - 自动生成配置二维码，移动设备快速扫码导入
- 💾 **配置持久化** - 自动保存服务端配置，下次使用无需重复输入
- 📜 **历史记录** - 保存所有生成的配置，支持按服务端筛选，标签页切换查看不同平台配置
- 📦 **批量导出** - 支持导出单个配置或将所有配置打包为 ZIP
- 🎨 **友好界面** - 分步骤向导式操作，左右布局清晰直观，响应式设计支持移动端
- 🍎 **macOS 原生体验** - 透明标题栏，原生窗口样式

## 🛠️ 技术栈

- **前端**: React 19.1.0 + Vite 7.0.4
- **桌面框架**: Tauri 2
- **后端**: Rust (Tauri 后端)
- **包管理器**: Yarn

## 📦 安装

### 下载安装包

从 [Releases](https://github.com/mrtian2016/wireguard-config-generator/releases) 页面下载对应平台的安装包。

#### ⚠️ macOS 用户注意事项

首次打开应用时,macOS 系统可能会提示 **"WireGuard Config Generator.app"已损坏,无法打开。你应该将它移到废纸篓。**

这是因为应用未经过 Apple 验证。请按以下步骤解决:

1. 打开"终端"应用
2. 执行以下命令(根据应用的实际安装位置调整路径):

```bash
# 如果安装在应用程序文件夹
sudo xattr -r -d com.apple.quarantine /Applications/WireGuard\ Config\ Generator.app

# 或者如果在其他位置,替换为实际路径
sudo xattr -r -d com.apple.quarantine /path/to/WireGuard\ Config\ Generator.app
```

3. 输入系统密码后,应用即可正常打开

> 💡 **这是什么操作?**
> `xattr` 命令用于移除 macOS 的隔离属性(quarantine)标记。这个标记会阻止从互联网下载的未签名应用运行。此操作仅移除限制,不会修改应用本身。

### 从源码构建

1. **克隆仓库**
```bash
git clone https://github.com/mrtian2016/wireguard-config-generator.git
cd wireguard-config-generator
```

2. **安装依赖**
```bash
yarn install
```

3. **开发模式运行**
```bash
yarn tauri dev
```

4. **构建应用**
```bash
yarn tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`

## 🚀 使用指南

### 步骤 1: 本地接口配置

1. 输入配置文件名称（默认 `wg0`）
2. 生成或输入本地私钥
3. 输入本地接口 IP 地址（CIDR 格式，例如 `192.168.199.10/32`）
4. 可选：设置监听端口和 DNS 服务器

### 步骤 2: 对端配置（路由器服务端）

1. 输入路由器服务端公钥（从路由器管理界面获取）
2. 输入 Endpoint 地址（服务器公网 IP 或域名 + 端口）
3. 可选：生成预共享密钥（PSK）以增强安全性
4. 设置 AllowedIPs（`0.0.0.0/0` 为全局 VPN）
5. 设置 PersistentKeepalive（推荐 25 秒）

> 💡 此步骤的配置会自动保存，下次无需重复输入

### 步骤 3: 路由器 Peer 配置

1. Peer ID 会自动递增
2. 输入路由器接口名称（默认 `wg_0`）
3. 输入备注名称（例如：iPhone、MacBook）

### 步骤 4: 生成完成

应用会同时生成 5 种配置格式，通过标签页切换查看：

- **WireGuard 配置** - 标准 WireGuard 客户端配置文件
  - 可保存为 `.conf` 文件
  - 支持扫码导入到移动设备（iOS、Android）

- **Surge 配置** - Surge VPN 客户端专用配置
  - 可保存为 `.conf` 文件
  - 支持直接导入到 Surge iOS/macOS 客户端

- **爱快 Peer 配置** - 爱快路由器专用格式
  - 可保存为 `.txt` 文件
  - 可直接在爱快路由器 Peer 管理界面批量导入

- **MikroTik 配置** - MikroTik RouterOS 脚本
  - 可保存为 `.rsc` 文件
  - 直接在 RouterOS 终端中执行，自动添加 Peer

- **OpenWrt 配置** - OpenWrt UCI 配置脚本
  - 可保存为 `.sh` 文件
  - 在 OpenWrt 路由器 SSH 终端中执行，自动添加 Peer


## 🔧 开发命令

### 前端开发
```bash
# 启动 Vite 开发服务器（仅前端）
yarn dev

# 构建前端
yarn build

# 预览构建结果
yarn preview
```

### Tauri 开发
```bash
# 启动 Tauri 开发模式（包含热重载）
yarn tauri dev

# 构建 Tauri 应用
yarn tauri build
```

### Rust 后端开发
```bash
cd src-tauri

# 检查 Rust 代码
cargo check

# 运行 Rust 测试
cargo test

# 格式化 Rust 代码
cargo fmt

# 运行 Clippy 检查
cargo clippy
```

## 📝 功能说明

### 界面设计

- **左右布局**：左侧为垂直步骤指示器，右侧为主要表单内容，操作流程清晰直观
- **响应式设计**：移动端自动切换为上下布局，适配小屏幕设备
- **浮动操作按钮**：历史记录按钮设计为右上角浮动按钮，不占用主界面空间
- **Toast 消息提示**：采用悬浮式通知，提供更好的视觉反馈
- **标签页导航**：配置生成后通过标签页切换查看不同平台配置，界面简洁

### 密钥生成

- **WireGuard 密钥对**：基于 X25519 算法生成私钥和公钥
- **预共享密钥（PSK）**：额外的安全层，推荐启用
- **自动公钥计算**：输入私钥时自动计算公钥

### 配置持久化

应用使用 Tauri 的应用数据目录存储配置：

- **macOS**: `~/Library/Application Support/com.wireguard.config-generator/`
- **Windows**: `%APPDATA%\com.wireguard.config-generator\`
- **Linux**: `~/.local/share/com.wireguard.config-generator/`

存储内容：
- `servers/` - 所有服务端配置文件（每个服务端一个 JSON 文件）
- `history/` - 所有生成的历史配置记录（按时间戳命名）
- 自动从旧版本的 `config.json` 迁移到新的服务端配置结构

### 历史记录

- 自动保存每次生成的配置
- 支持按服务端筛选历史记录，快速查找特定服务端的配置
- 支持标签页切换查看 WireGuard、Surge、路由器 Peer 等不同平台配置
- 支持查看、导出、删除单条记录
- 支持导出所有配置为 ZIP 压缩包（包含所有平台配置文件）
- 支持导出所有 Peer 配置为单个文本文件
- 清空历史记录和清空服务端配置分离，更加灵活
- 所有删除操作均有二次确认，防止误操作
- 浮动按钮设计，不占用主界面空间

### 配置格式

#### 1. 标准 WireGuard 配置（.conf）
```ini
[Interface]
PrivateKey = xxx
Address = 192.168.199.10/32
ListenPort = 51820
DNS = 8.8.8.8

[Peer]
PublicKey = xxx
PresharedKey = xxx
Endpoint = example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
```
> 适用于标准 WireGuard 客户端（Windows、macOS、Linux、iOS、Android）

#### 2. Surge WireGuard 配置（.conf）
```
[WireGuard wg0]
private-key = xxx
self-ip = 192.168.199.10
dns-server = 8.8.8.8
mtu = 1280
peer = (public-key = xxx, preshared-key = xxx, allowed-ips = "0.0.0.0/0, ::/0", endpoint = example.com:51820, keepalive = 25)
```
> 适用于 Surge iOS/macOS 客户端，可在 Surge 配置文件中直接使用

#### 3. 爱快路由器 Peer 配置（.txt）
```
id=1 enabled=yes comment=iPhone interface=wg_0 peer_publickey=xxx presharedkey=xxx allowips=192.168.199.10/32 endpoint= endpoint_port= keepalive=25
```
> 适用于爱快路由器，可在 Peer 管理界面批量导入

#### 4. MikroTik RouterOS 脚本（.rsc）
```
/interface wireguard peers
add allowed-address=192.168.199.10/32 comment="iPhone" interface=wg_0 public-key="xxx" preshared-key="xxx" persistent-keepalive=25s
```
> 适用于 MikroTik RouterOS，在终端中执行脚本自动添加 Peer

#### 5. OpenWrt UCI 配置脚本（.sh）
```bash
uci set network.wg0_peer_1=wireguard_wg_0
uci set network.wg0_peer_1.public_key='xxx'
uci set network.wg0_peer_1.preshared_key='xxx'
uci set network.wg0_peer_1.allowed_ips='192.168.199.10/32'
uci set network.wg0_peer_1.persistent_keepalive='25'
uci set network.wg0_peer_1.description='iPhone'
uci commit network
/etc/init.d/network reload
```
> 适用于 OpenWrt 路由器，通过 SSH 执行脚本自动添加 Peer

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📋 更新日志

### v0.1.5 (2025-10-14)

- 🎉 **欢迎页面** - 新增首次启动欢迎页面，提供功能介绍和步骤预览，提升新用户引导体验
- 🗄️ **服务端配置管理**
  - 全新的多服务端配置管理功能，支持多服务端配置保存和切换
  - 历史记录支持按服务端分类展示和筛选
  - 从旧版本自动迁移配置数据，无缝升级
- 🧹 **清空功能优化**
  - 新增"清空所有服务端配置"功能，支持批量删除
  - 优化"清空数据"逻辑，现在仅清空历史记录，保留服务端配置
  - 所有清空操作均增加二次确认对话框，防止误操作
- 🍎 **macOS 原生窗口支持**
  - 引入 macOS 原生窗口定制功能
  - 实现透明标题栏效果，提升视觉体验
- 🎨 **UI/UX 持续优化**
  - 固定窗口尺寸，优化布局稳定性
  - 改进服务端选择器样式，提升 UI 一致性
  - 重构组件结构，提升代码可维护性

### v0.1.4 (2025-10-13)

- ✨ **新增 Surge 配置支持** - 支持生成 Surge VPN 客户端专用的 WireGuard 配置
- 🌐 **OpenWrt 路由器支持** - 扩展支持 OpenWrt 路由器系统，不再仅限于爱快
- 🎨 **UI/UX 全面优化**
  - 重构主界面为左右布局（桌面端）/ 上下布局（移动端）
  - 历史记录按钮改为右上角浮动设计
  - 引入 Toast 消息提示系统
  - 标签页导航支持切换查看不同平台配置
- 🔧 **组件化重构** - 历史记录界面抽离为独立组件 `HistoryView`
- 📦 **历史记录增强** - 支持保存和导出 Surge 配置，ZIP 打包包含所有平台配置

## 🙏 致谢

- [WireGuard](https://www.wireguard.com/) - 现代 VPN 协议
- [Tauri](https://tauri.app/) - 轻量级桌面应用框架
- [React](https://react.dev/) - UI 框架
- [Surge](https://nssurge.com/) - 强大的网络调试工具
- [爱快路由器](https://www.ikuai8.com/) - 企业级路由系统
- [MikroTik](https://mikrotik.com/) - 专业网络设备制造商
- [OpenWrt](https://openwrt.org/) - 开源路由器固件

---

**WireGuard Client Config Generator**
