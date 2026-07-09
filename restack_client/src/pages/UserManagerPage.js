import React from 'react'
import '../styles/user-manager-page.scss'
import {loadAllUsersRequest, deleteUserRequest, updateUserRequest} from '../utils/api-handler';

class UserManagerPage extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      users: [],
    };
  }

  async componentDidMount(){
    const response = await loadAllUsersRequest()
    this.setState({ users: Array.isArray(response?.data) ? response.data : [] })
  }

  deleteUser = async (user) => {
    const c = window.confirm("Are you sure you want to delete this user?")
    if(c){
      await deleteUserRequest(user._id || user.id)
      const final = await loadAllUsersRequest()
      this.setState({ users: Array.isArray(final?.data) ? final.data : [] })
    }
  }

  toggleAdmin = async (user) => {
    const nextStatus = !user.isAdmin;
    const actionText = nextStatus ? 'promote to Admin' : 'demote to Player';
    const c = window.confirm(`Are you sure you want to ${actionText} user "${user.username}"?`);
    if(c){
      await updateUserRequest(user._id || user.id, undefined, undefined, nextStatus);
      const final = await loadAllUsersRequest();
      this.setState({ users: Array.isArray(final?.data) ? final.data : [] })
    }
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

  render() {
    return (
      <div className="user-manager-page">
        <div className="user-manager-card">
          <div className="user-manager-header">
            <h2>User Manager</h2>
            <button className="back-btn" onClick={this.handleBack}>
              ← Back to Menu
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