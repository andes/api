// import * as auth from './../../../auth/auth.class';
import { Auth } from './../../../auth/auth.class';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import * as agendaCtrl from '../../../modules/turnos/controller/agenda';
import { Prestamo, IPrestamo } from '../../../modules/prestamosCarpetas/schemas/prestamo';
import { SolicitudCarpetaManual } from '../../../modules/prestamosCarpetas/schemas/solicitudCarpetaManual';
import * as constantes from '../schemas/constantes';
import { toArray } from '../../../utils/utils';
import { searchByPatient } from '../../cda/controller/CDAPatient';
import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;


export async function getCarpetasSolicitud(req) {
    const query = req.query;
    const organizacionId = query.organizacion;
    const tipoPrestacionId = query.idTipoPrestacion;
    const espacioFisicoId = query.idEspacioFisico;
    const profesionalId = query.idProfesional;
    const horaInicio = query.fechaDesde;
    const horaFin = query.fechaHasta;


    // [TODO] Paralelizar la busquedas de turnos, sobreturnos y solicitudesManuales
    const solicitudesManuales = await getSolicitudCarpetaManual(organizacionId);
    // [TODO] Castear 'organizacionId' a ObjectId en la función interna
    const agendas = await buscarAgendasTurnos(new ObjectId(organizacionId), tipoPrestacionId, espacioFisicoId, profesionalId, horaInicio, horaFin);
    const agendasSobreturno = await buscarAgendasSobreturnos(new ObjectId(organizacionId), tipoPrestacionId, espacioFisicoId, profesionalId, horaInicio, horaFin);


    const nrosCarpetas = getNrosCarpetas(agendas, agendasSobreturno, solicitudesManuales);

    // [TODO] Castear a ObjectId en la función interna
    const carpetas = await findCarpetas(new ObjectId(organizacionId), nrosCarpetas);
    const prestamosCarpetas = await getRegistrosSolicitudCarpetas(req, organizacionId, [agendas, agendasSobreturno], carpetas, solicitudesManuales);

    return prestamosCarpetas;
}

