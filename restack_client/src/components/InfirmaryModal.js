import React, { useState, useEffect } from 'react';
import { getMeta } from '../utils/session-handler';
import * as images from '../utils/images';
import { getInfirmary, commitToInfirmary, dischargeFromInfirmary, commitSageToInfirmary, returnSageFromInfirmary } from '../utils/infirmary-manager';

export default function InfirmaryModal({ onClose, crewManager }) {
    const [infirmary, setInfirmary] = useState(getInfirmary() || { patients: [], sageCommitted: false });
    const [injuredRoster, setInjuredRoster] = useState([]);
    
    // Periodically update infirmary state
    useEffect(() => {
        const interval = setInterval(() => {
            setInfirmary(getInfirmary());
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    
    useEffect(() => {
        // Find injured units in roster/crew that are NOT in infirmary
        const meta = getMeta();
        const allRoster = (crewManager && Array.isArray(crewManager.adventurers)) ? crewManager.adventurers : (meta?.adventurers || meta?.roster || []);
        const selectedCrew = (meta && Array.isArray(meta.crew)) ? meta.crew : [];
        
        // Merge roster & selected crew without duplicates
        const unitMap = new Map();
        [...selectedCrew, ...allRoster].forEach(c => {
            if (c && c.id && !unitMap.has(c.id)) {
                unitMap.set(c.id, c);
            }
        });
        const allUnits = Array.from(unitMap.values());
        
        const injured = allUnits.filter(u => {
            const hp = typeof u.hp === 'number' ? u.hp : (u.stats?.hp || u.starting_hp || 100);
            const maxHp = u.stats?.hp || u.starting_hp || 100;
            const isInjured = hp < maxHp || u.dead || hp <= 0;
            // Exclude units already in the infirmary
            if (infirmary.patients && infirmary.patients.some(p => p.id === u.id)) return false;
            return isInjured;
        });
        
        setInjuredRoster(injured);
    }, [infirmary.patients.length]);
    
    const handleCommit = (unit) => {
        commitToInfirmary(unit);
        const updated = getInfirmary();
        setInfirmary(updated);
        setInjuredRoster(prev => prev.filter(u => u.id !== unit.id));
    };
    
    const handleDischarge = (unitId) => {
        dischargeFromInfirmary(unitId);
        const updated = getInfirmary();
        setInfirmary(updated);
    };
    
    const meta = getMeta();
    const allRoster = (crewManager && Array.isArray(crewManager.adventurers)) ? crewManager.adventurers : (meta?.adventurers || meta?.roster || []);
    const selectedCrew = (meta && Array.isArray(meta.crew)) ? meta.crew : [];
    const unitMap = new Map();
    [...selectedCrew, ...allRoster].forEach(c => {
        if (c && c.id && !unitMap.has(c.id)) {
            unitMap.set(c.id, c);
        }
    });
    const allUnits = Array.from(unitMap.values());
    const availableSage = allUnits.find(u => (u.type === 'sage' || u.class === 'sage' || u.characterClass === 'sage'));
    const assignedSage = infirmary.assignedSage || availableSage;
    
    return (
        <div className="infirmary-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div className="infirmary-modal-content" style={{
                backgroundColor: '#1c1917', border: '2px solid #ca8a04',
                borderRadius: '8px', padding: '20px', width: '90%', maxWidth: '600px',
                color: '#fff', maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#fef08a' }}>The Infirmary</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                </div>
                
                <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(202, 138, 4, 0.12)', borderRadius: '8px', border: '1px solid rgba(202, 138, 4, 0.35)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15em', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🌿</span> Sage Assistance
                        </h3>
                        {infirmary.sageCommitted && (
                            <span style={{ fontSize: '0.78em', backgroundColor: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                On Duty (2 HP / hr)
                            </span>
                        )}
                    </div>

                    {infirmary.sageCommitted ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', backgroundColor: 'rgba(0,0,0,0.35)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(202, 138, 4, 0.25)' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '50%',
                                    backgroundImage: `url(${assignedSage?.portrait || assignedSage?.image || images.sage_portrait || images.sage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '2px solid #ca8a04',
                                    boxShadow: '0 0 10px rgba(202, 138, 4, 0.5)'
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', color: '#fef08a', fontSize: '1rem' }}>
                                        {assignedSage?.name || 'Sage'} <span style={{ fontSize: '0.8em', color: '#ca8a04', fontWeight: 'normal' }}>(Stationed in Infirmary)</span>
                                    </div>
                                    <div style={{ fontSize: '0.82em', color: '#86efac', marginTop: '2px' }}>
                                        Doubling healing rate (2 HP / hr) for all recovering patients.
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    returnSageFromInfirmary();
                                    setInfirmary(getInfirmary());
                                }}
                                style={{
                                    padding: '7px 16px',
                                    backgroundColor: '#991b1b',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    border: '1px solid #ef4444',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Remove Sage from Infirmary
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#d4d4d8', lineHeight: 1.5 }}>
                                Assign a Sage to the infirmary to double the healing rate (2 HP / hour). They will be unavailable for expeditions while assigned.
                            </p>
                            {availableSage ? (
                                <button
                                    onClick={() => {
                                        commitSageToInfirmary(availableSage);
                                        setInfirmary(getInfirmary());
                                    }}
                                    style={{
                                        padding: '7px 16px',
                                        backgroundColor: '#ca8a04',
                                        color: '#1c1917',
                                        fontWeight: 'bold',
                                        border: '1px solid #eab308',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.9em',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Assign {availableSage.name ? `${availableSage.name} (Sage)` : 'Sage'} to Infirmary
                                </button>
                            ) : (
                                <p style={{ color: '#71717a', margin: 0, fontStyle: 'italic', fontSize: '0.9em' }}>
                                    No Sage in roster.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                
                <h3 style={{ color: '#fef08a', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Current Patients ({infirmary.sageCommitted ? '2 HP / hr' : '1 HP / hr'})</h3>
                {infirmary.patients.length === 0 ? (
                    <p style={{ color: '#999' }}>No patients currently healing.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {infirmary.patients.map(p => {
                            const maxHp = p.stats?.hp || p.starting_hp || 100;
                            const hpPct = Math.min(100, Math.max(0, (p.hp / maxHp) * 100));
                            return (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundImage: `url(${p.portrait || p.image})`, backgroundSize: 'cover', border: '1px solid #555' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8em', color: '#aaa' }}>{Math.floor(p.hp)} / {maxHp} HP</div>
                                            <div style={{ width: '100%', height: '6px', backgroundColor: '#333', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${hpPct}%`, height: '100%', backgroundColor: hpPct < 15 ? '#b91c1c' : '#16a34a', transition: 'width 1s linear' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDischarge(p.id)} style={{ marginLeft: '15px', padding: '5px 10px', backgroundColor: hpPct >= 100 ? '#16a34a' : '#7f1d1d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        {hpPct >= 100 ? 'Discharge' : 'Pull Early'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {injuredRoster.length > 0 && (
                    <>
                        <h3 style={{ color: '#fca5a5', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '30px' }}>Injured Crew (Available for Admission)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {injuredRoster.map(u => {
                                const maxHp = u.stats?.hp || u.starting_hp || 100;
                                const hp = typeof u.hp === 'number' ? u.hp : maxHp;
                                return (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(185, 28, 28, 0.1)', border: '1px solid rgba(185, 28, 28, 0.3)', padding: '10px', borderRadius: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundImage: `url(${u.portrait || u.image})`, backgroundSize: 'cover', border: '1px solid #b91c1c' }} />
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#fca5a5' }}>{u.name}</div>
                                                <div style={{ fontSize: '0.8em', color: '#f87171' }}>{u.dead || hp <= 0 ? 'Dead' : `${Math.floor(hp)} / ${maxHp} HP`}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleCommit(u)} style={{ padding: '5px 15px', backgroundColor: '#b91c1c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Commit to Infirmary
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                
            </div>
        </div>
    );
}
