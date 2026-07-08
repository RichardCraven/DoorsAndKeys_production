import React from 'react'
import { Redirect } from 'react-router-dom';
import {storeMeta, getMeta, getUserName, getUserId, setUserName} from '../utils/session-handler';
import {
  loadDungeonRequest,
  deleteDungeonRequest,
  updateUserRequest
} from '../utils/api-handler';
class UserProfilePage extends React.Component{
  constructor(props){
    super(props)
    this.state = {
      dungeon: null,
      user: null,
      navToLanding: false,
      isClearing: false,
      clearSuccess: false,
      isEditingName: false,
      editedName: '',
      isSavingName: false,
      nameSaveSuccess: false
    }
  }

  componentWillMount(){
    console.log('component moiunted props:', this)
    // const userData = getMeta();
    
    this.getDungeonDetails();
  }

  getDungeonDetails = async () => {
    const user = getMeta();
    const username = getUserName();
    console.log('Profile page - getUserName():', username);
    console.log('Profile page - getMeta():', user);
    user.name = username;
    
    if(!user.dungeonId){
      this.setState({
        user,
        dungeon: null
      })
    } else {
      const res = await loadDungeonRequest(user.dungeonId)
      console.log('res:', res)
      const dungeon = res.data.length > 0 ? JSON.parse(res.data[0].content) : null
      console.log('dungeon:', dungeon)
      this.setState({
        user,
        dungeon
      })
    }
    // console.log('state:', )
  }
  
  startEditingName = () => {
    this.setState({
      isEditingName: true,
      editedName: this.state.user?.name || ''
    });
  }
  
  cancelEditingName = () => {
    this.setState({
      isEditingName: false,
      editedName: ''
    });
  }
  
  saveUserName = async () => {
    const { editedName } = this.state;
    if (!editedName.trim()) return;
    
    this.setState({ isSavingName: true });
    
    try {
      const meta = getMeta();
      await updateUserRequest(getUserId(), meta, editedName.trim());
      setUserName(editedName.trim());
      
      // Refresh the users list so login uses updated username
      if (this.props.refreshAllUsers) {
        this.props.refreshAllUsers();
      }
      
      this.setState({
        user: { ...this.state.user, name: editedName.trim() },
        isEditingName: false,
        editedName: '',
        isSavingName: false,
        nameSaveSuccess: true
      });
      
      setTimeout(() => this.setState({ nameSaveSuccess: false }), 2000);
    } catch (e) {
      console.error('Failed to save username:', e);
      this.setState({ isSavingName: false });
    }
  }
  
  clearDungeon = async () => {
    console.log('clearing dungeon', this.state.dungeon)
    this.setState({ isClearing: true, clearSuccess: false });
    
    let meta = getMeta();
    if(this.state.dungeon){
      await deleteDungeonRequest(meta.dungeonId)

      this.props.boardManager.dungeon.id = null;
      this.props.inventoryManager.inventory = [];

            // clear dungeon and crew
            meta.dungeonId = null;
            meta.location = null
            meta.inventory = { 
              items: [], 
              gold: 0,
              shimmering_dust: 0,
              totems: 0
            }
            // also clear crew when clearing the dungeon
            meta.crew = [];
            try { this.props.crewManager.initializeCrew([]); } catch(e) { try { this.props.crewManager.crew = []; } catch(e) {} }
      await updateUserRequest(getUserId(), meta)
      storeMeta(meta);
      
      setTimeout(()=>{
        this.getDungeonDetails();
        this.setState({ isClearing: false, clearSuccess: true });
        setTimeout(() => this.setState({ clearSuccess: false }), 2000);
      })
    } else {
      console.log('no state dungeon, second block');
      meta.dungeonId = null;
      meta.location = null
      meta.inventory = { 
        items: [], 
        gold: 0,
        shimmering_dust: 0,
        totems: 0
      }
      // also clear crew when clearing the dungeon
      meta.crew = [];
      try { this.props.crewManager.initializeCrew([]); } catch(e) { try { this.props.crewManager.crew = []; } catch(e) {} }
      await updateUserRequest(getUserId(), meta)
      storeMeta(meta);
      
      setTimeout(()=>{
        this.getDungeonDetails();
        this.setState({ isClearing: false, clearSuccess: true });
        setTimeout(() => this.setState({ clearSuccess: false }), 2000);
        console.log('meta: ', getMeta());
      })
    }
  }
  render(){
    const { user, dungeon, isClearing, clearSuccess, navToLanding, isEditingName, editedName, isSavingName, nameSaveSuccess } = this.state;
    
    return (
      <div className="landing-pane pane user-profile-page">
        { navToLanding && <Redirect to="/landing" /> }
        
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar-circle">
              {(isEditingName ? editedName : user?.name)?.charAt(0)?.toUpperCase() || '?'}
            </div>
            
            {isEditingName ? (
              <div className="name-edit-container">
                <input
                  type="text"
                  className="name-input"
                  value={editedName}
                  onChange={(e) => this.setState({ editedName: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && this.saveUserName()}
                  autoFocus
                  placeholder="Enter username"
                />
                <div className="name-edit-actions">
                  <button 
                    className={`name-btn save-name-btn ${isSavingName ? 'loading' : ''}`}
                    onClick={this.saveUserName}
                    disabled={isSavingName || !editedName.trim()}
                  >
                    {isSavingName ? <span className="spinner"></span> : '✓'}
                  </button>
                  <button 
                    className="name-btn cancel-name-btn"
                    onClick={this.cancelEditingName}
                    disabled={isSavingName}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="name-display-container">
                <h1 className={`profile-name ${nameSaveSuccess ? 'success-flash' : ''}`}>
                  {user?.name || (user ? 'Unknown User' : 'Loading...')}
                </h1>
                <button 
                  className="edit-name-btn"
                  onClick={this.startEditingName}
                  title="Edit username"
                >
                  ✎
                </button>
              </div>
            )}
          </div>
          
          <div className="profile-section">
            <div className="section-label">Current Dungeon</div>
            <div className="section-value">
              {dungeon?.name || <span className="no-dungeon">No active dungeon</span>}
            </div>
          </div>
          
          <div className="profile-actions">
            <button 
              className={`profile-btn clear-btn ${isClearing ? 'loading' : ''} ${clearSuccess ? 'success' : ''}`}
              onClick={() => this.clearDungeon()}
              disabled={isClearing}
            >
              {isClearing ? (
                <span className="btn-content">
                  <span className="spinner"></span>
                  Clearing...
                </span>
              ) : clearSuccess ? (
                <span className="btn-content">
                  <span className="checkmark">✓</span>
                  Cleared!
                </span>
              ) : (
                'Clear Dungeon'
              )}
            </button>
            <button 
              className="profile-btn back-btn"
              onClick={() => this.setState({navToLanding: true})}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default UserProfilePage;