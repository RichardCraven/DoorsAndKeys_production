const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let planeSchema = new Schema({
  content: {
    type: String
  },
//   createdAt: { type: Date, default: Date.now }
}, {
    collection: 'planes'
})

module.exports = mongoose.model('Plane', planeSchema)