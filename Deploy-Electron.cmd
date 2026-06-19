@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%"

REM 1. Next.js production build
cd apps/web
call npm run build
if errorlevel 1 goto :error

REM 2. Electron distributivini yarat
call npm run dist
if errorlevel 1 goto :error

cd /d "%ROOT%"
echo Deploy tamamlandi. dist_electron qovlugunda distributiv hazirdir.
exit /b 0

:error
echo Deploy ugursuz oldu. Xetalari yoxlayin.
pause
exit /b 1
