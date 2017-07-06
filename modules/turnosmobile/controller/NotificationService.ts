import { INotification, PushClient } from './PushClient';
import { pacienteApp } from '../schemas/pacienteApp';
import * as agenda from '../../turnos/schemas/agenda';

import * as mongoose from 'mongoose';

export class NotificationService {
    public static notificarReasignar(datosTurno) {
        this.findTurno(datosTurno).then((turno: any) => {
            let idPaciente = turno.paciente.id;
            pacienteApp.findOne({ 'idPaciente': idPaciente }, function (err, doc: any) {
                let devices = doc.devices.map(item => item.device_id)
                let body = 'El turno del ' + turno.horaInicio + ' fue REASIGNADO';
                new PushClient().send(devices, { body });
            });
        }).catch(() => { console.log("ERROR"); })
    }

    public static findTurno(datosTurno) {
        return new Promise((resolve, reject) => {
            agenda.findById(datosTurno.idAgenda, function (err, ag: any) {
                if (err) {
                    reject();
                }
                let bloque = ag.bloques.id(datosTurno.idBloque);
                if (bloque) {
                    let t = bloque.turnos.id(datosTurno.idTurno);
                    resolve(t);
                } else {
                    reject();
                }
            });
        });
    }

}