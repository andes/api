import { ObjectId } from '@andes/core';
import { Types } from 'mongoose';
import { ReglasTOP } from '../schemas/reglas';
export interface CheckReglaParams {
    organizacionOrigen?: ObjectId;
    prestacionOrigen?: string;
    organizacionDestino?: ObjectId;
    prestacionDestino?: string;
}
export function checkRegla(params: CheckReglaParams) {
    const query = {};
    if (params.organizacionOrigen) {
        query['origen.organizacion.id'] = new Types.ObjectId(params.organizacionOrigen);
    }

    if (params.prestacionOrigen) {
        query['origen.prestaciones.prestacion.conceptId'] = params.prestacionOrigen;
    }

    if (params.organizacionDestino) {
        query['destino.organizacion.id'] = new Types.ObjectId(params.organizacionDestino);
    }
    if (params.prestacionDestino) {
        query['destino.prestacion.conceptId'] = params.prestacionDestino;
    }
    return ReglasTOP.findOne(query);
}
