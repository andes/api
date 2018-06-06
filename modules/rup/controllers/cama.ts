import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { model as cama } from '../../../core/tm/schemas/camas';
import { toArray } from '../../../utils/utils';

export function buscarCamaInternacion(idInternacion, estado) {
    let query = cama.aggregate([
        {
            $project: {
                ultimoEstado: { $arrayElemAt: ['$estados', -1] }, organizacion: 1, sector: 1,
                habitacion: 1, nombre: 1, tipoCama: 1
            }
        },
        { $match: { 'ultimoEstado.estado': estado, 'ultimoEstado.idInternacion': idInternacion } }
    ]);

    return toArray(query.cursor({}).exec());
}

export function buscarPasesCamaXInternacion(idInternacion) {

    let pipelineEstado = [];

    pipelineEstado = [
        { $match: { 'estados.idInternacion': idInternacion } },
        { $unwind: '$estados' },
        { $match: { 'estados.idInternacion': idInternacion } },
        { $sort: { 'estados.fecha': 1 } }];

    let query = cama.aggregate(pipelineEstado);

    return toArray(query.cursor({}).exec());
}

/**
 * Devuelve todas las camas ocupadas por unidad organizativa en una fecha dada
 * @param unidadOrganizativa
 * @param fecha
 */
export function camaOcupadasxUO(unidadOrganizativa, fecha, idOrganizacion) {
    let pipelineEstado = [];
    pipelineEstado =
        [{
            $match: {
                'organizacion._id': idOrganizacion,
                'estados.unidadOrganizativa.conceptId': unidadOrganizativa,
                'estados.fecha': { '$lte': fecha },
                'estados.esCensable': true,
                'estados.estado': 'ocupada',
            }
        },
        { $unwind: '$estados' },
        {
            $match: {
                'estados.unidadOrganizativa.conceptId': unidadOrganizativa,
                'estados.fecha': { '$lte': fecha },
                'estados.esCensable': true,
                'estados.estado': 'ocupada'
            }
        },
        { $sort: { 'nombre': 1, 'estados.fecha': 1 } },
        {
            $group:
                {
                    _id: {
                        id: '$_id',
                        nombre: '$nombre',
                        organizacion: '$organizacion',
                        tipoCama: '$tipoCama',
                        idInternacion: '$estados.idInternacion',
                    },
                    ultimoEstado: { $last: '$estados' }
                }
        },
        { $sort: { 'ultimoEstado.fecha': 1 } }];


    let query = cama.aggregate(pipelineEstado);

    return toArray(query.cursor({}).exec());
}

export function desocupadaEnDia(dtoCama, fecha) {
    return new Promise(async (resolve, reject) => {

        let pipelineEstado = [];
        let ultimoEstadofinDia = moment(dtoCama.ultimoEstado.fecha).endOf('day').toDate();
        let finDiaConsulta = moment(fecha).endOf('day').toDate();
        let inicioDia = moment(fecha).startOf('day').toDate();
        if (finDiaConsulta > ultimoEstadofinDia) {
            pipelineEstado = [
                { $match: { _id: dtoCama._id.id } },
                { $unwind: '$estados' },
                {
                    $match: {
                        $and:
                            [{
                                'estados.fecha': {
                                    '$lte': inicioDia,
                                    '$gte': dtoCama.ultimoEstado.fecha
                                }
                            }, { 'estados.estado': { $ne: 'ocupada' } }]
                    }
                }
            ];
            let data = await toArray(cama.aggregate(pipelineEstado).cursor({}).exec());

            if (data && data.length > 0) {
                return resolve(null);
            } else {
                return resolve(dtoCama);
            }
        } else {
            return resolve(dtoCama);
        }
    });
}
export function camaXInternacion(idInternacion) {
    return new Promise(async (resolve, reject) => {
        let pipelineEstado = [];

        pipelineEstado = [
            { $match: { 'estados.idInternacion': idInternacion } },
            { $unwind: '$estados' },
            { $match: { 'estados.idInternacion': idInternacion } },
            { $sort: { 'estados.fecha': -1 } },
            { $limit: 1 }];

        let data = await toArray(cama.aggregate(pipelineEstado).cursor({}).exec());
        if (data && data.length) {
            cama.findById(data[0]._id).then(res => {
                return resolve(res);
            }).catch(err1 => {
                return reject(err1);
            });
        } else {
            return resolve(null);
        }

    });
}

export function disponibilidadXUO(unidad, fecha, idOrganizacion) {
    return new Promise((resolve, reject) => {
        let inicioDia = moment(fecha).startOf('day').toDate();
        let finDia = moment(fecha).endOf('day').toDate();

        let pipelineInicioDia = [{
            $match: {
                'organizacion._id': idOrganizacion,
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { '$lte': inicioDia }
            }
        },
        { $unwind: '$estados' },
        {
            $match: {
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { '$lte': inicioDia }
            }
        },
        { $sort: { 'estados.fecha': 1 } },
        {
            $group:
                {
                    _id: {
                        id: '$_id',
                        nombre: '$nombre',
                        organizacion: '$organizacion',
                        sector: '$sector',
                        habitacion: '$habitacion',
                        tipoCama: '$tipoCama'
                    },
                    ultimoEstado: { $last: '$estados' }
                }
        },
        { $match: { 'ultimoEstado.unidadOrganizativa.conceptId': unidad, 'ultimoEstado.estado': { $nin: ['bloqueada', 'reparacion', 'ocupada'] } } }];

        let pipelineFinDia = [{
            $match: {
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { '$lte': finDia }
            }
        },
        { $unwind: '$estados' },
        {
            $match: {
                'estados.unidadOrganizativa.conceptId': unidad,
                'estados.fecha': { '$lte': finDia }
            }
        },
        { $sort: { 'estados.fecha': 1 } },
        {
            $group:
                {
                    _id: {
                        id: '$_id',
                        nombre: '$nombre',
                        organizacion: '$organizacion',
                        sector: '$sector',
                        habitacion: '$habitacion',
                        tipoCama: '$tipoCama'
                    },
                    ultimoEstado: { $last: '$estados' }
                }
        },
        { $match: { 'ultimoEstado.estado': { $nin: ['bloqueada', 'reparacion', 'ocupada'] } } }];

        let promises = [
            toArray(cama.aggregate(pipelineInicioDia).cursor({}).exec()),
            toArray(cama.aggregate(pipelineFinDia).cursor({}).exec())
        ];
        return Promise.all(promises).then(([dataIni, dataFin]) => {
            const salida = { disponibilidad0: dataIni.length, disponibilidad24: dataFin.length };
            return resolve(salida);
        }).catch(reject);

    });
}
