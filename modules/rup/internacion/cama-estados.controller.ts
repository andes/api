import { Request } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import { AuditDocument } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { CamaEstados } from './cama-estados.schema';
import moment = require('moment');

export async function snapshotEstados({ fecha, organizacion, ambito, capa }, filtros) {
    const fechaSeleccionada = moment(fecha).toDate();
    const firstMatch = {};
    const secondMatch = {};
    const thirdMatch = {};
    const ambitoMatch = {};
    if (filtros.cama) {
        firstMatch['idCama'] = mongoose.Types.ObjectId(filtros.cama);
    }

    if (filtros.paciente) {
        secondMatch['paciente.id'] = mongoose.Types.ObjectId(filtros.paciente);
    }
    if (ambito) {
        ambitoMatch['ambito'] = ambito;
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

    if (filtros.sector) {
        thirdMatch['sectores._id'] = mongoose.Types.ObjectId(filtros.sector);
    }

    const aggregate: any[] = [
        {
            $match: {
                idOrganizacion: mongoose.Types.ObjectId(organizacion),
                capa,
                start: { $lte: fechaSeleccionada },
                ...firstMatch,

            }
        },
        {
            $match: ambitoMatch
        },
        {
            $unwind: '$estados',
        },
        {
            $match: {
                'estados.deletedAt': { $exists: false },
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
                        },
                    },
                    {
                        $match: ambitoMatch
                    },
                    {
                        $unwind: '$estados',
                    },
                    {
                        $match: {
                            'estados.deletedAt': { $exists: false },
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
                'estado.id': '$_id',
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
                let: {
                    id: '$idCama',
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$_id', '$$id'] },
                                ]
                            }
                        }
                    },
                    { $project: { createdAt: 0, createdBy: 0 } }
                ],
                as: 'cama'
            }
        },
        {
            $replaceRoot: {
                newRoot: { $mergeObjects: ['$$ROOT', { $arrayElemAt: ['$cama', 0] }] }
            }
        },

        {
            $match: thirdMatch
        },
        {
            $project: { cama: 0, __v: 0, }
        }
    ];

    if (ambito === 'guardia') {
        aggregate.push({
            $lookup: {
                from: 'internacionPacienteResumen',
                localField: 'idInternacion',
                foreignField: '_id',
                as: 'estado_internacion'
            }
        });
        aggregate.push({ $unwind: { path: '$estado_internacion', preserveNullAndEmptyArrays: true } });
        aggregate.push({
            $addFields: {
                fechaIngreso: '$estado_internacion.fechaIngreso',
                fechaAtencion: '$estado_internacion.fechaAtencion',
                prioridad: '$estado_internacion.prioridad',
            }
        });
    }

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
     * ID del movimiento (string o ObjectId)
     */
    movimiento: ObjectId;

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
    const ambitoMatch={};

    if (filtros.cama) {
        firstMatch['idCama'] = wrapObjectId(filtros.cama);
    }

    if (ambito) {
        ambitoMatch['ambito'] = ambito;
    }

    if (filtros.movimiento) {
        firstMatch['estados.extras.idMovimiento'] = filtros.movimiento;
        secondMatch['estados.extras.idMovimiento'] = filtros.movimiento;
    }

    if (filtros.paciente) {
        secondMatch['estados.paciente.id'] = wrapObjectId(filtros.paciente);
    }

    if (filtros.internacion) {
        firstMatch['$or'] = [
            { 'estados.idInternacion': wrapObjectId(filtros.internacion) },
            { 'estados.extras.idInternacion': wrapObjectId(filtros.internacion) }
        ];
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
                capa,
                start: { $lte: moment(hasta).toDate() },
                end: { $gte: moment(desde).toDate() },
                ...firstMatch
            }
        },
        {
            $match: ambitoMatch
        },
        {
            $unwind: '$estados',
        },
        {
            $match: {
                'estados.deletedAt': { $exists: false },
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
            $project: { 'cama.createdAt': 0, 'cama.createdBy': 0 }
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
    delete estado['deletedAt'];
    delete estado['deletedBy'];
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

export async function remove({ organizacion, ambito, capa, cama }, date: Date) {
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

/**
 * Operación especial para borrar un estado logicamente
*/
export async function deshacerEstadoCama({ organizacion, ambito, capa, cama }, date: Date, user) {
    date = moment(date).toDate();
    const result = await CamaEstados.update(
        {
            idOrganizacion: wrapObjectId(organizacion),
            ambito,
            capa,
            idCama: wrapObjectId(cama),
            start: { $lte: date },
            end: { $gte: date }

        },
        {
            $set: {
                'estados.$[elemento].deletedAt': moment().toDate(),
                'estados.$[elemento].deletedBy': user,
            }
        },
        {
            arrayFilters: [{
                'elemento.fecha': date,
            }]
        }
    );
    return result.nModified > 0 && result.ok === 1;
}
