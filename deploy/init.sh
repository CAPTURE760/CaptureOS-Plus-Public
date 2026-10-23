#!/bin/bash
# 首次部署脚本（使用宿主机 nginx 反代，docker 内不再跑 nginx）
# 用法: ./init.sh
# 前提:
#   1) 域名 example.com 的 DNS 已解析到本服务器公网 IP
#   2) 宿主机 nginx 已安装并运行
#   3) 80/443 端口已放行

set -e

cd "$(dirname "$0")"

echo "📋 检查环境变量..."
if [ ! -f .env.prod ]; then
  cp .env.prod.example .env.prod
  echo "   已创建 .env.prod，请编辑后重新运行本脚本"
  echo "   需要填写: POSTGRES_PASSWORD"
  exit 1
fi

echo "🚀 启动数据库 + 后端 + 前端 + 备份 + certbot 续签守护..."
# 不再启动 docker 内的 nginx，反代交给宿主机 nginx
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d db backend frontend backup certbot

echo "⏳ 等待后端就绪..."
sleep 10

echo "🗄️  运行数据库迁移..."
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo ""
echo "🌐 第一步：配置宿主机 nginx 的 ACME 验证（用于签发证书）"
echo "   请在另一个终端执行以下命令，让 nginx 提供 acme-challenge："
echo ""
echo "   cp nginx/example.com.acme.conf /etc/nginx/conf.d/example.com.conf"
echo "   nginx -t && systemctl reload nginx"
echo ""
read -p "   配置完成并 reload 后，按回车继续签发证书..."

echo "🔐 签发 HTTPS 证书（Let's Encrypt，webroot 模式）..."
# webroot 模式不占用 80 端口，由宿主机 nginx 提供 acme-challenge 验证
# 证书绑定挂载到宿主机 ./certs 目录，供宿主机 nginx 读取
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --non-interactive \
  --agree-tos \
  --email admin@example.com \
  -d example.com -d www.example.com || {
    echo "❌ 证书签发失败"
    echo "   请检查:"
    echo "     1) 域名 DNS 是否已解析到本服务器"
    echo "     2) 宿主机 nginx 是否正确加载了 example.com.acme.conf（含 /.well-known/acme-challenge/）"
    echo "     3) 80 端口是否可被外网访问（安全组/防火墙）"
    exit 1
  }

echo ""
echo "🌐 第二步：启用完整 HTTPS 反代配置"
echo "   请在另一个终端执行以下命令，替换为完整 HTTPS 配置："
echo ""
echo "   cp nginx/example.com.conf /etc/nginx/conf.d/example.com.conf"
echo "   nginx -t && systemctl reload nginx"
echo ""

echo ""
echo "✅ 部署完成！"
echo "   访问: https://example.com"
echo ""
echo "⚠️  证书有效期 90 天，certbot 容器会每 12 小时自动检查续签，无需手动操作"
echo "   续签依赖宿主机 nginx 持续提供 /.well-known/acme-challenge/（example.com.conf 已包含）"
