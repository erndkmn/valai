# ValAI - Valorant Statistics Analysis Platform

## 📊 Current State

### ✅ What You Have
- **Backend Framework**: FastAPI setup (`backend/app/main.py`)
- **Data Processing**: 
  - Match data extraction (`matchData.py`)
  - Stability score calculation (`test.py`, `stability.py`)
  - HS rate volatility analysis
- **Data**: Sample match JSON files (response1-10.json) with:
  - Player stats (kills, deaths, HS rate)
  - Location data (x, y coordinates for kills/deaths)
  - Weapon data (damage items)
  - Round-by-round statistics

### 🎯 Project Goals

#### Phase 1: Core Stability Analysis (Current Focus)
- Display last game stats
- Show HS rate stability score with labels
- Compare recent vs season performance

#### Phase 2: Map Analysis (Future)
- Death location heatmap
- Weak/strong spot identification
- Weapon usage by location
- Position-based performance analysis

---

## 🏗️ Recommended Architecture

```
valai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── matches.py   # Match data endpoints
│   │   │   │   ├── stats.py     # Statistics endpoints
│   │   │   │   └── stability.py # Stability analysis endpoints
│   │   │   └── models.py        # Pydantic models
│   │   ├── services/
│   │   │   ├── match_service.py # Match data processing
│   │   │   ├── stability_service.py # Stability calculations
│   │   │   └── map_service.py   # Future: Map analysis
│   │   └── utils/
│   │       └── data_loader.py   # Data loading utilities
│   ├── matchData.py             # (Keep as utility)
│   ├── test.py                  # (Keep for testing)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── api.js
│   │   └── charts.js
│   └── assets/
│
└── README.md
```

---

## 🚀 Next Steps (Prioritized)

### Step 1: Organize Backend Code
- [x] Refactor stability calculation into a service
- [ ] Create API endpoints for:
  - `GET /api/stats/last-match` - Last game stats
  - `GET /api/stats/stability/{player_id}` - Stability analysis
  - `GET /api/stats/comparison/{player_id}` - Recent vs season

### Step 2: Create Frontend Foundation
- [ ] Simple HTML/CSS/JS frontend (no framework needed initially)
- [ ] Dashboard layout:
  - Header with player info
  - Stats cards (K/D, HS%, Stability)
  - Stability indicator with label
  - Recent matches table/graph

### Step 3: Stability Score Categories
Based on the formula `stability_score = 1 / (1 + volatility)`:

| Category | Score Range | Volatility | Label |
|----------|-------------|------------|-------|
| Very Stable | ≥ 0.50 | < 1.0% | Excellent |
| Stable | 0.33 - 0.50 | 1.0 - 2.0% | Good |
| Somewhat Stable | 0.20 - 0.33 | 2.0 - 4.0% | Average |
| Not Stable | 0.14 - 0.20 | 4.0 - 6.0% | Poor |
| Very Unstable | < 0.14 | > 6.0% | Very Poor |

### Step 4: API Implementation
- [ ] Stability endpoint with categorization
- [ ] Match history endpoint
- [ ] Player summary endpoint

### Step 5: Frontend Integration
- [ ] Fetch and display last match stats
- [ ] Show stability score with color coding
- [ ] Display stability trend graph

### Step 6: Future Features (Phase 2)
- [ ] Map visualization library integration
- [ ] Death/kill location aggregation
- [ ] Heatmap generation
- [ ] Weapon analysis by location
- [ ] Weak/strong spot detection algorithm

---

## 🎨 UI/UX Recommendations

### Layout Structure
```
┌─────────────────────────────────────────┐
│  Header: Player Name | Rank | Last Match│
├─────────────────────────────────────────┤
│  Quick Stats Cards                      │
│  [K/D] [HS%] [Stability] [Score]       │
├─────────────────────────────────────────┤
│  Stability Analysis Section             │
│  [Score: 0.45] [Label: Stable] [Graph] │
├─────────────────────────────────────────┤
│  Recent Matches Table/List              │
│  [Date] [Map] [Score] [K/D] [HS%]      │
├─────────────────────────────────────────┤
│  Future: Map Analysis Tab               │
│  [Heatmap] [Weak Spots] [Weapons]      │
└─────────────────────────────────────────┘
```

### Color Scheme Suggestions
- **Very Stable**: Green (#10B981)
- **Stable**: Light Green (#34D399)
- **Somewhat Stable**: Yellow (#FBBF24)
- **Not Stable**: Orange (#F97316)
- **Very Unstable**: Red (#EF4444)

---

## 📝 Implementation Notes

### Data Flow
1. User uploads/submits match data (or fetches from Riot API)
2. Backend processes match JSON files
3. Stability service calculates scores
4. API returns structured JSON
5. Frontend displays with visualizations

### Key Decisions Needed
1. **Data Source**: How will users get match data?
   - Riot API integration?
   - Manual JSON upload?
   - Automatic sync?

2. **Player Identification**: 
   - Single player focus?
   - Multiple players/teams?
   - User authentication?

3. **Data Storage**:
   - File-based (current)?
   - Database (SQLite/PostgreSQL)?
   - When to migrate?

4. **Frontend Framework**:
   - Vanilla JS (simplest start)
   - React/Vue (if scaling)
   - Consider later

---

## 🔧 Technical Stack

### Backend
- **FastAPI** - API framework
- **Pandas** - Data processing
- **Python 3.x**

### Frontend (Recommended Start)
- **Vanilla HTML/CSS/JS** - Simple, no build step
- **Chart.js** - For graphs/charts
- **Leaflet/Mapbox** - For future map visualization

### Future Considerations
- **SQLite/PostgreSQL** - Database
- **React/Vue** - Frontend framework
- **Docker** - Containerization
- **Riot API** - Official data source
