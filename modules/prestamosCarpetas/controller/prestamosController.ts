import * as mongoose from 'mongoose';
import * as auth from './../../../auth/auth.class'
import { Auth } from './../../../auth/auth.class';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import * as agendaCtrl from '../../../modules/turnos/controller/agenda';
import * as prestamo from '../../../modules/prestamosCarpetas/schemas/prestamo';
import * as constantes from '../schemas/constantes';
import { toArray } from '../../../utils/utils';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { ObjectId } from 'bson';
import { Object } from 'core-js/library/web/timers';

export async function getCarpetas(req) {
    return new Promise(async (resolve, reject) => {
        let organizacion = getOrganizacion();
        let body = req.body;
        let tipoPrestacionId = body.idTipoPrestacion;
        let espacioFisicoId = body.idEspacioFisico;
        let profesionalId = body.idProfesional;
        let horaInicio = body.horaInicio;
        let horaFin = body.horaFin;

        let agendas = await buscarAgendasTurnos(new ObjectId(organizacion._id), tipoPrestacionId, espacioFisicoId, profesionalId, horaInicio, horaFin);
        let nrosCarpetas = getNrosCarpetas(agendas);
        let prestamosCarpetas = await getRegistrosSolicitudCarpetas(req, organizacion._id, agendas, await findCarpetas(organizacion._id, nrosCarpetas));;
        
        resolve(prestamosCarpetas);
    });
}

function getNrosCarpetas(agendas) {
    let nroCarpetas = [];
    agendas.forEach(agenda => {
        agenda.turnos.forEach(unTurno => {
            unTurno.paciente.carpetaEfectores.forEach(async unaCarpeta => {
                if (nroCarpetas.indexOf(unaCarpeta.nroCarpeta) < 0) {
                    nroCarpetas.push(unaCarpeta.nroCarpeta);
                }
            });
        });
    });
    return nroCarpetas;
}

async function getRegistroSolicitudCarpeta(organizacionId, nroCarpeta) {
    let pipeline = [];
    let sort = {};    
    let match = {};
    let group = {};

    match['organizacion._id'] = { '$eq': organizacionId };
    match['numero'] = { '$eq': nroCarpeta };
    sort['createdAt'] = -1;
    group['_id'] = '$numero';
    group['estado'] = { "$first": "$estado" };
    group['fecha'] = { "$first": "$createdAt" };
    group['fecha'] = { "$first": "$createdAt" };
    
    pipeline.push({ '$match': match });
    pipeline.push({ '$sort': sort });
    pipeline.push({ '$group': group });
    
    // return await toArray(prestamo.aggregate(pipeline).cursor({}).exec());
    return await prestamo.aggregate(pipeline).cursor({}).exec();
}

