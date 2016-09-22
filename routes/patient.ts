import * as express from 'express'
import * as patient from '../schemas/patient';
import * as utils from '../utils/utils';

var router = express.Router();


router.get('/patient/:id*?', function(req, res, next) {
    if (req.params.id) {

        patient.findById(req.params.id, function(err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        var query;
        var opciones = {};
        
        if (req.query.search) {
            
            if (req.query.search) {
                opciones['$or'] = [{

                    "name.family": {
                        "$regex": utils.makePattern(req.query.search)
                    }
                }, {
                    "name.given": {
                        "$regex": utils.makePattern(req.query.search)
                    }

                },
                {
                    "document.value": {
                        "$regex": utils.makePattern(req.query.search)
                    }
                },
                {
                    "careProvider": {
                        "$regex": utils.makePattern(req.query.search)
                    }
                }

                ]

            }

        }

        query = patient.find(opciones);

        query.exec(function(err, data) {
            if (err) return next(err);
            res.json(data);
        });
        
    }

});

router.post('/patient', function(req, res, next) {
    var newPatient = new patient(req.body)
    newPatient.save((err) => {
        if (err) {
            next(err);
        }

        res.json(newPatient);
    });
});

router.put('/patient/:_id', function(req, res, next) {
    patient.findByIdAndUpdate(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});

router.delete('/patient/:_id', function(req, res, next) {
    patient.findByIdAndRemove(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;