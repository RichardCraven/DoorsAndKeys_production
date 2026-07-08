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


import { Route, Switch, Redirect} from "react-router-dom";
import { useEffect } from 'react';

import {updateUserRequest} from '../src/utils/api-handler'

import {getAllUsersRequest} from './utils/api-handler';
import {storeSessionData, getUserId, getMeta} from './utils/session-handler';
import { useHistory } from "react-router";
import * as images from '../src/utils/images'


function App(props) {
const [loggedIn, setLoggedIn] = useState(!!getUserId())
const [menuTrayExpanded, setMenuTrayExpanded] = useState(false)
// const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('isAdmin') === 'true' ? true : false)
const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem('isAdmin') === 'true' ? true : true)
const [showCoordinates, setShowCoordinates] = useState(false)
const [allUsers, setAllUsers] = useState([])
const [showToolbar, setShowToolbar] = useState(true)
const [narrativeSequenceType, setNarrativeSequenceType] = useState('')
const [isWakingServer, setIsWakingServer] = useState(true)
const dungeonMessagingRef = React.useRef(null)
const saveUserDataRef = React.useRef(null)
const history = useHistory();
useEffect(() => {
  window.pickRandom = (array) => {
    let index = Math.floor(Math.random() * array.length)
    return array[index]
  }
  setIsWakingServer(true)
  getAllUsersRequest()
    .then((response)=>{
      if (response && response.data) {
        setAllUsers(response.data)
      }
      setIsWakingServer(false)
    })
    .catch((err) => {
      console.error("Failed connecting to API database:", err)
      setIsWakingServer(false)
    })
  if(getUserId()){
    setLoggedIn(true)
  } else {
    setLoggedIn(false)
  }
}, [])
useEffect(()=>{
}, [allUsers])

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
  console.log('Login attempt - credentials:', userCredentials.username);
  console.log('Login - allUsers:', allUsers.map(u => ({ id: u._id, username: u.username })));
  allUsers.forEach((user)=>{
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
    setAllUsers(response.data);
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
  await updateUserRequest(userId, meta)
  sessionStorage.setItem('metadata', JSON.stringify(meta));
  if (dungeonMessagingRef.current) dungeonMessagingRef.current('Progress saved')
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
      {isWakingServer && (
        <div className="server-waking-overlay">
          <div className="waking-content">
            <div className="waking-spinner">
              <div className="runic-circle"></div>
              <span className="glowing-key" role="img" aria-label="Waking server">🔑</span>
            </div>
            <h2>Waking Up the Dungeon...</h2>
            <p>Connecting to the database. This may take up to a minute on our free tier while the portals align.</p>
            <div className="progress-bar-container">
              <div className="progress-bar-fill"></div>
            </div>
          </div>
        </div>
      )}
      <div className="App">
        {loggedIn === true && showToolbar === true && <div className="nav-buttons-container">
          <div className="hamburger-button" style={{backgroundImage: `url(${images['hamburger']})`}} onClick={() => toggleMenuTray()}></div>
          <div className={`menu-tray${menuTrayExpanded ? ' open' : ''}`} style={{
            border: menuTrayExpanded ? '1px solid lightgrey' : 'none'
          }}>
            <div className="menu-tray-content">
              <button className="menu-buttons logout-button" onClick={logout}>
                Logout
              </button>
              <button className="menu-buttons save-button" onClick={saveUserData}>
                Save
              </button>
              <button className="menu-buttons go-home-button" onClick={goHome}>
                Home
              </button>
              {isAdmin && <button className="menu-buttons show-coordinates-button" onClick={toggleShowCoordinates}>
                Show Coordinates
              </button>}
            </div>
          </div>
        </div> }
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
            <UserManagerPage {...props} />
            )}/>
          <Route exact path="/mapmaker" render={() => (
            !loggedIn ? <Redirect to="/login" /> :
              <MapmakerPage {...props} showCoordinates={showCoordinates}  />
          )}/>
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
