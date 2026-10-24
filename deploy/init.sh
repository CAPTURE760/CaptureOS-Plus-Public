#!/bin/bash
# 首次部署脚本（Cloudflare + 宿主机 nginx 反代）
# 用法: ./init.sh
# 前提:
#   1) 域名已接入 Cloudflare，SSL/TLS 模式设为 Flexible
#   2) 宿主机已安装 nginx（apt install nginx）
#   3) 80 端口已放行
#   4) .env.prod 已配置（至少 DOMAIN / POSTGRES_PASSWORD / SECRET_KEY / ADMIN_*）

set -e

cd "$(dirname "$0")"

echo "📋 检查环境变量..."
if [ ! -f .env.prod ]; then
  cp .env.prod.example .env.prod
  echo "   已创建 .env.prod，请编辑后重新运行本脚本"
  echo "   需要填写: DOMAIN, POSTGRES_PASSWORD, SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD"
  echo "   使用 ACR 镜像路径时还需: BACKEND_IMAGE, FRONTEND_IMAGE"
  exit 1
fi

# 载入 .env.prod（供 DOMAIN 等变量使用）
set -a; . ./.env.prod; set +a
DOMAIN="${DOMAIN:-example.com}"
echo "   域名: ${DOMAIN}"

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
echo "🌐 生成并加载宿主机 nginx 反代配置（域名: ${DOMAIN}）..."
sed -e "s/example\.com/${DOMAIN}/g" \
    -e "s|/opt/CaptureOS/deploy|$(pwd)|g" \
    nginx/captureos.conf > /etc/nginx/conf.d/captureos.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "   nginx 配置已加载: /etc/nginx/conf.d/captureos.conf"

echo ""
echo "✅ 部署完成！"
echo "   访问: https://${DOMAIN}"
echo ""
echo "ℹ️  HTTPS 由 Cloudflare 提供（Flexible 模式），源站 nginx 仅监听 80 端口"
echo "   前端绑定 127.0.0.1:3003，后端绑定 127.0.0.1:8000"
