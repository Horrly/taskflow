@echo off
setlocal

echo Stopping TaskFlow servers...

set "BACKEND_FOUND=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
    set "BACKEND_FOUND=1"
)

set "FRONTEND_FOUND=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
    set "FRONTEND_FOUND=1"
)

echo TaskFlow servers stopped.
if "%BACKEND_FOUND%"=="1" (
    echo Backend ^(port 8000^): stopped
) else (
    echo Backend ^(port 8000^): Already stopped
)
if "%FRONTEND_FOUND%"=="1" (
    echo Frontend ^(port 5173^): stopped
) else (
    echo Frontend ^(port 5173^): Already stopped
)

endlocal
