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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#0a192f',
          border: '2px solid #64ffda',
          borderRadius: '16px',
          boxShadow: '0 0 35px rgba(100, 255, 218, 0.35), 0 10px 40px rgba(0,0,0,0.8)',
          padding: '28px',
          boxSizing: 'border-box',
          textAlign: 'center',
          color: '#e6f1ff',
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Peer Avatar & Badge Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              border: '3px solid #64ffda',
              boxShadow: '0 0 20px rgba(100, 255, 218, 0.5)',
              backgroundImage: bgImageString,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              marginBottom: '12px'
            }}
          />
          <h3
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: '0 0 4px 0',
              letterSpacing: '0.5px'
            }}
          >
            {username}
          </h3>
          <span style={{ color: '#64ffda', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {unitName}
          </span>
        </div>

        <p style={{ color: '#8892b0', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.4' }}>
          You stand face-to-face with <strong style={{ color: '#fff' }}>{username}</strong>. Choose an interaction:
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onInviteChat}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '10px',
              backgroundColor: '#64ffda',
              color: '#0a192f',
              fontWeight: 'bold',
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(100, 255, 218, 0.4)',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            💬 Invite to Chat
          </button>

          <button
            onClick={onInviteDuel}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 77, 77, 0.2)',
              color: '#ff4d4d',
              fontWeight: 'bold',
              fontSize: '15px',
              border: '2px solid rgba(255, 77, 77, 0.6)',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(255, 77, 77, 0.2)',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ⚔️ Challenge to Duel
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#8892b0',
              fontWeight: '600',
              fontSize: '14px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              marginTop: '4px',
              boxSizing: 'border-box'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
