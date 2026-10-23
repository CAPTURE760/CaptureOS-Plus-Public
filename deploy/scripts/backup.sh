#!/bin/sh
# CaptureOS 数据库+附件 备份脚本（POSIX 兼容）
# 触发方式：docker compose up 时 backup sidecar 自动执行
# 备份位置：backups_data volume（可通过 BACKUP_DIR 环境变量覆盖）
# 保留策略：默认保留最近 14 天（可通过 RETENTION_DAYS 环境变量覆盖）
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-captureos-db-1}"
UPLOADS_DIR="${UPLOADS_DIR:-/uploads}"

mkdir -p "$BACKUP_DIR"

TODAY=$(date +%Y-%m-%d)
PREFIX="captureos-${TODAY}"

# 幂等：今天已备份过则跳过
if [ -f "${BACKUP_DIR}/${PREFIX}.sql" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 今天已备份过，跳过"
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份 → $BACKUP_DIR"

# 1. 数据库 SQL 备份（pg_dump custom 格式，可用 pg_restore 恢复）
docker exec "$DB_CONTAINER" pg_dump -U captureos -Fc captureos > "${BACKUP_DIR}/${PREFIX}.sql"
echo "  ✓ SQL: ${PREFIX}.sql ($(du -h "${BACKUP_DIR}/${PREFIX}.sql" | cut -f1))"

# 2. 附件目录打包
tar -C "$UPLOADS_DIR" -czf "${BACKUP_DIR}/${PREFIX}-uploads.tar.gz" . 2>/dev/null || true
echo "  ✓ 附件: ${PREFIX}-uploads.tar.gz ($(du -h "${BACKUP_DIR}/${PREFIX}-uploads.tar.gz" | cut -f1))"

# 3. 清理超期备份
DELETED=$(find "$BACKUP_DIR" -name "captureos-*.sql" -mtime +$RETENTION_DAYS -delete -print | wc -l)
find "$BACKUP_DIR" -name "captureos-*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "  ✓ 已清理 ${RETENTION_DAYS} 天前的备份（删除 ${DELETED} 组）"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成"
