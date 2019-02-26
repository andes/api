import * as mongoose from 'mongoose';
import * as constantes from '../schemas/constantes';
import { agendasCache } from '../schemas/agendasCache';
import { profesional } from './../../../core/tm/schemas/profesional';
import { Organizacion } from './../../../core/tm/schemas/organizacion';
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
        Organizacion.findById(mongoose.Types.ObjectId(idOrganizacion), (err, unaOrganizacion) => {
            if (err) {
                return reject(err);
            }
            return resolve(unaOrganizacion);
        });
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

