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
router.get('/historial', async function (req, res, next) {
    try {
        let resultado = await turnosController.getHistorialPaciente(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }

});

function getPaciente(idPaciente) {
    return paciente.findById(idPaciente).exec();
}
function getTipoPrestacion(idTipoPrestacion) {
    return tipoPrestacion.findById(idTipoPrestacion).exec();
}
function getAgenda(idAgenda) {
    return agenda.findById(idAgenda).exec();
}

router.patch('/turno/agenda/:idAgenda', async function (req, res, next) {
    let continues = ValidateDarTurno.checkTurno(req.body);

    if (continues.valid) {
        let pacienteRes;
        let tipoPrestacionRes;
        let agendaRes;
        try {
            pacienteRes = await getPaciente(req.body.paciente.id);
            tipoPrestacionRes = await getTipoPrestacion(req.body.tipoPrestacion._id);
            agendaRes = await getAgenda(req.params.idAgenda);
        } catch (err) {
            return next(err);
        }
        let esHoy = false;
        // Ver si el día de la agenda coincide con el día de hoy
        if ((agendaRes as any).horaInicio >= moment(new Date()).startOf('day').toDate() && (agendaRes as any).horaInicio <= moment(new Date()).endOf('day').toDate()) {
            esHoy = true;
        }

        let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;
        let tipoTurno = (esHoy ? 'delDia' : 'programado');
        let turno = {
            horaInicio: moment(new Date(), 'YYYY-MM-DD HH:mm:ss'),
            estado: 'asignado',
            tipoTurno: tipoTurno,
            nota: req.body.nota,
            motivoConsulta: req.body.motivoConsulta,
            paciente: req.body.paciente,
            tipoPrestacion: req.body.tipoPrestacion,
            updatedAt: new Date(),
            updatedBy: usuario
        };
        let turnos = ((agendaRes as any).bloques[0].turnos);
        turnos.push(turno);
        let update;
        let query;
        // seteamos el cupo en -1 cuando la agenda no tiene límite de cupos
        if ((agendaRes as any).cupo > -1) {
            let nuevoCupo = ((agendaRes as any).cupo > 0) ? (agendaRes as any).cupo - 1 : 0;
            update = { 'bloques.0.turnos': turnos, cupo: nuevoCupo };
            query = {
                _id: req.params.idAgenda,
                cupo: { $gt: 0 }
            };
        } else {
            update = { 'bloques.0.turnos': turnos };
            query = {
                _id: req.params.idAgenda
            };
        }
        // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
        (agenda as any).findOneAndUpdate(query, { $set: update }, { new: true }, function actualizarAgenda(err4, doc2: any, writeOpResult) {
            if (err4) {
                return next(err4);
            }
            if (doc2 == null) {
                return next('Turno no disponible');
            }
            if (writeOpResult && writeOpResult.value === null) {
                return next('Turno no disponible');
            } else {
                let datosOp = {
                    estado: doc2.estado,
                    paciente: doc2.paciente,
                    prestacion: doc2.tipoPrestacion,
                    tipoTurno: doc2.tipoTurno,
                    nota: doc2.nota,
                    motivoConsulta: doc2.motivoConsulta
                };
                Logger.log(req, 'citas', 'asignarTurno', datosOp);
                let turnoLog = doc2.bloques[0].turnos[turnos.length - 1];

                LoggerPaciente.logTurno(req, 'turnos:dar', req.body.paciente, turnoLog, doc2.bloques[0].id, req.params.idAgenda);
                res.json(doc2);
            }
        });

    } else {
        return next('Los datos del paciente son inválidos');
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
router.patch('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', async function (req, res, next) {
    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    let continues = ValidateDarTurno.checkTurno(req.body);

    if (continues.valid) {
        let pacienteRes;
        let tipoPrestacionRes;
        let agendaRes;
        try {
            pacienteRes = await getPaciente(req.body.paciente.id);
            tipoPrestacionRes = await getTipoPrestacion(req.body.tipoPrestacion._id);
            agendaRes = await getAgenda(req.params.idAgenda);
        } catch (err) {
            return next(err);
        }
        let posBloque: number;
        let posTurno: number;

        let countBloques;
        let esHoy = false;

        // Los siguientes 2 for ubican el indice del bloque y del turno
        for (let x = 0; x < (agendaRes as any).bloques.length; x++) {
            if ((agendaRes as any).bloques[x]._id.equals(req.params.idBloque)) {
                posBloque = x;

                // Ver si el día de la agenda coincide con el día de hoy
                if ((agendaRes as any).horaInicio >= moment(new Date()).startOf('day').toDate() && (agendaRes as any).horaInicio <= moment(new Date()).endOf('day').toDate()) {
                    esHoy = true;
                }

                // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
                countBloques = {
                    delDia: esHoy ? (
                        ((agendaRes as any).bloques[x].restantesDelDia as number) +
                        ((agendaRes as any).bloques[x].restantesProgramados as number)
                    ) : (agendaRes as any).bloques[x].restantesDelDia,
                    programado: esHoy ? 0 : (agendaRes as any).bloques[x].restantesProgramados,
                    gestion: esHoy ? 0 : (agendaRes as any).bloques[x].restantesGestion,
                    profesional: esHoy ? 0 : (agendaRes as any).bloques[x].restantesProfesional
                };

                for (let y = 0; y < (agendaRes as any).bloques[posBloque].turnos.length; y++) {
                    if ((agendaRes as any).bloques[posBloque].turnos[y]._id.equals(req.params.idTurno)) {
                        let turnoSeleccionado = (agendaRes as any).bloques[posBloque].turnos[y];
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

        // update[etiquetaPrimeraVez] = await esPrimerPaciente(agenda, req.body.paciente.id, ['primerPrestacion', 'primerProfesional']);

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
                operations.cacheTurnos(doc2);
                // Fin de insert cache
                res.json(agendaRes);
            }
        });
    } else {
        return next('Los datos del paciente son inválidos');
    }
});


router.patch('/turno/:idTurno/:idBloque/:idAgenda', async function (req, res, next) {
    let agendaRes;
    try {
        agendaRes = await getAgenda(req.params.idAgenda);
    } catch (err) {
        return next(err);
    }
    let indexBloque = (agendaRes as any).bloques.findIndex(bloq => {
        return (bloq.id === req.params.idBloque);
    });
    let indexTurno = (agendaRes as any).bloques[indexBloque].turnos.findIndex(t => {
        return (t.id === req.params.idTurno);
    });
    let update = {};
    if (req.body.avisoSuspension) {
        let etiquetaAvisoSuspension: string = 'bloques.' + indexBloque + '.turnos.' + indexTurno + '.avisoSuspension';
        update[etiquetaAvisoSuspension] = req.body.avisoSuspension;
    }
    if (req.body.motivoConsulta) {
        let etiquetaMotivoConsulta: string = 'bloques.' + indexBloque + '.turnos.' + indexTurno + '.motivoConsulta';
        update[etiquetaMotivoConsulta] = req.body.motivoConsulta;

    }
    let query = {
        _id: req.params.idAgenda,
    };
    dbgTurno('query --->', query);

    agenda.update(query, { $set: update }, function (error, data) {
        if (error) {
            return next(error);
        }
        res.json(data);
    });
});

router.put('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', async function (req, res, next) {
    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    let continues = ValidateDarTurno.checkTurno(req.body.turno);

    if (continues.valid) {
        // Se obtiene la agenda que se va a modificar
        let agendaRes;
        try {
            agendaRes = await getAgenda(req.params.idAgenda);
        } catch (err) {
            return next(err);
        }
        let etiquetaTurno: string;
        let posTurno: number;
        let posBloque: number;
        if (req.params.idBloque !== '-1') {
            posBloque = (agendaRes as any).bloques.findIndex(bloque => Object.is(req.params.idBloque, String(bloque._id)));
            posTurno = (agendaRes as any).bloques[posBloque].turnos.findIndex(turno => Object.is(req.params.idTurno, String(turno._id)));
            etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
        } else {
            posTurno = (agendaRes as any).sobreturnos.findIndex(sobreturno => Object.is(req.params.idTurno, String(sobreturno._id)));
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
                operations.cacheTurnos(doc2);
                // Fin de insert cache
                res.json(doc2);

                if (req.body.turno.reasignado && req.body.turno.reasignado.siguiente) {
                    let turno = doc2.bloques.id(req.params.idBloque).turnos.id(req.params.idTurno);
                    LoggerPaciente.logTurno(req, 'turnos:reasignar', req.body.turno.paciente, turno, req.params.idBloque, req.params.idAgenda);

                    NotificationService.notificarReasignar(req.params);
                }

            });
    } else {
        return next('Los datos del paciente son inválidos');
    }
});

export = router;
