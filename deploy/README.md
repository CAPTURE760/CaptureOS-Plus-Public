# 生产部署说明

本目录存放**公网服务器专用**的部署文件，与本地开发环境（项目根目录的 `docker-compose.yml`）完全独立，互不影响。

## 架构

```
浏览器
  ↓ https://example.com
Cloudflare (HTTPS 终端, Flexible 模式)
  ↓ http (回源到源站 80 端口)
宿主机 nginx (80, HTTP 反代)
  ├── /        → 127.0.0.1:3003 (Next.js frontend 容器)
  ├── /api/*   → 127.0.0.1:8000 (FastAPI backend 容器)
  └── /health  → 127.0.0.1:8000/health
        ↓
   backend → db:5432 (PostgreSQL)
   backend → uploads volume
   backup sidecar（启动时自动备份，保留 14 天）
   certbot 容器（备用，保留用于未来切换直接 HTTPS）
```

前端后端容器仅绑定回环地址 `127.0.0.1`，不暴露公网端口，统一经**宿主机 nginx** 同源反代，**无跨域问题**。

> HTTPS 由 Cloudflare 提供（Flexible 模式），源站 nginx 仅监听 80 端口。
> 注意：frontend 用 3003 端口而非 3000，避免与服务器 已有监控服务(127.0.0.1:3000) 冲突。

## 文件说明

| 文件 | 用途 | 是否入库 |
|---|---|---|
| `docker-compose.prod.yml` | 生产环境 Compose（ACR 镜像 + db + backend + frontend + certbot + backup，**不含 nginx**） | ✅ |
| `nginx/example.com.conf` | 宿主机 nginx 反代配置（HTTP:80，Cloudflare 回源用） | ✅ |
| `nginx/example.com.acme.conf` | 【备用】直接 HTTPS 方案的 ACME 临时配置 | ✅ |
| `nginx/default.conf` | 【已废弃】原 docker nginx 容器配置 | ✅ |
| `.env.prod.example` | 生产环境变量模板 | ✅ |
| `.env.prod` | 实际生产环境变量（密码等） | ❌ git 忽略 |
| `init.sh` | **首次部署**脚本 | ✅ |
| `deploy.sh` | **日常更新**脚本（拉镜像 + 重启 + 迁移） | ✅ |

## 与本地的差异

| 项 | 本地（根目录 compose） | 生产（本目录） |
|---|---|---|
| 镜像来源 | 本地 `build` | 阿里云 ACR 拉取 |
| 代码挂载 | `./backend:/app` 热重载 | 无挂载，镜像内固定 |
| 调试模式 | `DEBUG=true` + `--reload` | `DEBUG=false` |
| 数据库端口 | 暴露 `5432` | 不暴露 |
| 前端端口 | 暴露 3000 | 绑定 `127.0.0.1:3003`，经宿主机 nginx 反代 |
| 后端端口 | 暴露 8001 | 绑定 `127.0.0.1:8000`，经宿主机 nginx 反代 |
| HTTPS | 无 | Cloudflare Flexible（源站 HTTP:80） |
| 数据库密码 | `captureos` | `.env.prod` 强密码 |

## 服务器部署步骤

### 前置条件

1. 域名 `example.com` 已接入 **Cloudflare**，DNS A 记录指向服务器公网 IP `203.0.113.10`，代理状态开（橙色云朵）
2. Cloudflare SSL/TLS 模式设为 **Flexible**
3. 服务器已安装 **Docker + Compose**，且宿主机已安装 **nginx**（`apt install nginx`）
4. ACR 私有仓库已在服务器登录：
   ```bash
   docker login registry.example.com
   ```

### 1. 上传 deploy 目录到服务器

```bash
# 本地执行
scp -r deploy/ root@203.0.113.10:/opt/CaptureOS/
```

### 2. 首次部署

```bash
cd /opt/CaptureOS/deploy
chmod +x init.sh deploy.sh

# 配置环境变量
cp .env.prod.example .env.prod
vim .env.prod   # 填入 POSTGRES_PASSWORD

# 一键完成：启动服务 → 跑迁移 → 配置宿主机 nginx
./init.sh
```

完成后访问 **https://example.com**

### 3. 日常更新

**本地**：
```bash
./push.sh        # 构建 + 推送到 ACR（自动打版本号）
```

**服务器**：
```bash
cd /opt/CaptureOS/deploy
./deploy.sh      # 拉最新镜像 + 重启 + 跑迁移
```

## HTTPS

- 使用 **Cloudflare** 提供 HTTPS（Flexible 模式），源站 nginx 仅监听 80 端口
- 无需在源站配置 SSL 证书
- certbot 容器保留作为备用，如需切换为直接 HTTPS 可使用

## 回滚

`push.sh` 推送时同时打 `latest` 和 `v1.x` 两个标签。回滚到指定版本：

```bash
# 编辑 .env.prod，把镜像 tag 改成 v1.x
# BACKEND_IMAGE=.../captureos-backend:v1.x
# FRONTEND_IMAGE=.../captureos-frontend:v1.x

./deploy.sh
```

## 数据持久化

所有用户数据都在 Docker volume 或绑定挂载里，更新镜像不会丢失：
- `postgres_data` — 数据库
- `uploads_data` — 附件
- `backups_data` — 备份文件

备份由 `backup` sidecar 在每次启动时执行（同一天只跑一次，保留 14 天）。

## 常用运维命令

```bash
# 查看所有服务状态
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

# 查看日志
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend

# 重启某个服务
docker compose --env-file .env.prod -f docker-compose.prod.yml restart backend

# 手动触发备份
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm backup

# 宿主机 nginx 配置检查与重载
nginx -t && systemctl reload nginx
```
