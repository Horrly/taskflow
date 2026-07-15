@echo off
setlocal

set "ROOT=%~dp0"

echo TaskFlow is starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo Network:  check the frontend window for your network URL (e.g. http://192.168.x.x:5173)
echo Both servers are running in separate windows. Close those windows to stop them.

start "TaskFlow Backend" cmd /k "cd /d "%ROOT%taskflow-backend" && call venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"

start "TaskFlow Frontend" cmd /k "cd /d "%ROOT%taskflow-frontend" && npm run dev -- --host"

endlocal
