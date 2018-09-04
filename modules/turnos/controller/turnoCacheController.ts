import { ValidateDarTurno } from './../../../utils/validateDarTurno';
import * as agenda from '../schemas/agenda';
import { agendasCache } from '../../legacy/schemas/agendasCache';

/* Esta función es la misma que tiene el put de turno.ts - TODO: Ver como unificar*/
export function updateTurnoAgendaMongo(datosTurno: any) {

    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    return new Promise((resolve, reject) => {

        const continues = ValidateDarTurno.checkTurno(datosTurno.turno);
        const posBloque = datosTurno.posBloque;
        const posTurno = datosTurno.posTurno;
        if (continues.valid) {
            // Se obtiene la agenda que se va a modificar
            agenda.findById(datosTurno.idAgenda, function getAgenda(err, data) {
                if (err) {
                    reject(err);
                }
                let etiquetaTurno: string;
                if (posBloque === -1) {
                    etiquetaTurno = 'sobreturnos.' + posTurno;
                } else {
                    etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
                }
                const update: any = {};
                const query = {
                    _id: datosTurno.idAgenda,
                };
                // delete datosTurno._id;
                // delete datosTurno.turno._id;
                update[etiquetaTurno] = datosTurno.turno;
                // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
                (agenda as any).findOneAndUpdate(query, { $set: update }, { upsert: true, new: true }, function actualizarAgenda(err2, doc2) {
                    if (err2) {
                        // console.log("ERROR UPDATE-----------------", err2);
                        reject(err2);
                    } else {
                        // console.log("UPDATE-----------------", doc2);
                        resolve(doc2._id);
                    }
                });
            });

        } else {
            resolve('Los datos del paciente son inválidos');
        }
    });
}

export function updateTurnoAgendaCache(datosTurno: any, agendaCacheada) {

    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    return new Promise((resolve, reject) => {

        const continues = ValidateDarTurno.checkTurno(datosTurno.turno);
        const posBloque = datosTurno.posBloque;
        const posTurno = datosTurno.posTurno;
        if (continues.valid) {
            // Se obtiene la agenda que se va a modificar
            agendasCache.findById(agendaCacheada._id, function getAgenda(err, data) {
                if (err) {
                    reject(err);
                }
                let etiquetaTurno: string;
                if (posBloque === -1) {
                    etiquetaTurno = 'sobreturnos.' + posTurno;
                } else {
                    etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
                }
                const update: any = {};
                const query = {
                    _id: agendaCacheada._id,
                };
                // delete datosTurno._id;
                // delete datosTurno.turno._id;
                update[etiquetaTurno] = datosTurno.turno;
                // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
                (agendasCache as any).findOneAndUpdate(query, { $set: update }, { upsert: true, new: true }, function actualizarAgenda(err2, doc2) {
                    if (err2) {
                        // console.log("ERROR UPDATE-----------------", err2);
                        reject(err2);
                    } else {
                        // console.log("UPDATE-----------------", doc2);
                        resolve(doc2._id);
                    }
                });
            });

        } else {
            resolve('Los datos del paciente son inválidos');
        }
    });
}

