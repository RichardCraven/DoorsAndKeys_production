
const dungeonSchema = require('../models/dungeon.model')

exports.create = (req, res, next) => {
  req.body.content = req.body.dungeon
  // console.log('creating dungeon:', req.body);
  dungeonSchema.create(req.body, (error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
}

exports.findAll = (req, res, next) => {
  dungeonSchema.find((error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
};

exports.findOne = (req, res, next) => {
  // console.log('get dungeon ', req.params.id);
  dungeonSchema.find({'_id': req.params.id}, (error, data) => {
    if (error) {
      return next(error)
    } else {
      // console.log('success', data);
      res.json(data)
    }
  })
};

exports.update = (req, res, next) => {
  req.body.content = req.body.dungeon
  // console.log('updating dungeon:', req.body.dungeon);
  // console.log('updating dungeon:', req.body.dungeon.id);
  dungeonSchema.findOneAndUpdate({'_id': req.params.id}, {
    $set: req.body
  }, (error, data) => {
    if (error) {
      return next(error);
    } else {
      console.log('dungeon ', req.params.id, 'successfully updated');
      res.json(data)
    }
  })
};

exports.delete = (req, res, next) => {
  dungeonSchema.findByIdAndRemove(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data
      })
    }
  })
};

exports.deleteAll = (req, res, next) => {
  dungeonSchema.remove({}, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data
      })
    }
  });
};