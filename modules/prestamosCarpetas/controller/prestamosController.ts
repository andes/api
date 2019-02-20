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
import { buscarPacienteWithcondition } from '../../../core/mpi/controller/paciente';

const ObjectId = Types.ObjectId;


export async function getCarpetasSolicitud(req) {
    const query = req.query;
    const organizacion = query.organizacion;
    const tipoPrestacion = query.idTipoPrestacion;
    const espacioFisico = query.idEspacioFisico;
    const profesional = query.idProfesional;
    const horaInicio = query.fechaDesde;
    const horaFin = query.fechaHasta;

    const manuales = await getSolicitudesManuales({ organizacionId: organizacion, tipoPrestacionId: tipoPrestacion, espacioFisicoId: espacioFisico, profesionalId: profesional, horaInicio, horaFin });
    const automaticas = await getSolicitudesAutomaticas(organizacion, tipoPrestacion, espacioFisico, profesional, horaInicio, horaFin);

    let solicitudes = [...manuales, ...automaticas];
    // Por cada solicitud se busca y se agrega ultima historia clinica (conceptId: 2881000013106)
    const solicitudesCDA = solicitudes.map(async solicitud => {
        solicitud['ultimoCDA'] = [];
        if (solicitud.numero && solicitud.numero.indexOf('PDR') < 0 && solicitud.numero !== '') {
            solicitud['ultimoCDA'] = await searchByPatient(new ObjectId(solicitud.paciente._id), '2881000013106', { limit: 1, skip: null });
        }
        return solicitud;
    });
    return await Promise.all(solicitudesCDA);
}

export async function getCarpetasPrestamo(req) {
    const query = req.query;
    const organizacionId = query.organizacion;
    const tipoPrestacionId = query.idTipoPrestacion;
    const espacioFisicoId = query.idEspacioFisico;
    const profesionalId = query.idProfesional;
    const horaInicio = query.fechaDesde;
    const horaFin = query.fechaHasta;
    const carpetas = await findCarpetasPrestamo(organizacionId, horaInicio, horaFin, tipoPrestacionId, espacioFisicoId, profesionalId);

    return carpetas;
}

async function findCarpetasPrestamo(organizacionId: string, horaInicio: string, horaFin: string, tipoPrestacion: string, espacioFisico: string, profesionalId: string) {
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
        match['datosPrestamo.turno.espacioFisico._id'] = new ObjectId(espacioFisico);
    }

    if (profesionalId) {
        match['datosPrestamo.turno.profesionales._id'] = new ObjectId(profesionalId);
    }
    match['organizacion._id'] = { $eq: new ObjectId(organizacionId) };

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

    let result: any = await toArray(Prestamo.aggregate(pipeline).allowDiskUse(true).cursor({}).exec());

    result = result.filter((el) => {
        return el.estado === constantes.EstadosPrestamosCarpeta.Prestada;
    });

    return result;
}


async function getSolicitudesManuales(filtros) {
    const match = {};
    if (filtros.horaInicio || filtros.horaFin) {
        match['createdAt'] = {};
        if (filtros.horaInicio) {
            match['createdAt']['$gte'] = new Date(filtros.horaInicio);
        }
        if (filtros.horaFin) {
            match['createdAt']['$lte'] = new Date(filtros.horaFin);
        }
    }
    if (filtros.organizacionId) {
        match['organizacion._id'] = {$eq: new ObjectId(filtros.organizacionId)};
    }
    if (filtros.tipoPrestacionId) {
        match['datosSolicitudManual.prestacion._id'] = new ObjectId(filtros.tipoPrestacionId);
    }
    if (filtros.espacioFisicoId) {
        match['datosSolicitudManual.espacioFisico._id'] = new ObjectId(filtros.espacioFisicoId);
    }
    if (filtros.profesionalId) {
        match['datosSolicitudManual.profesional._id'] = new ObjectId(filtros.profesionalId);
    }
    if (filtros.estadoSolicitud) {
        match['estado'] = { $eq: filtros.estadoSolicitud };
    } else {
        match['estado'] = { $eq: constantes.EstadoSolicitudCarpeta.Pendiente };
    }
    const pipelineSolicitudes = [
        { $match: match },
        { $unwind: '$paciente.carpetaEfectores' },
        { $match: {'paciente.carpetaEfectores.organizacion._id': {$eq: new ObjectId(filtros.organizacionId)}}},
        {
            $lookup: {
                // Se busca el último prestamo para verificar el estado de la huds
                from: 'prestamos',
                let: {
                    nroCarpeta: '$paciente.carpetaEfectores.nroCarpeta',
                    pacienteId: '$paciente._id'
                },
                pipeline: [
                    {$match: { numero: {$eq: '$$nroCarpeta'} }},
                    {$sort: { createdAt: -1}},
                    {$limit: 1}
                ],
                as: 'prestamoCarpeta'
            }
        },
        {
            $project: {
                fecha: '$fecha',
                paciente: '$paciente',
                numero: '$numero',
                estado: {
                    $cond: {
                        if: {$or: [{$eq: ['$numero', '']}, {$eq: [{$substr: ['$numero', 0, 3]}, 'PDR']}]},
                        then: '',
                        else: {
                            $cond: {
                                if: {$eq: [{$size: '$prestamoCarpeta.estado'}, 0]},
                                then: constantes.EstadosPrestamosCarpeta.EnArchivo,
                                else: '$prestamoCarpeta.estado',
                            }
                        }
                    }
                },
                organizacion: '$organizacion._id',
                datosSolicitudManual: '$datosSolicitudManual',
                tipo: constantes.TipoSolicitud.Manual,
                idSolicitud: '$_id'
            }
        }
    ];
    return await toArray(SolicitudCarpetaManual.aggregate(pipelineSolicitudes).allowDiskUse(true).cursor({}).exec());
}

