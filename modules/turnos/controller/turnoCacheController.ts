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

        if (continues.valid) {
            // Se obtiene la agenda que se va a modificar
            agenda.findById(datosTurno.idAgenda, function getAgenda(err, data) {

                if (err) {
                    reject(err);
                }
                let etiquetaTurno: string;
                let posTurno: number;
                let posBloque: number;
                if (datosTurno.idBloque !== '-1') {
                    posBloque = (data as any).bloques.findIndex(bloque => Object.is(String(datosTurno.idBloque), String(bloque._id)));

                    posTurno = (data as any).bloques[posBloque].turnos.findIndex(turno => Object.is(String(datosTurno.idTurno), String(turno._id)));

                    etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
                    resolve();
                } else {
                    posTurno = (data as any).sobreturnos.findIndex(sobreturno => Object.is(datosTurno.idTurno, String(sobreturno._id)));
                    etiquetaTurno = 'sobreturnos.' + posTurno;
                    resolve();
                }

                let usuario = datosTurno.idUsuarioSips;
                let update: any = {};

                let query = {
                    _id: datosTurno.idAgenda,
                };

                update[etiquetaTurno] = datosTurno.turno;

                // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
                (agenda as any).findOneAndUpdate(query, update, { new: true },

                    function actualizarAgenda(err2, doc2, writeOpResult) {

                        if (err2) {
                            reject(err2);
                        }
                        if (writeOpResult && writeOpResult.value === null) {
                            resolve('No se pudo actualizar los datos del turno');
                        } else {
                            let datosOp = {
                                turno: update[etiquetaTurno]
                            };

                            resolve(doc2._id);

                        }
                    });
                resolve(null);
            });

            resolve(null);
        } else {
            resolve('Los datos del paciente son inválidos');
        }
    });
}

