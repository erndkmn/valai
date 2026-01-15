"""
Stability service for calculating and categorizing player stability scores.
"""
from typing import Dict, Optional
import pandas as pd


# Stability score thresholds and categories
# Updated for 0-100 scale: 71-100 = stable, 31-70 = inconsistent, 0-30 = unstable
STABILITY_THRESHOLDS = {
    "very_stable": {"min": 0.71, "label": "Very Stable", "color": "#10B981", "volatility_max": 1.0},  # 71-100
    "stable": {"min": 0.71, "label": "Stable", "color": "#34D399", "volatility_max": 2.0},  # 71-100
    "somewhat_stable": {"min": 0.31, "label": "Inconsistent", "color": "#FBBF24", "volatility_max": 4.0},  # 31-70
    "not_stable": {"min": 0.31, "label": "Inconsistent", "color": "#F97316", "volatility_max": 6.0},  # 31-70
    "very_unstable": {"min": 0.0, "label": "Unstable", "color": "#b33a3c", "volatility_max": 100.0},  # 0-30 - distinct muted red
}


def categorize_stability_score(score_0_1: float) -> Dict[str, any]:
    """
    Categorize a stability score into a label and metadata.
    
    Args:
        score_0_1: Stability score (0-1 range, higher is more stable)
        
    Returns:
        Dictionary with category, label, color, and volatility info
        Score is returned as 0-100 integer scale
    """
    # Convert to 0-100 for categorization
    score_0_100 = score_0_1 * 100
    
    if score_0_100 >= 71:
        category = "very_stable"  # 71-100: Stable
    elif score_0_100 >= 31:
        category = "somewhat_stable"  # 31-70: Inconsistent
    else:
        category = "very_unstable"  # 0-30: Unstable
    
    threshold_info = STABILITY_THRESHOLDS[category]
    
    # Calculate approximate volatility from score (inverse: volatility = (1/score) - 1)
    volatility = (1 / score_0_1) - 1 if score_0_1 > 0 else 100.0
    
    # Convert to 0-100 scale (integer)
    score_0_100 = round(score_0_1 * 100)
    
    return {
        "score": score_0_100,  # Now 0-100 integer
        "score_raw": round(score_0_1, 4),  # Keep raw for internal use
        "category": category,
        "label": threshold_info["label"],
        "color": threshold_info["color"],
        "volatility": round(volatility, 2),
        "description": _get_description(category)
    }


def _get_description(category: str) -> str:
    """Get human-readable description for stability category."""
    descriptions = {
        "very_stable": "Excellent consistency - Your headshot rate is very consistent across matches.",
        "stable": "Good consistency - Your performance is relatively stable.",
        "somewhat_stable": "Average consistency - Some variation in your performance.",
        "not_stable": "Poor consistency - Significant variation in your headshot rate.",
        "very_unstable": "Very poor consistency - Your performance varies greatly between matches."
    }
    return descriptions.get(category, "")


def compute_rolling_stats(df: pd.DataFrame, window: int = 3) -> pd.DataFrame:
    """
    Compute rolling statistics for stability analysis.
    
    Args:
        df: DataFrame with player_id, hs_rate, match_date columns
        window: Rolling window size (default: 3)
        
    Returns:
        DataFrame with additional columns: hs_rolling_3, hs_delta, hs_volatility_3, stability_score
    """
    df = df.copy()
    
    # Compute rolling mean
    df["hs_rolling_3"] = (
        df.groupby("player_id")["hs_rate"]
        .rolling(window=window, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )
    
    # Compute delta from rolling mean
    df["hs_delta"] = df["hs_rate"] - df["hs_rolling_3"]
    
    # Compute rolling standard deviation (volatility)
    df["hs_volatility_3"] = (
        df.groupby("player_id")["hs_rate"]
        .rolling(window=window, min_periods=2)
        .std()
        .reset_index(0, drop=True)
    )
    
    # Compute stability score: 1 / (1 + volatility)
    # Higher score = more stable (lower volatility)
    df["stability_score"] = 1 / (1 + df["hs_volatility_3"].fillna(0))
    
    return df


def get_player_stability(df: pd.DataFrame, player_id: str, start_date: Optional[pd.Timestamp] = None, end_date: Optional[pd.Timestamp] = None) -> Optional[Dict]:
    """
    Get stability analysis for a specific player, optionally filtered by date range.
    
    Args:
        df: DataFrame with stability scores computed
        player_id: Player UUID to analyze
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        
    Returns:
        Dictionary with stability information or None if player not found
    """
    player_data = df[df["player_id"] == player_id].copy()
    
    if player_data.empty:
        return None
    
    # Filter by date range if provided
    if start_date is not None:
        player_data = player_data[player_data["match_date"] >= start_date]
    if end_date is not None:
        player_data = player_data[player_data["match_date"] <= end_date]
    
    if player_data.empty:
        return None
    
    # Get the latest stability score
    latest = player_data.iloc[-1]
    stability_score = latest["stability_score"]
    
    # Get all stability scores for trend (convert to 0-100 scale)
    stability_scores = [round(s * 100) for s in player_data["stability_score"].tolist()]
    hs_rates = player_data["hs_rate"].tolist()
    dates = player_data["match_date"].tolist()
    
    # Calculate average HS rate for the filtered period
    avg_hs_rate = round(player_data["hs_rate"].mean(), 2)
    
    category_info = categorize_stability_score(stability_score)
    
    return {
        **category_info,
        "current_hs_rate": round(latest["hs_rate"], 2),
        "avg_hs_rate": avg_hs_rate,  # Average across filtered period
        "volatility": round(latest["hs_volatility_3"], 2),
        "match_count": len(player_data),
        "trend": {
            "stability_scores": stability_scores,  # Already 0-100 scale
            "hs_rates": [round(h, 2) for h in hs_rates],
            "dates": [d.isoformat() if hasattr(d, 'isoformat') else str(d) for d in dates]
        }
    }