async function getSolicitudesAutomaticas(organizacionId: string, tipoPrestacion: string, espacioFisico: string, profesional: string, horaInicio: string, horaFin: string) {
    const matchCarpeta = {};
    if (organizacionId) {
        matchCarpeta['organizacion._id'] = {$eq: new ObjectId(organizacionId)};
    }
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

    const pipelineCarpeta = [
        { $match: matchCarpeta },
        { $unwind: '$bloques' },
        { $addFields: { turno: { $concatArrays: ['$sobreturnos', '$bloques.turnos'] } }},
        { $unwind: '$turno' },
        { $match: {'turno.estado': { $eq: 'asignado' }}},
        { $unwind: '$turno.paciente.carpetaEfectores' },
        { $match: {'turno.paciente.carpetaEfectores.organizacion._id': {$eq: new ObjectId(organizacionId)}}},
        {
            $lookup: {
                // Se busca el último prestamo para verificar el estado de la huds
                from: 'prestamos',
                let: { nroCarpeta: '$turno.paciente.carpetaEfectores.nroCarpeta' },
                pipeline: [
                    {$match: { numero: {$eq: '$$nroCarpeta'} }},
                    {$sort: { createdAt: -1}},
                    {$limit: 1}
                ],
                as: 'prestamoCarpeta'
            }
        },
        {$addFields: {nro: '$turno.paciente.carpetaEfectores.nroCarpeta'}},
        {
            $project: {
                _id: '$turno.paciente._id',
                fecha: '$turno.horaInicio',
                paciente: '$turno.paciente',
                organizacion: organizacionId,
                numero: {
                    $cond: {
                        if: {$eq: [{$substr: ['$nro', 0, 3]}, 'PDR']},
                        then: '',
                        else: '$nro'
                    }
                },
                estado: {
                    $cond: {
                        if: {$or: [{$eq: ['$nro', '']}, {$eq: [{$substr: ['$nro', 0, 3]}, 'PDR']}]},
                        then: '',
                        else: {
                            $cond: {
                                if: {$eq: [{$size: '$prestamoCarpeta.estado'}, 0]},
                                then: constantes.EstadosPrestamosCarpeta.EnArchivo,
                                else: '$prestamoCarpeta.estado',
                            }
                        }
                    }
                },
                tipo: constantes.TipoSolicitud.Automatica,
                datosPrestamo: {
                    agendaId: '$_id',
                    observaciones: '',
                    turno: {
                        id: '$turno._id',
                        profesionales: '$profesionales',
                        espacioFisico: '$espacioFisico',
                        tipoPrestacion: '$turno.tipoPrestacion'
                    }
                },
                ultimoCDA: []
            }
        }
    ];

    return await toArray(agenda.aggregate(pipelineCarpeta).allowDiskUse(true).cursor({}).exec());
}


export async function prestarCarpeta(req) {
    const prestamoCarpeta = await createCarpeta(req.body, constantes.EstadosPrestamosCarpeta.Prestada);
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

async function savePrestamoCarpeta(req, nuevoPrestamo: IPrestamo) {
    Auth.audit(nuevoPrestamo, req);
    const _prestamoGuardado = await nuevoPrestamo.save();
    return _prestamoGuardado;
}

async function savePrestamosCarpetas(req, nuevosPrestamos: IPrestamo[]) {
    nuevosPrestamos.forEach(async _prestamo => {
        Auth.audit(_prestamo, req);
        await _prestamo.save();
    });

}

export async function getHistorial(req) {
    const nroCarpeta = req.query.numero;
    const organizacionId = req.query.organizacion;

    const queryPaciente = await buscarPacienteWithcondition({
        carpetaEfectores: {
            $elemMatch:
            {
                'organizacion._id': organizacionId,
                nroCarpeta
            }
        }
    });

    if (queryPaciente) {
        const filter: any = {
            'organizacion._id': new ObjectId(organizacionId),
            numero: nroCarpeta
        };
        const queryHistorial = await Prestamo.find(filter).sort('-createdAt');
        return { historial: queryHistorial, paciente: queryPaciente.paciente };
    } else {
        return {};
    }


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

async function getSolicitudCarpetaManual(filtros) {
    let query;
    if (filtros.idSolicitud) {
        query = SolicitudCarpetaManual.findById(filtros.idSolicitud);
    } else {
        query = SolicitudCarpetaManual.find({});
        if (filtros.organizacionId) {
            query.where('organizacion._id').equals(filtros.organizacionId);
        }
        if (filtros.tipoPrestacionId) {
            query.where('datosSolicitudManual.prestacion._id').equals(filtros.tipoPrestacionId);
        }
        if (filtros.espacioFisicoId) {
            query.where('datosSolicitudManual.espacioFisico._id').equals(filtros.espacioFisicoId);
        }
        if (filtros.profesionalId) {
            query.where('datosSolicitudManual.profesional._id').equals(filtros.profesionalId);
        }
        query.where('estado').equals((filtros.estadoSolicitud ? filtros.estadoSolicitud : constantes.EstadoSolicitudCarpeta.Pendiente));
    }

    return await query;
}

async function cambiarEstadoSolicitudManual(req, idSolicitud, organizacion) {
    const solicitud = await getSolicitudCarpetaManual({ organizacionId: organizacion.id, idSolicitud: String(idSolicitud) });
    solicitud.estado = constantes.EstadoSolicitudCarpeta.Aprobada;
    Auth.audit(solicitud, req);
    solicitud.save();
}
