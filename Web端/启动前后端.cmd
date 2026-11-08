@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 or newer.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 goto :failed
)
call npm.cmd run build
if errorlevel 1 goto :failed
echo Open http://127.0.0.1:8000/ in your browser. Keep this window open.
call npm.cmd start
exit /b
:failed
echo Startup failed. Read the error above.
pause
exit /b 1
