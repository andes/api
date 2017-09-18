import * as mongoose from 'mongoose';
import * as moment from 'moment';
import {
    agendaSipsCache
} from '../schemas/agendaSipsCache';

export function cacheTurnosSips(unaAgenda) {

    let agenda = new agendaSipsCache({
        id: unaAgenda.id,
        organizacion: unaAgenda.organizacion,
        profesionales: unaAgenda.profesionales,
        tipoPrestaciones: unaAgenda.tipoPrestaciones,
        espacioFisico: unaAgenda.espacioFisico,
        bloques: unaAgenda.bloques,
        estado: unaAgenda.estado,
        horaInicio: unaAgenda.horaInicio,
        horaFin: unaAgenda.horaFin
    });

    agenda.save(function (err, agendaGuardada: any) {
        if (err) {
            return err;
        }
        return true;
    });
}