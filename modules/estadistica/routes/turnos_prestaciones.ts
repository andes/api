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

    try {
        // Procesa los turnos aplicando los filtros
        let turnos = await agendaController.procesar(parametros);
        // Procesa las prestaciones fuera de agenda
        let prestaciones = await fueraDeAgendaController.procesar(parametros);
        // hacerlo con promiseAll para que se hagan los dos procesos en paralelo
        res.json(turnos);
    } catch (error) {
        return next(error);
    }
});

export = router;
