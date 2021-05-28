import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { historial as historialCamas } from './camas.controller';
import { historial as historialSalas } from './sala-comun/sala-comun.controller';
import { ObjectId } from '@andes/core';
import { Prestacion } from '../schemas/prestacion';
import * as CamasEstadosController from './cama-estados.controller';
import { Request } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';
import { EventCore } from '@andes/event-bus';

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

    return Prestacion.find({
        'solicitud.organizacion.id': mongoose.Types.ObjectId(organizacion as any),
        'solicitud.ambitoOrigen': 'internacion',
        'solicitud.tipoPrestacion.conceptId': '32485007',
        $and: [
            { 'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $gte: fechaIngresoDesde } },
            { 'ejecucion.registros.valor.informeIngreso.fechaIngreso': { $lte: fechaIngresoHasta } },
            ...$matchEgreso
        ],
        ...$match,
        'estadoActual.tipo': { $in: ['ejecucion', 'validada'] }

    });
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
    const usuario = Auth.getAuditUser(req);

    // control pensando en sala-comun
    if (cama.idCama) {
        const internacion: any = await Prestacion.findById(cama.idInternacion);
        let movimientos = await CamasEstadosController.searchEstados({ desde: internacion.solicitud.fecha, hasta: cama.fecha, organizacion, capa, ambito }, { internacion: internacion.id, esMovimiento: true });
        let movimientosConsecuentes = [];
        movimientos.forEach(mov => {
            if (mov.idMovimiento) {
                // Obtenemos las camas que pasan a estado 'disponible' como consecuencia de mover al paciente
                movimientosConsecuentes.push(CamasEstadosController.searchEstados({ desde: internacion.solicitud.fecha, hasta: cama.fecha, organizacion, capa, ambito }, { movimiento: mov.idMovimiento, estado: 'disponible' }));
            }
        });
        movimientosConsecuentes = await Promise.all(movimientosConsecuentes);
        movimientos = (movimientos.concat(movimientosConsecuentes.map(item => item[0])));

        let deshacerEstados = [];
        movimientos.forEach(mov => {
            delete mov['createdAt'];
            delete mov['createdBy'];
            delete mov['updatedAt'];
            delete mov['updatedBy'];
            delete mov['deletedAt'];
            delete mov['deletedBy'];
            deshacerEstados.push(CamasEstadosController.deshacerEstadoCama({ organizacion, ambito, capa, cama: mov.idCama }, mov.fecha, usuario));
        });

        await Promise.all(deshacerEstados);
        EventCore.emitAsync('mapa-camas:paciente:undo', {
            fecha: internacion.solicitud.fecha,
            idInternacion: internacion.id
        });
    }
}
