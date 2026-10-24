#!/bin/bash
# 服务器一键更新脚本（日常更新用，证书已存在）
# 用法: ./deploy.sh
# 作用: 拉取最新镜像 → 重启容器 → 跑数据库迁移
# 放在服务器 deploy/ 目录下执行

set -e

cd "$(dirname "$0")"

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
echo "   前端: https://example.com"
echo "   后端健康检查: https://example.com/health"
