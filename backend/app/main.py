from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from app.api.routes import stats, chat, account
from app.database import init_db
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="ValAI - Valorant Statistics API", version="1.0.0")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stats.router)
app.include_router(chat.router)
app.include_router(account.router)

@app.get("/")
async def root():
    return {
        "message": "ValAI API",
        "version": "1.0.0",
        "endpoints": {
            "stats": "/api/stats",
            "last_match": "/api/stats/last-match",
            "stability": "/api/stats/stability/{player_id}",
            "matches": "/api/stats/matches/{player_id}",
            "players": "/api/stats/players",
            "chat": "/api/chat/completions",
            "account": {
                "register": "/api/account/register",
                "login": "/api/account/login",
                "profile": "/api/account/me",
                "change_password": "/api/account/change-password"
            }
        }
    }