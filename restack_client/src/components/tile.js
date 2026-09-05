import React from 'react';
import * as images from '../utils/images'
import { getTreeLayersForDensity, getMountainLayersForDensity } from '../utils/autotile-utils';


const getTileTerritoryAffiliationHelper = (tObj, fallbackProps) => {
    if (!tObj && !fallbackProps) return null;
    const cObj = tObj?.contains && typeof tObj.contains === 'object' ? tObj.contains : null;
    const fObj = fallbackProps?.contains && typeof fallbackProps.contains === 'object' ? fallbackProps.contains : null;

    // Mobile units (pygmies, automatons, monsters) must never act as territory boundary sources
    const isUnit = (cObj && (cObj.isPocketPygmy || cObj.subtype === 'pocket_pygmy' || cObj.isAutomaton || cObj.subtype === 'automaton' || cObj.type === 'monsters' || cObj.type === 'pygmies' || cObj.homeStructureKey)) ||
        (fObj && (fObj.isPocketPygmy || fObj.subtype === 'pocket_pygmy' || fObj.isAutomaton || fObj.subtype === 'automaton' || fObj.type === 'monsters' || fObj.type === 'pygmies' || fObj.homeStructureKey));

    if (isUnit) return null;

    const raw = (
        tObj?.territoryAffiliation ||
        tObj?.territory ||
        fallbackProps?.territoryAffiliation ||
        fallbackProps?.territory ||
        cObj?.territory ||
        cObj?.territoryAffiliation ||
        fObj?.territory ||
        fObj?.territoryAffiliation ||
        null
    );

    if (!raw) return null;
    const str = (typeof raw === 'object' ? (raw.clan || raw.type || raw.affiliation || '') : String(raw)).trim();
    if (!str || str.toLowerCase() === 'none' || str.toLowerCase() === 'neutral' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
        return null;
    }
    return str;
};

const checkIsDomainSuperboardPerfectSquare = (superboard, anchorGx, anchorGy, growthCycles, expectedAff) => {
    if (!superboard || !Array.isArray(superboard.miniboards)) return false;
    const C = Math.max(1, growthCycles || 1);
    const minGx = anchorGx - C;
    const maxGx = anchorGx + 1 + C;
    const minGy = anchorGy - C;
    const maxGy = anchorGy + 1 + C;

    if (minGx < 0 || maxGx >= 45 || minGy < 0 || maxGy >= 45) return false;

    const expectedStr = String(expectedAff || 'player').toLowerCase();
    const isFriendly = expectedStr.includes('player') || expectedStr.includes('friendly') || expectedStr.includes('crew');
    const isHostile = !isFriendly && (expectedStr.includes('hostile') || expectedStr.includes('enemy'));

    for (let gy = minGy; gy <= maxGy; gy++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
            if (gx >= anchorGx && gx <= anchorGx + 1 && gy >= anchorGy && gy <= anchorGy + 1) {
                continue;
            }

            const mbIdx = Math.floor(gy / 15) * 3 + Math.floor(gx / 15);
            const tIdx = (gy % 15) * 15 + (gx % 15);
            const t = superboard.miniboards[mbIdx]?.tiles?.[tIdx];
            if (!t) return false;

            const isVoid = t.isVoid === true || t.contains === 'void' || (t.contains && typeof t.contains === 'object' && (t.contains.type === 'void' || t.contains.isVoid));
            if (isVoid) return false;

            const cObj = t.contains && typeof t.contains === 'object' ? t.contains : null;
            const subtype = String(cObj?.subtype || cObj?.key || cObj?.building || t.building || cObj?.type || t.terrain || t.image || '').toLowerCase();
            if (subtype.includes('tree') || subtype.includes('grove') || subtype.includes('pine') || subtype.includes('oak') || subtype.includes('forest')) {
                return false;
            }

            const tAff = String(t.territoryAffiliation || t.territory || t.contains?.territoryAffiliation || t.contains?.territory || '').toLowerCase();
            if (isFriendly) {
                if (!tAff.includes('player') && !tAff.includes('friendly') && !tAff.includes('crew')) return false;
            } else if (isHostile) {
                if (!tAff.includes('hostile') && !tAff.includes('enemy')) return false;
            } else {
                if (tAff !== expectedStr) return false;
            }
        }
    }

    return true;
};

const checkIsDomainPerfectSquare = (anchorIdx, boardTiles, growthCycles, expectedAff) => {
    if (anchorIdx === null || anchorIdx === undefined || !Array.isArray(boardTiles) || boardTiles.length < 225) return false;
    const anchorCol = anchorIdx % 15;
    const anchorRow = Math.floor(anchorIdx / 15);
    const C = Math.max(1, growthCycles || 1);

    const minCol = anchorCol - C;
    const maxCol = anchorCol + 1 + C;
    const minRow = anchorRow - C;
    const maxRow = anchorRow + 1 + C;

    // If domain square bounds extend outside the 15x15 board, it is clipped and not a complete square
    if (minCol < 0 || maxCol >= 15 || minRow < 0 || maxRow >= 15) return false;

    const expectedStr = String(expectedAff || '').toLowerCase();

    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            // The 2x2 monolith itself is always the center of its own domain
            if (c >= anchorCol && c <= anchorCol + 1 && r >= anchorRow && r <= anchorRow + 1) {
                continue;
            }

            const idx = r * 15 + c;
            const t = boardTiles[idx];
            if (!t) return false;

            // Check if tile is void or tree/exempt
            const isVoid = t.isVoid === true || t.contains === 'void' || (t.contains && typeof t.contains === 'object' && (t.contains.type === 'void' || t.contains.isVoid));
            if (isVoid) return false;

            // Check if tile belongs to the expected domain territory
            const tileAff = getTileTerritoryAffiliationHelper(t, null);
            if (!tileAff) return false;
            const tAffStr = String(tileAff).toLowerCase();
            if (expectedStr.includes('friendly') || expectedStr.includes('player') || expectedStr.includes('crew')) {
                if (!tAffStr.includes('friendly') && !tAffStr.includes('player') && !tAffStr.includes('crew')) return false;
            } else if (expectedStr.includes('hostile') || expectedStr.includes('enemy')) {
                if (!tAffStr.includes('hostile') && !tAffStr.includes('enemy')) return false;
            } else {
                if (tAffStr !== expectedStr) return false;
            }
        }
    }

    return true;
};

function DomainMonolithTimerBadge({ lastGrowthTime, growthCycles, maxGrowthCycles, is2x2, strokeColor, badgeGlow, isMax }) {
    const [now, setNow] = React.useState(Date.now());

    React.useEffect(() => {
        if (isMax) return;
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(intervalId);
    }, [isMax, lastGrowthTime]);

    const elapsed = Math.max(0, now - (lastGrowthTime || now));
    const interval = 30000;
    const remainingMs = Math.max(0, interval - elapsed);
    const remainingSec = Math.ceil(remainingMs / 1000);
    const progress = isMax ? 1 : Math.min(1, Math.max(0, elapsed / interval));

    const radius = 13;
    const circumference = 2 * Math.PI * radius; // ~81.68
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <div
            className="domain-monolith-timer-badge"
            title={isMax ? `Domain Expansion: MAX (${growthCycles}/${maxGrowthCycles})` : `Next Domain Expansion in ${remainingSec}s (${growthCycles}/${maxGrowthCycles})`}
            style={{
                position: 'absolute',
                top: '4px',
                right: is2x2 ? '-92%' : '4px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.9) 100%)',
                border: `1.5px solid ${strokeColor}`,
                boxShadow: `0 2px 10px rgba(0, 0, 0, 0.8), 0 0 12px ${badgeGlow}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 22,
                pointerEvents: 'none',
                userSelect: 'none'
            }}
        >
            <svg width="34" height="34" viewBox="0 0 34 34" style={{ position: 'absolute', top: 0, left: 0 }}>
                <circle
                    cx="17"
                    cy="17"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="2.5"
                />
                <circle
                    cx="17"
                    cy="17"
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 17 17)"
                    style={{
                        transition: 'stroke-dashoffset 0.8s ease-in-out'
                    }}
                />
            </svg>
            <div style={{
                position: 'relative',
                zIndex: 2,
                fontSize: isMax ? '9px' : '10.5px',
                fontWeight: 800,
                fontFamily: '"Cinzel", "Segoe UI", sans-serif',
                color: isMax ? '#facc15' : '#f0f9ff',
                textShadow: `0 0 6px ${badgeGlow}`,
                letterSpacing: isMax ? '0.5px' : '0px',
                lineHeight: 1
            }}>
                {isMax ? 'MAX' : `${remainingSec}s`}
            </div>
        </div>
    );
}

function ActiveGeneratorBadge({ resource, rate, cycleIntervalSec, lastTickTime, activatedAt, is2x2, strokeColor, badgeGlow, isAutomated }) {
    const [now, setNow] = React.useState(Date.now());
    const [particles, setParticles] = React.useState([]);
    const prevTickRef = React.useRef(lastTickTime);
    const prevCycleRef = React.useRef(null);

    React.useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 100);
        return () => clearInterval(intervalId);
    }, []);

    const interval = (cycleIntervalSec || 10) * 1000;
    const baseTime = lastTickTime || activatedAt || 0;
    const elapsed = baseTime > 0 ? (now - baseTime) : (now % interval);
    const cycleElapsed = ((elapsed % interval) + interval) % interval;
    const progress = Math.min(1, Math.max(0, cycleElapsed / interval));
    const currentCycle = baseTime > 0 ? Math.floor((now - baseTime) / interval) : Math.floor(now / interval);

    const triggerPayoutParticle = React.useCallback(() => {
        const id = Date.now() + Math.random();
        setParticles(prev => [...prev.slice(-3), { id, ts: Date.now() }]);
        setTimeout(() => {
            setParticles(prev => prev.filter(p => p.id !== id));
        }, 1500);
    }, []);

    React.useEffect(() => {
        if (prevTickRef.current !== undefined && lastTickTime && lastTickTime !== prevTickRef.current) {
            triggerPayoutParticle();
        }
        prevTickRef.current = lastTickTime;
    }, [lastTickTime, triggerPayoutParticle]);

    React.useEffect(() => {
        if (prevCycleRef.current !== null && currentCycle > prevCycleRef.current) {
            triggerPayoutParticle();
        }
        prevCycleRef.current = currentCycle;
    }, [currentCycle, triggerPayoutParticle]);

    const radius = 13;
    const circumference = 2 * Math.PI * radius; // ~81.68
    const strokeDashoffset = circumference * (1 - progress);

    const resourceIcons = {
        food: '🍖',
        meat: '🍖',
        farm: '🍖',
        windmill: '🍖',
        larder: '🍖',
        influence: '🔮',
        house: '🔮',
        manor: '🔮',
        estate: '🔮',
        ore: '⛏️',
        stone: '⛏️',
        mine: '⛏️',
        iron: '⛏️',
        gold: '💰',
        slate: '🧱',
        wood: '🪵',
        lumber: '🪵',
        sawmill: '🪵',
        dust: '✨',
        shimmering_dust: '✨',
        mushrooms: '🍄',
        mushroom: '🍄',
        fungal: '🍄',
        chemicals: '🧪',
        chemical: '🧪',
        unstable_chemicals: '🧪',
        stable_chemicals: '🧪'
    };

    const resKey = String(resource || '').toLowerCase();
    const icon = resourceIcons[resKey] || '⚡';
    const displayRes = (resKey === 'stone' || resKey === 'mine') ? 'ore' : (resource || 'Resource');
    const resName = displayRes.charAt(0).toUpperCase() + displayRes.slice(1);

    return (
        <div
            className="generator-active-badge"
            title={`Active ${resName} Generator (Owned by Crew) • +${rate || 5} ${resName} every ${cycleIntervalSec || 10}s${isAutomated ? ' [Auto-Yielding]' : ''}`}
            style={{
                position: 'absolute',
                top: '4px',
                right: is2x2 ? '-92%' : '4px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.9) 100%)',
                border: `1.5px solid ${strokeColor || '#38bdf8'}`,
                boxShadow: `0 2px 10px rgba(0, 0, 0, 0.8), 0 0 12px ${badgeGlow || 'rgba(56, 189, 248, 0.6)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 22,
                pointerEvents: 'none',
                userSelect: 'none'
            }}
        >
            <svg width="34" height="34" viewBox="0 0 34 34" style={{ position: 'absolute', top: 0, left: 0 }}>
                <circle
                    cx="17"
                    cy="17"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="2.5"
                />
                <circle
                    cx="17"
                    cy="17"
                    r={radius}
                    fill="none"
                    stroke={strokeColor || '#38bdf8'}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 17 17)"
                    style={{
                        transition: progress < 0.05 ? 'none' : 'stroke-dashoffset 0.12s linear'
                    }}
                />
            </svg>
            <div style={{
                position: 'relative',
                zIndex: 2,
                fontSize: '14px',
                lineHeight: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {icon}
            </div>
            {particles.map(p => (
                <div
                    key={p.id}
                    className="generator-payout-particle"
                    style={{
                        color: strokeColor || '#38bdf8',
                        textShadow: `0 0 8px ${badgeGlow || 'rgba(56, 189, 248, 0.8)'}, 0 2px 4px rgba(0,0,0,0.9)`
                    }}
                >
                    <span style={{ fontSize: '15px' }}>{icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', marginLeft: '1px' }}>+{rate || 5}</span>
                </div>
            ))}
        </div>
    );
}

function EarthenFortSpawnParticleBadge({ lastPygmySpawnTime, foodCost }) {
    const [particles, setParticles] = React.useState([]);
    const prevTimeRef = React.useRef(lastPygmySpawnTime);

    React.useEffect(() => {
        if (lastPygmySpawnTime && lastPygmySpawnTime !== prevTimeRef.current) {
            const id = Date.now() + Math.random();
            setParticles(prev => [...prev.slice(-2), { id, cost: foodCost || 10 }]);
            setTimeout(() => {
                setParticles(prev => prev.filter(p => p.id !== id));
            }, 1500);
        }
        prevTimeRef.current = lastPygmySpawnTime;
    }, [lastPygmySpawnTime, foodCost]);

    if (particles.length === 0) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 36 }}>
            {particles.map(p => (
                <div
                    key={p.id}
                    className="generator-payout-particle"
                    style={{
                        color: '#f87171',
                        textShadow: '0 0 8px rgba(239, 68, 68, 0.8), 0 2px 4px rgba(0,0,0,0.9)'
                    }}
                >
                    <span style={{ fontSize: '15px' }}>🍖</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', marginLeft: '1px' }}>-{p.cost}</span>
                </div>
            ))}
        </div>
    );
}

function AutomatonConversionProgressBar({ converting }) {
    const [now, setNow] = React.useState(Date.now());

    React.useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 100);
        return () => clearInterval(intervalId);
    }, []);

    if (!converting || !converting.startTime || !converting.duration) return null;

    const elapsed = Math.max(0, now - converting.startTime);
    const progress = Math.min(1, Math.max(0, elapsed / converting.duration));

    return (
        <div style={{
            position: 'absolute',
            top: '-10px',
            left: '1px',
            right: '1px',
            height: '8px',
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            overflow: 'hidden',
            zIndex: 100,
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.9), 0 2px 6px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
            padding: '1px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: '#ef4444',
                backgroundImage: 'linear-gradient(90deg, #dc2626, #f87171, #ef4444)',
                borderRadius: '2px',
                transition: 'width 0.1s linear',
                boxShadow: '0 0 8px rgba(248, 113, 113, 0.9)'
            }} />
        </div>
    );
}

