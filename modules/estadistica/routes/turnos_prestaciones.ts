import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import * as mongoose from 'mongoose';
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
        estadoFacturacion: req.query.estadoFacturacion
    };
    try {
        // Procesa los turnos aplicando los filtros
        let _turnos = agendaController.procesar(parametros);
        // Procesa las prestaciones fuera de agenda
        let _prestaciones = fueraDeAgendaController.procesar(parametros);
        let [turnos, prestaciones] = await Promise.all([_turnos, _prestaciones]);
        let resultado: any = turnos.concat(prestaciones);
        res.json(resultado);
    } catch (error) {
        return next(error);
    }
});

export = router;
