@echo off
SET ROOT_DIR=%~dp0
REM Check for Node.js
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Install Node.js v18+ from https://nodejs.org
  pause
  exit /b 1
)

REM If backend .env missing, copy sample
if not exist "%ROOT_DIR%backend\.env" (
  if exist "%ROOT_DIR%backend\.env.sample" (
    copy "%ROOT_DIR%backend\.env.sample" "%ROOT_DIR%backend\.env" >nul
    echo Created backend\.env from sample.
  )
)

REM Install backend deps if needed
if not exist "%ROOT_DIR%backend\node_modules" (
  echo Installing backend dependencies...
  pushd "%ROOT_DIR%backend"
  npm install
  popd
)

REM Start backend in a new terminal window (dev mode with watch)
start "AIRA Backend" cmd /k "cd /d "%ROOT_DIR%backend" && npm run dev"

REM Wait a moment and open browser to the API / frontend served by backend
timeout /t 2 >nul
start http://localhost:3000

echo Launched backend. Check the new terminal window for logs.
exit /b 0
