module.exports = app => {
    const User = require("../controllers/user.controller");
    var router = require("express").Router();
    // Create a new UserImage
    router.post("/", User.create);
    // Retrieve all ss
    router.get("/", User.findAll);
    // Retrieve a single UserImage with id
    router.get("/:id", User.findOne);
    // Update a UserImage with id
    router.put("/:id", User.update);
    // Delete a UserImage with id
    router.delete("/:id", User.delete);
    // Delete all User
    router.delete("/", User.deleteAll);
    app.use('/api/users', router);
  };