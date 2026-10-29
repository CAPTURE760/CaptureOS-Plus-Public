#!/bin/bash
# 服务器一键更新脚本（自动 git 同步）
#
# 用法（在服务器 /opt/CaptureOS/deploy 下执行）：
#   ./deploy.sh            # ACR 镜像模式：拉最新镜像 → 重启容器 → 迁移 → 建管理员
#   ./deploy.sh --build    # 服务器源码构建模式：按 git 差异只重建有改动的服务
#   ./deploy.sh --no-git   # 跳过 git 同步（临时调试用）
#
# 每次运行先 git fetch origin main，有新提交就 reset --hard 并重新执行自身，
# 保证脚本逻辑与应用代码同步更新，无需手动敲 git 命令。

set -euo pipefail

MODE="image"   # image | build
SKIP_GIT=0
for arg in "$@"; do
  case "$arg" in
    --build) MODE="build" ;;
    --no-git) SKIP_GIT=1 ;;
    *) echo "未知参数：$arg"; echo "用法：./deploy.sh [--build] [--no-git]"; exit 1 ;;
  esac
done

cd "$(dirname "$0")"
DEPLOY_DIR="$(pwd)"
REPO_DIR="$(cd .. && pwd)"
cd "$REPO_DIR"

log() { echo -e "\n\033[1;34m==> $1\033[0m"; }
warn() { echo -e "\033[1;33m[!] $1\033[0m"; }
err() { echo -e "\033[1;31m[x] $1\033[0m"; }

# ── 1. 自动 git 同步 ──
NEW_COMMITS=0
BEFORE_REV=""
if [ "$SKIP_GIT" -eq 0 ]; then
  log "同步 origin/main"
  git fetch origin main --quiet

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)

  if [ "$LOCAL" != "$REMOTE" ]; then
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
      err "服务器已跟踪的代码文件有本地改动，无法自动 reset："
      git status --porcelain --untracked-files=no
      warn "请先手动处理（git stash / git checkout），或加 --no-git 跳过同步"
      exit 1
    fi
    BEFORE_REV="$LOCAL"
    NEW_COMMITS=1
    echo "发现新提交："
    git --no-pager log --oneline "$LOCAL..$REMOTE" | head -n 10
    git reset --hard "$REMOTE" --quiet
    log "代码已更新，用新版本脚本重新执行"
    if [ "$MODE" = "build" ]; then
      # 代码已在本次同步中更新，把旧提交交给 update.sh 做差异重建
      exec bash "$REPO_DIR/deploy/update.sh" --since "$BEFORE_REV"
    fi
    exec bash "$REPO_DIR/deploy/deploy.sh" "$@"
  fi
  echo "代码已是 origin/main 最新：$(git log -1 --pretty='%h %s')"
fi

# ── 2. 源码构建模式：交给 update.sh ──
if [ "$MODE" = "build" ]; then
  log "服务器源码构建模式"
  if [ "$NEW_COMMITS" -eq 1 ] && [ -n "$BEFORE_REV" ]; then
    exec bash "$REPO_DIR/deploy/update.sh" --since "$BEFORE_REV"
  elif [ "$SKIP_GIT" -eq 1 ]; then
    # 跳过 git 时没有旧提交可比，只能全量重建
    exec bash "$REPO_DIR/deploy/update.sh" --all
  fi
  echo "已是最新，无需重建（强制全量重建可执行 ./update.sh --all）"
  exit 0
fi

# ── 3. ACR 镜像模式 ──
cd "$DEPLOY_DIR"

if [ ! -f .env.prod ]; then
  err "缺少 deploy/.env.prod"
  exit 1
fi

set -a; . ./.env.prod; set +a
DOMAIN="${DOMAIN:-example.com}"

# 防呆：模板里的占位仓库地址不能直接用，否则 pull 必然失败
if grep -q 'registry\.example\.com' .env.prod; then
  err ".env.prod 中的 BACKEND_IMAGE/FRONTEND_IMAGE 仍是模板占位地址"
  echo "   请改成真实仓库地址，例如 registry.example.com/captureos/captureos-backend:v1.18"
  exit 1
fi

echo "镜像：${BACKEND_IMAGE:-未配置} / ${FRONTEND_IMAGE:-未配置}"

log "拉取最新镜像"
docker compose --env-file .env.prod -f docker-compose.prod.yml pull

log "重启变更的服务"
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

log "执行数据库迁移"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend alembic upgrade head

log "创建/更新管理员账号"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T \
  -e ADMIN_USERNAME -e ADMIN_PASSWORD \
  backend python -m scripts.create_admin

log "健康检查"
sleep 5
FAILED=0
if curl -fsS --max-time 5 http://127.0.0.1:8000/health > /dev/null; then
  echo "✅ 后端 /health 正常"
else
  err "后端健康检查失败，查看日志：docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=50 backend"
  FAILED=1
fi
if curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:3003/; then
  echo "✅ 前端首页可访问"
else
  err "前端首页不可访问，查看日志：docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=50 frontend"
  FAILED=1
fi

if [ "$FAILED" -eq 0 ]; then
  log "部署完成"
  echo "   前端: https://${DOMAIN}"
  echo "   后端健康检查: https://${DOMAIN}/health"
else
  exit 1
fi
