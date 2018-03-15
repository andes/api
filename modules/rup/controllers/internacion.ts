import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { model as Prestacion } from '../schemas/prestacion';

export function buscarUltimaInternacion(idPaciente, estado) {
    let query;
    if (estado) {
        query = Prestacion.find({
            $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
        });
    } else {
        query = Prestacion.find({}); // Trae todos
    }

    if (idPaciente) {
        query.where('paciente.id').equals(idPaciente);
    }

    query.where('solicitud.ambitoOrigen').equals('internacion');
    return query.sort({ 'solicitud.fecha': -1 }).limit(1).exec();
}