export async function getCarpetasPrestamo(req) {
    const query = req.query;
    const organizacionId = query.organizacion;
    const tipoPrestacionId = query.idTipoPrestacion;
    const espacioFisicoId = query.idEspacioFisico;
    const profesionalId = query.idProfesional;
    const horaInicio = query.fechaDesde;
    const horaFin = query.fechaHasta;
    const carpetas = await findCarpetasPrestamo(new ObjectId(organizacionId), horaInicio, horaFin, tipoPrestacionId, espacioFisicoId, profesionalId);

    return carpetas;
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

async function armarSolicitudConCDA(_agenda, _turno, unaCarpeta, estadoCarpeta, unaOrganizacion) {
    let ultimoCDA = await searchByPatient(_turno.paciente.id, '2881000013106', { limit: 1, skip: null });

    return {
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
        ultimoCDA,
        tipo: constantes.TipoSolicitud.Automatica
    };
}

async function getRegistrosSolicitudCarpetas(req, unaOrganizacion, agendas, carpetas, solicitudesManuales) {
    let mostrarPrestamos = req.body.mostrarPrestamos;

    let registrosSolicitudesAutomaticas = [];
    agendas.forEach(unaAgenda => {
        unaAgenda.forEach(_agenda => {
            _agenda.turnos.forEach(_turno => {
                _turno.paciente.carpetaEfectores.forEach(unaCarpeta => {
                    // Validación de PDR para ignorar números de carpetas autogenerados por HPN.
                    if ((unaCarpeta.nroCarpeta.indexOf('PDR') < 0) && unaCarpeta.organizacion._id.equals(unaOrganizacion)) {
                        let estadoCarpeta = constantes.EstadosPrestamosCarpeta.EnArchivo;
                        carpetas.map(carpeta => {
                            if (carpeta._id === unaCarpeta.nroCarpeta) {
                                estadoCarpeta = carpeta.estado;
                            }
                        });

                        if (mostrarPrestamos || (estadoCarpeta === constantes.EstadosPrestamosCarpeta.EnArchivo)) {
                            registrosSolicitudesAutomaticas.push(armarSolicitudConCDA(_agenda, _turno, unaCarpeta, estadoCarpeta, unaOrganizacion));
                        }
                    }
                });
            });
        });
    });
    let registroSolicitudesManuales = [];
    if (solicitudesManuales) {
        registroSolicitudesManuales = solicitudesManuales.map(async element => {
            let estadoCarpetaManual = constantes.EstadosPrestamosCarpeta.EnArchivo;
            carpetas.map(carpeta => {
                if (carpeta._id === element.numero) {
                    estadoCarpetaManual = carpeta.estado;
                }
            });
            let ultimoCDA = await searchByPatient(element.paciente.id, '2881000013106', { limit: 1, skip: null });

            return {
                fecha: element.fecha,
                paciente: element.paciente,
                numero: element.numero,
                estado: estadoCarpetaManual,
                organizacion: unaOrganizacion,
                datosSolicitudManual: element.datosSolicitudManual,
                tipo: constantes.TipoSolicitud.Manual,
                idSolicitud: element.id,
                ultimoCDA
            };
        });
    }
    return await Promise.all([...registroSolicitudesManuales, ...registrosSolicitudesAutomaticas]);
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

    return await toArray(Prestamo.aggregate(pipeline).cursor({}).exec());
}

async function findCarpetasPrestamo(organizacionId, horaInicio, horaFin, tipoPrestacion, espacioFisico, profesionalId: string) {
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

    if (profesionalId) {
        match['datosPrestamo.turno.profesionales._id'] = new ObjectId(profesionalId);
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

    let result: any = await toArray(Prestamo.aggregate(pipeline).cursor({}).exec());

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
        // [TODO] No llega ObjectId ?
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

    const pipelineCarpeta = [
        {
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
        }
    ];

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

    const pipelineCarpeta = [
        {
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
        await cambiarEstadoSolicitudManual(req, prestamoCarpeta.datosSolicitudManual.idSolicitud, prestamoCarpeta.organizacion);
    }
    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

export async function prestarCarpetas(req) {
    const prestamosCarpetas: IPrestamo[] = [];
    const datosCarpetas = req.body;

    for (let i = 0; i < datosCarpetas.length; i++) {
        prestamosCarpetas.push(await createCarpeta(datosCarpetas[i], constantes.EstadosPrestamosCarpeta.Prestada));
    }
    return await savePrestamosCarpetas(req, prestamosCarpetas);
}

export async function devolverCarpeta(req) {
    const prestamoCarpeta: IPrestamo = await createCarpeta(req.body, constantes.EstadosPrestamosCarpeta.EnArchivo);
    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

export async function devolverCarpetas(req) {
    const datosCarpetas = req.body;
    const prestamosCarpetas: IPrestamo[] = [];

    for (let i = 0; i < datosCarpetas.length; i++) {
        prestamosCarpetas.push(await createCarpeta(datosCarpetas[i], constantes.EstadosPrestamosCarpeta.EnArchivo));
    }

    return await savePrestamosCarpetas(req, prestamosCarpetas);
}

async function createCarpeta(datosCarpeta, estadoPrestamoCarpeta): Promise<IPrestamo> {
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

    return new Prestamo({
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
    const _prestamoGuardado = await nuevoPrestamo.save();
    return _prestamoGuardado;
}

async function savePrestamosCarpetas(req, nuevosPrestamos) {
    nuevosPrestamos.forEach(async _prestamo => {
        Auth.audit(_prestamo, req);
        await _prestamo.save();
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
    const nroCarpeta = req.query.numero;
    const organizacionId = req.query.organizacion;

    const filter: any = {
        'organizacion._id': organizacionId,
        numero: nroCarpeta
    };

    return await Prestamo.find(filter).sort('-createdAt');
}

export async function solicitudManualCarpeta(req) {
    const body = req.body;
    const solicitud = new SolicitudCarpetaManual({
        fecha: body.fecha,
        paciente: body.paciente,
        numero: body.numero,
        estado: constantes.EstadoSolicitudCarpeta.Pendiente,
        organizacion: body.organizacion,
        datosSolicitudManual: body.datosSolicitudManual
    });

    Auth.audit(solicitud, req);

    await solicitud.save();
    return solicitud;
}

async function getSolicitudCarpetaManual(unaOrganizacion, idSolicitud = null, estadoSolicitud = null) {
    let query;
    if (idSolicitud) {
        query = SolicitudCarpetaManual.findById(idSolicitud);
    } else {
        query = SolicitudCarpetaManual.find({});
        query.where('organizacion._id').equals(unaOrganizacion);
        query.where('estado').equals((estadoSolicitud ? estadoSolicitud : constantes.EstadoSolicitudCarpeta.Pendiente));
    }

    return await query;
}

async function cambiarEstadoSolicitudManual(req, idSolicitud, idOrganizacion) {
    const solicitud = await getSolicitudCarpetaManual(idOrganizacion.id, String(idSolicitud));
    solicitud.estado = constantes.EstadoSolicitudCarpeta.Aprobada;
    Auth.audit(solicitud, req);
    solicitud.save();
}
