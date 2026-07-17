import homepageBg from '../assets/graphics/dream_tower_background.jpg';

export const LANDING_REDUX_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cinzel+Decorative:wght@700&family=Outfit:wght@300;400;500;600;700&display=swap');

.redux-login-container {
  font-family: 'Outfit', sans-serif;
  color: #f5f5f7;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at center, #1b1715 0%, #0c0a09 100%);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  overflow: hidden;
}

.redux-login-container .login-card {
  background: rgba(22, 19, 17, 0.85);
  border: 2px solid rgba(212, 168, 68, 0.2);
  border-radius: 8px;
  padding: 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 168, 68, 0.05);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  box-sizing: border-box;
}

.redux-login-container .login-card::before, 
.redux-login-container .login-card::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(212, 168, 68, 0.5);
}

.redux-login-container .login-card::before {
  top: 12px;
  left: 12px;
  border-right: none;
  border-bottom: none;
}

.redux-login-container .login-card::after {
  bottom: 12px;
  right: 12px;
  border-left: none;
  border-top: none;
}

.redux-login-container .login-card .title-glowing {
  font-family: 'Cinzel Decorative', serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #e5b54f;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
  text-shadow: 0 0 10px rgba(229, 181, 79, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
}

.redux-login-container .login-card .subtitle {
  font-size: 0.9rem;
  color: #a8a29e;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 30px;
}

.redux-login-container .login-card .tabs {
  display: flex;
  width: 100%;
  border-bottom: 1px solid rgba(212, 168, 68, 0.15);
  margin-bottom: 24px;
}

.redux-login-container .login-card .tabs .tab {
  flex: 1;
  background: none;
  border: none;
  color: #78716c;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.redux-login-container .login-card .tabs .tab:hover {
  color: #e5b54f;
}

.redux-login-container .login-card .tabs .tab.active {
  color: #e5b54f;
  border-bottom: 2px solid #e5b54f;
}

.redux-login-container .login-card .form-inputs {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.redux-login-container .login-card .form-inputs .input-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.redux-login-container .login-card .form-inputs .input-wrapper .input-icon {
  position: absolute;
  left: 14px;
  color: #a8a29e;
  font-size: 1rem;
}

.redux-login-container .login-card .form-inputs .input-wrapper input {
  width: 100%;
  padding: 14px 14px 14px 44px;
  background: rgba(12, 10, 9, 0.6);
  border: 1px solid rgba(120, 113, 108, 0.3);
  border-radius: 4px;
  color: #f5f5f7;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.redux-login-container .login-card .form-inputs .input-wrapper input:focus {
  border-color: #e5b54f;
  box-shadow: 0 0 8px rgba(229, 181, 79, 0.2);
  background: rgba(12, 10, 9, 0.95);
}

.redux-login-container .login-card .form-inputs .input-wrapper input::placeholder {
  color: #57534e;
}

.redux-login-container .login-card .error-banner {
  width: 100%;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-bottom: 20px;
  text-align: center;
  box-sizing: border-box;
  animation: shake 0.4s ease-in-out;
}

.redux-login-container .login-card .btn-submit {
  width: 100%;
  padding: 14px 0 !important;
  background: linear-gradient(135deg, #e5b54f 0%, #b28526 100%);
  color: #1c1917;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(178, 133, 38, 0.2);
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 auto;
  text-indent: 0 !important;
}

.redux-login-container .login-card .btn-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(229, 181, 79, 0.35);
  filter: brightness(1.1);
}

.redux-login-container .login-card .btn-submit:active {
  transform: translateY(0);
}


.redux-landing-container {
  font-family: 'Outfit', sans-serif;
  color: #f5f5f7;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: url(${homepageBg}) no-repeat center center;
  background-size: cover;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
  overflow: hidden;
  overscroll-behavior: none;
  box-sizing: border-box;
  padding: 40px;
}

.redux-landing-container .landing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: 30px auto 30px auto;
  border-bottom: 1px solid rgba(212, 168, 68, 0.15);
  padding-bottom: 20px;
}

.redux-landing-container .landing-header .header-logo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.redux-landing-container .landing-header .header-logo .logo-title {
  font-family: 'Cinzel Decorative', serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: #e5b54f;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(229, 181, 79, 0.25);
}

.redux-landing-container .landing-header .header-logo .logo-subtitle {
  font-size: 0.75rem;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 4px;
  text-align: left;
}

.redux-landing-container .landing-header .header-user {
  display: flex;
  align-items: center;
  gap: 20px;
}

.redux-landing-container .landing-header .header-user .user-info {
  font-size: 0.95rem;
  color: #a8a29e;
}

.redux-landing-container .landing-header .header-user .user-info span {
  color: #e5b54f;
  font-weight: 600;
}

.redux-landing-container .landing-header .header-user .btn-logout {
  background: rgba(120, 113, 108, 0.1);
  border: 1px solid rgba(120, 113, 108, 0.2);
  color: #a8a29e;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.redux-landing-container .landing-header .header-user .btn-logout:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.redux-landing-container .landing-main-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 30px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 900px) {
  .redux-landing-container .landing-main-grid {
    grid-template-columns: 1fr;
  }
}

.redux-landing-container .landing-main-grid .hero-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.redux-landing-container .landing-main-grid .menu-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(140px, auto);
  gap: 20px;
}

