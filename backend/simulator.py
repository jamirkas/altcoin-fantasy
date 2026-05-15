"""
MechLeague Battle Simulator
Deterministic auto-battler: mech A vs mech B.
Token prices modulate ability power. Captain slot = 2x ability.
Outputs full battle log for CSS animation replay.
"""
import hashlib
import math
from dataclasses import dataclass, field
from typing import Optional

# ─── Token definitions ───
TOKENS = {
    0: {"symbol": "BTC", "color": "#F7931A", "personality": "heavy"},
    1: {"symbol": "ETH", "color": "#627EEA", "personality": "balanced"},
    2: {"symbol": "SOL", "color": "#9945FF", "personality": "speedy"},
    3: {"symbol": "LINK", "color": "#2A5ADA", "personality": "calculated"},
    4: {"symbol": "AVAX", "color": "#E84142", "personality": "aggressive"},
}

SLOTS = ["head", "armor", "weapon", "secondary", "legs", "boosters"]

# ─── Ability definitions ───
ABILITIES = {
    0: {  # HEAD — Mind Hack
        "name": "MIND HACK",
        "icon": "🧠",
        "base_power": 12,       # steals N% of enemy strength
        "duration": 10,         # effect duration in ticks
        "cooldown": 14,         # ticks between uses
        "description": "Steals {power}% of enemy ability power",
    },
    1: {  # ARMOR — Fortify
        "name": "FORTIFY",
        "icon": "🛡️",
        "base_power": 18,       # N HP shield
        "duration": 12,
        "cooldown": 16,
        "description": "Grants {power} HP shield, immune to crits",
    },
    2: {  # WEAPON — Strike
        "name": "STRIKE",
        "icon": "⚔️",
        "base_power": 22,       # direct damage N
        "duration": 1,          # instant
        "cooldown": 8,          # fastest cooldown
        "description": "Deals {power} damage, crit chance = token bonus%",
    },
    3: {  # SECONDARY — Disrupt
        "name": "DISRUPT",
        "icon": "🔫",
        "base_power": 0,        # no direct damage
        "duration": 5,          # disables enemy ability
        "cooldown": 20,
        "description": "Disables random enemy ability for 5s",
    },
    4: {  # LEGS — Evade
        "name": "EVADE",
        "icon": "🦿",
        "base_power": 25,       # % dodge chance
        "duration": 4,
        "cooldown": 12,
        "description": "{power}% chance to dodge next attack",
    },
    5: {  # BOOSTERS — Overdrive
        "name": "OVERDRIVE",
        "icon": "🚀",
        "base_power": 50,       # % speed boost
        "duration": 8,
        "cooldown": 22,
        "description": "All abilities recharge {power}% faster",
    },
}

@dataclass
class MechState:
    mech_id: int
    owner: str
    token_ids: list[int]  # 6 token IDs
    captain_index: int
    hp: int = 500
    max_hp: int = 500
    shield: int = 0
    dodging: bool = False
    disrupted_slot: Optional[int] = None  # which slot is disabled
    disrupted_until: int = 0
    overdriven: bool = False
    overdrive_until: int = 0
    abilities_on_cooldown: dict[int, int] = field(default_factory=dict)  # slot -> ready_at_tick
    stolen_power: float = 0  # % power stolen by enemy Mind Hack

@dataclass
class BattleEvent:
    tick: int
    actor: str  # "A" or "B"
    slot: int
    ability_name: str
    icon: str
    damage: int = 0
    shielded: int = 0
    dodged: bool = False
    crit: bool = False
    effect: str = ""  # "Shield +{n}", "DODGED!", "CRIT!", "DISABLED!", "STOLEN!"
    mechA_hp: int = 500
    mechB_hp: int = 500

@dataclass
class BattleResult:
    winner: str  # "A" or "B" or "DRAW"
    mechA_hp_final: int
    mechB_hp_final: int
    events: list[BattleEvent]
    mechA_stats: dict
    mechB_stats: dict
    seed: str


