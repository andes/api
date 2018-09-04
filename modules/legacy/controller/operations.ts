import * as mongoose from 'mongoose';
import * as constantes from '../schemas/constantes';
import {
    agendasCache
} from '../schemas/agendasCache';
import {
    profesional
} from './../../../core/tm/schemas/profesional';
import * as organizacion from './../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import { configuracionPrestacionModel } from '../../../core/term/schemas/configuracionPrestacion';


// Funciones privadas
function traeProfesionalPorId(id) {
    return new Promise((resolve, reject) => {
        profesional.findById(mongoose.Types.ObjectId(id), (err, unProfesional) => {
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
        const listaProf = [];
        let counter = 0;
        lstProfesionales.forEach(async prof => {
            const pro = await traeProfesionalPorId(prof.id);
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
        organizacion.model.findById(mongoose.Types.ObjectId(idOrganizacion), (err, unaOrganizacion) => {
            if (err) {
                return reject(err);
            }
            return resolve(unaOrganizacion);
        });
    });
}

// Funciones públicas
export function noExistCDA(protocol, dniPaciente) {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'select * from LAB_ResultadoEncabezado where idProtocolo = ' + protocol + ' and numeroDocumento =  ' + dniPaciente;
            const result = await new sql.Request().query(query);
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
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'UPDATE LAB_ResultadoEncabezado set cda = ' + '\'' + idCda + '\'' + ' where idProtocolo = ' + protocol + ' and numeroDocumento = ' + documento;
            const result = await new sql.Request().query(query);
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
        }, (err, doc: any) => {
            if (err) {
                return reject(err);
            }
            if (doc) {
                const org = {
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
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'select efector.codigoSisa as efectorCodSisa, efector.nombre as efector, encabezado.idEfector as idEfector, encabezado.apellido, encabezado.nombre, encabezado.fechaNacimiento, encabezado.sexo, ' +
                'encabezado.numeroDocumento, encabezado.fecha, encabezado.idProtocolo, encabezado.solicitante from LAB_ResultadoEncabezado as encabezado ' +
                'inner join Sys_Efector as efector on encabezado.idEfector = efector.idEfector ' +
                'where encabezado.numeroDocumento = ' + documento;
            const result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
}


export async function getDetalles(idProtocolo, idEfector) {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'select grupo, item, resultado, valorReferencia, observaciones, hiv, profesional_val ' +
                ' from LAB_ResultadoDetalle as detalle where esTitulo = \'No\' and detalle.idProtocolo = ' + idProtocolo + ' and detalle.idEfector = ' + idEfector;
            const result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
}


export async function cacheTurnos(unaAgenda) {
    // Armo el DTO para guardar en la cache de agendas
    // if ((unaAgenda.estado !== 'planificacion') && (unaAgenda.nominalizada) && (unaAgenda.tipoPrestaciones[0].term.includes('odonto')) || integraPrestacionesHPN(unaAgenda)) {
    let integrar;
    try {
        integrar = await integrarAgenda(unaAgenda);

    } catch (error) {
        return error;
    }

    if (unaAgenda.estado !== 'planificacion' && integrar) {
        let organizacionAgenda;
        if (unaAgenda.organizacion) {
            organizacionAgenda = await organizacionCompleto(unaAgenda.organizacion.id);
        }
        let profesionalesAgenda;
        if (unaAgenda.profesionales && unaAgenda.profesionales.length > 0) {
            profesionalesAgenda = await profesionalCompleto(unaAgenda.profesionales);
        }
        const agenda = new agendasCache({
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
                        estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
                        sobreturnos: unaAgenda.sobreturnos

                    }
                }).exec();
            } else {
                agenda.save((err2, agendaGuardada: any) => {
                    if (err2) {
                        return err2;
                    }
                    return true;
                });
            }
        });
    } else {
        return true;
    }

    async function integrarAgenda(_agenda) {
        return new Promise((resolve, reject) => {
            configuracionPrestacionModel.find({
                'snomed.conceptId': { $eq: _agenda.tipoPrestaciones[0].conceptId },
                'organizaciones._id': { $eq: _agenda.organizacion._id }
            }).exec((err, data: any) => {
                if (err) {
                    reject(err);
                }
                if (data && data.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }
}

