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

export async function getCarpetas(req) {
    return new Promise(async (resolve, reject) => {
        let organizacion = getOrganizacion();
        let body = req.body;
        let tipoPrestacionId = body.idTipoPrestacion;
        let espacioFisicoId = body.idEspacioFisico;
        let profesionalId = body.idProfesional;
        let horaInicio = body.horaInicio;
        let horaFin = body.horaFin;

        let pacientesSinCarpetasIds = [];
        let agendas = await buscarAgendasTurnos(new ObjectId(organizacion._id), tipoPrestacionId, espacioFisicoId, profesionalId, horaInicio, horaFin);
        console.log('agendas.length',agendas.length);
        let nrosCarpetas = getNrosCarpetas(agendas);
        // let datosTurnos = await getDatosTurnos(turnos);
        // let carpetasPacientes = getCarpetasPacientes(turnos);
        // let nrosCarpetas = Object.keys(carpetasPacientes);
        let prestamosCarpetas = await getRegistrosSolicitudCarpetas(req, organizacion._id, agendas, await findCarpetas(organizacion._id, nrosCarpetas));;
        
        // console.log(nrosCarpetas.length);
        // prestamosCarpetas.forEach(carpeta => {
        //     var index = nrosCarpetas.indexOf(carpeta.numero);
        //     if (index > -1) {
        //         nrosCarpetas.splice(index, 1);
        //     }   
        // });

        // console.log(nrosCarpetas);
        
        resolve(prestamosCarpetas);
    });
}

function getNrosCarpetas(agendas) {
    let nroCarpetas = [];
    agendas.forEach(agenda => {
        console.log('agenda');
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

// function getCarpetasPacientes(datosTurnos){
//     let carpetasPacientes = {};
//     datosTurnos.forEach(datosTurno => {
//         let paciente = datosTurno.turno.paciente;
//         if (paciente && paciente.carpetaEfectores) {
//             paciente.carpetaEfectores.forEach(async carpeta => {
//                 if (carpeta.nroCarpeta && !carpetasPacientes[carpeta.nroCarpeta]) {
//                         [carpeta.nroCarpeta] = paciente;
//                 }
//             });
//         }
//     });
//     return carpetasPacientes;
// }

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
                    if (carpetas[i].numero === unaCarpeta.numero) {
                        carpeta = carpetas[i];
                        break; 
                    }
                }
                registrosSolicitudCarpetas.push({
                    
                    estado: carpeta ? carpeta.estado : constantes.EstadosPrestamosCarpeta.EnArchivo,
                    fecha: new Date(),
                    organizacion: unaOrganizacion,
                    datosPrestamo: {
                        observaciones: 'Obs hardcoded',
                        turno: {
                            idProfesional: agenda.profesionales,
                            idEspacioFisico:  agenda.espacioFisico,
                            idConceptoTurneable: agenda.tipoPrestaciones
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

async function savePrestamoCarpeta(req, unaOrganizacion, unPaciente, estadoPrestamoCarpeta)  {
    // hardcodear datos faltantes de paciente para poder guardarlo en el documento
    // revisar
    unPaciente.estado = 'validado';
    unPaciente.sexo = 'otro';
    unPaciente.genero = 'otro';

    let nuevoPrestamo;
    
    nuevoPrestamo = new prestamo({
        paciente: unPaciente,
        organizacion: unaOrganizacion,
        numero: await getNextNroCarpeta(unaOrganizacion._id),
        estado: estadoPrestamoCarpeta

    });
    Auth.audit(nuevoPrestamo, req);
    await nuevoPrestamo.save(function (err2, agendaGuardada: any) {
        if (err2) {
            console.log(err2);
            throw err2;
        }
        console.log('prestamo saved');
    });
    return nuevoPrestamo;
}

// function getDatosTurnos(agendas) {
//     return new Promise<Array<any>>(async (resolve, reject) => {
        
//         let datosTurnos = [];
//         let nroCarpetas = [];

//         agendas.forEach(agenda => {
//             agenda.turnos.forEach(unTurno => {
//                 unTurno.paciente.carpetaEfectores.forEach(async unaCarpeta => {
//                     if (nroCarpetas.indexOf[unaCarpeta.nroCarpeta] < 0) {
//                         nroCarpetas.push[unaCarpeta.nroCarpeta];
                        
//                         datosTurnos.push({
//                             turno: unTurno,
//                             agendaId: agenda._id,
//                             carpeta: unaCarpeta
//                         });
//                     }
//                 });
//             }
//         });
//         resolve(datosTurnos);
//     });
// }



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
                                                    
    let prestamoCarpeta = await savePrestamoCarpeta(req, getOrganizacion(),  await paciente.findById(req.body.pacienteId), constantes.EstadosPrestamosCarpeta.Prestada);
    let turno = agendaCtrl.getTurno
    prestamoCarpeta.datosPrestamo = {};
    prestamoCarpeta.datosPrestamo['observaciones'] = req.observaciones;
    prestamoCarpeta.datosPrestamo['turno'] = {
        idProfesional: req.idProfesional,
        idEspacioFisico: req.idEspacioFisico,
        idConceptoTurneable: req.idConceptoTurneable
    };
}

export async function devolverCarpeta(req) {
    // let prestamoCarpeta = await savePrestamoCarpeta(req, await paciente.findById(req.body.pacienteId), constantes.EstadosPrestamosCarpeta.EnArchivo);
    // prestamoCarpeta.datosDevolucion = {};
    // prestamoCarpeta.datosDevolucion['observaciones'] = req.observaciones;
    // prestamoCarpeta.datosDevolucion['estado'] = req.estado;
}

function getOrganizacion() {
    // let organizacion = // get organizacion from Auth;
        
    let organizacion = {
        nombre : "HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON",
        _id : new ObjectId("57e9670e52df311059bc8964")
    }

    return organizacion;
}

async function getNextNroCarpeta(organizacionId) {
    return Math.random() * (9999999) + 0;   
}
