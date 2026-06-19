@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%"

if not exist ".env" (
  copy ".env.example" ".env" >nul
)

echo [1/4] Prisma generate...
call npx prisma generate
if errorlevel 1 goto :error

echo [2/4] Prisma db push...
call npx prisma db push
if errorlevel 1 goto :error

echo [3/4] Starting API...
start "Panel API" cmd /k "cd /d \"%ROOT%\" && npm run dev:api"

echo [4/4] Starting Web...
start "Panel Web" cmd /k "cd /d \"%ROOT%\" && npm run dev:web"

timeout /t 4 >nul
start "" "http://localhost:3000"
exit /b 0

:error
echo Startup failed. Check errors above.
pause
exit /b 1
