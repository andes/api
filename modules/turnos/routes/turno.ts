import { EventCore } from '@andes/event-bus';
import * as debug from 'debug';
import * as express from 'express';
import * as moment from 'moment';
import { Types } from 'mongoose';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import * as carpetaPaciente from '../../carpetas/schemas/carpetaPaciente';
import { NotificationService } from '../../mobileApp/controller/NotificationService';
import * as prepagasController from '../../obraSocial/controller/prepagas';
import { turnosLog } from '../citasLog';
import { getHistorial } from '../controller/historialCitasController/historialCitasController';
import * as turnosController from '../controller/turnosController';
import { Agenda } from '../schemas/agenda';
import { ValidateDarTurno } from './../../../utils/validateDarTurno';
import { Prestacion } from '../../../modules/rup/schemas/prestacion';
import { updateRegistroHistorialSolicitud } from '../../rup/controllers/prestacion';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();
const dbgTurno = debug('dbgTurno');

router.get('/turno/:id*?', async (req, res, next) => {

    try {
        const resultado = await turnosController.getTurno(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }

});
router.get('/historial', async (req, res, next) => {
    try {
        res.json(await getHistorial(req));
    } catch (err) {
        return next(err);
    }

});

async function getPaciente(idPaciente) {
    return await PacienteCtr.findById(idPaciente);
}
function getTipoPrestacion(idTipoPrestacion) {
    return tipoPrestacion.findById(idTipoPrestacion).exec();
}
function getAgenda(idAgenda) {
    return Agenda.findById(idAgenda).exec();
}
function getCarpeta(nroDocumento, idOrganizacion) {
    return carpetaPaciente.find({ documento: nroDocumento, 'carpetaEfectores.organizacion._id': idOrganizacion }).exec();
}

router.patch('/turno/agenda/:idAgenda', async (req, res, next) => {
    const continues = ValidateDarTurno.checkTurno(req.body);

    if (continues.valid) {
        let agendaRes;
        try {
            agendaRes = await getAgenda(req.params.idAgenda);
        } catch (err) {
            return next(err);
        }
        let esHoy = false;
        // Ver si el día de la agenda coincide con el día de hoy
        if ((agendaRes as any).horaInicio >= moment(new Date()).startOf('day').toDate() && (agendaRes as any).horaInicio <= moment(new Date()).endOf('day').toDate()) {
            esHoy = true;
        }

        const usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;
        const tipoTurno = (esHoy ? 'delDia' : 'programado');
        const fecha = new Date();
        const turno = {
            horaInicio: (agendaRes as any).horaInicio,
            estado: 'asignado',
            tipoTurno,
            nota: req.body.nota,
            link: req.body.link,
            motivoConsulta: req.body.motivoConsulta,
            paciente: req.body.paciente,
            tipoPrestacion: req.body.tipoPrestacion,
            updatedAt: fecha,
            updatedBy: usuario,
            fechaHoraDacion: fecha,
            usuarioDacion: usuario
        };
        const turnos = ((agendaRes as any).bloques[0].turnos);
        turnos.push(turno);
        let update;
        let query;
        // seteamos el cupo en -1 cuando la agenda no tiene límite de cupos
        if ((agendaRes as any).cupo > -1) {
            if ((agendaRes as any).cupo === 0) {
                // Si hubo solapamiento de turnos en el ultimo cupo (Dación de turnos al mismo tiempo)
                return next('Este turno ya no se encuentra disponible');
            }
            update = { $push: { 'bloques.0.turnos': turno }, $set: { cupo: (agendaRes as any).cupo - 1 } };
            query = {
                _id: req.params.idAgenda,
                cupo: { $gt: 0 }
            };
        } else {
            update = { $push: { 'bloques.0.turnos': turno } };
            query = {
                _id: req.params.idAgenda
            };
        }
        // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
        Agenda.findOneAndUpdate(query, update, { new: true }, (err4, doc2: any, writeOpResult) => {
            if (err4) {
                return next(err4);
            }
            if (doc2 == null) {
                return next('Turno no disponible');
            }
            if (writeOpResult && writeOpResult.value === null) {
                return next('Turno no disponible');
            } else {

                const datosOp = {
                    estado: doc2.estado,
                    paciente: doc2.paciente,
                    prestacion: doc2.tipoPrestacion,
                    tipoTurno: doc2.tipoTurno,
                    nota: doc2.nota,
                    link: doc2.link,
                    motivoConsulta: doc2.motivoConsulta
                };
                turnosLog.info('asignarTurno', datosOp, req);
                const turnoLog = doc2.bloques[0].turnos[turnos.length - 1];

                LoggerPaciente.logTurno(req, 'turnos:dar', req.body.paciente, turnoLog, doc2.bloques[0].id, req.params.idAgenda);
                res.json(turnoLog);

                EventCore.emitAsync('citas:turno:asignar', turno);

            }
        });

    } else {
        return next('Los datos del paciente son inválidos');
    }
});


/**
 * DAR UN TURNO
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

router.patch('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', async (req, res, next) => {
    const continues = ValidateDarTurno.checkTurno(req.body);
    const pacienteTurno = req.body.paciente;
    if (continues.valid) {
        const agendaRes: any = await getAgenda(req.body.idAgenda);
        if (agendaRes.estado === 'pausada' || agendaRes.estado === 'suspendida') {
            return next('La agenda ya no está disponible');
        }
        try {
            const user = (req as any).user;
            if (user.organizacion) {
                let arrPrueba = [];
                if (pacienteTurno.carpetaEfectores) {
                    arrPrueba = pacienteTurno.carpetaEfectores.find(carpeta => carpeta.organizacion._id.toString() === user.organizacion._id.toString());
                }
                // Si el paciente no tiene carpeta en ese efector, se busca en la colección carpetaPaciente y se actualiza
                if (!arrPrueba || arrPrueba.length === 0) {
                    const pacienteMPI = await PacienteCtr.findById(req.body.paciente.id) as any;
                    const carpetas = await getCarpeta(req.body.paciente.documento, user.organizacion._id);
                    await turnosController.actualizarCarpeta(req, res, next, pacienteMPI, carpetas);
                    pacienteTurno.carpetaEfectores = req.body.carpetaEfectores;
                }
            }

        } catch (err) {
            return next(err);
        }
        let posTurno: number;

        let esHoy = false;

        const posBloque = (agendaRes as any).bloques.findIndex(item => item._id.toString() === req.body.idBloque.toString());

        // Ver si el día de la agenda coincide con el día de hoy
        if ((agendaRes as any).horaInicio >= moment(new Date()).startOf('day').toDate() && (agendaRes as any).horaInicio <= moment(new Date()).endOf('day').toDate()) {
            esHoy = true;
        }

        const contieneBloqueSoloGestion = agendaRes.bloques.some((bloque: any) => bloque.reservadoGestion > 0 && bloque.accesoDirectoDelDia === 0 && bloque.accesoDirectoProgramado === 0 && bloque.reservadoProfesional === 0);
        // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
        const countBloques = {
            delDia: esHoy && !contieneBloqueSoloGestion ? (
                ((agendaRes as any).bloques[posBloque].restantesDelDia as number) +
                ((agendaRes as any).bloques[posBloque].restantesProgramados as number)
            ) : (agendaRes as any).bloques[posBloque].restantesDelDia,
            programado: esHoy ? 0 : (agendaRes as any).bloques[posBloque].restantesProgramados,
            gestion: esHoy && !contieneBloqueSoloGestion ? 0 : (agendaRes as any).bloques[posBloque].restantesGestion,
            profesional: esHoy ? 0 : (agendaRes as any).bloques[posBloque].restantesProfesional,
            mobile: esHoy ? 0 : (agendaRes as any).bloques[posBloque].restantesMobile,
        };
        posTurno = (agendaRes as any).bloques[posBloque].turnos.findIndex(item => item._id.toString() === req.body.idTurno.toString());

        const turnoSeleccionado = (agendaRes as any).bloques[posBloque].turnos[posTurno];
        if (turnoSeleccionado.estado === 'disponible') {
            posTurno = posTurno;
        } else {
            return next('noDisponible');
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
        const update: any = {};
        switch (tipoTurno) {
            case ('delDia'):
                update['bloques.' + posBloque + '.restantesDelDia'] = countBloques.delDia - 1;
                update['bloques.' + posBloque + '.restantesProgramados'] = 0;
                update['bloques.' + posBloque + '.restantesProfesional'] = 0;
                update['bloques.' + posBloque + '.restantesGestion'] = 0;
                break;
            case ('programado'):
                update['bloques.' + posBloque + '.restantesProgramados'] = countBloques.programado - 1;
                if (req.body.emitidoPor && (req.body.emitidoPor === 'appMobile' || req.body.emitidoPor === 'totem')) {
                    update['bloques.' + posBloque + '.restantesMobile'] = countBloques.mobile - 1;
                }
                break;
            case ('profesional'):
                update['bloques.' + posBloque + '.restantesProfesional'] = countBloques.profesional - 1;
                break;
            case ('gestion'):
                update['bloques.' + posBloque + '.restantesGestion'] = countBloques.gestion - 1;
                break;
        }
        const usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;

        const etiquetaTipoTurno: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoTurno';
        const etiquetaEstado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estado';
        const etiquetaPaciente: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.paciente';
        const etiquetaPrestacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoPrestacion';
        const etiquetaNota: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.nota';
        const etiquetaLink: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.link';
        const etiquetaEmitidoPor: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.emitidoPor';
        const etiquetaMotivoConsulta: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.motivoConsulta';
        const estadoFacturacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estadoFacturacion';

        const etiquetaReasignado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.reasignado';
        const etiquetaUpdateAt: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedAt';
        const etiquetaUpdateBy: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedBy';
        const etiquetaUsuarioDacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.usuarioDacion';
        const etiquetaFechHoraDacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.fechaHoraDacion';

        update[etiquetaEstado] = 'asignado';
        update[etiquetaPrestacion] = req.body.tipoPrestacion;
        // update[etiquetaPaciente] = req.body.paciente;
        update[etiquetaPaciente] = req.body.paciente;

        update[etiquetaTipoTurno] = tipoTurno;
        update[etiquetaNota] = req.body.nota;
        update[etiquetaLink] = req.body.link;
        update[etiquetaEmitidoPor] = req.body.emitidoPor ? req.body.emitidoPor : 'Gestión de pacientes';
        update[etiquetaMotivoConsulta] = req.body.motivoConsulta;
        update[estadoFacturacion] = req.body.estadoFacturacion;

        if (req.body.reasignado) {
            update[etiquetaReasignado] = req.body.reasignado;
        }
        update[etiquetaUpdateAt] = new Date();
        update[etiquetaUpdateBy] = usuario;
        update[etiquetaUsuarioDacion] = usuario;
        update[etiquetaFechHoraDacion] = new Date();

        const query = {
            _id: req.body.idAgenda,
        };

        // Agrega un tag al JSON query
        query[etiquetaEstado] = 'disponible';

        // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
        Agenda.findOneAndUpdate(query, { $set: update }, { new: true }, async (err4, doc2: any, writeOpResult) => {
            if (err4) {
                return next(err4);
            }
            if (doc2 == null) {
                return next('noDisponible');
            }
            if (writeOpResult && writeOpResult.value === null) {
                return next('noDisponible');
            } else {
                const datosOp = {
                    estado: update[etiquetaEstado],
                    paciente: update[etiquetaPaciente],
                    prestacion: update[etiquetaPrestacion],
                    tipoTurno: update[etiquetaTipoTurno] !== null ? update[etiquetaTipoTurno] : null,
                    nota: update[etiquetaNota],
                    link: update[etiquetaLink],
                    emitidoPor: update[etiquetaEmitidoPor], // agregamos el emitidoPor
                    motivoConsulta: update[etiquetaMotivoConsulta],
                    usuarioDacion: update[etiquetaUsuarioDacion],
                    fechaHoraDacion: update[etiquetaFechHoraDacion]
                };

                // Actualizar padron de prepagas
                if (req.body.paciente && req.body.paciente.obraSocial && req.body.paciente.obraSocial.prepaga) {
                    const documento = req.body.paciente.documento;
                    const sexo = req.body.paciente.sexo;
                    const obraSocial = req.body.paciente.obraSocial;
                    await prepagasController.actualizarPadronPrepagas(documento, sexo, obraSocial);
                }
                turnosLog.info('asignarTurno', datosOp, req);
                const turno = doc2.bloques.id(req.body.idBloque).turnos.id(req.body.idTurno);

                LoggerPaciente.logTurno(req, 'turnos:dar', req.body.paciente, turno, req.body.idBloque, req.body.idAgenda);

                EventCore.emitAsync('citas:turno:asignar', turno);
                EventCore.emitAsync('citas:agenda:update', doc2);

                res.json(agendaRes);
            }

            // Se consulta si el turno estaba asociado a una solicitud
            const prestacion: any = await Prestacion.findOne({ inicio: 'top', 'solicitud.historial.turno': req.body.reasignado.anterior.idTurno });
            if (prestacion) {
                const dataHistorial = {
                    op: 'asignarTurno',
                    observaciones: 'Reasignación'
                };
                updateRegistroHistorialSolicitud(prestacion.solicitud, dataHistorial);
                prestacion.solicitud.turno = req.body.idTurno;
                Auth.audit(prestacion, req);
                await prestacion.save();
            }
        });
    } else {
        return next('Los datos del paciente son inválidos');
    }
});

router.patch('/turno/:idTurno/:idBloque/:idAgenda', async (req, res, next) => {
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

    const update = {};
    if (req.body.avisoSuspension) {
        const etiquetaAvisoSuspension: string = etiquetaTurno + '.avisoSuspension';
        update[etiquetaAvisoSuspension] = req.body.avisoSuspension;
    }
    if (req.body.motivoConsulta) {
        const etiquetaMotivoConsulta: string = etiquetaTurno + '.motivoConsulta';
        update[etiquetaMotivoConsulta] = req.body.motivoConsulta;

    }
    if (req.body.actualizaObraSocial) {
        const etiquetaPaciente: string = etiquetaTurno + '.paciente.obraSocial';
        update[etiquetaPaciente] = req.body.actualizaObraSocial;
    }
    if (req.body.estadoFacturacion) {
        const etiquetaEstadoFacturacion: string = etiquetaTurno + '.estadoFacturacion';
        update[etiquetaEstadoFacturacion] = req.body.estadoFacturacion;
    }

    const query = {
        _id: req.params.idAgenda,
    };
    dbgTurno('query --->', query);

    Agenda.update(query, { $set: update }, (error, data) => {
        if (error) {
            return next(error);
        }

        if (req.body.actualizaObraSocial) {
            EventCore.emitAsync('facturacion:factura:recupero_financiero', req.body.turno);
        }

        res.json(data);
    });
});

/**
 * se marca como reasignado un turno suspendido
 */
router.put('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', async (req, res, next) => {
    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    const continues = ValidateDarTurno.checkTurno(req.body.turno);

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
            posBloque = agendaRes.bloques.findIndex(bloque => Object.is(req.params.idBloque, String(bloque._id)));
            posTurno = agendaRes.bloques[posBloque].turnos.findIndex(turno => Object.is(req.params.idTurno, String(turno._id)));
            etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
        } else {
            posTurno = agendaRes.sobreturnos.findIndex(sobreturno => Object.is(req.params.idTurno, String(sobreturno._id)));
            etiquetaTurno = 'sobreturnos.' + posTurno;
        }
        const usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;

        const update: any = {};

        const query = {
            _id: req.params.idAgenda,
        };

        // Si la asistencia viene en null o undefined, se remueve el atributo para no fallar en la validación
        if (!req.body.turno.asistencia) {
            delete req.body.turno.asistencia;
        }

        update[etiquetaTurno] = req.body.turno;
        // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
        Agenda.findOneAndUpdate(query, update, { new: true }, (err2, doc2: any, writeOpResult) => {
            if (err2) {
                return next(err2);
            }
            if (writeOpResult && writeOpResult.value === null) {
                return next('No se pudo actualizar los datos del turno');
            } else {
                const datosOp = {
                    turno: update[etiquetaTurno]
                };
                turnosLog.info('update', datosOp, req);
            }
            // Inserto la modificación como una nueva agenda, ya que luego de asociada a SIPS se borra de la cache
            // Donde doc2 es el documeto de la Agenda actualizado
            // Fin de insert cache
            res.json(doc2);
            if (req.body.turno.reasignado && req.body.turno.reasignado.siguiente) {
                const turno = doc2.bloques.id(req.params.idBloque).turnos.id(req.params.idTurno);
                const idBloque = req.params.idBloque !== '-1' ? null : Types.ObjectId(req.params.idBloque);
                LoggerPaciente.logTurno(req, 'turnos:reasignar', req.body.turno.paciente, turno, idBloque, req.params.idAgenda);
                NotificationService.notificarReasignar(req.params, usuario.organizacion);
            }

        });
    } else {
        return next('Los datos del paciente son inválidos');
    }
});

export = router;
