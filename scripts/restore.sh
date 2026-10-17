#!/usr/bin/env bash
# CaptureOS 恢复脚本
# 用法：./scripts/restore.sh 2026-10-17
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "用法：$0 <日期前缀>"
  echo "示例：$0 2026-10-17"
  echo "可用备份："
  ls -lh /home/oyweiyuan/CaptureOS/backups/captureos-*.sql 2>/dev/null || echo "  暂无备份"
  exit 1
fi

DATE_PREFIX="$1"
BACKUP_DIR="/home/oyweiyuan/CaptureOS/backups"
SQL_FILE="${BACKUP_DIR}/captureos-${DATE_PREFIX}.sql"
UPLOADS_FILE="${BACKUP_DIR}/captureos-${DATE_PREFIX}-uploads.tar.gz"

if [ ! -f "$SQL_FILE" ]; then
  echo "错误：找不到 $SQL_FILE"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始恢复..."

# 1. 恢复数据库（先清空再灌入）
docker exec -i captureos-db-1 psql -U captureos -d captureos -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i captureos-db-1 pg_restore -U captureos -d captureos --no-owner --no-privileges < "$SQL_FILE"
echo "  ✓ 数据库已恢复"

# 2. 恢复附件（可选）
if [ -f "$UPLOADS_FILE" ]; then
  tar -C /home/oyweiyuan/CaptureOS/backend/uploads -xzf "$UPLOADS_FILE"
  echo "  ✓ 附件已恢复"
else
  echo "  ⚠ 未找到附件备份 $UPLOADS_FILE，跳过"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 恢复完成"
echo "请重启后端：docker compose restart backend"
