import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as Prestacion } from '../schemas/prestacion';
import { historial as historialCamas } from './camas.controller';
import { historial as historialSalas } from './sala-comun/sala-comun.controller';

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
        { $project: {
            id: '$_id',
            paciente: 1,
            solicitud: 1,
            ejecucion: 1,
            noNominalizada: 1,
            estados: 1,
            createdAt: 1,
            createdBy: 1,
            updatedAt: 1,
            updatedBy: 1,
            esPrioritario: {
                $cond: {
                    if: { $eq: ['$registroSolicitud.valor.solicitudPrestacion.prioridad', 'prioritario'] },
                    then: -1,
                    else: 1
                }
            }
        } }
    ]);

    const prestacionesInternacion = await prestaciones$.exec();
    return prestacionesInternacion;
}

export async function obtenerHistorialInternacion(organizacion, capa, idInternacion, desde, hasta) {
    const histCamas = await historialCamas({ organizacion, capa, ambito: 'internacion'}, null, idInternacion, desde, hasta, true);
    const histSalas = await historialSalas({ organizacion, ambito: 'internacion'}, null, idInternacion, desde, hasta);
    const historialInternacion = [...histCamas, ...histSalas];
    return historialInternacion;
}
