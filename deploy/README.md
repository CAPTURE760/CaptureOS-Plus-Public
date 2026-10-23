# 生产部署说明

本目录存放**公网服务器专用**的部署文件，与本地开发环境（项目根目录的 `docker-compose.yml`）完全独立，互不影响。

## 架构

```
浏览器
  ↓ https://example.com
宿主机 nginx (80/443, HTTPS 反代)
  ├── /        → 127.0.0.1:3000 (Next.js frontend 容器)
  ├── /api/*   → 127.0.0.1:8000 (FastAPI backend 容器)
  └── /health  → 127.0.0.1:8000/health
        ↓
   backend → db:5432 (PostgreSQL)
   backend → uploads volume
   backup sidecar（启动时自动备份，保留 14 天）
   certbot 容器（签发/续签 HTTPS 证书，证书绑定挂载到宿主机 ./certs 供 nginx 读取）
```

前端后端容器仅绑定回环地址 `127.0.0.1`，不暴露公网端口，统一经**宿主机 nginx** 同源反代，**无跨域问题**。

> 注意：docker 内不再运行 nginx 容器，反代由服务器自带的 nginx 承担。

## 文件说明

| 文件 | 用途 | 是否入库 |
|---|---|---|
| `docker-compose.prod.yml` | 生产环境 Compose（ACR 镜像 + db + backend + frontend + certbot + backup，**不含 nginx**） | ✅ |
| `nginx/example.com.conf` | 宿主机 nginx 完整 HTTPS 反代配置（日常使用） | ✅ |
| `nginx/example.com.acme.conf` | 宿主机 nginx 临时配置（首次签发证书时用，仅 HTTP + ACME 验证） | ✅ |
| `nginx/default.conf` | 【已废弃】原 docker nginx 容器配置，保留仅供参考 | ✅ |
| `.env.prod.example` | 生产环境变量模板 | ✅ |
| `.env.prod` | 实际生产环境变量（密码等） | ❌ git 忽略 |
| `init.sh` | **首次部署**脚本（建库 + 签证书，分步引导配置宿主机 nginx） | ✅ |
| `deploy.sh` | **日常更新**脚本（拉镜像 + 重启 + 迁移） | ✅ |

## 与本地的差异

| 项 | 本地（根目录 compose） | 生产（本目录） |
|---|---|---|
| 镜像来源 | 本地 `build` | 阿里云 ACR 拉取 |
| 代码挂载 | `./backend:/app` 热重载 | 无挂载，镜像内固定 |
| 调试模式 | `DEBUG=true` + `--reload` | `DEBUG=false` |
| 数据库端口 | 暴露 `5432` | 不暴露 |
| 前后端端口 | 暴露 3000/8001 | 仅绑定 `127.0.0.1`，经宿主机 nginx 反代 |
| HTTPS | 无 | 宿主机 nginx + Let's Encrypt（certbot 容器签发） |
| 数据库密码 | `captureos` | `.env.prod` 强密码 |

## 服务器部署步骤

### 前置条件

1. 域名 `example.com` 的 DNS 已解析到服务器公网 IP `203.0.113.10`
2. 阿里云安全组放行 **80** 和 **443** 端口
3. 服务器已安装 **Docker + Compose**，且宿主机已安装 **nginx** 并运行中
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

# 一键完成：启动服务 → 跑迁移 → 按提示配置宿主机 nginx → 签 HTTPS 证书 → 启用完整反代
./init.sh
```

`init.sh` 会分两步引导你配置宿主机 nginx：

1. **签发证书前**：拷贝 `nginx/example.com.acme.conf` 到 `/etc/nginx/conf.d/example.com.conf` 并 `reload`，让 nginx 提供 ACME 验证路径
2. **证书签发后**：用 `nginx/example.com.conf`（完整 HTTPS 配置）替换上述文件并 `reload`，启用正式反代

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

> 更新镜像不会影响宿主机 nginx，证书续签由 certbot 容器自动完成。

## HTTPS 证书

- 使用 Let's Encrypt 免费证书，由 certbot 容器签发与续签
- 证书绑定挂载到宿主机 `deploy/certs/` 目录，宿主机 nginx 直接读取
- 证书有效期 90 天，certbot 容器每 12 小时自动检查续签
- 续签使用 webroot 模式，依赖宿主机 nginx 持续提供 `/.well-known/acme-challenge/`（`example.com.conf` 已包含该 location）
- 首次签发需要 80 端口可被外网访问（阿里云安全组放行）

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
- `./certs` — HTTPS 证书（绑定挂载）
- `./certbot-www` — ACME 验证 webroot（绑定挂载）

备份由 `backup` sidecar 在每次启动时执行（同一天只跑一次，保留 14 天）。

## 常用运维命令

```bash
# 查看所有服务状态
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

# 查看日志
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f certbot

# 重启某个服务
docker compose --env-file .env.prod -f docker-compose.prod.yml restart backend

# 手动触发备份
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm backup

# 手动续签证书
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot

# 宿主机 nginx 配置检查与重载
nginx -t && systemctl reload nginx
```
