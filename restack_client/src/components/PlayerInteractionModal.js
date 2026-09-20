import React from 'react';
import * as images from '../utils/images';

export default function PlayerInteractionModal({
  peerPlayer,
  onInviteChat,
  onInviteDuel,
  onClose
}) {
  if (!peerPlayer) return null;

  const username = peerPlayer.username || 'Peer Explorer';
  const selectedUnit = peerPlayer.location?.selectedCrewMember || peerPlayer.selectedCrewMember || ((Array.isArray(peerPlayer.crewSummary) && peerPlayer.crewSummary.length > 0) ? peerPlayer.crewSummary[0] : null);
  
  let portraitImg = null;
  let portraitKey = 'barbarian_portrait';
  if (selectedUnit) {
    const rawVal = selectedUnit.portraitUrl || selectedUnit.portrait || selectedUnit.class || selectedUnit.type || selectedUnit.image;
    if (typeof rawVal === 'string') {
      const keyLower = rawVal.toLowerCase();
      portraitKey = keyLower;
      portraitImg = images[rawVal] || images[keyLower] || images[`${keyLower}_portrait`] || images[`${keyLower}_compressed`] || ((rawVal.startsWith('data:') || rawVal.startsWith('http') || rawVal.startsWith('/')) ? rawVal : null);
    } else if (rawVal) {
      portraitImg = rawVal;
    }
  }
  if (!portraitImg) {
    portraitImg = images['barbarian_portrait'] || images['avatar'];
  }

  let bgImageString = `url(${portraitImg?.default || portraitImg})`;
  if (typeof images.getCrewPortraitBackground === 'function') {
    const customBg = images.getCrewPortraitBackground(portraitImg, portraitKey);
    if (customBg) {
      bgImageString = customBg;
    }
  }

  const unitName = selectedUnit?.name || selectedUnit?.class || 'Adventurer';

  return (
    <div
      className="ambush-popup-overlay"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="ambush-popup-card"
        style={{
          maxWidth: '440px',
          padding: '30px 24px',
          borderColor: 'rgba(212, 163, 89, 0.55)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(212, 163, 89, 0.2), inset 0 0 25px rgba(0, 0, 0, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Metallic Corner Brackets */}
        <div className="card-corner top-left" />
        <div className="card-corner top-right" />
        <div className="card-corner bottom-left" />
        <div className="card-corner bottom-right" />

        {/* Eyebrow */}
        <div className="ambush-eyebrow">
          <span className="glyph">◆</span> ENCOUNTER <span className="glyph">◆</span>
        </div>

        {/* Title */}
        <h3
          className="ambush-title"
          style={{
            color: '#f5dfa8',
            textShadow: '0 0 15px rgba(229, 181, 79, 0.5)',
            marginBottom: '4px'
          }}
        >
          {username}
        </h3>

        {/* Diamond Divider */}
        <div className="ambush-divider">
          <div className="divider-line" />
          <span className="divider-glyph">❖</span>
          <div className="divider-line" />
        </div>

        {/* Peer Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              border: '2px solid rgba(212, 163, 89, 0.65)',
              boxShadow: '0 0 25px rgba(229, 181, 79, 0.3), inset 0 0 12px rgba(0, 0, 0, 0.8)',
              backgroundImage: bgImageString,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              marginBottom: '8px'
            }}
          />
          <span style={{ color: '#d4a359', fontFamily: "'Cinzel', serif", fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            ✦ {unitName} ✦
          </span>
        </div>

        <div className="ambush-subtitle" style={{ marginBottom: '20px' }}>
          You encounter <span className="monster-highlight">{username}</span> across the dimensional weave. Choose an interaction:
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={onInviteChat}
            className="ambush-fight-btn"
            style={{
              width: '100%',
              background: 'linear-gradient(180deg, #2a2016 0%, #151009 100%)',
              border: '1px solid rgba(229, 181, 79, 0.7)',
              color: '#f5dfa8',
              boxShadow: '0 0 14px rgba(229, 181, 79, 0.25)'
            }}
          >
            ✦ INITIATE COMMUNION / CHAT
          </button>

          <button
            type="button"
            onClick={onInviteDuel}
            className="ambush-fight-btn danger"
            style={{
              width: '100%'
            }}
          >
            ⚔ CHALLENGE TO DUEL
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ambush-fight-btn"
            style={{
              width: '100%',
              background: 'linear-gradient(180deg, #1f181c 0%, #100d0e 100%)',
              border: '1px solid rgba(212, 163, 89, 0.35)',
              color: '#c8bda8',
              marginTop: '4px'
            }}
          >
            DEPART
          </button>
        </div>
      </div>
    </div>
  );
}
