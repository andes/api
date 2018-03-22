import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as constantes from '../schemas/constantes';
import {
    agendasCache
} from '../schemas/agendasCache';
import {
    profesional
} from './../../../core/tm/schemas/profesional';
import * as organizacion from './../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import * as cdaCtr from '../../cda/controller/CDAPatient';
import {
    ObjectID,
    ObjectId
} from 'bson';



// Funciones privadas
function traeProfesionalPorId(id) {
    return new Promise((resolve, reject) => {
        profesional.findById(mongoose.Types.ObjectId(id), function (err, unProfesional) {
            if (err) {
                return reject(err);
            }
            return resolve(unProfesional);
        });
    });
}
/** Dada una lista de profesionales, devuelve una lista de profesionales completa */
function profesionalCompleto(lstProfesionales): any {
    return new Promise((resolve, reject) => {
        let listaProf = [];
        let counter = 0;
        lstProfesionales.forEach(async prof => {
            let pro = await traeProfesionalPorId(prof.id);
            counter++;
            listaProf.push(pro);
            // Esto es una mersada pero no me doy cuenta como hacerlo mejor
            if (counter === lstProfesionales.length) {
                return resolve(listaProf);
            }
        });
    });
}
/** Dado un id de Organización devuelve el objeto completo */
function organizacionCompleto(idOrganizacion): any {
    return new Promise((resolve, reject) => {
        organizacion.model.findById(mongoose.Types.ObjectId(idOrganizacion), function (err, unaOrganizacion) {
            if (err) {
                return reject(err);
            }
            return resolve(unaOrganizacion);
        });
    });
}

// Funciones públicas
export function noExistCDA(protocol, dniPaciente) {
    return new Promise(async function (resolve, reject) {
        try {
            let query = 'select * from LAB_ResultadoEncabezado where idProtocolo = ' + protocol + ' and numeroDocumento =  ' + dniPaciente;
            let result = await new sql.Request().query(query);
            if (result[0].cda) {
                return resolve(null); // Si ya tiene el cda no hacer nada
            } else {
                return resolve(result[0]); // Si no tiene cda asociado devuelve el objeto
            }
        } catch (ex) {
            return reject(null);
        }
    });
}

export function setMarkProtocol(protocol, documento, idCda) {
    return new Promise(async function (resolve, reject) {
        try {
            let query = 'UPDATE LAB_ResultadoEncabezado set cda = ' + '\'' + idCda + '\'' + ' where idProtocolo = ' + protocol + ' and numeroDocumento = ' + documento;
            let result = await new sql.Request().query(query);
            resolve(result);
        } catch (ex) {
            reject(null);
        }
    });
}

export function organizacionBySisaCode(code): any {
    return new Promise((resolve, reject) => {
        organizacion.model.findOne({
            'codigo.sisa': code
        }, function (err, doc: any) {
            if (err) {
                return reject(err);
            }
            if (doc) {
                let org = {
                    _id: doc.id,
                    nombre: doc.nombre,
                };
                return resolve(org);
            } else {
                return reject({});
            }
        });
    });
}


export function getEncabezados(documento): any {
    return new Promise(async function (resolve, reject) {
        try {
            let query = 'select efector.codigoSisa as efectorCodSisa, efector.nombre as efector, encabezado.idEfector as idEfector, encabezado.apellido, encabezado.nombre, encabezado.fechaNacimiento, encabezado.sexo, ' +
                'encabezado.numeroDocumento, encabezado.fecha, encabezado.idProtocolo, encabezado.solicitante from LAB_ResultadoEncabezado as encabezado ' +
                'inner join Sys_Efector as efector on encabezado.idEfector = efector.idEfector ' +
                'where encabezado.numeroDocumento = ' + documento;
            let result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
}


export async function getDetalles(idProtocolo, idEfector) {
    return new Promise(async function (resolve, reject) {
        try {
            let query = 'select grupo, item, resultado, valorReferencia, observaciones, hiv, profesional_val ' +
                ' from LAB_ResultadoDetalle as detalle where esTitulo = \'No\' and detalle.idProtocolo = ' + idProtocolo + ' and detalle.idEfector = ' + idEfector;
            let result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
}


export async function cacheTurnosSips(unaAgenda) {
    // Armo el DTO para guardar en la cache de agendas
    // if ((unaAgenda.estado !== 'planificacion') && (unaAgenda.nominalizada) && (unaAgenda.tipoPrestaciones[0].term.includes('odonto')) || integraPrestacionesHPN(unaAgenda)) {
    if (integrarAgenda(unaAgenda) && unaAgenda.estado !== 'planificacion') {
        let organizacionAgenda;
        if (unaAgenda.organizacion) {
            organizacionAgenda = await organizacionCompleto(unaAgenda.organizacion.id);
        }
        let profesionalesAgenda;
        if (unaAgenda.profesionales && unaAgenda.profesionales.length > 0) {
            profesionalesAgenda = await profesionalCompleto(unaAgenda.profesionales);
        }
        let agenda = new agendasCache({
            id: unaAgenda.id,
            tipoPrestaciones: unaAgenda.tipoPrestaciones,
            espacioFisico: unaAgenda.espacioFisico,
            organizacion: organizacionAgenda,
            profesionales: profesionalesAgenda,
            bloques: unaAgenda.bloques,
            estado: unaAgenda.estado,
            horaInicio: unaAgenda.horaInicio,
            horaFin: unaAgenda.horaFin,
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
        });

        let query = {
            id: unaAgenda.id
        };

        agendasCache.find({
            id: agenda.id
        }, function getAgenda(err, data) {
            if (err) {
                return (err);
            }
            if (data.length > 0) {
                agendasCache.update({
                    id: agenda.id
                }, {
                        $set: {
                            tipoPrestaciones: unaAgenda.tipoPrestaciones,
                            espacioFisico: unaAgenda.espacioFisico,
                            organizacion: organizacionAgenda,
                            profesionales: profesionalesAgenda,
                            bloques: unaAgenda.bloques,
                            estado: unaAgenda.estado,
                            horaInicio: unaAgenda.horaInicio,
                            horaFin: unaAgenda.horaFin,
                            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente
                        }
                    }).exec();
            } else {
                agenda.save(function (err2, agendaGuardada: any) {
                    if (err2) {
                        return err2;
                    }
                    return true;
                });
            }
        });
    }

    function integrarAgenda(_agenda) {
        let prestacionesIntegradas: any;
        let datosOrganizacion = constantes.prestacionesIntegradasPorEfector.find(elem => elem.organizacion === _agenda.organizacion.id);
        if (datosOrganizacion) {
            prestacionesIntegradas = _agenda.tipoPrestaciones.find(prestacion => {
                return (datosOrganizacion.prestaciones.filter(prest => prest.conceptId === prestacion.conceptId).length > 0);
            });
        }

        if (prestacionesIntegradas) {
            return true;
        } else {
            return false;
        }

    }
}

