#!/usr/bin/env bash
# CaptureOS 启动逻辑（由 start-captureos.bat 调用）
# 所有中文输出和可配置项都放在这里：.sh 原生 UTF-8+LF，编辑器怎么保存都不会坏
DOCKER_DESKTOP='D:\Docker\Docker Desktop.exe'
PROJECT_DIR=/home/oyweiyuan/CaptureOS

echo "========================================"
echo "  CaptureOS 个人资产管理系统"
echo "========================================"
echo

echo "[1/5] 检查 Docker Desktop..."
if docker info >/dev/null 2>&1; then
  echo "      Docker Desktop 已在运行"
else
  echo "      启动 Docker Desktop..."
  cmd.exe /c start "" "$DOCKER_DESKTOP" >/dev/null 2>&1
  until docker info >/dev/null 2>&1; do sleep 5; done
  echo "      Docker Desktop 已就绪"
fi
echo

echo "[2/5] 启动 CaptureOS 服务..."
cd "$PROJECT_DIR" && docker compose up -d
echo

echo "[3/5] 等待服务就绪..."
until curl -s http://localhost:3000 >/dev/null 2>&1; do sleep 3; done
echo "      服务已就绪！"
echo

echo "[4/5] 打开浏览器..."
cmd.exe /c start http://localhost:3000 >/dev/null 2>&1
echo

echo "[5/5] 自动备份（今天已备份则跳过）..."
"$PROJECT_DIR/scripts/backup.sh"
echo '      备份目录: \\wsl.localhost\Ubuntu\home\oyweiyuan\CaptureOS\backups'
echo

echo "========================================"
echo "  CaptureOS 已启动！"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:8001/api"
echo "  文档: http://localhost:8001/docs"
echo "========================================"
