@echo off
title MOEX Live Screener Pro Desktop Terminal
cd /d "%~dp0desktop"

if not exist "dist\index.html" (
    echo [INFO] Building renderer...
    call npm.cmd run build
)

echo [INFO] Starting Electron Desktop Application...
call npm.cmd start
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Application failed with code %ERRORLEVEL%
    pause
)