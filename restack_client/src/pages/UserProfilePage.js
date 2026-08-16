import React from 'react'
import { Redirect } from 'react-router-dom';
import {storeMeta, getMeta, getUserName, getUserId, setUserName} from '../utils/session-handler';
import {
  loadDungeonRequest,
  deleteDungeonRequest,
  updateUserRequest
} from '../utils/api-handler';
import FreeWillStatBar from '../components/FreeWillStatBar';
import { USER_PERKS_POOL, getUserPerks } from '../utils/user-perks';
import * as images from '../utils/images';

class UserProfilePage extends React.Component{
  constructor(props){
    super(props)
    this.state = {
      dungeon: null,
      user: null,
      navToLanding: false,
      isClearing: false,
      clearSuccess: false,
      isClearingCrew: false,
      clearCrewSuccess: false,
      isLeaving: false,
      leaveSuccess: false,
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
  
  resetResourcesAndKeepItems = (meta) => {
    const resourceKeys = ['wood', 'lumber', 'mushrooms', 'mushroom', 'stone', 'ore', 'slate'];

    if (this.props.inventoryManager) {
      if (Array.isArray(this.props.inventoryManager.inventory)) {
        this.props.inventoryManager.inventory = this.props.inventoryManager.inventory.filter(item => {
          if (!item) return false;
          const k = String(item._im_key || item.id || item.name || item.type || item.subtype || '').toLowerCase();
          return !resourceKeys.some(rk => k === rk || k.includes(rk));
        });
      }
      this.props.inventoryManager.gold = 0;
      this.props.inventoryManager.shimmering_dust = 0;
      this.props.inventoryManager.totems = 0;
    }

    meta.food = 0;
    meta.inventory = {
      items: (this.props.inventoryManager && Array.isArray(this.props.inventoryManager.inventory))
        ? [...this.props.inventoryManager.inventory]
        : (meta.inventory?.items || []).filter(item => {
            if (!item) return false;
            const k = String(item._im_key || item.id || item.name || item.type || item.subtype || '').toLowerCase();
            return !resourceKeys.some(rk => k === rk || k.includes(rk));
          }),
      gold: 0,
      shimmering_dust: 0,
      totems: 0
    };

    delete meta.activatedGenerators;
    delete meta.disabledOutposts;
    delete meta.failedMonolithActivations;
  };

  clearDungeon = async () => {
    console.log('clearing dungeon', this.state.dungeon);
    this.setState({ isClearing: true, clearSuccess: false });
    
    let meta = getMeta() || {};
    if (meta.dungeonId) {
      try { await deleteDungeonRequest(meta.dungeonId); } catch (e) {}
    }

    if (this.props.boardManager && this.props.boardManager.dungeon) {
      this.props.boardManager.dungeon.id = null;
    }

    meta.dungeonId = null;
    meta.location = null;

    this.resetResourcesAndKeepItems(meta);

    // Revive and keep crew intact with all their equipped items & stats
    if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
      this.props.crewManager.crew.forEach(c => {
        if (c) {
          c.hp = c.starting_hp || (c.stats ? c.stats.hp : 10);
          c.dead = false;
        }
      });
      meta.crew = this.props.crewManager.crew;
      try { this.props.crewManager.initializeCrew(meta.crew); } catch (e) {}
    }

    await updateUserRequest(getUserId(), meta);
    storeMeta(meta);
    
    setTimeout(() => {
      this.getDungeonDetails();
      this.setState({ isClearing: false, clearSuccess: true });
      setTimeout(() => this.setState({ clearSuccess: false }), 2000);
    });
  }

  leaveDungeon = async () => {
    console.log('leaving dungeon', this.state.dungeon);
    this.setState({ isLeaving: true, leaveSuccess: false });
    
    let meta = getMeta() || {};
    if (meta.dungeonId) {
      try { await deleteDungeonRequest(meta.dungeonId); } catch (e) {}
    }

    if (this.props.boardManager && this.props.boardManager.dungeon) {
      this.props.boardManager.dungeon.id = null;
    }

    meta.dungeonId = null;
    meta.location = null;

    this.resetResourcesAndKeepItems(meta);

    // Revive and keep crew intact with all their equipped items & stats
    if (this.props.crewManager && Array.isArray(this.props.crewManager.crew)) {
      this.props.crewManager.crew.forEach(c => {
        if (c) {
          c.hp = c.starting_hp || (c.stats ? c.stats.hp : 10);
          c.dead = false;
        }
      });
      meta.crew = this.props.crewManager.crew;
      try { this.props.crewManager.initializeCrew(meta.crew); } catch (e) {}
    }

    await updateUserRequest(getUserId(), meta);
    storeMeta(meta);
    
    setTimeout(() => {
      this.getDungeonDetails();
      this.setState({ isLeaving: false, leaveSuccess: true, navToLanding: true });
    });
  }

  clearCrew = async () => {
    console.log('clearing crew');
    this.setState({ isClearingCrew: true, clearCrewSuccess: false });
    
    let meta = getMeta();
    meta.crew = [];
    
    if (this.props.crewManager) {
      try {
        this.props.crewManager.initializeCrew([]);
      } catch(e) {
        try { this.props.crewManager.crew = []; } catch(err) {}
      }
    }

    await updateUserRequest(getUserId(), meta);
    storeMeta(meta);

    setTimeout(() => {
      this.getDungeonDetails();
      this.setState({ isClearingCrew: false, clearCrewSuccess: true });
      setTimeout(() => this.setState({ clearCrewSuccess: false }), 2000);
    });
  }
  render(){
    const { user, dungeon, isClearing, clearSuccess, navToLanding, isEditingName, editedName, isSavingName, nameSaveSuccess } = this.state;
    
    return (
      <div className="landing-pane pane user-profile-page">
        { navToLanding && <Redirect to="/landing" /> }
        
        <div className="profile-card">
          <div className="profile-column">
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

          {/* Free Will User Level Stat Bar */}
          <div style={{ padding: '0 20px 20px 20px', width: '100%', boxSizing: 'border-box' }}>
            <FreeWillStatBar freeWill={getMeta()?.freeWill || 0} animateOnMount={true} delayMs={300} />
          </div>

          {/* Active User Perks Section */}
          {(() => {
            const perkIds = getUserPerks(getMeta());
            const unlockedPerks = USER_PERKS_POOL.filter(p => perkIds.includes(p.id));
            if (unlockedPerks.length === 0) return null;
            return (
              <div className="profile-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', padding: '0 20px 16px 20px', boxSizing: 'border-box' }}>
                <div className="section-label">Unlocked User Perks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {unlockedPerks.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '8px' }}>
                      {p.iconImage ? (
                        <div style={{ width: '24px', height: '24px', backgroundImage: `url(${images[p.iconImage]?.default || images[p.iconImage]})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', filter: 'invert(1) drop-shadow(0 0 4px rgba(248, 113, 113, 0.8))' }} />
                      ) : (
                        <span style={{ fontSize: '20px' }}>{p.icon}</span>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffd700' }}>{p.name}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>{p.shortDesc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          </div>
          
          <div className="profile-column" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="profile-section">
              <div className="section-label">Current Dungeon</div>
            <div className="section-value">
              {dungeon?.name || <span className="no-dungeon">No active dungeon</span>}
            </div>
          </div>

          {/* Domain / Territory Stats */}
          <div className="profile-section">
            <div className="section-label" title="Total contiguous territory owned by you">Domain Value</div>
            <div className="section-value" style={{ fontWeight: 'bold', color: '#2ecc71' }}>
              {user?.domainValue || 0}
            </div>
          </div>
          <div className="profile-section">
            <div className="section-label">Domain Level</div>
            <div className="section-value">
              Level {user?.domainLevel || 0}
            </div>
          </div>
          
          <div className="profile-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {dungeon && (
              <button 
                className={`profile-btn leave-btn ${this.state.isLeaving ? 'loading' : ''} ${this.state.leaveSuccess ? 'success' : ''}`}
                onClick={() => this.leaveDungeon()}
                disabled={this.state.isLeaving}
                style={{ backgroundColor: '#2ecc71', color: 'white' }}
              >
                {this.state.isLeaving ? (
                  <span className="btn-content">
                    <span className="spinner"></span>
                    Leaving...
                  </span>
                ) : this.state.leaveSuccess ? (
                  <span className="btn-content">
                    <span className="checkmark">✓</span>
                    Left Dungeon!
                  </span>
                ) : (
                  'Leave Dungeon'
                )}
              </button>
            )}

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
              className={`profile-btn clear-crew-btn ${this.state.isClearingCrew ? 'loading' : ''} ${this.state.clearCrewSuccess ? 'success' : ''}`}
              onClick={() => this.clearCrew()}
              disabled={this.state.isClearingCrew}
              style={{ backgroundColor: '#e74c3c', color: 'white' }}
            >
              {this.state.isClearingCrew ? (
                <span className="btn-content">
                  <span className="spinner"></span>
                  Clearing Crew...
                </span>
              ) : this.state.clearCrewSuccess ? (
                <span className="btn-content">
                  <span className="checkmark">✓</span>
                  Crew Cleared!
                </span>
              ) : (
                'Clear Crew'
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
      </div>
    )
  }
}

export default UserProfilePage;