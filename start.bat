@echo off
REM Perfect Cell Windows launcher
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install it from https://nodejs.org ^(LTS version^), then run this file again.
  pause
  exit /b
)

echo Starting Perfect Cell...
REM open browser 2 seconds after the server starts
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
echo.
echo Server stopped.
pause
