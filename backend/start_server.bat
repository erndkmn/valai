@echo off
echo Starting ValAI Backend Server...
echo.
cd /d "%~dp0"
call "%~dp0..\.venv\Scripts\activate.bat"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
