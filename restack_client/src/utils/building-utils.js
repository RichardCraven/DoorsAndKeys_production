/**
 * building-utils.js
 * Utilities for calculating building construction times, scaling for dead crew members,
 * and managing post-construction stamina penalties.
 */

import { getMeta, storeMeta, getUserId } from './session-handler';
import { updateUserRequest } from './api-handler';

/**
 * Calculates the adjusted build time in seconds given a base build time and crew list.
 * 
 * Formula:
 * - Default build time assumes 0% of crew is dead (multiplier = 1.0).
 * - For dead crew fraction f = deadCount / totalCrewCount:
 *   Multiplier M(f) = 1 + (4.65 * f) + (5.4 * f * f)
 * 
 * Examples:
 * - 0% dead => 1.0x (10s base => 10s)
 * - 25% dead (1/4) => 2.5x (10s base => 25s)
 * - 66.67% dead (2/3) => 6.5x (10s base => 65s)
 * 
 * @param {number} baseBuildTimeSec - Default build time with full alive crew
 * @param {Array} crew - Current crew list
 * @returns {number} Adjusted build time in seconds
 */
export function getAdjustedBuildTime(baseBuildTimeSec, crew = [], inSuperboard = false, buildingKey = null) {
    if (buildingKey === 'walker' || (typeof baseBuildTimeSec === 'number' && baseBuildTimeSec === 30 && buildingKey === 'walker')) return 30;
    if (inSuperboard) return (buildingKey === 'walker' ? 30 : 1);
    const base = typeof baseBuildTimeSec === 'number' ? baseBuildTimeSec : 20;
    if (!Array.isArray(crew) || crew.length === 0) return base;

    const totalCrewCount = crew.length;
    const deadCount = crew.filter(m => m && (m.dead === true || (typeof m.hp === 'number' && m.hp <= 0))).length;

    if (deadCount <= 0) return base;

    const deadFraction = deadCount / totalCrewCount;
    const multiplier = 1 + (4.65 * deadFraction) + (5.4 * deadFraction * deadFraction);
    return Math.round(base * multiplier);
}

/**
 * Applies the post-building stamina tax penalty to all living crew members who contributed to a build.
 * 
 * Rules:
 * - Penalty % = Math.max(actualBuildTimeSec, 30)
 * - Expires in 1 hour or next battle (whichever comes first)
 * - Erased by resting at camp
 * 
 * @param {Array} crew - Live crew list
 * @param {number} actualBuildTimeSec - Actual duration in seconds spent constructing
 * @param {Array<string|number>} livingContributorIds - Array of member IDs alive during build start
 * @returns {Array} Updated crew array with buildingStaminaPenalty metadata attached
 */
export function applyBuildingStaminaPenalty(crew, actualBuildTimeSec, livingContributorIds = []) {
    if (!Array.isArray(crew)) return crew;

    const now = Date.now();
    const expiresAt = now + 60 * 60 * 1000; // 1 hour duration
    const penaltyPct = Math.max(30, Math.round(actualBuildTimeSec || 30));

    return crew.map(member => {
        if (!member) return member;
        const isDead = member.dead === true || (typeof member.hp === 'number' && member.hp <= 0);
        const wasContributor = livingContributorIds.length === 0 ? !isDead : livingContributorIds.includes(member.id);

        if (wasContributor && !isDead) {
            return {
                ...member,
                buildingStaminaPenalty: {
                    penaltyPct,
                    expiresAt,
                    appliedAt: now
                }
            };
        }
        return member;
    });
}

/**
 * Clears building stamina penalties from a crew array (e.g. after resting at camp).
 * 
 * @param {Array} crew 
 * @returns {Array}
 */
export function clearBuildingStaminaPenalties(crew) {
    if (!Array.isArray(crew)) return crew;
    return crew.map(member => {
        if (!member) return member;
        if (member.buildingStaminaPenalty) {
            const copy = { ...member };
            delete copy.buildingStaminaPenalty;
            return copy;
        }
        return member;
    });
}

/**
 * Checks if a member is an arcane unit (Wizard, Summoner, Sage, etc.).
 * @param {Object} member
 * @returns {boolean}
 */
export function isArcaneUnit(member) {
    if (!member) return false;
    const stringValues = [];
    for (const [key, value] of Object.entries(member)) {
        if (typeof value === 'string') {
            stringValues.push(value.toLowerCase());
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            for (const subVal of Object.values(value)) {
                if (typeof subVal === 'string') {
                    stringValues.push(subVal.toLowerCase());
                }
            }
        }
    }
    const searchStr = stringValues.join(' ');

    return (
        searchStr.includes('wizard') ||
        searchStr.includes('summoner') ||
        searchStr.includes('summon') ||
        searchStr.includes('zildjikan') ||
        searchStr.includes('arcane') ||
        searchStr.includes('spellcaster') ||
        searchStr.includes('sage')
    );
}

export function isArcaneSelected(member) {
    return isArcaneUnit(member);
}

/**
 * Checks if the crew has a Wizard, Summoner, or other arcane unit,
 * or if an arcane unit is currently selected.
 * @param {Array} crew 
 * @param {Object} [selectedCrewMember]
 * @returns {boolean}
 */
export function hasArcaneUnit(crew = [], selectedCrewMember = null) {
    if (selectedCrewMember && isArcaneUnit(selectedCrewMember)) return true;
    if (!Array.isArray(crew)) return false;
    return crew.some(member => isArcaneUnit(member));
}

/**
 * Checks if a member is an engineer or machinist.
 * @param {Object} member
 * @returns {boolean}
 */
export function isEngineerUnit(member) {
    if (!member) return false;
    const stringValues = [];
    for (const [key, value] of Object.entries(member)) {
        if (typeof value === 'string') {
            stringValues.push(value.toLowerCase());
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            for (const subVal of Object.values(value)) {
                if (typeof subVal === 'string') {
                    stringValues.push(subVal.toLowerCase());
                }
            }
        }
    }
    const searchStr = stringValues.join(' ');
    return searchStr.includes('engineer') || searchStr.includes('machinist');
}

/**
 * Checks if the crew has an Engineer unit, or if an engineer is currently selected.
 * @param {Array} crew 
 * @param {Object} [selectedCrewMember]
 * @returns {boolean}
 */
export function hasEngineerUnit(crew = [], selectedCrewMember = null) {
    if (selectedCrewMember && isEngineerUnit(selectedCrewMember)) return true;
    if (!Array.isArray(crew)) return false;
    return crew.some(member => isEngineerUnit(member));
}

export function isEngineerSelected(member) {
    if (!member) return false;
    const isDead = member.dead === true || member.isDead === true || (typeof member.hp === 'number' && member.hp <= 0);
    if (isDead || member.detached) return false;
    return isEngineerUnit(member);
}
