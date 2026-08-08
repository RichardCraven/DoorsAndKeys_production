const userSchema = require('../models/user.model')

// CREATE User
exports.create = (req, res) => {
  console.log('creating user', req.body)

  userSchema.create(req.body, (error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
}

// READ Users
exports.findAll = (req, res) => {
  userSchema.find((error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
};

// Find a single user with an id
exports.findOne = (req, res) => {
  userSchema.find({'_id': req.params.id}, (error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
};

// Update User
exports.update = (req, res, next) => {
  if (!req.params.id || req.params.id === 'undefined') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  userSchema.findOneAndUpdate({'_id': req.params.id}, {
    $set: req.body
  }, (error, data) => {
    if (error) {
      console.log('error:', error)
      return next(error);
    } else {
      res.json(data)
      console.log('User updated successfully !')
    }
  })
};

// Delete User
exports.delete = (req, res) => {
  userSchema.findByIdAndRemove(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data
      })
    }
  })
};

exports.deleteAll = (req, res) => {
  userSchema.remove({}, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data
      })
    }
  });
};