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
  padding-top: 10px;
  padding-bottom: 10px;
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
  align-content: start;
  gap: 20px;
}

.redux-landing-container .landing-main-grid .menu-column.basic-user {
  align-content: start;
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
  font-family: 'Cinzel', serif;
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
  top: calc(100% + 4px);
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
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 15px 0;
  width: 100%;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  width: 100%;
  background: rgba(12, 10, 9, 0.5);
  border: 1px solid rgba(212, 168, 68, 0.2);
  border-radius: 8px;
  padding: 28px 20px;
  box-sizing: border-box;
}

.redux-landing-container .hero-card .selected-crew-title {
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  color: #e5b54f;
  text-transform: uppercase;
  letter-spacing: 3px;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(229, 181, 79, 0.3);
}

.redux-landing-container .hero-card .selected-crew-list {
  display: flex;
  gap: 32px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  flex-grow: 1;
}

.redux-landing-container .hero-card .selected-crew-member-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 150px;
}

.redux-landing-container .hero-card .selected-crew-avatar-wrapper {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(212, 168, 68, 0.65);
  box-shadow: 0 8px 24px rgba(0,0,0,0.8), 0 0 15px rgba(212, 168, 68, 0.15);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.redux-landing-container .hero-card .selected-crew-avatar-wrapper .crew-avatar-img,
.crew-showcase-portrait .crew-avatar-img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center !important;
  border-radius: 50% !important;
  pointer-events: none !important;
  display: block !important;
  position: absolute !important;
  inset: 0 !important;
  z-index: 1 !important;
}

.redux-landing-container .hero-card .selected-crew-avatar-wrapper:hover {
  transform: translateY(-4px) scale(1.04);
  border-color: rgba(212, 168, 68, 0.95);
  box-shadow: 0 12px 28px rgba(0,0,0,0.9), 0 0 22px rgba(212, 168, 68, 0.35);
}

.redux-landing-container .hero-card .selected-crew-badge {
  position: absolute;
  bottom: 2px;
  right: -2px;
  background: #1c1917;
  color: #e5b54f;
  border: 1px solid rgba(212, 168, 68, 0.4);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.7);
  z-index: 2 !important;
}

