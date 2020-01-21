import * as mongoose from 'mongoose';
import moment = require('moment');
import { CamaEstados } from './cama-estados.schema';
import { ObjectId } from '@andes/core';
import { Request } from '@andes/api-tool';
import { AuditDocument } from '@andes/mongoose-plugin-audit';

export async function snapshotEstados({ fecha, organizacion, ambito, capa }, filtros) {
    const firstMatch = {};
    const secondMatch = {};
    if (filtros.cama) {
        firstMatch['idCama'] = mongoose.Types.ObjectId(filtros.cama);
    }

    if (filtros.paciente) {
        secondMatch['estados.paciente.id'] = mongoose.Types.ObjectId(filtros.paciente);
    }

    if (filtros.internacion) {
        secondMatch['estados.idInternacion'] = mongoose.Types.ObjectId(filtros.internacion);
    }

    if (filtros.estado) {
        secondMatch['estados.estado'] = filtros.estado;
    }

    const aggregate = [
        {
            $match: {
                idOrganizacion: mongoose.Types.ObjectId(organizacion),
                ambito,
                capa,
                start: { $lte: moment(fecha).toDate() },
                ...firstMatch
            }
        },
        {
            $unwind: '$estados',
        },
        {
            $match: {
                'estados.fecha': { $lte: moment(fecha).toDate() }
            }
        },
        {
            $group: {
                _id: '$idCama',
                fechaMax: {
                    $max: '$estados.fecha'
                }
            }
        },
        {
            $lookup: {
                from: 'internacionCamaEstados',
                let: {
                    idCama: '$_id',
                    fechaMax: '$fechaMax'
                },
                pipeline: [
                    {
                        $match: {
                            idOrganizacion: mongoose.Types.ObjectId(organizacion),
                            ambito,
                            capa,
                            $expr: {
                                $and: [
                                    { $eq: ['$idCama', '$$idCama'] },
                                    { $lte: ['$start', '$$fechaMax'] },
                                    { $gte: ['$end', '$$fechaMax'] }
                                ]
                            },
                        }
                    },
                    {
                        $unwind: '$estados',
                    },
                    {
                        $match: {
                            $expr: { $eq: ['$estados.fecha', '$$fechaMax'] }
                        }
                    },
                    {
                        $limit: 1
                    }
                ],
                as: 'estado'
            }
        },
        {
            $unwind: '$estado'
        },
        {
            $addFields: {
                'estado.estados.idCama': '$_id',
                'estado.estados.ambito': '$ambito',
                'estado.estados.capa': '$capa',
            }
        },
        {
            $replaceRoot: {
                newRoot: '$estado.estados'
            }
        },
        {
            $match: secondMatch
        },
        {
            $lookup: {
                from: 'internacionCamas',
                localField: 'idCama',
                foreignField: '_id',
                as: 'cama'

            }
        },
        {
            $replaceRoot: {
                newRoot: { $mergeObjects: ['$$ROOT', { $arrayElemAt: ['$cama', 0] }] }
            }
        },
        {
            $project: { cama: 0, __v: 0 }
        }
    ];

    return await CamaEstados.aggregate(aggregate);
}

function wrapObjectId(objectId: ObjectId) {
    return new mongoose.Types.ObjectId(objectId);
}

interface SearchEstadosParams {
    /**
     * ID de la Cama (string o ObjectId)
     */
    cama: ObjectId;

    /**
     * ID del paciente (string o ObjectId)
     */
    paciente: ObjectId;

    /**
     * ID del paciente (string o ObjectId)
     */
    internacion: ObjectId;

    estado: string;

}


/**
 * Devuelve los movimientos de camas e internaciones en un periodo determinado.
 */

export async function searchEstados({ desde, hasta, organizacion, ambito, capa }, filtros: Partial<SearchEstadosParams> = {}) {
    const firstMatch = {};
    const secondMatch = {};

    if (filtros.cama) {
        firstMatch['idCama'] = wrapObjectId(filtros.cama);
    }

    if (filtros.paciente) {
        secondMatch['estados.paciente.id'] = wrapObjectId(filtros.paciente);
    }

    if (filtros.internacion) {
        secondMatch['estados.idInternacion'] = wrapObjectId(filtros.internacion);
    }

    if (filtros.estado) {
        secondMatch['estados.estado'] = filtros.estado;
    }

    const aggregate = [
        {
            $match: {
                idOrganizacion: wrapObjectId(organizacion),
                ambito,
                capa,
                start: { $lte: moment(hasta).toDate() },
                end: { $gte: moment(desde).toDate() },
                ...firstMatch
            }
        },
        {
            $unwind: '$estados',
        },
        {
            $match: {
                'estados.fecha': {
                    $lte: moment(hasta).toDate(),
                    $gte: moment(desde).toDate()
                },
                ...secondMatch
            }
        },
        {
            $addFields: {
                'estados.idCama': '$idCama',
                'estados.ambito': '$ambito',
                'estados.capa': '$capa',
            }
        },
        {
            $replaceRoot: {
                newRoot: '$estados'
            }
        },
        {
            $lookup: {
                from: 'internacionCamas',
                localField: 'idCama',
                foreignField: '_id',
                as: 'cama'

            }
        },
        {
            $replaceRoot: {
                newRoot: { $mergeObjects: ['$$ROOT', { $arrayElemAt: ['$cama', 0] }] }
            }
        },
        {
            $project: { cama: 0, __v: 0 }
        }
    ];

    return await CamaEstados.aggregate(aggregate);
}

export async function store({ organizacion, ambito, capa, cama }, estado, req: Request) {
    AuditDocument(estado, req.user);
    return await CamaEstados.update(
        {
            idOrganizacion: mongoose.Types.ObjectId(organizacion),
            ambito,
            capa,
            idCama: mongoose.Types.ObjectId(cama),
            start: { $lte: estado.fecha },
            end: { $gte: estado.fecha }
        },
        {
            $push: { estados: estado },
            $setOnInsert: {
                idOrganizacion: mongoose.Types.ObjectId(organizacion),
                ambito,
                capa,
                idCama: mongoose.Types.ObjectId(cama),
                start: moment(estado.fecha).startOf('month').toDate(),
                end: moment(estado.fecha).endOf('month').toDate(),
            }
        },
        {
            upsert: true
        }
    );
}

/**
 * Operación especial para modificar la fecha de un estado
 */

export async function patch({ organizacion, ambito, capa, cama }, from: Date, to: Date) {
    const result = await CamaEstados.update(
        {
            idOrganizacion: mongoose.Types.ObjectId(organizacion),
            ambito,
            capa,
            idCama: mongoose.Types.ObjectId(cama),
            start: { $lte: from },
            end: { $gte: from }

        },
        {
            $set: { 'estados.$[elemento].fecha': to }
        },
        {
            arrayFilters: [{ 'elemento.fecha': from }]
        }
    );
    return result.nModified > 0 && result.ok === 1;
}
