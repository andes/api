import { getPracticasCobasC311 } from './../controller/practica';
import * as moment from 'moment';
import { Types } from 'mongoose';
import { model as Prestacion } from '../../../../modules/rup/schemas/prestacion';
import { model as Organizacion } from '../../../../core/tm/schemas/organizacion';
import { pushEstado } from '../../../../modules/rup/controllers/prestacion';
import { toArray } from '../../../../utils/utils';
import { EventCore } from '@andes/event-bus';
import { buscarPaciente } from '../../../../core/mpi/controller/paciente';
import { calcularEdad } from '../../../../utils/utils';

const lookup = {
    from: 'practica',
    localField: 'ejecucion.registros.valor.idPractica',
    foreignField: 'id',
    as: 'practicas'
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

const lookupResultadoAnterior = {
    $lookup: {
        from: 'prestaciones',
        let: { conceptId: '$ejecucion.registros.valor.practica.concepto.conceptId', paciente: '$paciente.id' },
        pipeline: [
            {
                $match: {
                    $expr: {
                        $and: [
                            { $eq: ['$solicitud.tipoPrestacion.conceptId', '15220000'] },
                            { $eq: ['$paciente.id', '$$paciente'] }
                        ]
                    }
                }
            },
            { $unwind: '$ejecucion.registros' },
            { $match: { $expr: { $eq: ['$ejecucion.registros.concepto.conceptId', '$$conceptId'] } } },
            { $unwind: '$ejecucion.registros.valor.estados' },
            { $match: { $expr: { $eq: ['$ejecucion.registros.valor.estados.tipo', 'validada'] } } },
            { $sort: { 'ejecucion.registros.createdAt': 1 } },
            { $limit: 1 },
            {
                $project: {
                    _id: '$ejecucion.registros.valor.resultado.valor',
                    valor: '$ejecucion.registros.valor.resultado.valor',
                    estado: '$ejecucion.registros.valor.estados'
                }
            }
        ],
        as: 'ejecucion.registros.valor.resultadoAnterior'
    }
};

/**
 *
 *
 * @param {*} params
 * @returns
 */
export async function getProtocolos(params) {
    let conditions = await getQuery(params);
    conditions.unshift({ $match: { 'solicitud.tipoPrestacion.conceptId': '15220000' } });
    conditions.push({ $unwind: '$ejecucion.registros' });
    conditions.push({ $lookup: lookup });
    if (params.areas) {
        let areas = Array.isArray(params.areas) ? params.areas : [params.areas];
        conditions.push({
            $addFields: {
                practicasFiltradas: {
                    $filter: {
                        input: '$practicas', as: 'p', cond: { $in: ['$$p.area._id', areas] }
                    }
                }
            }
        });
        conditions.push({ $match: { practicasFiltradas: { $ne: [] } } }),
            conditions.push({ $addFields: { 'ejecucion.registros.valor.practica': { $arrayElemAt: ['$practicasFiltradas', 0] } } });
    } else {
        conditions.push({ $addFields: { 'ejecucion.registros.valor.practica': { $arrayElemAt: ['$practicas', 0] } } });
    }

    if (params.organizacionDerivacion) {
        conditions.push({
            $lookup: {
                from: 'configuracionDerivacion',
                let: { idPractica: '$ejecucion.registros.valor.practica._id', idOrganizacion: Types.ObjectId(params.organizacionDerivacion) },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$laboratorioDestino', '$$idOrganizacion'] },
                                    { $eq: ['$idPractica', '$$idPractica'] }
                                ]
                            }
                        }
                    },
                    { $project: { x: true } }
                ],
                as: 'ejecucion.registros.valor.practica.derivable'
            }
        });

        conditions.push({ $match: { 'ejecucion.registros.valor.practica.derivable': { $ne: [] } } });
    }

    conditions.push(lookupResultadoAnterior);
    conditions.push({ $group: group });
    conditions.push({ $project: project });

    let data = await Prestacion.aggregate(conditions).allowDiskUse(true).exec();
    if (params.organizacionDerivacion) {
        data.forEach((d) => {
            d.ejecucion.registros = d.ejecucion.registros.filter((r) => {
                return !r.valor.estados.some(e => e.tipo === 'derivada');
            });
        });
    }

    if (params.practicasValidadas) {
        data.forEach((d) => {
            d.ejecucion.registros = d.ejecucion.registros.filter((r) => {
                return r.valor.estados.some(e => e.tipo !== 'validada');
            });
        });
    }
    cargarValoresDeReferencia(data);
    return data;
}

