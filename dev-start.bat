@echo off
rem Starts the FastAPI backend and the Next.js dev server in two windows,
rem then opens the site. Close either window (Ctrl+C) to stop that server.
setlocal
cd /d "%~dp0"

echo Starting backend (FastAPI) on http://127.0.0.1:8001 ...
start "Portfolio Backend" cmd /k "cd /d "%~dp0backend" && ".venv\Scripts\python.exe" -m uvicorn app.main:app --port 8001"

echo Starting frontend (Next.js) on http://localhost:3000 ...
start "Portfolio Frontend" cmd /k "cd /d "%~dp0" && set NEXT_PUBLIC_ASSISTANT_API_URL=http://127.0.0.1:8001&& npm run dev"

rem Give the dev server a moment to come up, then open the site.
timeout /t 6 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo Two terminal windows were opened: "Portfolio Backend" and "Portfolio Frontend".
echo If the backend says a port is in use, another app is on 8000 (e.g. the Thesa service). Stop it first.
echo Close a window or press Ctrl+C in it to stop that server.
endlocal
