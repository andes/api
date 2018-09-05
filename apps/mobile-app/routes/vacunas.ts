import * as express from 'express';
import * as controller from './../../../core/mpi/controller/paciente';
import * as vacunasCtr from '../controller/VacunasController';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();
router.use(Auth.authenticate());

/**
 * Obtenemos las vacunas del Paciente App
 */

router.get('/vacunas', async (req: any, res, next) => {
    try {
        const pacienteId = req.user.pacientes[0].id;
        const paciente = await controller.buscarPaciente(pacienteId);
        const pacienteMPI = paciente.paciente;
        const resultados = await vacunasCtr.getVacunas(pacienteMPI);
        return res.json(resultados);
    } catch (err) {
        return next(err);
    }
});


/**
 * Cantidad de vacunas de un paciente
 */

router.get('/vacunas/count', async (req: any, res, next) => {
    try {
        const pacienteId = req.user.pacientes[0].id;
        let paciente = await controller.buscarPaciente(pacienteId);
        const count = await vacunasCtr.getCount(paciente.paciente);
        res.json(count);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
