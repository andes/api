import { toArray } from '../utils/utils';
import { Prestacion } from '../modules/rup/schemas/prestacion';


async function run(done) {
    const pipelineZonas = [
        {
            $match: {
                'tags.vacunasCovid': true,
                'estadoActual.tipo': 'validada',
                // $and: [
                //     {
                //         'ejecucion.fecha': { $gte: new Date('2021-06-01T23:00:03.707-03:00') }
                //     },
                //     {
                //         'ejecucion.fecha': { $lte: new Date('2021-06-30T23:00:03.707-03:00') }
                //     }
                // ]
            }
        },
        {
            $addFields: {
                edad: {
                    $toInt: {
                        $divide: [{
                            $subtract: [new Date(),
                            { $ifNull: ['$paciente.fechaNacimiento', new Date()] }]
                        },
                        { $multiply: [1000, 86400, 365] }]
                    }
                }
            }
        },
        {
            $lookup: {
                from: 'organizacion',
                localField: 'solicitud.organizacion.id',
                foreignField: '_id',
                as: 'organizacionCompleta'
            }
        },
        {
            $addFields: {
                organizacionCompleta: {
                    $arrayElemAt: [
                        '$organizacionCompleta',
                        0
                    ]
                }
            }
        },
        // Este lookup deberia hacerse por el id de la localidad para evitar problemas de diferencias en los nombres ej: NEUQUEN, neuquen
        {
            $lookup: {
                from: 'area-programa-provincial',
                localField: 'organizacionCompleta.direccion.ubicacion.localidad.nombre',
                foreignField: 'nombre',
                as: 'areaPrograma'
            }
        },
        {
            $addFields: {
                areaPrograma: {
                    $arrayElemAt: [
                        '$areaPrograma',
                        0
                    ]
                }
            }
        },
        {
            $project: {
                range: {
                    $concat: [
                        { $cond: [{ $and: [{ $gte: ['$edad', 0] }, { $lte: ['$edad', 4] }] }, '0 a 4 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 5] }, { $lte: ['$edad', 9] }] }, '5 a 9 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 10] }, { $lte: ['$edad', 14] }] }, '10 a 14 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 15] }, { $lte: ['$edad', 17] }] }, '15 a 17 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 18] }, { $lte: ['$edad', 19] }] }, '18 a 19 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 20] }, { $lte: ['$edad', 24] }] }, '20 a 24 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 25] }, { $lte: ['$edad', 29] }] }, '25 a 29 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 30] }, { $lte: ['$edad', 34] }] }, '30 a 34 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 35] }, { $lte: ['$edad', 39] }] }, '35 a 39 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 40] }, { $lte: ['$edad', 44] }] }, '40 a 44 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 45] }, { $lte: ['$edad', 49] }] }, '45 a 49 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 50] }, { $lte: ['$edad', 54] }] }, '50 a 54 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 55] }, { $lte: ['$edad', 59] }] }, '55 a 59 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 60] }, { $lte: ['$edad', 64] }] }, '60 a 64 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 65] }, { $lte: ['$edad', 69] }] }, '65 a 69 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 70] }, { $lte: ['$edad', 74] }] }, '70 a 74 Años', ''] },
                        { $cond: [{ $and: [{ $gte: ['$edad', 75] }, { $lte: ['$edad', 79] }] }, '75 a 79 Años', ''] },
                        { $cond: [{ $gte: ['$edad', 80] }, 'Mayor de 80 Años', ''] }
                    ]
                },
                organizacionCompleta: 1,
                areaPrograma: 1
            }
        },
        {
            $group: {
                _id: {
                    range: '$range', nombreZona: '$organizacionCompleta.zonaSanitaria.nombre',
                    nombreLocalidad: '$organizacionCompleta.direccion.ubicacion.localidad.nombre'
                },
                areaPrograma: {
                    $push: {
                        area: '$areaPrograma'
                    }
                },
                cnt: { $sum: 1 }
            }
        },
        {
            $addFields: {
                nombreArea: {
                    $arrayElemAt: [
                        '$areaPrograma',
                        0
                    ]
                }
            }
        },
        {
            $project: {
                rango: '$_id.range', zona: '$_id.nombreZona', localidad: '$_id.nombreLocalidad', vacunados: '$cnt',
                areaPrograma: '$nombreArea.area.nombre', _id: 0
            }
        },
        { $sort: { zona: 1 } }
    ];

    const resultado = await toArray(Prestacion.aggregate(pipelineZonas).cursor({}).exec());
    console.log('resultado ', resultado);
    done();
}

export = run;
