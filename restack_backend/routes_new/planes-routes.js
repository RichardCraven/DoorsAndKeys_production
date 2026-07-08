module.exports = app => {
    const Plane = require("../controllers/plane.controller");
    var router = require("express").Router();
    router.post("/", Plane.create);
    router.get("/", Plane.findAll);
    router.get("/:id", Plane.findOne);
    router.put("/updateMany", Plane.updateManyPlanes);
    router.put("/:id", Plane.update);
    router.delete("/:id", Plane.delete);
    router.delete("/", Plane.deleteAll);
    app.use('/api/planes', router);
};