import json
import random

def randomize_shots(damage):
    # Randomize legshots and bodyshots (0-4)
    damage['legshots'] = random.randint(0, 4)
    damage['bodyshots'] = random.randint(0, 4)
    # Randomize headshots (0-2), but 2 only sometimes
    damage['headshots'] = random.choices([0, 1, 2], weights=[4, 4, 1])[0]
    return damage

def process_json(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Traverse all roundResults and playerStats
    for round_result in data.get('roundResults', []):
        for player_stat in round_result.get('playerStats', []):
            if 'damage' in player_stat:
                for dmg in player_stat['damage']:
                    randomize_shots(dmg)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Usage
process_json('response1.json', 'response_randomized.json')