# CaptureOS — 个人资产管理系统

管理项目、经验、问题、解决方案、知识、决策、复盘 7 种核心实体，支持标签、关联、时间线、全文搜索。

## 快速启动

```bash
# 方式一：双击启动器（推荐，含自动备份）
start-captureos.bat

# 方式二：手动启动（后端启动时也会自动备份）
docker compose up -d
```

访问：前端 http://localhost:3000 ｜ 后端 http://localhost:8001/api ｜ API 文档 http://localhost:8001/docs

---

## 备份与恢复（重要）

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
| **后端启动钩子** | FastAPI lifespan 里尝试执行（需容器内有 docker CLI） | 兜底 |

sidecar 用 `docker:24-cli` 镜像，挂载 docker socket 后直接 `docker exec` 调 db 容器的 pg_dump，**不需要修改 backend 镜像**。

**幂等设计**：同一天只备份一次。判断依据是备份目录里是否已存在当日文件，重复启动直接跳过，不影响启动速度。

**保留策略**：自动保留最近 **14 天**。判断依据是文件修改时间（`mtime`），`-mtime +14` 匹配 15 天及以上，超期文件在下次备份时自动删除。

#### Docker Desktop 手动启动时 backup 不触发

sidecar 执行完就退出（`restart: "no"`），Docker Desktop 启动时只恢复"之前正在运行"的容器，**不会拉起已退出的 backup**。

解决办法（三选一）：

1. **推荐**：不用 Docker Desktop 启动，改用命令行 `docker compose up -d`
2. 手动补一次：`docker compose up backup`
3. 把 [docker-compose.yml:66](docker-compose.yml#L66) 的 `restart: "no"` 改成 `restart: unless-stopped`（代价：backup 会一直挂在后台，Docker Desktop 启动时会拉起它再跑一次）

**备份内容**（每次两个文件）：

- `captureos-YYYY-MM-DD.sql` — 数据库全量（pg_dump custom 格式）
- `captureos-YYYY-MM-DD-uploads.tar.gz` — 全部附件文件（`backend/uploads/`）

**备份位置**：

```
\\wsl.localhost\Ubuntu\home\oyweiyuan\CaptureOS\backups\
```

WSL 内路径：`~/CaptureOS/backups/`

**保留策略**：自动保留最近 **14 天**，超期文件在下次备份时自动删除。

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

关键步骤（[scripts/restore.sh](scripts/restore.sh) 自动完成）：

1. `DROP SCHEMA public CASCADE` 清空数据库
2. `pg_restore` 灌入 SQL 备份（表结构 + 数据 + 原 ID 全部还原）
3. 解压 `uploads.tar.gz` 恢复附件文件
4. 按提示 `docker compose restart backend`

⚠️ 恢复会**覆盖当前全部数据**，操作前建议先手动备份当前状态。

### 恢复方式二：JSON 导入（适合给别人导数据、跨实例迁移）

1. 在源系统首页点「导出」→ 选「JSON 数据」→ 得到 `captureos-export-YYYY-MM-DD.json`
2. 在目标系统首页点「📤 导入数据」→ 选择该 JSON 文件
3. 导入逻辑（[import_data.py](backend/app/api/import_data.py)）自动处理：
   - **ID 重映射**：旧 ID 自动映射到新 ID，关联关系（标签、实体关联、附件记录）不丢
   - **去重**：按标题/名称跳过已存在的记录
   - **预校验**：必填字段、枚举值先校验，有问题直接返回不执行
4. ⚠️ JSON 不含附件文件本体，附件需单独拷贝 `backend/uploads/` 目录

### 备份相关配置（可选，都有默认值）

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `BACKUP_DIR` | `/backups`（容器内） | 备份输出目录 |
| `BACKUP_RETENTION_DAYS` | `14` | 保留天数 |

---

## 技术栈

- 后端：Python 3.13 + FastAPI + SQLAlchemy 2 (async) + Alembic
- 前端：Next.js 15 + React 19 + TypeScript + Tailwind + SWR
- 数据库：PostgreSQL 16
- 部署：Docker Compose

## 常用命令

```bash
docker compose up -d                    # 启动全栈（含自动备份）
docker compose up backup                # 手动执行一次备份（幂等）
docker compose logs -f backend          # 看后端日志（含备份日志）
docker compose exec backend alembic upgrade head   # 数据库迁移
docker logs captureos-backup-1          # 看备份执行日志
```
