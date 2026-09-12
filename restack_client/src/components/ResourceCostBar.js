import React from 'react';
import * as images from '../utils/images';

/**
 * ResourceCostBar
 * Renders a horizontal resource bar indicating:
 * - Current resource vs Max scale (100, 500, 1000, etc., Resolve max = 100)
 * - Thicker, brighter glowing border when current amount > 100
 * - Off-color deduction segment representing the cost deduction from current total
 */
export const ResourceCostBar = ({
    resourceKey,
    resourceName,
    currentAmount = 0,
    costAmount = 0,
    icon
}) => {
    const key = (resourceKey || '').toLowerCase();
    const isResolve = key === 'resolve';
    const current = Math.max(0, Number(currentAmount) || 0);
    const cost = Math.max(0, Number(costAmount) || 0);

    // Max scale calculation:
    // Resolve is strictly maxed out at 100.
    // Standard resources start at max 100. If current > 100, scale goes to 500, then 1000, etc.
    let maxScale = 100;
    if (!isResolve) {
        if (current > 1000) {
            maxScale = Math.ceil(current / 500) * 500;
        } else if (current > 500) {
            maxScale = 1000;
        } else if (current > 100) {
            maxScale = 500;
        }
    }

    const isOver100 = !isResolve && current > 100;

    // Width percentages relative to maxScale
    const currentPct = Math.min(100, Math.max(0, (current / maxScale) * 100));
    const canAfford = current >= cost;

    let remainingPct = 0;
    let deductionPct = 0;

    if (canAfford) {
        const remaining = current - cost;
        remainingPct = Math.min(100, Math.max(0, (remaining / maxScale) * 100));
        deductionPct = Math.min(100 - remainingPct, Math.max(0, (cost / maxScale) * 100));
    } else {
        // Insufficient funds: current fill represents deficit
        currentPct > 0 ? (remainingPct = 0) : (remainingPct = 0);
        deductionPct = currentPct;
    }

    // Resource color themes
    const colorThemes = {
        resolve: {
            fill: 'linear-gradient(90deg, #ca8a04, #eab308)',
            deduct: 'linear-gradient(90deg, #ea580c, #ef4444)',
            glow: 'rgba(234, 179, 8, 0.7)',
            text: '#fde047'
        },
        ore: {
            fill: 'linear-gradient(90deg, #0284c7, #38bdf8)',
            deduct: 'linear-gradient(90deg, #f97316, #ef4444)',
            glow: 'rgba(56, 189, 248, 0.7)',
            text: '#7dd3fc'
        },
        stone: {
            fill: 'linear-gradient(90deg, #0284c7, #38bdf8)',
            deduct: 'linear-gradient(90deg, #f97316, #ef4444)',
            glow: 'rgba(56, 189, 248, 0.7)',
            text: '#7dd3fc'
        },
        wood: {
            fill: 'linear-gradient(90deg, #15803d, #22c55e)',
            deduct: 'linear-gradient(90deg, #f97316, #ef4444)',
            glow: 'rgba(34, 197, 94, 0.7)',
            text: '#86efac'
        },
        slate: {
            fill: 'linear-gradient(90deg, #6b21a8, #a855f7)',
            deduct: 'linear-gradient(90deg, #f97316, #ef4444)',
            glow: 'rgba(168, 85, 247, 0.7)',
            text: '#c084fc'
        },
        dust: {
            fill: 'linear-gradient(90deg, #0d9488, #14b8a6)',
            deduct: 'linear-gradient(90deg, #f97316, #ef4444)',
            glow: 'rgba(20, 184, 166, 0.7)',
            text: '#5eead4'
        },
        food: {
            fill: 'linear-gradient(90deg, #b91c1c, #f87171)',
            deduct: 'linear-gradient(90deg, #ea580c, #ef4444)',
            glow: 'rgba(248, 113, 113, 0.7)',
            text: '#fca5a5'
        }
    };

    const theme = colorThemes[key] || colorThemes.ore;
    const name = resourceName || (key === 'resolve' ? 'Resolve' : (key.charAt(0).toUpperCase() + key.slice(1)));

    // Icon helper
    const iconElement = (() => {
        if (typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:'))) {
            return <img src={icon} alt={name} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
        }
        if (icon) {
            return <span style={{ fontSize: '14px', lineHeight: 1 }}>{icon}</span>;
        }
        if (key === 'resolve') return <span style={{ fontSize: '14px' }}>⚡</span>;
        if (key === 'wood') return <img src={images.wood} alt="Wood" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
        if (key === 'slate') return <img src={images.slate} alt="Slate" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
        if (key === 'dust') return <img src={images.spectral_dust} alt="Dust" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
        return <img src={images.stone} alt={name} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
    })();

    return (
        <div style={{ width: '100%', marginBottom: '10px', boxSizing: 'border-box' }}>
            {/* Top Label Row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                fontFamily: "'Cinzel', 'Inter', serif",
                marginBottom: '4px',
                color: '#f0ede5'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                    {iconElement}
                    <span>{name}</span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '600' }}>
                    <span style={{ color: canAfford ? theme.text : '#f87171' }}>{current}</span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)', margin: '0 2px' }}>/</span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{maxScale}</span>
                    {cost > 0 && (
                        <span style={{
                            marginLeft: '6px',
                            color: canAfford ? '#fbbf24' : '#ef4444',
                            fontWeight: '700'
                        }}>
                            (-{cost})
                        </span>
                    )}
                </div>
            </div>

            {/* Horizontal Bar Track Container */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: isOver100 ? '14px' : '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    borderRadius: '6px',
                    border: isOver100
                        ? `2px solid ${theme.glow}`
                        : '1px solid rgba(229, 181, 79, 0.3)',
                    boxShadow: isOver100
                        ? `0 0 12px ${theme.glow}, inset 0 0 8px rgba(0, 0, 0, 0.8)`
                        : 'inset 0 1px 3px rgba(0, 0, 0, 0.8)',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease'
                }}
            >
                {/* Remaining fill (after cost deduction) */}
                {canAfford && remainingPct > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${remainingPct}%`,
                            background: theme.fill,
                            borderRadius: remainingPct >= 99 ? '4px' : '4px 0 0 4px',
                            boxShadow: `0 0 8px ${theme.glow}`,
                            transition: 'width 0.35s ease-in-out'
                        }}
                    />
                )}

                {/* Off-color deduction fill segment (portion to be deducted by cost) */}
                {canAfford && deductionPct > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            left: `${remainingPct}%`,
                            top: 0,
                            bottom: 0,
                            width: `${deductionPct}%`,
                            background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.95) 0%, rgba(239, 68, 68, 0.75) 100%)',
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.9), rgba(239,68,68,0.9) 6px, rgba(248,113,113,0.7) 6px, rgba(248,113,113,0.7) 12px)',
                            borderRadius: (remainingPct + deductionPct >= 99) ? '4px' : '0 4px 4px 0',
                            boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                            transition: 'left 0.35s ease-in-out, width 0.35s ease-in-out',
                            animation: 'resourceDeductionPulse 1.8s ease-in-out infinite alternate'
                        }}
                    />
                )}

                {/* Insufficient Funds Warning Fill */}
                {!canAfford && currentPct > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${currentPct}%`,
                            background: 'linear-gradient(90deg, #dc2626, #f87171)',
                            borderRadius: '4px',
                            boxShadow: '0 0 8px rgba(239, 68, 68, 0.9)'
                        }}
                    />
                )}
            </div>
        </div>
    );
};

