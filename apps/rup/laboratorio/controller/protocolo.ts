import { Practica } from './../schemas/practica';
import { Types } from 'mongoose';
import { model as prestacion } from '../../../../modules/rup/schemas/prestacion';
import { toArray } from '../../../../utils/utils';

export async function getUltimoNumeroProtocolo(idOrganizacion) {

    let pipeline = [
        {
            $match: {
                $and: [
                    {
                        'solicitud.organizacion.id': { $eq: Types.ObjectId(idOrganizacion) },
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
                first: { $first: '$$ROOT' }
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
    return parseInt(ultimoNumero, 10);
}

export async function getResultadosAnteriores(idPaciente, conceptIdPractica) {
    let pipeline = [
        {
            $match: {
                $and: [{
                    'solicitud.tipoPrestacion.conceptId': '15220000',
                    'paciente.id': idPaciente,
                    'ejecucion.registros.concepto.conceptId': conceptIdPractica,
                    'ejecucion.registros.valor.resultado.validado': true
                }]
            }
        },
        { $unwind: '$ejecucion.registros' },
        { $unwind: '$ejecucion.registros.valor' },
        {
            $match: {
                'ejecucion.registros.concepto.conceptId': conceptIdPractica,
                'ejecucion.registros.valor.resultado.validado': true
            }
        },
        {
            $project: {
                resultadoAnterior: '$ejecucion.registros.valor.resultado',
                fecha: '$ejecucion.fecha',
                unidadMedida: '$ejecucion.registros.valor.unidadMedida.term'
            }
        },
        { $sort: { fecha: -1 } }
    ];

    let res = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
    let resultadosAnteriores = [];
    res.forEach(r => {
        r.resultadoAnterior.fecha = r.fecha;
        r.resultadoAnterior.unidadMedida = r.unidadMedida;
        resultadosAnteriores.push(r.resultadoAnterior);
    });
    return resultadosAnteriores;
}

export async function getPracticasCobasC311() {
    const conceptosCobas = ['166849007', '63571001', '89659001', '313849004'];
    let pipeline = [
        {
            $match: {
                'ejecucion.registros.concepto.conceptId': { $in: conceptosCobas }
            }
        },
        {
            $addFields: {
                numeroProtocolo: {
                    $reduce: {
                        input: '$solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numeroCompleto',
                        initialValue: '',
                        in: { $concat: ['$$value', '$$this'] }
                    }
                }
            }
        },
        {
            $project: {
                numeroProtocolo: '$numeroProtocolo',
                registros: {
                    $filter: {
                        input: '$ejecucion.registros',
                        as: 'registro',
                        cond: { $in: ['$$registro.concepto.conceptId', conceptosCobas] }
                    }
                }
            }
        }
    ];

    let res = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
    return res;
}
