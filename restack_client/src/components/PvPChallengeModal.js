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
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#0a192f',
          border: '2px solid #64ffda',
          borderRadius: '16px',
          boxShadow: '0 0 30px rgba(100, 255, 218, 0.35), 0 10px 40px rgba(0,0,0,0.8)',
          padding: '28px',
          textAlign: 'center',
          color: '#e6f1ff',
          fontFamily: "'Inter', sans-serif",
          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ fontSize: '42px', marginBottom: '10px' }}>
          ⚔️
        </div>

        <h3
          style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#64ffda',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          {isIncoming ? 'PvP Challenge Received!' : 'PvP Challenge Issued'}
        </h3>

        <p style={{ color: '#8892b0', fontSize: '14px', margin: '0 0 20px 0' }}>
          {isIncoming ? (
            <span>
              <strong style={{ color: '#ffffff' }}>{peerName}</strong> has challenged your crew to a real-time battle!
            </span>
          ) : (
            <span>
              Waiting for <strong style={{ color: '#ffffff' }}>{peerName}</strong> to accept your challenge...
            </span>
          )}
        </p>

        {/* Countdown Ring / Timer */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(100, 255, 218, 0.1)',
            border: `3px solid ${timeLeft <= 5 ? '#ff4d4d' : '#64ffda'}`,
            fontSize: '24px',
            fontWeight: 'bold',
            color: timeLeft <= 5 ? '#ff4d4d' : '#64ffda',
            marginBottom: '24px',
            boxShadow: `0 0 15px ${timeLeft <= 5 ? 'rgba(255, 77, 77, 0.4)' : 'rgba(100, 255, 218, 0.3)'}`,
            transition: 'all 0.3s ease'
          }}
        >
          {timeLeft}s
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {isIncoming ? (
            <>
              <button
                onClick={onAccept}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#64ffda',
                  color: '#0a192f',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(100, 255, 218, 0.5)',
                  transition: 'transform 0.15s ease, backgroundColor 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                ⚔️ Accept Battle
              </button>
              <button
                onClick={onDecline}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 77, 77, 0.15)',
                  color: '#ff4d4d',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  border: '1px solid rgba(255, 77, 77, 0.5)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                ✖ Decline
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#8892b0',
                fontWeight: 'bold',
                fontSize: '14px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer'
              }}
            >
              Cancel Challenge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
