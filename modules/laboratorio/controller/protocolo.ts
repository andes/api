import * as mongoose from 'mongoose';
import {model as prestacion} from '../../../modules/rup/schemas/prestacion';
import { toArray } from '../../../utils/utils';

export async function getUltimoNumeroProtocolo(idOrganizacion) {

    let pipeline = [
        {$match: {'solicitud.organizacion.id':idOrganizacion}},
        {$match: {'solicitud.tipoPrestacion.conceptId':'15220000'}},
        {$match: {'ejecucion.registros.nombre':'numeroProtocolo'}},
        {$unwind: '$ejecucion.registros'},
        {$match: {'ejecucion.registros.nombre':'numeroProtocolo'}},
        {$sort: {'ejecucion.registros.valor.numero':-1}},
        {$group: {
            _id: null,
            first: { $first: "$$ROOT" }}
        }    
    ];

    let resultados = await toArray(prestacion.aggregate(pipeline).cursor({}).exec());
    let ultimoNumero;
    console.log('resultados[0]',resultados[0])
    if (resultados[0].first.ejecucion.registros.valor && resultados[0].first.ejecucion.registros.valor.numero) {
        ultimoNumero = resultados[0].first.ejecucion.registros.valor.numero;
    } else {
        ultimoNumero = 0;
    }
    
    return parseInt(ultimoNumero);
}