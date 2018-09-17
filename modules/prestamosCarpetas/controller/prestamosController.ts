// import * as auth from './../../../auth/auth.class';
import { Auth } from './../../../auth/auth.class';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import * as agendaCtrl from '../../../modules/turnos/controller/agenda';
import * as prestamo from '../../../modules/prestamosCarpetas/schemas/prestamo';
import * as solicitudCarpetaManualSchema from '../../../modules/prestamosCarpetas/schemas/solicitudCarpetaManual';
import * as constantes from '../schemas/constantes';
import { toArray } from '../../../utils/utils';
import { ObjectId } from 'bson';

export async function getCarpetasSolicitud(req) {
    return new Promise(async (resolve, reject) => {
        const body = req.body;
        const organizacionId = body.organizacion;
        const tipoPrestacionId = body.idTipoPrestacion;
        const espacioFisicoId = body.idEspacioFisico;
        const profesionalId = body.idProfesional;
        const horaInicio = body.fechaDesde;
        const horaFin = body.fechaHasta;
        const solicitudesManuales = await getSolicitudCarpetaManual(organizacionId);
        const agendas = await buscarAgendasTurnos(new ObjectId(organizacionId), tipoPrestacionId, espacioFisicoId, profesionalId, horaInicio, horaFin);
        const agendasSobreturno = await buscarAgendasSobreturnos(new ObjectId(organizacionId), tipoPrestacionId, espacioFisicoId, profesionalId, horaInicio, horaFin);
        const nrosCarpetas = getNrosCarpetas(agendas, agendasSobreturno, solicitudesManuales);
        const carpetas = await findCarpetas(new ObjectId(organizacionId), nrosCarpetas);
        const prestamosCarpetas = await getRegistrosSolicitudCarpetas(req, organizacionId, [agendas, agendasSobreturno], carpetas, solicitudesManuales);

        resolve(prestamosCarpetas);
    });
}

export async function getCarpetasPrestamo(req) {
    return new Promise(async (resolve, reject) => {
        const body = req.body;
        const organizacionId = body.organizacion;
        const tipoPrestacionId = body.idTipoPrestacion;
        const espacioFisicoId = body.idEspacioFisico;
        const profesionalId = body.idProfesional;
        const horaInicio = body.fechaDesde;
        const horaFin = body.fechaHasta;
        const carpetas = await findCarpetasPrestamo(new ObjectId(organizacionId), horaInicio, horaFin, tipoPrestacionId, espacioFisicoId, profesionalId);

        resolve(carpetas);
    });
}

function getNrosCarpetas(agendas, agendasSobreturno, solicitudesManuales) {
    const nroCarpetas = [];
    if (agendas) {
        agendas.forEach(_agenda => {
            _agenda.turnos.forEach(unTurno => {
                unTurno.paciente.carpetaEfectores.forEach(async unaCarpeta => {
                    if (nroCarpetas.indexOf(unaCarpeta.nroCarpeta) < 0) {
                        nroCarpetas.push(unaCarpeta.nroCarpeta);
                    }
                });
            });
        });
    }

    if (agendasSobreturno) {
        agendasSobreturno.forEach(_agenda => {
            _agenda.turnos.forEach(unTurno => {
                unTurno.paciente.carpetaEfectores.forEach(async unaCarpeta => {
                    if (nroCarpetas.indexOf(unaCarpeta.nroCarpeta) < 0) {
                        nroCarpetas.push(unaCarpeta.nroCarpeta);
                    }
                });
            });
        });
    }

    if (solicitudesManuales) {
        solicitudesManuales.forEach(solicitud => {
            nroCarpetas.push(solicitud.numero);
        });
    }
    return nroCarpetas;
}

