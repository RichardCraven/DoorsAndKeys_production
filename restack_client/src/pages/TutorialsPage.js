import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { LANDING_REDUX_CSS } from '../styles/landing-redux-css';

export default function TutorialsPage(props) {
  const history = useHistory();

  useEffect(() => {
    const styleId = 'landing-redux-injected-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = LANDING_REDUX_CSS;
      document.head.appendChild(styleEl);
    }
  }, []);

  const goBack = () => {
    history.push('/landing');
  };

  return (
    <div className="redux-landing-container" style={{ minHeight: '100vh', height: 'auto', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
      <header className="landing-header" style={{ padding: '0 24px' }}>
        <div className="header-logo">
          <span className="logo-title">Tutorials</span>
          <span className="logo-subtitle">Master the mechanics of Dream Tower</span>
        </div>
        <div className="header-user">
          <button className="btn-logout" onClick={goBack} style={{ background: 'rgba(212, 168, 68, 0.15)', borderColor: '#e5b54f', color: '#e5b54f' }}>
            Back to Tower
          </button>
        </div>
      </header>

      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          width: '100%',
          maxWidth: '900px',
          padding: '0 24px',
          boxSizing: 'border-box'
        }}>
          {/* Dungeon Card */}
          <div className="menu-card" style={{ minHeight: '160px' }}>
            <div className="card-top">
              <span className="card-title">Dungeon</span>
              <span className="card-desc">Learn how to move, explore dark corridors, trigger secret passages, and reveal maps.</span>
            </div>
            <span className="card-arrow">Start Dungeon Tutorial →</span>
          </div>

          {/* Combat Card */}
          <div className="menu-card" style={{ minHeight: '160px' }}>
            <div className="card-top">
              <span className="card-title">Combat</span>
              <span className="card-desc">Master turn-based combat, queue up skills, manage stamina and resolve, and defeat monsters.</span>
            </div>
            <span className="card-arrow">Start Combat Tutorial →</span>
          </div>

          {/* Card Duel Card */}
          <div className="menu-card" style={{ minHeight: '160px' }}>
            <div className="card-top">
              <span className="card-title">Card Duel</span>
              <span className="card-desc">Understand card deck building, reserve mechanics, dueling cards, and battle layouts.</span>
            </div>
            <span className="card-arrow">Start Card Tutorial →</span>
          </div>

          {/* TBD Card */}
          <div className="menu-card" style={{ minHeight: '160px', opacity: 0.6, cursor: 'not-allowed' }}>
            <div className="card-top">
              <span className="card-title">TBD</span>
              <span className="card-desc">To Be Determined. Additional training content and secret modes will be unlocked here.</span>
            </div>
            <span className="card-arrow" style={{ color: '#555' }}>Locked</span>
          </div>
        </div>
      </main>
    </div>
  );
}
