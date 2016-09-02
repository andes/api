import * as express from 'express'
import * as establecimiento from '../schemas/establecimiento'

var router = express.Router();

    router.get('/establecimiento', function (req, res, next) {
       establecimiento.find({},(err, data) => {
           if (err) {
               next(err);
           };
           res.json(data);
       });
    });

export = router;







