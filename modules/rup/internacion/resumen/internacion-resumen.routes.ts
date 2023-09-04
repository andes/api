import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../../auth/auth.class';
import { IInternacionResumen, IInternacionResumenDoc, InternacionResumen } from './internacion-resumen.schema';
import * as mongoose from 'mongoose';
import moment = require('moment');

class InternacionResumenController extends ResourceBase<IInternacionResumenDoc> {
    Model = InternacionResumen;
    resourceName = 'internacion-resumen';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        organizacion: {
            field: 'organizacion.id',
            fn: MongoQuery.matchString
        },
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.matchString
        },
        ingreso: MongoQuery.matchDate.withField('fechaIngreso'),
        egreso: MongoQuery.matchDate.withField('fechaEgreso'),
        idPrestacion: {
            field: 'idPrestacion',
            fn: MongoQuery.equalMatch
        }
    };

    async presearch() {
        return { deletedAt: { $exists: false } };
    }

    async populate(data: IInternacionResumen) {
        const registros = data.ingreso?.registros || [];
        const concepto = deepSearch(registros);
        if (concepto) {
            switch (concepto.valor.conceptId) {
                case '394848005':
                    data.prioridad = { id: 1, label: 'BAJA', type: 'success' };
                    break;
                case '1331000246106':
                    data.prioridad = { id: 50, label: 'MEDIA', type: 'warning' };
                    break;
                case '394849002':
                    data.prioridad = { id: 100, label: 'ALTA', type: 'danger' };
                    break;
            }
        }
        return data;
    }
}

export const InternacionResumenCtr = new InternacionResumenController({});
export const InternacionResumenRouter = InternacionResumenCtr.makeRoutes();

InternacionResumenRouter.get('/listado-internacion', Auth.authenticate(), async (req, res, next) => {
    let pipeline = [];
    const match = {};
    if (req.query.ingreso) {
        const [ingresoDesde, ingresoHasta] = req.query.ingreso.split('|');
        match['fechaIngreso'] = {
            $gte: moment(ingresoDesde).startOf('day').toDate(),
            $lte: moment(ingresoHasta).endOf('day').toDate()
        };
    }
    if (req.query.egreso) {
        const [egresoDesde, egresoHasta] = req.query.ingreso.split('|');
        match['fechaEgreso'] = {
            $gte: moment(egresoDesde).startOf('day').toDate(),
            $lte: moment(egresoHasta).endOf('day').toDate()
        };
    }

    match['organizacion.id'] = mongoose.Types.ObjectId(req.query.idOrganizacion);
    pipeline = [
        {
            $match: match
        },
        {
            $lookup: {
                from: 'internacionCamaEstados',
                localField: '_id',
                foreignField: 'estados.idInternacion',
                as: 'estadosCama'
            }
        },
        {
            $lookup: {
                from: 'internacionSalaComunMovimientos',
                localField: '_id',
                foreignField: 'idInternacion',
                as: 'estadosSala'
            }
        },
        {
            $addFields: {
                estadosSala: {
                    $cond: {
                        if: { $gt: [{ $size: '$estadosSala' }, 0] },
                        then: { $arrayElemAt: ['$estadosSala', -1] },
                        else: '$$REMOVE'
                    }
                }
            }
        },
        {
            $unwind: {
                path: '$estadosCama',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                estadosCama: { $arrayElemAt: ['$estadosCama.estados', -1] }
            }
        },
        {
            $addFields: {
                estadosCama: {
                    $cond: {
                        if: { $eq: ['$estadosCama', null] },
                        then: '$$REMOVE',
                        else: '$estadosCama'
                    }
                }
            }
        },
        {
            $match: {
                $or: [
                    { 'estadosCama.extras.ingreso': true },
                    { 'estadosCama.extras.egreso': true },
                    { 'estadosSala.extras.ingreso': true },
                    { 'estadosSala.extras.egreso': true }
                ]
            }
        },
        {
            $lookup: {
                from: 'prestaciones',
                localField: 'idPrestacion',
                foreignField: '_id',
                as: 'idPrestacion'
            }
        },
        {
            $unwind: {
                path: '$idPrestacion',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                idPrestacion: {
                    $mergeObjects: [
                        '$idPrestacion',
                        { id: '$idPrestacion._id' }
                    ]
                }
            }
        }
    ];
    const listado = await InternacionResumen.aggregate(pipeline);
    return res.json(listado);
});


function deepSearch(registros: any[]) {
    for (let i = 0; i < registros.length; i++) {
        if (registros[i].concepto.conceptId === '225390008') {
            return registros[i];
        } else {
            const reg = deepSearch(registros[i].registros);
            if (reg) {
                return reg;
            }
        }
    }
    return null;
}
