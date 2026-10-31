@echo off
title MOEX Live Screener Pro Desktop Dev Mode
cd /d "%~dp0desktop"

echo [INFO] Starting Dev Server...
call npm.cmd run dev
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Dev server exited with code %ERRORLEVEL%
    pause
)