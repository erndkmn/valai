import pandas as pd
from matchData import match_data
import json
import os

def load_all_matches(num_matches=10):
    dfs = []
    for i in range(1, num_matches+1):
        fname = f"response{i}.json"
        if os.path.exists(fname):
            with open(fname, "r", encoding="utf-8") as f:
                data = json.load(f)
                dfs.append(match_data(data))
    if not dfs:
        raise ValueError("No match data found!")
    df_all = pd.concat(dfs, ignore_index=True)
    df_all = df_all.sort_values(["player_id", "match_date"])
    return df_all

def compute_rolling_stats(df, window=3):
    df = df.copy()
    df["hs_rolling_3"] = (
        df.groupby("player_id")["hs_rate"]
          .rolling(window=window, min_periods=1)
          .mean()
          .reset_index(level=0, drop=True)
    )
    df["hs_delta"] = df["hs_rate"] - df["hs_rolling_3"]
    df["hs_volatility_3"] = (
        df.groupby("player_id")["hs_rate"]
          .rolling(window=window, min_periods=2)
          .std()
          .reset_index(0, drop=True)
    )
    df["stability_score"] = 1 / (1 + df["hs_volatility_3"])
    return df

def get_last_n_matches(df, n=5):
    # Get last n matches for each player
    return df.groupby("player_id").tail(n)

def compare_short_vs_season(df_season, df_short):
    # Compute season avg for each player
    season_avg = df_season.groupby("player_id")["hs_rate"].mean().rename("season_avg_hs_rate")
    # Compute short-term avg for each player
    short_avg = df_short.groupby("player_id")["hs_rate"].mean().rename("last5_avg_hs_rate")
    # Join and compute drop-off
    compare = pd.concat([season_avg, short_avg], axis=1)
    compare["drop_off"] = compare["last5_avg_hs_rate"] - compare["season_avg_hs_rate"]
    return compare

if __name__ == "__main__":
    df_all = load_all_matches(num_matches=10)
    df_all = compute_rolling_stats(df_all, window=3)
    df_last5 = get_last_n_matches(df_all, n=5)
    compare = compare_short_vs_season(df_all, df_last5)
    print("\n=== Full Data with Rolling Stats ===")
    print(df_all)
    print("\n=== Last 5 Matches per Player ===")
    print(df_last5)
    print("\n=== Comparison: Last 5 vs Season Average ===")
    print(compare)
    # Optionally, flag drop-off
    threshold = -5  # e.g., -5% drop
    flagged = compare[compare["drop_off"] < threshold]
    if not flagged.empty:
        print("\nPlayers with significant drop-off in HS rate (last 5 vs season):")
        print(flagged)