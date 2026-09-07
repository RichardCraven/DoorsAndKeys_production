/**
 * Helper to determine crew member projectile vision range ring properties in Pocket Dimension.
 *
 * @param {Object} selectedMember - Active/selected crew member object
 * @param {string} bgStr - CSS background-image URL or string of active avatar
 * @param {boolean} inSuperboard - Whether player is in Pocket Dimension
 * @param {number} tileSize - Current tile size in pixels
 * @returns {Object|null} Ring specifications or null if not applicable
 */
export function getCrewRangeRingSpecs(selectedMember, bgStr = '', inSuperboard = false, tileSize = 48) {
    if (!inSuperboard) return null;

    const mType = String(
        selectedMember?.type ||
        selectedMember?.role ||
        selectedMember?.class ||
        selectedMember?.image ||
        selectedMember?.portrait ||
        selectedMember?.name ||
        ''
    ).toLowerCase();

    const bgLower = String(bgStr || '').toLowerCase();

    const isWizard = mType.includes('wizard') || mType.includes('zildjikan') || bgLower.includes('wizard') || bgLower.includes('zildjikan');
    const isRanger = mType.includes('ranger') || mType.includes('dormund') || bgLower.includes('ranger') || bgLower.includes('dormund');

    if (!isWizard && !isRanger) return null;

    // Wizard: regular vision radius = 2 tiles
    // Ranger: enhanced vision radius = 4 tiles (chemical lantern vision radius)
    const rangeTiles = isRanger ? 4 : 2;
    const diameterPx = rangeTiles * 2 * tileSize;
    const color = isWizard ? '#38bdf8' : '#4ade80';
    const bgGlow = isWizard ? 'rgba(56, 189, 248, 0.08)' : 'rgba(74, 222, 128, 0.08)';
    const boxShadow = isWizard
        ? '0 0 16px rgba(56, 189, 248, 0.45), inset 0 0 16px rgba(56, 189, 248, 0.18)'
        : '0 0 16px rgba(74, 222, 128, 0.45), inset 0 0 16px rgba(74, 222, 128, 0.18)';

    return {
        isWizard,
        isRanger,
        rangeTiles,
        diameterPx,
        color,
        bgGlow,
        boxShadow
    };
}
