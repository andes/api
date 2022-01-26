import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import * as agendaController from './../controller/procesarAgendas';
import * as fueraDeAgendaController from './../controller/procesarFueraDeAgenda';


const router = express.Router();

router.get('/turnos_prestaciones', async (req, res, next) => {

    if (!Auth.check(req, 'turnosPrestaciones:buscar')) {
        return next(403);
    }

    const parametros = {
        organizacion: new mongoose.Types.ObjectId(Auth.getOrganization(req)),
        fechaDesde: req.query.fechaDesde,
        fechaHasta: req.query.fechaHasta,
        prestacion: req.query.prestacion,
        estado: req.query.estado,
        profesional: req.query.idProfesional,
        financiador: req.query.financiador,
        estadoFacturacion: req.query.estadoFacturacion,
        documento: req.query.documento,
        ambito: req.query.ambito
    };
    try {
        // Procesa los turnos aplicando los filtros
        const _turnos = parametros?.ambito === 'internacion' ? [] : agendaController.procesar(parametros);
        // Procesa las prestaciones fuera de agenda
        const _prestaciones = fueraDeAgendaController.procesar(parametros);
        const [turnos, prestaciones] = await Promise.all([_turnos, _prestaciones]);
        const resultado: any = turnos.concat(prestaciones);
        res.json(resultado);
    } catch (error) {
        return next(error);
    }
});

router.post('/turnos_prestaciones/csv', async (req, res, next) => {
    if (!Auth.check(req, 'turnosPrestaciones:buscar')) {
        return next(403);
    }

    const csv = require('fast-csv');
    const fs = require('fs');
    const ws = fs.createWriteStream('/tmp/turnos-prestaciones.csv', { encoding: 'utf8' });

    try {
        csv
            .write(req.body, {
                headers: true, transform: (row) => {
                    return {
                        Fecha: (row.fecha) ? moment(row.fecha).format('DD-MM-YYYY') : '',
                        Documento: (row.paciente) ? row.paciente.documento : '',
                        Paciente: (row.paciente) ? row.paciente.apellido+', '+row.paciente.nombre : '',
                        'Tipo de Prestación': (row.prestacion) ? row.prestacion.term : '',
                        'Equipo de Salud': (row.profesionales.length) ? obtenerProfesionales(row.profesionales) : 'Profesional no asignado',
                        Estado: (row.estado) ? row.estado : '',
                        Financiador: (row.paciente.obraSocial) ? row.paciente.obraSocial.nombre : 'No posee'
                    };
                }
            })
            .pipe(ws)
            .on('finish', () => {
                res.download(('/tmp/turnos-prestaciones.csv' as string), (err) => {
                    if (err) {
                        next(err);
                    } else {
                        next();
                    }
                });
            });
    } catch (err) {
        return next(err);
    }
});

function obtenerProfesionales(profesionales) {
    let salida='';
    profesionales.forEach(element => {
        salida += element.apellido+', '+element.nombre+' - ';
    });
    return salida.slice(0,-3);
}

export = router;
