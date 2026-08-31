module.exports = app => {
    const Notification = require("../controllers/notification.controller");
    var router = require("express").Router();
    
    // Trigger an email notification when a user enters a dungeon
    router.post("/enter-dungeon", Notification.enterDungeon);
    
    // Trigger an email notification when feedback is submitted
    router.post("/feedback", Notification.sendFeedback);
    
    app.use('/api/notifications', router);
  };
