module.exports = app => {
    const Dungeon = require("../controllers/dungeon.controller");
    var router = require("express").Router();
    router.post("/", Dungeon.create);
    router.get("/", Dungeon.findAll);
    router.get("/:id", Dungeon.findOne);
    router.put("/:id", Dungeon.update);
    router.delete("/:id", Dungeon.delete);
    router.delete("/", Dungeon.deleteAll);
    app.use('/api/dungeons', router);
};