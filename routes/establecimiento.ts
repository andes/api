import * as express from 'express'
import * as establecimiento from '../schemas/establecimiento'

var router = express.Router();

router.get('/establecimiento', function (req, res, next) {
    establecimiento.find({}, (err, data) => {
        if (err) {
            next(err);
        };
        res.json(data);
    });
});

router.get('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findById(req.params._id, function (err, data) {
        if (err) {
            next(err);
        };

        res.json(data);
    });
});

router.post('/establecimiento', function (req, res, next) {
    var newEstablecimiento = new establecimiento(req.body);
    newEstablecimiento.save((err) => {
        if (err) {
            next(err);
        }

        res.json(newEstablecimiento);
    });
});

router.put('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findByIdAndUpdate(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});

router.delete('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;







