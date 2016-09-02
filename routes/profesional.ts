import * as express from 'express'
import * as profesional from '../schemas/profesional'

var router = express.Router();

    router.get('/profesional', function (req, res, next) {
       profesional.find({},(err, data) => {
           if (err) {
               next(err);
           };
           res.json(data);
       });
    });

export = router;
