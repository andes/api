import * as express from 'express';
import * as CensosController from './censo.controller';
import { asyncHandler } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';
import moment = require('moment');
const router = express.Router();
const csv = require('fast-csv');

router.get('/censo-diario', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);
    const unidadOrganizativa = req.query.unidadOrganizativa;
    const fecha = req.query.fecha;

    const result = await CensosController.censoDiario({
        organizacion,
        timestamp: fecha,
        unidadOrganizativa
    });

    await CensosController.storeCenso(organizacion, unidadOrganizativa, result.censo, fecha);

    res.json(result);
}));

router.get('/censo-mensual', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);
    const result = await CensosController.censoMensual({
        organizacion,
        unidadOrganizativa: req.query.unidadOrganizativa,
        fechaDesde: req.query.fechaDesde,
        fechaHasta: req.query.fechaHasta
    });

    res.json(result);
}));

router.post('/censo-diario/csv', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);
    const unidadOrganizativa = req.body.unidadOrganizativa;
    const fecha = req.body.fecha;

    const result = await CensosController.censoDiario({
        organizacion,
        timestamp: fecha,
        unidadOrganizativa
    });

    const censoDiario = [];
    Object.keys(result.pacientes).map(p => {
        const censoPaciente = result.pacientes[p];
        censoPaciente.actividad.forEach((actividad: any) => {
            const movimiento = {
                datos: censoPaciente.datos,
                ingreso: actividad.ingreso,
                fechaIngreso: actividad.fechaIngreso,
                paseDe: actividad.paseDe,
                egreso: actividad.egreso,
                paseA: actividad.paseA,
                diasEstada: actividad.diasEstada
            };
            if (!movimiento.ingreso && !movimiento.paseDe && !movimiento.egreso && !movimiento.paseA) {
                if (censoPaciente.actividad.length === 1) {
                    censoDiario.push(movimiento);
                }
            } else {
                if (movimiento.paseDe) {
                    censoDiario.push(movimiento);
                } else {
                    if (movimiento.paseA) {
                        if (censoDiario.length > 0 &&
                            censoDiario[censoDiario.length - 1].datos.paciente.id === movimiento.datos.paciente.id) {
                            censoDiario[censoDiario.length - 1].paseA = movimiento.paseA;
                        } else {
                            censoDiario.push(movimiento);
                        }
                    } else {
                        censoDiario.push(movimiento);
                    }
                }
            }
        });
    });

    res.set('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', 'attachment; filename=censo-diario.csv');
    csv.write(censoDiario, {
        headers: true, transform: (row) => {
            return {
                Paciente: `${row.datos.paciente.apellido}, ${row.datos.paciente.alias || row.datos.paciente.nombre}`,
                Documento: `${row.datos.paciente.documento || row.datos.paciente.numeroIdentificacion}`,
                Cama: `${row.datos.cama.nombre}, ${row.datos.cama.sectores[row.datos.cama.sectores.length - 1].nombre}` || `${row.datos.cama.nombre}`,
                Ingreso: row.ingreso || '',
                'Pase de': row.paseDe || '',
                Egreso: row.egreso || '',
                'Pase a': row.paseA || '',
                'Fecha de ingreso': row.fechaIngreso ? moment(row.fechaIngreso).format('YYYY-MM-DD') : '',
                'Dias de estada': row.diasEstada || ''
            };
        }
    }).pipe(res);
}));

router.post('/censo-mensual/csv', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);
    const result = await CensosController.censoMensual({
        organizacion,
        unidadOrganizativa: req.body.unidadOrganizativa,
        fechaDesde: req.body.fechaDesde,
        fechaHasta: req.body.fechaHasta
    });
    const totales = {
        censo: {
            existenciaALas0: 0,
            ingresos: 0,
            pasesDe: 0,
            altas: 0,
            defunciones: 0,
            pasesA: 0,
            existenciaALas24: 0,
            ingresosYEgresos: 0,
            pacientesDia: 0,
            diasEstada: 0,
            disponibles: 0
        }
    };

    result.map(r => {
        totales.censo.existenciaALas0 += r.censo.existenciaALas0;
        totales.censo.ingresos += r.censo.ingresos;
        totales.censo.pasesDe += r.censo.pasesDe;
        totales.censo.altas += r.censo.altas;
        totales.censo.defunciones += r.censo.defunciones;
        totales.censo.pasesA += r.censo.pasesA;
        totales.censo.existenciaALas24 += r.censo.existenciaALas24;
        totales.censo.ingresosYEgresos += r.censo.ingresosYEgresos;
        totales.censo.pacientesDia += r.censo.pacientesDia;
        totales.censo.diasEstada += r.censo.diasEstada;
        totales.censo.disponibles += r.censo.disponibles;
    });
    result.push(totales);

    res.set('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', 'attachment; filename=censo-mensual.csv');
    csv.write(result, {
        headers: true, transform: (row) => {
            return {
                Fecha: row.fecha ? moment(row.fecha).format('YYYY-MM-DD') : 'TOTALES',
                'Existencia a las 0': row.censo.existenciaALas0,
                Ingresos: row.censo.ingresos,
                'Pases de': row.censo.pasesDe,
                Altas: row.censo.altas,
                Defunciones: row.censo.defunciones,
                'Pases a': row.censo.pasesA,
                'Existencia a las 24': row.censo.existenciaALas24,
                'Ingresos y egresos': row.censo.ingresosYEgresos,
                'Pacientes dia': row.censo.pacientesDia,
                'Dias de estada': row.censo.diasEstada,
                Disponibles: row.censo.disponibles
            };
        }
    }).pipe(res);
}));

export const CensosRouter = router;
