import * as express from 'express';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import * as utils from '../../../utils/utils';
import { Agenda } from '../schemas/agenda';
import { demanda, listaEspera } from '../schemas/listaEspera';
import { defaultLimit, maxLimit } from './../../../config';

const async = require('async');
const router = express.Router();

router.get('/listaEspera/:id*?', (req, res, next) => {
    let opciones = {};

    if (req.params.id) {
        listaEspera.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        if (req.query.pacienteId) {
            opciones['paciente.id'] = req.query.pacienteId;
        }
        if (req.query.conceptId) {
            opciones['tipoPrestacion.conceptId'] = req.query.conceptId;
        }
        if (req.query.estado) {
            opciones['estado'] = req.query.estado;
        }
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
        if (req.query.paciente) {
            opciones = {
                ...opciones,
                $or: [
                    { 'paciente.nombre': { $regex: req.query.paciente, $options: 'i' } },
                    { 'paciente.apellido': { $regex: req.query.paciente, $options: 'i' } },
                    { 'paciente.documento': { $regex: req.query.paciente, $options: 'i' } }
                ]
            };
        }
        if (req.query.fechaDesde) {
            const fechaDesde = new Date(req.query.fechaDesde);
            const fechaHasta = req.query.fechaHasta ? new Date(req.query.fechaHasta) : new Date();

            opciones['fecha'] = {
                $gte: fechaDesde,
                $lte: fechaHasta.setDate(fechaHasta.getDate() + 1)
            };
        }
        if (req.query.prestacion) {
            const terminos = req.query.prestacion?.split(',').map(term => term.trim());

            opciones['$or'] = terminos.map(term => ({
                'tipoPrestacion.term': RegExp('^.*' + term + '.*$', 'i')
            }));
        }

        const motivoFiltro = req.query.motivo
            ? { motivo: RegExp('^.*' + req.query.motivo + '.*$', 'i') }
            : {};

        const organizacionFiltro = req.query.organizacion
            ? { 'organizacion._id': { $in: req.query.organizacion.split(',') } }
            : {};

        if (req.query.motivo || req.query.organizacion) {
            opciones = {
                ...opciones,
                demandas: {
                    $elemMatch: {
                        ...motivoFiltro,
                        ...organizacionFiltro
                    }
                }
            };
        }

        const radix = 10;
        const skip: number = parseInt(req.query.skip || 0, radix);
        const limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);
        const query = listaEspera.find(opciones).skip(skip).limit(limit);

        query.exec((err, data) => {
            if (err) { return next(err); }
            res.json(data);
        });
    }
});

router.post('/listaEspera', async (req, res, next) => {
    const params = {
        'paciente.id': req.body.paciente.id,
        'tipoPrestacion.conceptId': req.body.tipoPrestacion.conceptId,
        estado: 'pendiente'
    };

    const unaDemanda = {
        profesional: req.body.demandas[0].Profesional,
        organizacion: req.body.demandas[0].organizacion,
        motivo: req.body.demandas[0].motivo,
        fecha: moment().toDate(),
        origen: req.body.demandas[0].origen
    };

    try {
        const listaDocument: any = await listaEspera.findOne(params, (data: any) => { return data; });
        let listaSaved;
        if (listaDocument?.demandas) {
            const newDemanda = new demanda(unaDemanda);
            Auth.audit(newDemanda, req);
            listaDocument.demandas.push(newDemanda);

            Auth.audit(listaDocument, req);
            listaSaved = await listaDocument.save();
        } else {
            const newListaDocument = new listaEspera(req.body);
            Auth.audit(newListaDocument, req);
            listaSaved = await newListaDocument.save();
        }
        res.json(listaSaved);
    } catch (error) {
        return next(error);
    }
});

router.put('/listaEspera/:id', (req, res, next) => {
    listaEspera.findByIdAndUpdate(req.params.id, req.body, { new: true }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/listaEspera/:id/:datoMod', async (req, res, next) => {
    try {
        const data: any = await listaEspera.findById(req.params.id).exec();
        if (!data) {
            return next(new Error('No se ha encontrado el registro.'));
        }

        const datoMod = req.params.datoMod;
        if (datoMod === 'demandas') {
            data.demandas = req.body;
        } else if (datoMod === 'estado') {
            data.estado = req.body.estado;
            data.resolucion = {
                fecha: req.body.fecha,
                motivo: req.body.motivo,
            };
            if (req.body.observacion) {
                data.resolucion.observacion = req.body.observacion;
            }
            if (req.body.turno) {
                const agenda: any = await Agenda.findById(req.body.turno.idAgenda).exec();
                if (!agenda) {
                    return next(new Error('No se ha encontrado la agenda.'));
                }

                const turnoAgenda = agenda.bloques.flatMap(bloque =>
                    bloque.turnos.filter(t => t._id.toString() === req.body.turno.id)
                )[0];

                if (!turnoAgenda) {
                    return next(new Error('No se ha encontrado el turno'));
                }

                const turno = {
                    id: turnoAgenda._id,
                    horaInicio: turnoAgenda.horaInicio,
                    tipo: turnoAgenda.tipoTurno,
                    emitidoPor: turnoAgenda.emitidoPor,
                    fechaHoraDacion: turnoAgenda.fechaHoraDacion,
                    profesionales: agenda.profesionales,
                    idAgenda: req.body.turno.idAgenda,
                    organizacion: {
                        id: agenda.organizacion.id,
                        nombre: agenda.organizacion.nombre
                    },
                };
                data.resolucion.turno = turno;
            }
        } else if (datoMod === 'llamados') {
            data.llamados = req.body;
        }

        Auth.audit(data, req);
        await data.save();
        res.json(data);
    } catch (error) {
        next(error);
    }
});

router.delete('/listaEspera/:id', (req, res, next) => {
    listaEspera.findByIdAndRemove(req.params.id, req.body, (err, data) => {
        if (err) { return next(err); }
        res.json(data);
    });
});

/* Si viene un id es porque se están enviando pacientes a la lista de espera desde una agenda suspendida*/
router.post('/listaEspera/IdAgenda/:id', (req, res, next) => {
    Agenda.findById(req.params.id, (err, data) => {
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
