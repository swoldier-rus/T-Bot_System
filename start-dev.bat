@echo off
chcp 65001 >nul
title MOEX Screener Pro Backend (Dev Mode)
echo ========================================================
echo   MOEX Screener Pro - Dev Mode (Auto-restart on save)
echo ========================================================
cd /d "%~dp0backend"
npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ?????? ?????????? ? ??????? %ERRORLEVEL%
    pause
)
