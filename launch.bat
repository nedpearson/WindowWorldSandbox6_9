@echo off
title Window World Assistant — Launcher
color 0A

echo.
echo  ================================================
echo   WINDOW WORLD ASSISTANT — LAUNCHING
echo  ================================================
echo.

:: ── Config ──────────────────────────────────────────────
set "REPO=C:\dev\github\business\WindowWorldAssistant"
set "SERVER_PORT=3001"
set "WEB_PORT=5173"
set "APP_URL=http://localhost:%WEB_PORT%"

:: ── Check Node ──────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js not found. Please install Node 20+.
  echo  Download: https://nodejs.org/
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node %NODE_VER%

:: ── Navigate to repo ────────────────────────────────────
if not exist "%REPO%" (
  echo  [ERROR] Repo not found at %REPO%
  pause
  exit /b 1
)
cd /d "%REPO%"
echo  [OK] Repo: %REPO%

:: ── Kill orphan processes on our ports ──────────────────
echo  [INFO] Clearing port %SERVER_PORT%...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr /R ":%SERVER_PORT% .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)
echo  [INFO] Clearing port %WEB_PORT%...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr /R ":%WEB_PORT% .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: ── Launch API Server in its own window ─────────────────
echo  [STARTING] API Server on port %SERVER_PORT%...
start "WW API Server [:3001]" cmd /k "cd /d %REPO% && color 0B && echo  WW API Server starting... && npm run dev:server"

:: Give API server time to connect to Supabase
echo  [WAIT] API server initialising (3s)...
timeout /t 3 /nobreak >nul

:: ── Launch Vite in its own window ───────────────────────
echo  [STARTING] Web UI on port %WEB_PORT%...
start "WW Web UI [:5173]" cmd /k "cd /d %REPO% && color 0D && echo  WW Web UI starting... && npm run dev:web"

:: Wait for Vite to come up
echo  [WAIT] Waiting for Vite (5s)...
timeout /t 5 /nobreak >nul

:: ── Open the app in default browser ─────────────────────
echo  [OPENING] %APP_URL%
start "" "%APP_URL%"

echo.
echo  ================================================
echo   WINDOW WORLD ASSISTANT IS RUNNING
echo  ================================================
echo.
echo   API Server  http://localhost:%SERVER_PORT%/api/health
echo   Web App     %APP_URL%
echo.
echo   TWO terminal windows are open:
echo     - [cyan]  WW API Server [:3001]
echo     - [magenta] WW Web UI [:5173]
echo.
echo   To STOP: close those two windows, or run stop.bat
echo   Press any key to close this launcher window.
echo  ================================================
pause >nul