/**
 *s
 *
 * @param {*} data
 */
function cargarValoresDeReferencia(data) {
    let getSexo = (sexo) => {
        if (sexo === 'femenino') {
            return 'F';
        } else if (sexo === 'masculino') {
            return 'M';
        } else { return 'I'; }
    };
    data.forEach((prestacion) => {
        prestacion.ejecucion.registros.forEach((registro) => {
            let presentacion = getPresentacion(registro);
            if (presentacion && !registro.valor.valoresReferencia) {
                registro.valor.valoresReferencia = buscarValoresReferencia(
                    calcularEdad(prestacion.paciente.fechaNacimiento),
                    getSexo(prestacion.paciente.sexo),
                    presentacion.valoresReferencia);
            }
        });
    });
}

/**
 *
 *
 * @returns
 */
function getPresentacion(registro) {
    // Debiera devolver la presentacion que se configuro localmente para uso en la organizacion,
    // Provisoriamente devuelve la primera posicion
    if (registro.valor.practica) {
        return registro.valor.practica.presentaciones[0];
    }
    return null;
}

/**
 *
 *
 * @param {*} sexo
 * @param {*} edad
 * @param {*} arrValoresRefencia
 * @returns
 */
function buscarValoresReferencia(sexo, edad, arrValoresRefencia) {
    // Buscar que matchee rango etareo y sexo
    let valoresReferencia = arrValoresRefencia.find((vr) => {
        return (vr.edadDesde <= edad && vr.edadHasta >= edad && vr.sexo === sexo);
    });

    // Buscar que matchee rango etareo
    if (!valoresReferencia) {
        valoresReferencia = arrValoresRefencia.find((vr) => {
            return (vr.edadDesde <= edad && vr.edadHasta >= edad && vr.sexo === 'I');
        });
    }

    // Buscar que aplique a cualquier sexo y edad
    if (!valoresReferencia) {
        valoresReferencia = arrValoresRefencia.find((vr) => {
            return (vr.todasEdades && vr.sexo === 'I');
        });
    }
    return valoresReferencia;
}
/**
 *
 *
 * @export
 * @param {*} id
 * @returns
 */
export async function getProtocoloById(id) {
    return getProtocolos({ $match: { _id: id } });
}

/**
 *
 *
 * @export
 * @param {*} numero
 * @returns
 */
export async function getProtocoloByNumero(numero) {
    return getProtocolos({ 'solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numeroCompleto': numero });
}

/**
 *
 *
 * @export
 * @param {*} idPaciente
 * @param {[any]} conceptsIdPractica
 * @returns
 */
export async function getResultadosAnteriores(idPaciente, conceptsIdPractica: [any]) {
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
        { $match: { 'ejecucion.registros.valor.estados.tipo': 'validada' } },
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

    return await toArray(Prestacion.aggregate(pipeline).cursor({}).exec());
}

/**
 *
 *
 * @export
 * @param {string} [numeroProtocolo]
 * @returns
 */
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
        match,
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
    let res = await toArray(Prestacion.aggregate(pipeline).cursor({}).exec());
    return res;
}

/**
 *
 *
 * @export
 * @param {string} [numeroProtocolo]
 * @returns
 */
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
        organizacionDestino: 'ejecucion.registros.valor.organizacionDestino._id',
        tipoPrestacionSolicititud: 'solicitud.tipoPrestacion.conceptId',
        prioridad: 'solicitud.registros.valor.solicitudPrestacion.prioridad.id',
        origen: 'solicitud.ambitoOrigen'
    };

    matches = await Promise.all(Object.keys(params).map(async e => {
        return new Promise(async (resolve, rej) => {
            let value = params[e];
            let matchOpt = { $match: {} };
            if (e === 'solicitudDesde') {
                matchOpt.$match['solicitud.fecha'] = { $gte: moment(value).startOf('day').toDate() as any };
            } else if (e === 'solicitudHasta') {
                matchOpt.$match['solicitud.fecha'] = { $lte: moment(value).endOf('day').toDate() as any };
            } else if (e === 'numProtocoloDesde') {
                matchOpt.$match['solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numero'] = { $gte: Number(value) };
            } else if (e === 'numProtocoloHasta') {
                matchOpt.$match['solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numero'] = { $lte: Number(value) };
            } else if (e === 'estado') {
                matchOpt.$match['estados.tipo'] = { $in: (typeof value === 'string') ? [value] : value };
            } else if (e === 'estadoFiltrar') {
                matchOpt.$match['estados.tipo'] = { $not: { $in: (typeof value === 'string') ? [value] : value } };
            } else if (e === 'areas') {
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
                if (matchKeys[e]) {
                    matchOpt.$match[matchKeys[e]] = value;
                }
            }
            resolve(matchOpt);
        });
    }));
    return matches;
}

