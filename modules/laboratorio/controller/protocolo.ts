import * as mongoose from 'mongoose';
import { model as prestacion } from '../../../modules/rup/schemas/prestacion';
import { toArray } from '../../../utils/utils';

export async function getUltimoNumeroProtocolo(idOrganizacion) {

    let pipeline = [
        {
            $match: {
                $and: [
                    {
                        'solicitud.organizacion.id': { $eq: mongoose.Types.ObjectId(idOrganizacion) },
                        'solicitud.tipoPrestacion.conceptId': '15220000'
                    }]
            }
        },
        {
            $unwind: '$solicitud'
        },
        {
            $unwind: '$solicitud.registros'
        },
        { $match: { 'solicitud.registros.valor.solicitudPrestacion.numeroProtocolo': { $exists: true } } },
        { $sort: { 'solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numero': -1 } },
        {
            $project: {

                solicitudPrestacion: '$solicitud.registros.valor.solicitudPrestacion',
            }
        },
        {
            $group: {
                _id: null,
                first: { $first: "$$ROOT" }
            }
        }
    ];

    let resultados = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());

    let ultimoNumero;
    if (resultados[0] && resultados[0].first.solicitudPrestacion && resultados[0].first.solicitudPrestacion.numeroProtocolo) {
        ultimoNumero = resultados[0].first.solicitudPrestacion.numeroProtocolo.numero;
    } else {
        ultimoNumero = 0;
    }
    return parseInt(ultimoNumero);
};

export async function getUltimosResultados(idPaciente) {
    let pipeline = [
        {
            $match: {
                $and: [{
                    'solicitud.tipoPrestacion.conceptId': '15220000',
                    'paciente.id': { $eq: mongoose.Types.ObjectId(idPaciente) },
                }]
            }
        },
        {
            $unwind: '$solicitud'
        },
        {
            $unwind: '$solicitud.registros'
        },
        {
            $unwind: '$solicitud.registros.valor'
        },

        {
            $unwind: '$solicitud.registros.valor.solicitudPrestacion'
        },
        { $match: { 'solicitud.registros.valor.solicitudPrestacion.practicas': { $exists: true } } },
        {
            $project: {

                resultadosAnteriores: '$solicitud.registros.valor.solicitudPrestacion.practicas.resultado.resultadosAnteriores',
            }
        }
    ];
    let resultados = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
    return resultados;
};