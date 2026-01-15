# 🚀 Quick Start Guide

## Step 1: Install Dependencies (First Time Only)

Open a terminal in the `backend` folder and run:

```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install fastapi uvicorn pandas
```

## Step 2: Start the Backend Server

In the `backend` folder, run:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Keep this terminal open!** The server needs to keep running.

## Step 3: Open the Frontend

You have two options:

### Option A: Open Directly (Simplest)
1. Navigate to the `frontend` folder
2. Double-click `index.html` to open it in your browser

**Note:** If you get CORS errors, use Option B instead.

### Option B: Using a Simple Server (Recommended)

Open a **new terminal** (keep the backend running) and run:

**Using Python:**
```bash
cd frontend
python -m http.server 8080
```

Then open your browser and go to: `http://localhost:8080`

**Using Node.js (if you have it):**
```bash
cd frontend
npx http-server -p 8080
```

## Step 4: Use the Application

1. The page should load with a player dropdown
2. Select a player from the dropdown
3. Click "Load Stats" or it may auto-load
4. You should see:
   - Last match statistics
   - Stability analysis with color-coded badge
   - Trend chart
   - Recent matches list

## 🔍 Troubleshooting

### Backend won't start
- Make sure you're in the `backend` folder
- Check that `response1.json` files exist in the `backend` folder
- Make sure Python packages are installed: `pip install fastapi uvicorn pandas`

### Frontend shows errors
- Make sure the backend is running on port 8000
- Check browser console (F12) for errors
- Verify `API_BASE_URL` in `frontend/js/api.js` is `http://localhost:8000`

### No players showing
- Check that `response1.json` through `response10.json` exist in `backend/` folder
- Check backend terminal for error messages
- Visit `http://localhost:8000/api/stats/players` to see if API works

### CORS errors
- The backend already has CORS enabled
- If errors persist, make sure you're accessing via `http://localhost` not `file://`

## 🎯 Quick Test

1. Visit `http://localhost:8000` - Should show API info
2. Visit `http://localhost:8000/api/stats/players` - Should show list of players
3. Visit `http://localhost:8000/docs` - Interactive API documentation

If these work, the backend is running correctly!
