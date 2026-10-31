@echo off
chcp 65001 >nul
title MOEX Screener Pro Backend
echo ========================================================
echo   MOEX Screener Pro - Local Analytical Backend Server
echo ========================================================
cd /d "%~dp0backend"
echo [INFO] ?????? ??????? ?? http://127.0.0.1:8080 (WS: ws://127.0.0.1:8080/stream)...
npm start
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ?????? ?????????? ? ??????? %ERRORLEVEL%
    pause
)
