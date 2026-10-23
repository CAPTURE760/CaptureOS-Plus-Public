# 生产部署说明

本目录存放**公网服务器专用**的部署文件，与本地开发环境（项目根目录的 `docker-compose.yml`）完全独立，互不影响。

## 文件说明

| 文件 | 用途 | 是否入库 |
|---|---|---|
| `docker-compose.prod.yml` | 生产环境 Compose（拉 ACR 镜像、生产配置） | ✅ |
| `.env.prod.example` | 生产环境变量模板 | ✅ |
| `.env.prod` | 实际生产环境变量（密码、公网地址等） | ❌ git 忽略 |
| `deploy.sh` | 服务器一键更新脚本 | ✅ |

## 与本地的差异

| 项 | 本地（根目录 compose） | 生产（本目录） |
|---|---|---|
| 镜像来源 | 本地 `build` | 阿里云 ACR 拉取 |
| 代码挂载 | `./backend:/app` 热重载 | 无挂载，镜像内固定 |
| 调试模式 | `DEBUG=true` + `--reload` | `DEBUG=false` |
| 数据库端口 | 暴露 `5432` | 不暴露 |
| CORS | `localhost` | 公网地址 |
| API 地址 | `localhost:8001` | 公网地址 |
| 数据库密码 | `captureos` | `.env.prod` 强密码 |
| 备份 | 有 | 有（sidecar） |

## 服务器部署步骤

### 1. 服务器准备（一次性）

```bash
# 确保已安装 Docker + Compose
docker --version && docker compose version

# 如果 ACR 仓库是私有的，登录一次（公开仓库跳过）
docker login registry.example.com
```

### 2. 上传 deploy 目录到服务器

只需要把 `deploy/` 整个目录传到服务器即可，**不需要传整个项目代码**。

```bash
# 本地执行（替换成你的服务器地址）
scp -r deploy/ root@你的服务器IP:/opt/captureos/
```

### 3. 配置生产环境变量

```bash
cd /opt/captureos/deploy
cp .env.prod.example .env.prod
vim .env.prod   # 填入公网地址、强密码等
```

### 4. 启动

```bash
chmod +x deploy.sh
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

# 首次启动后跑数据库迁移
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend alembic upgrade head
```

## 日常更新流程

**本地**：
```bash
./push.sh        # 构建 + 推送到 ACR（自动打版本号）
```

**服务器**：
```bash
cd /opt/captureos/deploy
./deploy.sh      # 拉最新镜像 + 重启 + 跑迁移
```

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

备份由 `backup` sidecar 在每次启动时执行（同一天只跑一次，保留 14 天）。
