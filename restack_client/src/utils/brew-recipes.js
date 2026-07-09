/**
 * brew-recipes.js
 * Maps 2-ingredient combinations to Barbarian brews.
 */
export const BREW_RECIPES = [
    {
        id: 'recipe_rage_brew',
        brewId: 'rage_brew',
        reagents: ['beer', 'pepper'],
    },
    {
        id: 'recipe_ironhide_brew',
        brewId: 'ironhide_brew',
        reagents: ['beer', 'bone'],
    },
    {
        id: 'recipe_vigor_brew',
        brewId: 'vigor_brew',
        reagents: ['water', 'berries'],
    },
    {
        id: 'recipe_bloodlust_brew',
        brewId: 'bloodlust_brew',
        reagents: ['meat', 'spices'],
    },
    {
        id: 'recipe_stout_brew',
        brewId: 'stout_brew',
        reagents: ['beer', 'meat'],
    },
    {
        id: 'recipe_bone_brew',
        brewId: 'bone_brew',
        reagents: ['bone', 'pepper'],
    },
    {
        id: 'recipe_wild_brew',
        brewId: 'wild_brew',
        reagents: ['berries', 'spices'],
    }
];

/**
 * matchBrewRecipe(selectedIngredientIds: string[]) → Recipe | null
 * Returns the matching recipe if the selected ingredients (exactly 2, order-independent) form a valid combination.
 */
export function matchBrewRecipe(selectedIngredientIds) {
    if (!Array.isArray(selectedIngredientIds) || selectedIngredientIds.length !== 2) return null;
    const key = [...selectedIngredientIds].sort().join('+');
    return BREW_RECIPES.find(r => [...r.reagents].sort().join('+') === key) || null;
}

export default BREW_RECIPES;
