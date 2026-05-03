@echo off
echo ==========================================
echo Starting Vibe Music Development Environment
echo ==========================================
echo.
echo Current Directory: %CD%
echo.

:: Check pnpm availability
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] pnpm command not found. Please install pnpm.
  pause
  exit /b 1
)

echo Starting pnpm dev (Parallel Mode)...
echo Cleaning up existing processes and cache...
taskkill /F /IM node.exe >nul 2>nul
if exist "apps\web\.next\dev\lock" del /f /q "apps\web\.next\dev\lock"
echo.

:: CRITICAL: DO NOT CHANGE PORT 3002. Browser storage (IndexedDB) is tied to this specific origin.
:: Changing the port will make all recently played tracks and favorites Disappear!
echo Opening browser automatically in 6 seconds...
start /b cmd /c "timeout /t 6 >nul && start http://localhost:3002"

call pnpm dev

if %errorlevel% neq 0 (
  echo.
  echo [CRITICAL ERROR] Development server crashed with code %errorlevel%.
  echo Please check the output above for details.
  pause
)
