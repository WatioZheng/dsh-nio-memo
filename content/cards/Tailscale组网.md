# Tailscale 组网（WireGuard 数据面）

> 示例卡片 · v1 · 2026-10-10
> 场景：涉及 **Tailscale / WireGuard 组网**、**远程访问内网设备**、**与 ZeroTier 并存或迁移**时命中本卡。
> ⚠️ 本卡为**通用示例**：主机名 / IP / 网段一律用占位符，实际使用时替换为自己的值。

## 一句话

**Tailscale 与 ZeroTier 可以并存（Linux / Windows 各用各的虚拟网卡）；手机端同时只能启用一个 VPN；冷启动建连 Tailscale 明显更快。**

## 与 ZeroTier 的对比（经验值）

| 指标 | ZeroTier | **Tailscale** |
|---|---|---|
| 数据面 | 自研协议 | **WireGuard** |
| 首次建连 | 数秒（rendezvous 架构性延迟） | **数百毫秒** |
| 控制面 | 自建 controller | 官方 SaaS（可自建 Headscale） |
| Android 客户端 | 社区版维护较慢 | 官方客户端活跃维护 |

## 节点命名（示例）

| 节点 | 地址 | 说明 |
|---|---|---|
| `host-a` | `100.64.0.1` | 本机 |
| `phone-a` | `100.64.0.2` | 手机 |
| `host-b` | `100.64.0.3` | 备用机 |

> 地址段 `100.64.0.0/10` 是 CGNAT 保留段，Tailscale / ZeroTier 都从这里分配地址。

## 与 ZeroTier 并存的铁律

| 平台 | 能否并存 |
|---|---|
| **Linux / Windows** | ✅ 可以（各用各的虚拟网卡） |
| **Android / iOS** | ❌ **同时只能一个 VPN 生效**（系统限制） |
| **与原生 WireGuard** | ❌ **不要同跑**（都用 WG 库，已知冲突） |

**三个必避的坑**：

1. **路由别撞** —— 别两边都 advertise 同一网段
2. **DNS 别抢** —— 关一边（如 `--accept-dns=false`）
3. **别都当出口节点**

## 安全要点

- 数据面 = **WireGuard**（Curve25519 + ChaCha20-Poly1305，前向保密）
- **控制面理论可做 MITM**（下发假公钥）→ 用 **Tailnet Lock** 缓解
- **默认 ACL 常是「全通」** ⚠️ —— 进网后建议立即收紧
- 身份源是 SSO → **IdP 账号务必开 2FA**
- **Funnel = 真公网暴露**，别随手开
- **清理不用的旧节点**（旧密钥仍有效）

## 服务绑定的教训（迁移要点）

服务用 `auto` / `0.0.0.0` 绑定，换 overlay 时零改动；
凡是**按固定 overlay 地址硬编码**的地方（systemd、防火墙白名单），迁移时都要过一遍。
