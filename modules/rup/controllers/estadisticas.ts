import { model as Prestacion } from '../schemas/prestacion';
import { toArray } from '../../../utils/utils';
import * as mongoose from 'mongoose';
import moment = require('moment');

const ObjectId = mongoose.Types.ObjectId;

export async function dashboard(org, prestaciones, desde, hasta) {
    const pipeline = [
        {
            $match: {
                'solicitud.organizacion.id': mongoose.Types.ObjectId(org),
                'solicitud.tipoPrestacion.conceptId': { $in: prestaciones },
                $and: [
                    { 'solicitud.fecha': { $lt: hasta } },
                    { 'solicitud.fecha': { $gt: desde } }
                ]
            }
        },
        {
            $addFields: {
                lastState: { $arrayElemAt: ['$estados', -1] },
                'paciente.edad': {
                    $divide: [{
                        $subtract: [
                            '$solicitud.fecha',
                            {
                                $cond: {
                                    if: { $eq: [{ $type: '$paciente.fechaNacimiento' }, 'string'] },
                                    then: { $dateFromString: { dateString: '$paciente.fechaNacimiento' } },
                                    else: '$paciente.fechaNacimiento'
                                }
                            }
                        ]
                    },
                        (365 * 24 * 60 * 60 * 1000)]
                }
            }
        },
        {
            $addFields: {
                'paciente.decada': { $trunc: { $divide: ['$paciente.edad', 10] } }
            }
        },
        {
            $match: {
                'lastState.tipo': 'validada'
            }
        },
        {
            $facet: {
                pacientes: [
                    {
                        $group: {
                            _id: { conceptid: '$solicitud.tipoPrestacion.conceptId', decada: '$paciente.decada', sexo: '$paciente.sexo' },
                            prestacion: { $last: '$solicitud.tipoPrestacion' },
                            count: { $sum: 1 }
                        }
                    }
                ],

                registros: [
                    {
                        $unwind: '$ejecucion.registros'
                    },
                    {
                        $project: {
                            _id: 0,
                            id: '$ejecucion.registros._id',
                            concepto: '$ejecucion.registros.concepto',
                            relacionado: '$ejecucion.registros.relacionadoCon',
                            prestacion: '$solicitud.tipoPrestacion',
                        }
                    },
                    {
                        $group: {
                            _id: '$concepto.conceptId',
                            count: { $sum: 1 },
                            concepto: { $last: '$concepto' },
                            prestaciones: { $push: '$prestacion' },
                            ids: { $push: '$id' },
                            relacionado: { $push: '$relacionado' },
                        }
                    },
                    {
                        $addFields: {
                            relaciones: {
                                $reduce: {
                                    input: '$relacionado',
                                    initialValue: [],
                                    in: { $concatArrays: ['$$value', '$$this'] }
                                }
                            }
                        }
                    },
                    {
                        $sort: { count: -1 }
                    }
                ]

            }

        }
    ];

    const aggr = Prestacion.aggregate(pipeline);
    const data = await toArray(aggr.cursor({}).exec());
    return data[0];
}

export async function dashboardSolicitudes(filtros) {
    const matchSolicitudEntrada: any = {};
    const matchSolicitudSalida: any = {};
    // console.log('filtros -> ', filtros)
    if (filtros.organizacion) {
        // filtro todas las solicitudes de entrada
        // las que se van a realizar en la organizacion donde estoy parado
        matchSolicitudEntrada['solicitud.organizacion.id'] = new ObjectId(filtros.organizacion);
    }

    if (filtros.solicitudDesde && filtros.solicitudHasta) {
        matchSolicitudEntrada['solicitud.fecha'] = {
            $gte: moment(filtros.solicitudDesde).startOf('day').toDate(),
            $lte: moment(filtros.solicitudHasta).endOf('day').toDate()
        };
    }

    let pipeline = [
        /* Filtros iniciales */
        { $match: matchSolicitudEntrada },
        { $sort: {'solicitud.fecha': 1}}
    ];
    return await toArray(Prestacion.aggregate(pipeline).cursor({ batchSize: 1000 }).exec());
}
