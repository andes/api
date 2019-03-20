import * as AgendarModel from '../schemas/agenda';
import { toArray } from '../../../utils/utils';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

const ObjectId = mongoose.Types.ObjectId;

const turnoAsignadoMatch = {
    $match: {
        'turno.paciente.nombre': { $exists: true },
        'turno.estado': 'asignado',
        estado: { $ne: 'suspendida' }
    }
};

const facets = {
    edad: [
        turnoAsignadoMatch,
        {
            $bucket: {
                groupBy: '$turno.paciente.edad',
                boundaries: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
                default: 0,
                output: {
                    count: { $sum: 1 }
                }
            }
        }
    ],

    sexo: [
        turnoAsignadoMatch,
        {
            $group: {
                _id: '$turno.paciente.sexo',
                total: { $sum: 1 }
            }
        }
    ],

    profesionales: [
        turnoAsignadoMatch,
        { $unwind: '$profesionales' },
        {
            $group: {
                _id: '$profesionales._id',
                total: { $sum: 1 },
                nombre: { $first: '$profesionales.nombre' },
                apellido: { $first: '$profesionales.apellido' }
            }
        }
    ],


    administrativo: [
        turnoAsignadoMatch,
        {
            $group: {
                _id: '$turno.updatedBy.username',
                total: { $sum: 1 },
                nombre: { $first: '$turno.updatedBy.nombre' },
                apellido: { $first: '$turno.updatedBy.apellido' }
            }
        }
    ],

    prestacion: [
        turnoAsignadoMatch,
        {
            $group: {
                _id: '$turno.tipoPrestacion.conceptId',
                total: { $sum: 1 },
                nombre: { $first: '$turno.tipoPrestacion.term' }
            }
        }
    ],

    estadoTurno: [
        { $match: { 'turno.estado': { $ne: 'turnoDoble' } } },
        {
            $addFields: {
                'real-state': {
                    $cond: {
                        if: { $eq: ['$estado', 'suspendida'] },
                        then: { $cond: { if: { $ne: ['$turno.reasignado.siguiente', null] }, then: 'reasignado', else: 'suspendida' } },
                        else: '$turno.estado'
                    }
                }
            }
        },
        { $sortByCount: '$real-state' }
    ]
};

function makePrimaryMatch(filtros) {
    const match: any = {
        estado: { $nin: ['planificacion', 'pausada', 'borrada'] }
    };

    if (filtros.fechaDesde) {
        match.horaInicio = { $gte: moment(filtros.fechaDesde).startOf('day').toDate() };
    }

    if (filtros.fechaHasta) {
        match.horaFin = { $lte: moment(filtros.fechaHasta).endOf('day').toDate() };
    }

    if (filtros.organizacion) {
        match['organizacion._id'] = ObjectId(filtros.organizacion);
    }

    return match;
}

function makeSecondaryMatch(filtros) {
    const match: any = {};

    if (filtros.edad) {
        const ages = filtros.edad.split('-');
        match['turno.paciente.edad'] = {
            $gte: parseInt(ages[0], 10)
        };
        match['turno.paciente.edad'] = {
            $lt: parseInt(ages[1], 10)
        };
    }

    if (filtros.sexo) {
        match['turno.paciente.sexo'] = filtros.sexo;
    }

    if (filtros.profesional) {
        match['profesionales._id'] = ObjectId(filtros.profesional);
    }

    if (filtros.administrativo) {
        match['turno.updatedBy.username'] = parseInt(filtros.administrativo, 10);
    }

    if (filtros.prestacion) {
        match['turno.tipoPrestacion.conceptId'] = filtros.prestacion;
    }

    return match;
}

function makeFacet(filtros) {
    const facet: any = {};

    if (!filtros.edad) {
        facet['edad'] = facets['edad'];
    }

    if (!filtros.sexo) {
        facet['sexo'] = facets['sexo'];
    }

    if (!filtros.profesional) {
        facet['profesionales'] = facets['profesionales'];
    }

    if (!filtros.administrativo) {
        facet['administrativo'] = facets['administrativo'];
    }

    if (!filtros.prestacion) {
        facet['prestacion'] = facets['prestacion'];
    }

    facet['estado_turno'] = facets.estadoTurno;

    return facet;
}

export async function estadisticas(filtros) {
    const pipeline = [
        /* Filtros iniciales */
        {
            $match: makePrimaryMatch(filtros)
        },
        { $unwind: '$bloques' },
        { $addFields: { 'sobreturnos.sobreturno': true } },
        {
            $project: {
                turno: { $concatArrays: ['$sobreturnos', '$bloques.turnos'] },
                profesionales: 1,
                prestaciones: '$bloques.tipoPrestaciones',
                estado: '$estado'
            },
        },
        { $unwind: '$turno' },

        // Turnos asignados por el momento
        // { $match: { 'turno.paciente.nombre': { $exists: true }, 'turno.estado': 'asignado' } },

        // Agregamos la edad del paciente cuando tomo el turno

        {
            $addFields: {
                'turno.paciente.edad': {
                    $divide: [{
                        $subtract: [
                            '$turno.horaInicio',
                            {
                                $cond: {
                                    if: { $eq: [{ $type: '$turno.paciente.fechaNacimiento' }, 'string'] },
                                    then: { $dateFromString: { dateString: '$turno.paciente.fechaNacimiento' } },
                                    else: '$turno.paciente.fechaNacimiento'
                                }
                            }
                        ]
                    }, (365 * 24 * 60 * 60 * 1000)]
                }
            }
        },
        { $match: makeSecondaryMatch(filtros) },
        {
            $facet: makeFacet(filtros)
        }
    ];

    const agr = AgendarModel.aggregate(pipeline).cursor({ batchSize: 1000 }).exec();
    return await toArray(agr);
}
