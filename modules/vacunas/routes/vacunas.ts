import * as express from 'express';
import * as vacunaCtr from '../controller/vacunas.controller';
import { asyncHandler } from '@andes/api-tool';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { Auth } from '../../../auth/auth.class';
import { vacunasApi } from '../schemas/vacunasApi';

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


router.post('/paciente', Auth.authenticate(), asyncHandler(async (req: any, res, next) => {
    try {
        const pacienteId = req.body.paciente.id;
        await vacunaCtr.exportCovid19(null, pacienteId);
        return res.json({ success: true });
    } catch (err) {
        return next(err);
    }
}));


router.delete('/:idVacuna', Auth.authenticate(), asyncHandler(async (req: any, res, next) => {
    try {
        const idVacuna = req.params.idvacuna;
        await vacunasApi.findOneAndRemove({ idvacuna: idVacuna });
        return res.json({ success: true });
    } catch (err) {
        return next(err);
    }
}));

export const VacunasRouter = router;
