import { getPracticasCobasC311 } from './../controller/practica';
import * as moment from 'moment';
import { Types } from 'mongoose';
import { model as prestacion } from '../../../../modules/rup/schemas/prestacion';
import { toArray } from '../../../../utils/utils';
import { EventCore } from '@andes/event-bus';
import { model as Prestacion } from '../../../../modules/rup/schemas/prestacion';
import { buscarPaciente } from '../../../../core/mpi/controller/paciente';


const unwind = '$ejecucion.registros';
const lookup = {
    from: 'practica',
    localField: 'ejecucion.registros.valor.idPractica',
    foreignField: 'id',
    as: 'practicas'
};
const set = {
    'ejecucion.registros.valor.practica':  { $arrayElemAt: ['$practicas', 0] }
};

const group = {
    _id: '$_id',
    solicitud: { $first: '$solicitud' },
    registrosEjecucion: { $push: '$ejecucion.registros' },
    fechaEjecucion: { $first: '$ejecucion.fecha' },
    noNominalizada: { $first: '$noNominalizada' },
    paciente: { $first: '$paciente' },
    estados: { $first: '$estados' },
    createdAt: { $first: '$createdAt' },
    createdBy: { $first: '$createdBy' },
    updatedAt: { $first: '$updatedAt' },
    updatedBy: { $first: '$updatedBy' }
};

const project = {
    _id: '$_id',
    solicitud: '$solicitud',
    'ejecucion.fecha': '$fechaEjecucion',
    'ejecucion.registros': '$registrosEjecucion',
    noNominalizada: '$noNominalizada',
    paciente: '$paciente',
    estados: '$estados',
    createdAt: '$createdAt',
    createdBy: '$createdBy',
    updatedAt: '$updatedAt',
    updatedBy: '$updatedBy'
};

export async function x(idPaciente, conceptsIdPractica: [any]) {
    let pipeline = [
        {
            $match: {
                $and: [{
                    'solicitud.tipoPrestacion.conceptId': '15220000',
                    'paciente.id': idPaciente,
                    'ejecucion.registros.concepto.conceptId': { $in: conceptsIdPractica },
                    'ejecucion.registros.valor.estados.tipo': 'validada'
                }]
            }
        },
        { $unwind: '$ejecucion.registros' },
        {
            $match: {
                $and: [{
                    'ejecucion.registros.concepto.conceptId': { $in: conceptsIdPractica },
                    'ejecucion.registros.valor.estados.tipo': 'validada'
                }]
            }
        },
        { $unwind: '$ejecucion.registros.valor.estados' },
        {
            $match: { 'ejecucion.registros.valor.estados.tipo': 'validada' }
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


export async function getProtocoloById(id) {
    return getProtocolo({ $match: { _id: id } });
}

export async function getProtocoloByNumero(numero) {
    return getProtocolo({ 'solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numeroCompleto': numero });
}

async function getProtocolo(matches) {
    return await Prestacion.aggregate(matches.concat([
        { $unwind: unwind },
        { $lookup: lookup },
        { $addFields: {'ejecucion.registros.valor.practica':  { $arrayElemAt: ['$practicas', 0] }} },
        { $group: group },
        { $project: project }
    ])).exec();
}

export async function getProtocolos(params) {
    return getProtocolo(await getQuery(params));
}

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

export async function getEjecucionesCobasC311(numeroProtocolo?: string) {
    const practicasCobas = await getPracticasCobasC311(); // ['166849007', '63571001', '89659001', '313849004', '104485008', '271234008'];
    let conceptosCobas = [];
    practicasCobas.forEach(element => {
        conceptosCobas.push(element.conceptId);
    });

    let match: any = {
        $match: {
            $and: [
                {
                    'ejecucion.registros.concepto.conceptId': { $in: conceptosCobas }
                }
            ]
        }
    };

    if (numeroProtocolo) {
        match.$match.$and.push({ 'solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numeroCompleto': { $eq: numeroProtocolo } });
    }

    let pipeline = [
        match
        ,
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

export async function enviarAutoanalizador(numeroProtocolo?: string) {
    let ejecuciones = await getEjecucionesCobasC311(numeroProtocolo);
    EventCore.emitAsync('rup:prestacion:autoanalizador', ejecuciones);
    return;
}


/**
 *
 *
 * @param {*} params
 * @returns
 */
async function getQuery(params) {
    let matches;
    const matchKeys = {
        tipoPrestacionSolicititud: 'solicitud.tipoPrestacion.conceptId',
        prioridad: 'solicitud.registros.valor.solicitudPrestacion.prioridad.id',
        origen: 'solicitud.ambitoOrigen'
        // solicitudDesde:  { '$gt' :  new ISODate('2018-02-05 14:27:46.718-03:00')}
    };

    matches = await Promise.all(Object.keys(params).map(async e => {
        return new Promise(async (resolve, rej) => {
            let value = params[e];
            let matchOpt = { $match: {} };
            if (e === 'solicitudDesde') {
                matchOpt.$match['solicitud.fecha'] = { $gte: moment(value).startOf('day').toDate() };
            } else if (e === 'solicitudHasta') {
                matchOpt.$match['solicitud.fecha'] = { $lte: moment(value).startOf('day').toDate() };
            } else if (e === 'numProtocoloDesde') {
                matchOpt.$match['solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numero'] = { $gte: Number(value) };
            } else if (e === 'numProtocoloHasta') {
                matchOpt.$match['solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numero'] = { $lte: Number(value) };
            } else if (e === 'estado') {
                matchOpt.$match['estados.tipo'] = { $in: (typeof value === 'string') ? [value] : value};
            } else if (e === 'areas') {
                // revisar filtro de areas
                matchOpt.$match['solicitud.registros.valor.solicitudPrestacion.practicas.area._id'] = {
                    $in: (Array.isArray(value) ? value : [value])
                };
            } else if (e === 'idPaciente') {
                let { paciente } = await buscarPaciente(value);
                if (paciente) {
                    matchOpt.$match['paciente.id'] = { $in: paciente.vinculos };
                } else {
                    resolve();
                }
            } else {
                matchOpt.$match[matchKeys[e]] = value;
            }
            resolve(matchOpt);
        });
    }));
    return matches;
}
