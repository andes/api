import * as express from 'express';
import * as listaEspera from '../schemas/listaEspera';
import * as agenda from '../schemas/agenda';
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';
import * as config from '../../../config';
import * as moment from 'moment';
import { Logger } from '../../../utils/logService';

var async = require('async');

var router = express.Router();

router.get('/listaEspera/:id*?', function (req, res, next) {
    if (req.params.id) {
        listaEspera.findById(req.params._id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {

        var query;
        var opciones = {};

        if (req.query.nombre) {
            opciones['paciente.nombre'] =
                RegExp('^.*' + req.query.nombre + '.*$', "i")
        }

        if (req.query.apellido) {
            opciones['paciente.apellido'] =
                RegExp('^.*' + req.query.apellido + '.*$', "i")
        }

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

    let newItem = new listaEspera(req.body);
    newItem.save((err) => {
        if (err) {
            return next(err);
        }
        Logger.log(req, 'turnos', 'lista espera' );
        res.json(newItem);
    });

});

router.put('/listaEspera/:_id', function (req, res, next) {
    listaEspera.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

/*Si viene un id es porque se están enviando pacientes a la lista de espera desde una agenda suspendida*/
router.post('/listaEspera/IdAgenda/:_id', function (req, res, next) {
    agenda.findById(req.params._id, function (err, data) {
        if (err) {
            return next(err);
        }
        var listaEsperaPaciente: any[] = [];

        switch (req.body.op) {
            case 'listaEsperaSuspensionAgenda': listaEsperaPaciente = listaEsperaSuspensionAgenda(req, data, next);
                break;
        }

        async.each(listaEsperaPaciente, function (listaEsperaData, callback) {
            var newItem = new listaEspera(listaEsperaData);

            newItem.save(function (err, item) {
                if (err) {
                    console.log(err);
                }

                callback();
            });

        }, function (error) {
            if (error) res.json(500, { error: error });

            return res.json(data);
            // return res.json(201, { msg: 'Guardado' });
        });
    });
});


router.delete('/listaEspera/:_id', function (req, res, next) {
    listaEspera.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

function listaEsperaSuspensionAgenda(req, data, next) {

    var listaEspera = [];

    if (req.body.pacientes.length > 0) {
        for (var i = 0; i < req.body.pacientes.length; i++) {
            var newListaEspera = {};

            newListaEspera['fecha'] = moment().format(),
                newListaEspera['estado'] = 'Agenda Suspendida',
                newListaEspera['prestacion'] = req.body.pacientes[i].prestacion,
                newListaEspera['profesional'] = data.profesionales[0],
                newListaEspera['paciente'] = req.body.pacientes[i].paciente;

            listaEspera.push(newListaEspera);
        }
    } else {
        var newListaEspera = {};

        newListaEspera['fecha'] = moment().format(),
            newListaEspera['estado'] = 'Turno Canceladdo',
            newListaEspera['prestacion'] = req.body.pacientes.prestacion,
            newListaEspera['profesional'] = data.profesionales[0],
            newListaEspera['paciente'] = req.body.pacientes.paciente;

        listaEspera.push(newListaEspera);
    }

    return listaEspera;
}

export = router;