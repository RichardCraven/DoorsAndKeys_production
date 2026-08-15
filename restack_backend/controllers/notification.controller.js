const { sendNotificationEmail } = require('../utils/email');

exports.enterDungeon = (req, res) => {
  const { username, dungeonName } = req.body;

  if (!username || !dungeonName) {
    return res.status(400).json({ error: 'Missing username or dungeonName' });
  }

  sendNotificationEmail(
    'User Entered Dungeon - Restack',
    `A user has just entered a dungeon!\n\nUser: ${username}\nDungeon: ${dungeonName}`
  );

  res.status(200).json({ message: 'Notification sent successfully' });
};
