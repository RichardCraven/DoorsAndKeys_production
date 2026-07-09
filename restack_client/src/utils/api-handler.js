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

const updateUserRequest = (userId, metadata, username) => {
  const payload = { metadata: JSON.stringify(metadata) };
  if (username !== undefined) {
    payload.username = username;
  }
  return axios.put(API_BASE + "/api/users/"+userId, payload)
    .then(res=>{
      if(res.status === 200){
        res.data.metadata = metadata
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}

// Map APIs --------------------------------------------------------

const addBoardRequest = (mapObj) => {
  console.log('adding map: ', mapObj);
  return axios.post(API_BASE + "/api/maps", {map: JSON.stringify(mapObj)})
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
const updateBoardRequest = (id, mapObj) => {
  return axios.put(API_BASE + "/api/maps/"+id, {map: JSON.stringify(mapObj)})
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
const deleteBoardRequest = (id) => {
  return axios.delete(API_BASE + "/api/maps/"+id)
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
const loadBoardRequest = (id) => {
  return axios.get(API_BASE + "/api/maps/"+id)
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
const loadAllBoardsRequest = () => {
  // return axios.get(API_BASE + "/api/maps")
  return axios.get(API_BASE + "/api/maps")
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

// Plane APIs --------------------------------------------------------

const addPlaneRequest = (planeObj) => {
  return axios.post(API_BASE + "/api/planes", {plane: JSON.stringify(planeObj)})
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}
const updatePlaneRequest = (id, planeObj) => {
  console.log('updating plane:', id, planeObj);
  return axios.put(API_BASE + "/api/planes/"+id, {plane: JSON.stringify(planeObj)})
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}
const updateManyPlanesRequest = (planesArray) => {
  console.log('updating many planes, planesArray: ', planesArray)
  console.log('CANCELLING THIS UNTIL INVESTIGATION.. LAST TIME YOU WIPED OUT ALL THE PLANES')
  return null
  // return axios.put(API_BASE + "/api/planes/updateMany", {planesArray: JSON.stringify(planesArray)})
  //   .then(res=>{
  //     console.log('response:', res)
  //     // if(res.status === 200 || res.status === 201){
  //     //   return(res)
  //     // }
  //   })
  //   .catch(err=> {
  //     console.log(err)
  //     return(err)
  //   })
}
const loadAllPlanesRequest = (id) => {
  return axios.get(API_BASE + "/api/planes")
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
const loadPlaneRequest = (id) => {
  return axios.get(API_BASE + "/api/planes/"+id)
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
const deletePlaneRequest = (id) => {
  return axios.delete(API_BASE + "/api/planes/"+id)
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}

// Dungeon APIs --------------------------------------------------------

const addDungeonRequest = (dungeonObj) => {
  return axios.post(API_BASE + "/api/dungeons", {dungeon: JSON.stringify(dungeonObj)})
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}
const updateDungeonRequest = (id, dungeonObj) => {
  return axios.put(API_BASE + "/api/dungeons/"+id, {dungeon: JSON.stringify(dungeonObj)})
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
    })
}
const loadAllDungeonsRequest = (id) => {
  return axios.get(API_BASE + "/api/dungeons")
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
const loadDungeonRequest = (id) => {
  return axios.get(API_BASE + "/api/dungeons/"+id)
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
const deleteDungeonRequest = (id) => {
  return axios.delete(API_BASE + "/api/dungeons/"+id)
    .then(res=>{
      if(res.status === 200 || res.status === 201){
        return(res)
      }
    })
    .catch(err=> {
      console.log(err)
      return(err)
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
  loadPlaneRequest
};