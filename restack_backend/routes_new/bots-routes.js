module.exports = app => {
    const bots = require("../controllers/bot.controller.js");
    var router = require("express").Router();

    // Create a new Bot and start simulation
    router.post("/generate", bots.generateBot);

    // Get all bot replays
    router.get("/replays", bots.getReplays);

    app.use('/api/bots', router);
};
