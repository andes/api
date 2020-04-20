import * as mongoose from 'mongoose';
import moment = require('moment');
import { CamaEstados } from './cama-estados.schema';
import { ObjectId } from '@andes/core';
import { Request } from '@andes/api-tool';
import { AuditDocument } from '@andes/mongoose-plugin-audit';

export async function snapshotEstados({ fecha, organizacion, ambito, capa }, filtros) {
    const fechaSeleccionada = moment(fecha).toDate();
    const firstMatch = {};
    const secondMatch = {};
    if (filtros.cama) {
        firstMatch['idCama'] = mongoose.Types.ObjectId(filtros.cama);
    }

    if (filtros.paciente) {
        secondMatch['paciente.id'] = mongoose.Types.ObjectId(filtros.paciente);
    }

    if (filtros.internacion) {
        secondMatch['$or'] = [
            { idInternacion: wrapObjectId(filtros.internacion) },
            { 'extras.idInternacion': wrapObjectId(filtros.internacion) }
        ];
    }

    if (filtros.estado) {
        secondMatch['estado'] = filtros.estado;
    }

    const aggregate = [
        {
            $match: {
                idOrganizacion: mongoose.Types.ObjectId(organizacion),
                ambito,
                capa,
                start: { $lte: fechaSeleccionada },
                ...firstMatch
            }
        },
        {
            $unwind: '$estados',
        },
        {
            $match: {
                'estados.esMovimiento': true,
                'estados.fecha': { $lte: fechaSeleccionada }
            }
        },
        {
            $group: {
                _id: '$idCama',
                fechaMax: {
                    $max: '$estados.fecha'
                },
                ambito: { $first: '$ambito' },
                capa: { $first: '$capa' },
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
                            $or: [
                                {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$idCama', '$$idCama'] },
                                            { $lte: ['$start', '$$fechaMax'] },
                                            { $gte: ['$end', '$$fechaMax'] }
                                        ]
                                    },
                                },
                                {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$idCama', '$$idCama'] },
                                            { $lte: ['$start', fechaSeleccionada] },
                                            { $gte: ['$end', fechaSeleccionada] }
                                        ]
                                    },
                                }
                            ]
                        }
                    },
                    {
                        $unwind: '$estados',
                    },
                    {
                        $match: {
                            $expr: {
                                $gte: ['$estados.fecha', '$$fechaMax'],
                            },
                            'estados.fecha': { $lte: fechaSeleccionada }
                        }
                    },
                    {
                        $sort: { 'estados.fecha': 1, 'estados.createdAt': 1 }
                    },
                    {
                        $replaceRoot: { newRoot: '$estados' }
                    },
                    {
                        $group: {
                            _id: null,
                            mergedObject: { $mergeObjects: '$$ROOT' }
                        }
                    },
                    {
                        $replaceRoot: { newRoot: '$mergedObject' }
                    }
                    // {
                    //     $limit: 1
                    // }
                ],
                as: 'estado'
            }
        },
        {
            $unwind: '$estado'
        },
        {
            $addFields: {
                'estado.idCama': '$_id',
                'estado.ambito': '$ambito',
                'estado.capa': '$capa',
            }
        },
        {
            $replaceRoot: {
                newRoot: '$estado'
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

    /**
     * Estado de la cama
     */
    estado: string;

    /**
     * Filtra estados que significan un movimiento en la cama y/o internación
     */
    esMovimiento: boolean;

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
        secondMatch['$or'] = [
            { 'estados.idInternacion': wrapObjectId(filtros.internacion) },
            { 'estados.extras.idInternacion': wrapObjectId(filtros.internacion) }
        ];
    }

    if (filtros.estado) {
        secondMatch['estados.estado'] = filtros.estado;
    }

    if (filtros.esMovimiento !== undefined && filtros.esMovimiento !== null) {
        secondMatch['estados.esMovimiento'] = filtros.esMovimiento;
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

    const movimientos = await CamaEstados.aggregate(aggregate);

    if (filtros.esMovimiento === undefined || filtros.esMovimiento === null) {
        const movSorted = movimientos.sort(sortByCamaDate);
        movSorted.forEach(rellenarMovimientos);
        return movSorted;
    }
    return movimientos;
}

function sortByCamaDate(movA, movB) {
    const idA = String(movA.idCama);
    const idB = String(movB.idCama);
    if (idA === idB) {
        return movA.fecha.getTime() - movB.fecha.getTime();
    }
    return idA.localeCompare(idB);
}

function rellenarMovimientos(value, index, movs) {
    if (index === 0) { return; }
    const idPrevio = String(movs[index - 1].idCama);
    const ID = String(value.idCama);
    if (idPrevio !== ID) { return; }
    if (!value.esMovimiento) {
        movs[index] = { ...movs[index - 1], ...value };
    }
    return;
}

export async function store({ organizacion, ambito, capa, cama }, estado, req: Request) {
    delete estado['createdAt'];
    delete estado['createdBy'];
    delete estado['updatedAt'];
    delete estado['updatedBy'];
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

export async function remove({ organizacion, ambito, capa, cama }, date: Date, ) {
    const result = await CamaEstados.update(
        {
            idOrganizacion: mongoose.Types.ObjectId(organizacion),
            ambito,
            capa,
            idCama: mongoose.Types.ObjectId(cama),
            start: { $lte: date },
            end: { $gte: date }

        },
        {
            $pull: { estados: { fecha: date } }
        }
    );
    return result.nModified > 0 && result.ok === 1;
}