async function getRegistrosSolicitudCarpetas(req, unaOrganizacion, agendas, carpetas, solicitudesManuales) {
    const registrosSolicitudCarpetas = [];
    const mostrarPrestamos = req.body.mostrarPrestamos;

    agendas.forEach(unaAgenda => {
        unaAgenda.forEach(_agenda => {
            _agenda.turnos.forEach(_turno => {
                _turno.paciente.carpetaEfectores.forEach(unaCarpeta => {
                    // Validación de PDR para ignorar números de carpetas autogenerados por HPN.
                    if ((unaCarpeta.nroCarpeta.indexOf('PDR') < 0) && unaCarpeta.organizacion._id.equals(unaOrganizacion)) {
                        let estadoCarpeta = constantes.EstadosPrestamosCarpeta.EnArchivo;

                        for (let i = 0; i < carpetas.length; i++) {
                            if (carpetas[i]._id === unaCarpeta.nroCarpeta) {
                                estadoCarpeta = carpetas[i].estado;
                                break;
                            }
                        }

                        if (mostrarPrestamos || (estadoCarpeta === constantes.EstadosPrestamosCarpeta.EnArchivo)) {
                            registrosSolicitudCarpetas.push({
                                fecha: _turno.horaInicio,
                                paciente: _turno.paciente,
                                numero: unaCarpeta.nroCarpeta,
                                estado: estadoCarpeta,
                                organizacion: unaOrganizacion,
                                datosPrestamo: {
                                    agendaId: _agenda._id.id,
                                    observaciones: '',
                                    turno: {
                                        id: _turno._id,
                                        profesionales: _agenda.profesionales[0],
                                        espacioFisico: _agenda.espacioFisico[0],
                                        tipoPrestacion: _turno.tipoPrestacion
                                    }
                                },
                                tipo: constantes.TipoSolicitud.Automatica
                            });
                        }
                    }
                });
            });
        });
    });
    if (solicitudesManuales) {
        solicitudesManuales.forEach(element => {
            let estadoCarpetaManual = constantes.EstadosPrestamosCarpeta.EnArchivo;
            for (let i = 0; i < carpetas.length; i++) {
                if (carpetas[i]._id === element.numero) {
                    estadoCarpetaManual = carpetas[i].estado;
                    break;
                }
            }

            registrosSolicitudCarpetas.push({
                fecha: element.fecha,
                paciente: element.paciente,
                numero: element.numero,
                estado: estadoCarpetaManual,
                organizacion: unaOrganizacion,
                datosSolicitudManual: element.datosSolicitudManual,
                tipo: constantes.TipoSolicitud.Manual,
                idSolicitud: element.id
            });
        });
    }

    return registrosSolicitudCarpetas;
}

async function findCarpetas(organizacionId, nrosCarpetas) {
    const pipeline = [];
    const match = {};
    const sort = {};
    const group = {};

    match['organizacion._id'] = { $eq: organizacionId };
    match['numero'] = { $in: nrosCarpetas };
    sort['createdAt'] = -1;
    group['_id'] = '$numero';
    group['estado'] = { $first: '$estado' };
    group['fecha'] = { $first: '$createdAt' };

    pipeline.push({ $match: match });
    pipeline.push({ $sort: sort });
    pipeline.push({ $group: group });

    return await toArray(prestamo.aggregate(pipeline).cursor({}).exec());
}

async function findCarpetasPrestamo(organizacionId, horaInicio, horaFin, tipoPrestacion, espacioFisico, profesional) {
    const pipeline = [];
    const match = {};
    const sort = {};
    const group = {};

    if (horaInicio || horaFin) {
        match['createdAt'] = {};
        if (horaInicio) {
            match['createdAt']['$gte'] = new Date(horaInicio);
        }
        if (horaFin) {
            match['createdAt']['$lte'] = new Date(horaFin);
        }
    }
    if (tipoPrestacion) {
        match['datosPrestamo.turno.tipoPrestacion._id'] = new ObjectId(tipoPrestacion);
    }

    if (espacioFisico) {
        match['datosPrestamo.turno.espacioFisico._id'] = espacioFisico;
    }

    if (profesional) {
        match['datosPrestamo.turno.profesionales._id'] = new ObjectId(profesional);
    }
    match['organizacion._id'] = { $eq: organizacionId };

    sort['createdAt'] = -1;
    group['_id'] = '$numero';
    group['estado'] = { $first: '$estado' };
    group['fecha'] = { $first: '$createdAt' };
    group['paciente'] = { $first: '$paciente' };
    group['datosPrestamo'] = { $first: '$datosPrestamo' };
    group['datosDevolucion'] = { $first: '$datosDevolucion' };
    group['datosSolicitudManual'] = { $first: '$datosSolicitudManual' };

    pipeline.push({ $match: match });
    pipeline.push({ $sort: sort });
    pipeline.push({ $group: group });

    let result: any = await toArray(prestamo.aggregate(pipeline).cursor({}).exec());

    result = result.filter((el) => {
        return el.estado === constantes.EstadosPrestamosCarpeta.Prestada;
    });

    return result;
}

