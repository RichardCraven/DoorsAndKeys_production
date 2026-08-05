import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { LANDING_REDUX_CSS } from '../styles/landing-redux-css';

export default function TutorialsPage(props) {
  const history = useHistory();

  const goBack = () => {
    history.push('/landing');
  };

  return (
    <div className="redux-landing-container tutorials-page">
      <style dangerouslySetInnerHTML={{ __html: LANDING_REDUX_CSS }} />
      <header className="landing-header">
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

      <main className="tutorials-main">
        <div className="tutorials-grid">
          {/* Dungeon Card */}
          <div className="menu-card tutorial-menu-card" style={{ cursor: 'pointer' }} onClick={() => history.push('/dungeon?tutorial=dungeon')}>
            <div className="card-top">
              <span className="card-title">Dungeon</span>
              <span className="card-desc">Learn how to move, explore dark corridors, trigger secret passages, and reveal maps.</span>
            </div>
            <span className="card-arrow">Start Dungeon Tutorial →</span>
          </div>

          {/* Combat Card */}
          <div className="menu-card tutorial-menu-card">
            <div className="card-top">
              <span className="card-title">Combat</span>
              <span className="card-desc">Master turn-based combat, queue up skills, manage stamina and resolve, and defeat monsters.</span>
            </div>
            <span className="card-arrow">Start Combat Tutorial →</span>
          </div>

          {/* Card Duel Card */}
          <div className="menu-card tutorial-menu-card">
            <div className="card-top">
              <span className="card-title">Card Duel</span>
              <span className="card-desc">Understand card deck building, reserve mechanics, dueling cards, and battle layouts.</span>
            </div>
            <span className="card-arrow">Start Card Tutorial →</span>
          </div>

          {/* TBD Card */}
          <div className="menu-card tutorial-menu-card" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
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
