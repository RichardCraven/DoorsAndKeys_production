const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let dungeonBackupSchema = new Schema({
  dungeonId: {
    type: String,
    required: true,
    index: true
  },
  dungeonName: {
    type: String,
    required: true,
    index: true
  },
  snapshot: {
    type: String,
    required: true
  },
  isValid: {
    type: Boolean,
    default: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'dungeon_backups'
});

module.exports = mongoose.model('DungeonBackup', dungeonBackupSchema);
