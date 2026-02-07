# ValAI Backend (Node.js/Express)

A Node.js/Express implementation of the ValAI Valorant Statistics API.

## Features

- **Authentication**: JWT-based user authentication with bcrypt password hashing
- **Token Tracking**: Server-side OpenAI token tracking with monthly quotas
- **Rate Limiting**: 10 requests/minute per user (Redis or in-memory)
- **Monthly Quotas**: 
  - Free: 30,000 tokens/month
  - Standard: 300,000 tokens/month
  - Pro: 1,000,000 tokens/month
- **Statistics API**: Player statistics, stability analysis, and match history

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

   Or on Windows, just run `start_server.bat`

## API Endpoints

### Account
- `POST /api/account/register` - Register new user
- `POST /api/account/login` - Login and get JWT token
- `GET /api/account/me` - Get current user profile
- `PUT /api/account/me` - Update profile
- `POST /api/account/change-password` - Change password
- `DELETE /api/account/me` - Delete account

### Chat (requires auth)
- `POST /api/chat/completions` - AI chat completion
- `GET /api/chat/usage` - Get token usage stats
- `GET /api/chat/limits` - Get rate/quota limits

### Statistics
- `GET /api/stats/last-match` - Get last match stats
- `GET /api/stats/stability/:playerId` - Get stability analysis
- `GET /api/stats/matches/:playerId` - Get recent matches
- `GET /api/stats/avg-hs-rate/:playerId` - Get average headshot rate
- `GET /api/stats/players` - Get all players

## Project Structure

```
backend-node/
├── package.json
├── .env.example
├── .gitignore
├── start_server.bat
├── src/
│   ├── app.js              # Main entry point
│   ├── database.js         # Sequelize configuration
│   ├── migrate.js          # Database migration script
│   ├── matchData.js        # Match data processing
│   ├── api/
│   │   └── routes/
│   │       ├── index.js
│   │       ├── account.js  # Auth routes
│   │       ├── chat.js     # Chat routes
│   │       └── stats.js    # Stats routes
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   └── TokenUsage.js
│   └── services/
│       ├── index.js
│       ├── accountService.js
│       ├── authService.js
│       ├── matchService.js
│       ├── quotaService.js
│       ├── rateLimitService.js
│       └── stabilityService.js
└── valai.db               # SQLite database (created on first run)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `OPENAI_API_KEY` | OpenAI API key | (required for chat) |
| `SECRET_KEY` | JWT signing key | (auto-generated) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration | 30 |
| `DATABASE_URL` | Database URL | sqlite:./valai.db |
| `REDIS_URL` | Redis URL for rate limiting | (in-memory if not set) |

## Match Data

Place `response*.json` files (Valorant match data) in the `backend-node/` directory for the statistics endpoints to work.
