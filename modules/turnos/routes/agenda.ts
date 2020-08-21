
import * as express from 'express';
import * as agenda from '../schemas/agenda';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import * as moment from 'moment';
import * as agendaCtrl from '../controller/agenda';
import * as prestacionCtrl from '../../rup/controllers/prestacion';
import * as diagnosticosCtrl from '../controller/diagnosticosC2Controller';
import { getResumenDiarioMensual, getPlanillaC1 } from '../controller/reportesDiariosController';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { toArray } from '../../../utils/utils';
import { agendaLog } from '../citasLog';

import * as AgendasEstadisticas from '../controller/estadisticas';
import { EventCore } from '@andes/event-bus';

const router = express.Router();

// devuelve los 10 ultimos turnos del paciente
router.get('/agenda/paciente/:idPaciente', (req, res, next) => {

    if (req.params.idPaciente) {
        agenda
            .find({ 'bloques.turnos.paciente.id': req.params.idPaciente })
            .limit(10)
            .sort({ horaInicio: -1 })
            .exec((err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
    }

});

// devuelve las agendas candidatas para la operacion clonar agenda
router.get('/agenda/candidatas', async (req, res, next) => {
    agenda.findById(req.query.idAgenda, async (err, data) => {
        if (err) {
            return next(err);
        }

        const resultado = data as any;
        const horaAgendaOrig = new Date();
        horaAgendaOrig.setHours(0, 0, 0, 0);

        const indiceBloque = resultado.bloques.findIndex(y => Object.is(req.query.idBloque, String(y._id)));
        const indiceTurno = resultado.bloques[indiceBloque].turnos.findIndex(y => Object.is(req.query.idTurno, String(y._id)));
        const bloque = resultado.bloques[indiceBloque];

        // turno a reasignar
        const turno = resultado.bloques[indiceBloque].turnos[indiceTurno];
        let estado = [];
        if (turno.tipoTurno && (turno.tipoTurno === 'programado' || turno.tipoTurno === 'delDia')) {
            estado = [{ estado: 'publicada' }];
        } else {
            estado = [{ estado: 'disponible' }, { estado: 'publicada' }];
        }
        const match = {
            'organizacion._id': { $eq: mongoose.Types.ObjectId(Auth.getOrganization(req)) }, // Que sean agendas de la misma organizacion
            horaInicio: { $gte: horaAgendaOrig },
            nominalizada: true,
            // '$or': [{ estado: 'disponible' }, { estado: 'publicada' }],
            $or: estado,
            'tipoPrestaciones._id': turno.tipoPrestacion ? mongoose.Types.ObjectId(turno.tipoPrestacion.id) : '', // Que tengan incluída la prestación del turno
            _id: { $ne: mongoose.Types.ObjectId(req.query.idAgenda) }, // Que no sea la agenda original
        };

        if (req.query.duracion) {
            match['bloques.duracionTurno'] = bloque.duracionTurno;
        }
        try {
            const data1 = await toArray(agenda.aggregate([{ $match: match }]).cursor({}).exec());

            const out = [];
            // Verifico que existe un turno disponible o ya reasignado para el mismo tipo de prestación del turno
            data1.forEach((a, indiceA) => {
                a.bloques.forEach((b, indiceB) => {
                    b.turnos.forEach((t, indiceT) => {
                        const horaIni = moment(t.horaInicio).format('HH:mm');
                        if (
                            b.tipoPrestaciones.findIndex(x => String(x._id) === String(turno.tipoPrestacion.id)) >= 0
                            &&  // mismo tipo de prestacion
                            (t.estado === 'disponible' || (t.estado === 'asignado' && typeof t.reasignado !== 'undefined' && t.reasignado.anterior && t.reasignado.anterior.idTurno === req.query.idTurno))
                            &&  // turno disponible o al que se reasigno
                            (typeof req.query.horario !== 'undefined' ? horaIni.toString() === moment(turno.horaInicio).format('HH:mm') : true)
                            && // si filtro por horario verifico que sea el mismo
                            (req.query.duracion ? b.duracionTurno === bloque.duracionTurno : true) // si filtro por duracion verifico que sea la mismo
                        ) {
                            if (out.indexOf(a) < 0) {
                                out.push(a);
                            }
                        }
                    });
                });
            });

            const sortCandidatas = (a, b) => {
                return a.horaInicio - b.horaInicio;
            };

            out.sort(sortCandidatas);
            res.json(out);
        } catch (err) { return next(err); }
    });
});

router.get('/agenda/consultaDiagnostico', async (req, res, next) => {
    const organizacion = mongoose.Types.ObjectId(Auth.getOrganization(req));
    const params = req.query;
    params['organizacion'] = organizacion;
    agendaCtrl.getConsultaDiagnostico(params).then((resultado) => {
        res.json(resultado);
    });

});

router.get('/agenda/cantidadConsultaXPrestacion', async (req, res, next) => {
    const organizacion = mongoose.Types.ObjectId(Auth.getOrganization(req));
    const params = req.query;
    params['organizacion'] = organizacion;
    agendaCtrl.getCantidadConsultaXPrestacion(params).then((resultado) => {
        res.json(resultado);
    });

});

// reportesDiarios
router.get('/agenda/reporteResumenDiarioMensuals', async (req, res, next) => {
    let params = req.query;

    try {
        const resultado = await getResumenDiarioMensual(params);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }

});

router.get('/agenda/reportePlanillaC1', async (req, res, next) => {
    let params = req.query;

    try {
        const resultado = await getPlanillaC1(params);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }

});

router.get('/agenda/diagnosticos', async (req, res, next) => {
    const organizacion = mongoose.Types.ObjectId(Auth.getOrganization(req));
    const params = req.query;
    params['organizacion'] = organizacion;
    try {
        const resultado = await diagnosticosCtrl.getDiagnosticos(params);
        res.json(resultado);
    } catch (err) { return next(err); }
});

router.get('/agenda/:id?', (req, res, next) => {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        agenda.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = agenda.find({});

        query.where('estado').ne('borrada'); // No devuelve agendas borradas

        if (req.query.fechaDesde) {
            query.where('horaInicio').gte(req.query.fechaDesde);
        }

        if (req.query.fechaHasta) {
            query.where('horaFin').lte(req.query.fechaHasta);
        }

        if (req.query.idProfesional) {
            query.where('profesionales._id').equals(req.query.idProfesional);
        }

        if (req.query.idTipoPrestacion) {
            query.where('tipoPrestaciones._id').equals(req.query.idTipoPrestacion);
        }

        if (req.query.espacioFisico) {
            query.where('espacioFisico._id').equals(req.query.espacioFisico);
        }

        if (req.query.otroEspacioFisico) {
            query.where('otroEspacioFisico._id').equals(req.query.otroEspacioFisico);
        }

        if (req.query.estado) {
            query.where('estado').equals(req.query.estado);
        }

        if (req.query.estados) {
            query.where('estado').in(req.query.estados);
        }

        if (req.query.organizacion) {
            query.where('organizacion._id').equals(req.query.organizacion);
        }

        if (req.query.disponiblesProfesional) {
            query.where('bloques.restantesProfesional').gt(0);
        }

        if (req.query.disponiblesGestion) {
            query.where('bloques.restantesGestion').gt(0);
        }

        if (req.query.disponiblesDelDia) {
            query.where('bloques.restantesDelDia').gt(0);
        }

        if (req.query.disponiblesProgramados) {
            query.where('bloques.restantesProgramados').gt(0);
        }

        // Trae las Agendas NO nominalizadas
        if (req.query.nominalizada && req.query.nominalizada === false) {
            query.where('nominalizada').equals(false);
        }

        // Filtra por el array de tipoPrestacion enviado como parametro
        if (req.query.tipoPrestaciones) {
            query.where('tipoPrestaciones._id').in(req.query.tipoPrestaciones);
        }

        if (req.query.profesionales) {
            query.where('profesionales._id').in(req.query.profesionales);
        }

        if (req.query.tieneTurnosAsignados) {
            query.where('bloques.turnos.estado').equals('asignado');
        }

        if (req.query.turno) {
            query.where('bloques.turnos._id').equals(req.query.turno);
        }

        // Si rango es true  se buscan las agendas que se solapen con la actual en algún punto
        if (req.query.rango) {
            const variable: any[] = [];
            variable.push({ horaInicio: { $lte: req.query.desde }, horaFin: { $gt: req.query.desde } });
            variable.push({ horaInicio: { $lt: req.query.hasta }, horaFin: { $gte: req.query.hasta } });
            variable.push({ horaInicio: { $gt: req.query.desde, $lt: req.query.hasta } });
            query.or(variable);
        }

        if (!Object.keys(query).length) {
            res.status(400).send('Debe ingresar al menos un parámetro');
            return next(400);
        }

        query.sort({ horaInicio: 1 });

        if (req.query.skip) {
            query.skip(parseInt(req.query.skip || 0, 10));
        }

        if (req.query.limit) {
            query.limit(parseInt(req.query.limit || 0, 10));
        }

        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.post('/agenda', async (req, res, next) => {
    const data: any = new agenda(req.body);
    Auth.audit(data, req);
    try {
        const mensajesSolapamiento = await agendaCtrl.verificarSolapamiento(data);
        if (!mensajesSolapamiento) {
            let dataSaved = await data.save();
            const objetoLog = {
                accion: 'Crear Agenda',
                ruta: req.url,
                method: req.method,
                data: dataSaved,
            };
            agendaLog.info('insert', objetoLog, req);
            EventCore.emitAsync('citas:agenda:create', dataSaved);
            res.json(dataSaved);
        } else {
            // puede ser un mensaje de solapamiento o una excepción (Error)
            const objetoLog = {
                accion: 'Crear Agenda',
                ruta: req.url,
                method: req.method,
                data: req.body,
                err: mensajesSolapamiento
            };
            agendaLog.info('insert', objetoLog, req);
            return next(mensajesSolapamiento);
        }
    } catch (error) {
        const objetoLog = {
            accion: 'Crear Agenda',
            ruta: req.url,
            method: req.method,
            data: req.body,
            err: error
        };
        agendaLog.error('insert', objetoLog, req);
        return next(error);
    }
});

// Este post recibe el id de la agenda a clonar y un array con las fechas en las cuales se va a clonar
router.post('/agenda/clonar', (req, res, next) => {
    const idagenda = req.body.idAgenda;
    const clones = req.body.clones;
    const listaSaveAgenda = [];

    if (idagenda) {
        agenda.findById(idagenda, (err, data) => {
            if (err) {
                return next(err);
            }
            clones.forEach(clon => {
                clon = new Date(clon);
                if (clon) {
                    data._id = mongoose.Types.ObjectId();
                    data.isNew = true;
                    const nueva: any = new agenda(data.toObject());
                    nueva['horaInicio'] = agendaCtrl.combinarFechas(clon, new Date(data['horaInicio']));
                    nueva['horaFin'] = agendaCtrl.combinarFechas(clon, new Date(data['horaFin']));
                    nueva['updatedBy'] = undefined;
                    nueva['updatedAt'] = undefined;
                    nueva['nota'] = null;

                    if (nueva.dinamica && nueva.cupo >= 0) {
                        nueva.bloques.forEach(b => {
                            nueva.cupo += b.turnos.length;
                        });
                    }

                    // nueva['bloques'] = data['bloques'];
                    nueva['bloques'].forEach((bloque) => {
                        bloque.horaInicio = agendaCtrl.combinarFechas(clon, bloque.horaInicio);
                        bloque.horaFin = agendaCtrl.combinarFechas(clon, bloque.horaFin);
                        if (bloque.pacienteSimultaneos) {
                            bloque.restantesDelDia = bloque.accesoDirectoDelDia * bloque.cantidadSimultaneos;
                            bloque.restantesProgramados = bloque.accesoDirectoProgramado * bloque.cantidadSimultaneos;
                            bloque.restantesGestion = bloque.reservadoGestion * bloque.cantidadSimultaneos;
                            bloque.restantesProfesional = bloque.reservadoProfesional * bloque.cantidadSimultaneos;
                            bloque.restantesMobile = bloque.cupoMobile ? bloque.cupoMobile * bloque.cantidadSimultaneos : 0;

                        } else {
                            bloque.restantesDelDia = bloque.accesoDirectoDelDia;
                            bloque.restantesProgramados = bloque.accesoDirectoProgramado;
                            bloque.restantesGestion = bloque.reservadoGestion;
                            bloque.restantesProfesional = bloque.reservadoProfesional;
                            bloque.restantesMobile = bloque.cupoMobile ? bloque.cupoMobile : 0;
                        }
                        bloque._id = mongoose.Types.ObjectId();
                        if (!nueva.dinamica) {
                            bloque.turnos.forEach((turno, index1) => {
                                turno.horaInicio = agendaCtrl.combinarFechas(clon, turno.horaInicio);
                                turno.estado = 'disponible';
                                turno.asistencia = undefined;
                                turno.paciente = null;
                                turno.tipoPrestacion = nueva.nominalizada ? null : nueva.bloques[0].tipoPrestaciones[0];
                                turno.idPrestacionPaciente = null;
                                turno.nota = null;
                                turno._id = mongoose.Types.ObjectId();
                                turno.tipoTurno = undefined;
                                turno.updatedAt = undefined;
                                turno.updatedBy = undefined;
                                turno.diagnostico = { codificaciones: [] };
                                turno.reasignado = undefined;
                            });
                        } else {
                            bloque.turnos = [];
                        }
                    });
                    nueva['estado'] = 'planificacion';
                    nueva['sobreturnos'] = [];
                    Auth.audit(nueva, req);
                    listaSaveAgenda.push(
                        agendaCtrl.saveAgenda(nueva).then((nuevaAgenda) => {
                            // Ver si es necesario especificar que fue una agenda clonada
                            EventCore.emitAsync('citas:agenda:create', nuevaAgenda);
                            const objetoLog = {
                                accion: 'Clonar Agenda',
                                ruta: req.url,
                                method: req.method,
                                data: nuevaAgenda,
                                err: err || false
                            };
                            agendaLog.info('insert', objetoLog, req);
                        }).catch(error => {
                            return (error);
                        })
                    );
                }
            });
            Promise.all(listaSaveAgenda).then(resultado => {
                EventCore.emitAsync('citas:agenda:clone', data);
                res.json(resultado);
            }).catch(error => { return next(error); });
        });
    }
});

router.put('/agenda/:id', async (req, res, next) => {
    try {
        const mensajesSolapamiento = await agendaCtrl.verificarSolapamiento(req.body);
        if (!mensajesSolapamiento) {
            let data = await agenda.findByIdAndUpdate(req.params.id, req.body, { new: true });
            const objetoLog = {
                accion: 'Editar Agenda en estado Planificación',
                ruta: req.url,
                method: req.method,
                data,
                err: false
            };
            agendaLog.info('update', objetoLog, req);
            res.json(data);

            EventCore.emitAsync('citas:agenda:update', data);

        } else {
            // puede ser un mensaje de solapamiento o una excepción (Error)
            const objetoLog = {
                accion: 'Crear Agenda',
                ruta: req.url,
                method: req.method,
                data: req.body,
                err: mensajesSolapamiento
            };
            agendaLog.info('insert', objetoLog, req);
            return next(mensajesSolapamiento);
        }

    } catch (error) {
        const objetoLog = {
            accion: 'Editar Agenda en estado Planificación',
            ruta: req.url,
            method: req.method,
            data: req.body,
            err: error
        };
        agendaLog.error('update', objetoLog, req);
        return next(error);
    }
});

router.patch('/agenda/:id*?', (req, res, next) => {
    let event = { object: '', accion: '', data: null };
    // Hubo que agregar un control por si no se tiene el idagenda (en los casos en que el patch se haga desde RUP)
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        const t = req.body.turnos;
        if (t.length > 0) {
            agenda.find({ 'bloques.turnos._id': mongoose.Types.ObjectId(t[0]) }, (err, data) => {
                if (err) {
                    return next(err);
                }
                if (data.length > 0) {
                    if (req.body.op === 'codificarTurno') {
                        agendaCtrl.codificarTurno(req, data, t[0]).then(() => {
                            Auth.audit(data[0], req);
                            data[0].save((error) => {
                                const objetoLog = {
                                    accion: req.body.op,
                                    ruta: req.url,
                                    method: req.method,
                                    data,
                                    err: error || false
                                };
                                agendaLog.info('update', objetoLog, req);
                                if (error) {
                                    return next(error);
                                }
                                EventCore.emitAsync('citas:agenda:update', data[0]);
                            });
                            return res.json(data[0]);
                        }).catch(err2 => { return next(err2); });
                    }
                } else {
                    agenda.find({ 'sobreturnos._id': mongoose.Types.ObjectId(t[0]) }, (err2, data2) => {
                        if (err2) {
                            return next(err2);
                        }
                        if (req.body.op === 'codificarTurno') {
                            agendaCtrl.codificarTurno(req, data2, t[0]).then(() => {
                                Auth.audit(data2[0], req);
                                data2[0].save((error) => {
                                    const objetoLog = {
                                        accion: req.body.op,
                                        ruta: req.url,
                                        method: req.method,
                                        data: data2,
                                        err: error || false
                                    };
                                    agendaLog.info('update', objetoLog, req);
                                    // PAra probar ahora
                                    EventCore.emitAsync('citas:agenda:update', data2[0]);
                                    if (error) {
                                        return next(error);
                                    }
                                });
                                return res.json(data2[0]);
                            }).catch(err3 => { return next(err3); });
                        }
                    });
                }
                // Fin de insert cache
                // return res.json(data[0]);
            });
        }
        // return next('ObjectID Inválido');
    } else {
        agenda.findById(req.params.id, async (err, data: any) => {
            if (err) {
                return next(err);
            }
            // Loopear los turnos, si viene vacío, es porque viene un id solo
            const turnos = req.body.turnos || [''];
            const estadoAgenda = data.estado;
            for (let y = 0; y < turnos.length; y++) {
                let turno;
                switch (req.body.op) {
                    case 'darAsistencia':
                        turno = agendaCtrl.darAsistencia(req, data, turnos[y]);
                        event = { object: 'turno', accion: 'asistencia', data: turno };
                        break;
                    // Agregar operacion para marcar que noAsistio
                    case 'sacarAsistencia':
                        turno = agendaCtrl.sacarAsistencia(req, data, turnos[y]);
                        event = { object: 'turno', accion: 'unasistencia', data: turno }; // [TODO] Definir nombre
                        break;
                    case 'noAsistio':
                        turno = agendaCtrl.marcarNoAsistio(req, data, turnos[y]);
                        event = { object: 'turno', accion: 'inasistencia', data: turno };
                        break;
                    case 'quitarTurnoDoble':
                        agendaCtrl.quitarTurnoDoble(req, data, turnos[y]);
                        break;
                    case 'liberarTurno':
                        turno = agendaCtrl.getTurno(req, data, turnos[y]);
                        // LoggerPaciente.logTurno(req, 'turnos:liberar', turno.paciente, turno, bloqueId, agendaId);
                        LoggerPaciente.logTurno(req, 'turnos:liberar', turno.paciente, turno, agendaCtrl.getBloque(data, turno)._id, data);
                        await prestacionCtrl.liberarRefTurno(turno, req);
                        let liberado = await agendaCtrl.liberarTurno(req, data, turno);
                        if (!liberado) {
                            return next('Turno en ejecución');
                        }
                        event = { object: 'turno', accion: 'liberar', data: turno };
                        break;
                    case 'suspenderTurno':
                        turno = agendaCtrl.getTurno(req, data, turnos[y]);
                        if (agendaCtrl.getBloque(data, turno)) {
                            LoggerPaciente.logTurno(req, 'turnos:suspender', (turno.paciente ? turno.paciente : null), turno, agendaCtrl.getBloque(data, turno)._id, data._id);
                        } else {
                            // Caso sobreturno
                            LoggerPaciente.logTurno(req, 'turnos:suspender', (turno.paciente ? turno.paciente : null), turno, -1, data._id);
                        }
                        agendaCtrl.suspenderTurno(req, data, turno);
                        event = { object: 'turno', accion: 'suspender', data: turno };
                        break;
                    case 'codificarTurno':
                        agendaCtrl.codificarTurno(req, data, turnos[y]).catch((err2) => {
                            return next(err2);
                        });
                        break;
                    case 'guardarNotaTurno':
                        agendaCtrl.guardarNotaTurno(req, data, req.body.idTurno);
                        break;
                    case 'darTurnoDoble':
                        agendaCtrl.darTurnoDoble(req, data, turnos[y]);
                        break;
                    case 'notaAgenda':
                        agendaCtrl.guardarNotaAgenda(req, data);
                        break;
                    case 'editarAgenda':
                        if (estadoAgenda !== 'pendienteAuditoria' && estadoAgenda !== 'auditada' && estadoAgenda !== 'pausada' && estadoAgenda !== 'suspendida') {
                            agendaCtrl.editarAgenda(req, data);
                            event = { object: 'agenda', accion: 'update', data };
                        } else {
                            return next('Operacion no exitosa');
                        }
                        break;
                    case 'agregarSobreturno':
                        event = { object: 'turno', accion: 'asignar', data: null };
                        event.data = agendaCtrl.agregarSobreturno(req, data);
                        break;
                    case 'disponible':
                        if (estadoAgenda !== 'planificacion') {
                            return next('Operacion no exitosa');
                        } else {
                            agendaCtrl.actualizarEstado(req, data);
                            event = { object: 'agenda', accion: 'estado', data };
                        }
                        break;
                    case 'publicada':
                        if (estadoAgenda !== 'planificacion' && estadoAgenda !== 'disponible') {
                            return next('Operacion no exitosa');
                        } else {
                            agendaCtrl.actualizarEstado(req, data);
                            event = { object: 'agenda', accion: 'estado', data };
                        }
                        break;
                    case 'pausada':
                        if (estadoAgenda === 'planificacion' || estadoAgenda === 'pausada' || estadoAgenda === 'suspendida' || estadoAgenda === 'auditada' || estadoAgenda === 'pendienteAuditoria') {
                            return next('Operacion no exitosa');
                        } else {
                            agendaCtrl.actualizarEstado(req, data);
                            event = { object: 'agenda', accion: 'estado', data };
                        }
                        break;
                    case 'prePausada':
                        if (estadoAgenda !== 'pausada') {
                            return next('Operacion no exitosa');
                        } else {
                            agendaCtrl.actualizarEstado(req, data);
                            event = { object: 'agenda', accion: 'estado', data };
                        }
                        break;
                    case 'pendienteAuditoria':
                    case 'pendienteAsistencia':
                    case 'auditada':
                        agendaCtrl.actualizarEstado(req, data);
                        event = { object: 'agenda', accion: 'estado', data };
                        break;
                    case 'borrada':
                        if (estadoAgenda === 'planificacion') {
                            agendaCtrl.actualizarEstado(req, data);
                            event = { object: 'agenda', accion: 'estado', data };
                        } else {
                            return next('Operacion no exitosa');
                        }
                        break;
                    case 'suspendida':
                        if (estadoAgenda === 'disponible' || estadoAgenda === 'publicada') {
                            if (! await agendaCtrl.poseeAsistencia(data)) {
                                agendaCtrl.actualizarEstado(req, data);
                                event = { object: 'agenda', accion: 'estado', data };
                            } else {
                                return res.json({ data, mensaje: 'No se puede suspender la agenda ya que posee asistencia registrada' });
                            }
                        } else {
                            return next('Operacion no exitosa');
                        }
                        break;
                    case 'avisos':
                        agendaCtrl.agregarAviso(req, data);
                        break;
                    default:
                        return next('Error: No se seleccionó ninguna opción.');
                }
            }
            Auth.audit(data, req);
            data.save((error) => {
                EventCore.emitAsync('citas:agenda:update', data);

                if (event.data) {
                    EventCore.emitAsync(`citas:${event.object}:${event.accion}`, event.data);
                }
                const objetoLog = {
                    accion: req.body.op,
                    ruta: req.url,
                    method: req.method,
                    data,
                    err: error || false
                };
                agendaLog.info('update', objetoLog, req);
                if (error) {
                    return next(error);
                }

                if (req.body.op === 'suspendida') {
                    (data as any).bloques.forEach(bloque => {

                        // Loggear cada turno
                        bloque.turnos.forEach(t => {
                            if (t.paciente && t.paciente.id) {
                                LoggerPaciente.logTurno(req, 'turnos:suspender', t.paciente, t, bloque._id, data._id);
                            }
                        });

                    });
                }
            });

            res.json(data);

            return;
        });
    }
});

router.post('/dashboard', async (req, res, next) => {
    const permisos: any = {};
    let tipoPrestacion = Auth.getPermissions(req, 'dashboard:citas:tipoPrestacion:?');
    if (tipoPrestacion.length > 0 && tipoPrestacion[0] !== '*') {
        permisos.tipoPrestacion = tipoPrestacion;
    }

    try {
        const stats = await AgendasEstadisticas.estadisticas(req.body, permisos);
        return res.json(stats);
    } catch (err) {
        return next(err);
    }
});

router.post('/dashboard/descargarCsv', async (req, res, next) => {
    const csv = require('fast-csv');
    const fs = require('fs');
    let ws = fs.createWriteStream('/tmp/dashboard.csv', { encoding: 'utf8' });

    try {
        csv
            .write(req.body, {
                headers: true, transform: (row) => {
                    return {
                        Nombre: row.nombre,
                        Cantidad: row.count,
                        '': '',
                        'Consulta de': row.tipoDeFiltro ? row.tipoDeFiltro.toUpperCase() : '',
                        Organización: row.organizacion ? (req as any).user.organizacion.nombre : '',
                        'Fecha Desde': row.fechaDesde ? moment(row.fechaDesde).format('DD-MM-YYYY') : '',
                        'Fecha Hasta': row.fechaHasta ? moment(row.fechaHasta).format('DD-MM-YYYY') : '',
                        Prestación: row.prestacion ? row.prestacion.map(pr => pr.nombre) : '',
                        Profesional: row.profesional ? row.profesional : '',
                        'Tipo de Turno': (row.tipoTurno && row.tipoDeFiltro === 'turno') ? row.tipoTurno : '',
                        Estado: (row.estado_agenda || row.estado_turno) ? (row.estado_agenda ? row.estado_agenda : row.estado_turno) : ''
                    };
                }
            })
            .pipe(ws)
            .on('finish', () => {
                res.download(('/tmp/dashboard.csv' as string), (err) => {
                    if (err) {
                        next(err);
                        // fs.unlink('/tmp/my.csv');
                    } else {
                        next();
                        // fs.unlink('/tmp/my.csv');
                    }
                });
            });
    } catch (err) {
        return next(err);
    }
});

router.post('/dashboard/localidades', async (req, res, next) => {
    const permisos: any = {};
    let tipoPrestacion = Auth.getPermissions(req, 'dashboard:citas:tipoPrestacion:?');
    if (tipoPrestacion.length > 0 && tipoPrestacion[0] !== '*') {
        permisos.tipoPrestacion = tipoPrestacion;
    }

    try {
        const stats = await AgendasEstadisticas.filtroPorCiudad(req.body, permisos);
        return res.json(stats);
    } catch (err) {
        return next(err);
    }
});

router.get('/agenda/turno/:idTurno', async (req, res, next) => {
    try {
        const datosTurno = await agendaCtrl.getDatosTurnos(req.params.idTurno);
        res.json(datosTurno);
    } catch (err) {
        return next(err);
    }

});

/**
 * Get agendas disponibles a partir de un conceptId
 * Filtrando los bloques con ese tipo de prestación y turnos de acceso directo disponibles
 * y solo devolviendo una agenda por profesional con el turno más próximo
 */

router.get('/totem/disponibles', async (req: any, res, next) => {
    if (!req.query.prestacion) {
        return res.json();
    }
    try {
        const organization = new mongoose.Types.ObjectId(Auth.getOrganization(req));
        const turnos = await agendaCtrl.turnosDisponibles(req.query.prestacion, organization);
        res.json(turnos);
    } catch (err) {
        return next(err);
    }
});

/**
 * Get prestaciones que corresponden a agendas disponibles para el totem
 * osea, que tienen turnos de acceso directo disponibles
 */

router.get('/totem/prestaciones', async (req: any, res, next) => {
    try {
        const prestaciones = await agendaCtrl.prestacionesDisponibles(req);
        res.json(prestaciones);
    } catch (err) {
        return next(err);
    }
});


export = router;