/**
 *
 *
 * @export
 * @param {*} idEfector
 * @returns
 */
export async function generarNumeroProtocolo(idEfector) {
    idEfector = Types.ObjectId(idEfector);
    let ultimoNumeroProtocolo = await getUltimoNumeroProtocolo(idEfector);
    let anio = new Date().getFullYear().toString().substr(-2);
    let organizacion: any = await Organizacion.findOne(idEfector);
    ultimoNumeroProtocolo++;
    let nuevoNumeroProtocolo = {
        numeroCompleto: ultimoNumeroProtocolo + '-' + organizacion.prefijo + anio,
        numero: ultimoNumeroProtocolo
    };
    return nuevoNumeroProtocolo;
}

/**
 *
 *
 * @param {*} idOrganizacion
 * @returns
 */
async function getUltimoNumeroProtocolo(idOrganizacion) {

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
        { $unwind: '$solicitud.registros' },
        { $match: { 'solicitud.registros.valor.solicitudPrestacion.numeroProtocolo': { $exists: true } } },
        { $sort: { 'solicitud.registros.valor.solicitudPrestacion.numeroProtocolo.numero': -1 } },
        { $project: { solicitudPrestacion: '$solicitud.registros.valor.solicitudPrestacion' } },
        { $group: { _id: null, first: { $first: '$$ROOT' } } }
    ];

    let resultados = await toArray(Prestacion.aggregate(pipeline).cursor({}).exec());

    let ultimoNumero;
    if (resultados[0] && resultados[0].first.solicitudPrestacion && resultados[0].first.solicitudPrestacion.numeroProtocolo) {
        ultimoNumero = resultados[0].first.solicitudPrestacion.numeroProtocolo.numero;
    } else {
        ultimoNumero = 0;
    }
    return parseInt(ultimoNumero, 10);
}

/**
 *
 *
 * @export
 * @param {*} req
 * @param {*} body
 * @param {*} registros
 */
export async function actualizarRegistrosEjecucion(req) {
    let promises = req.body.registros.map((registro: any) => {
        return Prestacion.updateOne(
            {
                $and: [
                    { _id: Types.ObjectId(req.body.idProtocolo) },
                    { 'ejecucion.registros._id': Types.ObjectId(registro._id) }
                ]
            },
            {
                $set: {
                    'ejecucion.registros.$.valor': registro.valor
                }
            }, (err, data: any) => {
                if (err) {
                    throw err;
                }
            }
        );
    });
    const res = await Promise.all(promises);

    if (req.body.idProtocolo && req.body.estado) {
        await pushEstado(req);
    }

    return res;
}

/**
 *
 *
 * @export
 * @param {*} ids
 */
export async function actualizarEstadoDerivadoRegistrosEjecucion(ids, _usuario, organizacionDestino) {
    let promises = ids.map((id: any) => {
        return Prestacion.updateOne(
            { 'ejecucion.registros._id': Types.ObjectId(id) },
            {
                $push: {
                    'ejecucion.registros.$.valor.estados': {
                        tipo: 'derivada',
                        usuario: _usuario,
                        fecha: new Date()
                    }
                }
                ,
                $set: {
                    'ejecucion.registros.$.valor.organizacionDestino': organizacionDestino
                }
            },
            (err, data: any) => {
                if (err) {
                    throw err;
                }
                return data;
            }
        );
    });
    return await Promise.all(promises);
}
