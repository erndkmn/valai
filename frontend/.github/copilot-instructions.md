# ValAI Frontend - Next.js Application

## Project Overview
Next.js frontend for ValAI - a Valorant statistics analysis platform.

## Tech Stack
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Chart.js with react-chartjs-2
- FastAPI backend at localhost:8000

## Key Components
- PlayerSelector: Dropdown to select players
- StabilityCard: Displays stability score and metrics
- TimeframeSelector: Filter data by time period
- TrendChart: Line chart showing stability and HS rate trends
- RecentMatches: List of recent match statistics
- TabNavigation: Switch between Stability/Positioning/Copilot tabs

## API Endpoints (Backend at localhost:8000)
- GET /api/stats/players - List all players
- GET /api/stats/stability/{player_id} - Stability analysis
- GET /api/stats/matches/{player_id} - Recent matches
- GET /api/stats/avg-hs-rate/{player_id} - Average headshot rate

## Development
```bash
npm run dev
```

## Build
```bash
npm run build
```