@media (max-width: 600px) {
  .redux-landing-container .landing-main-grid .menu-column {
    grid-template-columns: 1fr;
  }
}

.redux-landing-container .hero-card {
  background: rgba(22, 19, 17, 0.75);
  border: 2px solid rgba(212, 168, 68, 0.2);
  border-radius: 8px;
  padding: 35px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  height: 100%;
  justify-content: flex-start;
  gap: 20px;
}

.redux-landing-container .hero-card::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  width: 12px;
  height: 12px;
  border-top: 2px solid rgba(212, 168, 68, 0.4);
  border-left: 2px solid rgba(212, 168, 68, 0.4);
}

.redux-landing-container .hero-card .hero-tag {
  font-size: 0.75rem;
  color: #e5b54f;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 700;
  margin-bottom: 12px;
  display: inline-block;
}

.redux-landing-container .hero-card .hero-title {
  font-family: 'Cinzel', serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 14px;
  letter-spacing: 1px;
}

.redux-landing-container .hero-card .hero-desc {
  font-size: 0.95rem;
  color: #a8a29e;
  line-height: 1.6;
  margin-bottom: 30px;
}

.redux-landing-container .hero-card .warning-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-bottom: 20px;
  font-weight: 600;
  text-align: center;
}

.redux-landing-container .hero-card .action-row {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.redux-landing-container .hero-card .btn-play {
  width: 100%;
  padding: 16px 0 !important;
  background: rgba(22, 19, 17, 0.45);
  color: #e5b54f;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: 1px solid rgba(229, 181, 79, 0.4);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(229, 181, 79, 0.03);
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 12px;
  text-indent: 0 !important;
  backdrop-filter: blur(4px);
}

.redux-landing-container .hero-card .btn-play:hover {
  transform: translateY(-1px);
  background: rgba(229, 181, 79, 0.08);
  border-color: #e5b54f;
  color: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(229, 181, 79, 0.15), inset 0 0 12px rgba(229, 181, 79, 0.08);
}

.redux-landing-container .hero-card .btn-play.disabled,
.redux-landing-container .hero-card .btn-play:disabled {
  background: rgba(43, 39, 36, 0.2) !important;
  color: #57524f !important;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
  border: 1px solid rgba(120, 113, 108, 0.1) !important;
  pointer-events: auto;
}

.redux-landing-container .hero-card .dungeon-selector-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.redux-landing-container .hero-card .dungeon-selector-group .selector-label {
  font-size: 0.75rem;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.redux-landing-container .hero-card .dungeon-selector-group .custom-select-trigger {
  width: 100%;
  padding: 12px 16px;
  background: rgba(12, 10, 9, 0.6);
  border: 1px solid rgba(120, 113, 108, 0.3);
  border-radius: 4px;
  color: #f5f5f7;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.redux-landing-container .hero-card .dungeon-selector-group .custom-select-trigger:hover {
  border-color: #e5b54f;
  background: rgba(12, 10, 9, 0.85);
}

.redux-landing-container .hero-card .dungeon-selector-group .custom-select-trigger.selected {
  border-color: rgba(229, 181, 79, 0.6);
}

.redux-landing-container .hero-card .dungeon-selector-group .custom-select-menu {
  position: absolute;
  bottom: 105%;
  left: 0;
  width: 100%;
  background: #181513;
  border: 1px solid rgba(212, 168, 68, 0.3);
  border-radius: 4px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.8);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.redux-landing-container .hero-card .dungeon-selector-group .custom-select-menu .menu-item {
  padding: 12px 16px;
  font-size: 0.9rem;
  color: #a8a29e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.redux-landing-container .hero-card .dungeon-selector-group .custom-select-menu .menu-item:hover {
  background: rgba(212, 168, 68, 0.1);
  color: #e5b54f;
}

.redux-landing-container .hero-card .dungeon-selector-group .custom-select-menu .menu-item.active {
  background: rgba(212, 168, 68, 0.15);
  color: #e5b54f;
  font-weight: 600;
}

.redux-landing-container .hero-card .skip-intro-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #a8a29e;
  font-size: 0.85rem;
  cursor: pointer;
  user-select: none;
  margin-top: 5px;
}

.redux-landing-container .hero-card .skip-intro-label input {
  accent-color: #d4a844;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.redux-landing-container .menu-card {
  background: rgba(22, 19, 17, 0.55);
  border: 1px solid rgba(120, 113, 108, 0.2);
  border-radius: 6px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  box-sizing: border-box;
}

.redux-landing-container .menu-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 168, 68, 0.4);
  background: rgba(22, 19, 17, 0.8);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(212, 168, 68, 0.03);
}