function Tile(props) {
    const colorVal = (props.color === 'null' || props.color === 'undefined') ? null : props.color;
    const isShrine = (props.contains && props.contains.type === 'shrine') || props.optionType === 'shrine' || props.isShrine;
    const containsIsUnit = !!(props.contains && (props.contains.isAutomaton || props.contains.subtype === 'automaton' || props.contains.isPocketPygmy || props.contains.subtype === 'pocket_pygmy'));
    const isEnemySpawnTile = !containsIsUnit && !!(props.isEnemySpawn || props.enemySpawn || props.originalMarker === 'narrative');
    const isNarrative = !containsIsUnit && (
        (props.contains && (props.contains.type === 'narrative' || props.contains.type === 'narrative_visited')) ||
        props.optionType === 'narrative' ||
        props.optionType === 'narrative_visited' ||
        (props.image === 'narrative') ||
        props.image === 'narrative_visited' ||
        isEnemySpawnTile
    );
    const isDarkColor = colorVal === 'black';
    const isRevealedBySpiritSight = !!props.hasLivingSummoner && (isShrine || isNarrative) && isDarkColor;
    const color = isRevealedBySpiritSight ? 'spirit-sight' : colorVal;
    const hoverLabelTimerRef = React.useRef(null);
    const [showDelayedHoverLabel, setShowDelayedHoverLabel] = React.useState(false);
    
    const isIlluminatedGlow = !!(props.illuminated || props.isIlluminated || (props.contains && props.contains.illuminated) || (props.data && props.data.illuminated));
    
    const tileIndexForContains = (typeof props.id === 'number') ? props.id : ((typeof props.index === 'number') ? props.index : null);
    const boardTilesForContains = Array.isArray(props.boardTiles) ? props.boardTiles : null;
    const currentTileForContains = (tileIndexForContains !== null && boardTilesForContains && boardTilesForContains[tileIndexForContains]) ? boardTilesForContains[tileIndexForContains] : null;
    const topCurrentContains = currentTileForContains ? currentTileForContains.contains : props.contains;
    
    const containsObj = (props.contains && typeof props.contains === 'object') ? props.contains : null;
    const sKey = (props.building || containsObj?.subtype || containsObj?.building || containsObj?.type || containsObj?.key || containsObj?.name || props.contains || props.image || '').toString().toLowerCase();
    const is3x3Structure = sKey.includes('keep') || sKey.includes('fortress');
    const isStructureTile = sKey.includes('war_camp') || sKey.includes('war_fort') || sKey.includes('earthen_fort') || sKey.includes('outpost') || sKey.includes('observer') || sKey.includes('observation') || sKey.includes('dream_den') || sKey.includes('monolith') || sKey.includes('vat') || sKey.includes('generator') || sKey.includes('ore_mine') || sKey.includes('slate_mine') || sKey.includes('sawmill') || sKey.includes('lumber_mill') || sKey.includes('larder') || sKey.includes('dust_collector') || sKey.includes('fungal_nursery') || sKey.includes('cultivation_vat') || sKey.includes('mine') || sKey.includes('hut') || sKey.includes('tower') || sKey.includes('windmill') || sKey.includes('farm') || sKey.includes('house') || sKey.includes('manor') || sKey.includes('estate') || sKey.includes('town') || sKey.includes('graveyard') || sKey.includes('blacksmith') || is3x3Structure;

    const containsObjForHp = (currentTileForContains && typeof currentTileForContains.contains !== 'undefined')
        ? (typeof currentTileForContains.contains === 'object' ? currentTileForContains.contains : null)
        : (props.contains || containsObj || topCurrentContains);
    const currentContainsHp = (containsObjForHp && typeof containsObjForHp.hp === 'number' && containsObjForHp.hp > 0 && !containsObjForHp.dead && !containsObjForHp.destroyedAt) ? containsObjForHp.hp : undefined;
    const containsId = containsObjForHp && containsObjForHp.id;

    const hasConvertingMonolith = !!(
        (props.contains && props.contains.convertingMonolith) ||
        (containsObj && containsObj.convertingMonolith) ||
        (containsObjForHp && containsObjForHp.convertingMonolith) ||
        (currentTileForContains && currentTileForContains.contains && currentTileForContains.contains.convertingMonolith)
    );

    const [hpBarVisible, setHpBarVisible] = React.useState(false);
    const hpBarTimerRef = React.useRef(null);
    const prevHpRef = React.useRef(currentContainsHp);
    const prevUnitIdRef = React.useRef(containsId);

    React.useEffect(() => {
        if (containsId !== prevUnitIdRef.current) {
            prevUnitIdRef.current = containsId;
            prevHpRef.current = currentContainsHp;
            setHpBarVisible(false);
            if (hpBarTimerRef.current) clearTimeout(hpBarTimerRef.current);
            return;
        }

        if (typeof currentContainsHp === 'number' && currentContainsHp > 0) {
            if (prevHpRef.current !== undefined && currentContainsHp < prevHpRef.current) {
                setHpBarVisible(true);
                if (containsObjForHp) {
                    containsObjForHp.lastDamageTime = Date.now();
                }
                if (hpBarTimerRef.current) clearTimeout(hpBarTimerRef.current);
                hpBarTimerRef.current = setTimeout(() => {
                    setHpBarVisible(false);
                }, 3000);
            }
            prevHpRef.current = currentContainsHp;
        } else {
            setHpBarVisible(false);
            if (hpBarTimerRef.current) clearTimeout(hpBarTimerRef.current);
        }
        return () => {
            if (hpBarTimerRef.current) clearTimeout(hpBarTimerRef.current);
        };
    }, [currentContainsHp, containsId]);

    React.useEffect(() => {
        return () => {
            if (hoverLabelTimerRef.current) {
                clearTimeout(hoverLabelTimerRef.current);
                hoverLabelTimerRef.current = null;
            }
        };
    }, []);

    React.useEffect(() => {
        if (!props.delayedHoverLabel && showDelayedHoverLabel) {
            setShowDelayedHoverLabel(false);
        }
    }, [props.delayedHoverLabel, showDelayedHoverLabel]);

    const beginDelayedHoverLabel = () => {
        if (!props.delayedHoverLabel) return;
        if (hoverLabelTimerRef.current) {
            clearTimeout(hoverLabelTimerRef.current);
        }
        setShowDelayedHoverLabel(false);
        hoverLabelTimerRef.current = setTimeout(() => {
            setShowDelayedHoverLabel(true);
            hoverLabelTimerRef.current = null;
        }, 1500);
    };

    const endDelayedHoverLabel = () => {
        if (hoverLabelTimerRef.current) {
            clearTimeout(hoverLabelTimerRef.current);
            hoverLabelTimerRef.current = null;
        }
        setShowDelayedHoverLabel(false);
    };

    if(props.image === 'void_fill'){
        console.log('void fill ', images[props.image]);
    }
    // Normalize coordinates for display only.
    // Engine uses a world-offset coordinate system (tiles often start at 15..29).
    // We expose zero-based coordinates for UI without changing game logic.
    const getDisplayCoords = (coords) => {
        if (!coords) return null;
        // support [x,y] arrays
        if (Array.isArray(coords) && coords.length >= 2) {
            const x = coords[0];
            const y = coords[1];
            const displayX = (typeof x === 'number' && x >= 15) ? x - 15 : x;
            const displayY = (typeof y === 'number' && y >= 15) ? y - 15 : y;
            return [displayX, displayY];
        }
        // support {x,y} objects
        if (typeof coords === 'object' && coords !== null && coords.x != null && coords.y != null) {
            const x = coords.x;
            const y = coords.y;
            const displayX = (typeof x === 'number' && x >= 15) ? x - 15 : x;
            const displayY = (typeof y === 'number' && y >= 15) ? y - 15 : y;
            return [displayX, displayY];
        }
        return null;
    }
    // derive hp and maxHp from props or nested data so callers can pass either shape
    let maxHpVal = (typeof props.maxHp === 'number') ? props.maxHp : (props.data && props.data.stats && typeof props.data.stats.hp === 'number' ? props.data.stats.hp : (props.data && typeof props.data.max_hp === 'number' ? props.data.max_hp : (props.data && typeof props.data.starting_hp === 'number' ? props.data.starting_hp : undefined)));
    const hpVal = (typeof props.hp === 'number') ? props.hp : (props.data && typeof props.data.hp === 'number' ? props.data.hp : (typeof maxHpVal === 'number' ? maxHpVal : undefined));
    // If caller only provides current HP (no max), treat max as current so the bar renders full.
    if (typeof hpVal === 'number' && typeof maxHpVal !== 'number') {
        maxHpVal = hpVal;
    }

    // VCT border logic: if combatManager and isVCT, add a 2px solid white border
    let vctBorder = undefined;
    if (props.combatManager && props.coordinates && typeof props.combatManager.isVCT === 'function') {
        if (props.combatManager.isVCT(props.coordinates.x, props.coordinates.y)) {
            vctBorder = '2px solid white';
        }
    }

    // Determine if the current image is a portal that should render above walls/items
    const foregroundPortalImages = ['archway', 'gryphon_gate_opened', 'bat_gate_opened', 'evil_gate_opened', 'dungeon_door_opened'];
    const portraitZIndex = foregroundPortalImages.includes(props.image) ? 25 : 20;
    const isPaletteTile = !!(props.isPaletteTile || props.type === 'palette-tile' || props.isPaletteItem);
    const isVendorType = (val) => {
        if (!val) return false;
        if (typeof val === 'object' && val !== null) {
            const sub = String(val.subtype || val.building || val.key || val.name || val.type || '').toLowerCase();
            if (sub.includes('domain_node') || sub.includes('dark_domain_node') || sub.includes('node') || sub.includes('earthen_fort') || sub.includes('outpost') || sub.includes('observer') || sub.includes('hut') || sub.includes('farm') || sub.includes('house')) {
                return false;
            }
            return !!val.isMultiTile || !!val.isLarge || !!val.vendorCell || (val.vendorAnchorId !== undefined && val.vendorAnchorId !== null) || isVendorType(val.type) || isVendorType(val.subtype) || isVendorType(val.building) || isVendorType(val.key) || isVendorType(val.name);
        }
        const s = String(val).toLowerCase();
        if (s.includes('domain_node') || s.includes('dark_domain_node') || s.includes('node') || s.includes('earthen_fort') || s.includes('outpost') || s.includes('observer') || s.includes('hut') || s.includes('farm') || s.includes('house')) {
            return false;
        }
        const multiKeys = [
            'vendor', 'alchemist', 'merchant',
            'war_camp', 'war_fort',
            'dream_den', 'dream den',
            'keep', 'fortress',
            'infernal_pit', 'infernal_tower', 'pit',
            'frozen_locus', 'emerald_locus', 'cosmic_locus', 'locus',
            'cultivation_vat', 'dust_collector', 'larder', 'sawmill', 'lumber_mill', 'ore_mine', 'slate_mine', 'fungal_nursery', 'vat',
            'domain_monolith', 'dark_domain_monolith', 'monolith',
            'generator',
            'summoning_temple', 'rift', 'rift_2',
            'naked_trees_3', 'terrain_naked_trees_3',
            'naked_trees_4', 'terrain_naked_trees_4',
            'naked_mountains_2', 'terrain_naked_mountains_2'
        ];
        if (multiKeys.includes(s)) return true;
        return multiKeys.some(k => s.includes(k));
    };

    // Check if this tile is a quadrant of an adjacent 2x2 multi-tile structure anchor in boardTiles
    const findNearbyStructureAnchor = () => {
        if (isPaletteTile || !boardTilesForContains || isDarkColor || color === 'black') return null;
        const cId = props.id !== undefined && props.id !== null ? props.id : props.index;
        if (cId === null || cId === undefined) return null;
        const cRow = Math.floor(cId / 15);
        const cCol = cId % 15;

        // Check if an anchor tile is at left, top, or top-left
        const checks = [
            { dRow: 0, dCol: 1, role: 'top_right', anchorOffset: -1 },
            { dRow: 1, dCol: 0, role: 'bottom_left', anchorOffset: -15 },
            { dRow: 1, dCol: 1, role: 'bottom_right', anchorOffset: -16 }
        ];

        for (const { dRow, dCol, role, anchorOffset } of checks) {
            if (cRow >= dRow && cCol >= dCol) {
                const aIdx = cId + anchorOffset;
                const aTile = boardTilesForContains[aIdx];
                if (aTile && aTile.color !== 'black' && (aTile.contains || aTile.building || aTile.image)) {
                    const aContains = typeof aTile.contains === 'object' && aTile.contains ? aTile.contains : { type: aTile.contains };
                    const aKey = String(aContains.subtype || aContains.building || aContains.type || aTile.building || aTile.image || '').toLowerCase();
                    if (aKey.includes('observer') || aKey.includes('outpost') || aKey.includes('earthen_fort') || aKey.includes('hut') || aKey.includes('domain_node') || aKey.includes('dark_domain_node') || aKey.includes('node') || aKey.includes('farm') || aKey.includes('house')) continue;
                    const is2x2 = (aKey.includes('domain_monolith') || aKey.includes('dark_domain_monolith') || (aKey.includes('monolith') && !aKey.includes('shrine')) || isVendorType(aKey));
                    if (is2x2) {
                        const aRole = aContains.vendorCell || aTile.vendorCell;
                        if (!aRole || aRole === 'anchor' || aContains.vendorAnchorId === aIdx) {
                            return { anchorTile: aTile, role, anchorId: aIdx, anchorKey: aKey };
                        }
                    }
                }
            }
        }
        return null;
    };
    const nearbyAnchorInfo = findNearbyStructureAnchor();

    const isSingleTile = (() => {
        const s = String(containsObj?.subtype || containsObj?.building || containsObj?.type || props.building || props.image || props.optionType || '').toLowerCase();
        return s.includes('observer') || s.includes('outpost') || s.includes('earthen_fort') || s.includes('hut') || s.includes('farm') || s.includes('house') || s.includes('domain_node') || s.includes('dark_domain_node') || s.includes('node');
    })();

    const anchorId = containsObj?.vendorAnchorId ?? props.vendorAnchorId;
    const isAnchorSingle = (() => {
        if (anchorId !== undefined && anchorId !== null && boardTilesForContains && boardTilesForContains[anchorId]) {
            const aTile = boardTilesForContains[anchorId];
            const aKey = String(aTile?.contains?.subtype || aTile?.contains?.type || aTile?.building || aTile?.image || '').toLowerCase();
            return aKey.includes('observer') || aKey.includes('outpost') || aKey.includes('earthen_fort') || aKey.includes('hut') || aKey.includes('farm') || aKey.includes('house') || aKey.includes('domain_node') || aKey.includes('dark_domain_node') || aKey.includes('node');
        }
        return false;
    })();

    const isVendorCell = !isPaletteTile && !isSingleTile && !isAnchorSingle && (
        isVendorType(props.contains) ||
        isVendorType(containsObj?.type) ||
        isVendorType(containsObj?.subtype) ||
        isVendorType(containsObj?.building) ||
        isVendorType(containsObj?.key) ||
        isVendorType(containsObj?.name) ||
        isVendorType(props.building) ||
        isVendorType(props.image) ||
        isVendorType(props.optionType) ||
        !!(containsObj && containsObj.vendorCell) ||
        (containsObj && containsObj.vendorAnchorId !== undefined && containsObj.vendorAnchorId !== null) ||
        !!props.vendorCell ||
        !!props.isMultiTile ||
        !!nearbyAnchorInfo
    );

    const getVendorCellRole = () => {
        if (!isVendorCell) return null;

        if (containsObj && containsObj.vendorCell && containsObj.vendorCell !== 'footprint') {
            return containsObj.vendorCell;
        }

        if (props.vendorCell && props.vendorCell !== 'footprint') {
            return props.vendorCell;
        }

        if (nearbyAnchorInfo && nearbyAnchorInfo.role) {
            return nearbyAnchorInfo.role;
        }

        let anchorId = null;
        const currentId = props.id !== undefined && props.id !== null ? props.id : props.index;

        if (props.hoveredTileFootprint && (props.hoveredTileFootprint.length === 4 || props.hoveredTileFootprint.length === 9) && currentId !== null && currentId !== undefined) {
            if (props.hoveredTileFootprint.includes(currentId)) {
                anchorId = props.hoveredTileFootprint[0];
            }
        }

        if (anchorId === null && containsObj && containsObj.vendorAnchorId !== null && containsObj.vendorAnchorId !== undefined) {
            anchorId = containsObj.vendorAnchorId;
        }

        if (anchorId !== null && currentId !== null && currentId !== undefined) {
            const anchorRow = Math.floor(anchorId / 15);
            const anchorCol = anchorId % 15;
            const tileRow = Math.floor(currentId / 15);
            const tileCol = currentId % 15;

            const dRow = tileRow - anchorRow;
            const dCol = tileCol - anchorCol;
            
            const isHovering3x3 = props.hoveredTileFootprint?.length === 9 || is3x3Structure;

            if (dRow === 0 && dCol === 0) return 'anchor';
            
            if (isHovering3x3) {
                if (dRow === 0 && dCol === 1) return 'top_center';
                if (dRow === 0 && dCol === 2) return 'top_right';
                if (dRow === 1 && dCol === 0) return 'middle_left';
                if (dRow === 1 && dCol === 1) return 'center';
                if (dRow === 1 && dCol === 2) return 'middle_right';
                if (dRow === 2 && dCol === 0) return 'bottom_left';
                if (dRow === 2 && dCol === 1) return 'bottom_center';
                if (dRow === 2 && dCol === 2) return 'bottom_right';
            } else {
                if (dRow === 0 && dCol === 1) return 'top_right';
                if (dRow === 1 && dCol === 0) return 'bottom_left';
                if (dRow === 1 && dCol === 1) return 'bottom_right';
            }
        }

        return 'anchor';
    };

    const vendorCellRole = getVendorCellRole();
    const vendorBorderless = isVendorCell ? '0px solid transparent' : null;
    const vendorBackgroundPosition = (() => {
        switch (vendorCellRole) {
            case 'top_center': return '50% 0%';
            case 'top_right': return '100% 0%';
            case 'middle_left': return '0% 50%';
            case 'center': return '50% 50%';
            case 'middle_right': return '100% 50%';
            case 'bottom_left': return '0% 100%';
            case 'bottom_center': return '50% 100%';
            case 'bottom_right': return '100% 100%';
            case 'anchor':
            default:
                return '0% 0%';
        }
    })();

    const toCssUrl = (rawUrl) => {
        if (!rawUrl) return undefined;
        let unwrapped = rawUrl;
        if (typeof unwrapped === 'object') {
            unwrapped = unwrapped.default || '';
        }
        if (typeof unwrapped === 'object') {
            unwrapped = unwrapped.default || '';
        }
        let normalizedUrl = String(unwrapped).trim().replace(/^['"]|['"]$/g, '');

        if (normalizedUrl.startsWith('/') || normalizedUrl.includes('/static/media/') || normalizedUrl.startsWith('http') || normalizedUrl.startsWith('data:')) {
            return `url("${encodeURI(normalizedUrl)}")`;
        }

        let keyStr = normalizedUrl;
        if (normalizedUrl.includes('/') || normalizedUrl.includes('.')) {
            let filename = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
            filename = decodeURIComponent(filename);
            const lastDot = filename.lastIndexOf('.');
            if (lastDot !== -1) {
                filename = filename.substring(0, lastDot);
            }
            // Strip Webpack build hashes (e.g. .c03f8c82 or -c03f8c82)
            filename = filename.replace(/[-.][a-f0-9]{8,32}$/i, '');
            keyStr = filename;
        }
        
        let key = keyStr.trim().toLowerCase().replace(/[\s-]+/g, '_');
        
        if (images[key]) {
            normalizedUrl = images[key];
        } else {
            // Remove trailing underscores/dots
            const cleanKey = key.replace(/_+$/, '');
            if (images[cleanKey]) {
                normalizedUrl = images[cleanKey];
            } else if (cleanKey === 'tier_1' && images['tier_1_armor']) {
                normalizedUrl = images['tier_1_armor'];
            } else if (cleanKey === 'tier_2' && images['tier_2_armor']) {
                normalizedUrl = images['tier_2_armor'];
            } else if (cleanKey === 'tier_3' && images['tier_3_armor']) {
                normalizedUrl = images['tier_3_armor'];
            } else if (['portal', 'teleporter', 'dungeon_portal'].includes(cleanKey)) {
                normalizedUrl = images['dungeon_portal'];
            } else if (images[cleanKey + '_portrait']) {
                normalizedUrl = images[cleanKey + '_portrait'];
            } else if (images[cleanKey + '_gate']) {
                normalizedUrl = images[cleanKey + '_gate'];
            } else if (images[cleanKey + '_key']) {
                normalizedUrl = images[cleanKey + '_key'];
            } else if (images[cleanKey + '_chest']) {
                normalizedUrl = images[cleanKey + '_chest'];
            }
        }

        return `url("${encodeURI(normalizedUrl)}")`;
    };

    const isBoardGridTile = props.type === 'board-tile' && !vctBorder;
    const getContainsType = (contains) => {
        if (!contains) return null;
        if (typeof contains === 'object') return contains.type || null;
        if (typeof contains === 'string') return contains;
        return null;
    };
    const getContainsSubtype = (contains) => {
        if (!contains) return null;
        if (typeof contains === 'object') return contains.subtype || null;
        if (typeof contains === 'string') return contains;
        return null;
    };
    const isVoidContains = (contains) => getContainsType(contains) === 'void';
    const tileIndex = (typeof props.id === 'number') ? props.id : ((typeof props.index === 'number') ? props.index : null);
    const tileRow = (tileIndex !== null) ? Math.floor(tileIndex / 15) : null;
    const tileCol = (tileIndex !== null) ? (tileIndex % 15) : null;
    const coords = Array.isArray(props.coordinates) ? props.coordinates : null;
    const isLastCol = coords ? coords[1] === 29 : tileCol === 14;
    const isLastRow = coords ? coords[0] === 29 : tileRow === 14;

    const boardTiles = Array.isArray(props.boardTiles) ? props.boardTiles : null;
    const currentTile = (tileIndex !== null && boardTiles && boardTiles[tileIndex]) ? boardTiles[tileIndex] : null;
    const currentContains = currentTile ? currentTile.contains : props.contains;
    const currentTileColor = (currentTile && typeof currentTile.color !== 'undefined' && currentTile.color !== 'null') ? currentTile.color : color;
    const rotationDeg = (typeof props.rotation === 'number')
        ? props.rotation
        : (containsObj && typeof containsObj.rotation === 'number'
            ? containsObj.rotation
            : (currentContains && typeof currentContains.rotation === 'number'
                ? currentContains.rotation
                : 0));
    const getNeighborTile = (delta) => {
        if (tileIndex === null || !boardTiles) return null;
        if (tileRow === null || tileCol === null) return null;

        if (delta === -1 && tileCol === 0) return null;
        if (delta === 1 && tileCol === 14) return null;
        if (delta === -15 && tileRow === 0) return null;
        if (delta === 15 && tileRow === 14) return null;

        const neighborIndex = tileIndex + delta;
        const neighbor = boardTiles[neighborIndex];
        return neighbor || null;
    };
    const getBorderColorIntent = (borderValue) => {
        if (!borderValue) return 'none';
        const str = String(borderValue).toLowerCase();
        if (str.includes('transparent') || str === 'none') return 'transparent';
        if (str.includes('black') || str.includes('#000') || str.includes('2px solid') || str.includes('1px solid')) return 'black';
        return 'none';
    };
    const isBlackRenderedTile = (contains, color) => {
        if (isVoidContains(contains)) return true;
        if (props.inSuperboard) return false;
        if (color === null || color === undefined) return false;
        const normalized = String(color).trim().toLowerCase();
        const compact = normalized.replace(/\s+/g, '');
        return normalized === 'black' ||
            normalized === '#000' ||
            normalized === '#000000' ||
            normalized === '#0e0e0e' ||
            compact === 'rgb(0,0,0)' ||
            compact.startsWith('rgba(0,0,0,') ||
            compact.startsWith('rgb(0,0,0,') ||
            compact === '#000000ff';
    };
    const edgeColorForBoundary = (currentBorderValue, neighborBorderValue, neighborContains, neighborColor) => {
        const currentIntent = getBorderColorIntent(currentBorderValue);
        const neighborIntent = getBorderColorIntent(neighborBorderValue);
        if (currentIntent === 'transparent' || neighborIntent === 'transparent') return 'transparent';
        if (currentIntent === 'black' || neighborIntent === 'black') return '#000000';
        return 'transparent';
    };

    const isWallOrVoidOrDarkNeighbor = (neighborTile) => {
        if (!neighborTile) return true;
        if (isVoidContains(neighborTile.contains)) return true;
        if (isBlackRenderedTile(neighborTile.contains, neighborTile.color)) return true;
        const cType = getContainsType(neighborTile.contains);
        if (cType === 'wall' || cType === 'void' || neighborTile.isWall || neighborTile.isVoid) return true;
        return false;
    };

    const topNeighbor = getNeighborTile(-15);
    const leftNeighbor = getNeighborTile(-1);
    const rightNeighbor = getNeighborTile(1);
    const bottomNeighbor = getNeighborTile(15);

    const topIsShaded = isWallOrVoidOrDarkNeighbor(topNeighbor);
    const bottomIsShaded = isWallOrVoidOrDarkNeighbor(bottomNeighbor);
    const leftIsShaded = isWallOrVoidOrDarkNeighbor(leftNeighbor);
    const rightIsShaded = isWallOrVoidOrDarkNeighbor(rightNeighbor);

    const fogShadows = [];
    if (topIsShaded) fogShadows.push('inset 0 8px 10px -2px rgba(0, 0, 0, 0.85)');
    if (bottomIsShaded) fogShadows.push('inset 0 -8px 10px -2px rgba(0, 0, 0, 0.85)');
    if (leftIsShaded) fogShadows.push('inset 8px 0 10px -2px rgba(0, 0, 0, 0.85)');
    if (rightIsShaded) fogShadows.push('inset -8px 0 10px -2px rgba(0, 0, 0, 0.85)');
    const isBuilderTile = !!(props.isBuilder || props.isMapmaker || props.disableFogShading || props.disableShading || props.type === 'palette-tile' || props.type === 'builder-tile');
    const isDebugMode = !isBuilderTile && !props.inSuperboard && !!(props.debugMode || props.isDebugMode || (typeof window !== 'undefined' && window.debugMode === true));
    const fogEdgeBoxShadow = (isDebugMode && isBoardGridTile && !isBlackRenderedTile(currentContains, currentTileColor) && fogShadows.length > 0) ? fogShadows.join(', ') : 'none';

    const edgeLines = (isBoardGridTile && !props.inSuperboard) ? {
        top: edgeColorForBoundary(
            props.borders && props.borders.top,
            topNeighbor && topNeighbor.borders ? topNeighbor.borders.bottom : null,
            topNeighbor ? topNeighbor.contains : null,
            topNeighbor ? topNeighbor.color : null
        ),
        left: edgeColorForBoundary(
            props.borders && props.borders.left,
            leftNeighbor && leftNeighbor.borders ? leftNeighbor.borders.right : null,
            leftNeighbor ? leftNeighbor.contains : null,
            leftNeighbor ? leftNeighbor.color : null
        ),
        // Right/bottom are normally owned by the neighbor's left/top edge.
        right: isLastCol ? edgeColorForBoundary(
            props.borders && props.borders.right,
            rightNeighbor && rightNeighbor.borders ? rightNeighbor.borders.left : null,
            rightNeighbor ? rightNeighbor.contains : null,
            rightNeighbor ? rightNeighbor.color : null
        ) : null,
        bottom: isLastRow ? edgeColorForBoundary(
            props.borders && props.borders.bottom,
            bottomNeighbor && bottomNeighbor.borders ? bottomNeighbor.borders.top : null,
            bottomNeighbor ? bottomNeighbor.contains : null,
            bottomNeighbor ? bottomNeighbor.color : null
        ) : null
    } : null;

    const containsType = getContainsType(currentContains);
    const containsSubtype = getContainsSubtype(currentContains);
    const knownMonsters = [
        'witch', 'beholder', 'dragon', 'goblin', 'goblin_thief', 'goblin_warrior', 'goblin_warchief', 'goblin_chef',
        'horror', 'imp', 'imp_overlord',
        'manticore', 'mummy', 'naiad', 'ogre', 'skeleton', 'sphinx', 'troll',
        'wyvern', 'wyvern_alt', 'goloth_devil', 'zul_devil', 'mordu_devil',
        'vukular_devil', 'ishtar_devil', 'black_demon', 'goat_demon',
        'golden_demon', 'kabuki_demon', 'cyclops', 'high_priest_of_the_basilisk',
        'high_priest_of_basilisk', 'basilisk_priest', 'basilisk_cultists',
        'basilisk_cultist', 'basilisk', 'shade', 'blalok', 'horned_pet', 'qlippoth',
        'woodland_warband', 'cave_squad', 'mud_group', 'pygmies'
    ];

    const resolvedPortraitUrl = (() => {
        if (props.building) {
            const key = String(props.building).trim().toLowerCase().replace(/[\s-]+/g, '_');
            if (images[key]) return images[key];
            if (images[`buildable_${key}`]) return images[`buildable_${key}`];
        }
        if (props.imageOverride) {
            if (typeof props.imageOverride === 'string' && (props.imageOverride.includes('/') || props.imageOverride.startsWith('data:'))) {
                return props.imageOverride;
            }
            if (images[props.imageOverride]) return images[props.imageOverride];
            const cleanKey = String(props.imageOverride).trim().toLowerCase().replace(/[\s-]+/g, '_');
            if (['portal', 'teleporter', 'dungeon_portal'].includes(cleanKey)) return images.dungeon_portal;
        }
        if (props.image) {
            if (typeof props.image === 'string') {
                if (props.image.includes('/') || props.image.startsWith('data:')) {
                    return props.image;
                }
                const key = props.image.trim().toLowerCase().replace(/[\s-]+/g, '_');
                if (['portal', 'teleporter', 'dungeon_portal'].includes(key)) return images.dungeon_portal;
                if (images[key]) return images[key];
                if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                if (images[`${key}_portrait`]) return images[`${key}_portrait`];
                if (key.endsWith('_under_construction')) {
                    const baseKey = key.replace('_under_construction', '');
                    if (images[baseKey]) return images[baseKey];
                    if (images[`buildable_${baseKey}`]) return images[`buildable_${baseKey}`];
                }
            } else if (typeof props.image === 'object') {
                return props.image.default || props.image;
            }
        }
        if (props.contains) {
            if (typeof props.contains === 'string') {
                const key = props.contains.trim().toLowerCase().replace(/[\s-]+/g, '_');
                if (['portal', 'teleporter', 'dungeon_portal'].includes(key)) return images.dungeon_portal;
                if (images[key]) return images[key];
                if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                if (images[`${key}_portrait`]) return images[`${key}_portrait`];
                if (key.endsWith('_under_construction')) {
                    const baseKey = key.replace('_under_construction', '');
                    if (images[baseKey]) return images[baseKey];
                    if (images[`buildable_${baseKey}`]) return images[`buildable_${baseKey}`];
                }
            } else if (typeof props.contains === 'object') {
                const cType = String(props.contains.type || '').trim().toLowerCase();
                const cSubtype = String(props.contains.subtype || '').trim().toLowerCase();
                if (['dungeon_portal', 'dungeon portal', 'portal', 'teleporter'].includes(cType) || ['dungeon_portal', 'dungeon portal', 'portal', 'teleporter'].includes(cSubtype)) {
                    return images.dungeon_portal;
                }
                const sub = props.contains.subtype || props.contains.building || props.contains.type || props.contains.name;
                if (sub && typeof sub === 'string') {
                    const key = sub.trim().toLowerCase().replace(/[\s-]+/g, '_');
                    if (['portal', 'teleporter', 'dungeon_portal'].includes(key)) return images.dungeon_portal;
                    if (images[key]) return images[key];
                    if (images[`buildable_${key}`]) return images[`buildable_${key}`];
                    if (images[`${key}_portrait`]) return images[`${key}_portrait`];
                    if (key.endsWith('_under_construction')) {
                        const baseKey = key.replace('_under_construction', '');
                        if (images[baseKey]) return images[baseKey];
                        if (images[`buildable_${baseKey}`]) return images[`buildable_${baseKey}`];
                    }
                }
            }
        }
        if (nearbyAnchorInfo && nearbyAnchorInfo.anchorTile) {
            const aTile = nearbyAnchorInfo.anchorTile;
            const aContains = typeof aTile.contains === 'object' && aTile.contains ? aTile.contains : {};
            const key = String(aContains.subtype || aContains.building || aTile.building || aContains.type || aTile.image || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
            if (images[key]) return images[key];
            if (images[`buildable_${key}`]) return images[`buildable_${key}`];
            if (images[`${key}_portrait`]) return images[`${key}_portrait`];
            if (aTile.image && typeof aTile.image === 'string' && (aTile.image.includes('/') || aTile.image.startsWith('data:'))) {
                return aTile.image;
            }
        }
        return null;
    })();

    const isMonsterOrPygmyTile = containsType === 'monster' ||
                                 containsType === 'pygmies' ||
                                 (typeof containsType === 'string' && knownMonsters.includes(containsType)) ||
                                 (typeof containsSubtype === 'string' && knownMonsters.includes(containsSubtype)) ||
                                 props.type === 'monster-tile' ||
                                 props.optionType === 'monster';

    const isBlackTile = isBlackRenderedTile(currentContains, currentTileColor);
    const targetTileId = props.index !== undefined ? props.index : props.id;
    const mainTile = props.boardTiles?.[targetTileId];
    const isMainTileBlack = mainTile ? isBlackRenderedTile(mainTile.contains, mainTile.color) : isBlackTile;
    const isEnlargeableStructure = (containsObj && (['hut', 'archway'].includes(containsObj.subtype) || ['hut', 'archway'].includes(containsObj.building) || ['hut', 'archway'].includes(containsObj.type))) ||
                                   (currentContains && (['hut', 'archway'].includes(currentContains.subtype) || ['hut', 'archway'].includes(currentContains.building) || ['hut', 'archway'].includes(currentContains.type)));
    const isUnderConstruction = (props.contains && typeof props.contains.subtype === 'string' && props.contains.subtype.includes('_under_construction')) ||
                                (currentContains && typeof currentContains.subtype === 'string' && currentContains.subtype.includes('_under_construction'));
    const isOccupied = props.isPlayerOnTile || props.isPeerOnTile;

    const isNearbyMonster = (() => {
        if (!isMonsterOrPygmyTile) return false;
        if (tileRow === null || tileCol === null || !boardTiles) return false;
        const playerTile = boardTiles.find(t => t && (t.isPlayerTile || (t.location && Array.isArray(t.location))));
        if (!playerTile) return false;
        const pRow = Math.floor(playerTile.id / 15);
        const pCol = playerTile.id % 15;
        const manhattanDist = Math.abs(tileRow - pRow) + Math.abs(tileCol - pCol);
        return manhattanDist <= 3;
    })();

    const isChargingAmbush = !!(currentTile && currentTile.isChargingAmbush) || !!props.isChargingAmbush;
    const isBumpingAttack = !!(currentTile && currentTile.isBumpingAttack) || !!props.isBumpingAttack || !!(currentContains && currentContains.isBumpingAttack);
    const bumpVector = (currentTile && currentTile.bumpVector) || props.bumpVector || (currentContains && currentContains.bumpVector) || { dRow: -1, dCol: 0 };
    const bumpX = `${(bumpVector?.dCol ?? 0) * 85}%`;
    const bumpY = `${(bumpVector?.dRow ?? -1) * 85}%`;

    const isBumpedBack = !!(currentTile && currentTile.isBumpedBack) || !!props.isBumpedBack || !!(currentContains && currentContains.isBumpedBack);
    const bumpedBackVector = (currentTile && currentTile.bumpedBackVector) || props.bumpedBackVector || (currentContains && currentContains.bumpedBackVector) || { dRow: -1, dCol: 0 };
    const bumpedX = `${(bumpedBackVector?.dCol ?? 0) * 45}%`;
    const bumpedY = `${(bumpedBackVector?.dRow ?? -1) * 45}%`;

    const isGliding = !!(currentTile && currentTile.isGliding) || !!props.isGliding || !!(currentContains && currentContains.isGliding);
    const glideVector = (currentTile && currentTile.glideVector) || props.glideVector || (currentContains && currentContains.glideVector) || { dRow: 0, dCol: 0 };
    const glideX = `${(glideVector?.dCol ?? 0) * 100}%`;
    const glideY = `${(glideVector?.dRow ?? 0) * 100}%`;


    const imageString = String(props.imageOverride || props.image || '').toLowerCase();
    const isItemImage = imageString.includes('key') ||
                        imageString.includes('chest') ||
                        imageString.includes('sword') ||
                        imageString.includes('shield') ||
                        imageString.includes('helm') ||
                        imageString.includes('armor') ||
                        imageString.includes('boots') ||
                        imageString.includes('ring') ||
                        imageString.includes('amulet') ||
                        imageString.includes('potion') ||
                        imageString.includes('scroll') ||
                        imageString.includes('book') ||
                        imageString.includes('tablet') ||
                        imageString.includes('relic') ||
                        imageString.includes('coin') ||
                        imageString.includes('gold') ||
                        imageString.includes('gem') ||
                        imageString.includes('jewel') ||
                        imageString.includes('rune') ||
                        imageString.includes('shard');

    const isLitterCell = imageString.includes('litter') || imageString.includes('terrain') ||
                         (containsObj && (containsObj.type === 'dungeon_litter' || containsObj.type === 'terrain')) ||
                         props.optionType === 'dungeon litter' || props.optionType === 'terrain';

    const isItemCell = !isLitterCell && (props.type === 'item' || 
                       (containsObj && (containsObj.type === 'item' || containsObj.type === 'key')) ||
                       ['key', 'items', 'jewels', 'runes', 'treasure'].includes(props.optionType) ||
                       isItemImage);

    const isKeyTile = (() => {
        const strImage = imageString;
        const strContains = typeof currentContains === 'string' ? currentContains.toLowerCase() : '';
        const strType = typeof containsType === 'string' ? containsType.toLowerCase() : '';
        const strSubtype = typeof containsSubtype === 'string' ? containsSubtype.toLowerCase() : '';
        const strOptionType = String(props.optionType || '').toLowerCase();

        // Exclude gates / doors
        if (strImage.includes('gate') || strContains.includes('gate') || strSubtype.includes('gate') || 
            strImage.includes('door') || strContains.includes('door') || strSubtype.includes('door')) {
            return false;
        }

        // Check types / subtypes / optionTypes / contains / image
        if (strType === 'key' || strType.includes('key') || strSubtype === 'key' || strSubtype.includes('key')) return true;
        if (strContains.includes('key')) return true;
        if (strOptionType === 'key' || strOptionType.includes('key')) return true;
        if (strImage.includes('key')) return true;

        if (containsObj) {
            const objType = String(containsObj.type || '').toLowerCase();
            const objSubtype = String(containsObj.subtype || '').toLowerCase();
            const objName = String(containsObj.name || '').toLowerCase();
            const objId = String(containsObj.id || '').toLowerCase();

            if (objType === 'key' || objType.includes('key') || objSubtype.includes('key') || objName.includes('key') || objId.includes('key')) {
                return true;
            }
        }

        if (props.data) {
            const dType = String(props.data.type || '').toLowerCase();
            const dSubtype = String(props.data.subtype || '').toLowerCase();
            const dName = String(props.data.name || '').toLowerCase();

            if (dType === 'key' || dType.includes('key') || dSubtype.includes('key') || dName.includes('key')) {
                return true;
            }
        }

        return false;
    })();

    const isAutomatedTile = !props.inSuperboard && !!(
        (isStructureTile || isShrine || props.generatorData) && (
            props.isAutomated ||
            (props.generatorData && props.generatorData.automated) ||
            (props.contains && typeof props.contains === 'object' && (props.contains.automated || (props.contains.generatorData && props.contains.generatorData.automated))) ||
            (props.data && props.data.generatorData && props.data.generatorData.automated)
        )
    );

    const densityTier = (typeof props.forestDensityTier === 'number')
        ? props.forestDensityTier
        : ((typeof containsObj === 'object' && typeof containsObj?.forestDensityTier === 'number')
            ? containsObj.forestDensityTier
            : ((typeof currentContains === 'object' && typeof currentContains?.forestDensityTier === 'number')
                ? currentContains.forestDensityTier
                : null));

    const mountainDensityTier = (typeof props.mountainDensityTier === 'number')
        ? props.mountainDensityTier
        : ((typeof containsObj === 'object' && typeof containsObj?.mountainDensityTier === 'number')
            ? containsObj.mountainDensityTier
            : ((typeof currentContains === 'object' && typeof currentContains?.mountainDensityTier === 'number')
                ? currentContains.mountainDensityTier
                : null));

    const isTerrainType = (containsObj && (containsObj.type === 'terrain' || containsObj.terrainSet)) ||
        (currentContains && (currentContains.type === 'terrain' || currentContains.terrainSet)) ||
        (props.contains && typeof props.contains === 'object' && (props.contains.type === 'terrain' || props.contains.terrainSet)) ||
        (typeof props.contains === 'string' && props.contains.startsWith('terrain')) ||
        (props.optionType === 'terrain');

    const isLayeredForestTile = isTerrainType && densityTier !== null && densityTier !== undefined && densityTier <= 4 && densityTier > 0 && props.type !== 'palette-tile' && props.optionType !== 'delete' && props.optionType !== 'voidfill';
    const isLayeredMountainTile = isTerrainType && mountainDensityTier !== null && mountainDensityTier !== undefined && mountainDensityTier <= 4 && mountainDensityTier > 0 && props.type !== 'palette-tile' && props.optionType !== 'delete' && props.optionType !== 'voidfill';

    return (
        <div 
            data-portal-id={props['data-portal-id']}
            style={{
            '--bump-x': bumpX,
            '--bump-y': bumpY,
            '--bumped-x': bumpedX,
            '--bumped-y': bumpedY,
            '--glide-x': glideX,
            '--glide-y': glideY,
            opacity: props.isPreview ? 0.6 : 1,
            pointerEvents: props.passThrough ? 'none' : 'inherit',
            boxSizing: 'border-box',
            transition: 'background-color 0.35s, border-color 0.35s',
            cursor: props.cursor ? props.cursor : 'pointer',
            height: typeof props.tileSize === 'string' ? props.tileSize : (props.tileSize ? props.tileSize + 'px' : '100%'),
            width: typeof props.tileSize === 'string' ? props.tileSize : (props.tileSize ? props.tileSize + 'px' : '100%'),
            backgroundColor: 
                props.backgroundColor ? props.backgroundColor :
                (props.hovered && props.type === 'board-tile') ? 
                '#8080807a' : 
                ( props.type === 'overlay-tile' ? 
                    'transparent': 
                    (props.type === 'inventory-tile' ? (props.isActiveInventory ? 'lightgreen' : 'transparent') : color)),
            fontSize: '0.7em',
            position: 'relative',
            overflow: isPaletteTile ? 'hidden' : ((isStructureTile || hasConvertingMonolith || isIlluminatedGlow || isBumpingAttack || isGliding || isRevealedBySpiritSight || props.connectedEdge || (props.inscriptions && Object.values(props.inscriptions).some(v => !!v)) || ((isEnlargeableStructure && isOccupied) || isUnderConstruction) || (props.sabotageProgress !== null && props.sabotageProgress !== undefined) || (props.monolithActivationProgress !== null && props.monolithActivationProgress !== undefined)) ? 'visible' : 'hidden'),
            zIndex: hasConvertingMonolith ? 40 : (isBumpingAttack ? 100 : (isGliding ? 90 : (isRevealedBySpiritSight ? 15 : (isStructureTile ? ((!isVendorCell || getVendorCellRole() === 'anchor') ? 14 : 8) : ((props.inscriptions && Object.values(props.inscriptions).some(v => !!v)) ? 10 : (isIlluminatedGlow ? ((!isVendorCell || getVendorCellRole() === 'anchor') ? 9 : 8) : (((isEnlargeableStructure && isOccupied) || isUnderConstruction) ? 5 : undefined))))))),
            boxShadow: isRevealedBySpiritSight ? 'inset 0 0 10px rgba(0, 243, 255, 0.6), 0 0 10px rgba(0, 243, 255, 0.6)' : undefined,
            border: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : vctBorder,
            borderLeft: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || (props.borders && props.borders.left ? props.borders.left : ((props.type === 'palette-tile' && !props.hovered) ? '2px solid transparent' : 
                (props.type === 'palette-tile' && props.hovered ? '2px solid red' : 'none')))))),
            borderRight: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.right) ? props.borders.right : 'none')))),
            borderTop: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.top) ? props.borders.top : 'none')))),
            borderBottom: isRevealedBySpiritSight ? '1px solid rgba(0, 243, 255, 0.8)' : (isBoardGridTile ? 'none' : (vctBorder ? undefined : (vendorBorderless || ((props.borders && props.borders.bottom) ? props.borders.bottom : 'none'))))
            }}
            onMouseEnter={() => {
                beginDelayedHoverLabel();
                if(props.type === 'crew-tile'){
                    return props.handleHover(props)
                } else if(props.handleHover && props.type === 'overlay-tile'){
                    return props.handleHover(props.id)
                }  else if(props.handleHover && props.type !== 'inventory-tile'){
                    return props.handleHover(props.id, props.type, this)
                } else if(props.handleHover && props.type === 'inventory-tile'){
                    return props.handleHover(props)
                } else{
                    return null
                }
            }}
            onMouseLeave={() => {
                endDelayedHoverLabel();
                if(props.type === 'crew-tile' || props.type === 'inventory-tile'){
                    return props.handleHover(null)
                } 
            }}
            onMouseDown={() => {
                if(props.handleClick){
                    return props.handleClick(props)
                } else {
                    return null
                }
            }}
            onDoubleClick={(e) => {
                if (props.handleDoubleClick) {
                    return props.handleDoubleClick(props);
                }
            }}
            onContextMenu={(e) => {
                if (props.handleContextMenu) {
                    e.preventDefault();
                    props.handleContextMenu(e, props.id);
                }
            }}
            onDragStart={(e) => e.preventDefault()}
            className={`tile ${props.className || ''} ${props.type || ''} ${isBumpingAttack ? 'pygmy-bump-hit' : (isBumpedBack ? 'pygmy-bump-absorb' : (isGliding ? 'pygmy-glide' : ''))}`.trim()}
            data-tile-id={props.index}
        >
           {props.isMobileTouchHover && (
               <div style={{
                   position: 'absolute', top: 0, left: 0,
                   right: (isVendorCell && getVendorCellRole() === 'anchor') ? (is3x3Structure ? '-200%' : '-100%') : 0,
                   bottom: (isVendorCell && getVendorCellRole() === 'anchor') ? (is3x3Structure ? '-200%' : '-100%') : 0,
                   border: '3px solid gold', zIndex: 100, pointerEvents: 'none',
                   boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.5)'
               }} />
           )}

           {edgeLines && (
                <>
                    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: edgeLines.top, zIndex: 40, pointerEvents: 'none'}} />
                    <div style={{position: 'absolute', top: 0, bottom: 0, left: 0, width: 2, backgroundColor: edgeLines.left, zIndex: 40, pointerEvents: 'none'}} />
                    {edgeLines.right && <div style={{position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, backgroundColor: edgeLines.right, zIndex: 40, pointerEvents: 'none'}} />}
                    {edgeLines.bottom && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: edgeLines.bottom, zIndex: 40, pointerEvents: 'none'}} />}
                </>
           )}

           {/* Sabotage Progress Bar under tile/complex (in dungeon) */}
           { (!isVendorCell || getVendorCellRole() === 'anchor') && (props.sabotageProgress !== undefined && props.sabotageProgress !== null) && (
               <div style={{
                   position: 'absolute',
                   bottom: is3x3Structure ? 'calc(-200% - 12px)' : (isVendorCell ? 'calc(-100% - 12px)' : '-12px'),
                   left: '1px',
                   right: is3x3Structure ? '-200%' : (isVendorCell ? '-100%' : '1px'),
                   height: '7px',
                   backgroundColor: 'rgba(0, 0, 0, 0.9)',
                   border: '1px solid #f59e0b',
                   borderRadius: '3px',
                   padding: '1px',
                   boxSizing: 'border-box',
                   zIndex: 60,
                   pointerEvents: 'none',
                   boxShadow: '0 2px 6px rgba(0,0,0,0.9)'
               }}>
                   <div style={{
                       width: `${Math.min(100, Math.max(0, props.sabotageProgress * 100))}%`,
                       height: '100%',
                       backgroundColor: '#f59e0b',
                       backgroundImage: 'linear-gradient(90deg, #d97706, #fbbf24)',
                       borderRadius: '2px',
                       transition: 'width 0.1s linear',
                       boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)'
                   }} />
               </div>
           )}

           {/* Monolith Activation Progress Bar under tile/complex (in dungeon) */}
           { (!isVendorCell || getVendorCellRole() === 'anchor') && (props.monolithActivationProgress !== undefined && props.monolithActivationProgress !== null) && (
               <div style={{
                   position: 'absolute',
                   bottom: is3x3Structure ? 'calc(-200% - 12px)' : (isVendorCell ? 'calc(-100% - 12px)' : '-12px'),
                   left: '1px',
                   right: is3x3Structure ? '-200%' : (isVendorCell ? '-100%' : '1px'),
                   height: '7px',
                   backgroundColor: 'rgba(0, 0, 0, 0.9)',
                   border: '1px solid #c084fc',
                   borderRadius: '3px',
                   padding: '1px',
                   boxSizing: 'border-box',
                   zIndex: 60,
                   pointerEvents: 'none',
                   boxShadow: '0 2px 6px rgba(0,0,0,0.9)'
               }}>
                   <div style={{
                       width: `${Math.min(100, Math.max(0, props.monolithActivationProgress * 100))}%`,
                       height: '100%',
                       backgroundColor: '#c084fc',
                       backgroundImage: 'linear-gradient(90deg, #9333ea, #d8b4fe)',
                       borderRadius: '2px',
                       transition: 'width 0.1s linear',
                       boxShadow: '0 0 6px rgba(168, 85, 247, 0.8)'
                   }} />
               </div>
           )}


           {/* Disabled Outpost Broken Overlay */}
           { color !== 'black' && (props.isDisabledOutpost || (props.disabledUntil && Date.now() < props.disabledUntil)) && (
               <div style={{
                   position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                   backgroundColor: 'rgba(25, 10, 10, 0.75)',
                   border: '2px dashed #ef4444',
                   boxShadow: 'inset 0 0 12px rgba(239, 68, 68, 0.7)',
                   display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                   zIndex: 25, pointerEvents: 'none'
               }}>
                   <span style={{ fontSize: '18px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))' }}>💥</span>
                   <span style={{ fontSize: '8px', color: '#fca5a5', fontWeight: 'bold', fontFamily: "'Inter', sans-serif", letterSpacing: '0.5px' }}>DISABLED</span>
               </div>
           )}

            {/* Structure Faction Base Glow Ring Overlay */}
            { color !== 'black' && (() => {
                if (!isStructureTile) return null;

                // Palette tiles must NEVER render structure rings
                if (props.type === 'palette-tile' || props.isPaletteTile) return null;

                // For multi-tile structures, only render the ring once on the anchor cell
                const vRole = getVendorCellRole();
                if (vRole && vRole !== 'anchor') return null;

                const containsSubtype = containsObj?.subtype || containsObj?.key || containsObj?.building || (typeof props.contains === 'string' ? props.contains : null);
                const sKey = String(containsSubtype || props.building || containsObj?.type || props.image || '').toLowerCase();
                const isDomainMonolith = sKey.includes('domain_monolith') || sKey.includes('dark_domain_monolith') || sKey.includes('domain_node') || sKey.includes('dark_domain_node') || (sKey.includes('monolith') && !sKey.includes('shrine'));
                const isDomainActive = isDomainMonolith && (!!containsObj?.activated || !!props.activated || (containsObj?.growthCycles > 0) || (props.growthCycles > 0) || !!containsObj?.territory || !!props.territory || !!containsObj?.territoryAffiliation || !!props.territoryAffiliation);
                if (isDomainActive) return null;

                const isGenerator = sKey.includes('ore_mine') || sKey.includes('slate_mine') || sKey.includes('sawmill') || sKey.includes('lumber_mill') || sKey.includes('larder') || sKey.includes('dust_collector') || sKey.includes('fungal_nursery') || sKey.includes('cultivation_vat') || sKey.includes('generator') || sKey.includes('mine');
                const gData = props.generatorData || containsObj?.generatorData;
                const isGeneratorActive = isGenerator && !!(gData?.activated || props.activated || containsObj?.activated);

                const boardTiles = Array.isArray(props.boardTiles) ? props.boardTiles : null;
                const currentIdx = props.id !== undefined ? props.id : props.index;
                const currentTileObj = (currentIdx !== null && currentIdx !== undefined && boardTiles) ? boardTiles[currentIdx] : null;
                const rawTerr = getTileTerritoryAffiliationHelper(currentTileObj, props);

                const containsAffiliation = containsObj?.affiliation || props.affiliation || currentTileObj?.affiliation;
                const affStr = String(containsAffiliation || rawTerr || '').toLowerCase();

                const isPlayerAffiliated = affStr.includes('friendly') || affStr.includes('player') || affStr.includes('crew');
                const isHostileAffiliated = affStr.includes('hostile') || affStr.includes('enemy') || affStr.includes('automaton');

                const isPlayerBuilt = isPlayerAffiliated || isGeneratorActive || !!(
                    (containsObj && (containsObj.placedBy === 'player' || containsObj.ownerId === 'player' || containsObj.faction === 'player' || containsObj.isAllied)) ||
                    props.placedBy === 'player' ||
                    props.isPlayerBuilt
                );

                const isHostile = isHostileAffiliated || (!isPlayerBuilt && !!(
                    (containsObj && (containsObj.faction === 'hostile' || containsObj.isHostile || containsObj.faction === 'enemy')) ||
                    props.isHostile
                ));

                const isNeutral = !isPlayerBuilt && !isHostile;

                // By default, neutral structures in Dungeon Builder show NO colored ring
                if (isBuilderTile && isNeutral) return null;

                let ringColor = 'rgba(255, 255, 255, 0.85)'; // Neutral White in-game
                let ringGlow = '0 0 14px rgba(255, 255, 255, 0.75), inset 0 0 10px rgba(255, 255, 255, 0.45)';
                let bgGradient = 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%)';
                let labelTitle = 'Neutral Structure';

                if (isPlayerBuilt) {
                    ringColor = 'rgba(59, 130, 246, 0.9)'; // Allied / Friendly Blue
                    ringGlow = '0 0 16px rgba(59, 130, 246, 0.85), inset 0 0 12px rgba(59, 130, 246, 0.5)';
                    bgGradient = 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.08) 70%, transparent 100%)';
                    labelTitle = isGeneratorActive ? 'Friendly Resource Generator' : 'Friendly Structure';
                } else if (isHostile) {
                    ringColor = 'rgba(239, 68, 68, 0.9)'; // Hostile Red
                    ringGlow = '0 0 16px rgba(239, 68, 68, 0.85), inset 0 0 12px rgba(239, 68, 68, 0.5)';
                    bgGradient = 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.08) 70%, transparent 100%)';
                    labelTitle = 'Hostile Structure';
                }

                const isSingleTileStructure = sKey.includes('earthen_fort') || sKey.includes('outpost') || sKey.includes('observer') || sKey.includes('domain_node') || sKey.includes('dark_domain_node') || sKey.includes('node') || sKey.includes('farm') || sKey.includes('house');
                const is2x2Structure = !isSingleTileStructure && (sKey.includes('war_camp') || sKey.includes('war_fort') || sKey.includes('dream_den') || sKey.includes('domain_monolith') || sKey.includes('dark_domain_monolith') || (sKey.includes('monolith') && !sKey.includes('shrine')) || sKey.includes('cultivation_vat') || sKey.includes('dust_collector') || sKey.includes('larder') || sKey.includes('sawmill') || sKey.includes('lumber_mill') || sKey.includes('ore_mine') || sKey.includes('slate_mine') || sKey.includes('fungal_nursery') || sKey.includes('mine') || sKey.includes('naked_trees_3') || sKey.includes('naked_trees_4') || sKey.includes('naked_mountains_2'));
                const isMulti = !isSingleTileStructure && (isVendorCell || vRole === 'anchor' || is2x2Structure || is3x3Structure);
                return (
                    <div
                        className="structure-faction-ring"
                        title={labelTitle}
                        style={{
                            position: 'absolute',
                            top: '4%',
                            left: '4%',
                            right: isMulti ? (is3x3Structure ? '-196%' : '-96%') : '4%',
                            bottom: isMulti ? (is3x3Structure ? '-196%' : '-96%') : '4%',
                            borderRadius: '50%',
                            border: `2px solid ${ringColor}`,
                            boxShadow: ringGlow,
                            background: bgGradient,
                            zIndex: 14,
                            pointerEvents: 'none',
                            transition: 'all 0.3s ease-in-out',
                            animation: 'structureRingPulse 2.5s infinite ease-in-out'
                        }}
                    />
                );
            })()}

            {/* Pocket Dimension Domain Monolith Expansion Countdown Radial Badge */}
            {(() => {
                if (!props.inSuperboard) return null;
                if (color === 'black') return null;

                const cObj = props.contains && typeof props.contains === 'object' ? props.contains : null;
                const containsSubtype = cObj?.subtype || cObj?.key || cObj?.building || (typeof props.contains === 'string' ? props.contains : null);
                const sKey = String(containsSubtype || props.building || cObj?.type || props.image || '').toLowerCase();

                const isDomainMonolith = sKey.includes('domain_monolith') || sKey.includes('dark_domain_monolith') || sKey.includes('domain_node') || sKey.includes('dark_domain_node') || (sKey.includes('monolith') && !sKey.includes('shrine'));
                if (!isDomainMonolith) return null;

                const isVendorCell = !isPaletteTile && !isSingleTile && (
                    (cObj && (cObj.isMultiTile || cObj.isLarge || isVendorType(cObj.type) || isVendorType(cObj.subtype) || isVendorType(cObj.building) || isVendorType(cObj.key) || isVendorType(cObj.name))) ||
                    props.isLarge || props.isMultiTile || !!(cObj && cObj.vendorCell) || !!props.vendorCell
                );
                const vRole = getVendorCellRole();
                // Only render once on the anchor tile of the monolith (or single tile if not multi)
                if (isVendorCell && vRole && vRole !== 'anchor') return null;

                const isHostileMonolith = sKey.includes('dark_domain_monolith') || sKey.includes('dark_domain_node') || props.isHostile || cObj?.isHostile || cObj?.faction === 'hostile';
                const rawAff = cObj?.affiliation || props.affiliation || props.territoryAffiliation || cObj?.territoryAffiliation || props.territory || cObj?.territory;
                const isActivated = !!(cObj?.activated || props.activated || (cObj?.growthCycles > 0) || (props.growthCycles > 0) || isHostileMonolith || (rawAff && rawAff !== 'none'));
                if (!isActivated) return null;

                const affiliation = isHostileMonolith ? 'hostile' : (rawAff && rawAff !== 'none' ? rawAff : 'friendly');
                const level = cObj?.level || props.level || 1;
                const maxGrowthCycles = cObj?.maxGrowthCycles || props.maxGrowthCycles || (level >= 2 ? 10 : 5);
                const growthCycles = cObj?.growthCycles ?? props.growthCycles ?? 1;
                const lastGrowthTime = cObj?.lastGrowthTime || props.lastGrowthTime || Date.now();

                const isMax = growthCycles >= maxGrowthCycles;
                const is2x2 = !sKey.includes('node') && (isVendorCell || sKey.includes('domain_monolith') || sKey.includes('dark_domain_monolith') || (sKey.includes('monolith') && !sKey.includes('shrine')) || sKey.includes('cultivation_vat') || sKey.includes('dust_collector') || sKey.includes('larder') || sKey.includes('sawmill') || sKey.includes('lumber_mill') || sKey.includes('ore_mine') || sKey.includes('slate_mine') || sKey.includes('fungal_nursery') || sKey.includes('generator') || sKey.includes('mine'));

                const isPlayer = !isHostileMonolith && (String(affiliation).toLowerCase().includes('player') || String(affiliation).toLowerCase().includes('friendly') || String(affiliation).toLowerCase().includes('crew'));
                const badgeGlow = isPlayer ? 'rgba(56, 189, 248, 0.6)' : 'rgba(239, 68, 68, 0.6)';
                const strokeColor = isMax ? '#facc15' : (isPlayer ? '#38bdf8' : '#f87171');

                return (
                    <DomainMonolithTimerBadge
                        key={`monolith_badge_${growthCycles}_${lastGrowthTime}`}
                        lastGrowthTime={lastGrowthTime}
                        growthCycles={growthCycles}
                        maxGrowthCycles={maxGrowthCycles}
                        is2x2={is2x2}
                        strokeColor={strokeColor}
                        badgeGlow={badgeGlow}
                        isMax={isMax}
                    />
                );
            })()}

            {/* Active Generator Ownership & Production Cycle Badge (Pocket Dimension only) */}
            {(() => {
                if (color === 'black' || !props.inSuperboard) return null;

                const cObj = props.contains && typeof props.contains === 'object' ? props.contains : null;
                const containsSubtype = cObj?.subtype || cObj?.key || cObj?.building || (typeof props.contains === 'string' ? props.contains : null);
                const sKey = String(containsSubtype || props.building || cObj?.type || props.image || '').toLowerCase();

                const isDomainMonolith = sKey.includes('domain_monolith') || sKey.includes('dark_domain_monolith') || sKey.includes('domain_node') || sKey.includes('dark_domain_node') || (sKey.includes('monolith') && !sKey.includes('shrine'));
                if (isDomainMonolith) return null;

                const isGenerator = sKey.includes('ore_mine') || sKey.includes('slate_mine') || sKey.includes('sawmill') || sKey.includes('lumber_mill') || sKey.includes('larder') || sKey.includes('dust_collector') || sKey.includes('fungal_nursery') || sKey.includes('cultivation_vat') || sKey.includes('generator') || sKey.includes('mine') || sKey.includes('farm') || sKey.includes('windmill') || sKey.includes('house') || sKey.includes('manor') || sKey.includes('estate');
                if (!isGenerator) return null;

                const isVendorCell = !isPaletteTile && !isSingleTile && (
                    (cObj && (cObj.isMultiTile || cObj.isLarge || isVendorType(cObj.type) || isVendorType(cObj.subtype) || isVendorType(cObj.building) || isVendorType(cObj.key) || isVendorType(cObj.name))) ||
                    props.isLarge || props.isMultiTile || !!(cObj && cObj.vendorCell) || !!props.vendorCell
                );
                const vRole = getVendorCellRole();
                if (isVendorCell && vRole && vRole !== 'anchor') return null;

                const gData = props.generatorData || cObj?.generatorData;
                const boardTiles = Array.isArray(props.boardTiles) ? props.boardTiles : null;
                const currentIdx = props.id !== undefined ? props.id : props.index;
                const currentTileObj = (currentIdx !== null && currentIdx !== undefined && boardTiles) ? boardTiles[currentIdx] : null;
                const rawTerr = getTileTerritoryAffiliationHelper(currentTileObj, props);
                const containsAffiliation = cObj?.affiliation || props.affiliation || currentTileObj?.affiliation;
                const affStr = String(containsAffiliation || rawTerr || '').toLowerCase();

                const isPlayerAffiliated = affStr.includes('friendly') || affStr.includes('player') || affStr.includes('crew');
                const isHostileAffiliated = affStr.includes('hostile') || affStr.includes('enemy') || affStr.includes('automaton');

                const isClaimableBuilding = sKey.includes('farm') || sKey.includes('windmill') || sKey.includes('house') || sKey.includes('manor') || sKey.includes('estate');
                const isActivated = !!(gData?.activated || props.activated || cObj?.activated || (isClaimableBuilding && (isPlayerAffiliated || isHostileAffiliated)));
                if (!isActivated) return null;

                const isHostile = isHostileAffiliated || containsAffiliation === 'hostile' || cObj?.isHostile || props.isHostile;
                const strokeColor = isHostile ? '#f87171' : '#38bdf8';
                const badgeGlow = isHostile ? 'rgba(239, 68, 68, 0.6)' : 'rgba(56, 189, 248, 0.6)';

                let resource = gData?.resource;
                if (!resource || String(resource).toLowerCase() === 'stone') {
                    if (sKey.includes('farm') || sKey.includes('windmill') || sKey.includes('larder') || sKey.includes('food')) resource = 'food';
                    else if (sKey.includes('house') || sKey.includes('manor') || sKey.includes('estate') || sKey.includes('influence')) resource = 'influence';
                    else if (sKey.includes('ore_mine') || sKey.includes('stone') || sKey.includes('ore') || sKey.includes('mine')) resource = 'ore';
                    else if (sKey.includes('slate_mine') || sKey.includes('slate')) resource = 'slate';
                    else if (sKey.includes('sawmill') || sKey.includes('lumber_mill') || sKey.includes('wood')) resource = 'wood';
                    else if (sKey.includes('dust_collector') || sKey.includes('dust')) resource = 'dust';
                    else if (sKey.includes('fungal_nursery') || sKey.includes('mushroom')) resource = 'mushrooms';
                    else if (sKey.includes('cultivation_vat') || sKey.includes('chemical') || sKey.includes('vat')) resource = 'chemicals';
                }

                const isSingleTileStructure = sKey.includes('earthen_fort') || sKey.includes('outpost') || sKey.includes('observer') || sKey.includes('domain_node') || sKey.includes('dark_domain_node') || sKey.includes('node') || sKey.includes('farm') || sKey.includes('house');
                const is2x2Structure = !isSingleTileStructure && (sKey.includes('war_camp') || sKey.includes('war_fort') || sKey.includes('dream_den') || sKey.includes('domain_monolith') || sKey.includes('dark_domain_monolith') || (sKey.includes('monolith') && !sKey.includes('shrine')) || sKey.includes('cultivation_vat') || sKey.includes('dust_collector') || sKey.includes('larder') || sKey.includes('sawmill') || sKey.includes('lumber_mill') || sKey.includes('ore_mine') || sKey.includes('slate_mine') || sKey.includes('fungal_nursery') || sKey.includes('mine') || sKey.includes('naked_trees_3') || sKey.includes('naked_trees_4') || sKey.includes('naked_mountains_2'));
                const is2x2 = !isSingleTileStructure && (isVendorCell || is2x2Structure);

                const baseRate = sKey.includes('windmill') ? 10 : (sKey.includes('farm') ? 5 : (sKey.includes('house') ? 1 : (sKey.includes('manor') ? 2 : 3)));
                const effectiveRate = gData?.rate || gData?.cycleAmount || baseRate;
                const effectiveInterval = gData?.cycleIntervalSec || 15;
                const effectiveLastTick = gData?.lastTickTime || cObj?.lastClaimTickTime || props.lastClaimTickTime || currentTileObj?.lastClaimTickTime;

                return (
                    <ActiveGeneratorBadge
                        key={`gen_badge_${props.id ?? props.index}_${gData?.activatedAt || effectiveLastTick || 0}`}
                        resource={resource}
                        rate={effectiveRate}
                        cycleIntervalSec={effectiveInterval}
                        lastTickTime={effectiveLastTick}
                        activatedAt={gData?.activatedAt || effectiveLastTick}
                        is2x2={is2x2}
                        strokeColor={strokeColor}
                        badgeGlow={badgeGlow}
                        isAutomated={props.isAutomated || props.inSuperboard}
                    />
                );
            })()}

            {/* Delete Tool Red Hover Outline Overlay for Multi-Tile Buildings & Tiles */}
            { color !== 'black' && (() => {
                const currentIdVal = props.id !== undefined ? props.id : props.index;
                const isFootprintHovered = Array.isArray(props.hoveredTileFootprint) && props.hoveredTileFootprint.includes(currentIdVal);
                const isDeleteTool = props.pinnedOption?.optionType === 'delete' || props.optionType === 'delete';
                const showDeleteHighlight = (props.hovered || isFootprintHovered) && isDeleteTool;
                if (!showDeleteHighlight) return null;

                return (
                    <div
                        key="delete-hover-overlay"
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            border: '2px solid #ef4444',
                            boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.8), 0 0 12px rgba(239, 68, 68, 0.9)',
                            backgroundColor: 'rgba(239, 68, 68, 0.25)',
                            zIndex: 55,
                            pointerEvents: 'none'
                        }}
                    />
                );
            })()}

            {/* Pocket Dimension Territory Boundary Glow Line Overlay */}
            {(() => {
                const isSuperboardTile = props.isBuilderTile || props.isBuilder || props.type === 'board-tile';
                if (!isSuperboardTile) return null;

                const boardTiles = Array.isArray(props.boardTiles) ? props.boardTiles : null;
                const currentIdx = props.id !== undefined ? props.id : props.index;

                const currentTileObj = (currentIdx !== null && currentIdx !== undefined && boardTiles) ? boardTiles[currentIdx] : null;
                const currentRawTerr = getTileTerritoryAffiliationHelper(currentTileObj, props);

                if (!currentRawTerr) return null;

                // Check if this tile is covered by an active domain monolith whose domain is a perfect rotating square
                const sb = props.superboard;
                if (sb && Array.isArray(sb.miniboards) && typeof props.globalX === 'number' && typeof props.globalY === 'number') {
                    let insidePerfectSquareDomain = false;
                    for (let mbIdx = 0; mbIdx < 9; mbIdx++) {
                        const mb = sb.miniboards[mbIdx];
                        if (!mb || !Array.isArray(mb.tiles)) continue;
                        const mbX = mbIdx % 3;
                        const mbY = Math.floor(mbIdx / 3);

                        for (let tIdx = 0; tIdx < 225; tIdx++) {
                            const t = mb.tiles[tIdx];
                            if (!t || !t.contains) continue;
                            const c = typeof t.contains === 'object' ? t.contains : null;
                            const monoSubtype = c?.subtype || c?.key || c?.building || t.building || c?.type || '';
                            const monoKey = String(monoSubtype).toLowerCase();
                            const isMono = monoKey.includes('domain_monolith') || monoKey.includes('dark_domain_monolith') || monoKey.includes('domain_node') || monoKey.includes('dark_domain_node') || (monoKey.includes('monolith') && !monoKey.includes('shrine'));
                            if (!isMono) continue;
                            const vRole = c?.vendorCell || t.vendorCell;
                            if (vRole && vRole !== 'anchor') continue;

                            const isHostile = monoKey.includes('dark_domain_monolith') || monoKey.includes('dark_domain_node') || t.isHostile || c?.isHostile || c?.faction === 'hostile';
                            const rawAff = c?.affiliation || t.affiliation || t.territoryAffiliation || c?.territoryAffiliation || t.territory || c?.territory;
                            const isMonoActive = !!(c?.activated || t.activated || (c?.growthCycles > 0) || (t.growthCycles > 0) || isHostile || (rawAff && rawAff !== 'none'));
                            if (!isMonoActive) continue;

                            const monoCycles = Math.max(1, c?.growthCycles ?? t.growthCycles ?? 1);
                            const monoAff = isHostile ? 'hostile' : (rawAff && rawAff !== 'none' ? rawAff : 'friendly');
                            const aGx = mbX * 15 + (tIdx % 15);
                            const aGy = mbY * 15 + Math.floor(tIdx / 15);

                            if (props.globalX >= aGx - monoCycles && props.globalX <= aGx + 1 + monoCycles &&
                                props.globalY >= aGy - monoCycles && props.globalY <= aGy + 1 + monoCycles) {
                                if (checkIsDomainSuperboardPerfectSquare(sb, aGx, aGy, monoCycles, monoAff)) {
                                    insidePerfectSquareDomain = true;
                                    break;
                                }
                            }
                        }
                        if (insidePerfectSquareDomain) break;
                    }
                    if (insidePerfectSquareDomain) return null;
                } else if (boardTiles && currentIdx !== null && currentIdx !== undefined) {
                    let insidePerfectSquareDomain = false;
                    for (let idx = 0; idx < boardTiles.length; idx++) {
                        const t = boardTiles[idx];
                        if (!t) continue;
                        const c = t.contains && typeof t.contains === 'object' ? t.contains : null;
                        const monoSubtype = c?.subtype || c?.key || c?.building || t.building || c?.type || '';
                        const monoKey = String(monoSubtype).toLowerCase();
                        const isMono = monoKey.includes('domain_monolith') || monoKey.includes('dark_domain_monolith') || monoKey.includes('domain_node') || monoKey.includes('dark_domain_node') || (monoKey.includes('monolith') && !monoKey.includes('shrine'));
                        if (!isMono) continue;
                        const vRole = c?.vendorCell || t.vendorCell;
                        if (vRole && vRole !== 'anchor') continue;

                        const isHostile = monoKey.includes('dark_domain_monolith') || monoKey.includes('dark_domain_node') || t.isHostile || c?.isHostile || c?.faction === 'hostile';
                        const rawAff = c?.affiliation || t.affiliation || t.territoryAffiliation || c?.territoryAffiliation || t.territory || c?.territory;
                        const isMonoActive = !!(c?.activated || t.activated || (c?.growthCycles > 0) || (t.growthCycles > 0) || isHostile || (rawAff && rawAff !== 'none'));
                        if (!isMonoActive) continue;

                        const monoCycles = Math.max(1, c?.growthCycles ?? t.growthCycles ?? 1);
                        const monoAff = isHostile ? 'hostile' : (rawAff && rawAff !== 'none' ? rawAff : 'friendly');

                        if (checkIsDomainPerfectSquare(idx, boardTiles, monoCycles, monoAff)) {
                            const aCol = idx % 15;
                            const aRow = Math.floor(idx / 15);
                            const curCol = currentIdx % 15;
                            const curRow = Math.floor(currentIdx / 15);
                            if (curCol >= aCol - monoCycles && curCol <= aCol + 1 + monoCycles &&
                                curRow >= aRow - monoCycles && curRow <= aRow + 1 + monoCycles) {
                                insidePerfectSquareDomain = true;
                                break;
                            }
                        }
                    }
                    if (insidePerfectSquareDomain) return null;
                }

                const currentStr = currentRawTerr.toLowerCase();
                const isFriendlyDomain = currentStr === 'friendly' || currentStr === 'player' || currentStr === 'crew' || currentStr.includes('player') || currentStr.includes('crew');
                const isPygmyOrHostile = !isFriendlyDomain && (
                    currentStr === 'hostile' || currentStr === 'wild' || currentStr.includes('hostile') ||
                    currentStr.includes('pygmy') || currentStr.includes('pygmies') ||
                    currentStr.includes('woodland') || currentStr.includes('cave') || currentStr.includes('shadow') ||
                    currentStr.includes('paradox') || currentStr.includes('mud')
                );

                const affColor = isFriendlyDomain ? '#3b82f6' : (isPygmyOrHostile ? '#ef4444' : '#ffffff');

                const getNeighborAff = (delta) => {
                    if (currentIdx === null || currentIdx === undefined || !boardTiles) return null;
                    const row = Math.floor(currentIdx / 15);
                    const col = currentIdx % 15;
                    if (delta === -1 && col === 0) return null;
                    if (delta === 1 && col === 14) return null;
                    if (delta === -15 && row === 0) return null;
                    if (delta === 15 && row === 14) return null;

                    const n = boardTiles[currentIdx + delta];
                    return getTileTerritoryAffiliationHelper(n, null);
                };

                const topAff = getNeighborAff(-15);
                const bottomAff = getNeighborAff(15);
                const leftAff = getNeighborAff(-1);
                const rightAff = getNeighborAff(1);

                const hasTopBoundary = topAff !== currentRawTerr;
                const hasBottomBoundary = bottomAff !== currentRawTerr;
                const hasLeftBoundary = leftAff !== currentRawTerr;
                const hasRightBoundary = rightAff !== currentRawTerr;

                if (!hasTopBoundary && !hasBottomBoundary && !hasLeftBoundary && !hasRightBoundary) return null;

                return (
                    <div
                        key="pocket-territory-boundary"
                        style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            pointerEvents: 'none',
                            zIndex: 18
                        }}
                    >
                        {hasTopBoundary && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                                backgroundColor: affColor,
                                boxShadow: `0 0 6px ${affColor}`,
                                animation: (props.newlyClaimed || (props.contains && props.contains.newlyClaimed)) ? 'territoryBoundaryPulse 1.5s ease-out' : 'none'
                            }} />
                        )}
                        {hasBottomBoundary && (
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
                                backgroundColor: affColor,
                                boxShadow: `0 0 6px ${affColor}`,
                                animation: (props.newlyClaimed || (props.contains && props.contains.newlyClaimed)) ? 'territoryBoundaryPulse 1.5s ease-out' : 'none'
                            }} />
                        )}
                        {hasLeftBoundary && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, bottom: 0, width: '2px',
                                backgroundColor: affColor,
                                boxShadow: `0 0 6px ${affColor}`,
                                animation: (props.newlyClaimed || (props.contains && props.contains.newlyClaimed)) ? 'territoryBoundaryPulse 1.5s ease-out' : 'none'
                            }} />
                        )}
                        {hasRightBoundary && (
                            <div style={{
                                position: 'absolute', top: 0, right: 0, bottom: 0, width: '2px',
                                backgroundColor: affColor,
                                boxShadow: `0 0 6px ${affColor}`,
                                animation: (props.newlyClaimed || (props.contains && props.contains.newlyClaimed)) ? 'territoryBoundaryPulse 1.5s ease-out' : 'none'
                            }} />
                        )}
                    </div>
                );
            })()}

           {/* Automated Generator Badge Overlay */}
           { color !== 'black' && isAutomatedTile && (
               <div
                   className="automated-tile-badge"
                   title="Automated Structure (Auto-collects / Auto-operates)"
                   style={{
                       position: 'absolute',
                       top: '2px',
                       right: '2px',
                       background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.95) 0%, rgba(14, 165, 233, 0.95) 100%)',
                       border: '1px solid #67e8f9',
                       borderRadius: '4px',
                       padding: '1px 3px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '2px',
                       boxShadow: '0 2px 6px rgba(0, 0, 0, 0.8), 0 0 8px rgba(6, 182, 212, 0.6)',
                       zIndex: 35,
                       pointerEvents: 'none'
                   }}
               >
                   <span style={{ fontSize: '8px', lineHeight: 1 }}>🤖</span>
                   <span style={{
                       fontSize: '6.5px',
                       fontWeight: '800',
                       fontFamily: "'Cinzel', 'Inter', sans-serif",
                       color: '#ffffff',
                       letterSpacing: '0.5px',
                       textTransform: 'uppercase',
                       lineHeight: 1,
                       textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                   }}>
                       AUTO
                   </span>
               </div>
           )}

           {/* Fog of war / void edge shading — Active when Debug Mode is ON */}
           { fogEdgeBoxShadow !== 'none' && (
               <div style={{
                   position: 'absolute',
                   top: 0,
                   left: 0,
                   right: 0,
                   bottom: 0,
                   boxShadow: fogEdgeBoxShadow,
                   zIndex: 26,
                   pointerEvents: 'none'
               }} />
           )}

            {/* HP fill: rendered as a vertical fill using a vibrant green gradient with a dark track */}
            { (typeof hpVal === 'number' && typeof maxHpVal === 'number') && (() => {
                const pct = Math.max(0, Math.min(1, maxHpVal <= 0 ? 0 : hpVal / maxHpVal));
                const heightPct = Math.round(pct * 100);
                const barWidthPct = (typeof props.hpBarWidth === 'number') ? props.hpBarWidth : 10;
                return (
                    <div 
                        className="hp-track" 
                        style={{
                            position: 'absolute', 
                            left: 0, 
                            bottom: 0, 
                            top: 0,
                            width: `${barWidthPct}%`, 
                            backgroundColor: 'rgba(0, 0, 0, 0.65)', 
                            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                            zIndex: 15,
                            boxShadow: 'inset 1px 0 3px rgba(0,0,0,0.8)',
                            pointerEvents: 'none'
                        }}
                    >
                        <div 
                            className="hp-fill" 
                            style={{
                                position: 'absolute', 
                                left: 0, 
                                bottom: 0, 
                                right: 0,
                                height: `${heightPct}%`, 
                                backgroundColor: '#2ecc71', 
                                backgroundImage: 'linear-gradient(to top, #27ae60, #2ecc71)',
                                transition: 'height 250ms cubic-bezier(0.1, 0.8, 0.1, 1)', 
                                boxShadow: 'inset -1px 0 2px rgba(255,255,255,0.2), 0 0 4px rgba(46, 204, 113, 0.6)'
                            }}
                        />
                    </div>
                );
            })()}

                     {/* Void / Space Background for edges of pocket dimension */}
                     { (props.inSuperboard && (props.isVoid || isVoidContains(currentContains) || currentContains === 'void' || (typeof currentContains === 'object' && currentContains?.type === 'void'))) && (
                         <div
                             className="void-space-tile-bg"
                             style={{
                                 position: 'absolute',
                                 top: 0,
                                 left: 0,
                                 right: 0,
                                 bottom: 0,
                                 backgroundColor: '#05030a',
                                 backgroundImage: images.dream_tower_background ? `url(${images.dream_tower_background})` : 'none',
                                 backgroundSize: '4500% 4500%',
                                 backgroundPosition: `${((props.globalX ?? props.coordinates?.[1] ?? 0) / 45) * 100}% ${((props.globalY ?? props.coordinates?.[0] ?? 0) / 45) * 100}%`,
                                 zIndex: 0,
                                 pointerEvents: 'none'
                             }}
                         />
                     )}

                     {/* Terrain background: chosen per-tile (terrain_1..terrain_16) and rendered beneath portrait/items */}
                     { props.terrain && (() => {
                         let terrainUrl = (props.terrain && props.terrain.includes('/')) ? props.terrain : (images[props.terrain] || null);
                         return <div className="terrain-bg" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: terrainUrl ? toCssUrl(terrainUrl) : 'none', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center', zIndex: 0, opacity: (color === 'black' && !props.inSuperboard) ? 0 : 0.5, transition: 'opacity 0.35s ease-in-out'}} />
                     })()}

                     {/* Territory Layer: renders clan-specific territory shading beneath items/monsters/buildings */}
                     { (props.territory || props.contains?.territory || currentContains?.territory || props.boardTiles?.[props.index]?.territory || props.boardTiles?.[props.id]?.territory) && (() => {
                         const rawClan = props.territory || props.contains?.territory || currentContains?.territory || props.boardTiles?.[props.index]?.territory || props.boardTiles?.[props.id]?.territory;
                         const clan = (typeof rawClan === 'object' ? rawClan.clan || rawClan.type || rawClan.affiliation : String(rawClan)).toLowerCase();
                         if (color === 'black' && !props.inSuperboard) return null;
                         let territoryBg = 'rgba(90, 60, 30, 0.22)';
                         let borderColor = 'rgba(125, 85, 45, 0.35)';
                         if (clan.includes('cave')) {
                             territoryBg = 'rgba(60, 70, 90, 0.20)';
                             borderColor = 'rgba(85, 95, 120, 0.35)';
                         } else if (clan.includes('woodland')) {
                             territoryBg = 'rgba(25, 75, 30, 0.22)';
                             borderColor = 'rgba(40, 110, 50, 0.35)';
                         } else if (clan.includes('shadow')) {
                             territoryBg = 'rgba(50, 10, 75, 0.22)';
                             borderColor = 'rgba(75, 20, 110, 0.35)';
                         } else if (clan.includes('paradox')) {
                             territoryBg = 'rgba(95, 20, 95, 0.20)';
                             borderColor = 'rgba(130, 35, 130, 0.35)';
                         } else if (clan.includes('mud')) {
                             territoryBg = 'rgba(90, 60, 30, 0.22)';
                             borderColor = 'rgba(125, 85, 45, 0.35)';
                         } else if (clan.includes('hostile') || clan.includes('enemy')) {
                             territoryBg = 'rgba(220, 38, 38, 0.28)';
                             borderColor = 'rgba(239, 68, 68, 0.6)';
                         } else if (clan.includes('player') || clan.includes('crew') || clan.includes('friendly')) {
                             territoryBg = 'rgba(30, 90, 160, 0.20)';
                             borderColor = 'transparent';
                         }
                         const isFriendly = clan.includes('player') || clan.includes('crew') || clan.includes('friendly');
                         const isNewlyClaimed = props.newlyClaimed || (props.contains && props.contains.newlyClaimed);
                         const claimDelayMs = (props.claimDelayMs ?? (props.contains && props.contains.claimDelayMs)) || 0;
                         return (
                             <div 
                                 className={`territory-bg ${isNewlyClaimed ? 'newly-claimed' : ''}`} 
                                 style={{
                                     position: 'absolute', 
                                     top: 0, left: 0, right: 0, bottom: 0, 
                                     backgroundColor: territoryBg, 
                                     boxShadow: isFriendly ? 'none' : `inset 0 0 5px ${borderColor}`, 
                                     border: isFriendly ? 'none' : `1px dashed ${borderColor}`, 
                                     zIndex: 1, 
                                     pointerEvents: 'none', 
                                     opacity: ((isBlackTile || isMainTileBlack || color === 'black' || currentTileColor === 'black') && !props.inSuperboard) ? 0 : 1, 
                                     transition: 'opacity 0.35s ease-in-out',
                                     animation: isNewlyClaimed ? `territoryFadeIn 1.5s ease-in-out ${claimDelayMs}ms forwards` : 'none'
                                 }} 
                             />
                         );
                      })()}

                      {/* Faint light source glow emanating from behind monster/pygmy portrait */}
                      {isMonsterOrPygmyTile && (!isBlackTile || props.inSuperboard) && props.type !== 'overlay-tile' && ((color !== 'black' && currentTileColor !== 'black') || props.inSuperboard) && (() => {
                          const isAlliedUnit = !!(
                              props.isAllied ||
                              (containsObj && (containsObj.isAllied || containsObj.faction === 'player' || containsObj.placedBy === 'player' || containsObj.isPlayerAllied || containsObj.affiliation === 'friendly')) ||
                              (currentContains && (currentContains.isAllied || currentContains.faction === 'player' || currentContains.placedBy === 'player' || currentContains.isPlayerAllied || currentContains.affiliation === 'friendly'))
                          );
                          const isNeutralUnit = !isAlliedUnit && !!(
                              (containsObj && (containsObj.faction === 'neutral' || containsObj.faction === 'wild' || containsObj.affiliation === 'neutral')) ||
                              (currentContains && (currentContains.faction === 'neutral' || currentContains.faction === 'wild' || currentContains.affiliation === 'neutral')) ||
                              (containsObj?.isPocketPygmy && !containsObj?.isHostile && containsObj?.faction !== 'hostile' && containsObj?.faction !== 'enemy')
                          );
                          const blueGradient = 'radial-gradient(circle at center, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.65) 38%, rgba(29, 78, 216, 0.3) 65%, transparent 88%)';
                          const whiteGradient = 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 0%, rgba(240, 240, 240, 0.5) 38%, rgba(200, 200, 200, 0.2) 65%, transparent 88%)';
                          const redGradient = isChargingAmbush
                              ? 'radial-gradient(circle at center, rgba(255, 0, 0, 1) 0%, rgba(245, 15, 15, 0.88) 38%, rgba(200, 10, 10, 0.55) 68%, transparent 95%)'
                              : (isNearbyMonster 
                                  ? 'radial-gradient(circle at center, rgba(255, 40, 40, 0.95) 0%, rgba(230, 25, 25, 0.70) 38%, rgba(180, 15, 15, 0.35) 65%, transparent 92%)'
                                  : 'radial-gradient(circle at center, rgba(240, 40, 40, 0.75) 0%, rgba(190, 25, 25, 0.48) 38%, rgba(130, 15, 15, 0.22) 65%, transparent 88%)');

                          const glowBackground = isAlliedUnit ? blueGradient : (isNeutralUnit ? whiteGradient : redGradient);
                          const glowBoxShadow = isAlliedUnit ? '0 0 12px rgba(59, 130, 246, 0.8)' : (isNeutralUnit ? '0 0 12px rgba(255, 255, 255, 0.8)' : undefined);
                          const glowClass = isAlliedUnit ? 'allied-glow' : (isNeutralUnit ? 'neutral-glow' : (isChargingAmbush ? 'charging-ambush-glow' : (isNearbyMonster ? 'nearby-glow' : '')));

                          return (
                              <div 
                                  className={`monster-portrait-glow ${glowClass}`}
                                  style={{
                                      position: 'absolute',
                                      top: isChargingAmbush ? '-25%' : '-15%',
                                      left: isChargingAmbush ? '-25%' : '-15%',
                                      right: isChargingAmbush ? '-25%' : '-15%',
                                      bottom: isChargingAmbush ? '-25%' : '-15%',
                                      borderRadius: '50%',
                                      background: glowBackground,
                                      boxShadow: glowBoxShadow,
                                      zIndex: 2,
                                      pointerEvents: 'none',
                                      opacity: (color === 'black' || props.type === 'overlay-tile' || props.isFadingOut) ? 0 : 1,
                                      transition: 'opacity 0.35s ease-in-out, background 0.2s ease-in-out, top 0.2s ease-in-out, left 0.2s ease-in-out',
                                      animation: isChargingAmbush
                                          ? 'pygmyChargePulse 0.35s ease-in-out infinite alternate'
                                          : (isNearbyMonster ? 'monsterGlowPulse 1.1s ease-in-out infinite alternate' : 'monsterGlowPulse 1.8s ease-in-out infinite alternate')
                                  }}
                              />
                          );
                      })()}

                      {/* Faint gold light source glow emanating from behind key items in the dungeon (disabled in palette/builder/inventory) */}
                      {isKeyTile && !isBlackTile && !isBuilderTile && props.type !== 'overlay-tile' && props.type !== 'inventory-tile' && props.type !== 'crew-tile' && props.type !== 'equip-slot' && !props.isInInventory && color !== 'black' && currentTileColor !== 'black' && (
                          <div 
                              className="key-portrait-glow"
                              style={{
                                  position: 'absolute',
                                  top: '-15%',
                                  left: '-15%',
                                  right: '-15%',
                                  bottom: '-15%',
                                  borderRadius: '50%',
                                  zIndex: 2,
                                  pointerEvents: 'none'
                              }}
                          />
                      )}


           {/* Layered Forest Density Falloff Overlay (for stamped forest) */}
           {isLayeredForestTile && color !== 'black' && !isDarkColor && (() => {
                const vSeed = props.variantSeed ?? containsObj?.variantSeed ?? currentContains?.variantSeed ?? 0;
                const aMask = props.autotileMask ?? containsObj?.autotileMask ?? currentContains?.autotileMask ?? 0;
                const sType = containsObj?.subtype || currentContains?.subtype || 'terrain_naked_trees';
                const layers = getTreeLayersForDensity(densityTier, vSeed, aMask, sType);

                return (
                    <div className="layered-forest-tile" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: portraitZIndex, pointerEvents: 'none' }}>
                        {layers.map(layer => (
                            <img
                                key={layer.id}
                                src={layer.src}
                                alt=""
                                style={layer.style}
                            />
                        ))}
                    </div>
                );
           })()}

           {/* Layered Mountain Density Falloff Overlay (for stamped mountains) */}
           {isLayeredMountainTile && color !== 'black' && !isDarkColor && (() => {
                const vSeed = props.variantSeed ?? containsObj?.variantSeed ?? currentContains?.variantSeed ?? 0;
                const aMask = props.autotileMask ?? containsObj?.autotileMask ?? currentContains?.autotileMask ?? 0;
                const sType = containsObj?.subtype || currentContains?.subtype || 'terrain_mountain_1';
                const layers = getMountainLayersForDensity(mountainDensityTier, vSeed, aMask, sType);

                return (
                    <div className="layered-mountain-tile" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: portraitZIndex, pointerEvents: 'none' }}>
                        {layers.map(layer => (
                            <img
                                key={layer.id}
                                src={layer.src}
                                alt=""
                                style={layer.style}
                            />
                        ))}
                    </div>
                );
           })()}

           {/* Portrait sits above the hp-fill and terrain so the image remains visible */}
           {!isLayeredForestTile && !isLayeredMountainTile && resolvedPortraitUrl && props.optionType !== 'delete' && props.optionType !== 'voidfill' && !(props.contains && (props.contains === 'shrine' || props.contains.type === 'shrine')) && !(props.data && props.data.type === 'soul_shard') && (() => {
                const isAvatarPortrait = !!(props.contains && (props.contains.type === 'avatar' || props.contains.type === 'camp'));
                const isFlippedLeft = isAvatarPortrait && (props.playerFacing === 'left' || props.playerFacingDirection === 'left');
                const flipTransform = isFlippedLeft ? 'scaleX(-1)' : '';
                
                const isObsPlatform = sKey.includes('observer') || sKey.includes('observation') || (containsObj && (containsObj.type === 'observer_platform' || containsObj.subtype === 'observer_platform' || containsObj.building === 'observer_platform'));
                const isClaimableBuilding = sKey.includes('windmill') || sKey.includes('farm') || sKey.includes('house') || sKey.includes('manor') || sKey.includes('estate');
                const rawTerritory = props.territory || props.territoryAffiliation || containsObj?.territory || containsObj?.territoryAffiliation || containsObj?.affiliation || props.affiliation || currentContains?.territory || currentContains?.territoryAffiliation || currentContains?.affiliation || (props.boardTiles && (props.boardTiles[props.index]?.territory || props.boardTiles[props.id]?.territory));
                const isEncompassedByFriendlyDomain = (isObsPlatform && (rawTerritory === 'player' || rawTerritory === 'friendly' || rawTerritory === 'crew')) ||
                    (isClaimableBuilding && (!!rawTerritory || !!containsObj?.affiliation || !!props.affiliation || !!currentContains?.affiliation));
                const obsScale = isEncompassedByFriendlyDomain ? 1.5 : 1.0;

                const baseTransform = isPaletteTile ? 'none' : (isUnderConstruction 
                    ? `scale(${1.5 * obsScale}) rotate(${rotationDeg}deg)` 
                    : (isEnlargeableStructure && isOccupied 
                        ? `scale(${2.0 * obsScale}) rotate(${rotationDeg}deg)` 
                        : (isEncompassedByFriendlyDomain 
                            ? `scale(1.5) ${rotationDeg ? `rotate(${rotationDeg}deg)` : ''}`.trim() 
                            : (rotationDeg ? `rotate(${rotationDeg}deg)` : 'none'))));
                const portraitTransform = flipTransform ? (baseTransform === 'none' ? flipTransform : `${flipTransform} ${baseTransform}`) : baseTransform;

                return (
                    <div className="portrait" style={{
                         position: 'absolute',
                         top: 0, left: 0, right: 0, bottom: 0,
                         backgroundImage: toCssUrl(resolvedPortraitUrl),
                         backgroundSize: isVendorCell ? (is3x3Structure ? '300% 300%' : '200% 200%') : ((isItemCell || isPaletteTile) ? 'contain' : '100% 100%'),
                         backgroundPosition: isVendorCell ? vendorBackgroundPosition : (isItemCell ? 'center' : 'inherit'),
                         backgroundRepeat: 'no-repeat',
                         zIndex: isVendorCell ? 40 : (isObsPlatform || isEncompassedByFriendlyDomain ? 12 : ((isEnlargeableStructure && isOccupied) || isUnderConstruction ? 4 : portraitZIndex)),
                         opacity: ((color === 'black' || isDarkColor) || props.isFadingOut) ? 0 : 1,
                         transform: portraitTransform,
                         transformOrigin: (isEnlargeableStructure && isOccupied) || isUnderConstruction || isObsPlatform ? 'bottom center' : 'center center',
                         transition: 'opacity 0.35s ease-in-out, transform 0.3s ease-in-out',
                         pointerEvents: 'none'
                    }} />
                );
            })()}

            {/* Soul Shard custom overlay */}
            { props.data && props.data.type === 'soul_shard' && (() => {
                const monsterType = props.data.monsterType || '';
                const mTypeLower = monsterType.toLowerCase();
                const portraitUrl = images[monsterType] || images[mTypeLower] || images[`${mTypeLower}_portrait`] || images[`${mTypeLower}_portrait2`] || null;
                const isComplete = props.data.count >= 3;
                return (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        opacity: color === 'black' ? 0 : 1,
                        transition: 'opacity 0.35s ease-in-out'
                    }}>
                        {/* Complete 3/3 Golden / Emerald Pulsing Glow Frame */}
                        {isComplete && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                boxShadow: 'inset 0 0 12px rgba(52, 211, 153, 0.85), 0 0 10px rgba(255, 215, 0, 0.9)',
                                border: '2px solid #ffd700',
                                borderRadius: '3px',
                                zIndex: 3,
                                pointerEvents: 'none',
                                animation: 'soulShardCompleteGlow 1.6s ease-in-out infinite alternate'
                            }} />
                        )}

                        {/* 50% opacity monster portrait underlay */}
                        {portraitUrl && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundImage: toCssUrl(portraitUrl),
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                opacity: isComplete ? 0.65 : 0.5,
                                zIndex: 1
                            }} />
                        )}

                        {/* Center gold radiance glow when stack complete */}
                        {isComplete && (
                            <div style={{
                                position: 'absolute',
                                top: '10%', left: '10%', right: '10%', bottom: '10%',
                                background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.6) 0%, rgba(52, 211, 153, 0.3) 50%, transparent 80%)',
                                zIndex: 1,
                                pointerEvents: 'none'
                            }} />
                        )}

                        {/* 100% opacity soul shards icon on top */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundImage: toCssUrl(images['sould_shards'] || props.data.icon),
                            backgroundSize: '80% 80%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            filter: isComplete ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.95))' : 'none',
                            zIndex: 2
                        }} />

                        {/* Top-left fraction label (e.g. 3/3) */}
                        <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: '3px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: isComplete ? '#34d399' : '#ffd700',
                            textShadow: isComplete ? '0px 0px 5px rgba(52, 211, 153, 0.9), 0px 1px 2px black' : '0px 1px 3px rgba(0,0,0,0.9), 0px 1px 1px black',
                            zIndex: 4,
                            pointerEvents: 'none'
                        }}>
                            {props.data.count}/3
                        </div>

                        {/* Top-right Checkmark Badge when 3/3 complete */}
                        {isComplete && (
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                right: '3px',
                                width: '13px',
                                height: '13px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                                backgroundImage: 'linear-gradient(135deg, #34d399, #059669)',
                                color: '#ffffff',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 6px rgba(16, 185, 129, 0.9)',
                                border: '1px solid #ffffff',
                                zIndex: 5,
                                pointerEvents: 'none'
                            }}>
                                ✓
                            </div>
                        )}
                    </div>
                );
            })()}

           {/* Dead overlay: visible when data.dead === true or hp <= 0 */}
           { (Boolean(props.data && props.data.dead) || (typeof props.hp === 'number' && props.hp <= 0) || (props.data && typeof props.data.hp === 'number' && props.data.hp <= 0)) && (
                <div className="dead-overlay" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10, borderRadius: '4px'}}>
                    <div 
                        className="death-skull" 
                        style={{
                            width: Math.max(24, Math.round((props.tileSize || 50) * 0.55)) + 'px',
                            height: Math.max(24, Math.round((props.tileSize || 50) * 0.55)) + 'px',
                            backgroundImage: `url(${images['whiteskull'] || images.whiteskull})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            filter: 'invert(1) drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))'
                        }}
                    />
                </div>
           )}

            {/* Pocket Pygmy / Unit Health Bar Overlay */}
            {(() => {
                const activeUnit = (currentTile && typeof currentTile.contains !== 'undefined')
                    ? (typeof currentTile.contains === 'object' ? currentTile.contains : null)
                    : (typeof props.contains === 'object' ? props.contains : null);

                if (!activeUnit || activeUnit.dead || activeUnit.destroyedAt) return null;
                if (typeof activeUnit.hp !== 'number' || activeUnit.hp <= 0) return null;
                if (!activeUnit.maxHp || activeUnit.maxHp <= 0 || activeUnit.hp >= activeUnit.maxHp) return null;

                const lastDmg = activeUnit.lastDamageTime;
                const isRecentlyDamaged = !!(lastDmg && (Date.now() - lastDmg < 3000));
                const shouldShow = hpBarVisible || isRecentlyDamaged;
                if (!shouldShow) return null;

                return (
                    <div className="pygmy-hp-bar" style={{
                        position: 'absolute',
                        bottom: '3px',
                        left: '10%',
                        right: '10%',
                        height: '5px',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        zIndex: 25,
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            width: `${Math.max(0, Math.min(100, (activeUnit.hp / activeUnit.maxHp) * 100))}%`,
                            height: '100%',
                            backgroundColor: (activeUnit.hp / activeUnit.maxHp) <= 0.2 ? '#e74c3c' : '#2ecc71',
                            transition: 'width 0.2s ease-in-out, background-color 0.2s'
                        }} />
                    </div>
                );
            })()}

            {/* Automaton Monolith Conversion Progress Bar Overlay */}
            {(() => {
                const activeUnit = (currentTileForContains && typeof currentTileForContains.contains !== 'undefined' && currentTileForContains.contains)
                    ? (typeof currentTileForContains.contains === 'object' ? currentTileForContains.contains : null)
                    : ((typeof props.contains === 'object' ? props.contains : null) || containsObj || containsObjForHp);

                if (!activeUnit || activeUnit.dead || activeUnit.destroyedAt) return null;
                const isAutomaton = activeUnit.isAutomaton || activeUnit.subtype === 'automaton';
                const converting = activeUnit.convertingMonolith || (props.contains && props.contains.convertingMonolith) || (currentTileForContains && currentTileForContains.contains && currentTileForContains.contains.convertingMonolith);
                if (!isAutomaton || !converting) return null;

                return <AutomatonConversionProgressBar converting={converting} />;
            })()}

           {/* Obscured space texture overlay */}
           { ((props.contains && props.contains.type === 'obscured_space') || props.optionType === 'obscured space') && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'repeating-linear-gradient(45deg, #2d2b30 0, #2d2b30 2px, transparent 2px, transparent 8px)',
                    zIndex: 1,
                    opacity: color === 'black' ? 0 : 0.7,
                    pointerEvents: 'none',
                    transition: 'opacity 0.35s ease-in-out'
                }} />
           )}

           {/* Interactive Building Illumination Glow Overlay */}
           { (props.illuminated || props.isIlluminated || (props.contains && props.contains.illuminated) || (props.data && props.data.illuminated)) && (!isVendorCell || getVendorCellRole() === 'anchor' || getVendorCellRole() === null) && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, 
                    width: (isVendorCell && getVendorCellRole() === 'anchor') ? (is3x3Structure ? '300%' : '200%') : '100%',
                    height: (isVendorCell && getVendorCellRole() === 'anchor') ? (is3x3Structure ? '300%' : '200%') : '100%',
                    boxShadow: 'inset 0 0 16px rgba(255, 215, 0, 0.95), 0 0 12px rgba(255, 215, 0, 0.9)',
                    border: '2px solid #ffd700',
                    borderRadius: '2px',
                    zIndex: 22,
                    pointerEvents: 'none',
                    boxSizing: 'border-box'
                }} />
           )}

           {/* Passage corridor double border overlay to clearly represent stone walls */}
           { props.optionType === 'passage' && props.type !== 'palette-tile' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    borderLeft: props.borders?.left && props.borders.left !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    borderRight: props.borders?.right && props.borders.right !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    borderTop: props.borders?.top && props.borders.top !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    borderBottom: props.borders?.bottom && props.borders.bottom !== '2px solid transparent' ? '4px double #bda88a' : 'none',
                    pointerEvents: 'none',
                    zIndex: 2,
                    boxSizing: 'border-box'
                }} />
           )}

           {/* Winding passage path for palette tile */}
           { props.optionType === 'passage' && props.type === 'palette-tile' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'black'
                }}>
                    <svg width='75%' height='75%' viewBox='0 0 34 34' xmlns='http://www.w3.org/2000/svg'>
                        {/* Row 0 */}
                        <rect x='0' y='0' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='7' y='0' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 1 */}
                        <rect x='14' y='7' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='21' y='7' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 2 */}
                        <rect x='28' y='14' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 3 */}
                        <rect x='14' y='21' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='21' y='21' width='6' height='6' fill='#7a8290' rx='1' />
                        {/* Row 4 */}
                        <rect x='7' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='14' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='21' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                        <rect x='28' y='28' width='6' height='6' fill='#7a8290' rx='1' />
                    </svg>
                </div>
           )}

           {/* Trap indicator (Keen Eye reveal) */}
           { ((props.trapVisionEnabled && props.trapRevealed) || props.debugMode) && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9, pointerEvents: 'none',
                    opacity: color === 'black' ? 0 : 1,
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <div className="trap-indicator-overlay" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1}} />
                </div>
           )}

           {/* Trap highlight overlay */}
           { color !== 'black' && props.hasTrap && ((props.trapVisionEnabled && props.trapRevealed) || props.debugMode) && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    border: '2px solid rgba(255, 0, 0, 0.5)',
                    boxSizing: 'border-box',
                    zIndex: 26, pointerEvents: 'none',
                    transition: 'opacity 0.35s ease-in-out'
                }} />
           )}

            {/* Delete option custom white X overlay */}
            { props.optionType === 'delete' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <svg width='60%' height='60%' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                        <line x1='4' y1='4' x2='20' y2='20' stroke='white' strokeWidth='1.5' strokeLinecap='round'/>
                        <line x1='20' y1='4' x2='4' y2='20' stroke='white' strokeWidth='1.5' strokeLinecap='round'/>
                    </svg>
                </div>
            )}

            {/* Voidfill option custom grid pattern SVG overlay */}
            { props.optionType === 'voidfill' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <svg width='100%' height='100%' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'>
                        {/* Vertical lines */}
                        <line x1='10' y1='0' x2='10' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='20' y1='0' x2='20' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='30' y1='0' x2='30' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='40' y1='0' x2='40' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='50' y1='0' x2='50' y2='60' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        
                        {/* Horizontal lines */}
                        <line x1='0' y1='10' x2='60' y2='10' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='20' x2='60' y2='20' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='30' x2='60' y2='30' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='40' x2='60' y2='40' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                        <line x1='0' y1='50' x2='60' y2='50' stroke='#bda88a' strokeWidth='1.2' opacity='0.7' />
                    </svg>
                </div>
            )}

           {/* Inscription marker: 3 diagonal lines drawn on wall tiles */}
           { ((props.contains && props.contains.type === 'inscription') || props.optionType === 'inscription') && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: color === 'black' ? 0 : 1,
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    <svg width='70%' height='70%' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'>
                        <line x1='4' y1='28' x2='12' y2='2' stroke='#d4a844' strokeWidth='3' strokeLinecap='round'/>
                        <line x1='11' y1='28' x2='19' y2='2' stroke='#d4a844' strokeWidth='3' strokeLinecap='round'/>
                        <line x1='18' y1='28' x2='26' y2='2' stroke='#d4a844' strokeWidth='3' strokeLinecap='round'/>
                        <line x1='0' y1='16' x2='30' y2='14' stroke='#d4a844' strokeWidth='1.5' strokeLinecap='round' opacity='0.7'/>
                    </svg>
                </div>
           )}

            {/* Shrine marker */}
            { ((props.contains && props.contains.type === 'shrine') || props.optionType === 'shrine' || props.isShrine) && (
                 <div style={{
                     position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                     zIndex: 10, pointerEvents: 'none',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                     opacity: color === 'black' ? 0 : 1,
                     transition: 'opacity 0.35s ease-in-out'
                 }}>
                     <div style={{
                         width: '70%',
                         height: '70%',
                         backgroundImage: `url(${images.shrine})`,
                         backgroundSize: 'contain',
                         backgroundRepeat: 'no-repeat',
                         backgroundPosition: 'center'
                     }} />
                     <span style={{
                         fontSize: Math.max(5, (props.tileSize || 30) * 0.2) + 'px',
                         color: '#ffd700', fontWeight: 'bold',
                         textTransform: 'uppercase', lineHeight: 1.2,
                         textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                     }}>{(props.contains && props.contains.subtype ? props.contains.subtype.slice(0,3) : '')}</span>
                 </div>
            )}

            {/* Tablet marker */}
            { ((props.contains && (props.contains.type === 'tablet' || props.contains.type === 'lore_tablet')) || props.optionType === 'tablet' || props.optionType === 'lore_tablet' || props.isTablet || props.isLoreTablet) && (
                 <div style={{
                     position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                     zIndex: 10, pointerEvents: 'none',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                     opacity: color === 'black' ? 0 : 1,
                     transition: 'opacity 0.35s ease-in-out'
                 }}>
                     <div style={{
                         width: '70%',
                         height: '70%',
                         backgroundImage: `url(${images.tablet || images.lore_tablet})`,
                         backgroundSize: 'contain',
                         backgroundRepeat: 'no-repeat',
                         backgroundPosition: 'center'
                     }} />
                 </div>
            )}

             {/* Connecting Path overlay */}
             { ((props.contains && props.contains.type === 'connecting_path') || props.optionType === 'connecting path') && (() => {
                   const isConnected = !!props.connectedEdge;
                   let edge = null;

                   const currentIdx = (typeof props.index === 'number') ? props.index : props.id;
                   if (currentIdx !== undefined && currentIdx !== null) {
                       const x = currentIdx % 15;
                       const y = Math.floor(currentIdx / 15);

                       // Match Dungeon Builder (DungeonView / PlaneView) exact priority:
                       // x === 0 (West edge) -> left (Horizontal)
                       // x === 14 (East edge) -> right (Horizontal)
                       // y === 0 (North edge) -> top (Vertical)
                       // y === 14 (South edge) -> bottom (Vertical)
                       if (x === 0) edge = 'left';
                       else if (x === 14) edge = 'right';
                       else if (y === 0) edge = 'top';
                       else if (y === 14) edge = 'bottom';
                       else {
                           const boardTiles = props.boardTiles;
                           let hasLeftRightNeighbor = false;
                           let hasTopBottomNeighbor = false;
                           if (Array.isArray(boardTiles)) {
                               if (x > 0 && boardTiles[currentIdx - 1] && boardTiles[currentIdx - 1].color !== 'black') hasLeftRightNeighbor = true;
                               if (x < 14 && boardTiles[currentIdx + 1] && boardTiles[currentIdx + 1].color !== 'black') hasLeftRightNeighbor = true;
                               if (y > 0 && boardTiles[currentIdx - 15] && boardTiles[currentIdx - 15].color !== 'black') hasTopBottomNeighbor = true;
                               if (y < 14 && boardTiles[currentIdx + 15] && boardTiles[currentIdx + 15].color !== 'black') hasTopBottomNeighbor = true;
                           }
                           if (hasLeftRightNeighbor) edge = 'right';
                           else if (hasTopBottomNeighbor) edge = 'bottom';
                       }
                   }

                   if (!edge) {
                       edge = props.connectedEdge || (props.contains && typeof props.contains === 'object' ? (props.contains.edge || props.contains.direction) : null);
                       if (edge === 'E' || edge === 'east') edge = 'right';
                       if (edge === 'W' || edge === 'west') edge = 'left';
                       if (edge === 'N' || edge === 'north') edge = 'top';
                       if (edge === 'S' || edge === 'south') edge = 'bottom';
                   }
                   const overlayStyle = {
                       position: 'absolute',
                       top: edge === 'top' ? -3 : 0,
                       left: edge === 'left' ? -3 : 0,
                       right: edge === 'right' ? -3 : 0,
                       bottom: edge === 'bottom' ? -3 : 0,
                       backgroundColor: isConnected ? 'rgba(212, 168, 68, 0.45)' : 'rgba(180, 130, 20, 0.22)',
                       border: isConnected ? '2px solid rgba(212, 168, 68, 0.95)' : '2px dashed rgba(180, 130, 20, 0.65)',
                       boxShadow: isConnected ? '0 0 10px rgba(212, 168, 68, 0.65), inset 0 0 6px rgba(255, 255, 255, 0.35)' : 'none',
                       borderRadius: isConnected ? '3px' : '0px',
                       zIndex: 10,
                       pointerEvents: 'none',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       opacity: color === 'black' ? 0 : 1,
                       transition: 'all 0.25s ease-in-out',
                       transform: isOccupied ? 'scale(1.35)' : 'scale(1)',
                       filter: isOccupied ? 'brightness(1.3)' : 'none',
                       transformOrigin: 'center center'
                   };
                   if (edge === 'top') {
                       overlayStyle.borderTop = 'none';
                   } else if (edge === 'bottom') {
                       overlayStyle.borderBottom = 'none';
                   } else if (edge === 'left') {
                      overlayStyle.borderLeft = 'none';
                   } else if (edge === 'right') {
                       overlayStyle.borderRight = 'none';
                   }
                   let isHorizontal = edge === 'left' || edge === 'right';
                   if (props.contains && typeof props.contains === 'object' && props.contains.orientation) {
                       if (props.contains.orientation === 'horizontal') isHorizontal = true;
                       if (props.contains.orientation === 'vertical') isHorizontal = false;
                   }
                 return (
                      <div style={overlayStyle}>
                          {/* Passage with golden connection background SVG */}
                          {isHorizontal ? (
                              <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                                  {/* Slate background representing the passage floor */}
                                  <rect x="0" y="4" width="24" height="16" fill="#2c3036" opacity="0.8" />
                                  
                                  {/* Stone walls of the passage (top and bottom) */}
                                  <line x1="0" y1="4" x2="24" y2="4" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="0" y1="6" x2="24" y2="6" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  <line x1="0" y1="20" x2="24" y2="20" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="0" y1="18" x2="24" y2="18" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  {/* Golden Connection line in the center */}
                                  <line x1="0" y1="12" x2="24" y2="12" stroke="#ffd700" strokeWidth="4.5" opacity="0.3" />
                                  <line x1="0" y1="12" x2="24" y2="12" stroke="#ffd700" strokeWidth="2" />
                              </svg>
                          ) : (
                              <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                                  {/* Slate background representing the passage floor */}
                                  <rect x="4" y="0" width="16" height="24" fill="#2c3036" opacity="0.8" />
                                  
                                  {/* Stone walls of the passage (left and right) */}
                                  <line x1="4" y1="0" x2="4" y2="24" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="6" y1="0" x2="6" y2="24" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  <line x1="20" y1="0" x2="20" y2="24" stroke="#bda88a" strokeWidth="1.5" />
                                  <line x1="18" y1="0" x2="18" y2="24" stroke="#bda88a" strokeWidth="0.75" />
                                  
                                  {/* Golden Connection line in the center */}
                                  <line x1="12" y1="0" x2="12" y2="24" stroke="#ffd700" strokeWidth="4.5" opacity="0.3" />
                                  <line x1="12" y1="0" x2="12" y2="24" stroke="#ffd700" strokeWidth="2" />
                              </svg>
                          )}

                          {/* Gleaming/shimmering overlay animation if connected or occupied */}
                          {(isConnected || isOccupied) && (
                              <div className={`connecting-path-shimmer ${isHorizontal ? 'horizontal' : 'vertical'}`} />
                          )}

                          {/* Red Map Edge Boundary Indicator when player is on the tile */}
                          {props.isPlayerOnTile && (edge === 'top' || edge === 'bottom' || edge === 'left' || edge === 'right') && (
                              <div style={{
                                  position: 'absolute',
                                  top: edge === 'top' ? 0 : 'auto',
                                  bottom: edge === 'bottom' ? 0 : 'auto',
                                  left: edge === 'left' ? 0 : 'auto',
                                  right: edge === 'right' ? 0 : 'auto',
                                  width: (edge === 'left' || edge === 'right') ? '6px' : '100%',
                                  height: (edge === 'top' || edge === 'bottom') ? '6px' : '100%',
                                  backgroundColor: 'rgba(255, 0, 0, 0.8)',
                                  boxShadow: '0 0 12px red',
                                  zIndex: 40
                              }} />
                          )}
                      </div>
                 );
            })()}

           {/* Inscription edge markers — thick glowing golden bars on inscribed walls */}
           { props.inscriptions && (
                <div style={{
                    opacity: (color === 'black' || color === '#000000' || color === '#000' || isBlackTile || isMainTileBlack) ? 0 : 1,
                    transition: 'opacity 0.35s ease-in-out'
                }}>
                    { props.inscriptions.top && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
                            background: 'linear-gradient(90deg, #b48a28, #f5d061 30%, #fef08a 50%, #f5d061 70%, #b48a28)',
                            boxShadow: '0 0 8px rgba(245, 208, 97, 0.9), 0 0 2px #d4a844',
                            zIndex: 50, pointerEvents: 'none'
                        }} title={'✍ ' + props.inscriptions.top} />
                    )}
                    { props.inscriptions.bottom && (
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '5px',
                            background: 'linear-gradient(90deg, #b48a28, #f5d061 30%, #fef08a 50%, #f5d061 70%, #b48a28)',
                            boxShadow: '0 0 8px rgba(245, 208, 97, 0.9), 0 0 2px #d4a844',
                            zIndex: 50, pointerEvents: 'none'
                        }} title={'✍ ' + props.inscriptions.bottom} />
                    )}
                    { props.inscriptions.left && (
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px',
                            background: 'linear-gradient(180deg, #b48a28, #f5d061 30%, #fef08a 50%, #f5d061 70%, #b48a28)',
                            boxShadow: '0 0 8px rgba(245, 208, 97, 0.9), 0 0 2px #d4a844',
                            zIndex: 50, pointerEvents: 'none'
                        }} title={'✍ ' + props.inscriptions.left} />
                    )}
                    { props.inscriptions.right && (
                        <div style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px',
                            background: 'linear-gradient(180deg, #b48a28, #f5d061 30%, #fef08a 50%, #f5d061 70%, #b48a28)',
                            boxShadow: '0 0 8px rgba(245, 208, 97, 0.9), 0 0 2px #d4a844',
                            zIndex: 50, pointerEvents: 'none'
                        }} title={'✍ ' + props.inscriptions.right} />
                    )}
                </div>
           )}

             {/* Narrative Tile marker / Enemy Spawn Point / Spirit Sight faint icon overlay */}
             { (isNarrative || isEnemySpawnTile) && (
                  <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      zIndex: 3, pointerEvents: 'none',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      opacity: isRevealedBySpiritSight ? 0.45 : (color === 'black' ? 0 : 1),
                      transition: 'opacity 0.08s ease-in-out'
                  }}>
                      <div style={{
                          width: '65%',
                          height: '65%',
                          backgroundImage: toCssUrl(images[props.imageOverride] || (isEnemySpawnTile ? images.narrative : (images[props.image] || (props.contains && ((props.contains.type === 'avatar' || props.contains.type === 'camp') && props.playerImgKey ? (images[props.playerImgKey] || props.playerImgKey) : images[props.contains.type])) || images.narrative))),
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          filter: isRevealedBySpiritSight ? 'drop-shadow(0 0 5px rgba(0, 243, 255, 0.9))' : undefined
                      }} />
                  </div>
             )}

           { (props.partialObscured || isRevealedBySpiritSight) && !isIlluminatedGlow && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: isRevealedBySpiritSight ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.5)',
                    zIndex: 25,
                    pointerEvents: 'none',
                    opacity: color === 'black' ? 0 : 1,
                    transition: 'opacity 0.08s ease-in-out'
                }} />
           )}

           {/* Fog of war / void edge shading — Active when Debug Mode is ON */}
           { fogEdgeBoxShadow !== 'none' && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    boxShadow: fogEdgeBoxShadow,
                    zIndex: 26,
                    pointerEvents: 'none'
                }} />
           )}

           {props.showCoordinates && (() => {
                const displayCoords = getDisplayCoords(props.coordinates);
                const tileIndex = (typeof props.id === 'number') ? props.id : (typeof props.index === 'number' ? props.index : null);
                const xVal = displayCoords ? displayCoords[0] : (tileIndex !== null ? tileIndex % 15 : '?');
                const yVal = displayCoords ? displayCoords[1] : (tileIndex !== null ? Math.floor(tileIndex / 15) : '?');
                return (
                    <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        color: '#ffd700',
                        fontSize: Math.max(9, (props.tileSize || 30) * 0.22) + 'px',
                        fontWeight: 'bold',
                        userSelect: 'none',
                        zIndex: 35,
                        pointerEvents: 'none',
                        lineHeight: 1,
                        textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 1px 1px black',
                        fontFamily: 'monospace, sans-serif'
                    }}>
                        {xVal},{yVal}
                    </div>
                );
           })()}

           {showDelayedHoverLabel && props.delayedHoverLabel && (
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '4px',
                    transform: 'translateX(-50%)',
                    maxWidth: '92%',
                    padding: '2px 5px',
                    backgroundColor: 'rgba(0, 0, 0, 0.82)',
                    color: 'white',
                    fontSize: Math.max(9, props.tileSize * 0.18) + 'px',
                    lineHeight: 1.15,
                    borderRadius: '3px',
                    textAlign: 'center',
                    zIndex: 20,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                }}>
                    {props.delayedHoverLabel}
                </div>
           )}

            {/* Active Unlock spell indicator for crew-tile */}
            {props.type === 'crew-tile' && props.data && props.data.unlockSpellActive && (
                <div className="unlock-active-indicator" style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '24px',
                    height: '24px',
                    backgroundImage: toCssUrl(images.master_key),
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    zIndex: 35,
                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))',
                    pointerEvents: 'none'
                }} title="Unlock spell active" />
            )}

            {/* Generator Ownership Indicators */}
            {(props.ownedByPlayer || props.boardTiles?.[props.index]?.ownedByPlayer || props.boardTiles?.[props.id]?.ownedByPlayer) && (
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    width: '18px',
                    height: '18px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.9) 0%, rgba(29, 78, 216, 0.9) 100%)',
                    border: '1px solid #60a5fa',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
                    zIndex: 40,
                    pointerEvents: 'none'
                }}>
                    <span style={{ fontSize: '12px' }}>👑</span>
                </div>
            )}
            
            {(props.ownedByEnemy || props.boardTiles?.[props.index]?.ownedByEnemy || props.boardTiles?.[props.id]?.ownedByEnemy) && (
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    width: '18px',
                    height: '18px',
                    background: 'radial-gradient(circle, rgba(220, 38, 38, 0.9) 0%, rgba(153, 27, 27, 0.9) 100%)',
                    border: '1px solid #f87171',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)',
                    zIndex: 40,
                    pointerEvents: 'none'
                }}>
                    <span style={{ fontSize: '12px' }}>⚔️</span>
                </div>
            )}

            {/* Automaton Badge Overlay */}
            {(!props.inSuperboard && (isStructureTile || props.generatorData) && (props.isAutomated || props.contains?.automated || props.contains?.generatorData?.automated || props.data?.automated || props.data?.generatorData?.automated)) && (
                <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.9) 0%, rgba(14, 116, 144, 0.9) 100%)',
                    border: '1px solid #67e8f9',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(6, 182, 212, 0.8)',
                    zIndex: 40,
                    pointerEvents: 'none'
                }} title="Automated Generator">
                    <span style={{ fontSize: '11px' }}>🤖</span>
                </div>
            )}

            {/* Destroyed Badge Overlay */}
            {(props.contains?.hp !== undefined && props.contains?.hp <= 0 && props.contains?.destroyedAt && (!props.contains.vendorCell || props.contains.vendorCell === 'anchor')) && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    color: '#ef4444',
                    fontWeight: 'bold',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    zIndex: 50,
                    pointerEvents: 'none',
                    boxShadow: '0 0 5px rgba(239, 68, 68, 0.8)'
                }}>
                    Destroyed
                </div>
            )}

            {/* Earthen Fort level badge (levels >= 1 show a number in the top right of the icon) */}
            {(() => {
                const bSubtype = containsSubtype || (containsObj && containsObj.subtype);
                const isFort = bSubtype === 'earthen_fort' || props.building === 'earthen_fort' || props.image === 'earthen_fort' || props.image === 'buildable_earthen_fort';
                const lvl = (containsObj && containsObj.level) || (props.contains && props.contains.level) || (currentContains && currentContains.level) || props.level || 1;
                if (isFort && typeof lvl === 'number' && lvl >= 1) {
                    return (
                        <div style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: '#1c1917',
                            color: '#ffd700',
                            border: '1px solid rgba(212, 168, 68, 0.8)',
                            borderRadius: '50%',
                            width: Math.max(14, Math.round((props.tileSize || 30) * 0.4)) + 'px',
                            height: Math.max(14, Math.round((props.tileSize || 30) * 0.4)) + 'px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: Math.max(9, Math.round((props.tileSize || 30) * 0.3)) + 'px',
                            fontWeight: 'bold',
                            fontFamily: 'Outfit, sans-serif',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.9)',
                            zIndex: 35,
                            pointerEvents: 'none'
                        }}>
                            {lvl}
                        </div>
                    );
                }
                return null;
            })()}

            {/* Earthen Fort Pygmy Spawn Food Deduction Particle */}
            {(() => {
                const spawnTime = containsObj?.lastPygmySpawnTime || props.lastPygmySpawnTime || (currentTileForContains?.contains && currentTileForContains.contains.lastPygmySpawnTime);
                const foodCost = containsObj?.lastPygmyFoodCost || props.lastPygmyFoodCost || (currentTileForContains?.contains && currentTileForContains.contains.lastPygmyFoodCost);
                if (!spawnTime) return null;
                return <EarthenFortSpawnParticleBadge lastPygmySpawnTime={spawnTime} foodCost={foodCost} />;
            })()}
        </div>
    )
}

export function propsAreEqual(prevProps, nextProps) {
    if (prevProps === nextProps) return true;

    const keysToCompare = [
        'id', 'index', 'type', 'color', 'tileSize', 'hovered', 'selected',
        'isPreview', 'passThrough', 'backgroundColor', 'terrain', 'territory', 'territoryAffiliation',
        'isShrine', 'isLoreTablet', 'trapRevealed', 'trapVisionEnabled', 'hasTrap', 'connectedEdge',
        'partialObscured', 'showCoordinates', 'image', 'imageOverride',
        'optionType', 'data', 'hpVal', 'maxHpVal', 'hpBarWidth', 'level',
        'isPlayerOnTile', 'className', 'illuminated', 'sabotageProgress', 'monolithActivationProgress',
        'isDisabledOutpost', 'disabledUntil', 'inscriptions', 'debugMode',
        'isPlayerTile', 'hasLivingSummoner', 'playerImgKey', 'playerFacing', 'cursor', 'isFadingOut',
        'ownedByPlayer', 'ownedByEnemy', 'isBumpingAttack', 'bumpVector', 'isGliding', 'glideVector', 'hoveredTileFootprint', 'isAutomated', 'isPaletteTile'
    ];

    for (let key of keysToCompare) {
        if (prevProps[key] !== nextProps[key]) return false;
    }

    const isContainsEqual = (a, b) => {
        if (a === b) return true;
        if (!a || !b) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;
        
        // Fast shallow compare for contains object instead of JSON.stringify
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        
        for (let i = 0; i < keysA.length; i++) {
            const k = keysA[i];
            if (a[k] !== b[k]) return false;
        }
        return true;
    };

    const prevContains = prevProps.contains;
    const nextContains = nextProps.contains;
    if (typeof prevContains !== typeof nextContains) return false;
    if (typeof prevContains === 'object' && prevContains !== null) {
        if (!isContainsEqual(prevContains, nextContains)) return false;
    } else if (prevContains !== nextContains) {
        return false;
    }

    const prevBorders = prevProps.borders;
    const nextBorders = nextProps.borders;
    if (typeof prevBorders !== typeof nextBorders) return false;
    if (typeof prevBorders === 'object' && prevBorders !== null) {
        if (prevBorders.top !== nextBorders?.top || prevBorders.bottom !== nextBorders?.bottom ||
            prevBorders.left !== nextBorders?.left || prevBorders.right !== nextBorders?.right) return false;
    }

    const prevCoords = prevProps.coordinates;
    const nextCoords = nextProps.coordinates;
    if (Array.isArray(prevCoords) && Array.isArray(nextCoords)) {
        if (prevCoords[0] !== nextCoords[0] || prevCoords[1] !== nextCoords[1]) return false;
    } else if (prevCoords !== nextCoords) {
        return false;
    }

    if (prevProps.boardTiles || nextProps.boardTiles) {
        const prevBoard = prevProps.boardTiles || [];
        const nextBoard = nextProps.boardTiles || [];
        if (prevBoard !== nextBoard) {
            const tileId = (typeof prevProps.id === 'number') ? prevProps.id : ((typeof prevProps.index === 'number') ? prevProps.index : null);
            if (tileId !== null) {
                const x = tileId % 15;
                const y = Math.floor(tileId / 15);
                const neighborIndices = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < 15 && nx >= 0 && nx < 15) {
                            neighborIndices.push(ny * 15 + nx);
                        }
                    }
                }

                for (let idx of neighborIndices) {
                    const prevN = prevBoard[idx];
                    const nextN = nextBoard[idx];
                    if (!prevN && !nextN) continue;
                    if (!prevN || !nextN) return false;
                    if (prevN.color !== nextN.color) return false;
                    if (prevN.territory !== nextN.territory || prevN.territoryAffiliation !== nextN.territoryAffiliation) return false;
                    if (!isContainsEqual(prevN.contains, nextN.contains)) return false;
                }
            }
        }
    }

    return true;
}

Tile.compare = propsAreEqual;

export default React.memo(Tile, propsAreEqual);