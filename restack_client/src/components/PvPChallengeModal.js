import React, { useState, useEffect } from 'react';
import socketHandler from '../utils/socket-handler';

export default function PvPChallengeModal({
  incomingChallenge,
  outgoingChallenge,
  onClose,
  onAccept,
  onDecline
}) {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!incomingChallenge && !outgoingChallenge) return;
    setTimeLeft(15);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (incomingChallenge && onDecline) {
            onDecline();
          } else if (outgoingChallenge && onClose) {
            onClose();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingChallenge, outgoingChallenge, onDecline, onClose]);

  if (!incomingChallenge && !outgoingChallenge) return null;

  const isIncoming = Boolean(incomingChallenge);
  const peerName = isIncoming ? incomingChallenge.challengerUsername : outgoingChallenge.targetUsername;

  return (
    <div
      className="ambush-popup-overlay"
      style={{ zIndex: 9999 }}
      onClick={!isIncoming ? onClose : undefined}
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
        {/* Corner Brackets */}
        <div className="card-corner top-left" />
        <div className="card-corner top-right" />
        <div className="card-corner bottom-left" />
        <div className="card-corner bottom-right" />

        {/* Eyebrow */}
        <div className="ambush-eyebrow">
          <span className="glyph">◆</span> TRIAL OF COMBAT <span className="glyph">◆</span>
        </div>

        {/* Title */}
        <h3
          className="ambush-title"
          style={{
            color: '#f5dfa8',
            textShadow: '0 0 15px rgba(229, 181, 79, 0.5)',
            marginBottom: '10px'
          }}
        >
          {isIncoming ? 'CHALLENGE RECEIVED' : 'CHALLENGE ISSUED'}
        </h3>

        {/* Diamond Divider */}
        <div className="ambush-divider">
          <div className="divider-line" />
          <span className="divider-glyph">❖</span>
          <div className="divider-line" />
        </div>

        {/* Emblem Frame */}
        <div
          style={{
            width: '76px',
            height: '76px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #2a2012 0%, #0c0a06 100%)',
            border: '1px solid rgba(212, 163, 89, 0.5)',
            boxShadow: '0 0 25px rgba(229, 181, 79, 0.3), inset 0 0 12px rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '2.2rem', color: '#f5dfa8', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}>⚔</span>
        </div>

        {/* Subtitle / Peer Message */}
        <div className="ambush-subtitle" style={{ marginBottom: '18px' }}>
          {isIncoming ? (
            <span>
              <span className="monster-highlight">{peerName}</span> has challenged your crew to a real-time tactical duel.
            </span>
          ) : (
            <span>
              Awaiting <span className="monster-highlight">{peerName}</span> to accept the duel challenge...
            </span>
          )}
        </div>

        {/* Countdown Ring / Timer */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            border: `2px solid ${timeLeft <= 5 ? '#ef4444' : '#d4a359'}`,
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: "'Cinzel', serif",
            color: timeLeft <= 5 ? '#fca5a5' : '#f5dfa8',
            marginBottom: '22px',
            boxShadow: `0 0 16px ${timeLeft <= 5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(212, 163, 89, 0.25)'}`,
            transition: 'all 0.3s ease'
          }}
        >
          {timeLeft}s
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
          {isIncoming ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="ambush-fight-btn"
                style={{
                  flex: 1,
                  background: 'linear-gradient(180deg, #3d2a14 0%, #1c1409 100%)',
                  border: '1px solid rgba(229, 181, 79, 0.7)',
                  color: '#f5dfa8',
                  boxShadow: '0 0 16px rgba(229, 181, 79, 0.35)'
                }}
              >
                ACCEPT DUEL
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="ambush-fight-btn danger"
                style={{
                  flex: 1
                }}
              >
                DECLINE
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ambush-fight-btn"
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, #1f181c 0%, #100d0e 100%)',
                border: '1px solid rgba(212, 163, 89, 0.35)',
                color: '#c8bda8'
              }}
            >
              CANCEL CHALLENGE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
