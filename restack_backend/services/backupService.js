const DungeonModel = require('../models/dungeon.model');
const DungeonBackupModel = require('../models/dungeonBackup.model');
const { sendNotificationEmail } = require('../utils/email');

const runDailyBackup = async () => {
  console.log('[BackupService] Running daily dungeon backup job...');
  try {
    const rawDungeons = await DungeonModel.find({});
    let backedUpCount = 0;
    const backedUpDungeonNames = [];
    const skippedDungeonNames = [];

    for (const doc of rawDungeons) {
      if (!doc || !doc.content) continue;
      let dungeonObj = null;
      try {
        dungeonObj = JSON.parse(doc.content);
      } catch (err) {
        console.error('[BackupService] Failed to parse dungeon content for ID:', doc._id);
        continue;
      }

      if (!dungeonObj || !dungeonObj.name) continue;

      // Only backup VALID dungeons
      if (dungeonObj.valid === true) {
        const dungeonIdStr = String(dungeonObj.id || dungeonObj._id || doc._id);
        const dungeonName = dungeonObj.name;

        // Upsert latest snapshot for this dungeon
        await DungeonBackupModel.findOneAndUpdate(
          { dungeonId: dungeonIdStr },
          {
            dungeonId: dungeonIdStr,
            dungeonName: dungeonName,
            snapshot: doc.content,
            isValid: true,
            timestamp: new Date()
          },
          { upsert: true, new: true }
        );

        backedUpCount++;
        backedUpDungeonNames.push(dungeonName);
      } else {
        skippedDungeonNames.push(dungeonObj.name);
      }
    }

    console.log(`[BackupService] Backup complete! Backed up ${backedUpCount} valid dungeons.`);

    // Send Admin Email Notification
    const subject = `[DreamTower] Daily Dungeon Backup Report (${backedUpCount} Dungeons Backed Up)`;
    const body = [
      `Daily automated dungeon backup executed at ${new Date().toISOString()}.`,
      ``,
      `Total Valid Dungeons Backed Up: ${backedUpCount}`,
      `Backed Up Dungeons: ${backedUpDungeonNames.length > 0 ? backedUpDungeonNames.join(', ') : 'None'}`,
      `Skipped (Invalid/Incomplete Dungeons): ${skippedDungeonNames.length > 0 ? skippedDungeonNames.join(', ') : 'None'}`,
      ``,
      `Snapshots stored in 'dungeon_backups' MongoDB collection.`
    ].join('\n');

    await sendNotificationEmail(subject, body);

    return {
      success: true,
      backedUpCount,
      backedUpDungeonNames,
      skippedDungeonNames
    };
  } catch (error) {
    console.error('[BackupService] Error during daily dungeon backup:', error);
    try {
      await sendNotificationEmail(
        '[DreamTower] ERROR: Daily Dungeon Backup Failed',
        `An error occurred during daily dungeon backup:\n\n${error.stack || error.message || error}`
      );
    } catch (e) {
      console.error('[BackupService] Failed to send error notification email:', e);
    }
    throw error;
  }
};

module.exports = {
  runDailyBackup
};
