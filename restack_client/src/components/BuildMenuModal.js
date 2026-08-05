/**
 * BuildMenuModal.js
 * Popup interface for constructing permanent structures on the dungeon map.
 */

import React, { Component } from 'react';
import * as images from '../utils/images';

export const BUILDINGS = [
    {
        key: 'hut',
        name: 'Hut',
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
        imageKey: 'buildable_outpost',
        fallbackImageKey: 'outpost',
        costs: { wood: 5, stone: 3, slate: 0 },
        buildTime: 35,
        tag: 'STRUCTURE',
        description: 'A fortified wooden outpost for securing territory.',
    },
    {
        key: 'observer_platform',
        name: 'Observer Platform',
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
        imageKey: 'buildable_war_fort',
        fallbackImageKey: 'war_fort',
        costs: { wood: 20, stone: 20, slate: 8 },
        buildTime: 150,
        tag: 'STRONGHOLD',
        description: 'An impenetrable stone-and-slate stronghold capable of enduring sieges.',
    },
];

class BuildMenuModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            errorMessage: null,
        };
    }

    getResourceCounts = () => {
        const { inventoryManager } = this.props;
        const inv = (inventoryManager && inventoryManager.inventory) || [];
        const counts = { wood: 0, stone: 0, slate: 0 };

        if (Array.isArray(inv)) {
            inv.forEach(item => {
                if (!item) return;
                const key = (item.key || item.id || item._im_key || item.name || '').toLowerCase();
                if (key.includes('wood')) counts.wood += (item.amount || 1);
                else if (key.includes('slate')) counts.slate += (item.amount || 1);
                else if (key.includes('stone')) counts.stone += (item.amount || 1);
            });
        }

        return counts;
    };

    canAfford = (costs, available) => {
        return (
            available.wood >= (costs.wood || 0) &&
            available.stone >= (costs.stone || 0) &&
            available.slate >= (costs.slate || 0)
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
        const { onClose, activeConstruction } = this.props;
        const available = this.getResourceCounts();

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
                        background: 'linear-gradient(145deg, rgba(22, 18, 14, 0.98) 0%, rgba(12, 9, 7, 0.99) 100%)',
                        border: '2px solid #e5b54f',
                        borderRadius: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(229, 181, 79, 0.25)',
                        padding: '24px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                        overflowY: 'auto',
                        color: '#f0ede5'
                    }}
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

                        {/* Close button - Guaranteed circle */}
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

                    {/* Available Resources Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '10px 16px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                            <img src={images.wood} alt="Wood" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                            <span>Wood: <strong style={{ color: '#f9b115' }}>{available.wood}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                            <img src={images.stone} alt="Stone" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                            <span>Stone: <strong style={{ color: '#f9b115' }}>{available.stone}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                            <img src={images.slate} alt="Slate" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                            <span>Slate: <strong style={{ color: '#f9b115' }}>{available.slate}</strong></span>
                        </div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
                        {BUILDINGS.map((b) => {
                            const imgUrl = images[b.imageKey] || images[b.fallbackImageKey] || images.building;
                            const affordable = this.canAfford(b.costs, available) && !activeConstruction;
                            const isFree = b.costs.wood === 0 && b.costs.stone === 0 && b.costs.slate === 0;

                            return (
                                <div
                                    key={b.key}
                                    style={{
                                        display: 'flex',
                                        gap: '14px',
                                        padding: '14px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: affordable ? '1px solid rgba(229, 181, 79, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s ease',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Icon Preview */}
                                    <div style={{ width: '70px', height: '70px', borderRadius: '10px', background: 'radial-gradient(circle, #2a1f14 0%, #120c06 100%)', border: '1.5px solid #e5b54f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
                                        {imgUrl && <img src={imgUrl} alt={b.name} style={{ width: '56px', height: '56px', objectFit: 'contain' }} />}
                                    </div>

                                    {/* Info & Costs */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#f0ede5' }}>{b.name}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '11px', color: '#f9b115', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        ⏳ {b.buildTime}s
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
                                                                🪵 {b.costs.wood}
                                                            </span>
                                                        )}
                                                        {b.costs.stone > 0 && (
                                                            <span style={{ color: available.stone >= b.costs.stone ? '#e2e8f0' : '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                🪨 {b.costs.stone}
                                                            </span>
                                                        )}
                                                        {b.costs.slate > 0 && (
                                                            <span style={{ color: available.slate >= b.costs.slate ? '#e2e8f0' : '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                📄 {b.costs.slate}
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
                                                    padding: '6px 16px',
                                                    borderRadius: '20px',
                                                    border: 'none',
                                                    background: affordable
                                                        ? 'linear-gradient(135deg, rgba(201, 132, 10, 0.35) 0%, rgba(249, 177, 21, 0.5) 100%)'
                                                        : 'rgba(255, 255, 255, 0.05)',
                                                    outline: affordable ? '1px solid rgba(249, 177, 21, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: affordable ? '#f9b115' : 'rgba(255, 255, 255, 0.3)',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    fontFamily: "'Cinzel', serif",
                                                    letterSpacing: '0.05em',
                                                    cursor: affordable ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.18s ease',
                                                }}
                                                onMouseEnter={e => {
                                                    if (affordable) {
                                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201, 132, 10, 0.55) 0%, rgba(249, 177, 21, 0.75) 100%)';
                                                        e.currentTarget.style.color = '#fff';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (affordable) {
                                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201, 132, 10, 0.35) 0%, rgba(249, 177, 21, 0.5) 100%)';
                                                        e.currentTarget.style.color = '#f9b115';
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
