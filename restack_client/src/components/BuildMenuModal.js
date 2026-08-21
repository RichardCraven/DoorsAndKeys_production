/**
 * BuildMenuModal.js
 * Popup interface for constructing permanent structures on the dungeon map.
 */

import React, { Component } from 'react';
import * as images from '../utils/images';
import { getAdjustedBuildTime, hasArcaneUnit, hasEngineerUnit } from '../utils/building-utils';
import { getMeta } from '../utils/session-handler';

export const BUILDINGS = [
    // --- EARTHLY BUILDINGS ---
    {
        key: 'hut',
        name: 'Hut',
        category: 'earthly',
        imageKey: 'buildable_hut',
        fallbackImageKey: 'hut',
        costs: { wood: 0, stone: 0, slate: 0 },
        buildTime: 20,
        tag: 'FUNCTIONAL',
        description: 'Safe haven for the crew. Prevents Pygmy ambushes on this tile. Replaces any previously placed Hut.',
    },
    {
        key: 'outpost',
        name: 'Outpost',
        category: 'earthly',
        imageKey: 'buildable_outpost',
        fallbackImageKey: 'outpost',
        costs: { wood: 50, stone: 50, slate: 10 },
        buildTime: 7200,
        tag: 'STRUCTURE',
        description: 'A fortified wooden outpost for securing territory. Fires at enemy units within its contiguous territory. Only 1 allowed per contiguous territory block.',
    },
    {
        key: 'observer_platform',
        name: 'Observation Platform',
        category: 'earthly',
        imageKey: 'buildable_observer_platform',
        fallbackImageKey: 'observer_platform',
        costs: { wood: 8, stone: 2, slate: 0 },
        buildTime: 50,
        tag: 'STRUCTURE',
        description: 'An elevated wooden watchtower with a wide vantage point.',
    },
    {
        key: 'earthen_fort',
        name: 'Earthen Fort',
        category: 'earthly',
        imageKey: 'buildable_earthen_fort',
        fallbackImageKey: 'earthen_fort',
        costs: { wood: 10, stone: 8, slate: 2 },
        buildTime: 75,
        tag: 'FORTIFICATION',
        description: 'A reinforced earthen mound with defensive palisades.',
    },
    {
        key: 'war_camp',
        name: 'War Camp',
        category: 'earthly',
        imageKey: 'buildable_war_camp',
        fallbackImageKey: 'war_camp',
        costs: { wood: 15, stone: 12, slate: 4 },
        buildTime: 105,
        tag: 'FORTIFICATION',
        description: 'A sprawling military encampment for housing crew and forces.',
    },
    {
        key: 'war_fort',
        name: 'War Fort',
        category: 'earthly',
        imageKey: 'buildable_war_fort',
        fallbackImageKey: 'war_fort',
        costs: { wood: 20, stone: 20, slate: 8 },
        buildTime: 150,
        tag: 'STRONGHOLD',
        description: 'An impenetrable stone-and-slate stronghold capable of enduring sieges.',
    },

    // --- ARCANE BUILDINGS ---
    {
        key: 'frozen_locus',
        name: 'Frozen Locus',
        category: 'arcane',
        imageKey: 'frozen_locus',
        fallbackImageKey: 'frozen_locus',
        costs: { stone: 10, slate: 5, dust: 2 },
        buildTime: 60,
        tag: 'ARCANE',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    },
    {
        key: 'emerald_locus',
        name: 'Emerald Locus',
        category: 'arcane',
        imageKey: 'emerald_locus',
        fallbackImageKey: 'emerald_locus',
        costs: { stone: 12, slate: 8, dust: 4 },
        buildTime: 85,
        tag: 'ARCANE',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
    },
    {
        key: 'cosmic_locus',
        name: 'Cosmic Locus',
        category: 'arcane',
        imageKey: 'cosmic_locus',
        fallbackImageKey: 'cosmic_locus',
        costs: { stone: 15, slate: 12, dust: 6 },
        buildTime: 120,
        tag: 'ARCANE',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit.',
    },

    // --- OBSCURE BUILDINGS ---
    {
        key: 'infernal_tower',
        name: 'Infernal Tower',
        category: 'obscure',
        imageKey: 'infernal_tower',
        fallbackImageKey: 'infernal_tower',
        costs: { wood: 25, stone: 25, slate: 10 },
        buildTime: 180,
        tag: 'OBSCURE',
        description: 'Lorem ipsum dolor sit amet. A dark, jagged tower imbued with brimstone.',
    },
    {
        key: 'infernal_pit',
        name: 'Infernal Pit',
        category: 'obscure',
        imageKey: 'infernal_pit',
        fallbackImageKey: 'infernal_pit',
        costs: { wood: 30, stone: 30, slate: 15 },
        buildTime: 220,
        tag: 'OBSCURE',
        description: 'Lorem ipsum dolor sit amet. A fiery chasm offering access to Nether forces.',
    },
    // --- ADVANCED BUILDINGS ---
    {
        key: 'wall',
        name: 'Wall',
        category: 'advanced',
        imageKey: 'wall',
        fallbackImageKey: 'wall',
        costs: { wood: 25, stone: 20, slate: 0 },
        buildTime: 60,
        tag: 'STRUCTURE',
        description: 'A sturdy wall that blocks movement for non-owners. Cannot be inscribed by other players.',
    },
];

