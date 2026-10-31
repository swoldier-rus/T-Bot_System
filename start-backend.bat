@echo off
title MOEX Screener Pro Backend
echo ========================================================
echo   MOEX Screener Pro - Local Analytical Backend Server
echo ========================================================
cd /d "%~dp0backend"
echo [INFO] Starting backend on http://127.0.0.1:3001 (WS: ws://127.0.0.1:3001/stream)...
call npm.cmd start
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend exited with code %ERRORLEVEL%
    pause
)
