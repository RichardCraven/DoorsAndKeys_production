module.exports = app => {
  const BackupController = require("../controllers/backup.controller");
  var router = require("express").Router();

  router.get("/check/:identifier", BackupController.checkBackup);
  router.post("/restore/:identifier", BackupController.restoreBackup);
  router.post("/trigger-now", BackupController.triggerManualBackup);

  app.use('/api/dungeon-backups', router);
};
