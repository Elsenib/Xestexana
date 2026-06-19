@echo off
for %%P in (3000 4000 8081 19000 19001 19002) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    taskkill /PID %%A /F >nul 2>&1
  )
)

taskkill /FI "WINDOWTITLE eq Panel API" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Panel Web" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Panel Mobile" /T /F >nul 2>&1

echo Panel services stopped.
pause
