import React, {useState} from 'react';
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


import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import { useEffect } from 'react';

import {updateUserRequest} from '../src/utils/api-handler'

import {getAllUsersRequest} from './utils/api-handler';
import {storeSessionData, getUserId, getMeta} from './utils/session-handler';
import { useHistory } from "react-router";
import loadingGif from './assets/highres-gifs/gifOne.gif';


function App(props) {
const location = useLocation();
const isMapmaker = location.pathname === '/mapmaker';
const [loggedIn, setLoggedIn] = useState(!!getUserId())
const [menuTrayExpanded, setMenuTrayExpanded] = useState(false)
const [hoveredMenuItem, setHoveredMenuItem] = useState(null)
const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('isAdmin') === 'true' ? true : false)
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
  // Pre-load the high-res loading animation GIF so it is ready in cache
  const img = new Image();
  img.src = loadingGif;

  window.pickRandom = (array) => {
    let index = Math.floor(Math.random() * array.length)
    return array[index]
}
  getAllUsersRequest().then((response)=>{
    setAllUsers(Array.isArray(response?.data) ? response.data : [])
    setServerLoading(false)
  }).catch((err) => {
    console.error("Failed to load initial users:", err);
    setServerLoading(false);
  })
  if(getUserId()){
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


const logout = () => {
  saveUserData();
  sessionStorage.clear()
  refreshAllUsers()
  setLoggedIn(false)
  return <Redirect to="/login" />
}
const loginFromRegister = (user) => {
  // ...existing code...
  // ...existing code...
  setTimeout(()=>{
  // ...existing code...
    storeSessionData(user._id, user.token, user.isAdmin, user.username, user.metadata)
    setLoggedIn(true)
    setIsAdmin(JSON.parse(sessionStorage.getItem('isAdmin') === 'true' ))
    navToLanding()
  }, 500)
}
const navToLanding = () =>{
  history.push({
    pathname: '/landing'
  })
}
const login = (userCredentials) => {
  let validUser = null;
  const users = Array.isArray(allUsers) ? allUsers : [];
  console.log('Login attempt - credentials:', userCredentials.username);
  console.log('Login - allUsers:', users.map(u => ({ id: u._id, username: u.username })));
  users.forEach((user)=>{
      if(userCredentials.username === user.username && userCredentials.password === user.password ){
          validUser = user;
      }
  })
  if(validUser){
    console.log('Login success - validUser.username:', validUser.username);
    // setUser(validUser)
    setTimeout(()=>{
      storeSessionData(validUser._id, validUser.token, validUser.isAdmin, validUser.username, validUser.metadata)
      setLoggedIn(true)
      setIsAdmin(JSON.parse(sessionStorage.getItem('isAdmin') === 'true' ))
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
  getAllUsersRequest().then((response)=>{
    setAllUsers(Array.isArray(response?.data) ? response.data : []);
  })
}

const saveUserData = async () => {
  // ...existing code...
  setMenuTrayExpanded(false);
  if(!props.boardManager.dungeon || !props.boardManager.dungeon.id) return
  if(!props.boardManager.playerTile || !props.boardManager.playerTile.location) return
  const meta = getMeta()
  const userId = getUserId();

  let boardIndex = props.boardManager.getBoardIndexFromBoard(props.boardManager.currentBoard)
  // return
  meta.location = {
    boardIndex,
    tileIndex: props.boardManager.getIndexFromCoordinates(props.boardManager.playerTile.location) ,
    levelId: props.boardManager.currentLevel.id,
    orientation: props.boardManager.currentOrientation
  }
  meta.inventory = { 
    items: props.inventoryManager.inventory, 
    gold: props.inventoryManager.gold,
    shimmering_dust: props.inventoryManager.shimmering_dust,
    totems: props.inventoryManager.totems
  }
  if(props.crewManager.crew.length === 0){
    // Crew is empty — this is expected after a final death wipe. Skip saving.
    return
  }
  meta.crew = props.crewManager.crew;
  meta.dungeonId = props.boardManager.dungeon.id;
  if (dungeonMessagingRef.current) {
    try {
      dungeonMessagingRef.current('saving-start');
    } catch (e) {}
  }
  try {
    await updateUserRequest(userId, meta);
    sessionStorage.setItem('metadata', JSON.stringify(meta));
    if (dungeonMessagingRef.current) {
      try {
        dungeonMessagingRef.current('Progress saved');
      } catch (e) {}
    }
  } catch (err) {
    console.error("Failed to save user data:", err);
    if (dungeonMessagingRef.current) {
      try {
        dungeonMessagingRef.current('saving-error');
      } catch (e) {}
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
  if(type === 'death'){
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
      {showWakingOverlay && (
        <div className={`server-waking-overlay ${!serverLoading ? 'fade-out' : ''}`}>
          <div className="server-waking-card">
            <h2 className="server-waking-title">Arising from Slumber</h2>
            <div className="server-waking-gif-container">
              <img src={loadingGif} className="server-waking-gif" alt="Waking up..." />
            </div>
            <p className="server-waking-desc">
              The game server is waking up. Render's free tier backend spins down during inactivity, taking up to 50 seconds to arise.
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
            top: '12px',
            left: '12px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: isMapmaker ? 'row' : 'column',
            alignItems: isMapmaker ? 'center' : 'flex-start',
            gap: '6px'
          }}>
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
                style={{
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
                }}
                title="Logout"
              >
                <span style={{ fontSize: '15px' }}>🚪</span>
              </button>

              {location.pathname !== '/userProfilePage' && (
                <button 
                  className="menu-buttons save-button" 
                  onClick={saveUserData}
                  onMouseEnter={() => setHoveredMenuItem('Save Game')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  style={{
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
                  }}
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
                style={{
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
                }}
                title="Home"
              >
                <span style={{ fontSize: '15px' }}>🏠</span>
              </button>

              {/* {isAdmin && (
                <button 
                  className="menu-buttons show-coordinates-button" 
                  onClick={toggleShowCoordinates}
                  onMouseEnter={() => setHoveredMenuItem('Toggle Coordinates')}
                  onMouseLeave={() => setHoveredMenuItem(null)}
                  style={{
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
                  }}
                  title="Toggle Coordinates"
                >
                  <span style={{ fontSize: '15px' }}>🧭</span>
                </button>
              )} */}
            </div>

            {/* Hover display label */}
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
          </div>
        )}
        <Switch>
          <Route exact path="/login" render={() => (
            <LoginPage {...props} login={login} loginFromRegister={(e) => loginFromRegister(e)} refreshAllUsers={(e) => refreshAllUsers(e)}/>
          )}/>
          <Route exact path="/intro" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
            <NarrativeSequence {...props} sequenceType={narrativeSequenceType} beginIntroSequence={beginIntroSequence} endIntroSequence={endIntroSequence}/>
          )}/>
          <Route exact path="/death" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
            narrativeSequenceType !== 'death' ? <Redirect to="/landing" /> :
            <NarrativeSequence {...props} sequenceType={narrativeSequenceType} beginDeathSequence={beginDeathSequence} endDeathSequence={endDeathSequence}/>
          )}/>
          <Route exact path="/userProfilePage" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
            <UserProfilePage {...props} refreshAllUsers={refreshAllUsers} />
          )}/>
          <Route exact path="/crewManager" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
            <CrewManagerPage {...props} />
          )}/>
          <Route exact path="/combatSimulator" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
            <CombatSimulator {...props} navToLanding={navToLanding} />
          )}/>
          <Route exact path="/dungeon" render={() => {
            if (!loggedIn) return <Redirect to="/login" />;
            const meta = getMeta();
            const hasCrew = Array.isArray(meta && meta.crew) && meta.crew.length > 0;
            if (!hasCrew) return <Redirect to="/crewManager" />;
            return <DungeonPage {...props} saveUserData={saveUserData} setNarrativeSequence={setNarrativeSequence} showCoordinates={showCoordinates} registerMessaging={(fn) => { dungeonMessagingRef.current = fn }}/>;
          }}/>


          <Route exact path="/landing" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
            <LandingPage {...props} setNarrativeSequence={setNarrativeSequence} beginIntroSequence={beginIntroSequence} endIntroSequence={endIntroSequence}/>
          )}/>

          {/* <Route exact path="/landing" component={LandingPage}>
            {!loggedIn && <Redirect to="/login" /> }
          </Route>  */}


          
          <Route exact path="/usermanager" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
            <UserManagerPage {...props} navToLanding={navToLanding} />
            )}/>
          <Route exact path="/mapmaker" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <MapmakerPage {...props} showCoordinates={showCoordinates}  />
          )}/>
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
