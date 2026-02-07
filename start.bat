@echo off
start "Backend" cmd /k "cd backend-node && nodemon run dev"
start "Frontend" cmd /k "cd frontend-next && npm run dev"