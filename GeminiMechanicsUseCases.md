# Gemini Mechanics Use Cases

Integrating an LLM like Gemini into the browser RPG opens up a whole new layer of dynamic, infinitely replayable content. Because the game already has a strong foundation of structured data (like `monster-manager.js`, combat logs, and tile-based exploration), Gemini can hook into these systems beautifully.

## 1. The "Map Generator" (Hybrid Approach)
**Can Gemini generate a dungeon map?** Yes! You could prompt Gemini to return a 2D array (e.g., a 10x10 JSON grid) using the game's tile keys (`empty`, `wall`, `obscured`, `chest`, `enemy`).

**The Best Way to Do It:** LLMs can sometimes struggle with strict spatial logic (like guaranteeing a continuous path from the entrance to the exit). The most reliable approach is a **hybrid model**:
* **Procedural Algorithm (Local):** Use a standard algorithm (like Cellular Automata or BSP) in JavaScript to generate the physical walls, floors, and pathing.
* **Gemini (API):** Pass the generated room shapes to Gemini and ask it to "populate and decorate" the dungeon. Gemini can dictate what monsters spawn in which rooms, where the traps are, what the loot is, and write a custom flavor text description for the dungeon (e.g., *"A damp, echoing cavern smelling of ozone, currently occupied by Orbital Shamans."*).

## 2. Infinite Monster Generation
The `monster-manager.js` file is perfectly set up for this. It uses structured objects with `stats`, `greetings`, `weaknesses`, and `drops`.
* **How it works:** When a player enters an `obscured` tile, instead of just pulling a random monster from the predefined list, you could ask Gemini to invent an "Elite" or "Mutated" monster on the fly.
* **Example:** Gemini returns a JSON object with a new name ("Abyssal Beholder"), buffs its stats by 20%, assigns it a random combination of existing `attacks` and `specials`, writes a custom `greeting` ("*Its many eyes lock onto you, reflecting countless deaths*"), and applies a random CSS `portraitFilter` (like `hue-rotate`) to an existing portrait to make it look unique.

## 3. Dynamic Combat Logs and Flavor Text
The combat simulator relies on logs to tell the player what happened (e.g., "Goblin used Slash for 15 damage").
* **How it works:** You could send a summary of a combat round to Gemini and have it generate a more narrative, D&D-style description of the action.
* **Example:** Instead of "Dragon Hatchling used bite on Skeleton," Gemini could output: *"The Dragon Hatchling lunges forward, its jaws snapping around the Skeleton's ribcage and shattering bone for 12 damage!"* This is especially cool for finishing blows or critical hits.

## 4. Procedural Loot and Artifacts
Instead of just dropping a standard `TIER1_POTION` or sword, Gemini can generate completely unique items.
* **How it works:** Ask Gemini to create a weapon based on the monster that just died. If you killed a `cultist_of_whispers`, Gemini might generate a weapon called "Dagger of the Silent Void" with +5 INT and a custom lore description attached to it.

## 5. Interactive NPCs or Events
If you add non-combat encounters to your map (like finding a trapped merchant or a mysterious shrine), Gemini can act as a Game Master. The player could type a custom response to the situation, and Gemini would evaluate what happens next based on the player's stats and inventory.
