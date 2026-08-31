import React from 'react'
import '../styles/user-manager-page.scss'
import {loadAllUsersRequest, deleteUserRequest, updateUserRequest, generateBotRequest, getBotReplaysRequest, deleteAllBotReplaysRequest, loadAllDungeonsRequest} from '../utils/api-handler';

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
      confirmDialog: null,
      showBotConfigModal: false,
      preferredDungeon: 'random',
      botPlaystyle: 'default',
      availableDungeons: [],
      isLoadingDungeons: false,
      selectedUserDetail: null,
      showComposeModal: false,
      composeTargetUser: null,
      composeSubject: '',
      composeContent: '',
      isSendingMail: false,
      mailFeedbackMsg: null
    };
  }

  openUserDetailModal = (user) => {
    this.setState({ selectedUserDetail: user });
  };

  openComposeModal = (user) => {
    this.setState({
      showComposeModal: true,
      composeTargetUser: user,
      composeSubject: '',
      composeContent: '',
      mailFeedbackMsg: null
    });
  };

  handleSendAdminMail = async (e) => {
    if (e) e.preventDefault();
    const { composeTargetUser, composeSubject, composeContent } = this.state;
    if (!composeTargetUser) return;
    if (!composeContent.trim()) {
      this.setState({ mailFeedbackMsg: 'Please enter a message content.' });
      return;
    }
    this.setState({ isSendingMail: true, mailFeedbackMsg: null });
    try {
      let targetMeta = {};
      try {
        targetMeta = typeof composeTargetUser.metadata === 'string'
          ? JSON.parse(composeTargetUser.metadata || '{}')
          : (composeTargetUser.metadata || {});
      } catch (err) {
        targetMeta = {};
      }

      const mailItem = {
        id: `mail_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        from: 'Admin',
        to: composeTargetUser.username,
        subject: composeSubject.trim() || 'Notice from Admin',
        content: composeContent.trim(),
        timestamp: Date.now(),
        read: false
      };

      targetMeta.mailbox = Array.isArray(targetMeta.mailbox) ? targetMeta.mailbox : [];
      targetMeta.mailbox.unshift(mailItem);

      await updateUserRequest(composeTargetUser._id || composeTargetUser.id, targetMeta);
      const res = await loadAllUsersRequest();
      this.setState({
        users: Array.isArray(res?.data) ? res.data : [],
        mailFeedbackMsg: `Message successfully sent to ${composeTargetUser.username}! 📬`,
        composeSubject: '',
        composeContent: ''
      });
    } catch (err) {
      console.error('Failed to send admin mail:', err);
      this.setState({ mailFeedbackMsg: 'Failed to send message.' });
    } finally {
      this.setState({ isSendingMail: false });
    }
  };

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

  openBotConfigModal = async () => {
    this.setState({
      showBotConfigModal: true,
      isLoadingDungeons: true,
      preferredDungeon: 'random',
      botPlaystyle: 'default'
    });
    try {
      const res = await loadAllDungeonsRequest();
      const all = (res?.data || []).map((row) => {
        if (!row || !row.content) return null;
        try {
          const dungeon = JSON.parse(row.content);
          dungeon.id = row._id;
          return dungeon;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      const validDungeons = all.filter(d => d.valid === true && !(/_\d+$/i.test(d.name || '') || /_[^_]+_[a-z0-9]{4}$/i.test(d.name || '')));
      this.setState({ availableDungeons: validDungeons });
    } catch (e) {
      console.error('Failed to load dungeons for bot config:', e);
    } finally {
      this.setState({ isLoadingDungeons: false });
    }
  };

  handleConfirmGenerateBot = async () => {
    const { preferredDungeon, botPlaystyle } = this.state;
    this.setState({ showBotConfigModal: false, isGeneratingBot: true });
    try {
      const res = await generateBotRequest({
        preferredDungeon,
        playstyle: botPlaystyle
      });
      const botName = res && res.data && res.data.username ? res.data.username : 'A new bot';
      this.setState({ alertMessage: `Bot generation started for ${botName}!\nBehavior: ${botPlaystyle}\nDungeon: ${preferredDungeon}\n\nThe bot is now playing the game in the background for 3 minutes. Check the email on file for the results.` });
      // Refresh user list
      const final = await loadAllUsersRequest();
      this.setState({ users: Array.isArray(final?.data) ? final.data : [] });
    } catch (e) {
      this.setState({ alertMessage: 'Failed to generate bot.' });
    } finally {
      this.setState({ isGeneratingBot: false });
    }
  };

  renderBotConfigModal = () => {
    if (!this.state.showBotConfigModal) return null;
    const { preferredDungeon, botPlaystyle, availableDungeons, isLoadingDungeons } = this.state;

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
              gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f' }}>
                Generate Bot Options
              </h3>
              <button 
                onClick={() => this.setState({ showBotConfigModal: false })}
                style={{ background: 'transparent', color: '#e5b54f', border: 'none', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Preferred Dungeon
              </label>
              <select 
                value={preferredDungeon}
                onChange={e => this.setState({ preferredDungeon: e.target.value })}
                disabled={isLoadingDungeons}
                style={{
                  padding: '8px 12px',
                  background: '#0a080d',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="random">random</option>
                {availableDungeons.map(d => (
                  <option key={d.id} value={d.name || d.id}>
                    {d.name || d.id}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Bot Playstyle
              </label>
              <select 
                value={botPlaystyle}
                onChange={e => this.setState({ botPlaystyle: e.target.value })}
                style={{
                  padding: '8px 12px',
                  background: '#0a080d',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="default">default</option>
                <option value="aggressive PVP">aggressive PVP</option>
                <option value="territorial">territorial</option>
                <option value="explorer">explorer</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={() => this.setState({ showBotConfigModal: false })}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#aaa',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={this.handleConfirmGenerateBot}
                style={{
                  padding: '8px 20px',
                  background: 'rgba(229, 181, 79, 0.15)',
                  color: '#e5b54f',
                  border: '1px solid #e5b54f',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.35)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(229, 181, 79, 0.15)'}
              >
                Confirm
              </button>
            </div>
        </div>
      </div>
    );
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
            <p style={{ fontSize: '14px', color: '#ddd', lineHeight: '1.5', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
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

  handleDeleteAllLogs = async () => {
    this.setState({
      confirmDialog: {
        message: "Are you sure you want to delete all bot logs?",
        onConfirm: async () => {
          this.setState({ confirmDialog: null, isLoadingLogs: true });
          try {
            await deleteAllBotReplaysRequest();
            this.setState({ botReplays: [], selectedReplay: null });
          } catch (e) {
            console.error('Failed to delete bot logs', e);
          } finally {
            this.setState({ isLoadingLogs: false });
          }
        }
      }
    });
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
              <div>
                <button 
                  onClick={this.handleDeleteAllLogs}
                  style={{ background: 'transparent', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', padding: '4px 8px', marginRight: '10px' }}
                >
                  Delete All Logs
                </button>
                <button 
                  onClick={() => this.setState({ showLogsModal: false })}
                  style={{ background: 'transparent', color: '#e5b54f', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                >
                  ✕
                </button>
              </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); this.startReplayPlayback(replay); }}
                            style={{ 
                              background: 'transparent', color: '#00ffff', border: 'none', 
                              cursor: 'pointer', textShadow: '0 0 8px #00ffff', 
                              textTransform: 'uppercase', letterSpacing: '1px', 
                              fontWeight: 'bold', fontSize: '12px', padding: 0
                            }}
                          >
                            Replay
                          </button>
                          <span style={{ color: '#888', fontSize: '12px' }}>{new Date(replay.createdAt).toLocaleString()}</span>
                        </div>
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

  startReplayPlayback = (replay) => {
    if (!replay.actions || replay.actions.length === 0) {
      this.setState({ alertMessage: "No actions to replay." });
      return;
    }
    this.setState({ playingReplay: replay, replayActionIndex: 0, showLogsModal: false }, this.runReplayLoop);
  };

  runReplayLoop = () => {
    if (!this.state.playingReplay) return;
    const { actions } = this.state.playingReplay;
    const currentIdx = this.state.replayActionIndex;

    if (currentIdx >= actions.length - 1) {
      this._replayTimeout = setTimeout(() => this.setState({ playingReplay: null }), 4000);
      return;
    }

    const currentAction = actions[currentIdx];
    const nextAction = actions[currentIdx + 1];
    
    let delay = nextAction.timestamp - currentAction.timestamp;
    if (delay < 300) delay = 300; 
    if (delay > 2000) delay = 2000; 

    this._replayTimeout = setTimeout(() => {
      if (!this.state.playingReplay) return;
      this.setState({ replayActionIndex: this.state.replayActionIndex + 1 }, this.runReplayLoop);
    }, delay);
  };

  stopReplayPlayback = () => {
    if (this._replayTimeout) clearTimeout(this._replayTimeout);
    this.setState({ playingReplay: null });
  };

  renderReplayPlayback = () => {
    const { playingReplay, replayActionIndex } = this.state;
    if (!playingReplay) return null;

    const action = playingReplay.actions[replayActionIndex];
    const recentActions = playingReplay.actions.slice(Math.max(0, replayActionIndex - 7), replayActionIndex + 1);

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(10, 8, 12, 0.95)', zIndex: 10000,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center'
      }}>
        <div style={{
          position: 'absolute', top: '24px', left: '24px',
          color: '#00ffff', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase',
          letterSpacing: '4px', textShadow: '0 0 15px rgba(0,255,255,0.7)',
          animation: 'pulseReplay 2s infinite'
        }}>
          ● REPLAY
        </div>
        
        <button 
          onClick={this.stopReplayPlayback}
          style={{
            position: 'absolute', top: '24px', right: '24px',
            background: 'transparent', border: '1px solid #e5b54f', color: '#e5b54f',
            padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600'
          }}
        >
          Exit Replay
        </button>

        <div style={{ width: '1000px', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ color: '#e5b54f', textAlign: 'center', margin: '0 0 10px 0', fontSize: '24px', letterSpacing: '2px' }}>
            {playingReplay.botUsername}
          </h2>
          
          <div style={{
            position: 'relative',
            background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
            overflow: 'hidden', width: '100%', aspectRatio: '16/9',
            boxShadow: '0 10px 50px rgba(0,0,0,0.8), inset 0 0 100px rgba(0,255,255,0.03)'
          }}>
            {(() => {
              let frameScreenshot = action?.screenshot;
              if (!frameScreenshot && playingReplay?.actions) {
                for (let k = replayActionIndex - 1; k >= 0; k--) {
                  if (playingReplay.actions[k]?.screenshot) {
                    frameScreenshot = playingReplay.actions[k].screenshot;
                    break;
                  }
                }
                if (!frameScreenshot) {
                  for (let k = replayActionIndex + 1; k < playingReplay.actions.length; k++) {
                    if (playingReplay.actions[k]?.screenshot) {
                      frameScreenshot = playingReplay.actions[k].screenshot;
                      break;
                    }
                  }
                }
              }

              return frameScreenshot ? (
                <img 
                  src={`data:image/jpeg;base64,${frameScreenshot}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="Replay Frame"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontStyle: 'italic', fontSize: '18px' }}>
                  [ No Visual Data Available ]
                </div>
              );
            })()}
            
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.95) 70%, #000 100%)',
              padding: '60px 24px 24px 24px',
              display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              {recentActions.slice(-3).map((act, i, arr) => {
                const isLast = i === arr.length - 1;
                return (
                  <div key={i} style={{
                    color: isLast ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: isLast ? '22px' : '15px',
                    fontWeight: isLast ? '700' : '400',
                    textShadow: '0 2px 8px #000',
                    display: 'flex', gap: '15px',
                    transform: isLast ? 'scale(1)' : 'scale(0.98)',
                    transformOrigin: 'left',
                    transition: 'all 0.3s ease'
                  }}>
                    <span style={{ color: isLast ? '#00ffff' : 'rgba(0,255,255,0.4)', whiteSpace: 'nowrap' }}>
                      [{new Date(act.timestamp).toLocaleTimeString()}]
                    </span>
                    <span style={{ color: isLast ? '#fff' : 'inherit' }}>
                      {act.action}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
             <div style={{ 
               height: '100%', 
               background: '#00ffff', 
               width: `${(replayActionIndex / Math.max(1, playingReplay.actions.length - 1)) * 100}%`,
               transition: 'width 0.3s linear',
               boxShadow: '0 0 10px #00ffff'
             }} />
          </div>
        </div>
        <style>
          {`
            @keyframes pulseReplay {
              0% { opacity: 1; }
              50% { opacity: 0.3; }
              100% { opacity: 1; }
            }
          `}
        </style>
      </div>
    );
  };

  renderUserDetailModal = () => {
    const { selectedUserDetail } = this.state;
    if (!selectedUserDetail) return null;

    let userMeta = {};
    try {
      userMeta = typeof selectedUserDetail.metadata === 'string'
        ? JSON.parse(selectedUserDetail.metadata || '{}')
        : (selectedUserDetail.metadata || {});
    } catch (e) {
      userMeta = {};
    }

    const crewList = Array.isArray(userMeta.crew) ? userMeta.crew : [];
    const dungeonHistory = Array.isArray(userMeta.dungeonHistory) ? userMeta.dungeonHistory : [];

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }} onClick={() => this.setState({ selectedUserDetail: null })}>
        <div style={{
          background: '#15101a', border: '1.5px solid #e5b54f', borderRadius: '12px',
          padding: '24px', width: '640px', maxWidth: '92%', maxHeight: '85vh',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(229, 181, 79, 0.2)',
          display: 'flex', flexDirection: 'column', color: '#fff', overflowY: 'auto', gap: '20px'
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(229, 181, 79, 0.25)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f', fontFamily: "'Cinzel', serif" }}>
                User Profile: {selectedUserDetail.username}
              </h3>
              <span className={`role-badge ${selectedUserDetail.isAdmin ? 'admin' : 'player'}`}>
                {selectedUserDetail.isAdmin ? 'Admin' : 'Player'}
              </span>
            </div>
            <button
              onClick={() => this.setState({ selectedUserDetail: null })}
              style={{ background: 'transparent', color: '#e5b54f', border: 'none', cursor: 'pointer', fontSize: '20px' }}
            >
              ✕
            </button>
          </div>

          {/* User Account Info */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-around', fontSize: '13px' }}>
            <div><span style={{ color: '#888' }}>User ID:</span> <strong>{selectedUserDetail._id || selectedUserDetail.id || 'N/A'}</strong></div>
            <div><span style={{ color: '#888' }}>Status:</span> <strong style={{ color: '#2ecc71' }}>Active</strong></div>
            <div><span style={{ color: '#888' }}>Mailbox Messages:</span> <strong>{(userMeta.mailbox || []).length}</strong></div>
          </div>

          {/* Active Heroes / Crew Section */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#e5b54f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚔️ Active Crew ({crewList.length})
            </h4>
            {crewList.length === 0 ? (
              <div style={{ color: '#777', fontStyle: 'italic', fontSize: '13px' }}>No crew members recruited.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
                {crewList.map((member, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.5)', border: member.isLeader ? '1px solid #e5b54f' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#fff', fontSize: '13px' }}>{member.name}</strong>
                      {member.isLeader && <span style={{ background: '#e5b54f', color: '#000', fontSize: '9px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px' }}>LEADER</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#e5b54f' }}>
                      LVL {member.level || 1} {member.type ? member.type.toUpperCase() : ''}
                    </div>
                    {member.stats && (
                      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                        <span>STR: {member.stats.str}</span>
                        <span>INT: {member.stats.int}</span>
                        <span>DEX: {member.stats.dex}</span>
                        <span>HP: {member.hp || member.stats.baseHp || 10}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last 10 Dungeon Visits Section */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#e5b54f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🏰 Dungeon Visit History (Last 10 Visits)
            </h4>
            {dungeonHistory.length === 0 ? (
              <div style={{ color: '#777', fontStyle: 'italic', fontSize: '13px' }}>No dungeon visit records available.</div>
            ) : (
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#e5b54f', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '8px 12px' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Dungeon</th>
                      <th style={{ padding: '8px 12px' }}>Visit Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dungeonHistory.map((visit, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ccc' }}>
                        <td style={{ padding: '8px 12px', color: '#777' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#fff' }}>{visit.dungeonName || 'Dungeon'}</td>
                        <td style={{ padding: '8px 12px', color: '#aaa' }}>{visit.entryTimeStr || (visit.timestamp ? new Date(visit.timestamp).toLocaleString() : 'N/A')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button
              onClick={() => {
                const target = selectedUserDetail;
                this.setState({ selectedUserDetail: null }, () => this.openComposeModal(target));
              }}
              style={{
                padding: '8px 18px', background: 'rgba(229, 181, 79, 0.2)',
                color: '#e5b54f', border: '1px solid #e5b54f', borderRadius: '4px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
              }}
            >
              Send Message ✉️
            </button>
            <button
              onClick={() => this.setState({ selectedUserDetail: null })}
              style={{
                padding: '8px 16px', background: 'transparent',
                color: '#aaa', border: '1px solid #555', borderRadius: '4px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  renderComposeModal = () => {
    const { showComposeModal, composeTargetUser, composeSubject, composeContent, isSendingMail, mailFeedbackMsg } = this.state;
    if (!showComposeModal || !composeTargetUser) return null;

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }} onClick={() => this.setState({ showComposeModal: false })}>
        <div style={{
          background: '#15101a', border: '1.5px solid #e5b54f', borderRadius: '12px',
          padding: '24px', width: '480px', maxWidth: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(229, 181, 79, 0.2)',
          display: 'flex', flexDirection: 'column', gap: '14px', color: '#fff'
        }} onClick={e => e.stopPropagation()}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e5b54f' }}>
              Compose Mail to {composeTargetUser.username}
            </h3>
            <button
              onClick={() => this.setState({ showComposeModal: false })}
              style={{ background: 'transparent', color: '#e5b54f', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              ✕
            </button>
          </div>

          {mailFeedbackMsg && (
            <div style={{
              background: mailFeedbackMsg.includes('sent') ? 'rgba(46, 204, 113, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${mailFeedbackMsg.includes('sent') ? 'rgba(46, 204, 113, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: mailFeedbackMsg.includes('sent') ? '#2ecc71' : '#ef4444',
              padding: '8px 12px', borderRadius: '4px', fontSize: '13px', textAlign: 'center', fontWeight: 'bold'
            }}>
              {mailFeedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ccc', textTransform: 'uppercase' }}>
              To:
            </label>
            <input
              type="text"
              value={composeTargetUser.username}
              disabled
              style={{ padding: '8px 12px', background: '#0a080d', color: '#aaa', border: '1px solid #444', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ccc', textTransform: 'uppercase' }}>
              Subject:
            </label>
            <input
              type="text"
              value={composeSubject}
              onChange={e => this.setState({ composeSubject: e.target.value })}
              placeholder="Enter subject..."
              style={{ padding: '8px 12px', background: '#0a080d', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ccc', textTransform: 'uppercase' }}>
              Message:
            </label>
            <textarea
              rows={5}
              value={composeContent}
              onChange={e => this.setState({ composeContent: e.target.value })}
              placeholder="Type message content..."
              style={{ padding: '8px 12px', background: '#0a080d', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
            <button
              onClick={() => this.setState({ showComposeModal: false })}
              style={{ padding: '8px 16px', background: 'transparent', color: '#aaa', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            >
              Cancel
            </button>
            <button
              onClick={this.handleSendAdminMail}
              disabled={isSendingMail}
              style={{ padding: '8px 20px', background: 'rgba(229, 181, 79, 0.15)', color: '#e5b54f', border: '1px solid #e5b54f', borderRadius: '4px', cursor: isSendingMail ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            >
              {isSendingMail ? 'Sending...' : 'Send ✉️'}
            </button>
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
        {this.renderReplayPlayback()}
        {this.renderBotConfigModal()}
        {this.renderUserDetailModal()}
        {this.renderComposeModal()}
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
              onClick={this.openBotConfigModal}
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
                      <td
                        className="username-cell"
                        style={{ cursor: 'pointer', color: '#e5b54f', textDecoration: 'underline' }}
                        onClick={() => this.openUserDetailModal(user)}
                        title="Click to view detailed stats, crew & dungeon visit history"
                      >
                        {user.username}
                      </td>
                      <td>
                        <span className={`role-badge ${user.isAdmin ? 'admin' : 'player'}`}>
                          {user.isAdmin ? 'Admin' : 'Player'}
                        </span>
                      </td>
                      <td className="meta-cell">{user.metadata ? 'Active' : 'N/A'}</td>
                      <td className="meta-cell">{user.metadata ? 'Active' : 'N/A'}</td>
                      <td className="actions-cell">
                        <button
                          className="send-msg-btn"
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(212, 168, 68, 0.15)',
                            color: '#e5b54f',
                            border: '1px solid #e5b54f',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 'bold',
                            marginRight: '6px'
                          }}
                          onClick={() => this.openComposeModal(user)}
                          title="Send mail message to user"
                        >
                          Send Message ✉️
                        </button>
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