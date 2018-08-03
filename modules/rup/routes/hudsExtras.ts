import * as express from 'express';
import { Controllers as MobileController } from '../../../apps/mobile-app';
import * as controller from './../../../core/mpi/controller/paciente';

let router = express.Router();

router.get('/huds/vacunas', (req, res) => {
    let pacienteId = req.query.idPaciente;

    controller.buscarPaciente(pacienteId).then(async data => {
        const pacienteMPI = data.paciente;
        let resultados = await MobileController.VacunasController.getVacunas(pacienteMPI);
        res.json(resultados);
    });
});

export = router;
