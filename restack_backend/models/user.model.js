const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let userSchema = new Schema({
  username: {
    type: String
  },
  password: {
    type: String
  },
  isAdmin: {
    type: Boolean
  },
  metadata: {
    type: String
  },
  // createdAt: { type: Date, default: Date.now }
}, {
    collection: 'users'
})

module.exports = mongoose.model('User', userSchema)