import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import * as mongoose from 'mongoose';
import * as agendaController from './../controller/procesarAgendas';
import * as fueraDeAgendaController from './../controller/procesarFueraDeAgenda';


const router = express.Router();

router.get('/turnos_prestaciones', async (req, res, next) => {
    const parametros = {
        organizacion: new mongoose.Types.ObjectId(Auth.getOrganization(req)),
        fechaDesde: req.query.fechaDesde,
        fechaHasta: req.query.fechaHasta,
        pretacion: req.query.prestacion,
        profesional: req.query.profesional
    };
    // faltan parámetros financiador y estado (analizar)

    try {
        // Procesa los turnos aplicando los filtros
        let _turnos = agendaController.procesar(parametros);
        // Procesa las prestaciones fuera de agenda
        let _prestaciones = fueraDeAgendaController.procesar(parametros);
        let [turnos, prestaciones] = await Promise.all([_turnos, _prestaciones]);
        let resultado = turnos.concat(prestaciones);
        res.json(resultado);
    } catch (error) {
        return next(error);
    }
});

export = router;
