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

export async function getResultadosAnteriores(idPaciente, conceptIdPractica) {
    let pipeline = [
        {
            $match: {
                $and: [{
                    'solicitud.tipoPrestacion.conceptId': '15220000',
                    'paciente.id': idPaciente,
                    'ejecucion.registros.valor.concepto.conceptId': conceptIdPractica,
                    'ejecucion.registros.valor.resultado.validado': true
                }]
            }
        },
        { $unwind: '$ejecucion.registros' },
        { $unwind: '$ejecucion.registros.valor' },
        {   
            $match: {
                'ejecucion.registros.valor.concepto.conceptId': conceptIdPractica,
                'ejecucion.registros.valor.resultado.validado': true
            }
        },
        {
            $project: {
                resultadoAnterior: '$ejecucion.registros.valor.resultado',
                fecha: '$ejecucion.fecha',
                unidadMedida: '$ejecucion.registros.valor.unidadMedida.term'
            }
        }
    ];

    let res = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
    let resultadosAnteriores = [];
    res.forEach(r => {
        r.resultadoAnterior.fecha = r.fecha;
        r.resultadoAnterior.unidadMedida = r.unidadMedida;
        resultadosAnteriores.push(r.resultadoAnterior);
    });
    return resultadosAnteriores;
};