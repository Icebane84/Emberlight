@echo off
title Phoenix Sovereign Workbench
echo ============================================================
echo   PHOENIX SOVEREIGN WEB IDE ^& GOVERNANCE WORKBENCH
echo ============================================================
echo Starting local zero-dependency server...
start "" "http://127.0.0.1:8080/phoenix/core_governor.html"
node tools\server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server stopped or port 8080 is in use.
    pause
)
