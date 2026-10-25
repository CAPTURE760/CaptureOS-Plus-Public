#!/bin/bash
# 服务器一键更新脚本（日常更新用，证书已存在）
# 用法: ./deploy.sh
# 作用: 拉取最新镜像 → 重启容器 → 跑数据库迁移
# 放在服务器 deploy/ 目录下执行

set -e

cd "$(dirname "$0")"

# 载入 .env.prod（DOMAIN 用于输出访问地址）
set -a; . ./.env.prod; set +a
DOMAIN="${DOMAIN:-example.com}"

# 防呆：模板里的占位仓库地址不能直接用，否则 pull 必然失败
if grep -q 'registry\.example\.com' .env.prod; then
  echo "❌ .env.prod 中的 BACKEND_IMAGE/FRONTEND_IMAGE 仍是模板占位地址"
  echo "   请改成真实仓库地址，例如 crpi-xxxx.cn-hangzhou.personal.cr.aliyuncs.com/captureos/captureos-backend:v1.18"
  exit 1
fi

echo "🔄 拉取最新镜像..."
docker compose --env-file .env.prod -f docker-compose.prod.yml pull

echo "🚀 重启服务..."
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

echo "🗄️  运行数据库迁移..."
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo "👤 创建/更新管理员账号（读取 .env.prod 的 ADMIN_USERNAME/ADMIN_PASSWORD）..."
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T \
  -e ADMIN_USERNAME -e ADMIN_PASSWORD \
  backend python -m scripts.create_admin

echo "✅ 部署完成"
echo "   前端: https://${DOMAIN}"
echo "   后端健康检查: https://${DOMAIN}/health"
