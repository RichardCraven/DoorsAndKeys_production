const { sendNotificationEmail } = require('../utils/email');

exports.enterDungeon = (req, res) => {
  const { username, dungeonName } = req.body;

  if (!username || !dungeonName) {
    return res.status(400).json({ error: 'Missing username or dungeonName' });
  }

  sendNotificationEmail(
    'User Entered Dungeon - DreamTower',
    `User ${username} just entered the dungeon: ${dungeonName}`
  );

  res.status(200).json({ message: 'Notification sent successfully' });
};

exports.sendFeedback = (req, res) => {
  const { username, feedback, subject } = req.body;

  if (!feedback) {
    return res.status(400).json({ error: 'Missing feedback content' });
  }

  const userStr = username || 'Anonymous User';
  const subStr = subject || 'feedback';

  sendNotificationEmail(
    `feedback - ${userStr}`,
    `User: ${userStr}\nSubject: ${subStr}\n\nFeedback:\n${feedback}`
  );

  res.status(200).json({ message: 'Feedback sent successfully' });
};