.redux-landing-container .menu-card:hover .card-title {
  color: #e5b54f;
}

.redux-landing-container .menu-card .card-top {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.redux-landing-container .menu-card .card-top .card-icon {
  font-size: 1.8rem;
  height: 36px;
  display: flex;
  align-items: center;
}

.redux-landing-container .menu-card .card-top .card-title {
  font-family: 'Cinzel', serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  transition: color 0.2s ease;
}

.redux-landing-container .menu-card .card-top .card-desc {
  font-size: 0.8rem;
  color: #78716c;
  line-height: 1.4;
}

.redux-landing-container .menu-card .card-arrow {
  align-self: flex-end;
  color: #78716c;
  font-size: 0.8rem;
  font-weight: bold;
  transition: all 0.2s ease;
}

.redux-landing-container .menu-card:hover .card-arrow {
  color: #e5b54f;
  transform: translateX(3px);
}
.redux-landing-container .hero-card .dungeon-preview-space {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 15px 0;
}

.redux-landing-container .hero-card .no-crew-warning {
  color: #78716c;
  font-size: 0.85rem;
  font-style: italic;
  text-align: center;
  border: 1px dashed rgba(212, 168, 68, 0.2);
  border-radius: 8px;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

.redux-landing-container .hero-card .selected-crew-preview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: rgba(12, 10, 9, 0.4);
  border: 1px solid rgba(212, 168, 68, 0.15);
  border-radius: 8px;
  padding: 12px;
  box-sizing: border-box;
}

.redux-landing-container .hero-card .selected-crew-title {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  color: #e5b54f;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(229, 181, 79, 0.2);
}

.redux-landing-container .hero-card .selected-crew-list {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.redux-landing-container .hero-card .selected-crew-member-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 65px;
}

.redux-landing-container .hero-card .selected-crew-avatar-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 2px solid rgba(212, 168, 68, 0.5);
  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
  position: relative;
}

