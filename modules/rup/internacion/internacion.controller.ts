import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { historial as historialCamas } from './camas.controller';
import { historial as historialSalas } from './sala-comun/sala-comun.controller';
import { ObjectId } from '@andes/core';
import { Prestacion } from '../schemas/prestacion';
import * as CamasEstadosController from './cama-estados.controller';
import { Request } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';

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
                    { 'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $gte: fechaIngresoDesde } },
                    { 'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $lte: fechaIngresoHasta } },
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
        {
            $project: {
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
            }
        }
    ]);

    const prestacionesInternacion = await prestaciones$.exec();
    return prestacionesInternacion;
}

export async function obtenerHistorialInternacion(organizacion: ObjectId, capa: string, idInternacion: ObjectId, desde: Date, hasta: Date) {

    const p1 = historialCamas(
        { organizacion, capa, ambito: 'internacion' },
        null,
        idInternacion,
        desde,
        hasta,
        true
    );

    const p2 = historialSalas({
        organizacion,
        internacion: idInternacion,
        desde,
        hasta
    });

    const [histCamas, histSalas] = await Promise.all([p1, p2]);

    const historialInternacion = [...histCamas, ...histSalas];
    return historialInternacion;
}

export async function deshacerInternacion(organizacion, capa, ambito, cama, req: Request) {
    delete cama['createdAt'];
    delete cama['createdBy'];
    delete cama['updatedAt'];
    delete cama['updatedBy'];
    delete cama['deletedAt'];
    delete cama['deletedBy'];
    const usuario = Auth.getAuditUser(req);

    let result;

    // control pensando en sala-comun
    if (cama.idCama) {
        const movimientos = await CamasEstadosController.searchEstados({ desde: cama.fecha, hasta: cama.fecha, organizacion, capa, ambito }, { cama: cama.idCama, esMovimiento: true });
        if (movimientos.length <= 1) {
            result = await CamasEstadosController.deshacerEstadoCama({ organizacion, ambito, capa, cama: cama.idCama }, cama.fecha, usuario);
        }
    }

    return result;
}
