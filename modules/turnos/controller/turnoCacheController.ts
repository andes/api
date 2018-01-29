import * as mongoose from 'mongoose';
import { Logger } from '../../../utils/logService';
import { ValidateDarTurno } from './../../../utils/validateDarTurno';
import * as agenda from '../schemas/agenda';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { NotificationService } from '../../mobileApp/controller/NotificationService';

/* Esta función es la misa que tiene el put de turno.ts - TODO: Ver como unificar*/
export function updateTurno(datosTurno: any) {

    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    return new Promise((resolve, reject) => {

        let continues = ValidateDarTurno.checkTurno(datosTurno.turno);
        let posBloque = datosTurno.posBloque;
        let posTurno = datosTurno.posTurno;
        if (continues.valid) {
            // Se obtiene la agenda que se va a modificar
            agenda.findById(datosTurno.idAgenda, function getAgenda(err, data) {
                if (err) {
                    reject(err);
                }
                let etiquetaTurno: string;
                etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
                let usuario = datosTurno.idUsuarioSips;
                let update: any = {};
                let query = {
                    _id: datosTurno.idAgenda,
                };
                delete datosTurno._id;
                delete datosTurno.turno._id;
                update[etiquetaTurno] = datosTurno.turno;
                // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
                (agenda as any).findOneAndUpdate(query, { $set: update }, { upsert: true, new: true },
                    function actualizarAgenda(err2, doc2) {
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

