import * as express from 'express'
import * as establecimiento from '../schemas/establecimiento'

//var ObjectID = require('mongodb').ObjectID

var router = express.Router();

    router.get('/establecimiento', function (req, res, next) {
       establecimiento.find({},(err, data) => {
           if (err) {
               next(err);
           };
           res.json(data);
       });
    });

    router.get('/establecimiento/:id', function (req, res, next) {
       establecimiento.findOne({_id: req.params.id},(err, data) => {
           if (err) {
               next(err);
           };
           res.json(data);
       });
    });

export = router;







