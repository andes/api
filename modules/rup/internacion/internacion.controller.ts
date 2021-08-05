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
import { InternacionResumen } from './resumen/internacion-resumen.schema';

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

export async function deshacerInternacion(organizacion, capa: string, ambito: string, idInternacion: string, completo: boolean, req: Request) {
    const usuario = Auth.getAuditUser(req);
    let fechaDesde;
    let internacion;

    if (capa === 'estadistica') {
        internacion = await Prestacion.findById(idInternacion);
        fechaDesde = internacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso;
    } else { // capa médica
        internacion = await InternacionResumen.findById(idInternacion);
        fechaDesde = internacion?.fechaIngreso || moment().subtract(-12, 'months').toDate();
    }

    if (internacion) {
        let movimientos = await CamasEstadosController.searchEstados(
            { desde: fechaDesde, hasta: new Date(), organizacion, capa, ambito },
            { internacion: internacion.id, esMovimiento: true }
        );
        movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

        if (!completo) {
            movimientos = movimientos.slice(-1);
        }


        const ps = movimientos.map(async mov => {
            if (mov.extras?.idMovimiento) {
                const ms = await CamasEstadosController.searchEstados(
                    { desde: mov.fecha, hasta: mov.fecha, organizacion, capa, ambito },
                    { movimiento: mov.extras.idMovimiento, estado: 'disponible' }
                );
                return ms[0];
            }
        });
        const movs = await Promise.all(ps);

        movimientos = [
            ...movimientos,
            ...movs.filter(m => m)
        ];

        if (movimientos.length === 1) {
            completo = true;
        }

        const deshacerEstados = movimientos.map(mov => {
            return CamasEstadosController.deshacerEstadoCama({
                organizacion,
                ambito,
                capa,
                cama: mov.idCama
            },
            mov.fecha,
            usuario
            );
        });

        await Promise.all(deshacerEstados);
        if (completo) {
            EventCore.emitAsync('mapa-camas:paciente:undo', {
                fecha: fechaDesde,
                idInternacion: internacion.id
            });
        }

        return completo;
    }
    return false;
}
