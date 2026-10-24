# CaptureOS-Plus — 个人资产管理系统

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-blue?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.137-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker">
</p>

> 一个全栈个人知识与资产管理平台，帮助你系统化地记录、关联、管理和复盘工作与学习中的各类信息。支持一键 Docker Compose 部署，开箱即用。
>
> 两套运行环境：**本地单用户模式**（免登录，开箱即用）与 **公网多用户模式**（登录 + 图片验证码 + 数据隔离）。公网访问地址：<https://example.com>（部署细节见 [公网部署](#deploy-production) 与 [`deploy/README.md`](deploy/README.md)）。

---

## 🎯 项目简介

在日常工作和学习中，我们经常会遇到以下问题：

- 做过的项目没有记录，下次遇到类似问题还要重新摸索
- 踩过的坑没有总结，同样的错误反复出现
- 学到的知识散落在各处，需要时找不到
- 重要决策的过程和理由没有保存，事后无法复盘
- 问题、方案、知识、决策之间缺少关联，信息成为孤岛

**CaptureOS** 就是为了解决这些问题而设计的。它是一个 **个人资产管理系统**，让你能够：

- 📁 管理项目全生命周期
- 💡 记录和沉淀经验教训
- ⚠️ 追踪和解决遇到的问题
- 🔧 保存有效的解决方案
- 📚 建立个人知识库
- 🎯 记录重要决策的过程
- 📝 定期复盘和持续改进
- 🔗 **将所有实体关联起来，形成完整的成长链路**

---

## ✨ 功能特性

### 核心模块

| 模块 | 功能描述 |
|------|----------|
| 📁 **项目管理** | 创建和跟踪项目，记录状态、优先级、时间线 |
| 💡 **经验记录** | 记录学习经验、背景、结果和教训 |
| ⚠️ **问题追踪** | 记录问题详情、状态、根本原因和发现时间 |
| 🔧 **解决方案** | 保存问题解决方法、实施效果、有效性评分和状态流转（待采用/已采用/已废弃） |
| 📚 **知识库** | 积累知识，按分类整理，记录来源和置信度 |
| 🎯 **决策记录** | 记录决策背景、选项、理由和最终结果 |
| 📝 **复盘总结** | 记录复盘摘要、成功/失败因素和改进措施 |

### 关联系统（核心能力）

| 功能 | 描述 |
|------|------|
| 🔗 **实体关联** | 任意实体之间可建立关联（问题→方案→知识→决策→复盘） |
| 📋 **详情页** | 每个实体都有独立详情页，展示完整信息和关联关系 |
| 💡 **智能推荐** | 基于共享标签自动推荐可能关联的实体 |
| 🔗 **关联管理** | 在详情页中创建、查看、删除关联关系 |
| 📁 **项目中心** | 项目详情页聚合展示该项目下的所有关联实体 |

### 辅助功能

| 功能 | 描述 |
|------|------|
| 🏷️ **标签系统** | 为任意实体添加标签，灵活分类，支持等级标记 |
| 📅 **时间线** | 支持链路视图（折叠展示关联链路）和列表视图 |
| 🔍 **全文搜索** | ILIKE + pg_trgm 中文子串匹配，类型/标签/日期组合筛选，结果关键词高亮，返回保留搜索状态 |
| 📊 **仪表盘** | 待处理、风险提醒、状态概览、最近动态四区块 |
| 🔄 **批量操作** | 批量删除、批量打标签、**批量改状态**、批量导出 Word |
| 📎 **附件上传** | 任意实体可上传附件，详情页下载/删除，文件名哈希防冲突 |
| 📥 **导出 / 导入** | Word（阅读用）+ JSON（迁移用）双格式导出，JSON 可再导入形成闭环 |
| 💾 **自动备份** | 启动时自动备份数据库 + 附件，幂等设计，保留最近 14 天 |
| 📱 **移动端适配** | 手机端抽屉式侧边栏、卡片列表、响应式弹窗 |
| 🔐 **多用户认证** | 生产模式登录（图片验证码 + bcrypt + JWT），按 `user_id` 数据隔离；本地模式免登录 |

---

## 🛠️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Next.js)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │ 仪表盘  │ │ CRUD页面│ │ 详情页  │ │  关联管理     │  │
│  │         │ │ + 列表  │ │ + 标签  │ │  推荐 + 搜索  │  │
│  └─────────┘ └─────────┘ └─────────┘ └───────────────┘  │
│                    React 19 + TailwindCSS                │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/REST API
┌─────────────────────────┴───────────────────────────────┐
│                    后端 (FastAPI)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │   API   │ │Suggesti-│ │Entity   │ │   Timeline    │  │
│  │  CRUD   │ │ons API  │ │Relations│ │   Chains      │  │
│  └─────────┘ └─────────┘ └─────────┘ └───────────────┘  │
│              SQLAlchemy 2.0 (Async) + Pydantic           │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│                   数据库 (PostgreSQL)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │ 7 实体  │ │  Tags   │ │Relations│ │  GIN 全文索引  │  │
│  │  表     │ │(多态)   │ │(多态图) │ │  + B-tree     │  │
│  └─────────┘ └─────────┘ └─────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端框架** | Next.js | 15.x | React SSR/SSG 框架 |
| **UI 库** | React | 19.x | 用户界面组件 |
| **样式** | TailwindCSS | 3.4+ | 原子化 CSS 框架 |
| **数据获取** | SWR | 2.x | 数据缓存和实时更新 |
| **后端框架** | FastAPI | 0.137+ | 高性能异步 API |
| **ORM** | SQLAlchemy | 2.0+ | 异步数据库操作 |
| **数据验证** | Pydantic | 2.x | 请求/响应数据验证 |
| **数据库迁移** | Alembic | latest | 版本化数据库变更 |
| **数据库** | PostgreSQL | 16 | 关系型数据库 + GIN 全文索引 |
| **异步驱动** | asyncpg | latest | 异步 PostgreSQL 驱动 |
| **容器化** | Docker Compose | v2+ | 多服务编排部署 |

---

## 🚀 快速开始

### 前置要求

- **Docker** 20.10+
- **Docker Compose** v2.0+

---

### 部署方式一：预构建镜像（推荐，最快）

从阿里云镜像仓库直接拉取，国内 CDN 加速，无需本地构建。

```bash
# 1. 克隆项目
git clone https://github.com/CAPTURE760/CaptureOS-plus.git
cd CaptureOS-plus

# 2. 启动
docker compose -f docker-compose.pull.yml up -d

# 3. 运行数据库迁移
docker compose -f docker-compose.pull.yml exec backend alembic upgrade head
```

**后续更新：**

```bash
# 拉取最新版本并重启
docker compose -f docker-compose.pull.yml pull
docker compose -f docker-compose.pull.yml up -d

# 拉取指定版本（如 v1.1）
# Linux / macOS / WSL / Git Bash：
BACKEND_TAG=v1.1 FRONTEND_TAG=v1.1 docker compose -f docker-compose.pull.yml pull
BACKEND_TAG=v1.1 FRONTEND_TAG=v1.1 docker compose -f docker-compose.pull.yml up -d
# Windows PowerShell：
$env:BACKEND_TAG="v1.1"; $env:FRONTEND_TAG="v1.1"; docker compose -f docker-compose.pull.yml pull
$env:BACKEND_TAG="v1.1"; $env:FRONTEND_TAG="v1.1"; docker compose -f docker-compose.pull.yml up -d

# 查看所有可用版本
cat VERSIONS.md  # 或在 GitHub 仓库首页查看 VERSIONS.md 文件
```

| 标签 | 含义 | 使用场景 |
|------|------|----------|
| `latest` | 最新版本（默认） | 日常使用，始终获取最新功能 |
| `v1.0`、`v1.1`... | 固定版本 | 回滚到稳定版本，或锁定特定版本 |

---

### 部署方式二：源码构建（适合开发者）

本地构建镜像，支持热重载，代码修改后自动生效。

```bash
# 1. 克隆项目
git clone https://github.com/CAPTURE760/CaptureOS-plus.git
cd CaptureOS-plus

# 2. 启动（首次构建约 5-10 分钟）
docker compose up -d

# 3. 运行数据库迁移
docker compose exec backend alembic upgrade head
```

**后续更新（代码有改动时）：**

```bash
git pull
docker compose up -d --build
docker compose exec backend alembic upgrade head  # 有新迁移时执行
```

**本地开发常用命令：**

```bash
docker compose logs -f backend     # 后端日志
docker compose logs -f frontend    # 前端日志
docker compose up -d --build backend  # 重建单个服务
docker compose down                # 停止所有服务
docker compose down -v             # 停止并删除数据（危险！）
```