/**
 * ResourceCostBarList
 * Helper to render a stacked list of ResourceCostBar components for a set of costs & available amounts
 */
export const ResourceCostBarList = ({ costs = {}, available = {}, inSuperboard = false }) => {
    if (!costs) return null;

    const list = [];
    const oreName = inSuperboard ? 'Ore' : 'Stone';

    if (costs.resolve !== undefined && costs.resolve > 0) {
        list.push({
            key: 'resolve',
            name: 'Resolve',
            cost: costs.resolve,
            current: available.resolve !== undefined ? available.resolve : 100
        });
    }

    if (costs.wood !== undefined && costs.wood > 0) {
        list.push({
            key: 'wood',
            name: 'Wood',
            cost: costs.wood,
            current: available.wood || 0
        });
    }

    const oreCost = costs.ore !== undefined ? costs.ore : (costs.stone || 0);
    if (oreCost > 0) {
        const availableOre = available.ore !== undefined ? available.ore : (available.stone || 0);
        list.push({
            key: inSuperboard ? 'ore' : 'stone',
            name: oreName,
            cost: oreCost,
            current: availableOre
        });
    }

    if (costs.slate !== undefined && costs.slate > 0) {
        list.push({
            key: 'slate',
            name: 'Slate',
            cost: costs.slate,
            current: available.slate || 0
        });
    }

    if (costs.dust !== undefined && costs.dust > 0) {
        list.push({
            key: 'dust',
            name: 'Shimmering Dust',
            cost: costs.dust,
            current: available.dust || 0
        });
    }

    if (costs.food !== undefined && costs.food > 0) {
        list.push({
            key: 'food',
            name: 'Food',
            cost: costs.food,
            current: available.food || 0
        });
    }

    if (list.length === 0) return null;

    return (
        <div style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(229, 181, 79, 0.25)',
            borderRadius: '6px',
            padding: '14px 16px 6px 16px',
            marginBottom: '16px',
            boxSizing: 'border-box'
        }}>
            {list.map(item => (
                <ResourceCostBar
                    key={item.key}
                    resourceKey={item.key}
                    resourceName={item.name}
                    currentAmount={item.current}
                    costAmount={item.cost}
                />
            ))}
        </div>
    );
};

export default ResourceCostBar;
