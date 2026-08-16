import React from 'react'
import '../styles/user-manager-page.scss'
import {loadAllUsersRequest, deleteUserRequest, updateUserRequest, generateBotRequest, getBotReplaysRequest} from '../utils/api-handler';

class UserManagerPage extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      users: [],
      isGeneratingBot: false,
      alertMessage: null,
      showLogsModal: false,
      botReplays: [],
      selectedReplay: null,
      isLoadingLogs: false,
      confirmDialog: null
    };
  }

  async componentDidMount(){
    const response = await loadAllUsersRequest()
    this.setState({ users: Array.isArray(response?.data) ? response.data : [] })
  }

  deleteUser = (user) => {
    this.setState({
      confirmDialog: {
        message: "Are you sure you want to delete this user?",
        onConfirm: async () => {
          this.setState({ confirmDialog: null });
          await deleteUserRequest(user._id || user.id);
          const final = await loadAllUsersRequest();
          this.setState({ users: Array.isArray(final?.data) ? final.data : [] });
        }
      }
    });
  }

  toggleAdmin = (user) => {
    const nextStatus = !user.isAdmin;
    const actionText = nextStatus ? 'promote to Admin' : 'demote to Player';
    this.setState({
      confirmDialog: {
        message: `Are you sure you want to ${actionText} user "${user.username}"?`,
        onConfirm: async () => {
          this.setState({ confirmDialog: null });
          await updateUserRequest(user._id || user.id, undefined, undefined, nextStatus);
          const final = await loadAllUsersRequest();
          this.setState({ users: Array.isArray(final?.data) ? final.data : [] });
        }
      }
    });
  }

  handleBack = () => {
    if (this.props.navToLanding) {
      this.props.navToLanding();
    } else if (this.props.history) {
      this.props.history.push('/landing');
    } else {
      window.location.href = '/landing';
    }
  };

  handleGenerateBot = async () => {
    this.setState({ isGeneratingBot: true });
    try {
      const res = await generateBotRequest();
      const botName = res && res.data && res.data.username ? res.data.username : 'A new bot';
      this.setState({ alertMessage: `Bot generation started for ${botName}! The bot is now playing the game in the background for 1 minute. Check the email on file for the results.` });
      // Refresh user list
      const final = await loadAllUsersRequest();
      this.setState({ users: Array.isArray(final?.data) ? final.data : [] });
    } catch (e) {
      this.setState({ alertMessage: 'Failed to generate bot.' });
    } finally {
      this.setState({ isGeneratingBot: false });
    }
  };

  closeAlert = () => {
    this.setState({ alertMessage: null });
  };

  renderAlertModal = () => {
    if (!this.state.alertMessage) return null;
    return (
      <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)'
      }}>
        <div style={{
              background: '#15101a',
              border: '1px solid #e5b54f',
              borderRadius: '12px',
              padding: '24px',
              width: '420px',
              maxWidth: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(229, 181, 79, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f' }}>
              System Alert
            </h3>
            <p style={{ fontSize: '14px', color: '#ddd', lineHeight: '1.5', marginBottom: '24px' }}>
              {this.state.alertMessage}
            </p>
            <button 
              onClick={this.closeAlert}
              style={{
                padding: '8px 24px',
                background: 'rgba(229, 181, 79, 0.1)',
                color: '#e5b54f',
                border: '1px solid #e5b54f',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.1)'}
            >
              OK
            </button>
        </div>
      </div>
    );
  };

  renderConfirmModal = () => {
    if (!this.state.confirmDialog) return null;
    return (
      <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)'
      }}>
        <div style={{
              background: '#15101a',
              border: '1px solid #e5b54f',
              borderRadius: '12px',
              padding: '24px',
              width: '420px',
              maxWidth: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(229, 181, 79, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f' }}>
              Confirm Action
            </h3>
            <p style={{ fontSize: '14px', color: '#ddd', lineHeight: '1.5', marginBottom: '24px' }}>
              {this.state.confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => this.setState({ confirmDialog: null })}
                style={{
                  padding: '8px 24px',
                  background: 'transparent',
                  color: '#aaa',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ccc'}
                onMouseLeave={e => e.currentTarget.style.color = '#aaa'}
              >
                Cancel
              </button>
              <button 
                onClick={this.state.confirmDialog.onConfirm}
                style={{
                  padding: '8px 24px',
                  background: 'rgba(229, 181, 79, 0.1)',
                  color: '#e5b54f',
                  border: '1px solid #e5b54f',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.1)'}
              >
                Confirm
              </button>
            </div>
        </div>
      </div>
    );
  };

  handleFetchLogs = async () => {
    this.setState({ isLoadingLogs: true, showLogsModal: true, selectedReplay: null });
    try {
      const res = await getBotReplaysRequest();
      if (res && res.data) {
        this.setState({ botReplays: res.data });
      }
    } catch (e) {
      console.error('Failed to fetch bot logs', e);
    } finally {
      this.setState({ isLoadingLogs: false });
    }
  };

  renderLogsModal = () => {
    if (!this.state.showLogsModal) return null;
    const { botReplays, selectedReplay, isLoadingLogs } = this.state;

    return (
      <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)'
      }}>
        <div style={{
              background: '#15101a',
              border: '1px solid #e5b54f',
              borderRadius: '12px',
              padding: '24px',
              width: '600px',
              maxWidth: '90%',
              maxHeight: '80vh',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(229, 181, 79, 0.2)',
              display: 'flex',
              flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f' }}>
                Game Run Logs
              </h3>
              <button 
                onClick={() => this.setState({ showLogsModal: false })}
                style={{ background: 'transparent', color: '#e5b54f', border: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isLoadingLogs ? (
                <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Loading...</div>
              ) : selectedReplay ? (
                <div>
                  <button 
                    onClick={() => this.setState({ selectedReplay: null })}
                    style={{ background: 'transparent', color: '#e5b54f', border: 'none', cursor: 'pointer', padding: '0 0 10px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    ← Back to Runs
                  </button>
                  <h4 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '15px' }}>{selectedReplay.botUsername} - {new Date(selectedReplay.createdAt).toLocaleString()}</h4>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {selectedReplay.actions && selectedReplay.actions.map((act, i) => (
                      <div key={i} style={{ color: '#ccc', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#888', marginRight: '8px' }}>[{new Date(act.timestamp).toLocaleTimeString()}]</span>
                        {act.action}
                      </div>
                    ))}
                    {(!selectedReplay.actions || selectedReplay.actions.length === 0) && (
                      <div style={{ color: '#777', fontStyle: 'italic' }}>No actions recorded.</div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {botReplays.length === 0 ? (
                    <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No bot replays found.</div>
                  ) : (
                    botReplays.map((replay) => (
                      <div 
                        key={replay._id}
                        onClick={() => this.setState({ selectedReplay: replay })}
                        style={{
                          padding: '12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      >
                        <span style={{ color: '#e5b54f', fontWeight: 'bold' }}>{replay.botUsername}</span>
                        <span style={{ color: '#888', fontSize: '12px' }}>{new Date(replay.createdAt).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
        </div>
      </div>
    );
  };

  render() {
    return (
      <div className="user-manager-page">
        {this.renderAlertModal()}
        {this.renderConfirmModal()}
        {this.renderLogsModal()}
        <div className="user-manager-card">
          <div className="user-manager-header">
            <h2>User Manager</h2>
            <button className="back-btn" onClick={this.handleBack}>
              ← Back to Menu
            </button>
          </div>
          
          <div className="bot-controls" style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              className="generate-bot-btn" 
              onClick={this.handleGenerateBot}
              disabled={this.state.isGeneratingBot}
              style={{
                padding: '8px 16px',
                background: this.state.isGeneratingBot ? 'rgba(255, 255, 255, 0.1)' : 'rgba(229, 181, 79, 0.1)',
                color: this.state.isGeneratingBot ? '#888' : '#e5b54f',
                border: `1px solid ${this.state.isGeneratingBot ? '#555' : '#e5b54f'}`,
                borderRadius: '4px',
                cursor: this.state.isGeneratingBot ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                if (!this.state.isGeneratingBot) e.currentTarget.style.background = 'rgba(229, 181, 79, 0.3)';
              }}
              onMouseLeave={e => {
                if (!this.state.isGeneratingBot) e.currentTarget.style.background = 'rgba(229, 181, 79, 0.1)';
              }}
            >
              {this.state.isGeneratingBot ? 'Generating...' : 'Generate Bot'}
            </button>

            <button 
              className="fetch-logs-btn" 
              onClick={this.handleFetchLogs}
              style={{
                padding: '8px 16px',
                background: 'rgba(229, 181, 79, 0.1)',
                color: '#e5b54f',
                border: '1px solid #e5b54f',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.1)'}
            >
              Game Run Logs
            </button>
          </div>

          <div className="user-table-container">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>World</th>
                  <th>Crew</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {this.state.users && this.state.users.length > 0 ? (
                  this.state.users.map((user, i) => (
                    <tr key={i}>
                      <td className="username-cell">{user.username}</td>
                      <td>
                        <span className={`role-badge ${user.isAdmin ? 'admin' : 'player'}`}>
                          {user.isAdmin ? 'Admin' : 'Player'}
                        </span>
                      </td>
                      <td className="meta-cell">{user.metadata ? 'Active' : 'N/A'}</td>
                      <td className="meta-cell">{user.metadata ? 'Active' : 'N/A'}</td>
                      <td className="actions-cell">
                        <button 
                          className={`toggle-admin-btn ${user.isAdmin ? 'revoke-admin' : 'make-admin'}`}
                          onClick={() => this.toggleAdmin(user)}
                          title={user.isAdmin ? "Revoke Admin Status" : "Grant Admin Status"}
                        >
                          {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                        <button 
                          className="delete-btn" 
                          onClick={() => this.deleteUser(user)}
                          title="Delete User"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-table">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

export default UserManagerPage;