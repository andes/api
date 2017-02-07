import * as express from 'express'
import * as listaEspera from '../schemas/listaEspera'
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';
import * as config from '../../../config';

var router = express.Router();

/*router.get('/listaEspera/:id*?', function (req, res, next) {
    if (req.params.id) {
        listaEspera.find(query).sort({
            estado: 1,
            fecha: 1
        });

        //console.log("query ", query._conditions)
        query.exec(function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    }
});*/

router.get('/listaEspera/:id*?', function (req, res, next) {
    if (req.params.id) {
        listaEspera.findById(req.params._id, function (err, data) {
            if (err) {
                next(err);
            };
            //console.log(data);
            res.json(data);
        });
    } else {

        var query;
        var opciones = {};

        /*if (req.query.paciente.nombre) {
            opciones['paciente.nombre'] = {
                '$regex': utils.makePattern(req.query.paciente.nombre)
            };
        }

        if (req.query.paciente.apellido) {
            opciones['paciente.apellido'] = {
                '$regex': utils.makePattern(req.query.paciente.apellido)
            };
        }*/

        if (req.query.documento) {
            opciones['paciente.documento'] = utils.makePattern(req.query.documento)
        }

    }
    let skip: number = parseInt(req.query.skip || 0);
    let limit: number = Math.min(parseInt(req.query.limit || defaultLimit), maxLimit);
    query = listaEspera.find(opciones).skip(skip).limit(limit);
    query.exec(function (err, data) {
        if (err) return next(err);
        res.json(data);
    });

});

router.post('/listaEspera', function (req, res, next) {
    var newItem = new listaEspera(req.body);
    newItem.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newItem);
    })
});

router.put('/listaEspera/:_id', function (req, res, next) {
    listaEspera.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/listaEspera/:_id', function (req, res, next) {
    listaEspera.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;