.redux-landing-container .hero-card .selected-crew-name {
  font-size: 1.1rem;
  color: #f5f5f7;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

.redux-landing-container .hero-card .selected-crew-type {
  font-size: 0.8rem;
  color: #e5b54f;
  text-transform: uppercase;
  letter-spacing: 1px;
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
@media (max-width: 1300px), (max-height: 920px) {
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
    padding: 20px 24px !important;
    gap: 16px !important;
    height: 100% !important;
    justify-content: space-between !important;
  }

  .redux-landing-container .hero-card .dungeon-preview-space {
    flex-grow: 1 !important;
    margin: 12px 0 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    width: 100% !important;
  }

  .redux-landing-container .hero-card .selected-crew-preview-card {
    flex-grow: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    padding: 16px !important;
    gap: 12px !important;
    width: 100% !important;
  }

  .redux-landing-container .hero-card .selected-crew-list {
    width: 100% !important;
    display: flex !important;
    justify-content: space-evenly !important;
    align-items: center !important;
    gap: 16px !important;
    flex-grow: 1 !important;
  }

  .redux-landing-container .hero-card .selected-crew-member-item {
    width: 130px !important;
    gap: 8px !important;
  }

  .redux-landing-container .hero-card .selected-crew-avatar-wrapper {
    width: 110px !important;
    height: 110px !important;
    border-width: 3px !important;
  }

  .redux-landing-container .hero-card .selected-crew-badge {
    font-size: 10px !important;
    bottom: 0px !important;
    right: -2px !important;
    padding: 2px 6px !important;
  }

  .redux-landing-container .hero-card .selected-crew-name {
    font-size: 1rem !important;
  }

  .redux-landing-container .hero-card .selected-crew-type {
    font-size: 0.75rem !important;
  }

  .redux-landing-container .menu-card {
    padding: 18px 10px !important;
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
    height: 100% !important;
  }
}

@media (max-width: 1200px) and (orientation: landscape), (max-height: 850px) and (orientation: landscape) {
  .redux-landing-container .landing-main-grid {
    grid-template-columns: 1.15fr 1fr !important;
    gap: 8px !important;
    height: 100% !important;
  }
  
  .redux-landing-container .hero-card .dungeon-preview-space {
    margin: 12px 0 !important;
    flex-grow: 1 !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-preview-card {
    padding: 16px !important;
    gap: 12px !important;
    flex-grow: 1 !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-list {
    gap: 16px !important;
    flex-grow: 1 !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-avatar-wrapper {
    width: 100px !important;
    height: 100px !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-name {
    font-size: 0.95rem !important;
  }
  
  .redux-landing-container .hero-card .selected-crew-type {
    font-size: 0.7rem !important;
  }
  
  .redux-landing-container .hero-card .dungeon-selector-group {
    gap: 6px !important;
  }
  
  .redux-landing-container .hero-card .dungeon-selector-group .custom-select-trigger {
    padding: 10px 14px !important;
    font-size: 0.85rem !important;
  }
  
  .redux-landing-container .hero-card .btn-play {
    padding: 12px 0 !important;
    font-size: 1rem !important;
  }
}

/* ==========================================
   TUTORIALS PAGE & RESPONSIVE BUTTON STYLING
   ========================================== */
.redux-landing-container.tutorials-page {
  position: relative;
  min-height: 100vh;
  height: auto;
  overflow-y: auto !important;
  display: flex;
  flex-direction: column;
  padding: 24px 0 !important;
  box-sizing: border-box;
}

.redux-landing-container.tutorials-page .landing-header {
  padding: 0 24px !important;
}

.redux-landing-container.tutorials-page .tutorials-main {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  width: 100%;
}

.redux-landing-container.tutorials-page .tutorials-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  width: 100%;
  max-width: 900px;
  padding: 0 24px;
  box-sizing: border-box;
}

.redux-landing-container.tutorials-page .menu-card {
  min-height: 160px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
}

/* Tablet & short viewport overrides for Tutorials Page */
@media (max-width: 1200px), (max-height: 850px) {
  .redux-landing-container.tutorials-page {
    overflow-y: auto !important;
    padding: 16px 0 !important;
  }

  .redux-landing-container.tutorials-page .tutorials-main {
    padding: 12px 0 !important;
  }

  .redux-landing-container.tutorials-page .tutorials-grid {
    gap: 16px !important;
    padding: 0 16px !important;
  }

  .redux-landing-container.tutorials-page .menu-card {
    padding: 20px 22px !important;
    min-height: 140px !important;
    justify-content: space-between !important;
    align-items: stretch !important;
  }

  .redux-landing-container.tutorials-page .menu-card .card-top {
    gap: 8px !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
  }

  .redux-landing-container.tutorials-page .menu-card .card-top .card-title {
    font-size: 1.2rem !important;
    text-align: left !important;
    margin: 0 !important;
    color: #ffffff !important;
    letter-spacing: 0.5px !important;
  }

  .redux-landing-container.tutorials-page .menu-card .card-top .card-desc {
    display: block !important;
    font-size: 0.85rem !important;
    color: #a8a29e !important;
    line-height: 1.4 !important;
    text-align: left !important;
  }

  .redux-landing-container.tutorials-page .menu-card .card-arrow {
    display: block !important;
    align-self: flex-end !important;
    font-size: 0.85rem !important;
    font-weight: bold !important;
    color: #78716c !important;
    margin-top: 12px !important;
  }

  .redux-landing-container.tutorials-page .menu-card:hover .card-arrow {
    color: #e5b54f !important;
  }
}

/* Mobile screen specific adjustments */
@media (max-width: 640px) {
  .redux-landing-container.tutorials-page .tutorials-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  .redux-landing-container.tutorials-page .menu-card {
    padding: 18px 20px !important;
    min-height: 130px !important;
  }

  .redux-landing-container.tutorials-page .menu-card .card-top .card-title {
    font-size: 1.15rem !important;
  }

  .redux-landing-container.tutorials-page .menu-card .card-top .card-desc {
    font-size: 0.82rem !important;
  }
}

/* ── Selected Crew Unit Showcase Modal ── */
.crew-showcase-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(4, 3, 3, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: showcaseFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes showcaseFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.crew-showcase-modal {
  position: relative;
  width: 100%;
  max-width: 820px;
  max-height: 85vh;
  background: linear-gradient(145deg, rgba(22, 18, 15, 0.96), rgba(12, 10, 8, 0.98));
  border: 1px solid rgba(212, 168, 68, 0.4);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 168, 68, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-align: left;
  animation: showcaseModalPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes showcaseModalPop {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.crew-showcase-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(212, 168, 68, 0.4);
  color: #e5b54f;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  max-width: 36px !important;
  max-height: 36px !important;
  aspect-ratio: 1 / 1 !important;
  border-radius: 50% !important;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  font-size: 16px;
  line-height: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer;
  z-index: 10;
  flex-shrink: 0 !important;
  transition: all 0.2s ease;
}

.crew-showcase-close-btn:hover {
  background: rgba(212, 168, 68, 0.25);
  border-color: #ffd700;
  color: #ffffff;
  transform: scale(1.08);
}

.crew-showcase-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  background: rgba(212, 168, 68, 0.05);
  border-bottom: 1px solid rgba(212, 168, 68, 0.2);
  transition: background 0.3s ease;
}

/* ── Class Specific Colorful Background Themes ── */

/* Summoner Theme (Ethereal Violet / Arcane Purple) */
.theme-summoner .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-summoner {
  background-color: #2e1065 !important;
  background-image: radial-gradient(circle at 50% 40%, #7e22ce 0%, #3b0764 65%, #0f0728 100%) !important;
  border-color: #c084fc !important;
  box-shadow: 0 6px 22px rgba(126, 34, 206, 0.65), 0 0 20px rgba(192, 132, 252, 0.4) !important;
}
.theme-summoner.crew-showcase-header {
  background: linear-gradient(135deg, rgba(88, 28, 135, 0.45) 0%, rgba(30, 10, 60, 0.6) 100%) !important;
  border-bottom-color: rgba(192, 132, 252, 0.35) !important;
}
.theme-summoner .crew-showcase-type-tag {
  background: rgba(168, 85, 247, 0.25) !important;
  border-color: rgba(192, 132, 252, 0.5) !important;
  color: #f3e8ff !important;
}

/* Soldier Theme (Royal Crimson / Bronze Armor) */
.theme-soldier .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-soldier {
  background-color: #450a0a !important;
  background-image: radial-gradient(circle at 50% 40%, #b91c1c 0%, #7f1d1d 65%, #2a0404 100%) !important;
  border-color: #fca5a5 !important;
  box-shadow: 0 6px 22px rgba(185, 28, 28, 0.65), 0 0 20px rgba(252, 165, 165, 0.4) !important;
}
.theme-soldier.crew-showcase-header {
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.45) 0%, rgba(45, 10, 10, 0.6) 100%) !important;
  border-bottom-color: rgba(252, 165, 165, 0.35) !important;
}
.theme-soldier .crew-showcase-type-tag {
  background: rgba(239, 68, 68, 0.25) !important;
  border-color: rgba(252, 165, 165, 0.5) !important;
  color: #ffe4e6 !important;
}

/* Monk Theme (Jade / Ethereal Cyan) */
.theme-monk .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-monk {
  background-color: #042f2e !important;
  background-image: radial-gradient(circle at 50% 40%, #0d9488 0%, #115e59 65%, #022c22 100%) !important;
  border-color: #5eead4 !important;
  box-shadow: 0 6px 22px rgba(13, 148, 136, 0.65), 0 0 20px rgba(94, 234, 212, 0.4) !important;
}
.theme-monk.crew-showcase-header {
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.45) 0%, rgba(4, 47, 46, 0.6) 100%) !important;
  border-bottom-color: rgba(94, 234, 212, 0.35) !important;
}
.theme-monk .crew-showcase-type-tag {
  background: rgba(20, 184, 166, 0.25) !important;
  border-color: rgba(94, 234, 212, 0.5) !important;
  color: #ccfbf1 !important;
}

/* Barbarian Theme (Primal Ember / Fire Crimson) */
.theme-barbarian .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-barbarian {
  background-color: #431407 !important;
  background-image: radial-gradient(circle at 50% 40%, #c2410c 0%, #7c2d12 65%, #270a03 100%) !important;
  border-color: #ff8456 !important;
  box-shadow: 0 6px 22px rgba(194, 65, 12, 0.65), 0 0 20px rgba(255, 132, 86, 0.4) !important;
}

/* Wizard Theme (Arcane Sapphire) */
.theme-wizard .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-wizard {
  background-color: #172554 !important;
  background-image: radial-gradient(circle at 50% 40%, #2563eb 0%, #1e40af 65%, #0f172a 100%) !important;
  border-color: #93c5fd !important;
  box-shadow: 0 6px 22px rgba(37, 99, 235, 0.65), 0 0 20px rgba(147, 197, 253, 0.4) !important;
}

/* Engineer Theme (Copper Amber) */
.theme-engineer .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-engineer {
  background-color: #451a03 !important;
  background-image: radial-gradient(circle at 50% 40%, #d97706 0%, #78350f 65%, #240d02 100%) !important;
  border-color: #fcd34d !important;
  box-shadow: 0 6px 22px rgba(217, 119, 6, 0.65), 0 0 20px rgba(252, 211, 77, 0.4) !important;
}

/* Ranger Theme (Forest Emerald) */
.theme-ranger .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-ranger {
  background-color: #052e16 !important;
  background-image: radial-gradient(circle at 50% 40%, #16a34a 0%, #14532d 65%, #021a0b 100%) !important;
  border-color: #86efac !important;
  box-shadow: 0 6px 22px rgba(22, 163, 74, 0.65), 0 0 20px rgba(134, 239, 172, 0.4) !important;
}

/* Sage Theme (Celestial Gold) */
.theme-sage .crew-showcase-portrait,
.selected-crew-avatar-wrapper.type-sage {
  background-color: #3f2c06 !important;
  background-image: radial-gradient(circle at 50% 40%, #ca8a04 0%, #713f12 65%, #1f1402 100%) !important;
  border-color: #fef08a !important;
  box-shadow: 0 6px 22px rgba(202, 138, 4, 0.65), 0 0 20px rgba(254, 240, 138, 0.4) !important;
}

.crew-showcase-portrait-container {
  position: relative;
}

.crew-showcase-portrait {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(212, 168, 68, 0.8);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8), 0 0 15px rgba(212, 168, 68, 0.2);
}

.crew-showcase-level-badge {
  position: absolute;
  bottom: -2px;
  right: -4px;
  background: #1c1917;
  color: #ffd700;
  border: 1px solid rgba(212, 168, 68, 0.5);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  z-index: 2 !important;
}

.crew-showcase-identity {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.crew-showcase-name {
  font-family: 'Cinzel', serif;
  font-size: 1.7rem;
  font-weight: 700;
  color: #f5f5f7;
  margin: 0;
  letter-spacing: 1px;
  text-shadow: 0 2px 6px rgba(0,0,0,0.8);
}

.crew-showcase-type-tag {
  display: inline-block;
  font-size: 0.8rem;
  color: #ffd700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
  background: rgba(212, 168, 68, 0.12);
  border: 1px solid rgba(212, 168, 68, 0.3);
  padding: 3px 12px;
  border-radius: 12px;
  width: fit-content;
}

.crew-showcase-body {
  padding: 16px 22px 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 12px;
  align-content: start;
}

.crew-showcase-panel {
  background: rgba(12, 10, 9, 0.65);
  border: 1px solid rgba(212, 168, 68, 0.18);
  border-radius: 10px;
  padding: 13px 16px;
}

.crew-showcase-panel.lore-panel {
  grid-column: 1;
  grid-row: 1;
}

.crew-showcase-panel.stats-panel {
  grid-column: 1;
  grid-row: 2;
}

.crew-showcase-panel.skills-panel {
  grid-column: 2;
  grid-row: 1;
}

.crew-showcase-panel.specialty-panel {
  grid-column: 2;
  grid-row: 2;
}

.crew-showcase-panel-title {
  font-family: 'Cinzel', serif;
  font-size: 0.92rem;
  color: #e5b54f;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(212, 168, 68, 0.15);
  padding-bottom: 6px;
}

.crew-showcase-lore-text {
  font-size: 0.82rem;
  line-height: 1.5;
  color: #d1d1d6;
  margin: 0;
  text-align: left;
  font-family: 'Outfit', sans-serif;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.crew-showcase-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.crew-showcase-stat-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 600;
  color: #c7c7cc;
  font-family: 'Outfit', sans-serif;
}

.stat-value {
  color: #ffd700;
  font-weight: 700;
}

.stat-bar-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.crew-showcase-skills-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.crew-showcase-skill-card {
  display: flex;
  gap: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 7px;
  padding: 7px 10px;
  align-items: center;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.crew-showcase-skill-card:hover {
  background: rgba(212, 168, 68, 0.08);
  border-color: rgba(212, 168, 68, 0.35);
}

.skill-card-icon {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  object-fit: cover;
  border: 1px solid rgba(212, 168, 68, 0.4);
  background: #000000;
  flex-shrink: 0;
}

.skill-card-icon-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  border: 1px solid rgba(212, 168, 68, 0.4);
  background: rgba(212, 168, 68, 0.15);
  color: #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.skill-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.skill-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-card-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f5f5f7;
  font-family: 'Outfit', sans-serif;
}

.skill-card-tag {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'Outfit', sans-serif;
}

.skill-card-tag.passive {
  background: rgba(69, 123, 157, 0.3);
  color: #a8dadc;
  border: 1px solid rgba(69, 123, 157, 0.5);
}

.skill-card-tag.active {
  background: rgba(230, 57, 70, 0.25);
  color: #ffb703;
  border: 1px solid rgba(230, 57, 70, 0.4);
}

.skill-card-desc {
  font-size: 0.72rem;
  color: #a1a1a6;
  margin: 1px 0 0 0;
  line-height: 1.3;
  text-align: left;
  font-family: 'Outfit', sans-serif;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Specialization Panel ── */

.specialty-panel {
  background: rgba(10, 8, 6, 0.7);
  border: 1px solid rgba(212, 168, 68, 0.22);
}

.specialty-panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.specialty-title-diamond {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #e5b54f;
  transform: rotate(45deg);
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(229, 181, 79, 0.6);
}

.specialty-locked-badge {
  margin-left: auto;
  font-family: 'Outfit', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fca5a5;
}

.specialty-lock-notice,
.specialty-prompt-notice {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  line-height: 1.4;
  margin: 0 0 8px 0;
  padding: 5px 9px;
  border-radius: 5px;
  text-align: left;
}

.specialty-lock-notice {
  color: #d1c4a8;
  background: rgba(239, 68, 68, 0.07);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.specialty-prompt-notice {
  color: #c0b08a;
  background: rgba(212, 168, 68, 0.07);
  border: 1px solid rgba(212, 168, 68, 0.18);
}

.specialty-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.specialty-card {
  background: rgba(22, 18, 14, 0.8);
  border: 1px solid rgba(212, 168, 68, 0.16);
  border-radius: 8px;
  padding: 9px 11px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 5px;
  position: relative;
  user-select: none;
}

.specialty-card:not(.locked):hover {
  background: rgba(212, 168, 68, 0.06);
  border-color: rgba(212, 168, 68, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5), 0 0 10px rgba(212, 168, 68, 0.08);
}

.specialty-card:not(.locked):focus-visible {
  outline: 2px solid rgba(212, 168, 68, 0.7);
  outline-offset: 2px;
}

.specialty-card.selected {
  background: rgba(212, 168, 68, 0.1);
  border-color: rgba(212, 168, 68, 0.7);
  box-shadow: 0 0 16px rgba(212, 168, 68, 0.18), inset 0 1px 0 rgba(255, 220, 120, 0.08);
}

.specialty-card.selected:not(.locked):hover {
  background: rgba(212, 168, 68, 0.14);
  border-color: #e5b54f;
  box-shadow: 0 0 20px rgba(212, 168, 68, 0.28);
}

.specialty-card.locked {
  cursor: default;
  opacity: 0.7;
  transform: none !important;
}

.specialty-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.specialty-card-name {
  font-family: 'Cinzel', serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: #c9a84c;
  letter-spacing: 0.3px;
  line-height: 1.2;
}

.specialty-card.selected .specialty-card-name {
  color: #ffd700;
}

.specialty-selected-mark {
  font-size: 0.9rem;
  color: #ffd700;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
}

.specialty-card-desc {
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  color: #9a9390;
  line-height: 1.35;
  margin: 0;
  text-align: left;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.specialty-card.selected .specialty-card-desc {
  color: #b8a88a;
}

.specialty-bonus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.specialty-bonus-tag {
  font-family: 'Outfit', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #c9932b;
  background: rgba(212, 168, 68, 0.1);
  border: 1px solid rgba(212, 168, 68, 0.25);
  border-radius: 10px;
  padding: 2px 8px;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.specialty-card.selected .specialty-bonus-tag {
  color: #e5b54f;
  background: rgba(212, 168, 68, 0.16);
  border-color: rgba(212, 168, 68, 0.4);
}

@media (max-width: 600px) {
  .specialty-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Selected Crew Leader Indicator ── */
.selected-crew-avatar-wrapper.is-leader {
  overflow: visible !important;
  box-shadow: 0 0 15px rgba(249, 177, 21, 0.3) !important;
}

.selected-crew-avatar-wrapper.is-leader::before {
  content: '';
  position: absolute;
  top: -12px; left: -12px; right: -12px; bottom: -12px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='none' stroke='%23ca8a04' stroke-width='0.5' stroke-dasharray='1 3'/%3E%3Ccircle cx='50' cy='50' r='45' fill='none' stroke='%23f9b115' stroke-width='0.75' stroke-dasharray='3 2'/%3E%3Cpath d='M 50 1 C 53 7, 56 4, 50 11 C 44 4, 47 7, 50 1 Z' fill='%23f9b115'/%3E%3Cpath d='M 50 99 C 53 93, 56 96, 50 89 C 44 96, 47 93, 50 99 Z' fill='%23f9b115'/%3E%3Cpath d='M 1 50 C 7 47, 4 44, 11 50 C 4 56, 7 53, 1 50 Z' fill='%23f9b115'/%3E%3Cpath d='M 99 50 C 93 47, 96 44, 89 50 C 93 56, 96 53, 99 50 Z' fill='%23f9b115'/%3E%3C/svg%3E");
  background-size: cover;
  background-position: center;
  border-radius: 50%;
  pointer-events: none;
  z-index: 10;
  animation: spin-slow 40s linear infinite;
}

@keyframes spin-slow {
  100% { transform: rotate(360deg); }
}

.selected-crew-avatar-wrapper.is-leader:hover {
  transform: translateY(-4px) scale(1.04) !important;
  box-shadow: 0 0 30px rgba(249, 177, 21, 0.5) !important;
}
`;

