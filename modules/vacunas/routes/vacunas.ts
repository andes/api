import * as express from 'express';
import * as vacunaCtr from '../controller/vacunas.controller';
import { asyncHandler } from '@andes/api-tool';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { Auth } from '../../../auth/auth.class';
import { vacunas as vacunasModel} from '../schemas/vacunas';
import { VacunasPacientes } from '../schemas/vacunas-pacientes.schema';

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
    const pacienteId = req.body.paciente.id;
    await vacunaCtr.exportCovid19(null, pacienteId);
    return res.json({ success: true });
}));


router.delete('/:idVacuna', Auth.authenticate(), asyncHandler(async (req: any, res, next) => {
    const idVacuna = req.params.idVacuna;
    await vacunasModel.findOneAndRemove({ idvacuna: idVacuna });
    await VacunasPacientes.findOneAndRemove({
        'paciente.id': req.query.idPaciente,
        'aplicaciones.vacuna.codigo': req.query.codigo,
        'aplicaciones.vacuna.dosis.orden' : req.query.orden
    });
    return res.json({ success: true });
}));

export const VacunasRouter = router;
