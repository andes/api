import * as express from 'express'
import * as patient from '../schemas/patient';

var router = express.Router();


router.get('/patient/:id*?', function(req, res, next) {
    if (req.params.id) {

        patient.findById(req.params.id, function(err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    }

    var query;
    var opciones = {}; //Armo json con las opciones de búsqueda
   
    if (req.query.gender) {
        opciones.gender = Array.isArray(req.query.gender) ? {
            $in: req.query.gender
        } : req.query.gender;
        
    }

    //  if (req.query.family) {
    //     opciones.name.family = Array.isArray(req.query.family) ? {
    //         $in: req.query.family
    //     } : req.query.family;
    // }

    console.log(opciones);
    query = patient.find(opciones);


    query.exec((err, data) => {
        if (err) return next(err);
        res.json(data);
    });

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