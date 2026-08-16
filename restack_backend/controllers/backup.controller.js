const DungeonBackupModel = require('../models/dungeonBackup.model');
const DungeonModel = require('../models/dungeon.model');
const { runDailyBackup } = require('../services/backupService');

exports.checkBackup = async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ error: 'Missing dungeon identifier' });
    }

    const backup = await DungeonBackupModel.findOne({
      $or: [
        { dungeonId: identifier },
        { dungeonName: identifier }
      ]
    });

    if (!backup) {
      return res.json({ hasBackup: false });
    }

    return res.json({
      hasBackup: true,
      dungeonId: backup.dungeonId,
      dungeonName: backup.dungeonName,
      timestamp: backup.timestamp,
      isValid: backup.isValid
    });
  } catch (error) {
    console.error('Error in checkBackup:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ error: 'Missing dungeon identifier' });
    }

    const backup = await DungeonBackupModel.findOne({
      $or: [
        { dungeonId: identifier },
        { dungeonName: identifier }
      ]
    });

    if (!backup || !backup.snapshot) {
      return res.status(444).json({ error: 'No stored backup found for this dungeon' });
    }

    let dungeonObj = null;
    try {
      dungeonObj = JSON.parse(backup.snapshot);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid backup snapshot content' });
    }

    // Overwrite the dungeon in dungeons collection
    const dungeonIdStr = backup.dungeonId;
    const existingDungeon = await DungeonModel.findOne({
      $or: [
        { _id: dungeonIdStr },
        { content: { $regex: `"name":"${backup.dungeonName}"` } }
      ]
    });

    if (existingDungeon) {
      existingDungeon.content = backup.snapshot;
      await existingDungeon.save();
    } else {
      await DungeonModel.create({ content: backup.snapshot });
    }

    return res.json({
      success: true,
      message: `Dungeon ${backup.dungeonName} successfully restored from backup!`,
      restoredDungeon: dungeonObj,
      timestamp: backup.timestamp
    });
  } catch (error) {
    console.error('Error in restoreBackup:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.triggerManualBackup = async (req, res) => {
  try {
    const result = await runDailyBackup();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
