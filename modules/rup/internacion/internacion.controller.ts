import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as Prestacion } from '../schemas/prestacion';

export async function obtenerPrestaciones(organizacion, filtros) {
    const fechaIngresoDesde = (filtros.fechaIngresoDesde) ? moment(filtros.fechaIngresoDesde).toDate() : moment().subtract(1, 'month').toDate();
    const fechaIngresoHasta = (filtros.fechaIngresoHasta) ? moment(filtros.fechaIngresoHasta).toDate() : moment().toDate();

    const $matchEgreso = [];
    if (filtros.fechaEgresoDesde) {
        $matchEgreso.push({
            'ejecucion.registros.valor.InformeEgreso.fechaEgreso': { $gte: moment(filtros.fechaEgresoDesde).toDate() }
        });
    }

    if (filtros.fechaEgresoHasta) {
        $matchEgreso.push({
            'ejecucion.registros.valor.InformeEgreso.fechaEgreso': { $lte: moment(filtros.fechaEgresoHasta).toDate() }
        });
    }

    const $match = {};

    if (filtros.idProfesional) {
        $match['solicitud.profesional.id'] = filtros.idProfesional;
    }

    const prestaciones$ = Prestacion.aggregate([
        {
            $match: {
                'solicitud.organizacion.id': mongoose.Types.ObjectId(organizacion as any),
                'solicitud.ambitoOrigen': 'internacion',
                'solicitud.tipoPrestacion.conceptId': '32485007',
                'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $gte: fechaIngresoDesde },
                $and: [
                    { 'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $gte: fechaIngresoDesde }},
                    { 'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $lte: fechaIngresoHasta }},
                    ...$matchEgreso
                ],
                ...$match
            }
        },
        {
            $addFields: { lastState: { $arrayElemAt: ['$estados', -1] } }
        },
        {
            $match: { $or: [{ 'lastState.tipo': 'ejecucion' }, { 'lastState.tipo': 'validada' }] }
        },
        { $project: { _v: 0, lastState: 0 } }
    ]);

    const prestacionesInternacion = await prestaciones$.exec();
    return prestacionesInternacion;
}
