from datetime import datetime
import json
import os
import pandas as pd

def match_data(data: dict) -> pd.DataFrame:
    players = {}
    rounds = data["roundResults"]

    pd.set_option('display.max_columns', None)      # Show all columns
    pd.set_option('display.max_rows', None)         # Show all rows
    pd.set_option('display.max_colwidth', None)     # Show full column width
    pd.set_option('display.expand_frame_repr', False)  # Don't wrap DataFrame
    
    # Accumulate headshots and total shots for each player
    for round in rounds:
        for player in round["playerStats"]:
            if player["puuid"] not in players:
                players[player["puuid"]] = {
                    # "name": player["puuid"],
                    "total_kills": 0,
                    "total_shots": 0,
                    "hs_count": 0,
                    "hs_rate": 0.0
                }
            # players[player["puuid"]]["hs_count"] += player["damage"]["headshots"]
            currentPlayer = player["puuid"]
            
            # for name in data["players"]:
            #     if name["puuid"] == currentPlayer:
            #         players[currentPlayer]["name"] = name["gameName"]
            #         players[currentPlayer]["tag"] = name["tagLine"]

            players[currentPlayer]["total_kills"] += len(player["kills"])
            currPlayerDmg = player["damage"]
            for dmg in currPlayerDmg:
                players[currentPlayer]["total_shots"] += dmg["legshots"] + dmg["bodyshots"] + dmg["headshots"]
                players[currentPlayer]["hs_count"] += dmg["headshots"]

    # Calculate headshot rate for each player
    for player in players.values():
        if player["total_shots"] > 0:
            player["hs_rate"] = player["hs_count"] / player["total_shots"] * 100
        else:
            player["hs_rate"] = 0.0

    df = pd.DataFrame.from_dict(players, orient="index")

    # df["match_id"] = data["matchInfo"]["matchId"]
    df["match_date"] = convert_date(data["matchInfo"]["gameStartMillis"])

    df = df.reset_index().rename(columns={"index": "player_id"})
    # print(json.dumps(players, indent=4))
    # print(df)
    return df

def convert_date(date_str: str) -> datetime:
    from datetime import datetime, timezone

    timestamp_ms = date_str
    dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)

    return dt