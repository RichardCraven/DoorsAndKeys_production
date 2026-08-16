const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let botReplaySchema = new Schema({
  botUsername: {
    type: String,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  actions: {
    type: Array, // Array of JSON objects detailing the bot's steps
    default: []
  }
}, {
    collection: 'bot_replays'
});

module.exports = mongoose.model('BotReplay', botReplaySchema);
