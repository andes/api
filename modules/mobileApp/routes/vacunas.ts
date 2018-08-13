import * as express from 'express';
import * as controller from './../../../core/mpi/controller/paciente';
import * as vacunasCtr from '../controller/VacunasController';

let router = express.Router();

/**
 * Obtenemos las vacunas del Paciente App
 */

router.get('/vacunas', (req: any, res, next) => {
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

router.get('/vacunas/count', async (req: any, res, next) => {
    const pacienteId = req.user.pacientes[0].id;
    // primero buscar paciente
    controller.buscarPaciente(pacienteId).then(async data => {
        let count = await vacunasCtr.getCount(data.paciente);
        res.json(count);
    });
});

module.exports = router;
