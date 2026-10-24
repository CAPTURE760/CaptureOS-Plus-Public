#!/bin/bash
# 首次部署脚本（Cloudflare + 宿主机 nginx 反代）
# 用法: ./init.sh
# 前提:
#   1) 域名 example.com 已接入 Cloudflare，SSL/TLS 模式设为 Flexible
#   2) 宿主机已安装 nginx（apt install nginx）
#   3) 80 端口已放行

set -e

cd "$(dirname "$0")"

echo "📋 检查环境变量..."
if [ ! -f .env.prod ]; then
  cp .env.prod.example .env.prod
  echo "   已创建 .env.prod，请编辑后重新运行本脚本"
  echo "   需要填写: POSTGRES_PASSWORD, BACKEND_IMAGE, FRONTEND_IMAGE"
  exit 1
fi

echo "🚀 启动数据库 + 后端 + 前端 + 备份 + certbot..."
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d db backend frontend backup certbot

echo "⏳ 等待后端就绪..."
sleep 10

echo "🗄️  运行数据库迁移..."
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo "👤 创建/更新管理员账号..."
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T \
  -e ADMIN_USERNAME -e ADMIN_PASSWORD \
  backend python -m scripts.create_admin

echo ""
echo "🌐 配置宿主机 nginx 反代..."
cp nginx/example.com.conf /etc/nginx/conf.d/example.com.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "   nginx 配置已加载"

echo ""
echo "✅ 部署完成！"
echo "   访问: https://example.com"
echo ""
echo "ℹ️  HTTPS 由 Cloudflare 提供（Flexible 模式），源站 nginx 仅监听 80 端口"
echo "   前端绑定 127.0.0.1:3003，后端绑定 127.0.0.1:8000"
