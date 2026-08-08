/**
 * inscriptions-manager.js
 * Premade wall inscription content and utilities for dungeon exploration and building.
 */

export const PREMADE_INSCRIPTIONS = [
    'The pygmies fear Eshu; Whom does Eshu fear?',
    'The principalities serve Eshu; Whom does Eshu serve?',
    'Did you just feel a slight breeze in the air? There must be a draft',
    'The door is only locked if you believe it to be',

    /// generated ///
    "Beware the shadow that walks in three, for it hungers for the light you carry.",
    "Turn back. What sleeps beneath these stones has forgotten mercy.",
    "Here fell the Vanguard of the Red Citadel. We fought until the quiet took us.",
    "Blood opens what keys cannot. Spill it willingly or be undone.",
    "Look not into the mirror of the void, lest it look back through your eyes.",
    "The third archway lies. Trust only the cold stone beneath your feet.",
    "To those who follow: the water is poisoned, but the mushrooms in the east cave bring warmth.",
    "We thought the seals would hold. We were fools.",
    "Speak the name of the fallen king before the throne, or face his everlasting wraiths.",
    "Shadows dance when the lantern flickers. Do not let the flame die.",
    "The beast in the depths hears even the beat of a hesitant heart.",
    "Only gold and iron remain where empires once stood.",
    "Curse the mage who bound us to these walls. May his soul freeze in the nether.",
    "Step softly. The floors here are paved with forgotten bones.",
    "When the second bell tolls, plunge your blade into the serpent's eye.",
    "A great treasure rests behind the iron gate, guarded by endless hunger.",
    "He who drinks from the chalice of embers shall gain sight beyond mortality.",
    "Not all who enter these catacombs are lost; some were invited.",
    "The stars above cannot reach this dark realm. Keep your torch lit.",
    "Remember our names when you return to the surface world.",
    "Beyond this passage lies the chamber of the serpent priest. Prepare your wards.",
    "Five entered this tomb. Only the silence remains.",
    "Doubt is a deadlier blade than any monster's claw.",
    "Where the blue moss glows, the earth is thin. Dig with caution.",
    "May the gods have mercy on whoever opens the sealed sarcophagus."

    ////


];

/**
 * Selects a random premade inscription string.
 * @returns {string}
 */
export function getRandomInscription() {
    const index = Math.floor(Math.random() * PREMADE_INSCRIPTIONS.length);
    return PREMADE_INSCRIPTIONS[index];
}
