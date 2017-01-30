import * as express from 'express'
import * as listaespera from '../schemas/listaEspera'
import * as utils from '../../../utils/utils';

var router = express.Router();

router.get('/listaespera/:id*?', function (req, res, next) {
    if (req.params.id) {
        listaespera.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        var query;
        query = listaespera.find({}); //Trae todos

        if (req.query.fecha) {
            query.where('fecha').gte(req.query.fecha);
        }

        if (req.query.fecha) {
           query.where('vencimiento').lte(req.query.fecha);
        }

        if (req.query.paciente) {
            query.where('paciente.id').equals(req.query.paciente);
        }

        if (req.query.profesional) {
            query.where('profesional.id').equals(req.query.profesional);
        }

        if (req.query.prestacion) {
            query.where('prestacion.id').equals(req.query.prestacion);
        }

        if (req.query.estado) {
            query.where('estado').equals(req.query.estado);
        }

        if (!Object.keys(query).length) {
            res.status(400).send("Debe ingresar al menos un parámetro");
            return next(400);
        }

        query = listaespera.find(query).sort({
            estado: 1,
            fecha: 1
        });

        //console.log("query ", query._conditions)
        query.exec(function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    }
});


router.post('/listaespera', function (req, res, next) {
    var newItem = new listaespera(req.body);
    newItem.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newItem);
    })
});

router.put('/listaespera/:_id', function (req, res, next) {
    listaespera.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/listaespera/:_id', function (req, res, next) {
    listaespera.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;