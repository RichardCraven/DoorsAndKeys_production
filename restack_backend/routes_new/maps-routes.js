module.exports = app => {
    const Map = require("../controllers/map.controller");
    var router = require("express").Router();
    router.post("/", Map.create);
    router.get("/", Map.findAll);
    router.get("/:id", Map.findOne);
    router.put("/:id", Map.update);
    router.delete("/:id", Map.delete);
    router.delete("/", Map.deleteAll);
    app.use('/api/maps', router);
};