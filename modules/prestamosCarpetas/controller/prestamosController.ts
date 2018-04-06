import * as mongoose from 'mongoose';
import * as auth from './../../../auth/auth.class';
import { Auth } from './../../../auth/auth.class';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import * as agendaCtrl from '../../../modules/turnos/controller/agenda';
import * as prestamo from '../../../modules/prestamosCarpetas/schemas/prestamo';
import * as constantes from '../schemas/constantes';
import { toArray } from '../../../utils/utils';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { ObjectId, ObjectID } from 'bson';
import { Object } from 'core-js/library/web/timers';

export async function getCarpetasSolicitud(req) {
    return new Promise(async (resolve, reject) => {
        let body = req.body;
        let organizacionId = body.organizacion;
        let tipoPrestacionId = body.idTipoPrestacion;
        let espacioFisicoId = body.idEspacioFisico;
        let profesionalId = body.idProfesional;
        let horaInicio = body.fechaDesde;
        let horaFin = body.fechaHasta;
        let estado = body.estado;
        let agendas = await buscarAgendasTurnos(new ObjectId(organizacionId), tipoPrestacionId, espacioFisicoId, profesionalId, horaInicio, horaFin);
        let nrosCarpetas = getNrosCarpetas(agendas);
        let carpetas = await findCarpetas(new ObjectId(organizacionId), nrosCarpetas);
        let prestamosCarpetas = await getRegistrosSolicitudCarpetas(req, organizacionId, agendas, carpetas);

        resolve(prestamosCarpetas);
    });
}

export async function getCarpetasPrestamo(req) {
    return new Promise(async (resolve, reject) => {
        let body = req.body;
        let organizacionId = body.organizacion;
        let tipoPrestacionId = body.idTipoPrestacion;
        let espacioFisicoId = body.idEspacioFisico;
        let profesionalId = body.idProfesional;
        let horaInicio = body.fechaDesde;
        let horaFin = body.fechaHasta;
        let estado = body.estado;
        let carpetas = await findCarpetasPrestamo(new ObjectId(organizacionId), horaInicio, horaFin, tipoPrestacionId, espacioFisicoId, profesionalId);

        resolve(carpetas);
    });
}

function getNrosCarpetas(agendas) {
    let nroCarpetas = [];
    agendas.forEach(_agenda => {
        _agenda.turnos.forEach(unTurno => {
            unTurno.paciente.carpetaEfectores.forEach(async unaCarpeta => {
                if (nroCarpetas.indexOf(unaCarpeta.nroCarpeta) < 0) {
                    nroCarpetas.push(unaCarpeta.nroCarpeta);
                }
            });
        });
    });
    return nroCarpetas;
}

async function getRegistrosSolicitudCarpetas(req, unaOrganizacion, agendas, carpetas) {
    let registrosSolicitudCarpetas = [];
    let resBusquedaCarpeta;
    let mostrarPrestamos = req.body.mostrarPrestamos;

    agendas.forEach(_agenda => {
        _agenda.turnos.forEach(_turno => {
            _turno.paciente.carpetaEfectores.forEach(async unaCarpeta => {
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
                            }
                        });
                    }
                }
            });
        });
    });
    return registrosSolicitudCarpetas;
}

async function findCarpetas(organizacionId, nrosCarpetas) {
    let pipeline = [];
    let match = {};
    let sort = {};
    let group = {};

    match['organizacion._id'] = { '$eq': organizacionId };
    match['numero'] = { '$in': nrosCarpetas };
    sort['createdAt'] = -1;
    group['_id'] = '$numero';
    group['estado'] = { '$first': '$estado' };
    group['fecha'] = { '$first': '$createdAt' };

    pipeline.push({ '$match': match });
    pipeline.push({ '$sort': sort });
    pipeline.push({ '$group': group });

    return await toArray(prestamo.aggregate(pipeline).cursor({}).exec());
}

async function findCarpetasPrestamo(organizacionId, horaInicio, horaFin, tipoPrestacion, espacioFisico, profesional) {
    let pipeline = [];
    let match = {};
    let sort = {};
    let group = {};

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
    match['organizacion._id'] = { '$eq': organizacionId };

    sort['createdAt'] = -1;
    group['_id'] = '$numero';
    group['estado'] = { '$first': '$estado' };
    group['fecha'] = { '$first': '$createdAt' };
    group['paciente'] = { '$first': '$paciente' };
    group['datosPrestamo'] = { '$first': '$datosPrestamo' };
    group['datosDevolucion'] = { '$first': '$datosDevolucion' };

    pipeline.push({ '$match': match });
    pipeline.push({ '$sort': sort });
    pipeline.push({ '$group': group });

    let result: any = await toArray(prestamo.aggregate(pipeline).cursor({}).exec());

    result = result.filter(function (el) {
        return el.estado === constantes.EstadosPrestamosCarpeta.Prestada;
    });

    return result;
}

