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
        { $unwind: "$estados" },
        { $match: { 'estados.idInternacion': idInternacion } },
        { $sort: { 'estados.fecha': 1 } }];

    let query = cama.aggregate(pipelineEstado);

    return toArray(query.cursor({}).exec());
}

export function camaOcupadasxUO(unidadOrganizativa, fecha) {

    let pipelineEstado = [];
    pipelineEstado =
        [{
            $match: {
                'estados.unidadOrganizativa.conceptId': unidadOrganizativa,
                'estados.fecha': { "$lte": fecha },
                'estados.esCensable': true,
                'estados.estado': 'ocupada',
            }
        },
        { $unwind: "$estados" },
        {
            $match: {
                'estados.unidadOrganizativa.conceptId': unidadOrganizativa,
                'estados.fecha': { "$lte": fecha },
                'estados.esCensable': true,
                'estados.estado': 'ocupada'
            }
        },
        { $sort: { 'nombre': 1, 'estados.fecha': 1 } },
        {
            $group:
                {
                    _id: {
                        id: "$_id",
                        nombre: "$nombre",
                        organizacion: "$organizacion",
                        sector: "$sector",
                        habitacion: "$habitacion",
                        tipoCama: "$tipoCama",
                    },
                    ultimoEstado: { $last: "$estados" }
                }
        }];


    let query = cama.aggregate(pipelineEstado);

    return toArray(query.cursor({}).exec());
}

export function desocupadaEnDia(dtoCama, fecha) {
    return new Promise((resolve, reject) => {

        let pipelineEstado = [];
        let finDia = moment(dtoCama.ultimoEstado.fecha).endOf('day').toDate();
        let finDiaConsulta = moment(fecha).endOf('day').toDate();
        if (finDiaConsulta > finDia) {


            pipelineEstado = [{ $match: { _id: dtoCama._id.id } },
            { $unwind: '$estados' },
            {
                $match: {
                    $and:
                        [{
                            'estados.fecha': {
                                "$lte": finDia,
                                "$gte": dtoCama.ultimoEstado.fecha
                            }
                        }, { 'estados.estado': { $ne: 'ocupada' } }]
                }
            }];
            cama.aggregate(pipelineEstado, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    console.log('DATA ', data);
                    if (data && data.length > 0) {
                        resolve(null);
                    } else {
                        resolve(dtoCama);
                    }

                }
            });
        } else {
            resolve(dtoCama);
        }
    });


}