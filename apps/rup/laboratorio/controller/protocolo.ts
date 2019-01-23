import { getPracticasCobasC311 } from './../controller/practica';
import { Types } from 'mongoose';
import { model as prestacion } from '../../../../modules/rup/schemas/prestacion';
import { toArray } from '../../../../utils/utils';
import { EventCore } from '@andes/event-bus';

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

export async function getResultadosAnteriores(idPaciente, conceptsIdPractica: [any]) {
    let pipeline = [
        {
            $match: {
                $and: [{
                    'solicitud.tipoPrestacion.conceptId': '15220000',
                    'paciente.id': idPaciente,
                    'ejecucion.registros.concepto.conceptId': {
                        $in: conceptsIdPractica
                    },
                    'ejecucion.registros.valor.estados.tipo': 'validada'
                }]
            }
        },
        { $unwind: '$ejecucion.registros' },
        {
            $match: {
                $and: [{
                    'ejecucion.registros.concepto.conceptId': {
                        $in: conceptsIdPractica
                    },
                    'ejecucion.registros.valor.estados.tipo': 'validada'
                }]
            }
        },
        { $unwind: '$ejecucion.registros.valor.estados' },
        // { $sort: { 'ejecucion.registros.valor.estados.fecha': -1 } },

        {
            $match: {
                'ejecucion.registros.valor.estados.tipo': 'validada'
            }
        },
        {
            $group: {
                _id: '$ejecucion.registros.concepto.conceptId',
                conceptIdPractica: { $first: '$ejecucion.registros.concepto.conceptId' },
                resultados: {
                    $push: {
                        valor: '$ejecucion.registros.valor.resultado.valor',
                        fecha: '$ejecucion.registros.valor.estados.fecha'
                    }
                }
            }
        }
    ];

    return await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
}

export async function getEjecucionesCobasC311() {
    const practicasCobas = await getPracticasCobasC311(); // ['166849007', '63571001', '89659001', '313849004', '104485008', '271234008'];
    let conceptosCobas = [];
    practicasCobas.forEach(element => {
        conceptosCobas.push(element.conceptId);
    });
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
        },
        {
            $unwind: '$registros'
        },
        {
            $lookup:
            {
                from: 'practica',
                localField: 'registros.concepto.conceptId',
                foreignField: 'concepto.conceptId',
                as: 'practica'
            }
        },
        {
            $addFields: {
                'registros.configuracionAnalizador': { $arrayElemAt: ['$practica.configuracionAnalizador', 0] }
            }
        },
        {
            $project: {
                numeroProtocolo: '$numeroProtocolo',
                ejecucion: '$registros',
                test: '$registros.configuracionAnalizador.cobasC311',
                conceptId: '$registros.concepto.conceptId',
                valor: '$registros.resultado.valor'
            }
        }
        /*
        {
            $group : {
                _id : '$_id',
                numeroProtocolo: {$first: '$numeroProtocolo' } ,
                registros: {$push: '$registros'}
            }
        }*/
    ];

    let res = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
    return res;
}

export async function enviarAutoanalizador() {
    console.log('entró: enviarAutoanalizador');
    let ejecuciones = await getEjecucionesCobasC311();
    EventCore.emitAsync('rup:prestacion:autoanalizador', ejecuciones);
    return;
}
