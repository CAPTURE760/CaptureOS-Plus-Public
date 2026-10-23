# 生产部署说明

本目录存放**公网服务器专用**的部署文件，与本地开发环境（项目根目录的 `docker-compose.yml`）完全独立，互不影响。

## 架构

```
浏览器
  ↓ https://example.com
nginx (80/443, HTTPS 反代)
  ├── /        → frontend:3000 (Next.js)
  ├── /api/*   → backend:8000  (FastAPI)
  └── /health  → backend:8000/health
        ↓
   backend → db:5432 (PostgreSQL)
   backend → uploads volume
   backup sidecar（启动时自动备份，保留 14 天）
```

前端后端不暴露公网端口，全部经 nginx 同源反代，**无跨域问题**。

## 文件说明

| 文件 | 用途 | 是否入库 |
|---|---|---|
| `docker-compose.prod.yml` | 生产环境 Compose（ACR 镜像 + nginx + certbot + db + backup） | ✅ |
| `nginx/default.conf` | nginx 反代配置（HTTPS + ACME 验证） | ✅ |
| `.env.prod.example` | 生产环境变量模板 | ✅ |
| `.env.prod` | 实际生产环境变量（密码等） | ❌ git 忽略 |
| `init.sh` | **首次部署**脚本（建库 + 签证书 + 启动） | ✅ |
| `deploy.sh` | **日常更新**脚本（拉镜像 + 重启 + 迁移） | ✅ |

## 与本地的差异

| 项 | 本地（根目录 compose） | 生产（本目录） |
|---|---|---|
| 镜像来源 | 本地 `build` | 阿里云 ACR 拉取 |
| 代码挂载 | `./backend:/app` 热重载 | 无挂载，镜像内固定 |
| 调试模式 | `DEBUG=true` + `--reload` | `DEBUG=false` |
| 数据库端口 | 暴露 `5432` | 不暴露 |
| 前后端端口 | 暴露 3000/8001 | 不暴露，nginx 反代 |
| HTTPS | 无 | nginx + Let's Encrypt 自动 |
| 数据库密码 | `captureos` | `.env.prod` 强密码 |

## 服务器部署步骤

### 前置条件

1. 域名 `example.com` 的 DNS 已解析到服务器公网 IP `203.0.113.10`
2. 阿里云安全组放行 **80** 和 **443** 端口
3. 服务器已安装 Docker + Compose
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

# 一键完成：启动服务 → 跑迁移 → 签 HTTPS 证书 → 启动 nginx
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

## HTTPS 证书

- 使用 Let's Encrypt 免费证书，由 certbot 容器自动维护
- 证书有效期 90 天，certbot 容器每 12 小时自动检查续签
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

所有用户数据都在 Docker volume 里，更新镜像不会丢失：
- `postgres_data` — 数据库
- `uploads_data` — 附件
- `backups_data` — 备份文件
- `certbot_data` — HTTPS 证书

备份由 `backup` sidecar 在每次启动时执行（同一天只跑一次，保留 14 天）。

## 常用运维命令

```bash
# 查看所有服务状态
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

# 查看日志
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f nginx

# 重启某个服务
docker compose --env-file .env.prod -f docker-compose.prod.yml restart backend

# 手动触发备份
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm backup

# 手动续签证书
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm certbot renew
```
