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

            // if (true) {
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
                    console.log("Pos Bloque =>  ", posBloque)
                    posTurno = (data as any).bloques[posBloque].turnos.findIndex(turno => Object.is(String(datosTurno.idTurno), String(turno._id)));
                    console.log("Pos Turno =>  ", posTurno)
                    etiquetaTurno = 'bloques.' + posBloque + '.turnos.' + posTurno;
                } else {
                    posTurno = (data as any).sobreturnos.findIndex(sobreturno => Object.is(datosTurno.idTurno, String(sobreturno._id)));
                    etiquetaTurno = 'sobreturnos.' + posTurno;
                }
                //  let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
                let usuario = datosTurno.idUsuarioSips;
                // Copia la organización desde el token
                //  usuario.organizacion = (req as any).user.organizacion;

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
                            return ('No se pudo actualizar los datos del turno');
                        } else {
                            let datosOp = {
                                turno: update[etiquetaTurno]
                            };
                            console.log("Tunro actualizado")
                            resolve(data);
                            return ('Se actualizó el turno');
                            //  Logger.log(req, 'turnos', 'update', datosOp);
                        }

                        //  res.json(data);


                        //  if (req.body.turno.reasignado && req.body.turno.reasignado.siguiente) {
                        //      let turno = doc2.bloques.id(req.params.idBloque).turnos.id(req.params.idTurno);
                        //      LoggerPaciente.logTurno(req, 'turnos:reasignar', req.body.turno.paciente, turno, req.params.idBloque, req.params.idAgenda);

                        //      NotificationService.notificarReasignar(req.params);
                        //  }

                    });
                return null;
            });

            return null;
        } else {
            return ('Los datos del paciente son inválidos');
        }
    });
}

