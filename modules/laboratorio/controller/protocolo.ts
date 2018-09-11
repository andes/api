import * as mongoose from 'mongoose';
import {model as prestacion} from '../../../modules/rup/schemas/prestacion';
import { toArray } from '../../../utils/utils';

export async function getUltimoNumeroProtocolo(idOrganizacion) {

    let pipeline = [
        {$match: {'solicitud.organizacion.id':idOrganizacion}},
        {$match: {'solicitud.tipoPrestacion.conceptId':'15220000'}},
        {$match: {'solicitud.registros.nombre':'numeroProtocolo'}},
        {$unwind: '$solicitud.registros'},
        {$match: {'solicitud.registros.nombre':'numeroProtocolo'}},
        {$sort: {'solicitud.registros.valor':-1}},
        {$group: {
            _id: null,
            first: { $first: "$$ROOT" }}
        }    
    ];

    let resultados = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
    
    return parseInt(resultados[0].first.solicitud.registros.valor);
}