"""
API routes for statistics endpoints.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
import sys
import os
import pandas as pd

# Add parent directories to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from app.services.match_service import load_all_matches, get_last_match_stats, get_last_n_matches, get_average_hs_rate
from app.services.stability_service import compute_rolling_stats, get_player_stability

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/last-match")
async def get_last_match(player_id: Optional[str] = None):
    """
    Get statistics from the last match.
    
    Args:
        player_id: Optional player ID. If not provided, returns first player from last match.
    """
    try:
        df_all = load_all_matches()
        stats = get_last_match_stats(df_all, player_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_timeframe_dates(timeframe: str):
    """Convert timeframe string to start and end dates."""
    now = pd.Timestamp.now(tz='UTC')
    end_date = now
    
    if timeframe == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "yesterday":
        start_date = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "week":
        start_date = now - timedelta(days=7)
    elif timeframe == "month":
        start_date = now - timedelta(days=30)
    elif timeframe == "season":
        # Assume season is ~90 days
        start_date = now - timedelta(days=90)
    elif timeframe == "all_time" or timeframe == "all":
        start_date = None
        end_date = None
    else:
        start_date = None
        end_date = None
    
    return start_date, end_date


@router.get("/stability/{player_id}")
async def get_stability_analysis(
    player_id: str,
    timeframe: str = Query("all_time", description="Timeframe: today, yesterday, week, month, season, all_time")
):
    """
    Get stability analysis for a specific player.
    
    Args:
        player_id: Player UUID
        timeframe: Timeframe filter (today, yesterday, week, month, season, all_time)
    """
    try:
        df_all = load_all_matches()
        df_all = compute_rolling_stats(df_all)
        
        start_date, end_date = get_timeframe_dates(timeframe)
        stability = get_player_stability(df_all, player_id, start_date, end_date)
        
        if stability is None:
            # Return empty state data instead of 404 for timeframe with no matches
            return {
                "score": 0,
                "score_raw": 0,
                "category": "no_data",
                "label": "No Data",
                "color": "#666666",
                "volatility": 0,
                "description": "No matches played during this time frame.",
                "current_hs_rate": 0,
                "avg_hs_rate": 0,
                "match_count": 0,
                "empty": True,
                "trend": {
                    "stability_scores": [],
                    "hs_rates": [],
                    "dates": []
                }
            }
        
        return stability
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/matches/{player_id}")
async def get_recent_matches(
    player_id: str,
    limit: int = Query(5, description="Number of matches to return"),
    timeframe: str = Query("all_time", description="Timeframe: today, yesterday, week, month, season, all_time")
):
    """
    Get recent matches for a player.
    
    Args:
        player_id: Player UUID
        limit: Number of matches to return (default: 5)
        timeframe: Timeframe filter (today, yesterday, week, month, season, all_time)
    """
    try:
        df_all = load_all_matches()
        start_date, end_date = get_timeframe_dates(timeframe)
        matches = get_last_n_matches(df_all, player_id, limit, start_date, end_date)
        
        # Return empty array instead of 404 for timeframe with no matches
        if not matches:
            return {"player_id": player_id, "matches": [], "count": 0, "empty": True}
        
        return {"player_id": player_id, "matches": matches, "count": len(matches)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/avg-hs-rate/{player_id}")
async def get_avg_hs_rate(
    player_id: str,
    timeframe: str = Query("all_time", description="Timeframe: today, yesterday, week, month, season, all_time")
):
    """
    Get average headshot rate for a player within a timeframe.
    
    Args:
        player_id: Player UUID
        timeframe: Timeframe filter (today, yesterday, week, month, season, all_time)
    """
    try:
        df_all = load_all_matches()
        start_date, end_date = get_timeframe_dates(timeframe)
        avg_rate = get_average_hs_rate(df_all, player_id, start_date, end_date)
        
        # Handle None/NaN case for empty timeframe
        if avg_rate is None or (isinstance(avg_rate, float) and pd.isna(avg_rate)):
            return {"player_id": player_id, "avg_hs_rate": 0, "timeframe": timeframe, "empty": True}
        
        return {"player_id": player_id, "avg_hs_rate": avg_rate, "timeframe": timeframe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/players")
async def get_all_players():
    """
    Get list of all players in the dataset.
    """
    try:
        df_all = load_all_matches()
        players = df_all["player_id"].unique().tolist()
        return {"players": players, "count": len(players)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