// hasArcaneUnit imported from building-utils.js

const TABS = [
    {
        id: 'earthly',
        label: 'Earthly',
        icon: '🌿',
        isDisabled: () => false,
    },
    {
        id: 'advanced',
        label: 'Advanced',
        icon: '⚙️',
        isDisabled: (crew, inSuperboard) => inSuperboard ? false : !hasEngineerUnit(crew),
    },
    {
        id: 'arcane',
        label: 'Arcane',
        icon: '🔮',
        isDisabled: (crew, inSuperboard) => inSuperboard ? false : !hasArcaneUnit(crew),
    },
    {
        id: 'obscure',
        label: 'Obscure',
        icon: <img src={images.whiteskull?.default || images.whiteskull || ''} alt="Obscure" style={{ width: '15px', height: '15px', objectFit: 'contain', filter: 'invert(1) drop-shadow(0 0 2px rgba(255,255,255,0.5))' }} />,
        isDisabled: (crew, inSuperboard) => inSuperboard ? false : true,
    },
];

class BuildMenuModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'earthly',
            errorMessage: null,
        };
    }

    getResourceCounts = () => {
        const { inventoryManager } = this.props;
        const counts = { 
            wood: inventoryManager?.wood || 0, 
            stone: inventoryManager?.stone || 0, 
            slate: inventoryManager?.slate || 0, 
            dust: inventoryManager?.shimmering_dust || 0 
        };

        const inv = (inventoryManager && inventoryManager.inventory) || [];
        if (Array.isArray(inv)) {
            inv.forEach(item => {
                if (!item) return;
                const key = (item.key || item.id || item._im_key || item.name || '').toLowerCase();
                if (key.includes('wood')) counts.wood += (item.amount || 1);
                else if (key.includes('slate')) counts.slate += (item.amount || 1);
                else if (key.includes('stone')) counts.stone += (item.amount || 1);
                else if (key.includes('dust')) counts.dust += (item.amount || 1);
            });
        }

        return counts;
    };

    canAfford = (costs, available) => {
        if (this.props.inSuperboard) return true;
        return (
            available.wood >= (costs.wood || 0) &&
            available.stone >= (costs.stone || 0) &&
            available.slate >= (costs.slate || 0) &&
            available.dust >= (costs.dust || 0)
        );
    };

    handleBuildClick = (building) => {
        if (this.props.activeConstruction) {
            this.setState({ errorMessage: `Construction of ${this.props.activeConstruction.buildingDef?.name || 'a structure'} is already in progress!` });
            setTimeout(() => this.setState({ errorMessage: null }), 3000);
            return;
        }

        const available = this.getResourceCounts();
        if (!this.canAfford(building.costs, available)) {
            this.setState({ errorMessage: `Insufficient resources to build ${building.name}.` });
            setTimeout(() => this.setState({ errorMessage: null }), 3000);
            return;
        }

        if (this.props.onBuild) {
            this.props.onBuild(building);
        }
    };

    render() {
        const { onClose, activeConstruction, crewManager } = this.props;
        const available = this.getResourceCounts();

        const meta = getMeta() || {};
        const crew = (crewManager && crewManager.crew) || meta.crew || [];
        const deadCount = crew.filter(m => m && (m.dead === true || (typeof m.hp === 'number' && m.hp <= 0))).length;

        const visibleBuildings = BUILDINGS.filter(b => (b.category || 'earthly') === this.state.activeTab);

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(5, 4, 10, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Inter', sans-serif",
                    animation: 'fadeIn 0.2s ease-out'
                }}
                onClick={onClose}
            >
                <div
                    style={{
                        position: 'relative',
                        width: '92%',
                        maxWidth: '780px',
                        maxHeight: '85vh',
                        minHeight: '620px',
                        background: 'rgba(17, 18, 20, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(179, 136, 255, 0.05)',
                        padding: '24px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        overflowY: 'auto',
                        color: '#f0ede5',
                        fontFamily: "'Cinzel', serif"
                    }}
                    className="arcane-modal"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 181, 79, 0.3)', paddingBottom: '14px' }}>
                        <div>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', fontWeight: '700', color: '#f9b115', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🏗️</span> CONSTRUCTION & BUILDINGS
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                                Construct permanent structures on your current tile.
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#ccc',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                minWidth: '36px',
                                minHeight: '36px',
                                aspectRatio: '1 / 1',
                                boxSizing: 'border-box',
                                padding: 0,
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f9b115'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#ccc'; }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(229, 181, 79, 0.2)', paddingBottom: '1px' }}>
                        {TABS.map(tab => {
                            const isActive = this.state.activeTab === tab.id;
                            const isDisabled = tab.isDisabled(crew, this.props.inSuperboard);

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            this.setState({ activeTab: tab.id });
                                        }
                                    }}
                                    disabled={isDisabled}
                                    title={isDisabled ? (tab.id === 'arcane' ? 'Requires a Wizard or Summoner in your crew' : 'Obscure buildings are currently locked') : undefined}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '4px 4px 0 0',
                                        border: '1px solid',
                                        borderColor: isActive ? '#e5b54f' : 'transparent',
                                        borderBottom: isActive ? '2px solid #f9b115' : '1px solid transparent',
                                        background: isActive
                                            ? 'linear-gradient(180deg, rgba(249, 177, 21, 0.15) 0%, rgba(20, 15, 9, 0.85) 100%)'
                                            : isDisabled
                                                ? 'rgba(0, 0, 0, 0.3)'
                                                : 'rgba(255, 255, 255, 0.04)',
                                        color: isActive ? '#f9b115' : isDisabled ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.75)',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        fontFamily: "'Cinzel', serif",
                                        letterSpacing: '0.06em',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        opacity: isDisabled ? 0.45 : 1,
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    {isDisabled && <span style={{ fontSize: '10px' }}>🔒</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Available Resources Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(229, 181, 79, 0.3)',
                        borderRadius: '10px',
                        padding: '10px 16px',
                    }}>
                        {this.props.inSuperboard ? (
                            <div style={{ color: '#4ade80', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>✨</span> POCKET DIMENSION TESTING: ALL BUILDINGS & CATEGORIES ARE FREE TO BUILD
                            </div>
                        ) : (
                            <>
                                {this.state.activeTab !== 'arcane' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                                        <img src={images.wood} alt="Wood" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                        <span>Wood: <strong style={{ color: '#f9b115' }}>{available.wood}</strong></span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                                    <img src={images.stone} alt="Stone" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                    <span>Stone: <strong style={{ color: '#f9b115' }}>{available.stone}</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                                    <img src={images.slate} alt="Slate" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                    <span>Slate: <strong style={{ color: '#f9b115' }}>{available.slate}</strong></span>
                                </div>
                                {this.state.activeTab === 'arcane' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                                        <img src={images.spectral_dust} alt="Dust" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                        <span>Dust: <strong style={{ color: '#f9b115' }}>{available.dust}</strong></span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Active Construction Banner in Modal */}
                    {activeConstruction && (
                        <div style={{
                            background: 'rgba(201, 132, 10, 0.2)',
                            border: '1px solid rgba(249, 177, 21, 0.6)',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: '#f9b115'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                                <span>🔨 Building in progress:</span>
                                <strong>{activeConstruction.buildingDef?.name}</strong>
                            </div>
                            <div style={{ fontWeight: '700' }}>
                                {activeConstruction.progressPct}% ({activeConstruction.secondsRemaining}s remaining)
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {this.state.errorMessage && (
                        <div style={{ background: 'rgba(220, 38, 38, 0.25)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                            ⚠️ {this.state.errorMessage}
                        </div>
                    )}

                    {/* Buildings List Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px', minHeight: '440px', alignContent: 'start' }}>
                        {visibleBuildings.map((b) => {
                            const imgUrl = images[b.imageKey] || images[b.fallbackImageKey] || images.building;
                            const affordable = this.canAfford(b.costs, available) && !activeConstruction;
                            const isFree = this.props.inSuperboard || (b.costs.wood === 0 && b.costs.stone === 0 && b.costs.slate === 0 && (b.costs.dust || 0) === 0);

                            const adjustedBuildTime = getAdjustedBuildTime(b.buildTime, crew, this.props.inSuperboard);
                            const isTimeIncreased = adjustedBuildTime > b.buildTime;

                            return (
                                <div
                                    key={b.key}
                                    style={{
                                        display: 'flex',
                                        gap: '14px',
                                        padding: '14px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: affordable ? '1px solid rgba(229, 181, 79, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: '4px',
                                        transition: 'all 0.2s ease',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Icon Preview */}
                                    <div style={{ width: '70px', height: '70px', borderRadius: '4px', background: 'radial-gradient(circle, #2a1f14 0%, #120c06 100%)', border: '1.5px solid #e5b54f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
                                        {imgUrl && <img src={imgUrl} alt={b.name} style={{ width: '56px', height: '56px', objectFit: 'contain' }} />}
                                    </div>

                                    {/* Info & Costs */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#f0ede5' }}>{b.name}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span
                                                        title={isTimeIncreased ? `Build time increased from ${b.buildTime}s to ${adjustedBuildTime}s due to ${deadCount} dead crew member(s)` : undefined}
                                                        style={{
                                                            fontSize: '11px',
                                                            color: isTimeIncreased ? '#ef4444' : '#f9b115',
                                                            fontWeight: '600',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px'
                                                        }}
                                                    >
                                                        ⏳ {adjustedBuildTime}s {isTimeIncreased && <span style={{ fontSize: '9px', opacity: 0.8 }}>(+{adjustedBuildTime - b.buildTime}s dead penalty)</span>}
                                                    </span>
                                                    <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '4px', background: b.key === 'hut' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)', color: b.key === 'hut' ? '#4ade80' : 'rgba(255,255,255,0.6)', border: `1px solid ${b.key === 'hut' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.15)'}` }}>
                                                        {b.tag}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: '1.35', marginBottom: '8px' }}>
                                                {b.description}
                                            </div>
                                        </div>

                                        {/* Bottom row: Costs & Action Button */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                            {/* Costs display */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                                                {isFree ? (
                                                    <span style={{ color: '#4ade80', fontWeight: '600' }}>Free</span>
                                                ) : (
                                                    <>
                                                        {b.costs.wood > 0 && (
                                                            <span style={{ color: available.wood >= b.costs.wood ? '#e2e8f0' : '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <img src={images.wood} alt="Wood" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> {b.costs.wood}
                                                            </span>
                                                        )}
                                                        {b.costs.stone > 0 && (
                                                            <span style={{ color: available.stone >= b.costs.stone ? '#e2e8f0' : '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <img src={images.stone} alt="Stone" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> {b.costs.stone}
                                                            </span>
                                                        )}
                                                        {b.costs.slate > 0 && (
                                                            <span style={{ color: available.slate >= b.costs.slate ? '#e2e8f0' : '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <img src={images.slate} alt="Slate" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> {b.costs.slate}
                                                            </span>
                                                        )}
                                                        {b.costs.dust > 0 && (
                                                            <span style={{ color: available.dust >= b.costs.dust ? '#e2e8f0' : '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <img src={images.spectral_dust} alt="Dust" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> {b.costs.dust}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Build button */}
                                            <button
                                                onClick={() => this.handleBuildClick(b)}
                                                disabled={!affordable}
                                                style={{
                                                    padding: '8px 18px',
                                                    borderRadius: '4px',
                                                    border: '1px solid rgba(229, 181, 79, 0.4)',
                                                    background: affordable
                                                        ? 'rgba(22, 19, 17, 0.45)'
                                                        : 'rgba(0, 0, 0, 0.3)',
                                                    color: affordable ? '#e5b54f' : 'rgba(255, 255, 255, 0.3)',
                                                    fontFamily: "'Cinzel', serif",
                                                    fontWeight: '700',
                                                    fontSize: '0.95rem',
                                                    letterSpacing: '2px',
                                                    textTransform: 'uppercase',
                                                    boxShadow: affordable ? '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(229, 181, 79, 0.03)' : 'none',
                                                    cursor: affordable ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.2s ease',
                                                    alignSelf: 'flex-end',
                                                }}
                                                onMouseEnter={e => {
                                                    if (affordable) {
                                                        e.currentTarget.style.background = 'rgba(32, 26, 22, 0.8)';
                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(229, 181, 79, 0.15)';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (affordable) {
                                                        e.currentTarget.style.background = 'rgba(22, 19, 17, 0.45)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(229, 181, 79, 0.03)';
                                                    }
                                                }}
                                            >
                                                {activeConstruction ? 'Busy' : 'Build'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

export default BuildMenuModal;
