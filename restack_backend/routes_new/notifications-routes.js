module.exports = app => {
    const Notification = require("../controllers/notification.controller");
    var router = require("express").Router();
    
    // Trigger an email notification when a user enters a dungeon
    router.post("/enter-dungeon", Notification.enterDungeon);
    
    app.use('/api/notifications', router);
  };
