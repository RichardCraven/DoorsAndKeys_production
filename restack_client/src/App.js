import React, { useState } from 'react';
import './App.scss';
import LoginPage from './pages/LoginPage'

import NarrativeSequence from './pages/NarrativeSequence'
import LandingPage from './pages/LandingPage'
import DungeonPage from './pages/DungeonPage'
import MapmakerPage from './pages/MapmakerPage'
import UserManagerPage from './pages/UserManagerPage'
import UserProfilePage from './pages/UserProfilePage'
import CrewManagerPage from './pages/CrewManagerPage'
import CombatSimulator from './pages/CombatSimulator'
import SandboxPage from './pages/SandboxPage'
import TutorialsPage from './pages/TutorialsPage'


import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import { useEffect } from 'react';

import { updateUserRequest } from '../src/utils/api-handler'

import { getAllUsersRequest } from './utils/api-handler';
import { storeSessionData, getUserId, getMeta } from './utils/session-handler';
import { useHistory } from "react-router";
import gifOne from './assets/highres-gifs/gifOne.gif';
import gifTwo from './assets/highres-gifs/gifTwo.gif';


function App(props) {
  const [currentLoadingGif] = useState(() => Math.random() < 0.5 ? gifOne : gifTwo);
  const location = useLocation();
  const isMapmaker = location.pathname === '/mapmaker';
  const [loggedIn, setLoggedIn] = useState(!!getUserId())
  const [menuTrayExpanded, setMenuTrayExpanded] = useState(false)
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null)

  const [isMobileWidth, setIsMobileWidth] = useState(window.innerWidth <= 1024);
  const [mobileMenuExpanded, setMobileMenuExpanded] = useState(false);
  const [isCombatActive, setIsCombatActive] = useState(document.body.classList.contains('combat-active'));

  useEffect(() => {
    const handleResize = () => setIsMobileWidth(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsCombatActive(document.body.classList.contains('combat-active'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const desktopMenuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 8px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  };

  const mobileMenuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255, 255, 255, 0.15)',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  };
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true' ? true : false)
  const [showCoordinates, setShowCoordinates] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [showToolbar, setShowToolbar] = useState(true)
  const [narrativeSequenceType, setNarrativeSequenceType] = useState('')
  const [serverLoading, setServerLoading] = useState(true)
  const [showWakingOverlay, setShowWakingOverlay] = useState(true)
  const dungeonMessagingRef = React.useRef(null)
  const saveUserDataRef = React.useRef(null)
  const history = useHistory();
  useEffect(() => {
    // Pre-load the high-res loading animation GIFs so they are ready in cache
    const img1 = new Image();
    img1.src = gifOne;
    const img2 = new Image();
    img2.src = gifTwo;

    window.pickRandom = (array) => {
      let index = Math.floor(Math.random() * array.length)
      return array[index]
    }
    getAllUsersRequest().then((response) => {
      setAllUsers(Array.isArray(response?.data) ? response.data : [])
      setServerLoading(false)
    }).catch((err) => {
      console.error("Failed to load initial users:", err);
      setServerLoading(false);
    })
    if (getUserId()) {
      setLoggedIn(true)
    } else {
      setLoggedIn(false)
    }
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('loaded');
    }
  }, [])

  useEffect(() => {
    if (!serverLoading) {
      const timer = setTimeout(() => {
        setShowWakingOverlay(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [serverLoading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (saveUserDataRef.current) saveUserDataRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [])

  useEffect(() => {
    let touchStartY = 0;
    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].pageY;
      }
    };
    const handleTouchMove = (e) => {
      if (e.touches.length === 0) return;
      const y = e.touches[0].pageY;
      if (y > touchStartY) {
        let el = e.target;
        let canScrollUp = false;
        while (el && el !== document) {
          if (el.scrollTop > 0) {
            canScrollUp = true;
            break;
          }
          el = el.parentNode;
        }
        if (!canScrollUp) {
          if (e.cancelable) e.preventDefault();
        }
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);


  const logout = () => {
    saveUserData();
    localStorage.clear()
    refreshAllUsers()
    setLoggedIn(false)
    return <Redirect to="/login" />
  }
  const loginFromRegister = (user) => {
    // ...existing code...
    // ...existing code...
    setTimeout(() => {
      // ...existing code...
      storeSessionData(user._id, user.token, user.isAdmin, user.username, user.metadata)
      setLoggedIn(true)
      setIsAdmin(JSON.parse(localStorage.getItem('isAdmin') === 'true'))
      navToLanding()
    }, 500)
  }
  const navToLanding = () => {
    history.push({
      pathname: '/landing'
    })
  }
  const login = (userCredentials) => {
    let validUser = null;
    const users = Array.isArray(allUsers) ? allUsers : [];
    console.log('Login attempt - credentials:', userCredentials.username);
    console.log('Login - allUsers:', users.map(u => ({ id: u._id, username: u.username })));
    users.forEach((user) => {
      if (userCredentials.username === user.username && userCredentials.password === user.password) {
        validUser = user;
      }
    })
    if (validUser) {
      console.log('Login success - validUser.username:', validUser.username);
      // setUser(validUser)
      setTimeout(() => {
        storeSessionData(validUser._id, validUser.token, validUser.isAdmin, validUser.username, validUser.metadata)
        setLoggedIn(true)
        setIsAdmin(JSON.parse(localStorage.getItem('isAdmin') === 'true'))
        history.push({
          pathname: '/landing'
        })
      })
      return true;
    } else {
      // ...existing code...
    }
    return false;
  }

  const refreshAllUsers = () => {
    getAllUsersRequest().then((response) => {
      setAllUsers(Array.isArray(response?.data) ? response.data : []);
    })
  }

  const saveUserData = async () => {
    // ...existing code...
    setMenuTrayExpanded(false);
    if (!props.boardManager.dungeon || !props.boardManager.dungeon.id) return
    if (!props.boardManager.playerTile || !props.boardManager.playerTile.location) return
    const meta = getMeta()
    const userId = getUserId();

    let boardIndex = props.boardManager.getBoardIndexFromBoard(props.boardManager.currentBoard)
    // return
    meta.location = {
      boardIndex,
      tileIndex: props.boardManager.getIndexFromCoordinates(props.boardManager.playerTile.location),
      levelId: props.boardManager.currentLevel.id,
      orientation: props.boardManager.currentOrientation
    }
    meta.inventory = {
      items: props.inventoryManager.inventory,
      gold: props.inventoryManager.gold,
      shimmering_dust: props.inventoryManager.shimmering_dust,
      totems: props.inventoryManager.totems
    }
    if (props.crewManager.crew.length === 0) {
      // Crew is empty — this is expected after a final death wipe. Skip saving.
      return
    }
    meta.crew = props.crewManager.crew;
    meta.dungeonId = props.boardManager.dungeon.id;
    if (dungeonMessagingRef.current) {
      try {
        dungeonMessagingRef.current('saving-start');
      } catch (e) { }
    }
    try {
      await updateUserRequest(userId, meta);
      localStorage.setItem('metadata', JSON.stringify(meta));
      if (dungeonMessagingRef.current) {
        try {
          dungeonMessagingRef.current('Progress saved');
        } catch (e) { }
      }
    } catch (err) {
      console.error("Failed to save user data:", err);
      if (dungeonMessagingRef.current) {
        try {
          dungeonMessagingRef.current('saving-error');
        } catch (e) { }
      }
    }
  }
  saveUserDataRef.current = saveUserData;
  const goHome = () => {
    setMenuTrayExpanded(false);
    saveUserData();
    history.push({
      pathname: '/landing'
    })
  }
  const toggleShowCoordinates = () => {
    setMenuTrayExpanded(false);
    setShowCoordinates(!showCoordinates)
  }
  const setNarrativeSequence = (type) => {
    setNarrativeSequenceType(type)
    if (type === 'death') {
      beginDeathSequence()
    }
  }
  const beginIntroSequence = () => {
    setShowToolbar(false);
  }
  const endIntroSequence = () => {
    // ...existing code...
    setShowToolbar(true);
  }
  const beginDeathSequence = () => {
    setShowToolbar(false);
  }
  const endDeathSequence = () => {
    setShowToolbar(true);
  }
  const toggleMenuTray = () => {
    let expanded = menuTrayExpanded;
    setMenuTrayExpanded(!expanded)
  }
  return (
    <div className="fullpage">
      <div className="rotate-overlay">
        <div className="rotate-card">
          <div className="rotate-icon-container">📱🔄</div>
          <h2 className="rotate-title">Please Rotate Your Device</h2>
          <p className="rotate-desc">
            This experience is designed to be played in landscape mode. Please turn your device horizontally to continue.
          </p>
        </div>
      </div>
      {showWakingOverlay && (
        <div className={`server-waking-overlay ${!serverLoading ? 'fade-out' : ''}`}>
          <div className="server-waking-card">
            <h2 className="server-waking-title">Abide</h2>
            <div className="server-waking-gif-container">
              <img src={currentLoadingGif} className="server-waking-gif" alt="Waking up..." />
            </div>
            <p className="server-waking-desc">
              The game server is waking up...
            </p>
            <div className="server-waking-progress-container">
              <div className="server-waking-progress-bar" />
            </div>
          </div>
        </div>
      )}
      <div className="App">
        {loggedIn === true && showToolbar === true && location.pathname !== '/landing' && location.pathname !== '/' && (
          <div className="horizontal-menu-wrapper" style={{
            position: 'fixed',
            top: isMobileWidth ? '36px' : '12px',
            left: isMobileWidth ? '10px' : '12px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '6px'
          }}>
            {isMobileWidth ? (
              // Mobile View: Single toggle button with dropdown
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMobileMenuExpanded(!mobileMenuExpanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    border: 'none',
                    background: 'transparent',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                  title="Menu"
                >
                  {mobileMenuExpanded ? '✕' : '☰'}
                </button>
                {mobileMenuExpanded && (
                  <div style={{
                    position: 'absolute',
                    top: '28px',
                    left: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    padding: '6px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
                    zIndex: 10000
                  }}>
                    <button
                      className="menu-buttons logout-button"
                      onClick={() => { setMobileMenuExpanded(false); logout(); }}
                      style={mobileMenuItemStyle}
                      title="Logout"
                    >
                      <span>🚪</span>
                    </button>
                    {location.pathname !== '/userProfilePage' && location.pathname !== '/combatSimulator' && !isCombatActive && (
                      <button
                        className="menu-buttons save-button"
                        onClick={() => { setMobileMenuExpanded(false); saveUserData(); }}
                        style={mobileMenuItemStyle}
                        title="Save Game"
                      >
                        <span>💾</span>
                      </button>
                    )}
                    <button
                      className="menu-buttons go-home-button"
                      onClick={() => { setMobileMenuExpanded(false); goHome(); }}
                      style={mobileMenuItemStyle}
                      title="Home"
                    >
                      <span>🏠</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Desktop View: Original horizontal menu
              <div className="horizontal-menu-container" style={{
                display: 'flex',
                flexDirection: isMapmaker ? 'column' : 'row',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                padding: isMapmaker ? '8px 4px' : '4px 8px',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                pointerEvents: 'auto'
              }}>
                <button
                  className="menu-buttons logout-button"
                  onClick={logout}
                  onMouseEnter={() => setHoveredMenuItem('Logout')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  style={desktopMenuItemStyle}
                  title="Logout"
                >
                  <span style={{ fontSize: '15px' }}>🚪</span>
                </button>

                {location.pathname !== '/userProfilePage' && location.pathname !== '/combatSimulator' && !isCombatActive && (
                  <button
                    className="menu-buttons save-button"
                    onClick={saveUserData}
                    onMouseEnter={() => setHoveredMenuItem('Save Game')}
                    onMouseLeave={() => setHoveredMenuItem(null)}
                    style={desktopMenuItemStyle}
                    title="Save Game"
                  >
                    <span style={{ fontSize: '15px' }}>💾</span>
                  </button>
                )}

                <button
                  className="menu-buttons go-home-button"
                  onClick={goHome}
                  onMouseEnter={() => setHoveredMenuItem('Home')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  style={desktopMenuItemStyle}
                  title="Home"
                >
                  <span style={{ fontSize: '15px' }}>🏠</span>
                </button>
              </div>
            )}

            {/* Hover display label (Only in desktop view) */}
            {!isMobileWidth && (
              <div style={{
                height: '16px',
                paddingLeft: isMapmaker ? '0' : '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#f9b115',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                textAlign: 'left',
                transition: 'opacity 0.15s ease',
                opacity: hoveredMenuItem ? 1 : 0,
                whiteSpace: 'nowrap'
              }}>
                {hoveredMenuItem || ''}
              </div>
            )}
          </div>
        )}
        <Switch>
          <Route exact path="/login" render={() => (
            <LoginPage {...props} login={login} loginFromRegister={(e) => loginFromRegister(e)} refreshAllUsers={(e) => refreshAllUsers(e)} />
          )} />
          <Route exact path="/intro" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <NarrativeSequence {...props} sequenceType={narrativeSequenceType} beginIntroSequence={beginIntroSequence} endIntroSequence={endIntroSequence} />
          )} />
          <Route exact path="/death" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              narrativeSequenceType !== 'death' ? <Redirect to="/landing" /> :
                <NarrativeSequence {...props} sequenceType={narrativeSequenceType} beginDeathSequence={beginDeathSequence} endDeathSequence={endDeathSequence} />
          )} />
          <Route exact path="/userProfilePage" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <UserProfilePage {...props} refreshAllUsers={refreshAllUsers} />
          )} />
          <Route exact path="/crewManager" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <CrewManagerPage {...props} />
          )} />
          <Route exact path="/combatSimulator" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <CombatSimulator {...props} navToLanding={navToLanding} />
          )} />
          <Route exact path="/dungeon" render={() => {
            if (!loggedIn) return <Redirect to="/login" />;
            const meta = getMeta();
            const hasCrew = Array.isArray(meta && meta.crew) && meta.crew.length > 0;
            if (!hasCrew) return <Redirect to="/crewManager" />;
            return <DungeonPage {...props} saveUserData={saveUserData} setNarrativeSequence={setNarrativeSequence} showCoordinates={showCoordinates} registerMessaging={(fn) => { dungeonMessagingRef.current = fn }} />;
          }} />


          <Route exact path="/landing" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <LandingPage {...props} setNarrativeSequence={setNarrativeSequence} beginIntroSequence={beginIntroSequence} endIntroSequence={endIntroSequence} />
          )} />
          <Route exact path="/tutorials" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <TutorialsPage {...props} />
          )} />

          {/* <Route exact path="/landing" component={LandingPage}>
            {!loggedIn && <Redirect to="/login" /> }
          </Route>  */}



          <Route exact path="/usermanager" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <UserManagerPage {...props} navToLanding={navToLanding} />
          )} />
          <Route exact path="/mapmaker" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <MapmakerPage {...props} showCoordinates={showCoordinates} />
          )} />
          <Route exact path="/sandbox" component={SandboxPage} />
          <Route path="/">
            {loggedIn ? <Redirect to="/landing" /> :
              <Redirect to="/login" />}
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default App;
