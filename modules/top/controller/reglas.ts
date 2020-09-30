import { ObjectId } from '@andes/core';
import { Types } from 'mongoose';
import { ReglasTOP } from '../schemas/reglas';
export interface CheckReglaParams {
    estado?: string;
    organizacionOrigen?: ObjectId;
    prestacionOrigen?: string;
    organizacionDestino?: ObjectId;
    prestacionDestino?: string;
}
export async function checkRegla(params: CheckReglaParams) {
    const query = {};
    if (params.estado) {
        query['origen.estado'] = params.estado;
    } else {
        query['origen.estado'] = { $exists: false };
    }

    if (params.organizacionOrigen) {
        query['origen.organizacion.id'] = new Types.ObjectId(params.organizacionOrigen);
    }

    if (params.prestacionOrigen) {
        query['$or'] = [
            { 'origen.prestaciones.prestacion.conceptId': params.prestacionOrigen },
            { 'origen.prestaciones': null },
        ];
        // query[] = ;
    }

    if (params.organizacionDestino) {
        query['destino.organizacion.id'] = new Types.ObjectId(params.organizacionDestino);
    }
    if (params.prestacionDestino) {
        query['destino.prestacion.conceptId'] = params.prestacionDestino;
    }
    const regla = await ReglasTOP.findOne(query);

    if (params.prestacionDestino) {
        if (Array.isArray(regla.destino.prestacion)) {
            regla.destino.prestacion = regla.destino.prestacion.find(p => p.conceptId === params.prestacionDestino);
        }
    }

    return regla;
}
