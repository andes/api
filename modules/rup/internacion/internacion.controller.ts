import { Request } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import { EventCore } from '@andes/event-bus';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { Prestacion } from '../schemas/prestacion';
import * as CamasEstadosController from './cama-estados.controller';
import { historial as historialCamas } from './camas.controller';
import { InternacionResumen } from './resumen/internacion-resumen.schema';
import { historial as historialSalas } from './sala-comun/sala-comun.controller';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { InformeEstadistica } from './informe-estadistica.schema';


export async function obtenerPrestaciones(organizacion, filtros) {
    const orgId = mongoose.Types.ObjectId(organizacion as any);

    const query: any = {
        'organizacion._id': orgId
    };

    if (filtros.fechaIngresoDesde || filtros.fechaIngresoHasta) {
        query['informeIngreso.fechaIngreso'] = {};

        if (filtros.fechaIngresoDesde) {
            query['informeIngreso.fechaIngreso']['$gte'] = moment(filtros.fechaIngresoDesde).startOf('day').toDate();
        }
        if (filtros.fechaIngresoHasta) {
            query['informeIngreso.fechaIngreso']['$lte'] = moment(filtros.fechaIngresoHasta).endOf('day').toDate();
        }
    }

    if (filtros.fechaEgresoDesde || filtros.fechaEgresoHasta) {
        query['informeEgreso.fechaEgreso'] = {};

        if (filtros.fechaEgresoDesde) {
            query['informeEgreso.fechaEgreso']['$gte'] = moment(filtros.fechaEgresoDesde).startOf('day').toDate();
        }
        if (filtros.fechaEgresoHasta) {
            query['informeEgreso.fechaEgreso']['$lte'] = moment(filtros.fechaEgresoHasta).endOf('day').toDate();
        }
    }

    if (filtros.idProfesional) {
        query['informeIngreso.profesional.id'] = filtros.idProfesional;
    }

    if (filtros.idPaciente) {
        const pac = await PacienteCtr.findById(filtros.idPaciente).lean();
        const ids = pac?.vinculos?.length ? pac.vinculos : [filtros.idPaciente];
        query['paciente.id'] = { $in: ids };
    }

    return InformeEstadistica
        .find(query)
        .sort({ 'informeIngreso.fechaIngreso': -1 })
        .lean();
}

export async function obtenerInformeEstadistica(organizacion, filtros) {
    const matchIngreso: any = {};
    if (filtros.fechaIngresoDesde || filtros.fechaIngresoHasta) {
        const fechaIngresoFilter: any = {};
        if (filtros.fechaIngresoDesde) {
            fechaIngresoFilter['$gte'] = moment(filtros.fechaIngresoDesde).startOf('day').toDate();
        }
        if (filtros.fechaIngresoHasta) {
            fechaIngresoFilter['$lte'] = moment(filtros.fechaIngresoHasta).endOf('day').toDate();
        }
        matchIngreso['informeIngreso.fechaIngreso'] = fechaIngresoFilter;
    }

    const matchEgreso: any = {};
    if (filtros.fechaEgresoDesde || filtros.fechaEgresoHasta) {
        const fechaEgresoFilter: any = {};
        if (filtros.fechaEgresoDesde) {
            fechaEgresoFilter['$gte'] = moment(filtros.fechaEgresoDesde).startOf('day').toDate();
        }
        if (filtros.fechaEgresoHasta) {
            fechaEgresoFilter['$lte'] = moment(filtros.fechaEgresoHasta).endOf('day').toDate();
        }
        matchEgreso['informeEgreso.fechaEgreso'] = fechaEgresoFilter;
    }

    const $match: any = {};

    if (filtros.idProfesional) {
        $match['informeIngreso.profesional.id'] = filtros.idProfesional;
    }

    if (filtros.idPaciente) {
        $match['paciente.id'] = filtros.idPaciente;
    }

    const query = {
        'organizacion._id': mongoose.Types.ObjectId(organizacion as any),
        ...matchIngreso,
        ...matchEgreso,
        ...$match
    };

    const resultados = await InformeEstadistica.find(query)
        .sort({ 'informeIngreso.fechaIngreso': -1 })
        .lean();

    return resultados;
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
        internacion = await InformeEstadistica.findById(idInternacion);
        if (!internacion) {
            return false;
        }
        fechaDesde = internacion.informeIngreso.fechaIngreso;
    } else { // capa médica, enfermeria o estadistica-v2
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
            }, mov.fecha, usuario
            );
        });

        await Promise.all(deshacerEstados);
        if (completo) {
            EventCore.emitAsync('mapa-camas:paciente:undo', {
                fecha: fechaDesde,
                idInternacion: internacion.id,
                usuario
            });
        }

        return completo;
    }
    return false;
}


