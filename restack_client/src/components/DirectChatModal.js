import React, { useState, useEffect, useRef } from 'react';
import * as images from '../utils/images';

export default function DirectChatModal({
  peerPlayer,
  messages = [],
  onSendMessage,
  onClose
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (onSendMessage) {
      onSendMessage(inputText.trim());
    }
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        height: '460px',
        backgroundColor: '#0a192f',
        border: '2px solid #64ffda',
        borderRadius: '16px',
        boxShadow: '0 0 30px rgba(100, 255, 218, 0.3), 0 10px 40px rgba(0,0,0,0.8)',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        color: '#e6f1ff'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          backgroundColor: 'rgba(100, 255, 218, 0.08)',
          borderBottom: '1px solid rgba(100, 255, 218, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid #64ffda',
              backgroundImage: bgImageString,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#ffffff' }}>
              {username}
            </div>
            <div style={{ fontSize: '11px', color: '#64ffda', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64ffda' }} />
              Active in Dungeon
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8892b0',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            lineHeight: 1
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#ff4d4d')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#8892b0')}
        >
          ✕
        </button>
      </div>

      {/* Message History Container */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'rgba(5, 12, 24, 0.6)'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8892b0', fontSize: '13px', marginTop: 'auto', marginBottom: 'auto' }}>
            💬 Start chatting with <strong>{username}</strong>!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.isSelf ? 'flex-end' : 'flex-start',
                maxWidth: '78%'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#8892b0',
                  marginBottom: '2px',
                  textAlign: msg.isSelf ? 'right' : 'left'
                }}
              >
                {msg.senderName || (msg.isSelf ? 'You' : username)}
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: msg.isSelf ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  backgroundColor: msg.isSelf ? '#64ffda' : 'rgba(255, 255, 255, 0.1)',
                  color: msg.isSelf ? '#0a192f' : '#ffffff',
                  fontWeight: msg.isSelf ? '600' : 'normal',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  boxShadow: msg.isSelf ? '0 0 10px rgba(100, 255, 218, 0.2)' : 'none',
                  wordBreak: 'break-word'
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Tray */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#0a192f',
          borderTop: '1px solid rgba(100, 255, 218, 0.2)',
          display: 'flex',
          gap: '8px'
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(100, 255, 218, 0.3)',
            color: '#ffffff',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: '#64ffda',
            color: '#0a192f',
            fontWeight: 'bold',
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(100, 255, 218, 0.3)'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
