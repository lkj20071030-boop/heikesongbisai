@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 需要 Node.js 20 或更高版本，请先安装后重试。
  pause
  exit /b 1
)
set PORT=8000
echo.
echo 智析 AI · Web 版
echo 地址：http://127.0.0.1:8000/
echo 自动演示：http://127.0.0.1:8000/demo.html
echo 保持本窗口打开，关闭窗口即停止服务。
echo.
start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8000/'"
if exist "server\.env" (
  node --env-file=server\.env server\server.bundle.mjs
) else (
  node server\server.bundle.mjs
)
pause
