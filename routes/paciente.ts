import * as express from 'express'
import * as paciente from '../schemas/paciente';
import * as utils from '../utils/utils';

var router = express.Router();


router.get('/paciente/:id*?', function(req, res, next) {
    if (req.params.id) {

        paciente.findById(req.params.id, function(err, data) {
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

                    "name.text": {
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

        query = paciente.find(opciones);

        query.exec(function(err, data) {
            if (err) return next(err);
            res.json(data);
        });
        
    }

});

router.post('/paciente', function(req, res, next) {
    var newPatient = new paciente(req.body)
    newPatient.save((err) => {
        if (err) {
            next(err);
        }

        res.json(newPatient);
    });
});

router.put('/paciente/:_id', function(req, res, next) {
    paciente.findByIdAndUpdate(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});

router.delete('/paciente/:_id', function(req, res, next) {
    paciente.findByIdAndRemove(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;