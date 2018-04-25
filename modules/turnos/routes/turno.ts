import { log } from './../../../core/log/schemas/log';
import { ValidateDarTurno } from './../../../utils/validateDarTurno';
import * as express from 'express';
import * as agenda from '../schemas/agenda';
import { Logger } from '../../../utils/logService';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { NotificationService } from '../../mobileApp/controller/NotificationService';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import * as operations from './../../legacy/controller/operations';
import * as turnosController from '../controller/turnosController';
import { esPrimerPaciente } from '../controller/agenda';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as debug from 'debug';

let router = express.Router();
let dbgTurno = debug('dbgTurno');

router.get('/turno/:id*?', async function (req, res, next) {
    try {
        let resultado = await turnosController.getTurno(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }

});


/**
 * Espera un objeto como este:
 * // Datos del Turno
    let datosTurno = {
        idAgenda: String,
        idBloque: String,
        idTurno: String,
        paciente: paciente,
        tipoPrestacion: conceptoTurneable,
        tipoTurno: enum: delDia | programado | gestion | profesional,
        motivoConsulta: String
    };
 */
router.patch('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', function (req, res, next) {
    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    let continues = ValidateDarTurno.checkTurno(req.body);

    if (continues.valid) {

        // Se verifica la existencia del paciente
        paciente.findById(req.body.paciente.id, function verificarPaciente(err, cant) {
            if (err) {
                return next(err);
            } else {
                // Se verifica la existencia del tipoPrestacion
                tipoPrestacion.findById(req.body.tipoPrestacion._id, function verificarTipoPrestacion(err2, data2) {
                    if (err2) {
                        return next(err2);
                    } else {
                        // Se obtiene la agenda que se va a modificar
                        agenda.findById(req.params.idAgenda, async function getAgenda(err3, data) {
                            if (err3) {
                                return next(err3);
                            }
                            let posBloque: number;
                            let posTurno: number;

                            let countBloques;
                            let esHoy = false;

                            // Los siguientes 2 for ubican el indice del bloque y del turno
                            for (let x = 0; x < (data as any).bloques.length; x++) {
                                if ((data as any).bloques[x]._id.equals(req.params.idBloque)) {
                                    posBloque = x;

                                    // Ver si el día de la agenda coincide con el día de hoy
                                    if ((data as any).horaInicio >= moment(new Date()).startOf('day').toDate() && (data as any).horaInicio <= moment(new Date()).endOf('day').toDate()) {
                                        esHoy = true;
                                    }

                                    // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
                                    countBloques = {
                                        delDia: esHoy ? (
                                            ((data as any).bloques[x].restantesDelDia as number) +
                                            ((data as any).bloques[x].restantesProgramados as number)
                                        ) : (data as any).bloques[x].restantesDelDia,
                                        programado: esHoy ? 0 : (data as any).bloques[x].restantesProgramados,
                                        gestion: esHoy ? 0 : (data as any).bloques[x].restantesGestion,
                                        profesional: esHoy ? 0 : (data as any).bloques[x].restantesProfesional
                                    };

                                    for (let y = 0; y < (data as any).bloques[posBloque].turnos.length; y++) {
                                        if ((data as any).bloques[posBloque].turnos[y]._id.equals(req.params.idTurno)) {
                                            let turnoSeleccionado = (data as any).bloques[posBloque].turnos[y];
                                            if (turnoSeleccionado.estado === 'disponible') {
                                                posTurno = y;
                                            } else {
                                                return next('noDisponible');
                                            }
                                        }
                                    }
                                }
                            }

                            let tipoTurno = req.body.tipoTurno ? req.body.tipoTurno : (esHoy && req.query.reasignacion ? 'delDia' : 'programado');

                            // En una reasignación de turno se descarta el tipo de turno original y se reasigna a "del día" o "programado"
                            if (req.query.reasignacion) {
                                // Es el día de la agenda y no quedan turnos "del día" disponibles?
                                if (esHoy && (countBloques['restantesDelDia'] as number) === 0 && (countBloques['restantesProgramados'] as number) === 0) {
                                    return next('No quedan turnos del día disponibles');
                                }
                                // Es una agenda futura y no quedan turnos "programados" disponibles?
                                if (!esHoy && (countBloques['restantesProgramados'] as number) === 0) {
                                    return next('No quedan turnos programados disponibles');
                                }
                                tipoTurno = esHoy ? 'delDia' : 'programado';
                                // Dar turno normal
                            } else {
                                // Quedan turnos del tipo específico pedido?
                                if ((countBloques[tipoTurno] as number) === 0) {
                                    return next('No quedan turnos del tipo ' + tipoTurno);
                                }
                            }

                            // Verifica si el turno se encuentra todavia disponible
                            // Si quedan turnos
                            let update: any = {};
                            switch (tipoTurno) {
                                case ('delDia'):
                                    update['bloques.' + posBloque + '.restantesDelDia'] = countBloques.delDia - 1;
                                    update['bloques.' + posBloque + '.restantesProgramados'] = 0;
                                    update['bloques.' + posBloque + '.restantesProfesional'] = 0;
                                    update['bloques.' + posBloque + '.restantesGestion'] = 0;
                                    break;
                                case ('programado'):
                                    update['bloques.' + posBloque + '.restantesProgramados'] = countBloques.programado - 1;
                                    break;
                                case ('profesional'):
                                    update['bloques.' + posBloque + '.restantesProfesional'] = countBloques.profesional - 1;
                                    break;
                                case ('gestion'):
                                    update['bloques.' + posBloque + '.restantesGestion'] = countBloques.gestion - 1;
                                    break;
                            }
                            let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
                            // Copia la organización desde el token
                            usuario.organizacion = (req as any).user.organizacion;

                            let etiquetaTipoTurno: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoTurno';
                            let etiquetaEstado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estado';
                            let etiquetaPaciente: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.paciente';
                            let etiquetaPrestacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoPrestacion';
                            let etiquetaNota: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.nota';
                            let etiquetaMotivoConsulta: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.motivoConsulta';

                            let etiquetaReasignado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.reasignado';
                            let etiquetaUpdateAt: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedAt';
                            let etiquetaUpdateBy: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedBy';
                            let etiquetaPrimeraVez: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.primeraVez';

                            update[etiquetaEstado] = 'asignado';
                            update[etiquetaPrestacion] = req.body.tipoPrestacion;
                            update[etiquetaPaciente] = req.body.paciente;
                            update[etiquetaTipoTurno] = tipoTurno;
                            update[etiquetaNota] = req.body.nota;
                            update[etiquetaMotivoConsulta] = req.body.motivoConsulta;
                            if (req.body.reasignado) {
                                update[etiquetaReasignado] = req.body.reasignado;
                            }
                            update[etiquetaUpdateAt] = new Date();
                            update[etiquetaUpdateBy] = usuario;

                            // TODO: buscar si es primera vez del paciente => TP y paciente => Profesional

                            update[etiquetaPrimeraVez] = await esPrimerPaciente(agenda, req.body.paciente.id, ['primerPrestacion', 'primerProfesional']);

                            let query = {
                                _id: req.params.idAgenda,
                            };

                            // Agrega un tag al JSON query
                            query[etiquetaEstado] = 'disponible';

                            // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
                            (agenda as any).findOneAndUpdate(query, { $set: update }, { new: true }, function actualizarAgenda(err4, doc2: any, writeOpResult) {
                                if (err4) {
                                    return next(err4);
                                }
                                if (doc2 == null) {
                                    return next('noDisponible');
                                }
                                if (writeOpResult && writeOpResult.value === null) {
                                    return next('noDisponible');
                                } else {
                                    let datosOp = {
                                        estado: update[etiquetaEstado],
                                        paciente: update[etiquetaPaciente],
                                        prestacion: update[etiquetaPrestacion],
                                        tipoTurno: update[etiquetaTipoTurno] !== null ? update[etiquetaTipoTurno] : null,
                                        nota: update[etiquetaNota],
                                        motivoConsulta: update[etiquetaMotivoConsulta]
                                    };
                                    Logger.log(req, 'citas', 'asignarTurno', datosOp);
                                    let turno = doc2.bloques.id(req.params.idBloque).turnos.id(req.params.idTurno);

                                    LoggerPaciente.logTurno(req, 'turnos:dar', req.body.paciente, turno, req.params.idBloque, req.params.idAgenda);

                                    // Inserto la modificación como una nueva agenda, ya que luego de asociada a SIPS se borra de la cache
                                    // Donde doc2 es el documeto Agenda actualizado
                                    operations.cacheTurnosSips(doc2);
                                    // Fin de insert cache
                                    res.json(data);
                                }
                            });
                        });
                    }
                });

            }
        });
    } else {
        return next('Los datos del paciente son inválidos');
    }
});


router.patch('/turno/:idTurno/:idBloque/:idAgenda', function (req, res, next) {
    agenda.findById(req.params.idAgenda, async function getAgenda(err, data) {
        if (err) {
            return next(err);
        }
        let etiquetaAvisoSuspension: string;
        let etiquetaMotivoConsulta: string;
        if (req.params.idBloque !== '-1') {
            let indexBloque = (data as any).bloques.findIndex(bloq => {
                return (bloq.id === req.params.idBloque);
            });
            let indexTurno = (data as any).bloques[indexBloque].turnos.findIndex(t => {
                return (t.id === req.params.idTurno);
            });
            etiquetaAvisoSuspension = 'bloques.' + indexBloque + '.turnos.' + indexTurno + '.avisoSuspension';
            etiquetaMotivoConsulta = 'bloques.' + indexBloque + '.turnos.' + indexTurno + '.motivoConsulta';
        } else {
            let indexTurno = (data as any).sobreturnos.findIndex(sobreturno => Object.is(req.params.idTurno, String(sobreturno._id)));
            etiquetaAvisoSuspension = 'sobreturnos.' + indexTurno + '.avisoSuspension';
        }

        let update = {};
        if (req.body.avisoSuspension) {
            update[etiquetaAvisoSuspension] = req.body.avisoSuspension;
        }
        if (req.body.motivoConsulta) {
            update[etiquetaMotivoConsulta] = req.body.motivoConsulta;
        }
        let query = {
            _id: req.params.idAgenda,
        };
        dbgTurno('query --->', query);

        agenda.update(query, { $set: update }, function (error, data2) {
            if (error) {
                return next(error);
            }
            res.json(data2);
        });
    });
});

router.put('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', function (req, res, next) {
    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    let continues = ValidateDarTurno.checkTurno(req.body.turno);

    if (continues.valid) {
        // Se obtiene la agenda que se va a modificar
        agenda.findById(req.params.idAgenda, function getAgenda(err, data) {
            if (err) {
                return next(err);
            }
            let etiquetaTurno: string;
            let posTurno: number;
            let posBloque: number;
            if (req.params.idBloque !== '-1') {
                posBloque = (data as any).bloques.findIndex(bloque => Object.is(req.params.idBloque, String(bloque._id)));
                posTurno = (data as any).bloques[posBloque].turnos.findIndex(turno => Object.is(req.params.idTurno, String(turno._id)));
                etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
            } else {
                posTurno = (data as any).sobreturnos.findIndex(sobreturno => Object.is(req.params.idTurno, String(sobreturno._id)));
                etiquetaTurno = 'sobreturnos.' + posTurno;
            }
            let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
            // Copia la organización desde el token
            usuario.organizacion = (req as any).user.organizacion;

            let update: any = {};

            let query = {
                _id: req.params.idAgenda,
            };
            update[etiquetaTurno] = req.body.turno;
            // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
            (agenda as any).findOneAndUpdate(query, update, { new: true },
                function actualizarAgenda(err2, doc2, writeOpResult) {
                    if (err2) {
                        return next(err2);
                    }
                    if (writeOpResult && writeOpResult.value === null) {
                        return next('No se pudo actualizar los datos del turno');
                    } else {
                        let datosOp = {
                            turno: update[etiquetaTurno]
                        };
                        // TODO: loggear estas operaciones sobre turnos de forma mas clara.
                        Logger.log(req, 'citas', 'update', datosOp);
                    }
                    // Inserto la modificación como una nueva agenda, ya que luego de asociada a SIPS se borra de la cache
                    // Donde doc2 es el documeto de la Agenda actualizado
                    operations.cacheTurnosSips(doc2);
                    // Fin de insert cache
                    res.json(data);

                    if (req.body.turno.reasignado && req.body.turno.reasignado.siguiente) {
                        let turno = doc2.bloques.id(req.params.idBloque).turnos.id(req.params.idTurno);
                        LoggerPaciente.logTurno(req, 'turnos:reasignar', req.body.turno.paciente, turno, req.params.idBloque, req.params.idAgenda);

                        NotificationService.notificarReasignar(req.params);
                    }

                });
        });
    } else {
        return next('Los datos del paciente son inválidos');
    }
});

export = router;
