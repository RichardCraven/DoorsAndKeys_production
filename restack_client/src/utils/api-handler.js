import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";

const getAllUsersRequest = () => {
  return axios.get(API_BASE + "/api/users")
      .then(res=>{
        if(res.status === 200){
            return(res)
        }
      })
      .catch(err=> {
        console.log(err)
        return(err)
      })
}
const registerRequest = (regObj) => {
    // return axios.post(API_BASE + "/api/register", regObj)
    return axios.post(API_BASE + "/api/users", regObj)
      .then(res=>{
        if(res.status === 200){
            return(res)
        }
      })
      .catch(err=> {
        console.log(err)
        return(err)
      })
}
const generateBotRequest = () => {
    return axios.post(API_BASE + "/api/bots/generate")
      .then(res=>{
        if(res.status === 200){
            return(res)
        }
      })
      .catch(err=> {
        console.log(err)
        return(err)
      })
}

const getBotReplaysRequest = () => {
    return axios.get(API_BASE + "/api/bots/replays")
      .then(res=>{
        if(res.status === 200){
          return(res)
        }
      })
      .catch(err=> {
        console.log(err)
        return(err)
      })
}

const deleteAllBotReplaysRequest = () => {
    return axios.delete(API_BASE + "/api/bots/replays")
      .then(res=>{
        if(res.status === 200){
          return(res)
        }
      })
      .catch(err=> {
        console.log(err)
        return(err)
      })
}

const loginRequest = (loginObj) => {
    return axios.post(API_BASE + "/api/login", loginObj)
      .then(res=>{
        if(res.status === 200){
          return(res)
        }
      })
      .catch(err=> {
        console.log(err)
        return(err)
      })
}

const deleteUserRequest = (userId) => {
  return axios.delete(API_BASE + "/api/users/"+userId)
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}

