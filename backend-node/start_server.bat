@echo off
echo Starting ValAI Node.js Backend...
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting server...
npm run dev
