/**
 * recipes.js
 * Maps reagent combinations to compound potions for the Sage's Compound Potions builder.
 *
 * Each recipe:
 *   id         - unique recipe identifier (= potion id)
 *   potionId   - the POTIONS key this recipe produces
 *   reagents   - array of reagent IDs (2 or 3 ingredients, order-independent)
 *
 * Matching: sort the player's selected reagents alphabetically, join with '+',
 * and compare to each recipe's sorted reagents string.
 */
export const RECIPES = [
    // ── 2-ingredient recipes ────────────────────────────────────────────────
    {
        id: 'recipe_healing_salve',
        potionId: 'healing_salve',
        reagents: ['grass', 'leaves'],
    },
    {
        id: 'recipe_greater_salve',
        potionId: 'greater_salve',
        reagents: ['flower', 'leaves'],
    },
    {
        id: 'recipe_poison_antidote',
        potionId: 'poison_antidote',
        reagents: ['seaweed', 'twig'],
    },
    {
        id: 'recipe_clarity_potion',
        potionId: 'clarity_potion',
        reagents: ['flower', 'mushroom'],
    },

    // ── 3-ingredient recipes ─────────────────────────────────────────────────
    {
        id: 'recipe_health_potion',
        potionId: 'health_potion',
        reagents: ['egg', 'flower', 'mushroom'],
    },
    {
        id: 'recipe_strength_elixir',
        potionId: 'strength_elixir',
        reagents: ['egg', 'nuts', 'stinger'],
    },
    {
        id: 'recipe_endurance_brew',
        potionId: 'endurance_brew',
        reagents: ['bramble', 'nuts', 'twig'],
    },
    {
        id: 'recipe_shadow_draught',
        potionId: 'shadow_draught',
        reagents: ['bramble', 'eye', 'seaweed'],
    },
    {
        id: 'recipe_swiftness_tonic',
        potionId: 'swiftness_tonic',
        reagents: ['grass', 'stinger', 'twig'],
    },
    {
        id: 'recipe_frost_essence',
        potionId: 'frost_essence',
        reagents: ['egg', 'seaweed', 'twig'],
    },
    {
        id: 'recipe_arcane_infusion',
        potionId: 'arcane_infusion',
        reagents: ['eye', 'flower', 'mushroom'],
    },
    {
        id: 'recipe_cobalt_elixir',
        potionId: 'cobalt_elixir',
        reagents: ['bramble', 'grass', 'nuts'],
    },
    {
        id: 'recipe_void_extract',
        potionId: 'void_extract',
        reagents: ['eye', 'seaweed', 'stinger'],
    },
];

/**
 * matchRecipe(selectedReagentIds: string[]) → Recipe | null
 * Returns the matching recipe if the selected reagents (regardless of order) form a valid combination.
 */
export function matchRecipe(selectedReagentIds) {
    if (!Array.isArray(selectedReagentIds) || selectedReagentIds.length < 2) return null;
    const key = [...selectedReagentIds].sort().join('+');
    return RECIPES.find(r => [...r.reagents].sort().join('+') === key) || null;
}

export default RECIPES;
