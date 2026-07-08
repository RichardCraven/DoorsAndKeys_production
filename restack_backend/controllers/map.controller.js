
const mapSchema = require('../models/map.model')

exports.create = (req, res) => {

  req.body.content = req.body.map
  // console.log('creating map:', req.body);
  mapSchema.create(req.body, (error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
}

exports.findAll = (req, res) => {
  mapSchema.find((error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
};

exports.findOne = (req, res) => {
  mapSchema.find({'_id': req.params.id}, (error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
};

exports.update = (req, res) => {
  req.body.content = req.body.map
  // console.log('updating board:', req.body);
  mapSchema.findOneAndUpdate({'_id': req.params.id}, {
    $set: req.body
  }, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data)
      console.log('User updated successfully !')
    }
  })
};

exports.delete = (req, res) => {
  mapSchema.findByIdAndRemove(req.params.id, (error, data) => {
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
  mapSchema.remove({}, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data
      })
    }
  });
};