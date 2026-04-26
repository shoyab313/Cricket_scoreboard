@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   CRICKET SCOREBOARD AUTO-STARTER
echo ========================================

:: Determine the correct project root
set "PROJECT_ROOT=%~dp0"

:: Check if we are in the outer folder or the inner folder
if exist "%PROJECT_ROOT%cricket-scoreboard\manage.py" (
    set "BASE_DIR=%PROJECT_ROOT%cricket-scoreboard"
) else if exist "%PROJECT_ROOT%manage.py" (
    set "BASE_DIR=%PROJECT_ROOT%"
) else (
    echo [ERROR] Could not find 'manage.py'. 
    echo Please make sure this file is inside the 'cricket-scoreboard-main' or 'cricket-scoreboard' folder.
    pause
    exit /b
)

echo [INFO] Project directory identified at: !BASE_DIR!
cd /d "!BASE_DIR!"

:: Start Backend
echo [INFO] Launching Django Backend...
start "Cricket Backend" cmd /k "venv\Scripts\activate && python manage.py runserver"

:: Start Frontend
echo [INFO] Launching React Frontend...
if exist "frontend" (
    start "Cricket Frontend" cmd /k "cd frontend && npm run dev"
) else (
    echo [ERROR] 'frontend' folder not found in !BASE_DIR!
)

echo.
echo ========================================
echo   Servers are starting in new windows.
echo ========================================
echo.
timeout /t 5
exit
