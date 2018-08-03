import * as express from 'express';
import * as controller from './../../../core/mpi/controller/paciente';
import * as vacunasCtr from '../controller/VacunasController';
import { Auth } from '../../../auth/auth.class';

let router = express.Router();
router.use(Auth.authenticate());

/**
 * Obtenemos las vacunas del Paciente App
 */

router.get('/vacunas', function (req: any, res, next) {
    const pacienteId = req.user.pacientes[0].id;
    // primero buscar paciente
    controller.buscarPaciente(pacienteId).then(async data => {
        const pacienteMPI = data.paciente;
        let resultados = await vacunasCtr.getVacunas(pacienteMPI);
        res.json(resultados);
    });
});


/**
 * Cantidad de vacunas de un paciente
 */

router.get('/vacunas/count', async function (req: any, res, next) {
    const pacienteId = req.user.pacientes[0].id;
    // primero buscar paciente
    controller.buscarPaciente(pacienteId).then(async data => {
        let count = await vacunasCtr.getCount(data.paciente);
        res.json(count);
    });
});

module.exports = router;