const updateUserRequest = (userId, metadata, username, isAdmin) => {
  const payload = {};
  if (metadata !== undefined) {
    payload.metadata = JSON.stringify(metadata);
  }
  if (username !== undefined) {
    payload.username = username;
  }
  if (isAdmin !== undefined) {
    payload.isAdmin = isAdmin;
  }
  return axios.put(API_BASE + "/api/users/"+userId, payload, { timeout: 10000 })
    .then(res=>{
      if(res.status === 200){
        if (metadata !== undefined) {
          res.data.metadata = metadata;
        }
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}

// Map APIs --------------------------------------------------------

// Map APIs --------------------------------------------------------

const addBoardRequest = (mapObj) => {
  console.log('adding map: ', mapObj);
  return axios.post(API_BASE + "/api/maps", {map: JSON.stringify(mapObj)}, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const updateBoardRequest = (id, mapObj) => {
  return axios.put(API_BASE + "/api/maps/"+id, {map: JSON.stringify(mapObj)}, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const deleteBoardRequest = (id) => {
  return axios.delete(API_BASE + "/api/maps/"+id, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const loadBoardRequest = (id) => {
  return axios.get(API_BASE + "/api/maps/"+id, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const loadAllBoardsRequest = () => {
  return axios.get(API_BASE + "/api/maps", { timeout: 15000 })
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
      return { status: res.status, data: [] };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: [], error: err };
    })
}

// Plane APIs --------------------------------------------------------

const addPlaneRequest = (planeObj) => {
  return axios.post(API_BASE + "/api/planes", {plane: JSON.stringify(planeObj)}, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const updatePlaneRequest = (id, planeObj) => {
  return axios.put(API_BASE + "/api/planes/"+id, {plane: JSON.stringify(planeObj)}, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const updateManyPlanesRequest = (planesArray) => {
  console.log('updating many planes, planesArray: ', planesArray)
  console.log('CANCELLING THIS UNTIL INVESTIGATION.. LAST TIME YOU WIPED OUT ALL THE PLANES')
  return null
}
const loadAllPlanesRequest = (id) => {
  return axios.get(API_BASE + "/api/planes", { timeout: 15000 })
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
      return { status: res.status, data: [] };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: [], error: err };
    })
}
const loadPlaneRequest = (id) => {
  return axios.get(API_BASE + "/api/planes/"+id, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const deletePlaneRequest = (id) => {
  return axios.delete(API_BASE + "/api/planes/"+id, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}

// Notification APIs ---------------------------------------------------

const sendDungeonEntryNotification = (username, dungeonName) => {
  return axios.post(API_BASE + "/api/notifications/enter-dungeon", { username, dungeonName }, { timeout: 15000 })
    .then(res => {
      if (res.status === 200 || res.status === 201) {
        return res;
      }
      return { status: res.status, data: null };
    })
    .catch(err => {
      console.log(err);
      return { status: 500, data: null, error: err };
    });
}

// Dungeon APIs --------------------------------------------------------

const addDungeonRequest = (dungeonObj) => {
  return axios.post(API_BASE + "/api/dungeons", {dungeon: JSON.stringify(dungeonObj)}, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const updateDungeonRequest = (id, dungeonObj) => {
  return axios.put(API_BASE + "/api/dungeons/"+id, {dungeon: JSON.stringify(dungeonObj)}, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const loadAllDungeonsRequest = (id) => {
  return axios.get(API_BASE + "/api/dungeons", { timeout: 15000 })
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
      return { status: res.status, data: [] };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: [], error: err };
    })
}
const getActivePresenceRequest = () => {
  return axios.get(API_BASE + "/api/dungeons/active-presence", { timeout: 10000 })
    .then(res => {
      if (res.status === 200) {
        return res;
      }
      return { status: res.status, data: {} };
    })
    .catch(err => {
      console.log(err);
      return { status: 500, data: {}, error: err };
    });
}
const loadDungeonRequest = (id) => {
  return axios.get(API_BASE + "/api/dungeons/"+id, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}
const deleteDungeonRequest = (id) => {
  return axios.delete(API_BASE + "/api/dungeons/"+id, { timeout: 15000 })
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
      return { status: res.status, data: null };
    })
    .catch(err=> {
      console.log(err)
      return { status: 500, data: null, error: err };
    })
}



const loadAllUsersRequest = () => {
  return axios.get(API_BASE + "/api/users")
    .then(res=>{
      if(res.status === 200){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}


// const isAuthorized = ()

const checkDungeonBackupRequest = (identifier) => {
  return axios.get(API_BASE + "/api/dungeon-backups/check/" + encodeURIComponent(identifier), { timeout: 15000 })
    .then(res => {
      if (res.status === 200) {
        return res;
      }
      return { status: res.status, data: { hasBackup: false } };
    })
    .catch(err => {
      console.log(err);
      return { status: 500, data: { hasBackup: false }, error: err };
    });
};

const restoreDungeonBackupRequest = (identifier) => {
  return axios.post(API_BASE + "/api/dungeon-backups/restore/" + encodeURIComponent(identifier), {}, { timeout: 15000 })
    .then(res => {
      if (res.status === 200 || res.status === 201) {
        return res;
      }
      return { status: res.status, data: null };
    })
    .catch(err => {
      console.log(err);
      return { status: 500, data: null, error: err };
    });
};

export {
  registerRequest,
  loginRequest, 
  updateUserRequest,
  addBoardRequest, 
  loadBoardRequest, 
  loadAllBoardsRequest,
  updateBoardRequest,
  deleteBoardRequest,
  loadAllUsersRequest,
  loadAllDungeonsRequest,
  addDungeonRequest,
  loadDungeonRequest,
  updateDungeonRequest,
  deleteDungeonRequest,
  deleteUserRequest,
  getAllUsersRequest,
  addPlaneRequest,
  deletePlaneRequest,
  updatePlaneRequest,
  updateManyPlanesRequest,
  loadAllPlanesRequest,
  loadPlaneRequest,
  sendDungeonEntryNotification,
  generateBotRequest,
  getBotReplaysRequest,
  deleteAllBotReplaysRequest,
  checkDungeonBackupRequest,
  restoreDungeonBackupRequest,
  getActivePresenceRequest
};