def simulate_battle(
    mechA_id: int,
    mechA_tokens: list[int],
    mechA_captain: int,
    mechB_id: int,
    mechB_tokens: list[int],
    mechB_captain: int,
    prices: dict[str, float],  # symbol -> 24h_change_pct
    seed: str = "",
) -> BattleResult:
    """
    Deterministic auto-battler.
    
    prices: e.g. {"BTC": 2.1, "ETH": -0.5, "SOL": 12.3, "LINK": 1.8, "AVAX": -4.2}
    Positive = pumped in 24h → ability bonus. Negative = dumped → ability penalty.
    """
    if not seed:
        seed = hashlib.sha256(
            f"{mechA_id}{mechA_tokens}{mechB_id}{mechB_tokens}{prices}".encode()
        ).hexdigest()[:16]

    rng = RNG(seed)

    a = MechState(mech_id=mechA_id, owner="A", token_ids=list(mechA_tokens), captain_index=mechA_captain)
    b = MechState(mech_id=mechB_id, owner="B", token_ids=list(mechB_tokens), captain_index=mechB_captain)

    # Calculate ability powers (base + token price bonus)
    a_powers = _calc_powers(a, prices)
    b_powers = _calc_powers(b, prices)

    events: list[BattleEvent] = []
    MAX_TICKS = 60  # 30 seconds at 0.5s per tick
    TICK_DURATION = 0.5

    for tick in range(MAX_TICKS):
        if a.hp <= 0 or b.hp <= 0:
            break

        # Clear expired effects
        _tick_effects(a, tick)
        _tick_effects(b, tick)

        # Alternate who acts (A acts on even ticks, B on odd)
        if tick % 2 == 0:
            actor = a; defender = b; actor_powers = a_powers; defender_powers = b_powers; actor_id = "A"
        else:
            actor = b; defender = a; actor_powers = b_powers; defender_powers = a_powers; actor_id = "B"

        # Pick ability: find available slot with lowest cooldown
        available = [
            s for s in range(6)
            if actor.abilities_on_cooldown.get(s, 0) <= tick
            and actor.disrupted_slot != s
        ]
        if not available:
            # Basic attack if nothing available
            dmg = max(1, int(actor_powers[2]["effective"] * 0.4))
            if defender.dodging and rng.chance(defender_powers[4]["effective"]):
                events.append(BattleEvent(tick, actor_id, 99, "BASIC", "👊", dodged=True,
                    effect="DODGED!", mechA_hp=a.hp, mechB_hp=b.hp))
                defender.dodging = False
            else:
                dmg = _apply_damage(defender, dmg)
                events.append(BattleEvent(tick, actor_id, 99, "BASIC", "👊", damage=dmg,
                    mechA_hp=a.hp, mechB_hp=b.hp))
            continue

        # Pick slot: prefer weapon (2) if available, else random from available
        slot = 2 if 2 in available else available[rng.randint(0, len(available) - 1)]
        power = actor_powers[slot]["effective"]
        ability = ABILITIES[slot]
        cooldown = ability["cooldown"]
        if actor.overdriven:
            cooldown = max(4, cooldown // 2)
        actor.abilities_on_cooldown[slot] = tick + cooldown

        event = BattleEvent(tick, actor_id, slot, ability["name"], ability["icon"],
            mechA_hp=a.hp, mechB_hp=b.hp)

        if slot == 0:  # MIND HACK — steal power
            steal_pct = min(50, power)
            defender.stolen_power = steal_pct
            event.effect = f"STEALS {steal_pct:.0f}% POWER"

        elif slot == 1:  # FORTIFY — shield
            actor.shield = int(power * 2)
            event.effect = f"SHIELD +{actor.shield}"

        elif slot == 2:  # STRIKE — direct damage
            dmg = int(power * 1.5)
            is_crit = rng.chance(max(0, power - 15))  # crit chance = power above 15%
            if is_crit:
                dmg = int(dmg * 1.8)
                event.crit = True
                event.effect = "CRIT!"

            if defender.dodging and rng.chance(defender_powers[4]["effective"]):
                event.dodged = True
                event.effect = "DODGED!"
                defender.dodging = False
            else:
                dmg = _apply_damage(defender, dmg)
                event.damage = dmg
                if defender.shield > 0:
                    event.shielded = min(dmg, defender.shield)

        elif slot == 3:  # DISRUPT — disable random enemy slot
            target_slot = rng.randint(0, 5)
            defender.disrupted_slot = target_slot
            defender.disrupted_until = tick + ability["duration"]
            event.effect = f"DISABLED {SLOTS[target_slot].upper()}!"

        elif slot == 4:  # EVADE — dodge buff
            actor.dodging = True
            event.effect = f"READY TO DODGE"

        elif slot == 5:  # OVERDRIVE — speed boost
            actor.overdriven = True
            actor.overdrive_until = tick + ability["duration"]
            event.effect = "ALL ABILITIES FAST!"

        events.append(event)

    # Result
    if a.hp <= 0 and b.hp <= 0:
        winner = "DRAW"
    elif a.hp <= 0:
        winner = "B"
    elif b.hp <= 0:
        winner = "A"
    else:
        winner = "A" if a.hp > b.hp else ("B" if b.hp > a.hp else "DRAW")

    return BattleResult(
        winner=winner,
        mechA_hp_final=a.hp,
        mechB_hp_final=b.hp,
        events=events,
        mechA_stats={"powers": {SLOTS[i]: p["effective"] for i, p in enumerate(a_powers)}},
        mechB_stats={"powers": {SLOTS[i]: p["effective"] for i, p in enumerate(b_powers)}},
        seed=seed,
    )


def _calc_powers(mech: MechState, prices: dict[str, float]) -> list[dict]:
    """Calculate effective ability power for each slot, modulated by token price change."""
    powers = []
    for slot in range(6):
        token_id = mech.token_ids[slot]
        token_symbol = TOKENS[token_id]["symbol"]
        ability = ABILITIES[slot]
        base = ability["base_power"]

        # Token price bonus: +1% ability power per 1% price pump (capped at ±50%)
        price_change = prices.get(token_symbol, 0.0)
        bonus_pct = max(-50, min(50, price_change))
        if mech.stolen_power > 0:
            bonus_pct -= mech.stolen_power
            mech.stolen_power = 0  # one-turn effect

        effective = base * (1 + bonus_pct / 100)

        # Captain boost: 2x
        if slot == mech.captain_index:
            effective *= 2.0

        powers.append({
            "slot": slot,
            "token": token_symbol,
            "token_color": TOKENS[token_id]["color"],
            "base": base,
            "price_bonus": bonus_pct,
            "effective": round(effective, 1),
            "is_captain": slot == mech.captain_index,
            "ability_name": ability["name"],
            "ability_icon": ability["icon"],
        })
    return powers


def _tick_effects(mech: MechState, tick: int):
    """Clear expired effects at start of tick."""
    if mech.disrupted_until > 0 and tick >= mech.disrupted_until:
        mech.disrupted_slot = None
        mech.disrupted_until = 0
    if mech.overdrive_until > 0 and tick >= mech.overdrive_until:
        mech.overdriven = False
        mech.overdrive_until = 0
    # Shield decays slowly
    if mech.shield > 0 and tick % 3 == 0:
        mech.shield = max(0, mech.shield - 2)


def _apply_damage(mech: MechState, dmg: int) -> int:
    """Apply damage: shield first, then HP."""
    if mech.shield > 0:
        absorbed = min(mech.shield, dmg)
        mech.shield -= absorbed
        dmg -= absorbed
    mech.hp = max(0, mech.hp - dmg)
    return dmg


class RNG:
    """Deterministic RNG from battle seed."""
    def __init__(self, seed: str):
        self.state = int(hashlib.sha256(seed.encode()).hexdigest()[:16], 16)

    def next(self) -> float:
        self.state = (self.state * 1103515245 + 12345) & 0x7FFFFFFF
        return self.state / 0x7FFFFFFF

    def chance(self, pct: float) -> bool:
        return self.next() * 100 < pct

    def randint(self, lo: int, hi: int) -> int:
        return lo + int(self.next() * (hi - lo))
