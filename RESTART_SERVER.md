# 🔄 Server Restart Instructions

The server needs to be restarted to pick up code changes. Here's how:

## Quick Fix

1. **Stop the current server** (if running):
   - Press `Ctrl+C` in the terminal where the server is running
   - Or close that terminal window

2. **Start the server again** from the `backend` folder:

   **Windows (PowerShell):**
   ```powershell
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   **Or double-click:** `backend/start_server.bat`

3. **Wait for the server to start** - You should see:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
   INFO:     Started reloader process
   INFO:     Started server process
   INFO:     Waiting for application startup.
   INFO:     Application startup complete.
   ```

4. **Test the endpoint:**
   - Open browser: `http://localhost:8000/api/stats/players`
   - Should return a list of players (not an error)

## Why This Happened

The server was started before the code fixes were made. The `--reload` flag should auto-reload on file changes, but sometimes it's better to manually restart to ensure all changes are loaded.

## Verification

After restarting, test these URLs:
- ✅ `http://localhost:8000` - Should show API info
- ✅ `http://localhost:8000/api/stats/players` - Should return player list
- ✅ `http://localhost:8000/docs` - Interactive API docs

If you still get errors, check the server terminal output for detailed error messages.
