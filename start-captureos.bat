@echo off
rem CaptureOS launcher - ASCII only, do not add non-ASCII characters here.
rem All logic and Chinese output live in scripts/start-captureos.sh (UTF-8, safe to edit).
chcp 65001 >nul
wsl -d Ubuntu -- bash /home/oyweiyuan/CaptureOS/scripts/start-captureos.sh
pause
