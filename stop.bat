@echo off
title Window World Assistant — Stop
echo.
echo  Stopping Window World Assistant...
echo.

:: Kill by window title
taskkill /fi "WindowTitle eq WW API Server [:3001]*" /f >nul 2>&1
taskkill /fi "WindowTitle eq WW Web UI [:5173]*" /f >nul 2>&1

:: Kill by port as fallback
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3001 "') do taskkill /f /pid %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":5173 "') do taskkill /f /pid %%p >nul 2>&1

echo  [OK] Window World Assistant stopped.
echo.
timeout /t 2 /nobreak >nul
