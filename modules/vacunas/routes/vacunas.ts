import * as express from 'express';
import * as pacienteCtr from './../../../core/mpi/controller/paciente';
import * as vacunaCtr from '../controller/VacunaController';
import { asyncHandler } from '@andes/api-tool';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';

const router = express.Router();

/**
 * Obtenemos las vacunas del Paciente
 */

router.get('/paciente/:id', asyncHandler(async (req: any, res, next) => {
    const pacienteId = req.params.id;
    const paciente = await PacienteCtr.findById(pacienteId);
    const vacunas = await vacunaCtr.getVacunas(paciente);
    res.json(vacunas);
}));

export = router;
