const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let mapSchema = new Schema({
  content: {
    type: String
  },
  // createdAt: { type: Date, default: Date.now }
}, {
    collection: 'maps'
})

module.exports = mongoose.model('Map', mapSchema)