import * as express from 'express'
import * as especialidad from '../schemas/especialidad'

var router = express.Router();

router.get('/especialidad', function (req, res, next) {
    especialidad.find({},(err, data) => {
        if (err) {
            next(err);
        };
        res.json(data);
    });
});

/*router.get('/especialidad/:id', function (req, res, next) {
    especialidad.find({},(err, data) => {
        if (err) {
            next(err);
        };
        res.json(data);
    });
});*/

export = router;