import { Prestacion } from '../modules/rup/schemas/prestacion';
import { CacheVacunasAreaPrograma } from '../modules/vacunas/schemas/cache-vacunas-areaPrograma.schema';
import { toArray } from './../utils/utils';


async function run(done) {

    try {
        const pipelineZonas = [
            {
                $match: {
                    'tags.vacunasCovid': true,
                    'estadoActual.tipo': 'validada',
                    'ejecucion.fecha': { $gt: new Date('2020-12-27T00:00:00.000-03:00') } // Fecha inicial de la vacunación
                }
            },
            {
                $unwind: '$ejecucion.registros'
            },
            {
                $match: {
                    'ejecucion.registros.valor.vacuna.dosis.nombre': { $regex: /1ra/ }, // Pidieron que por ahora sea primera dosis
                    'ejecucion.registros.concepto.conceptId': '840534001'
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

            {
                $lookup: {
                    from: 'area-programa-provincial',
                    localField: 'organizacionCompleta.direccion.ubicacion.localidad._id',
                    foreignField: 'idLocalidad',
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
                        idZona: '$organizacionCompleta.zonaSanitaria._id', nombreLocalidad: '$organizacionCompleta.direccion.ubicacion.localidad.nombre'
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
                    rango: '$_id.range', zona: '$_id.nombreZona', idZona: '$_id.idZona', localidad: '$_id.nombreLocalidad', vacunados: '$cnt',
                    areaPrograma: '$nombreArea.area.nombre', _id: 0, key: { $concat: ['$_id.range', '-', '$nombreArea.area.nombre'] },
                }
            },
            { $sort: { zona: 1 } }
        ];

        const resultado = Prestacion.aggregate(pipelineZonas).allowDiskUse(true).cursor({}).exec();
        const resultados = await toArray(resultado);
        for (const res of resultados) {
            const cache: any = await CacheVacunasAreaPrograma.findOne({ key: res.key }).exec();
            if (cache) {
                const $set: any = {
                    vacunados: res.vacunados
                };
                await CacheVacunasAreaPrograma.update(
                    { _id: cache._id },
                    { $set }
                );
            } else {
                res.poblacionObjetivo = 0;
                await CacheVacunasAreaPrograma.create(res);
            }
        }

    } catch (err) {
        return err;
    }
    done();
}

export = run;
