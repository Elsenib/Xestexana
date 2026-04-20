@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%"

start "Panel Mobile" cmd /k "cd /d \"%ROOT%\" && npm run dev:mobile"
