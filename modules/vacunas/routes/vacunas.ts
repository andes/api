import * as express from 'express';
import * as vacunaCtr from '../controller/VacunaController';
import { asyncHandler } from '@andes/api-tool';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

/**
 * Obtenemos las vacunas del Paciente
 */

router.get('/paciente/:id', Auth.authenticate(), asyncHandler(async (req: any, res, next) => {
    const pacienteId = req.params.id;
    const paciente = await PacienteCtr.findById(pacienteId);
    const vacunas = await vacunaCtr.getVacunas(paciente);
    res.json(vacunas);
}));

export const VacunasRouter = router;
