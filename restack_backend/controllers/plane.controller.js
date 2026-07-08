
const planeSchema = require('../models/plane.model')

exports.create = (req, res, next) => {
  req.body.content = req.body.plane
  // console.log('creating plane:', req.body);
  planeSchema.create(req.body, (error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
}

exports.findAll = (req, res, next) => {
  planeSchema.find((error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
};

exports.findOne = (req, res, next) => {
  // console.log('get dungeon ', req.params.id);
  planeSchema.find({'_id': req.params.id}, (error, data) => {
    if (error) {
      return next(error)
    } else {
      // console.log('success', data);
      res.json(data)
    }
  })
};

exports.update = (req, res, next) => {
  console.log('in update one!!!')
  req.body.content = req.body.plane
  // console.log('updating plane:', req.body);
  planeSchema.findOneAndUpdate({'_id': req.params.id}, {
    $set: req.body
  }, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data)
      console.log('plane updated successfully !')
    }
  })
};

exports.updateManyPlanes = (req,res, next) => {
  const entries = JSON.parse(req.body.planesArray)
  // const idList = entries.map(e=> e.id)
  console.log('entries type :', typeof entries[0])
  // console.log('parsed length: ', JSON.parse(entries).length)
    // var bulkUpdateOperations = [
    //     {
    //         "updateOne": {
    //             "filter": { "reference": 10 },
    //             "update": { "$push": { "history": history1 } }
    //         }
    //     },
    //     {
    //         "updateOne": {
    //             "filter": { "reference": 20 },
    //             "update": { "$push": { "history": history2 } }
    //         }
    //     }
    // ];
    // const writeOperations = {
    //     updateMany: {
    //       filter: { _id: { $in: entries.map(entry => entry._id) } },
    //       update: { balance: getRandomInteger(MINIMUM_BALANCE, MAXIMUM_BALANCE) }
    //     }
    // };
    const bulkUpdateOperations = []
    entries.forEach(entry => {
      bulkUpdateOperations.push(
          {
              updateOne: {
                  filter: { _id: entry.id},
                  update: {
                      $set: { content: JSON.stringify(entry.content) },
                  },
                  upsert: true
              }
          }
      )
  })

    planeSchema.bulkWrite(bulkUpdateOperations, (error, data) => {
      if (error) {
        return next(error)
        } else {
        res.json(data)
        }
    })
      // {'_id': {$in: idList}}, 
    //   filter: { _id: { $in: entries.map(entry => entry._id) } },
    //   {"$set":{"created": true}}, 
    //   entries, (error, data) => {
    //     if (error) {
    //     return next(error)
    //     } else {
    //     res.json(data)
    //     }
    // })
}



exports.delete = (req, res, next) => {
  planeSchema.findByIdAndRemove(req.params.id, (error, data) => {
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
  planeSchema.remove({}, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data
      })
    }
  });
};