async function buscarAgendasSobreturnos(organizacionId, tipoPrestacion, espacioFisico, profesional, horaInicio, horaFin) {

    const matchCarpeta = {};
    if (tipoPrestacion) {
        matchCarpeta['sobreturnos.tipoPrestacion._id'] = new ObjectId(tipoPrestacion);
    }

    if (espacioFisico) {
        matchCarpeta['espacioFisico.id'] = espacioFisico;
    }

    if (profesional) {
        matchCarpeta['profesionales._id'] = new ObjectId(profesional);
    }

    if (horaInicio || horaFin) {
        matchCarpeta['horaInicio'] = {};
        if (horaInicio) {
            matchCarpeta['horaInicio']['$gte'] = new Date(horaInicio);
        }
        if (horaFin) {
            matchCarpeta['horaInicio']['$lte'] = new Date(horaFin);
        }
    }

    matchCarpeta['sobreturnos.estado'] = { $eq: 'asignado' };
    matchCarpeta['sobreturnos.paciente.carpetaEfectores.organizacion._id'] = organizacionId;
    matchCarpeta['sobreturnos.paciente.carpetaEfectores.nroCarpeta'] = { $ne: '' };

    const pipelineCarpeta = [{
        $match: matchCarpeta
    },
        {
            $unwind: '$sobreturnos'
        },
        {
            $match: matchCarpeta
        },
        {
            $group: {
            _id: { id: '$_id' },
            profesionales: { $push: '$profesionales' },
            espacioFisico: { $push: '$espacioFisico' },
            tipoPrestacion: { $push: '$sobreturnos.tipoPrestacion' },
            turnos: { $push: '$sobreturnos' }
        }
        }];

    return await toArray(agenda.aggregate(pipelineCarpeta).cursor({}).exec());
}

async function buscarAgendasTurnos(organizacionId, tipoPrestacion, espacioFisico, profesional, horaInicio, horaFin) {

    const matchCarpeta = {};
    if (tipoPrestacion) {
        matchCarpeta['bloques.turnos.tipoPrestacion._id'] = new ObjectId(tipoPrestacion);
    }

    if (espacioFisico) {
        matchCarpeta['espacioFisico.id'] = espacioFisico;
    }

    if (profesional) {
        matchCarpeta['profesionales._id'] = new ObjectId(profesional);
    }

    if (horaInicio || horaFin) {
        matchCarpeta['horaInicio'] = {};
        if (horaInicio) {
            matchCarpeta['horaInicio']['$gte'] = new Date(horaInicio);
        }
        if (horaFin) {
            matchCarpeta['horaInicio']['$lte'] = new Date(horaFin);
        }
    }

    matchCarpeta['bloques.turnos.estado'] = { $eq: 'asignado' };
    matchCarpeta['bloques.turnos.paciente.carpetaEfectores.organizacion._id'] = organizacionId;
    matchCarpeta['bloques.turnos.paciente.carpetaEfectores.nroCarpeta'] = { $ne: '' };

    const pipelineCarpeta = [{
        $match: matchCarpeta
    },
        {
            $unwind: '$bloques'
        },
        {
            $unwind: '$bloques.turnos'
        },
        {
            $match: matchCarpeta
        },
        {
            $group: {
                _id: { id: '$_id' },
                profesionales: { $push: '$profesionales' },
                espacioFisico: { $push: '$espacioFisico' },
                tipoPrestacion: { $push: '$bloques.turnos.tipoPrestacion' },
                turnos: { $push: '$bloques.turnos' }
            }
        }];

    return await toArray(agenda.aggregate(pipelineCarpeta).cursor({}).exec());
}

