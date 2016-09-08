import * as express from 'express'
import * as provincia from '../schemas/provincia'

var router = express.Router();

router.get('/provincia', function (req, res, next) {
    provincia.find({}, (err, data) => {
        if (err) {
            next(err);
        };
        res.json(data);
    });
});

export = router;