async function buscarAgendasTurnos(organizacionId, tipoPrestacion, espacioFisico, profesional, horaInicio, horaFin) {

    let matchCarpeta = {};
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

    matchCarpeta['bloques.turnos.estado'] = { '$eq': 'asignado' };
    matchCarpeta['bloques.turnos.paciente.carpetaEfectores.organizacion._id'] = organizacionId;
    matchCarpeta['bloques.turnos.paciente.carpetaEfectores.nroCarpeta'] = { '$ne': '' };

    let pipelineCarpeta = [{
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
            '_id': { 'id': '$_id' },
            'profesionales': { $push: '$profesionales' },
            'espacioFisico': { $push: '$espacioFisico' },
            'tipoPrestacion': { $push: '$bloques.turnos.tipoPrestacion' },
            'turnos': { $push: '$bloques.turnos' }
        }
    }];

    return await toArray(agenda.aggregate(pipelineCarpeta).cursor({}).exec());
}

export async function prestarCarpeta(req) {
    let prestamoCarpeta: any = await createCarpeta(req.body, constantes.EstadosPrestamosCarpeta.Prestada);
    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

export async function prestarCarpetas(req) {
    let datosCarpetas = req.body;
    let prestamosCarpetas = [];

    for (let i = 0; i < datosCarpetas.length; i++) {
        prestamosCarpetas.push(await createCarpeta(datosCarpetas[i], constantes.EstadosPrestamosCarpeta.Prestada));
    }

    return await savePrestamosCarpetas(req, prestamosCarpetas);
}

export async function devolverCarpeta(req) {
    let prestamoCarpeta: any = await createCarpeta(req.body, constantes.EstadosPrestamosCarpeta.EnArchivo);
    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

export async function devolverCarpetas(req) {
    let datosCarpetas = req.body;
    let prestamosCarpetas = [];

    for (let i = 0; i < datosCarpetas.length; i++) {
        prestamosCarpetas.push(await createCarpeta(datosCarpetas[i], constantes.EstadosPrestamosCarpeta.EnArchivo));
    }

    return await savePrestamosCarpetas(req, prestamosCarpetas);
}

async function createCarpeta(datosCarpeta, estadoPrestamoCarpeta) {
    let agendaId = datosCarpeta.datosPrestamo.agendaId;
    let turnoId = datosCarpeta.datosPrestamo.turno.id;
    let data = await agenda.findById(agendaId);
    let turno = agendaCtrl.getTurno(null, data, turnoId);

    return new prestamo({
        paciente: turno.paciente,
        organizacion: datosCarpeta.organizacion,
        numero: getNroCarpeta(datosCarpeta.organizacion._id, turno.paciente.carpetaEfectores),
        estado: estadoPrestamoCarpeta,
        datosPrestamo: datosCarpeta.datosPrestamo,
        datosDevolucion: (datosCarpeta.datosDevolucion ?
            datosCarpeta.datosDevolucion :
            { observaciones: '', estado: 'Normal' })

    });
}

async function savePrestamoCarpeta(req, nuevoPrestamo) {
    Auth.audit(nuevoPrestamo, req);
    let _prestamoGuardado = await nuevoPrestamo.save(function (err2, prestamoGuardado: any) {
        if (err2) {
            throw err2;
        }
    });
    return _prestamoGuardado;
}

async function savePrestamosCarpetas(req, nuevosPrestamos) {
    nuevosPrestamos.forEach(async _prestamo => {
        Auth.audit(_prestamo, req);
        await _prestamo.save(function (err2, prestamoGuardado: any) {
            if (err2) {
                throw err2;
            }
        });
    });

}

function getNroCarpeta(organizacionId, carpetas) {
    for (let i = 0; i < carpetas.length; i++) {
        if (carpetas[i].organizacion._id.equals(organizacionId)) {
            return carpetas[i].nroCarpeta;
        }
    }
    return;
}

export async function getHistorial(req) {
    let nroCarpeta = req.body.numero;
    let organizacionId = req.body.organizacion._id;

    let filter: any = {
        'organizacion._id': organizacionId,
        'numero': nroCarpeta
    };

    return await prestamo.find(filter);
}
