@echo off
title Emberlight Sovereign Launcher
cd /d %~dp0
echo [LAUNCHER] Spawning local Python HTTP server...
start http://localhost:8000
python -m http.server 8000