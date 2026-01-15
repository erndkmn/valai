# ValAI - Valorant Statistics Analysis Platform

A web application for analyzing Valorant match statistics with focus on headshot rate stability and performance metrics.

## 🎯 Features

### Current (Phase 1)
- ✅ Headshot rate stability analysis
- ✅ Last match statistics display
- ✅ Stability score categorization (Very Stable, Stable, Somewhat Stable, Not Stable, Very Unstable)
- ✅ Performance trends visualization
- ✅ Recent matches history

### Planned (Phase 2)
- 🔲 Map death location heatmaps
- 🔲 Weak/strong spot identification
- 🔲 Weapon usage analysis by location
- 🔲 Position-based performance metrics

## 🏗️ Project Structure

```
valai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── api/
│   │   │   └── routes/
│   │   │       └── stats.py     # Statistics API endpoints
│   │   └── services/
│   │       ├── match_service.py    # Match data processing
│   │       └── stability_service.py # Stability calculations
│   ├── matchData.py             # Match data extraction utilities
│   ├── test.py                  # Testing/development scripts
│   └── response*.json           # Sample match data files
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js               # API client
│       └── app.js               # Main application logic
│
└── PROJECT_ROADMAP.md           # Detailed project plan
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- pip

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install fastapi uvicorn pandas
```

Or create a `requirements.txt`:
```bash
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pandas>=2.0.0
```

3. Run the API server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Open `frontend/index.html` in a web browser, or

2. Serve the frontend using a simple HTTP server:
```bash
# Python 3
cd frontend
python -m http.server 8080

# Or using Node.js http-server
npx http-server -p 8080
```

3. Open `http://localhost:8080` in your browser

**Note:** Make sure to update the API_BASE_URL in `frontend/js/api.js` if your backend is running on a different port.

## 📊 API Endpoints

### Statistics

- `GET /api/stats/players` - Get list of all players
- `GET /api/stats/last-match?player_id={id}` - Get last match statistics
- `GET /api/stats/stability/{player_id}` - Get stability analysis
- `GET /api/stats/matches/{player_id}?limit=5` - Get recent matches

### Example Response (Stability)

```json
{
  "score": 0.45,
  "category": "stable",
  "label": "Stable",
  "color": "#34D399",
  "volatility": 1.22,
  "description": "Good consistency - Your performance is relatively stable.",
  "current_hs_rate": 32.5,
  "match_count": 10,
  "trend": {
    "stability_scores": [0.42, 0.45, 0.48, ...],
    "hs_rates": [30.2, 32.5, 31.8, ...],
    "dates": ["2024-01-01T...", ...]
  }
}
```

## 🎨 Stability Score Categories

The stability score is calculated as: `1 / (1 + volatility)` where volatility is the standard deviation of headshot rate.

| Category | Score Range | Volatility | Label |
|----------|-------------|------------|-------|
| Very Stable | ≥ 0.50 | < 1.0% | Excellent |
| Stable | 0.33 - 0.50 | 1.0 - 2.0% | Good |
| Somewhat Stable | 0.20 - 0.33 | 2.0 - 4.0% | Average |
| Not Stable | 0.14 - 0.20 | 4.0 - 6.0% | Poor |
| Very Unstable | < 0.14 | > 6.0% | Very Poor |

## 🔧 Development

### Running Tests

The `test.py` script can be used for development and testing:

```bash
cd backend
python test.py
```

### Adding Match Data

Place new match JSON files in the `backend/` directory as `response{N}.json` where N is the match number.

## 📝 License

This project is for educational/personal use.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
