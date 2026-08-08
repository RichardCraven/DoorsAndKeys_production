# Buildings & Construction Documentation

## Overview

The building system allows the crew to construct permanent structures on dungeon tiles. Buildings provide defensive, functional, and strategic benefits to the party. Construction is divided into three distinct categories accessible via tabs in the Construction UI:

1. **Earthly** (Default): Standard field structures and fortifications available to all parties.
2. **Arcane** (Conditional): Mystical locus towers. Enabled when a **Wizard** or **Summoner** is active in the living crew.
3. **Obscure** (Locked): Nether structures (Infernal Tower, Infernal Pit) currently reserved for future demonic tech trees.

---

## Building Catalog

### 1. Earthly Buildings (Default Tab)

| Building | Key | Tag | Base Build Time | Wood Cost | Stone Cost | Slate Cost | Description |
|---|---|---|---|---|---|---|---|
| **Hut** | `hut` | FUNCTIONAL | 20s | 0 | 0 | 0 | Safe haven for crew. Prevents Pygmy ambushes on tile. Replaces any prior Hut. |
| **Outpost** | `outpost` | STRUCTURE | 35s | 5 | 3 | 0 | Fortified wooden outpost for securing territory. |
| **Observer Platform** | `observer_platform` | STRUCTURE | 50s | 8 | 2 | 0 | Elevated wooden watchtower with a wide vantage point. |
| **Earthen Fort** | `earthen_fort` | FORTIFICATION | 75s | 10 | 8 | 2 | Reinforced earthen mound with defensive palisades. |
| **War Camp** | `war_camp` | FORTIFICATION | 105s | 15 | 12 | 4 | Sprawling military encampment for housing crew and forces. |
| **War Fort** | `war_fort` | STRONGHOLD | 150s | 20 | 20 | 8 | Impenetrable stone-and-slate stronghold capable of enduring sieges. |

### 2. Arcane Buildings (Unlocked by Wizard or Summoner)

| Building | Key | Tag | Base Build Time | Wood Cost | Stone Cost | Slate Cost | Description |
|---|---|---|---|---|---|---|---|
| **Frozen Locus** | `frozen_locus` | ARCANE | 60s | 10 | 5 | 2 | Arcane spire focusing cryonic energy. |
| **Emerald Locus** | `emerald_locus` | ARCANE | 85s | 12 | 8 | 4 | Verdant pillar resonating with nature spellcraft. |
| **Cosmic Locus** | `cosmic_locus` | ARCANE | 120s | 15 | 12 | 6 | Celestial spire channeling astral magic. |

### 3. Obscure Buildings (Locked)

| Building | Key | Tag | Base Build Time | Wood Cost | Stone Cost | Slate Cost | Description |
|---|---|---|---|---|---|---|---|
| **Infernal Tower** | `infernal_tower` | OBSCURE | 180s | 25 | 25 | 10 | Jagged spire channeling Nether brimstone. |
| **Infernal Pit** | `infernal_pit` | OBSCURE | 220s | 30 | 30 | 15 | Fiery chasm granting access to Nether forces. |

---

## Dead Crew Member Build Time Penalty

Default build times assume all crew members are alive. For each dead member when construction is triggered, the build time increases according to the dead member ratio.

### Math & Formula

Let $f$ be the fraction of dead crew members:
$$f = \frac{\text{deadCount}}{\text{totalCrewCount}}$$

The build time multiplier $M(f)$ is defined as:
$$M(f) = 1 + 4.65 \cdot f + 5.4 \cdot f^2$$

$$\text{Actual Build Time (seconds)} = \text{Math.round}(\text{Base Build Time} \cdot M(f))$$

### Benchmark Examples

* **0% Dead (0/N)**: Multiplier = $1.0\times$ (100% of base build time)
  * 10s base $\to$ 10s
* **25% Dead (1/4)**: Multiplier = $2.5\times$ (250% of base build time, +150% penalty)
  * 10s base $\to$ 25s
* **66.67% Dead (2/3)**: Multiplier = $6.5\times$ (650% of base build time, +550% penalty)
  * 10s base $\to$ 65s

---

## Post-Construction Stamina Tax

Constructing a building taxes each living crew member who contributed to the effort.

### Rules & Mechanics

1. **Tax Percentage**:
   $$\text{penaltyPct} = \max(\text{actualBuildTimeSec}, 30)$$
   * *Minimum penalty*: 30%.
   * *Scaling*: Equal to the actual build duration in seconds if greater than 30s.

2. **Impact on Combat**:
   In the next battle, living contributors start with reduced stamina (endurance):
   $$\text{Starting Stamina} = \max(1, \text{Math.round}(\text{Max Endurance} \cdot (1 - \text{penaltyPct} / 100)))$$
   * *Example*: A unit with 100 max stamina under a 30% building tax starts combat at 70 stamina.

3. **Duration & Erasure**:
   * **Expiration**: Lasts for 1 hour ($3600000\text{ ms}$) OR until the next battle, whichever comes first.
   * **Camp Rest**: Resting at camp immediately erases the penalty for all crew members.
