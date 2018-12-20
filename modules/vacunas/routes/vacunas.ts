import * as express from 'express';
import * as pacienteCtr from './../../../core/mpi/controller/paciente';
import * as vacunaCtr from '../controller/VacunaController';

const router = express.Router();

/**
 * Obtenemos las vacunas del Paciente
 */

router.get('/paciente/:id', (req: any, res, next) => {
    const pacienteId = req.params.id;
    pacienteCtr.buscarPaciente(pacienteId).then(async data => {
        const pacienteMPI = data.paciente;
        const resultados = await vacunaCtr.getVacunas(pacienteMPI);
        res.json(resultados);
    });
});

export = router;