.redux-landing-container .hero-card .selected-crew-badge {
  position: absolute;
  bottom: -2px;
  right: -6px;
  background: #1c1917;
  color: #e5b54f;
  border: 1px solid rgba(212, 168, 68, 0.3);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 8px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}

.redux-landing-container .hero-card .selected-crew-name {
  font-size: 0.75rem;
  color: #f5f5f7;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

.redux-landing-container .hero-card .selected-crew-type {
  font-size: 0.6rem;
  color: #a8a29e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}

/* ==========================================
   MOBILE & VIEWPORT HEIGHT REDESIGN OVERRIDES
   ========================================== */
@media (max-width: 1024px) {
  .redux-landing-container {
    padding: 8px 12px !important;
  }
  
  .redux-landing-container .landing-header {
    margin: 0 auto 6px auto !important;
    padding-bottom: 4px !important;
  }
  
  .redux-landing-container .landing-header .header-logo .logo-title {
    font-size: 1.15rem !important;
    letter-spacing: 1px !important;
  }
  
  .redux-landing-container .landing-header .header-logo .logo-subtitle {
    font-size: 0.55rem !important;
    margin-top: 1px !important;
    letter-spacing: 0.5px !important;
  }
  
  .redux-landing-container .landing-header .header-user {
    gap: 10px !important;
  }
  
  .redux-landing-container .landing-header .header-user .user-info {
    font-size: 0.8rem !important;
  }
  
  .redux-landing-container .landing-header .header-user .btn-logout {
    padding: 4px 10px !important;
    font-size: 0.75rem !important;
  }

  .redux-landing-container .hero-card {
    padding: 10px 12px !important;
    gap: 8px !important;
    height: auto !important;
    justify-content: flex-start !important;
  }

  .redux-landing-container .menu-card {
    padding: 6px 10px !important;
    justify-content: center !important;
    align-items: center !important;
    min-height: 0 !important;
  }

  .redux-landing-container .menu-card .card-top {
    gap: 0 !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .redux-landing-container .menu-card .card-top .card-title {
    font-size: 0.85rem !important;
    text-align: center !important;
    margin: 0 !important;
  }

  .redux-landing-container .menu-card .card-top .card-desc {
    display: none !important;
  }
  
  .redux-landing-container .menu-card .card-arrow {
    display: none !important;
  }

  .redux-landing-container .menu-card .card-top .card-icon {
    font-size: 1.4rem !important;
    height: 28px !important;
  }
  
  .redux-landing-container .landing-main-grid .menu-column {
    gap: 8px !important;
    grid-auto-rows: minmax(38px, auto) !important;
  }

  .redux-landing-container .landing-main-grid .hero-column {
    gap: 8px !important;
  }
}

@media (max-width: 1024px) and (orientation: landscape) {
  .redux-landing-container .landing-main-grid {
    grid-template-columns: 1.15fr 1fr !important;
    gap: 8px !important;
  }
  
  .redux-landing-container .hero-card .dungeon-preview-space {
    margin: 6px 0 !important;
    flex-grow: 0 !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-preview-card {
    padding: 6px 8px !important;
    gap: 4px !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-list {
    gap: 6px !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-avatar-wrapper {
    width: 32px !important;
    height: 32px !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-name {
    font-size: 0.65rem !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-type {
    font-size: 0.5rem !important;
  }
  
  .redux-landing-container .hero-card .dungeon-selector-group {
    gap: 4px !important;
  }
  
  .redux-landing-container .hero-card .dungeon-selector-group .custom-select-trigger {
    padding: 6px 10px !important;
    font-size: 0.8rem !important;
  }
  
  .redux-landing-container .hero-card .btn-play {
    padding: 8px 0 !important;
    font-size: 0.9rem !important;
  }
}
`;
