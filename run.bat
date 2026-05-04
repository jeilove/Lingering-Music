@echo off
setlocal
title Vibe Music Player Control Center

echo.
echo  ==============================================================
echo      VIBE MUSIC PLAYER : DEVELOPMENT & CONTROL CENTER
echo  ==============================================================
echo.

:: 1. Force Clean Up Zombie Processes
echo [1/3] Purging existing processes and cleaning cache...
taskkill /F /IM node.exe /T >nul 2>nul
taskkill /F /IM pnpm.exe /T >nul 2>nul

:: Clear Next.js cache if exists
if exist "apps\web\.next" (
    echo [INFO] Clearing Next.js build cache...
    rmdir /s /q "apps\web\.next" >nul 2>nul
)

:: 2. Auto-Launch Browser
echo [2/3] Preparing automatic browser launch (localhost:3002)...
start /b cmd /c "timeout /t 5 >nul && start http://localhost:3002"

:: 3. Start Development Environment
echo [3/3] Launching Monorepo in Parallel Mode...
echo.
echo  --------------------------------------------------------------
echo   * Web Frontend : http://localhost:3002
echo   * Local Server : http://localhost:3001
echo  --------------------------------------------------------------
echo.

call pnpm dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] System crashed with code %errorlevel%.
    echo Please check your environment or dependencies.
    pause
)

endlocal
