import * as mongoose from 'mongoose';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { SnomedCtr } from '../../../core/term/controller/snomed.controller';
import { Prestacion } from '../schemas/prestacion';
import moment = require('moment');

const ObjectId = mongoose.Types.ObjectId;

export async function estadisticaDemografica(ids) {
    ids = ids.map(ObjectId);
    const sub = {
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
    };
    const pipeline = [
        {
            $match: {
                _id: { $in: ids },
            }
        },
        {
            $addFields: {
                lastState: { $arrayElemAt: ['$estados', -1] },
                'paciente.edad': {
                    $divide: [sub, (365 * 24 * 60 * 60 * 1000)]
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
                demografia: [
                    {
                        $group: {
                            _id: { decada: '$paciente.decada', sexo: '$paciente.sexo' },
                            count: { $sum: 1 }
                        }
                    }
                ],

                pacientes: [
                    {
                        $project: {
                            _id: '$paciente.id',
                            id: '$paciente.id',
                        }
                    },
                ]

            }

        }
    ];


    const data = await Prestacion.aggregate(pipeline);

    const { pacientes, demografia } = data[0];
    const idPacientes = pacientes.map(paciente => ObjectId(paciente._id));

    const andes = await PacienteCtr.search({ ids: idPacientes }, { fields: 'direccion' });

    function getLocalidad(direccion) {
        if (direccion && direccion.ubicacion && direccion.ubicacion.localidad) {
            return direccion.ubicacion.localidad.nombre;
        }
        return null;
    }

    const ubicacionesPaciente = {};
    andes.forEach((paciente) => { ubicacionesPaciente[paciente._id] = getLocalidad(paciente.direccion[0]); });
    const respuesta = {};

    pacientes.forEach((paciente) => {
        const nombre = ubicacionesPaciente[paciente._id] || 'sin localidad';
        if (!respuesta[nombre]) {
            respuesta[nombre] = 0;
        }
        respuesta[nombre]++;
    });

    return { demografia: demografia.map(i => { return { count: i.count, decada: i._id.decada, sexo: i._id.sexo }; }), localidades: respuesta };
}

export async function dashboard(org, prestaciones, desde, hasta) {
    const sub = {
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
    };
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
                    $divide: [sub, (365 * 24 * 60 * 60 * 1000)]
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
                            id: '$ejecucion.registros._id',
                            concepto: '$ejecucion.registros.concepto',
                            relacionado: '$ejecucion.registros.relacionadoCon',
                            prestacion: '$solicitud.tipoPrestacion',
                        }
                    },
                    {
                        $addFields: {
                            'prestacion.prestacion_id': '$_id'
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
                        $project: {
                            count: 1,
                            concepto: 1,
                            prestaciones: 1,
                            ids: 1,
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
    const data = await Prestacion.aggregate(pipeline);
    const { pacientes, registros } = data[0];

    // Obtengo el listado de concepto y busco su metadata
    const concepts = registros.map(e => e.concepto.conceptId);
    const conceptos = await SnomedCtr.getConcepts(concepts);

    return { pacientes, registros, metadata: conceptos };
}

const facets = {
    solicitudesDestino: [
        {
            $group: {
                _id: '$solicitud.tipoPrestacion.conceptId',
                count: { $sum: 1 },
                nombre: { $first: '$solicitud.tipoPrestacion.term' }
            }
        },
        { $sort: { count: -1 } }
    ],

    solicitudesOrigen: [
        {
            $group: {
                _id: '$solicitud.tipoPrestacionOrigen.conceptId',
                count: { $sum: 1 },
                nombre: { $first: '$solicitud.tipoPrestacionOrigen.term' }
            }
        },
        { $sort: { count: -1 } }
    ],

    organizacionesEntrada: [
        {
            $group: {
                _id: '$solicitud.organizacionOrigen.id',
                count: { $sum: 1 },
                nombre: { $first: '$solicitud.organizacionOrigen.nombre' }
            }
        }
    ],

    organizacionesSalida: [
        {
            $group: {
                _id: '$solicitud.organizacion.id',
                count: { $sum: 1 },
                nombre: { $first: '$solicitud.organizacion.nombre' }
            }
        },
        { $sort: { count: -1 } }
    ],

    profesionalesOrigen: [
        {
            $group: {
                _id: '$solicitud.profesionalOrigen.id',
                count: { $sum: 1 },
                nombre: { $addToSet: { $concat: ['$solicitud.profesionalOrigen.nombre', ' ', '$solicitud.profesionalOrigen.apellido'] } }
            }
        },
        { $sort: { count: -1 } }
    ],

    profesionalesDestino: [
        {
            $group: {
                _id: '$solicitud.profesional.id',
                count: { $sum: 1 },
                nombre: { $addToSet: { $concat: ['$solicitud.profesional.nombre', ' ', '$solicitud.profesional.apellido'] } }
            }
        },
        { $sort: { count: -1 } }
    ],

    estados: [
        {
            $addFields: {
                estado: { $arrayElemAt: ['$estados', -1] }
            }
        },
        {
            $group: {
                _id: '$estado.tipo',
                count: { $sum: 1 },
                nombre: { $first: '$estado.tipo' }
            }
        }
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
    const matchSolicitudEntrada: any = {};
    const matchSolicitudSalida: any = {};
    const matchInicial: any = { inicio: 'top' };
    const matchFiltros: any = {};
    const matchEstados: any = {};

    /* Match inicial para filtrar solicitudes
       según la organización del usuario logueado */
    const usuarioOrganizacion = user.organizacion;
    matchSolicitudEntrada['solicitud.organizacion.id'] = new ObjectId(usuarioOrganizacion._id);
    matchSolicitudSalida['solicitud.organizacionOrigen.id'] = new ObjectId(usuarioOrganizacion._id);

    if (filtros.solicitudDesde && filtros.solicitudHasta) {
        const fechaCondicion = {
            $gte: moment(filtros.solicitudDesde).startOf('day').toDate(),
            $lte: moment(filtros.solicitudHasta).endOf('day').toDate()
        };
        matchInicial['createdAt'] = fechaCondicion;
    }

    /* Filtro por organización destino */
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
        if (filtros.estados.length === 1 && filtros.estados[0] === 'pendiente') {
            matchFiltros['solicitud.turno'] = { $eq: null };
        }
        matchFiltros['estadoActual.tipo'] = {
            $in: filtros.estados
        };
    }

    const pipelineEntrada = [
        /* Filtros */
        { $match: matchInicial },
        { $match: matchSolicitudEntrada },
        { $match: matchFiltros },
        { $facet: makeFacet('entrada') }
    ];
    const pipelineSalida = [
        /* Filtros */
        { $match: matchInicial },
        { $match: matchSolicitudSalida },
        { $match: matchFiltros },
        { $facet: makeFacet('salida') }
    ];

    const dataEntrada = Prestacion.aggregate(pipelineEntrada);
    const dataSalida = Prestacion.aggregate(pipelineSalida);
    const [solicitudesEntrada, solicitudesSalida] = await Promise.all([dataEntrada, dataSalida]);
    return { entrada: solicitudesEntrada[0], salida: solicitudesSalida[0] };
}