export async function prestarCarpeta(req) {
    const prestamoCarpeta: any = await createCarpeta(req.body, constantes.EstadosPrestamosCarpeta.Prestada);
    if (prestamoCarpeta.datosSolicitudManual.idSolicitud) {
        cambiarEstadoSolicitudManual(req, prestamoCarpeta.datosSolicitudManual.idSolicitud, prestamoCarpeta.organizacion);
    }
    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

export async function prestarCarpetas(req) {
    const datosCarpetas = req.body;
    const prestamosCarpetas = [];

    for (let i = 0; i < datosCarpetas.length; i++) {
        prestamosCarpetas.push(await createCarpeta(datosCarpetas[i], constantes.EstadosPrestamosCarpeta.Prestada));
    }
    return await savePrestamosCarpetas(req, prestamosCarpetas);
}

export async function devolverCarpeta(req) {
    const prestamoCarpeta: any = await createCarpeta(req.body, constantes.EstadosPrestamosCarpeta.EnArchivo);
    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

export async function devolverCarpetas(req) {
    const datosCarpetas = req.body;
    const prestamosCarpetas = [];

    for (let i = 0; i < datosCarpetas.length; i++) {
        prestamosCarpetas.push(await createCarpeta(datosCarpetas[i], constantes.EstadosPrestamosCarpeta.EnArchivo));
    }

    return await savePrestamosCarpetas(req, prestamosCarpetas);
}

async function createCarpeta(datosCarpeta, estadoPrestamoCarpeta) {
    let pacienteSeleccionado;
    let datosSolicitudManual;
    if (datosCarpeta.datosPrestamo) {
        if (datosCarpeta.datosPrestamo.agendaId) {
            const agendaId = datosCarpeta.datosPrestamo.agendaId;
            const turnoId = datosCarpeta.datosPrestamo.turno.id;
            const data = await agenda.findById(agendaId);
            const turno = agendaCtrl.getTurno(null, data, turnoId);
            pacienteSeleccionado = turno.paciente;
        } else {
            if (datosCarpeta.datosSolicitudManual) {
                datosCarpeta.datosPrestamo = { observaciones: datosCarpeta.datosSolicitudManual.observaciones };
                datosSolicitudManual = {
                    espacioFisico: datosCarpeta.datosSolicitudManual.espacioFisico,
                    prestacion: datosCarpeta.datosSolicitudManual.prestacion,
                    profesional: (datosCarpeta.datosSolicitudManual.profesional ?
                        { nombre: datosCarpeta.datosSolicitudManual.profesional.nombre, apellido: datosCarpeta.datosSolicitudManual.profesional.apellido } : null),
                    responsable: (datosCarpeta.datosSolicitudManual.responsable ?
                        { nombre: datosCarpeta.datosSolicitudManual.responsable.nombre, apellido: datosCarpeta.datosSolicitudManual.responsable.apellido } : null),
                    observaciones: datosCarpeta.datosSolicitudManual.observaciones,
                    idSolicitud: datosCarpeta.idSolicitud
                };
            }
        }
    }

    return new prestamo({
        paciente: (datosCarpeta.paciente ? datosCarpeta.paciente : pacienteSeleccionado),
        organizacion: datosCarpeta.organizacion,
        numero: (datosCarpeta._id ? datosCarpeta._id : datosCarpeta.numero),
        estado: estadoPrestamoCarpeta,
        datosPrestamo: datosCarpeta.datosPrestamo,
        datosDevolucion: (datosCarpeta.datosDevolucion ?
            datosCarpeta.datosDevolucion :
            { observaciones: '', estado: 'Normal' }),
        datosSolicitudManual
    });
}

async function savePrestamoCarpeta(req, nuevoPrestamo) {
    Auth.audit(nuevoPrestamo, req);
    const _prestamoGuardado = await nuevoPrestamo.save((err2, prestamoGuardado: any) => {
        if (err2) {
            throw err2;
        }
    });
    return _prestamoGuardado;
}

async function savePrestamosCarpetas(req, nuevosPrestamos) {
    nuevosPrestamos.forEach(async _prestamo => {
        Auth.audit(_prestamo, req);
        await _prestamo.save((err2, prestamoGuardado: any) => {
            if (err2) {
                throw err2;
            }
        });
    });

}
/*
function getNroCarpeta(organizacionId, carpetas) {
    for (let i = 0; i < carpetas.length; i++) {
        if (String(carpetas[i].organizacion._id) === organizacionId) {
            return carpetas[i].nroCarpeta;
        }
    }
    return;
}
*/

export async function getHistorial(req) {
    const nroCarpeta = req.body.numero;
    const organizacionId = req.body.organizacion._id;

    const filter: any = {
        'organizacion._id': organizacionId,
        numero: nroCarpeta
    };

    return await prestamo.find(filter).sort('-createdAt');
}

export async function solicitudManualCarpeta(req) {
    const body = req.body;
    const solicitud = new solicitudCarpetaManualSchema({
        fecha: body.fecha,
        paciente: body.paciente,
        numero: body.numero,
        estado: constantes.EstadoSolicitudCarpeta.Pendiente,
        organizacion: body.organizacion,
        datosSolicitudManual: body.datosSolicitudManual
    });

    Auth.audit(solicitud, req);

    await solicitud.save((err, solicitudGuardada: any) => {
        if (err) {
            throw err;
        }
    });
    return solicitud;
}

function getSolicitudCarpetaManual(unaOrganizacion, idSolicitud = null, estadoSolicitud = null) {
    return new Promise((resolve, reject) => {
        let query;
        if (idSolicitud) {
            query = solicitudCarpetaManualSchema.findById(idSolicitud);
        } else {
            query = solicitudCarpetaManualSchema.find({});
            query.where('organizacion._id').equals(unaOrganizacion);
            query.where('estado').equals((estadoSolicitud ? estadoSolicitud : constantes.EstadoSolicitudCarpeta.Pendiente));
        }

        query.exec((err, data) => {
            if (err) {
                throw err;
            }
            return resolve(data);
        });
    });
}

function cambiarEstadoSolicitudManual(req, idSolicitud, idOrganizacion) {
    getSolicitudCarpetaManual(idOrganizacion.id, String(idSolicitud)).then(solicitud => {
        (solicitud as any).estado = constantes.EstadoSolicitudCarpeta.Aprobada;
        Auth.audit((solicitud as any), req);

        (solicitud as any).save((err, solicitudGuardada: any) => {
            if (err) {
                throw err;
            }
        });
    });
}
