import React, { useState, useEffect } from 'react';
import { getMeta } from '../utils/session-handler';
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
        const allRoster = crewManager?.adventurers || [];
        const selectedCrew = meta?.crew || [];
        
        // Merge them
        let allUnits = [...allRoster];
        selectedCrew.forEach(c => {
            if (!allUnits.find(u => u.id === c.id)) {
                allUnits.push(c);
            }
        });
        
        const injured = allUnits.filter(u => {
            const hp = typeof u.hp === 'number' ? u.hp : (u.stats?.hp || u.starting_hp || 100);
            const maxHp = u.stats?.hp || u.starting_hp || 100;
            const hpPct = (hp / maxHp) * 100;
            // Exclude already in infirmary
            if (infirmary.patients.find(p => p.id === u.id)) return false;
            // Only < 15% or dead
            return hpPct < 15 || u.dead || hp <= 0;
        });
        
        setInjuredRoster(injured);
    }, [infirmary.patients.length]);
    
    const handleCommit = (unit) => {
        commitToInfirmary(unit);
        setInfirmary(getInfirmary());
    };
    
    const handleDischarge = (unitId) => {
        dischargeFromInfirmary(unitId);
        setInfirmary(getInfirmary());
    };
    
    const hasSageInRoster = crewManager?.adventurers?.find(a => a.type === 'sage') || (getMeta()?.crew || []).find(c => c.type === 'sage');
    
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
                
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(202, 138, 4, 0.1)', borderRadius: '8px', border: '1px solid rgba(202, 138, 4, 0.3)' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1em', color: '#fcd34d' }}>Sage Assistance</h3>
                    {infirmary.sageCommitted ? (
                        <div>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9em' }}>A Sage is currently working in the infirmary, doubling the healing rate (2 HP / hour) for all patients!</p>
                            <button onClick={() => { returnSageFromInfirmary(); setInfirmary(getInfirmary()); }} style={{ padding: '5px 10px', backgroundColor: '#7f1d1d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Return Sage to Roster
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9em' }}>Assign a Sage to the infirmary to double the healing rate. They will be unavailable for expeditions while assigned.</p>
                            {hasSageInRoster ? (
                                <button onClick={() => { commitSageToInfirmary(); setInfirmary(getInfirmary()); }} style={{ padding: '5px 10px', backgroundColor: '#ca8a04', color: '#1c1917', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Assign Sage to Infirmary
                                </button>
                            ) : (
                                <p style={{ color: '#999', margin: 0, fontStyle: 'italic' }}>No Sage in roster.</p>
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
                        <h3 style={{ color: '#fca5a5', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '30px' }}>Critically Injured Crew</h3>
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
