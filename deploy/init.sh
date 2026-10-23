#!/bin/bash
# 首次部署 + 签发 HTTPS 证书（只跑一次）
# 用法: ./init.sh
# 前提: 域名 example.com 的 DNS 已解析到本服务器公网 IP

set -e

cd "$(dirname "$0")"

echo "📋 检查环境变量..."
if [ ! -f .env.prod ]; then
  cp .env.prod.example .env.prod
  echo "   已创建 .env.prod，请编辑后重新运行本脚本"
  echo "   需要填写: POSTGRES_PASSWORD"
  exit 1
fi

echo "🚀 启动数据库 + 后端 + 前端（不含 nginx HTTPS）..."
# 先不启动 nginx，避免 SSL 证书不存在导致启动失败
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d db backend frontend backup

echo "⏳ 等待后端就绪..."
sleep 10

echo "🗄️  运行数据库迁移..."
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo "🔐 签发 HTTPS 证书（Let's Encrypt）..."
# 用 standalone 模式，certbot 临时占用 80 端口验证域名
# 先确保没有其他服务占用 80
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d certbot

# 签发证书（standalone 模式，需要 80 端口空闲）
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email admin@example.com \
  -d example.com -d www.example.com || {
    echo "❌ 证书签发失败"
    echo "   请检查: 1) 域名 DNS 是否已解析到本服务器 2) 80 端口是否可被外网访问 3) 阿里云安全组是否放行 80"
    exit 1
  }

echo "🌐 启动 nginx（HTTPS）..."
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d nginx

echo ""
echo "✅ 部署完成！"
echo "   访问: https://example.com"
echo ""
echo "⚠️  证书有效期 90 天，certbot 容器会每 12 小时自动检查续签，无需手动操作"