async function getRegistrosSolicitudCarpetas(req, unaOrganizacion, agendas, carpetas) {
    let registrosSolicitudCarpetas = [];
    let resBusquedaCarpeta;

    agendas.forEach(agenda => {
        agenda.turnos.forEach(unTurno => {
            unTurno.paciente.carpetaEfectores.forEach(async unaCarpeta => {
                let carpeta;
                
                for (let i = 0; i < carpetas.length; i++) {
                    if (carpetas[i] === unaCarpeta.numero) {
                        carpeta = carpetas[i];
                        break; 
                    }
                }

                registrosSolicitudCarpetas.push({
                    numero: unaCarpeta.numero,
                    estado: carpeta ? carpeta.estado : constantes.EstadosPrestamosCarpeta.EnArchivo,
                    fecha: new Date(),
                    organizacion: unaOrganizacion,
                    datosPrestamo: {
                        agendaId: agenda._id,
                        observaciones: 'Obs hardcoded',
                        turno: {
                            profesional: agenda.profesionales,
                            espacioFisico:  agenda.espacioFisico,
                            conceptoTurneable: agenda.tipoPrestaciones,
                            paciente: unTurno.paciente
                        }
                    }
                });
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
    match['numero'] = { '$eq': nrosCarpetas };
    sort['createdAt'] = -1;
    group['_id'] = '$numero';
    group['estado'] = { "$first": "$estado" };
    group['fecha'] = { "$first": "$createdAt" };
    group['fecha'] = { "$first": "$createdAt" };

    pipeline.push({ '$match': match });
    pipeline.push({ '$sort': sort });
    pipeline.push({ '$group': group });

    return await toArray(prestamo.aggregate(pipeline).cursor({}).exec());
}

async function buscarAgendasTurnos(organizacion, tipoPrestacion, espacioFisico, profesional, horaInicio, horaFin) {
    let matchCarpeta = {};
    if (tipoPrestacion) {
        matchCarpeta['bloques.turnos.tipoPrestacion._id'] = tipoPrestacion;
    }

    if (espacioFisico) {
        matchCarpeta['espacioFisico.id'] = espacioFisico;
    }

    if (profesional) {
        matchCarpeta['profesionales._id'] = profesional;
    }

    if (horaInicio) {
        matchCarpeta['bloques.turnos.horaInicio'] = { '$gte': horaInicio };
    }

    if (horaFin) {
        matchCarpeta['bloques.turnos.horaFin'] = { '$lte': horaFin };
    }

    matchCarpeta['bloques.turnos.estado'] = { '$eq': 'asignado' };
    matchCarpeta['bloques.turnos.paciente.carpetaEfectores.organizacion._id'] = organizacion;
    matchCarpeta['bloques.turnos.paciente.carpetaEfectores.numero'] = { '$ne': '' };

    let pipelineCarpeta = [{
        '$match' : matchCarpeta
    },
    {
        $unwind: '$bloques'
    },
    {   
        $unwind: '$bloques.turnos' 
    },
    {
        $match : matchCarpeta
    },
    {
        $group: {
            '_id': { 'id': '$_id'},
            'profesionales': { $push: '$profesionales' },
            'espacioFisico': { $push: '$espacioFisico' },
            'tipoPrestaciones': { $push: '$tipoPrestaciones' },
            'turnos': { $push: '$bloques.turnos' }     
        }
    }] 
    
    return await toArray(agenda.aggregate(pipelineCarpeta).cursor({}).exec());
}

export async function prestarCarpeta(req) {
    let prestamoCarpeta : any = await createCarpeta(req, getOrganizacion(), constantes.EstadosPrestamosCarpeta.Prestada);
    prestamoCarpeta.datosPrestamo = {};
    prestamoCarpeta.datosPrestamo.observaciones = req.observaciones;
    prestamoCarpeta.datosPrestamo.turno = {
        profesional: req.body.profesional,
        espacioFisico: req.body.espacioFisico,
        tipoPrestacion: req.body.tipoPrestacion
    };

    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

export async function devolverCarpeta(req) {
    let prestamoCarpeta : any = await createCarpeta(req, getOrganizacion(), constantes.EstadosPrestamosCarpeta.Prestada);
    prestamoCarpeta.datosDevolucion = {};
    prestamoCarpeta.datosDevolucion.observaciones = req.observaciones;
    prestamoCarpeta.datosDevolucion.estado = req.estado;

    return await savePrestamoCarpeta(req, prestamoCarpeta);
}

async function createCarpeta(req, unaOrganizacion, estadoPrestamoCarpeta) {
    let agendaId = req.body.agendaId;
    let turnoId = req.body.turnoId;
    let turno = agendaCtrl.getTurno(null, await agenda.findById(agendaId), turnoId);
    
    return new prestamo({
        paciente: turno.paciente,
        organizacion: unaOrganizacion,
        numero: getNroCarpeta(unaOrganizacion._id, turno.paciente.carpetaEfectores),
        estado: estadoPrestamoCarpeta,
        datosDevolucion: {},
        datosPrestamo: {}
    });
}

async function savePrestamoCarpeta(req, nuevoPrestamo) {
    Auth.audit(nuevoPrestamo, req);
    let prestamoGuardado = await nuevoPrestamo.save(function (err2, prestamoGuardado: any) {
        if (err2) {
            throw err2;
        }
    });
    return prestamoGuardado;
}


function getOrganizacion() {
    // let organizacion = // get organizacion from Auth;
        
    let organizacion = {
        nombre : "HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON",
        _id : new ObjectId("57e9670e52df311059bc8964")
    }

    return organizacion;
}

function getNroCarpeta(organizacionId, carpetas) {
    for (let i = 0; i < carpetas.length; i++) {
        if (carpetas[i].organizacion._id.equals(organizacionId)) {
            console.log('nro carpeta', carpetas[i].nroCarpeta)
            return carpetas[i].nroCarpeta;
        }
    }
    return;   
}
