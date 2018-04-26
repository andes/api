import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { model as cama } from '../../../core/tm/schemas/camas';
import { toArray } from '../../../utils/utils';

export function buscarCamaInternacion(idInternacion, estado) {
    let query = cama.aggregate([
        {
            $project: {
                ultimoEstado: { $arrayElemAt: ['$estados', -1] }, organizacion: 1, sector: 1,
                habitacion: 1, nombre: 1, tipoCama: 1
            }
        },
        { $match: { 'ultimoEstado.estado': estado, 'ultimoEstado.idInternacion': idInternacion } }
    ]);

    return toArray(query.cursor({}).exec());
}

export function buscarPasesCamaXInternacion(idInternacion) {

    let pipelineEstado = [];

    pipelineEstado = [
        { $match: { 'estados.idInternacion': idInternacion } },
        { $unwind: '$estados' },
        { $match: { 'estados.idInternacion': idInternacion } },
        { $sort: { 'estados.fecha': 1 } }];

    let query = cama.aggregate(pipelineEstado);

    return toArray(query.cursor({}).exec());
}