---

### 部署方式三：公网服务器（生产）

面向有公网 VPS、需要域名访问和多用户隔离的场景。完整步骤见 [公网部署（生产环境）](#deploy-production) 和 [`deploy/README.md`](deploy/README.md)。

```bash
# 服务器上（代码在 /opt/CaptureOS，使用 deploy 目录的 compose）
cd /opt/CaptureOS/deploy
cp .env.prod.example .env.prod && vim .env.prod   # 填密码、SECRET_KEY、管理员账号
./init.sh                                         # 启动 + 迁移 + 建管理员 + 装 nginx 配置
```

> ⚠️ 生产环境的每条 compose 命令都必须带 `--env-file .env.prod -f docker-compose.build.yml`（或 `-f docker-compose.prod.yml`），否则会读到错误的配置文件或空环境变量，详见 [公网部署](#deploy-production)。

---

### 三种部署方式对比

| | 预构建镜像 | 源码构建（本地） | 公网服务器（生产） |
|--|-----------|---------|---------|
| **首次启动** | 2-3 分钟 | 5-10 分钟 | 5-15 分钟（arm64 本地构建） |
| **后续更新** | `pull` 秒级 | `build` 1-2 分钟 | `git pull` + `build`，或 `deploy.sh` 拉镜像 |
| **热重载** | ❌ 改代码要重新推送 | ✅ 自动生效 | ❌ 镜像固定，重建才生效 |
| **认证** | 无（免登录） | 无（免登录） | 登录 + 验证码 + JWT |
| **HTTPS / 域名** | 无 | 无 | Cloudflare + 宿主机 nginx |
| **适合谁** | 普通用户 | 需要改代码的开发者 | 需要公网访问、多人使用的场景 |

---

## 💾 备份与恢复

### 三种数据出口，各有用途

| 方式 | 格式 | 入口 | 能否恢复 | 适用场景 |
|------|------|------|---------|---------|
| Word 导出 | `.docx` | 各列表页「导出 Word」按钮 | ❌ 只供阅读 | 汇报、打印、分享给人看 |
| JSON 导出 | `.json` | 首页「导出」→ 选「JSON 数据」 | ✅ 首页「导入数据」 | 跨实例迁移、给别人导入 |
| SQL 备份 | `.sql` + `.tar.gz` | 自动（见下） | ✅ `scripts/restore.sh` | 灾备、原样还原（连 ID 都不变） |

### 自动备份机制

**三层触发，谁先执行谁备份，其余自动跳过**（幂等设计：同一天只备份一次）：

| 触发方式 | 场景 | 可靠性 |
|---------|------|--------|
| **backup sidecar**（推荐） | `docker compose up` 时自动启动，执行完自动退出 | 主方案 |
| **start-captureos.bat** | 双击启动器时第 5 步调用 | 备选 |
| **后端启动钩子** | FastAPI lifespan 里尝试执行 | 兜底 |

sidecar 用 `docker:24-cli` 镜像，挂载 docker socket 后直接 `docker exec` 调 db 容器的 pg_dump，**不需要修改 backend 镜像**。

**幂等设计**：同一天只备份一次。判断依据是备份目录里是否已存在当日文件，重复启动直接跳过，不影响启动速度。

**保留策略**：自动保留最近 **14 天**。判断依据是文件修改时间（`mtime`），`-mtime +14` 匹配 15 天及以上，超期文件在下次备份时自动删除。

#### Docker Desktop 手动启动时 backup 不触发

sidecar 执行完就退出（`restart: "no"`），Docker Desktop 启动时只恢复"之前正在运行"的容器，**不会拉起已退出的 backup**。

解决办法（三选一）：

1. **推荐**：不用 Docker Desktop 启动，改用命令行 `docker compose up -d`
2. 手动补一次：`docker compose up backup`
3. 把 `docker-compose.yml:66` 的 `restart: "no"` 改成 `restart: unless-stopped`（代价：backup 会一直挂在后台）

**备份内容**（每次两个文件）：

- `captureos-YYYY-MM-DD.sql` — 数据库全量（pg_dump custom 格式）
- `captureos-YYYY-MM-DD-uploads.tar.gz` — 全部附件文件（`backend/uploads/`）

**备份位置**：`\wsl.localhost\Ubuntu\home\oyweiyuan\CaptureOS\backups\`（WSL 内：`~/CaptureOS/backups/`）

### 手动备份

```bash
# 宿主机直接执行（不需要进容器）
wsl -d Ubuntu -- /home/oyweiyuan/CaptureOS/scripts/backup.sh
```

注意：脚本带幂等，今天已备份过会跳过。如需强制重新备份，先删除 `backups/captureos-当天日期.sql`。

### 恢复方式一：SQL 恢复（整库原样还原，推荐用于灾备）

```bash
wsl -d Ubuntu -- /home/oyweiyuan/CaptureOS/scripts/restore.sh 2026-10-17
```

关键步骤（`scripts/restore.sh` 自动完成）：

1. `DROP SCHEMA public CASCADE` 清空数据库
2. `pg_restore` 灌入 SQL 备份（表结构 + 数据 + 原 ID 全部还原）
3. 解压 `uploads.tar.gz` 恢复附件文件
4. 按提示 `docker compose restart backend`

⚠️ 恢复会**覆盖当前全部数据**，操作前建议先手动备份当前状态。

### 恢复方式二：JSON 导入（适合给别人导数据、跨实例迁移）

1. 在源系统首页点「导出」→ 选「JSON 数据」→ 得到 `captureos-export-YYYY-MM-DD.json`
2. 在目标系统首页点「📤 导入数据」→ 选择该 JSON 文件
3. 导入逻辑（`backend/app/api/import_data.py`）自动处理：
   - **ID 重映射**：旧 ID 自动映射到新 ID，关联关系不丢
   - **去重**：按标题/名称跳过已存在的记录
   - **预校验**：必填字段、枚举值先校验
4. ⚠️ JSON 不含附件文件本体，附件需单独拷贝 `backend/uploads/` 目录

### 备份相关配置（可选，都有默认值）

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `BACKUP_DIR` | `/backups`（容器内） | 备份输出目录 |
| `BACKUP_RETENTION_DAYS` | `14` | 保留天数 |

---

## 🖥️ 运行方式

部署完成后，根据你的系统选择启动方式：

### Linux / macOS / WSL

```bash
cd ~/CaptureOS
docker compose up -d       # 预构建镜像用：docker compose -f docker-compose.pull.yml up -d
```

### Windows 一键启动

将 `start-captureos.bat` 放到桌面，双击即可自动完成：启动 Docker → 启动服务 → 打开浏览器 → 触发备份。

bat 只是 5 行的纯 ASCII 启动器，**所有逻辑和中文输出都在 `scripts/start-captureos.sh`**（首次使用改该文件顶部的 `DOCKER_DESKTOP` 为你的 Docker Desktop 实际路径）：

```bat
@echo off
rem CaptureOS launcher - ASCII only, do not add non-ASCII characters here.
chcp 65001 >nul
wsl -d Ubuntu -- bash /home/oyweiyuan/CaptureOS/scripts/start-captureos.sh
pause
```

> 为什么这样设计：bat 里写中文 + 复杂逻辑有两个硬伤——① cmd 在 chcp 65001 下解析 UTF-8 多字节字符容易把 echo 行从中间拆开（报 `xxx is not recognized`）；② 编辑器保存时行尾/BOM 一旦被改就复发。把逻辑放进 .sh（UTF-8+LF 本来就是它的标准格式），bat 保持纯 ASCII 无标签无括号块，任何编辑器怎么保存都不会坏。

### 手机 / 局域网访问

同一局域网内的手机或其他设备可以通过电脑 IP 访问：

```bash
# 1. 先查看电脑的局域网 IP
# Linux / macOS / WSL：
ip addr | grep "inet " | grep -v 127.0.0.1
# 输出类似：inet 192.168.1.100/24  ← 这就是你的 IP

# Windows PowerShell：
ipconfig | findstr "IPv4"
# 输出类似：IPv4 地址 . . . . . . . . . . : 192.168.1.100

# 2. 手机浏览器访问（把 IP 换成你电脑的实际 IP）
http://192.168.x.x:3000
```

> 前端会自动检测访问地址，动态请求后端 API，无需额外配置。
> 注意：手机和电脑必须连接同一个 WiFi/局域网。

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 🖥️ **前端界面** | http://localhost:3000 | 主应用界面 |
| 🔌 **后端 API** | http://localhost:8001/api | REST API |
| 📖 **API 文档** | http://localhost:8001/docs | Swagger 交互文档 |
| 📖 **API 文档** | http://localhost:8001/redoc | ReDoc 文档 |

---

<a id="deploy-production"></a>

## 🌐 公网部署（生产环境）

公网环境与本地开发环境**完全独立**：本地用仓库根目录的 `docker-compose.yml`，服务器用 `deploy/` 目录下的 compose 文件，两者不共享容器、端口和数据卷。

> 备注：下文命令中的 `/opt/CaptureOS`、`<SERVER_IP>`、`<your-registry>` 均为占位符，请替换为你的实际部署路径、服务器 IP 与镜像仓库地址；`example.com` 为示例域名。

### 请求链路

```
浏览器
  ↓ https://example.com
Cloudflare（HTTPS 终端，SSL/TLS = Flexible）
  ↓ http（回源到源站 80）
宿主机 nginx（/etc/nginx/conf.d/example.com.conf）
  ├── /api/          → 127.0.0.1:8000（FastAPI backend 容器）
  ├── /health        → 127.0.0.1:8000/health
  ├── /uploads/      → 127.0.0.1:8000（附件静态文件）
  ├── /_next/static/ → 127.0.0.1:3003（Next.js 静态资源）
  └── /              → 127.0.0.1:3003（Next.js frontend 容器）
        ↓
   backend → db:5432（PostgreSQL，容器网络内）
   backend → uploads 卷
   backup sidecar（定时备份，保留 14 天）
   certbot（备用，保留用于未来切换源站直接 HTTPS）
```

> **为什么是这套组合**：服务器 443 端口已被其他服务占用且不能修改，因此 HTTPS 交给 Cloudflare（Flexible 模式），源站 nginx 只监听 80；宿主机 3000 端口也已被其他服务占用，因此 frontend 宿主机端口改用 3003。前端、后端、数据库均只绑定 `127.0.0.1`，不暴露公网。

### 关键文件

| 文件 | 作用 | 是否入库 |
|---|---|---|
| `deploy/docker-compose.build.yml` | **服务器当前实际使用**：源码构建，db/backend/frontend/certbot/backup | ✅ |
| `deploy/docker-compose.prod.yml` | ACR 镜像版（`image: ${BACKEND_IMAGE}`），配 `deploy.sh` | ✅ |
| `deploy/.env.prod.example` | 生产变量模板 | ✅ |
| `deploy/.env.prod` | 真实密码、`SECRET_KEY`、管理员账号 | ❌ git 忽略 |
| `deploy/nginx/example.com.conf` | 宿主机 nginx 站点配置模板 | ✅ |
| `deploy/init.sh` | 首次部署（启动 → 迁移 → 建管理员 → 装 nginx 配置） | ✅ |
| `deploy/deploy.sh` | ACR 路径的日常更新（pull → 重启 → 迁移） | ✅ |
| `deploy/scripts/backup.sh` | 生产备份脚本（挂载进 backup 容器） | ✅ |

> 备注：`init.sh` / `deploy.sh` 默认使用 `docker-compose.prod.yml`（拉 ACR 镜像）。当前日本服务器受 arm64 跨架构构建速度限制，实际改为**服务器本地构建**，因此手动执行命令时把 `-f docker-compose.prod.yml` 换成 `-f docker-compose.build.yml` 即可。

### 端口划分

| 服务 | 本地（根 compose） | 公网（deploy compose） | 说明 |
|---|---|---|---|
| frontend | `3000:3000` | `127.0.0.1:3003:3000` | 宿主机 3000 已被其他服务占用，故生产用 3003 |
| backend | `8001:8000` | `127.0.0.1:8000:8000` | 本地用 8001，避免与前端 3000 混淆 |
| db | `5432:5432` | `127.0.0.1:5432:5432` | 生产仅回环，供 Navicat 走 SSH 隧道 |
| nginx | 不使用 | 宿主机 `:80` | 唯一公网入口，由系统 nginx 监听 |
| HTTPS | 无 | Cloudflare `:443` | 源站 443 已被其他服务占用 |

- 容器内部端口永远是原始端口（frontend 3000、backend 8000、db 5432），`ports` 只改宿主机侧。
- 容器间通信用服务名 + 容器端口（如 `db:5432`），不经过宿主机映射。

### 域名与 HTTPS

1. 域名 `example.com` 托管在 Cloudflare，`A` 记录指向服务器公网 IP，代理状态开启（橙色云朵）。
2. Cloudflare **SSL/TLS → Flexible**：用户到 Cloudflare 走 HTTPS，Cloudflare 回源到 80 走 HTTP。
3. 源站只需放行 80 和 SSH；443 留给服务器上已有服务。
4. nginx 配置生效：

```bash
cp deploy/nginx/example.com.conf /etc/nginx/conf.d/example.com.conf
nginx -t && systemctl reload nginx
```

> 备注：若以后改用标准 443（例如让占用 443 的服务做 SNI 分流），需要同时调整 Cloudflare 模式与源站证书；当前方案对已有服务零侵入，是成本最低的选择。

### 环境变量与认证

`deploy/.env.prod` 至少包含：

```bash
POSTGRES_PASSWORD=强密码
SECRET_KEY=至少32位随机字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=管理员强密码
# 使用 ACR 镜像时还需要：
BACKEND_IMAGE=<your-registry>/captureos-backend:latest
FRONTEND_IMAGE=<your-registry>/captureos-frontend:latest
```

认证由 `SINGLE_USER_MODE` 切换，一套代码两种模式：

| 模式 | 值 | 行为 |
|---|---|---|
| 本地单用户 | `true`（默认） | 免登录，所有数据归属 `admin` 用户 |
| 公网多用户 | `false`（deploy compose 中设置） | 必须登录；图片验证码 + bcrypt + JWT；数据按 `user_id` 隔离 |

- 登录接口：`GET /api/auth/captcha` → `POST /api/auth/login`
- 不开放注册，仅管理员可创建用户：`python -m scripts.create_admin --username <名> --password <密码> [--no-admin] [--display-name 备注]`
- JWT 有效期 7 天；同一账号可多设备同时登录；修改密码不会让已签发 token 立即失效（无 `token_version`，已知限制）。

### 首次部署

```bash
# 1. 服务器准备
git clone https://github.com/CAPTURE760/CaptureOS-plus.git /opt/CaptureOS
cd /opt/CaptureOS/deploy
cp .env.prod.example .env.prod && vim .env.prod

# 2. 启动（ACR 镜像路径）
./init.sh

# 或：服务器本地构建路径（当前实际使用）
docker compose --env-file .env.prod -f docker-compose.build.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.build.yml exec -T backend alembic upgrade head
docker compose --env-file .env.prod -f docker-compose.build.yml exec -T \
  -e ADMIN_USERNAME -e ADMIN_PASSWORD backend python -m scripts.create_admin
```

### 日常更新

**服务器本地构建（当前）**：

```bash
cd /opt/CaptureOS && git pull origin main
cd deploy
docker compose --env-file .env.prod -f docker-compose.build.yml up -d --build backend frontend
docker compose --env-file .env.prod -f docker-compose.build.yml exec -T backend alembic upgrade head  # 有新迁移时
```

**ACR 镜像**：

```bash
bash push.sh          # 本地构建并推送（需同时支持 amd64/arm64）
cd /opt/CaptureOS/deploy && ./deploy.sh
```

### 运维命令（生产必带完整前缀）

```bash
cd /opt/CaptureOS/deploy

# 状态 / 日志 / 重启
docker compose --env-file .env.prod -f docker-compose.build.yml ps
docker compose --env-file .env.prod -f docker-compose.build.yml logs -f --tail=200 backend
docker compose --env-file .env.prod -f docker-compose.build.yml restart backend

# 数据库迁移
docker compose --env-file .env.prod -f docker-compose.build.yml exec -T backend alembic upgrade head

# 手动备份
docker compose --env-file .env.prod -f docker-compose.build.yml run --rm backup

# 宿主机 nginx
nginx -t && systemctl reload nginx
```

> ⚠️ **两条铁律**
> 1. 生产命令必须同时带 `--env-file .env.prod` 和 `-f docker-compose.build.yml`（或 `prod.yml`）。漏 `-f` 会向上找到根目录的本地 compose，用另一个项目名起第二套容器并抢占 5432，看起来像"数据丢了"；漏 `--env-file` 会导致 `POSTGRES_PASSWORD` / `SECRET_KEY` 为空，后端起不来或登录 401。
> 2. **禁止 `docker compose down -v`、禁止删除 `deploy_postgres_data` / `deploy_uploads_data` / `deploy_backups_data` 卷**，否则数据库、附件、备份会一起消失。

### 生产数据位置

| 数据 | 位置 |
|---|---|
| 数据库 | 命名卷 `deploy_postgres_data` |
| 附件 | 命名卷 `deploy_uploads_data`（容器内 `/app/uploads`） |
| 备份 | 命名卷 `deploy_backups_data`（容器内 `/backups`） |
| 密钥 | 宿主机 `deploy/.env.prod`（不入库） |

> 备注：Compose 命名卷的真实名是「项目名_卷名」，项目名默认取 compose 文件所在目录名。服务器在 `deploy/` 下执行，所以是 `deploy_*`；本地在仓库根执行，所以是 `captureos-plus_*`。换目录执行 compose 前先确认项目名。

### 生产排障速查

| 现象 | 常见根因 | 处理 |
|---|---|---|
| 前端正常、API 全 500 | 模型加了字段但没跑迁移 | `alembic upgrade head` 后重启 backend |
| 搜索 500，其他接口正常 | 依赖注入漏传 `user_id` | 查看 backend 日志定位，修复后重建 |
| 上传附件后被踢登录 | 请求头覆盖了 `Authorization` | 合并 headers，不要整体替换 |
| 改 `.env.prod` 密码后 db 认证失败 | 数据卷里仍是旧密码 | 备份后重建数据库卷（危险操作） |
| 恢复备份后新建报 duplicate key | `pg_restore` 未校准序列 | 对每张表 `setval(..., MAX(id))` |
| 看到两套容器 / 端口冲突 | compose 漏了 `-f` | 用 `docker inspect` 查 `com.docker.compose.project.config_files` |
| 旧 `captureos-nginx` 容器起不来 | 宿主机 nginx 已占 80 | 停用并删除旧容器，从 compose 移除该服务 |
| 构建报 buildx 挂载不存在 | multiarch builder 损坏 | `docker buildx rm multiarch` 后重跑 |

---

## 📁 项目结构

```
CaptureOS-plus/
├── backend/                          # 后端服务
│   ├── app/
│   │   ├── api/                      # API 路由层
│   │   │   ├── __init__.py          # 路由注册
│   │   │   ├── base.py              # 通用 CRUD 工厂
│   │   │   ├── deps.py              # 依赖注入
│   │   │   ├── projects.py          # 项目接口 (+ /related)
│   │   │   ├── experiences.py       # 经验接口 (+ /related)
│   │   │   ├── issues.py            # 问题接口 (+ /related)
│   │   │   ├── solutions.py         # 解决方案接口 (+ /related)
│   │   │   ├── knowledge.py         # 知识接口 (+ /related)
│   │   │   ├── decisions.py         # 决策接口 (+ /related)
│   │   │   ├── reviews.py           # 复盘接口 (+ /related)
│   │   │   ├── tags.py              # 标签接口
│   │   │   ├── relations.py         # 关系接口
│   │   │   ├── suggestions.py       # 关联推荐接口
│   │   │   ├── entity_relations.py  # 实体关联公共逻辑
│   │   │   ├── search.py            # 搜索接口 (ILIKE + pg_trgm)
│   │   │   ├── timeline.py          # 时间线接口 (+ 链路聚合)
│   │   │   ├── dashboard.py         # 仪表盘接口
│   │   │   ├── export.py            # JSON 导出（含附件元数据）
│   │   │   ├── export_word.py       # Word 导出
│   │   │   ├── import_data.py       # JSON 导入（ID 重映射）
│   │   │   ├── upload.py            # 附件上传
│   │   │   └── file_attachments.py  # 附件查询/下载/删除
│   │   ├── auth/                     # 认证（deps / security / captcha）
│   │   ├── models/                   # 数据库模型
│   │   ├── schemas/                  # Pydantic 数据模式
│   │   ├── backup.py                # 备份触发逻辑（lifespan 钩子）
│   │   ├── config.py                # 配置管理
│   │   ├── database.py              # 数据库连接
│   │   └── main.py                  # FastAPI 入口
│   ├── alembic/                      # 数据库迁移（001~015）
│   │   └── versions/
│   │       ├── 001_initial_tables.py        # 初始表结构
│   │       ├── ...
│   │       ├── 011_add_file_attachment_table.py  # 附件表
│   │       ├── 012_add_solution_status.py        # 解决方案状态
│   │       ├── 013_add_attachments_column.py     # 实体附件元数据字段
│   │       ├── 014_add_users_and_user_id.py      # 多用户 + 各表 user_id（含清空逻辑，执行前必备份）
│   │       └── 015_add_display_name_to_users.py  # 用户备注字段
│   ├── uploads/                      # 附件存储（gitignore，不进镜像）
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/                         # 前端服务
│   ├── src/
│   │   ├── app/                      # Next.js 页面
│   │   │   ├── page.tsx             # 仪表盘
│   │   │   ├── layout.tsx           # 布局
│   │   │   ├── projects/            # 项目页面
│   │   │   │   ├── page.tsx         # 列表页
│   │   │   │   └── [id]/page.tsx    # 详情页 (Project Hub)
│   │   │   ├── issues/              # 问题页面
│   │   │   ├── solutions/           # 解决方案页面
│   │   │   ├── knowledge/           # 知识页面
│   │   │   ├── decisions/           # 决策页面
│   │   │   ├── reviews/             # 复盘页面
│   │   │   ├── experiences/         # 经验页面
│   │   │   ├── tags/                # 标签页面
│   │   │   ├── timeline/            # 时间线页面 (链路/列表)
│   │   │   └── search/              # 搜索页面（状态保持）
│   │   ├── components/               # 共享组件
│   │   │   ├── Sidebar.tsx          # 侧边栏导航（角标 + 移动端抽屉）
│   │   │   ├── EntityForm.tsx       # 通用表单组件（含附件上传）
│   │   │   ├── EntityList.tsx       # 通用列表组件（分页 + 批量操作）
│   │   │   ├── EntityDetail.tsx     # 通用详情页组件（含附件列表）
│   │   │   ├── RelationPicker.tsx   # 关联选择弹窗
│   │   │   ├── SuggestionBar.tsx    # 关联推荐提示栏
│   │   │   ├── TagPicker.tsx        # 标签选择弹窗
│   │   │   ├── ExportButton.tsx     # 导出按钮（Word/JSON 弹窗）
│   │   │   ├── ConfirmDialog.tsx    # 自定义确认弹窗
│   │   │   ├── Toast.tsx            # Toast 提示
│   │   │   ├── Loading.tsx          # 加载 Spinner
│   │   │   ├── Pagination.tsx       # 分页导航
│   │   │   ├── FilterBar.tsx        # 筛选栏
│   │   │   └── BeijingTime.tsx      # 北京时间（防重渲染）
│   │   └── lib/
│   │       ├── api.ts               # API 工具函数（动态推断后端地址）
│   │       ├── constants.ts         # 全局颜色/选项常量
│   │       └── time.ts              # 时间格式化
│   ├── Dockerfile
│   ├── next.config.js
│   └── package.json
├── scripts/
│   ├── backup.sh                     # 备份脚本（SQL + uploads 打包，幂等）
│   ├── restore.sh                    # 恢复脚本（整库原样还原）
│   └── start-captureos.sh            # 启动逻辑（被 start-captureos.bat 调用）
├── backups/                          # 备份输出目录（gitignore）
├── deploy/                           # 公网服务器部署（与本地完全独立）
│   ├── docker-compose.build.yml      # 服务器本地构建（当前实际使用）
│   ├── docker-compose.prod.yml       # ACR 镜像版
│   ├── .env.prod.example             # 生产变量模板（.env.prod 不入库）
│   ├── init.sh / deploy.sh           # 首次部署 / 日常更新
│   ├── nginx/example.com.conf       # 宿主机 nginx 反代配置
│   └── scripts/backup.sh             # 生产备份脚本
├── docker-compose.yml              # 源码构建配置（含 backup sidecar）
├── docker-compose.pull.yml         # 预构建镜像配置
├── start-captureos.bat              # Windows 一键启动（含备份触发）
├── push.sh                          # 构建+推送镜像脚本（开发者用）
├── VERSIONS.md                      # 镜像版本记录
├── .gitignore
└── README.md
```

---

## 📡 API 接口

### 认证接口（生产模式）

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/config` | `GET` | 公开接口，返回 `{"single_user_mode": true/false}`，前端据此决定是否要求登录 |
| `/api/auth/captcha` | `GET` | 获取图片验证码，响应头 `X-Captcha-Id` 返回验证码 ID |
| `/api/auth/login` | `POST` | 登录：校验验证码 + 密码，签发 JWT |
| `/api/auth/me` | `GET` | 获取当前登录用户 |
| `/api/auth/users` | `GET/POST` | 用户列表 / 创建用户（仅管理员，不开放注册） |
| `/api/auth/users/{id}` | `PUT` | 更新用户密码 / 备注 / 启用状态（仅管理员） |

> 本地 `SINGLE_USER_MODE=true` 时后端自动以 `admin` 身份执行，无需任何鉴权头；生产 `SINGLE_USER_MODE=false` 时所有实体接口都要求 `Authorization: Bearer <token>`，数据按 `user_id` 隔离。

### 实体 CRUD 接口

每个实体模块都支持标准的 CRUD 操作 + 关联查询：

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/{entities}/` | `GET` | 获取列表（支持分页） |
| `/api/{entities}/` | `POST` | 创建 |
| `/api/{entities}/{id}` | `GET` | 获取单条 |
| `/api/{entities}/{id}` | `PUT` | 更新 |
| `/api/{entities}/{id}` | `DELETE` | 删除 |
| `/api/{entities}/count/` | `GET` | 获取总数 |
| `/api/{entities}/{id}/related` | `GET` | **获取所有关联实体** |

> `{entities}` 可选：projects, experiences, issues, solutions, knowledge, decisions, reviews

### 关联推荐接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/suggestions/{type}/{id}` | `GET` | 基于共享标签推荐可能关联的实体 |

### 关系管理接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/relations/` | `GET` | 查询关联（支持 source/target 过滤） |
| `/api/relations/` | `POST` | 创建关联 |
| `/api/relations/{id}` | `DELETE` | 删除关联 |
| `/api/relations/types/` | `GET` | 获取关系类型 |

### 其他接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/tags/` | `GET/POST` | 标签管理 |
| `/api/tags/assign` | `POST` | 给实体打标签 |
| `/api/search/?q=` | `GET` | 搜索（ILIKE + pg_trgm，支持类型/标签/日期组合筛选） |
| `/api/timeline/` | `GET` | 时间线（扁平列表） |
| `/api/timeline/chains` | `GET` | **时间线链路聚合** |
| `/api/dashboard/` | `GET` | 仪表盘数据 |
| `/api/dashboard/counts` | `GET` | 侧边栏角标计数（轻量） |

### 数据导出 / 导入接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/export/` | `GET` | JSON 全量导出（含附件元数据） |
| `/api/export/word/` | `GET` | Word 导出（全部模块） |
| `/api/export/word/{entity_type}` | `GET` | Word 导出（单模块） |
| `/api/export/word/{entity_type}/selected` | `POST` | Word 导出（勾选条目） |
| `/api/import/` | `POST` | JSON 导入（ID 重映射 + 按标题去重） |

### 附件接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/upload/` | `POST` | 上传附件（表单建好后关联实体） |
| `/api/upload/to-entity` | `POST` | 上传并直接挂到指定实体 |
| `/api/file-attachments/entity/{type}/{id}` | `GET` | 查询实体的附件列表 |
| `/api/file-attachments/{file_id}` | `GET` | 下载附件 |
| `/api/file-attachments/{file_id}` | `DELETE` | 删除附件 |

### 预设关系类型

系统内置 8 种关系类型：

| 关系 | 说明 | 反向 |
|------|------|------|
| `related_to` | 通用关联 | `related_to` |
| `depends_on` | 依赖于 | `depended_by` |
| `blocks` | 阻塞 | `blocked_by` |
| `caused_by` | 导致 | `causes` |
| `solved_by` | 被...解决 | `solves` |
| `learned_from` | 从...学到 | `taught_to` |
| `part_of` | 属于 | `contains` |
| `follows` | 继...之后 | `precedes` |

---

## 🔧 开发指南

### 本地开发

```bash
# 启动服务（源码构建，支持热重载）
docker compose up -d

# 查看日志
docker compose logs -f backend
docker compose logs -f frontend

# 停止服务
docker compose down

# 重建镜像（代码修改后）
docker compose up -d --build
```

### 发布新版本（推送到阿里云 ACR）

#### 前置准备：配置阿里云凭证

1. 登录 [阿里云容器镜像服务](https://cr.console.aliyun.com/)，创建命名空间（如 `captureos`）
2. 获取 AccessKey ID 和 AccessKey Secret（或 Registry 密码）
3. 在项目根目录创建 `.env` 文件：

```bash
ACR_USERNAME=你的AccessKeyID
ACR_PASSWORD=你的AccessKeySecret
```

> ⚠️ `.env` 文件已在 `.gitignore` 中，不会提交到 GitHub。

#### 发布流程

```bash
# 1. 代码修改并测试通过后，提交到 GitHub
git add . && git commit -m "feat: 新功能" && git push

# 2. 构建并推送到阿里云镜像仓库（自动递增版本号）
bash push.sh

# 或指定版本号
bash push.sh 1.3
```

**push.sh 脚本会自动：**
- 检测阿里云登录状态，未登录则自动登录
- 构建前后端镜像，同时打 `latest` 和版本号（如 `v1.2`）两个标签
- 推送到阿里云 ACR（国内 CDN 加速）
- 更新 `VERSIONS.md` 版本记录并自动提交

#### 别人更新

```bash
# 拉取最新版本
docker compose -f docker-compose.pull.yml pull
docker compose -f docker-compose.pull.yml up -d

# 拉取指定版本（如 v1.1）
BACKEND_TAG=v1.1 FRONTEND_TAG=v1.1 docker compose -f docker-compose.pull.yml pull
BACKEND_TAG=v1.1 FRONTEND_TAG=v1.1 docker compose -f docker-compose.pull.yml up -d
```

### 公网服务器更新

公网部署与本地完全独立，完整说明见 [公网部署（生产环境）](#deploy-production)。

```bash
# 服务器本地构建（当前实际使用）
cd /opt/CaptureOS && git pull origin main
cd deploy
docker compose --env-file .env.prod -f docker-compose.build.yml up -d --build backend frontend
docker compose --env-file .env.prod -f docker-compose.build.yml exec -T backend alembic upgrade head  # 有新迁移时

# 验证
curl -s https://example.com/health
```

> 备注：服务器是 arm64，本地跨架构构建慢，因此优先在服务器本地构建；若走 ACR 镜像，`push.sh` 必须同时构建 `linux/amd64` 与 `linux/arm64`。

### 数据库操作

```bash
# 进入后端容器
docker compose exec backend bash

# 运行迁移
alembic upgrade head

# 创建新迁移（自动生成）
alembic revision --autogenerate -m "add new field"

# 回滚迁移
alembic downgrade -1
```

### 重置数据库

```bash
# 停止服务并删除数据
docker compose down -v

# 重新启动
docker compose up -d

# 重新运行迁移
docker compose exec backend alembic upgrade head
```

---

## 🐛 常见问题

### 1. 端口被占用

修改 `docker-compose.yml` 或 `docker-compose.pull.yml` 中的端口映射：

```yaml
services:
  backend:
    ports:
      - "8002:8000"  # 改为其他端口
  frontend:
    ports:
      - "3001:3000"  # 改为其他端口
```

### 2. 构建速度慢

**推荐方案**：使用预构建镜像，无需本地构建：
```bash
docker compose -f docker-compose.pull.yml up -d
```

### 3. 数据库连接失败

确保 PostgreSQL 容器已完全启动：

```bash
docker compose ps          # 检查容器状态
docker compose logs db     # 查看数据库日志
```

### 4. 手机/局域网访问加载不全

前端会自动根据访问地址请求后端 API。确保：
- 后端 CORS 已设置为允许所有来源（已默认配置）
- 使用电脑的局域网 IP 访问（如 `http://192.168.1.100:3000`）
- 不要用 `localhost`（手机上的 localhost 指向手机自身）

### 5. 如何回滚到旧版本

查看 `VERSIONS.md` 文件获取所有可用版本，然后指定版本拉取：

```bash
# Linux / macOS / WSL / Git Bash
BACKEND_TAG=v1.0 FRONTEND_TAG=v1.0 docker compose -f docker-compose.pull.yml pull
BACKEND_TAG=v1.0 FRONTEND_TAG=v1.0 docker compose -f docker-compose.pull.yml up -d

# Windows PowerShell
$env:BACKEND_TAG="v1.0"; $env:FRONTEND_TAG="v1.0"; docker compose -f docker-compose.pull.yml pull
$env:BACKEND_TAG="v1.0"; $env:FRONTEND_TAG="v1.0"; docker compose -f docker-compose.pull.yml up -d
```

### 6. 公网前端能打开，但 API 全部 500

模型新增了字段但数据库没执行对应迁移（例如 `projects.attachments` 对应的 `013`）。在生产目录执行：

```bash
docker compose --env-file .env.prod -f docker-compose.build.yml exec -T backend alembic upgrade head
docker compose --env-file .env.prod -f docker-compose.build.yml restart backend
```

> 原则：模型改动必须配 Alembic 迁移，不能只改模型不写迁移。

### 7. 服务器上执行 compose 后"数据没了"

多半是漏了 `-f` 参数：Compose 向上找到仓库根目录的本地 `docker-compose.yml`，用另一个项目名起了一套新容器，原容器仍在但 `ps` 看不到。用下面的命令确认：

```bash
docker ps -a | grep captureos
docker inspect captureos-backend --format '{{ index .Config.Labels "com.docker.compose.project" }} {{ index .Config.Labels "com.docker.compose.project.config_files" }}'
```

确认后统一使用完整前缀：`docker compose --env-file .env.prod -f docker-compose.build.yml ...`。**不要为了"清理"删除 `deploy_postgres_data` 卷。**

### 8. 修改 `.env.prod` 数据库密码后，db 认证失败

`postgres_data` 持久化卷里保留的是旧密码，改环境变量不会更新库内用户密码。处理方式（危险，先确认备份）：

```bash
docker compose --env-file .env.prod -f docker-compose.build.yml down
docker volume rm deploy_postgres_data
docker compose --env-file .env.prod -f docker-compose.build.yml up -d
docker compose --env-file .env.prod -f docker-compose.build.yml exec -T backend alembic upgrade head
```

### 9. 恢复备份后新建记录报 duplicate key

`pg_restore` 只恢复了行数据，序列没有推进。恢复后对每张表校准序列：

```sql
SELECT setval('knowledge_id_seq', (SELECT COALESCE(MAX(id),1) FROM knowledge));
-- 同样处理 projects/issues/solutions/decisions/experiences/reviews/tags/relations/entity_tags/file_attachments/users
```

### 10. 访问域名返回 502 / 521

- 502：源站 nginx 没启动、配置错误，或 `proxy_pass` 指向的 `127.0.0.1:3003` / `127.0.0.1:8000` 没有服务。先 `nginx -t`、`curl 127.0.0.1:8000/health`、`docker ps`。
- 521：Cloudflare 连不上源站 80，检查服务器防火墙/安全组是否放行 80、nginx 是否监听 `0.0.0.0:80`。

---

## 📋 项目演进记录

记录从项目启动到现在的每一次关键改动，以及背后的原因和效果。

### 第一阶段：基础 CRUD（v1）

**做了什么：** 建立了 7 个核心实体模块（项目、经验、问题、解决方案、知识、决策、复盘），每个模块支持标准的增删改查。使用通用 CRUD 工厂模式，后端一个函数生成 6 个 API 端点，前端一个 `EntityList` 组件渲染所有列表页。

**为什么：** 先把数据结构和基本操作跑通，再迭代优化。不追求一步到位。

**效果：** 能记录、能查看、能编辑、能删除。但各模块之间完全孤立，信息是散落的。

---

### 第二阶段：标签系统

**做了什么：** 建立了多态标签系统——任意实体都可以打标签。标签有名称、颜色、等级（1-5），通过 `entity_tags` 多态关联表连接。

**为什么：** 分类是组织信息的第一步。没有标签，7 个模块的数据就是一堆平铺的列表。

**效果：** 可以给问题打 `#部署`，给知识打 `#Docker`，给决策打 `#紧急`。标签成为后续关联推荐的基础。

---

### 第三阶段：实体关联 + 详情页

**做了什么：**
- 后端已有 `relations` 表和 8 种预置关系类型（solved_by、caused_by、learned_from 等），但前端从未使用
- 新建了 `EntityDetail` 通用详情页组件，展示实体完整信息 + 关联实体
- 新建了 `RelationPicker` 关联选择弹窗，支持创建和删除关联
- 新建了 `SuggestionBar` 推荐栏，基于共享标签自动推荐可能关联的实体
- 7 个实体都新增了 `GET /{id}/related` 聚合端点
- 列表页全部加入「查看」按钮，跳转到详情页

**为什么：** 信息孤岛是个人知识管理系统的致命问题。一个「Docker 502 问题」如果不能关联到「解决方案→知识→决策→复盘」，它就只是一条孤立的记录，没有形成成长链路。

**效果：** 问题详情页能看到"谁解决了它、沉淀了什么知识、做了什么决策"。信息从散点变成了网络。

---

### 第四阶段：数据库索引 + 全文搜索

**做了什么：**
- 为 7 张核心表创建了 GIN 全文索引（tsvector）
- 为 entity_tags.tag_id、issues.status、projects.status 等创建了 B-tree 索引
- 为所有日期字段创建了索引（Timeline 筛选用）
- 搜索 API 从 ILIKE 升级为 tsvector/tsquery 全文检索
- 后发现 tsvector 对中文分词无效（按空格分词，中文无空格），改回 ILIKE + pg_trgm 索引

**为什么：** 数据量增长后，没有索引的查询会变慢。全文搜索是找信息的核心能力。

**效果：** 搜索能精确匹配中文子串（搜"睡觉"能找到"早点睡觉"）。所有常见查询都有索引加速。

---

### 第五阶段：时间线 + 链路聚合

**做了什么：**
- 时间线从 5 种实体扩展到 7 种（加入 Solution 和 Knowledge）
- 新增 `/timeline/chains` 端点，用 Union-Find 算法把有关系的实体聚合成链路
- 前端支持「链路视图」和「列表视图」切换
- 链路视图中，关联的实体折叠成一条，点击展开看完整链路
- 加入快捷日期按钮（今天/本周/本月/全部）

**为什么：** 时间线不应该是散点图，而应该是成长轨迹。链路聚合让用户一眼看到"问题→方案→知识→决策→复盘"的完整因果链。

**效果：** 时间线从"一堆按时间排列的条目"变成了"有因有果的成长故事"。

---

### 第六阶段：仪表盘升级

**做了什么：**
- 从"数字墙"（7 个模块各显示一个总数）改为行动导向的四区块布局
- **待处理**：自动筛选待解决问题、待执行决策、待确认知识，可直接点击跳转
- **风险提醒**：自动检测孤立问题（无方案）、长期未更新项目、无来源知识
- **概览**：按状态分组计数（替代纯数字统计）
- **最近动态**：跨所有实体合并，按时间倒序

**为什么：** 仪表盘应该回答"我现在最应该关注什么"，而不是"数据库里有多少条数据"。

**效果：** 每次打开系统，第一眼就能看到需要处理的事项和被遗漏的风险。

---

### 第七阶段：字段优化

**做了什么：**
- 优先级从数字改为汉字标签（🔴紧急 🟠高 🟡中 🟢低），下拉选择
- 置信度从 0-1 小数改为 0-10 整数（输入 7 = 70%）
- 知识新增状态：待确认 / 已验证 / 已过时
- 决策新增状态：待执行 / 执行中 / 已完成 / 已废弃
- 新建时日期字段自动填今天
- 新建/编辑表单从内联卡片改为居中弹窗，支持点 × 和空白区域关闭

**为什么：** 数字优先级不直觉（1 是高还是低？），0-1 置信度要心算百分比，没有状态的知识和决策无法追踪生命周期。

**效果：** 表单填写更快更直觉，数据有状态流转，仪表盘能按状态筛选待处理事项。

---

### 第八阶段：搜索优化

**做了什么：**
- 搜索页加入类型筛选下拉框，可锁定只搜某一类实体
- 搜索结果按类型分组展示
- 搜索结果可点击跳转到详情页

**为什么：** 全局搜索结果混在一起时，找特定类型的内容很困难。

**效果：** 搜"Docker"可以只看问题，或只看知识，精准定位。

---

### 第九阶段：标签增强 + 交互优化 + 项目字段扩展

**做了什么：**
- **标签软删除**：新增 `is_active` 字段，有关联的标签删除时自动停用而非物理删除，保留历史数据完整性
- **删除前确认**：点击删除标签时显示关联实体数量，让用户知道影响范围
- **标签创建智能恢复**：创建同名标签时自动恢复已停用的标签，而非报错
- **搜索支持标签筛选**：搜索页新增标签下拉框，可按标签、类型、关键词任意组合搜索
- **搜索无关键词模式**：不输入关键词也能通过类型/标签筛选浏览所有内容
- **列表行直接点击**：所有列表行可直接点击跳转详情页，悬停有视觉反馈
- **操作按钮事件隔离**：打标签、编辑、删除等按钮不再误触发行跳转
- **时间线点击跳转**：时间线的事件卡片和链路子事件均可点击进入详情
- **标签数字优化**：标签等级数字改为 `text-sm font-extrabold`，更醒目
- **标签加号固定**：打标签的 "+" 按钮固定在右侧，不再随标签换行
- **详情页字段中文化**：所有详情页字段名显示中文（描述、状态、优先级等）
- **项目新字段**：新增源文件地址、GitHub 地址、使用工具（下拉框：Claude Code/qclaw/手写/AI辅助）、运行方式、技术栈
- **修复 API 路由**：统一 knowledge 前缀为复数，修复 EntityDetail 和 RelationPicker 的 API 路径映射

**为什么：** 标签是分类和关联的基础，但删除标签会丢失历史关联数据。搜索缺少标签维度导致筛选不灵活。列表和时间线不能直接点击导致操作路径过长。项目缺少源文件和工具信息导致无法追溯开发过程。

**效果：** 标签数据更安全，搜索更灵活，交互更直觉，项目信息更完整。

---

### 第十阶段：数据导出 + 分页 + 批量操作 + 移动端适配

**做了什么：**
- **数据导出**：仪表盘新增「📥 导出数据」按钮，一键导出全部数据为 JSON 备份文件
- **列表分页**：7 个实体列表页全部支持分页（每页 20 条），底部显示页码导航
- **批量操作**：列表页支持多选 checkbox，可批量删除和批量打标签
- **移动端适配**：侧边栏手机端抽屉式展开、列表变卡片布局、弹窗响应式宽度

**为什么：** 没有备份功能数据不安全，列表一次加载全部数据会卡顿，逐条操作效率低，手机端完全不可用。

**效果：** 数据可备份，大数据量下流畅，批量操作高效，手机端可用。

---

### 第十一阶段：搜索高亮 + 通知提醒

**做了什么：**
- **搜索关键词高亮**：搜索结果的标题和摘要中，匹配关键词用黄色背景高亮
- **侧边栏角标**：问题、决策、知识菜单项旁显示待处理数量（红色圆点）
- **仪表盘提醒横幅**：有待处理事项时，顶部显示提醒条

**为什么：** 搜索结果看不出关键词在哪，待处理事项没有主动提醒容易遗漏。

**效果：** 搜索定位更精准，待处理事项一目了然。

---

### 第十二阶段：时间线优化 + 全量 datetime 升级

**做了什么：**
- **时间线精确到分钟**：显示记录创建的实际时间，不再只显示日期
- **时间线按模块排序**：先按实体类型分组，再按时间倒序
- **链路视图时间**：收起显示最新创建时间，展开显示每步创建时间
- **全量 datetime 升级**：所有日期字段（项目开始/结束、经验事件、方案实施、决策、复盘）从 DATE 改为 DateTime，支持精确到分钟
- **新建记录默认当前时间**：datetime 字段新建时自动填入当前时间
- **时间线默认显示今天**：打开时间线默认筛选今天的记录
- **搜索添加日期范围**：搜索页新增日期筛选（今天/本周/本月/自定义）

**为什么：** 日期只精确到天不够用，时间线排序逻辑不清晰，搜索缺少时间维度。

**效果：** 时间精确到分钟，时间线按模块清晰分组，搜索支持任意条件组合。

---

### 第十三阶段：性能优化

**做了什么：**
- **BeijingTime 防重渲染**：改用 ref 直接更新 DOM，不再触发整个侧边栏每秒重渲染
- **SWR 全局配置**：添加 SWRConfig Provider，dedupingInterval 5 秒，revalidateOnFocus 关闭
- **tags 缓存优化**：/tags/ 60 秒不去重，/tags/entity/ 30 秒不去重
- **getEntityTags memo**：用 useMemo 预计算标签映射，避免每次渲染重复计算
- **批量操作并行化**：Promise.all 并行发送请求，批量删除/打标签速度提升 10 倍
- **侧边栏轻量 API**：新增 /dashboard/counts 端点，只返回 3 个数字
- **时间线加载限制**：链路视图和列表视图最多加载 200 条记录

**为什么：** 数据增多后页面切换卡顿，BeijingTime 每秒重渲染是主要瓶颈，批量操作串行太慢。

**效果：** 页面切换流畅，批量操作秒级完成，侧边栏加载从 7+ 查询降到 3 个 COUNT。

---

### 第十四阶段：Docker 预构建镜像 + 部署优化 + UI 细节修复

**做了什么：**
- **Docker 预构建镜像**：将前后端镜像推送到阿里云容器镜像服务（ACR），国内 CDN 加速，别人 pull 即可使用，无需本地构建
- **版本管理**：每次推送同时打 `latest` 和版本号（如 `v1.1`）两个标签，支持回滚到指定版本；push.sh 脚本自动递增版本号并更新 VERSIONS.md
- **docker-compose.pull.yml**：新增预构建镜像部署配置，通过环境变量 `${BACKEND_TAG:-latest}` 支持版本选择
- **README 重构**：明确区分"部署方式"（预构建/源码构建）和"运行方式"（Linux/Windows bat/手机访问），命令区分 Linux/Windows/macOS
- **详情页长文本展开**：长文本字段（描述、根本原因、内容等）独占整行完全展开，短字段保持网格布局
- **关联防重复**：SuggestionBar 点击后按钮变"✅ 已关联"并禁用，RelationPicker 已关联实体灰色禁用+成功提示
- **表单验证**：effectiveness（有效性）和 rating（评分）改为下拉框（1-5），后端 Pydantic 校验范围
- **CORS 允许局域网**：后端 CORS 改为 `allow_origins=["*"]`，支持手机/局域网访问
- **API 动态地址**：前端 api.ts 根据 `window.location.hostname` 动态获取后端地址，局域网访问自动适配
- **Favicon**：蓝紫渐变准星图标，代表 Capture（捕获）+ OS（系统）
- **知识库录入**：录入 12 条知识（Docker 层缓存、WSL2 网络、CORS 原理、ACR 推送、版本管理等），形成完整的问题→方案→知识链路

**为什么：** 别人 clone 后构建太慢（5-10 分钟），Docker Hub 国内访问慢且免费版 token 权限受限，需要一个国内可直接拉取的镜像源。同时修复了一批 UI 交互细节问题。

**效果：** 别人 pull 镜像 2-3 分钟即可启动，支持版本回滚，手机局域网可访问，详情页阅读体验提升，关联操作有明确反馈。

---

### 第十五阶段：UI 交互全面优化

**做了什么：**
- **搜索结果显示时间**：搜索结果新增创建时间显示，格式与时间线一致（北京时间）
- **详情页时间修复**：详情页日期字段改为北京时间格式，与列表页保持一致
- **加载动画**：所有页面的加载状态从纯文字改为旋转 Spinner 动画
- **自定义 Confirm 弹窗**：替换所有浏览器原生 confirm() 为美观的自定义弹窗，支持 danger/warning/info 三种样式
- **Toast 提示**：操作成功/失败时显示 Toast 提示（2.5秒自动消失），替换所有 alert()
- **统一操作反馈**：新建、编辑、删除、导出等操作都有明确的成功/失败提示

**为什么：** 浏览器原生弹窗样式丑陋且不统一，操作成功后无反馈让用户不确定是否成功，加载状态只有纯文字不够直观。

**效果：** UI 交互更专业，操作有明确反馈，用户体验显著提升。

---

### 第十六阶段：批量改状态 + 筛选颜色优化 + 移动端适配

**做了什么：**
- **批量改状态**：列表页新增「🔄 批量改状态」按钮，勾选多条记录后一键切换状态（问题/项目/知识/决策均支持），带二次确认
- **筛选栏颜色优化**：修复 Tailwind 未扫描 `src/lib/` 导致部分状态 chip 颜色不生效的问题；已关闭→石灰色、已取消→粉红色、待执行→琥珀色、待确认→靛蓝色，各状态颜色鲜明区分
- **下拉菜单点击外部关闭**：批量打标签和批量改状态的下拉菜单，点击页面其他区域自动关闭
- **移动端批量操作适配**：批量操作栏在手机端竖排布局，按钮自动换行，不再溢出屏幕

**为什么：** 逐条编辑状态效率太低，筛选栏部分状态颜色透明看不清，下拉菜单关闭交互不自然，手机端批量操作布局拥挤。

**效果：** 批量操作效率提升 10 倍，所有状态颜色清晰可辨，交互更自然，移动端体验完善。

---

### 第十七阶段：附件系统 + 性能优化 + 安全加固

**做了什么：**
- **附件上传系统**：新建/编辑实体时支持上传附件，详情页展示附件列表，支持下载和删除
- **异步文件上传**：编辑时选择文件立即上传，无需等待保存，提升用户体验
- **N+1查询修复**：修复 `entity_relations.py` 和 `suggestions.py` 的N+1查询问题，改为批量查询，性能提升80%+
- **CORS安全加固**：从 `allow_origins=["*"]` 改为使用配置的域名列表，支持正则表达式匹配局域网地址
- **异步数据库会话**：将 `upload.py` 和 `file_attachments.py` 从同步DB改为异步DB，避免阻塞事件循环
- **数据库会话修复**：删除有问题的 `get_sync_db` 函数，统一使用异步会话，避免内存泄漏
- **生产环境配置**：移除Docker配置中的 `--reload`、`DEBUG: "true"`、暴露数据库端口等不安全配置
- **列表默认排序**：所有列表接口添加 `ORDER BY created_at DESC`，数据按创建时间倒序显示
- **取消选择功能修复**：修复批量操作的"取消选择"按钮，添加明确的UI样式和确认提示
- **文件名唯一性**：文件上传使用 `{hash}_{uuid}_{original_name}` 格式，避免重名冲突
- **附件大小显示**：修复附件列表中文件大小不显示的问题，统一使用 `file_size` 字段

**为什么：** 附件功能是记录和分享的重要能力，N+1查询和同步DB会话严重影响性能，CORS配置过于宽松存在安全风险，生产环境配置不规范可能导致安全漏洞。

**效果：** 附件系统完整可用，性能大幅提升（N+1查询优化80%+），系统更安全（CORS、异步DB、生产配置），用户体验更好（即时上传、默认排序、取消选择）。

---

### 第十八阶段：解决方案状态字段 + Windows 启动脚本（v1.8）

**做了什么：**
- **解决方案状态字段**：Solution 新增 `status` 字段（待采用/已采用/已废弃），迁移 012，列表页支持状态筛选，与知识、决策的状态流转对齐
- **状态常量前缀隔离**：constants.ts 中解决方案的 pending/deprecated 与决策的同名状态用 `solution.` 前缀区分，避免颜色映射互相覆盖
- **start-captureos.bat**：Windows 一键启动脚本，自动完成"检查 Docker → 启动服务 → 等待就绪 → 打开浏览器"四步（后续在第十九阶段加入第 5 步备份触发）
- **直接调 Windows 版 docker compose**：不再走 `wsl -e bash -c`，启动链路更短，依赖更少

**为什么：** 方案登记后没有生命周期，"这个方案后来用了没有"无从追踪；每次开机手动敲命令启动服务太繁琐。

**效果：** 方案有状态闭环，Windows 双击即可启动整套系统。

---

### 第十九阶段：搜索修复 + JSON 导出导入闭环 + 自动备份机制

**做了什么：**
- **搜索页状态保持**：搜索关键词、类型、标签、日期条件同步到 URL query + sessionStorage，从搜索结果跳详情页再返回不丢失
- **搜索过滤下推 SQL**：日期/标签过滤从"先 LIMIT 20 再内存过滤"改为下推 WHERE 再 LIMIT，修复过滤后结果缺失的问题；同时把前端传入的北京时间日期转成带时区边界再与 UTC timestamptz 比较，修复 ±8 小时边界数据丢失
- **导出格式统一弹窗**：ExportButton 改为弹窗选择 Word 或 JSON 一种格式，避免页面上堆多个导出按钮
- **JSON 导出导入闭环**：JSON 导出补充 `file_attachments` 附件元数据；导入端做 entity_id 重映射（旧 ID → 新 ID，关联关系不丢）+ safe_name 附件去重，补上了"有导入无导出"的功能断头路
- **自动备份机制（三层触发）**：backup sidecar 容器（`docker:24-cli` 镜像挂 docker socket，直接 `docker exec` 调 db 容器的 pg_dump，不侵入 backend 镜像）+ FastAPI lifespan 启动钩子 + start-captureos.bat 第 5 步，谁先执行谁备份
- **备份幂等 + 保留策略**：同一天只备份一次（按当日文件是否存在判断），自动保留最近 14 天（按 mtime 清理）
- **备份/恢复脚本**：`scripts/backup.sh` 生成 `captureos-YYYY-MM-DD.sql`（pg_dump custom 格式）+ `captureos-YYYY-MM-DD-uploads.tar.gz`（附件打包）；`scripts/restore.sh` 一键整库原样还原（含原 ID）
- **类型修复**：constants.ts 重复键覆盖问题 + 20 处 TS 类型错误修复
- **启动脚本修复**：start-captureos.bat 重构为 5 行纯 ASCII 启动器，全部逻辑（Docker 检查/compose 启动/等待就绪/打开浏览器/备份）移入 `scripts/start-captureos.sh`。原因：bat 里写中文在 chcp 65001 下解析不稳（echo 行被拆开报 is not recognized），且 cd /d \\wsl.localhost UNC 路径不可行（CMD 不支持）；编辑器保存改动行尾/BOM 后问题复发。.sh 原生 UTF-8+LF 无此问题

**为什么：** 搜索筛选条件在 LIMIT 之后才应用导致结果不准，UTC/北京时间差 8 小时导致边界数据丢失；只有 Word 导出没有 JSON 导出，已有的 JSON 导入功能成为断头路，数据无法跨实例迁移；系统每天使用但没有备份，一旦误删 `docker compose down -v` 数据全丢。

**效果：** 搜索结果准确且返回不丢状态，数据可以完整导出-迁移-导入形成闭环，每天首次启动自动备份，14 天内任意一天可整库还原。

---

### 第二十阶段：公网部署 + 多用户认证（v1.18）

**做了什么：**
- **公网部署**：新增 `deploy/` 目录（`docker-compose.build.yml` / `docker-compose.prod.yml`、`.env.prod.example`、`init.sh` / `deploy.sh`、宿主机 nginx 配置、备份脚本），在公网 VPS（arm64）上线 <https://example.com>
- **HTTPS 方案**：Cloudflare 以 Flexible 模式终止 TLS，回源到源站 80；源站用宿主机原生 nginx 反代，完全避开被其他服务占用的 443
- **端口重排**：frontend 绑定 `127.0.0.1:3003`（避开服务器已有服务的 3000）；backend `127.0.0.1:8000`；db `127.0.0.1:5432` 仅回环，供 Navicat 走 SSH 隧道
- **多用户认证**：新增 `users` 表，所有实体与 tags 增加 `user_id` 外键；bcrypt 密码哈希、图片验证码、JWT（HS256 / 7 天）、登录页、前端路由守卫、退出登录
- **双模式开关**：`SINGLE_USER_MODE=true` 本地免登录（自动归属 admin）；`false` 生产必须登录。前端通过 `GET /api/auth/config` 运行时判断，避免 `NEXT_PUBLIC_*` 构建时固化
- **数据库迁移**：`014_add_users_and_user_id.py`（用户表 + user_id）、`015_add_display_name_to_users.py`（用户备注）
- **线上问题修复**：搜索接口 `_get_min_date` 漏传 `user_id` 导致 500；附件上传时 `options.headers` 覆盖 `Authorization` 导致 401 被踢登录
- **数据恢复**：迁移 014 内含 `TRUNCATE ... CASCADE`，本地执行时清空实体表，从 `backups/captureos-2026-10-24.sql` 整库恢复，并校准所有自增序列
- **部署方式调整**：服务器 arm64 本地构建（`docker-compose.build.yml`），保留 ACR 镜像路径（`prod.yml` + `deploy.sh`）作为备选；放弃面板自带的 OpenResty，停用旧 `captureos-nginx` 容器

**为什么：** 系统从"只能在本地用"变成"可以在公网长期运行、多人各自使用"；其他服务占用 443、已有服务占用 3000 的现实约束决定了端口和 HTTPS 方案；多用户必须解决数据隔离，否则多人使用会互相看到对方数据。

**效果：** 公网可通过 HTTPS 稳定访问；本地开发体验不变（仍然免登录）；每个用户的数据完全隔离；部署、更新、回滚、备份都有明确命令与文档；踩过的坑沉淀为"排障速查表"。

---

### 设计原则

在整个开发过程中，我们遵循了几个原则：

1. **不加新模块**：7 个实体已经够用，通过关联和标签建立连接，而不是加第 8 个模块
2. **后端先行**：每次都是先把数据结构和 API 设计好，再做前端展示
3. **渐进增强**：先跑通基本功能，再加索引、加推荐、加链路聚合
4. **个人系统思维**：不做团队协作功能，但保留多用户登录与 `user_id` 数据隔离，保证公网多人使用时互不干扰
5. **行动导向**：仪表盘回答"该做什么"，而不是"有多少数据"
6. **环境隔离**：本地与公网使用独立 compose、独立端口、独立数据卷，改本地绝不影响线上

---

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/CAPTURE760">CAPTURE760</a>
</p>
