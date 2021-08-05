import * as express from 'express';
import * as moment from 'moment';
import { Logger } from '../../../utils/logService';
import * as utils from '../../../utils/utils';
import { Agenda } from '../schemas/agenda';
import * as listaEspera from '../schemas/listaEspera';
import { defaultLimit, maxLimit } from './../../../config';

const async = require('async');
const router = express.Router();

router.get('/listaEspera/:id*?', (req, res, next) => {
    let query;
    const opciones = {};

    if (req.params.id) {
        listaEspera.findById(req.params._id, (err, data) => {
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
    const radix = 10;
    const skip: number = parseInt(req.query.skip || 0, radix);
    const limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);
    query = listaEspera.find(opciones).skip(skip).limit(limit);
    query.exec((err, data) => {
        if (err) { return next(err); }
        res.json(data);
    });

});

router.post('/listaEspera', async (req, res, next) => {

    const newItem = new listaEspera(req.body);
    newItem.save((err) => {
        if (err) {
            return next(err);
        }
        Logger.log(req, 'citas', 'lista espera', (errLog) => {
            if (errLog) {
                return next(err);
            }
        });
        res.json(newItem);
    });
});

router.put('/listaEspera/:id', (req, res, next) => {
    listaEspera.findByIdAndUpdate(req.params._id, req.body, { new: true }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

/* Si viene un id es porque se están enviando pacientes a la lista de espera desde una agenda suspendida*/
router.post('/listaEspera/IdAgenda/:id', (req, res, next) => {
    Agenda.findById(req.params._id, (err, data) => {
        if (err) {
            return next(err);
        }
        let listaEsperaPaciente: any[] = [];

        switch (req.body.op) {
            case 'listaEsperaSuspensionAgenda':
                listaEsperaPaciente = listaEsperaSuspensionAgenda(req, data, next);
                break;
        }

        async.each(listaEsperaPaciente, (listaEsperaData, callback) => {
            const newItem = new listaEspera(listaEsperaData);

            newItem.save((err1, item) => {
                callback();
            });

        }, (err2) => {
            if (err2) {
                return next(err2);
            }
            return res.json(data);
        });
    });
});


router.delete('/listaEspera/:id', (req, res, next) => {
    listaEspera.findByIdAndRemove(req.params._id, req.body, (err, data) => {
        if (err) { return next(err); }
        res.json(data);
    });
});

function listaEsperaSuspensionAgenda(req, data, next) {
    const listaEsperaArray = [];

    if (req.body.pacientes.length > 0) {
        for (let i = 0; i < req.body.pacientes.length; i++) {
            const newListaEspera = {};
            newListaEspera['fecha'] = moment().format();
            newListaEspera['estado'] = 'Agenda Suspendida';
            newListaEspera['tipoPrestacion'] = req.body.pacientes[i].tipoPrestacion;
            newListaEspera['profesional'] = data.profesionales[0];
            newListaEspera['paciente'] = req.body.pacientes[i].paciente;

            listaEsperaArray.push(newListaEspera);
        }
    } else {
        const newListaEspera = {};
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
