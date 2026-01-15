import pandas as pd
from matchData import match_data
import json

dfs=[]

for i in range(3):
    with open(f"response{i+1}.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        dfs.append(match_data(data))

df_all = pd.concat(dfs, ignore_index=True)
df_all = df_all.sort_values(["player_id", "match_date"])

df_all["hs_rolling_3"] = (
    df_all.groupby("player_id")["hs_rate"]
          .rolling(window=3, min_periods=1)
          .mean()
          .reset_index(level=0, drop=True)
)

df_all["hs_delta"] = df_all["hs_rate"] - df_all["hs_rolling_3"]

df_all["hs_volatility_3"] = (
    df_all.groupby("player_id")["hs_rate"]
          .rolling(window=3, min_periods=2)
          .std()
          .reset_index(0, drop=True)
)


df_all["stability_score"] = 1 / (1 + df_all["hs_volatility_3"])

print(df_all)