import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import * as agendaController from './../controller/procesarAgendas';
import * as fueraDeAgendaController from './../controller/procesarFueraDeAgenda';
import * as turnos_prestacionesConstroller from './../controller/turnos_prestacionesController';


const router = express.Router();

router.get('/turnos_prestaciones', async (req, res, next) => {

    try {
        const resultado = await turnos_prestacionesConstroller.armarListado(req.query);
        res.json(resultado);
    } catch (error) {
        return next(error);
    }
});

router.post('/turnos_prestaciones/csv', async (req, res, next) => {

    if (!Auth.check(req, 'turnosPrestaciones:buscar')) {
        return next(403);
    }

    try {
        const csv = require('fast-csv');
        const resultado = await turnos_prestacionesConstroller.armarListado(req.body);
        res.set('Content-Type', 'text/csv');
        res.setHeader('Content-disposition', 'attachment; filename=listado.csv');
        csv
            .write(resultado, {
                headers: true, transform: (row) => {
                    return {
                        Fecha: (row.fecha) ? moment(row.fecha).format('YYYY-MM-DD') : '',
                        Documento: (row.paciente) ? row.paciente.documento : '',
                        Paciente: (row.paciente) ? row.paciente.apellido + ', ' + row.paciente.nombre : '',
                        'Tipo de Prestación': (row.prestacion) ? row.prestacion.term : '',
                        'Equipo de Salud': (row.profesionales.length) ? turnos_prestacionesConstroller.obtenerProfesionales(row.profesionales) : 'Profesional no asignado',
                        Estado: (row.estado) ? row.estado : '',
                        Financiador: (row.paciente.obraSocial) ? row.paciente.obraSocial.nombre : 'No posee',
                        Ambito: (row.ambito) ? row.ambito : ''
                    };
                }
            })
            .pipe(res);
    } catch (err) {
        return next(err);
    }
});

export = router;
