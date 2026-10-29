#!/bin/bash
# 服务器手动更新脚本：拉取 origin/main，只重建有改动的服务
#
# 用法（在服务器上）：
#   cd /opt/CaptureOS/deploy
#   ./update.sh          # 按差异只重建 backend / frontend
#   ./update.sh --all    # 忽略差异，前后端全部重建
#
# 与 deploy.sh 的区别：deploy.sh 拉 ACR 镜像；本脚本从服务器源码本地构建。

set -euo pipefail

cd "$(dirname "$0")"
REPO_DIR="$(cd .. && pwd)"
cd "$REPO_DIR"

log() { echo -e "\n\033[1;34m==> $1\033[0m"; }
warn() { echo -e "\033[1;33m[!] $1\033[0m"; }
err() { echo -e "\033[1;31m[x] $1\033[0m"; }

if [ ! -f deploy/.env.prod ]; then
  err "缺少 deploy/.env.prod，无法部署"
  exit 1
fi

FORCE_ALL=0
SINCE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --all) FORCE_ALL=1; shift ;;
    --since) SINCE="${2:-}"; shift 2 ;;
    *) echo "未知参数：$1"; echo "用法：./update.sh [--all] [--since <commit>]"; exit 1 ;;
  esac
done

log "拉取 origin/main"
git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ] && [ "$FORCE_ALL" -eq 0 ] && [ -z "$SINCE" ]; then
  echo "已是最新：$(git log -1 --pretty='%h %s')"
  exit 0
fi

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  warn "服务器已跟踪的代码文件有本地改动，继续会执行 reset --hard 丢弃它们："
  git status --porcelain --untracked-files=no
  read -r -p "继续？(y/N) " answer
  if [ "$answer" != "y" ]; then
    echo "已取消"
    exit 1
  fi
fi

log "本次将部署的提交"
git --no-pager log --oneline "${SINCE:-$LOCAL}..$REMOTE" | head -n 20

if [ "$FORCE_ALL" -eq 1 ]; then
  CHANGED="backend
frontend"
elif [ -n "$SINCE" ]; then
  CHANGED=$(git diff --name-only "$SINCE" "$REMOTE" | awk -F/ '{print $1}' | sort -u)
else
  CHANGED=$(git diff --name-only "$LOCAL" "$REMOTE" | awk -F/ '{print $1}' | sort -u)
fi
echo "变更目录: $(echo "$CHANGED" | tr '\n' ' ')"

git reset --hard "$REMOTE" --quiet
log "已切换到 $(git log -1 --pretty='%h %s')"

COMPOSE="docker compose --env-file deploy/.env.prod -f deploy/docker-compose.build.yml"

rebuild() {
  log "重建并重启 $1"
  $COMPOSE up -d --build --force-recreate "$1"
}

if echo "$CHANGED" | grep -qx "backend"; then
  rebuild backend
  log "执行数据库迁移（无新迁移时自动跳过）"
  $COMPOSE exec -T backend alembic upgrade head
fi

if echo "$CHANGED" | grep -qx "frontend"; then
  rebuild frontend
fi

if echo "$CHANGED" | grep -qx "deploy"; then
  log "部署配置有变动，重新应用 compose（不重建镜像）"
  $COMPOSE up -d --remove-orphans
fi

log "健康检查"
sleep 5
FAILED=0
if curl -fsS --max-time 5 http://127.0.0.1:8000/health > /dev/null; then
  echo "✅ 后端 /health 正常"
else
  err "后端健康检查失败，查看日志：$COMPOSE logs --tail=50 backend"
  FAILED=1
fi
if curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:3003/; then
  echo "✅ 前端首页可访问"
else
  err "前端首页不可访问，查看日志：$COMPOSE logs --tail=50 frontend"
  FAILED=1
fi

if [ "$FAILED" -eq 0 ]; then
  log "部署完成：$(git log -1 --pretty='%h %s')"
else
  exit 1
fi
