import * as express from 'express';
import * as listaEspera from '../schemas/listaEspera';
import * as agenda from '../schemas/agenda';
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';
// import * as config from '../../../config';
import * as moment from 'moment';
import { Logger } from '../../../utils/logService';

let async = require('async');
let router = express.Router();

router.get('/listaEspera/:id*?', function (req, res, next) {
    let query;
    let opciones = {};

    if (req.params.id) {
        listaEspera.findById(req.params._id, function (err, data) {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
    } else {

        if (req.query.nombre) {
            opciones['paciente.nombre'] =
                RegExp('^.*' + req.query.nombre + '.*$', 'i');
        }

        if (req.query.apellido) {
            opciones['paciente.apellido'] =
                RegExp('^.*' + req.query.apellido + '.*$', 'i');
        }

        if (req.query.documento) {
            opciones['paciente.documento'] = utils.makePattern(req.query.documento);
        }

    }
    let radix = 10;
    let skip: number = parseInt(req.query.skip || 0, radix);
    let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);
    query = listaEspera.find(opciones).skip(skip).limit(limit);
    query.exec(function (err, data) {
        if (err) { return next(err); }
        res.json(data);
    });

});

router.post('/listaEspera', function (req, res, next) {

    let newItem = new listaEspera(req.body);
    newItem.save((err) => {
        if (err) {
            return next(err);
        }
        Logger.log(req, 'citas', 'lista espera');
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
        let listaEsperaPaciente: any[] = [];

        switch (req.body.op) {
            case 'listaEsperaSuspensionAgenda':
                listaEsperaPaciente = listaEsperaSuspensionAgenda(req, data, next);
                break;
        }

        async.each(listaEsperaPaciente, function (listaEsperaData, callback) {
            let newItem = new listaEspera(listaEsperaData);

            newItem.save(function (err1, item) {
                callback();
            });

        }, function (err2) {
            if (err2) {
                return next(err2);
            }
            return res.json(data);
        });
    });
});


router.delete('/listaEspera/:_id', function (req, res, next) {
    listaEspera.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err) { return next(err); }
        res.json(data);
    });
});

function listaEsperaSuspensionAgenda(req, data, next) {
    let listaEsperaArray = [];

    if (req.body.pacientes.length > 0) {
        for (let i = 0; i < req.body.pacientes.length; i++) {
            let newListaEspera = {};
            newListaEspera['fecha'] = moment().format();
            newListaEspera['estado'] = 'Agenda Suspendida';
            newListaEspera['tipoPrestacion'] = req.body.pacientes[i].tipoPrestacion;
            newListaEspera['profesional'] = data.profesionales[0];
            newListaEspera['paciente'] = req.body.pacientes[i].paciente;

            listaEsperaArray.push(newListaEspera);
        }
    } else {
        let newListaEspera = {};
        newListaEspera['fecha'] = moment().format();
        newListaEspera['estado'] = 'Turno Cancelado';
        newListaEspera['tipoPrestacion'] = req.body.pacientes.tipoPrestacion;
        newListaEspera['profesional'] = data.profesionales[0];
        newListaEspera['paciente'] = req.body.pacientes.paciente;
        listaEsperaArray.push(newListaEspera);
    }

    return listaEsperaArray;
}

export = router;
