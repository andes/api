import * as mongoose from 'mongoose';
import { HudsAcceso } from './hudsAccesos.schema';


/**
 * Realiza una búsqueda de los accesos a la Huds
 * @param filtros Condiciones de busquedas
 * @param fields Selecciona los campos de los documentos a devolver
 * @returns Devuelve listado de los accesos encontrados
 */

export async function search(filtros) {
    const match = {};
    const fechas = [];

    if (filtros.fechaDesde) {
        fechas.push({ 'accesos.fecha': { $gte: new Date(filtros.fechaDesde) } });
        filtros['$and'] = fechas;
    }

    if (filtros.fechaHasta) {
        fechas.push({ 'accesos.fecha': { $lte: new Date(filtros.fechaHasta) } });
        filtros['$and'] = fechas;
    }

    if (filtros.paciente) {
        match['paciente'] = mongoose.Types.ObjectId(filtros.paciente);
    }

    if (filtros.turno) {
        match['accesos.turno'] = filtros.turno;
    }

    if (filtros.prestacion) {
        match['accesos.prestacion'] = mongoose.Types.ObjectId(filtros.prestacion);
    }

    if (filtros.organizacion) {
        match['accesos.organizacion.id'] = mongoose.Types.ObjectId(filtros.organizacion);
    }

    if (filtros.usuario) {
        match['accesos.usuario.id'] = mongoose.Types.ObjectId(filtros.usuario);
    }

    let skip = 0;
    if (filtros.skip) {
        skip = parseInt(filtros.skip || 0, 10);
    }
    let limit = 10;
    if (filtros.limit) {
        limit = parseInt(filtros.limit || 0, 10);
    }

    const aggregate = [
        {
            $match: match
        },
        {
            $unwind: '$accesos',
        },
        {
            $sort: { 'accesos.fecha': -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $project: {
                fecha: '$accesos.fecha',
                usuario: '$accesos.usuario',
                matricula: '$accesos.matricula',
                motivoAcceso: '$accesos.motivoAcceso',
                organizacion: '$accesos.organizacion',
                detalleMotivo: '$accesos.detalleMotivo',
            }
        }
    ];

    return await HudsAcceso.aggregate(aggregate);

}

export const HudsAccesosCtr = {
    search
};
