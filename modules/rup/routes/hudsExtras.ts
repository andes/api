import * as express from 'express';
import { VacunasController } from '../../../apps/mobile-app';
import * as controller from './../../../core/mpi/controller/paciente';

const router = express.Router();

router.get('/huds/vacunas', (req, res) => {
    const pacienteId = req.query.idPaciente;

    controller.buscarPaciente(pacienteId).then(async data => {
        const pacienteMPI = data.paciente;
        const resultados = await VacunasController.getVacunas(pacienteMPI);
        res.json(resultados);
    });
});

export = router;
