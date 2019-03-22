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

const facets = {
    solicitudesDestino: [
        { $group: {
            _id: '$solicitud.tipoPrestacion.conceptId',
            count: { $sum: 1 },
            nombre: { $first: '$solicitud.tipoPrestacion.term' }
        }}
    ],

    solicitudesOrigen: [
        { $group: {
            _id: '$solicitud.tipoPrestacionOrigen.conceptId',
            count: { $sum: 1 },
            nombre: { $first: '$solicitud.tipoPrestacionOrigen.term' }
        }}
    ],

    organizacionesEntrada: [
        { $group: {
            _id: '$solicitud.organizacionOrigen.id',
            count: { $sum: 1 },
            nombre: { $first: '$solicitud.organizacionOrigen.nombre'}
        }}
    ],

    organizacionesSalida: [
        { $group: {
            _id: '$solicitud.organizacion.id',
            count: { $sum: 1 },
            nombre: { $first: '$solicitud.organizacion.nombre'}
        }}
    ],

    profesionalesOrigen: [
        { $group: {
            _id: '$solicitud.profesionalOrigen.id',
            count: { $sum: 1 },
            nombre: {$addToSet: { $concat: ['$solicitud.profesionalOrigen.nombre', ' ', '$solicitud.profesionalOrigen.apellido'] }}
        }}
    ],

    profesionalesDestino: [
        { $group: {
            _id: '$solicitud.profesional.id',
            count: { $sum: 1 },
            nombre: {$addToSet: { $concat: ['$solicitud.profesional.nombre', ' ', '$solicitud.profesional.apellido'] }}
        }}
    ],

    estados: [
        { $addFields: {
            estado: { $arrayElemAt: ['$estados', -1] }
        }},
        { $group: {
            _id: '$estado.tipo',
            count: { $sum: 1 },
            nombre: {$first: '$estado.tipo'}
        }}
    ]
};


function makeFacet(condicion) {
    const facet: any = {};

    facet['estados'] = facets['estados'];
    facet['solicitudesOrigen'] = facets['solicitudesOrigen'];
    facet['solicitudesDestino'] = facets['solicitudesDestino'];
    facet['profesionalesOrigen'] = facets['profesionalesOrigen'];
    facet['profesionalesDestino'] = facets['profesionalesDestino'];

    if (condicion === 'entrada') {
        facet['organizaciones'] = facets['organizacionesEntrada'];
    }
    if (condicion === 'salida') {
        facet['organizaciones'] = facets['organizacionesSalida'];
    }
    return facet;
}

export async function dashboardSolicitudes(filtros, user) {
    const usuarioOrganizacion = user.organizacion;
    const matchSolicitudEntrada: any = {};
    const matchSolicitudSalida: any = {};
    const matchInicial: any = {};
    const matchFiltros: any = {};
    let matchEstados: any = {};

    matchInicial['estados.0.tipo'] = {
        $in: ['pendiente', 'auditoria']
    };

    matchSolicitudEntrada['solicitud.organizacion.id'] = new ObjectId(usuarioOrganizacion._id);
    matchSolicitudSalida['solicitud.organizacionOrigen.id'] = new ObjectId(usuarioOrganizacion._id);

    if (filtros.solicitudDesde && filtros.solicitudHasta) {
        let fechaCondicion = {
            $gte: moment(filtros.solicitudDesde).startOf('day').toDate(),
            $lte: moment(filtros.solicitudHasta).endOf('day').toDate()
        };
        matchInicial['solicitud.fecha'] = fechaCondicion;
    }

    if (filtros.organizaciones) {
        matchSolicitudEntrada['solicitud.organizacionOrigen.id'] = {
            $in: filtros.organizaciones.map(org => new ObjectId(org.id))
        };
        matchSolicitudSalida['solicitud.organizacion.id'] = {
            $in: filtros.organizaciones.map(org => new ObjectId(org.id))
        };
    }

    if (filtros.profesionalesDestino) {
        matchFiltros['solicitud.profesional.id'] = {
            $in: filtros.profesionalesDestino.map(pr => new ObjectId(pr.id))
        };
    }

    if (filtros.profesionalesOrigen) {
        matchFiltros['solicitud.profesionalOrigen.id'] = {
            $in: filtros.profesionalesOrigen.map(pr => new ObjectId(pr.id))
        };
    }

    if (filtros.solicitudesOrigen) {
        matchFiltros['solicitud.tipoPrestacionOrigen.conceptId'] = {
            $in: filtros.solicitudesOrigen.map(solic => solic.id)
        };
    }

    if (filtros.solicitudesDestino) {
        matchFiltros['solicitud.tipoPrestacion.conceptId'] = {
            $in: filtros.solicitudesDestino.map(solic => solic.id)
        };
    }

    if (filtros.estados) {
        matchEstados['ultimoEstado.tipo'] = {
            $in: filtros.estados
        };
    }

    let pipelineEntrada = [
        /* Filtros */
        { $match: matchInicial },
        { $match: matchSolicitudEntrada },
        { $match: matchFiltros },
        { $addFields: { ultimoEstado: { $arrayElemAt: ['$estados', -1] }}},
        { $match: matchEstados},
        { $facet: makeFacet('entrada') }
    ];
    let pipelineSalida = [
        /* Filtros */
        { $match: matchInicial },
        { $match: matchSolicitudSalida },
        { $match: matchFiltros },
        { $addFields: { ultimoEstado: { $arrayElemAt: ['$estados', -1] }}},
        { $match: matchEstados},
        { $facet: makeFacet('salida') }
    ];

    const dataEntrada = toArray(Prestacion.aggregate(pipelineEntrada).cursor({ batchSize: 1000 }).exec());
    const dataSalida = toArray(Prestacion.aggregate(pipelineSalida).cursor({ batchSize: 1000 }).exec());
    const [solicitudesEntrada, solicitudesSalida] = await Promise.all([dataEntrada, dataSalida]);
    return { entrada: solicitudesEntrada[0], salida: solicitudesSalida[0] };
}
