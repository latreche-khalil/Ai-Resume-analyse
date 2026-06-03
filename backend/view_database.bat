@echo off
title AI Resume DB Viewer - phpMyAdmin Style
color 0A

echo.
echo  ==========================================
echo   AI Resume Analyzer - Database Viewer
echo  ==========================================
echo.
echo  Starting SQLite Web Interface...
echo  Please wait...
echo.

cd /d "%~dp0"

:: Check if sqlite_web is installed
sqlite_web --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  Installing sqlite-web...
    pip install sqlite-web
    echo.
)

:: Open browser after 2 seconds
start /b cmd /c "timeout /t 2 >nul && start http://127.0.0.1:8085"

echo  ==========================================
echo   Database is running at:
echo   http://127.0.0.1:8085
echo  ==========================================
echo.
echo  Press CTRL+C to stop the server.
echo.

:: Start sqlite-web
sqlite_web -p 8085 -H 127.0.0.1 ai_resume.db

pause
