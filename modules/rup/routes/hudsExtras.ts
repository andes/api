import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import * as express from 'express';
import * as vacunasCtr from '../../mobileApp/controller/VacunasController';

const router = express.Router();

router.get('/huds/vacunas', async (req, res) => {
    const paciente = await PacienteCtr.findById(req.query.idPaciente);
    const vacunas = await vacunasCtr.getVacunas(paciente);
    res.json(vacunas);
});

export = router;
