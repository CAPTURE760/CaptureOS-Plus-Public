@echo off
chcp 65001 >nul
title CaptureOS 启动器

echo ========================================
echo   CaptureOS 个人资产管理系统
echo ========================================
echo.

:: 检查 Docker Desktop
set DOCKER_PATH=D:\Docker\Docker Desktop.exe

echo [1/4] 检查 Docker Desktop...
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I "Docker Desktop.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    echo       启动 Docker Desktop...
    start "" "%DOCKER_PATH%"
    :wait_docker
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 goto wait_docker
    echo       Docker Desktop 已就绪
) else (
    echo       Docker Desktop 已在运行
)
echo.

:: 启动服务（直接用 Windows 的 docker compose，不走 WSL2）
echo [2/4] 启动 CaptureOS 服务...
cd /d "\\wsl.localhost\Ubuntu\home\oyweiyuan\CaptureOS"
docker compose up -d
echo.

:: 等待服务就绪
echo [3/4] 等待服务就绪...
:wait_service
timeout /t 3 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto wait_service
echo       服务已就绪！
echo.

:: 打开浏览器
echo [4/5] 打开浏览器...
start http://localhost:3000
echo.

:: 启动时自动备份（幂等，同一天只备份一次，保留最近14天）
echo [5/5] 自动备份（今天已备份则跳过）...
wsl -d Ubuntu -- /home/oyweiyuan/CaptureOS/scripts/backup.sh
echo      备份目录: \\wsl.localhost\Ubuntu\home\oyweiyuan\CaptureOS\backups
echo.

echo ========================================
echo   CaptureOS 已启动！
echo   前端: http://localhost:3000
echo   后端: http://localhost:8001/api
echo   文档: http://localhost:8001/docs
echo ========================================
echo.
pause
