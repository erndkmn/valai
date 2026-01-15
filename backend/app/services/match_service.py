"""
Match service for loading and processing match data.
"""
import pandas as pd
import json
import os
from typing import List, Optional
import sys

# Add parent directory to path to import matchData
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from matchData import match_data


def load_match_file(file_path: str) -> pd.DataFrame:
    """
    Load a single match JSON file and convert to DataFrame.
    
    Args:
        file_path: Path to JSON file
        
    Returns:
        DataFrame with match data
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return match_data(data)


def load_all_matches(base_dir: Optional[str] = None, num_matches: int = 10) -> pd.DataFrame:
    """
    Load all match files from the backend directory.
    
    Args:
        base_dir: Base directory path (defaults to backend directory)
        num_matches: Maximum number of matches to load
        
    Returns:
        Combined DataFrame with all match data
    """
    if base_dir is None:
        # Default to backend directory (parent of app directory)
        # Get the directory where this file is located (services/)
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up to app/
        app_dir = os.path.dirname(current_file_dir)
        # Go up to backend/
        base_dir = os.path.dirname(app_dir)
    
    dfs = []
    files_found = []
    files_not_found = []
    
    for i in range(1, num_matches + 1):
        fname = f"response{i}.json"
        file_path = os.path.join(base_dir, fname)
        if os.path.exists(file_path):
            try:
                df = load_match_file(file_path)
                dfs.append(df)
                files_found.append(fname)
            except Exception as e:
                print(f"Error loading {fname}: {e}")
                continue
        else:
            files_not_found.append(fname)
    
    if not dfs:
        # Provide more helpful error message with debugging info
        error_msg = f"No match data found! Searched in: {base_dir}\n"
        error_msg += f"Files found: {files_found}\n"
        error_msg += f"Files not found: {files_not_found[:5]}...\n"
        error_msg += f"Current working directory: {os.getcwd()}\n"
        error_msg += f"Files in base_dir: {os.listdir(base_dir)[:10] if os.path.exists(base_dir) else 'Directory does not exist'}"
        raise ValueError(error_msg)
    
    df_all = pd.concat(dfs, ignore_index=True)
    df_all = df_all.sort_values(["player_id", "match_date"])
    return df_all


def get_last_match_stats(df: pd.DataFrame, player_id: Optional[str] = None) -> dict:
    """
    Get statistics from the last match.
    
    Args:
        df: DataFrame with match data
        player_id: Optional player ID to filter. If None, returns all players
        
    Returns:
        Dictionary with last match statistics
    """
    if player_id:
        player_data = df[df["player_id"] == player_id]
        if player_data.empty:
            return {"error": "Player not found"}
        last_match = player_data.iloc[-1]
    else:
        # Get the most recent match date across all players
        last_date = df["match_date"].max()
        last_match_data = df[df["match_date"] == last_date]
        # Return first player's data (or could return all)
        last_match = last_match_data.iloc[0]
    
    return {
        "player_id": last_match["player_id"],
        "hs_rate": round(last_match["hs_rate"], 2),
        "total_kills": int(last_match["total_kills"]),
        "total_shots": int(last_match["total_shots"]),
        "hs_count": int(last_match["hs_count"]),
        "match_date": last_match["match_date"].isoformat() if hasattr(last_match["match_date"], 'isoformat') else str(last_match["match_date"])
    }


def get_last_n_matches(df: pd.DataFrame, player_id: str, n: int = 5, start_date: Optional[pd.Timestamp] = None, end_date: Optional[pd.Timestamp] = None) -> List[dict]:
    """
    Get last N matches for a player, optionally filtered by date range.
    
    Args:
        df: DataFrame with match data
        player_id: Player UUID
        n: Number of matches to return
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        
    Returns:
        List of match dictionaries
    """
    player_data = df[df["player_id"] == player_id].copy()
    if player_data.empty:
        return []
    
    # Filter by date range if provided
    if start_date is not None:
        player_data = player_data[player_data["match_date"] >= start_date]
    if end_date is not None:
        player_data = player_data[player_data["match_date"] <= end_date]
    
    if player_data.empty:
        return []
    
    # Get last N matches (sorted by date, most recent first)
    player_data = player_data.sort_values("match_date", ascending=False)
    last_n = player_data.head(n)
    
    matches = []
    for _, row in last_n.iterrows():
        matches.append({
            "hs_rate": round(row["hs_rate"], 2),
            "total_kills": int(row["total_kills"]),
            "total_shots": int(row["total_shots"]),
            "hs_count": int(row["hs_count"]),
            "match_date": row["match_date"].isoformat() if hasattr(row["match_date"], 'isoformat') else str(row["match_date"])
        })
    
    return matches


def get_average_hs_rate(df: pd.DataFrame, player_id: str, start_date: Optional[pd.Timestamp] = None, end_date: Optional[pd.Timestamp] = None) -> float:
    """
    Get average headshot rate for a player within a date range.
    
    Args:
        df: DataFrame with match data
        player_id: Player UUID
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        
    Returns:
        Average headshot rate
    """
    player_data = df[df["player_id"] == player_id].copy()
    if player_data.empty:
        return 0.0
    
    # Filter by date range if provided
    if start_date is not None:
        player_data = player_data[player_data["match_date"] >= start_date]
    if end_date is not None:
        player_data = player_data[player_data["match_date"] <= end_date]
    
    if player_data.empty:
        return 0.0
    
    return round(player_data["hs_rate"].mean(), 2)
