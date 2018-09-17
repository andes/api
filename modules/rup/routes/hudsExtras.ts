import * as express from 'express';
import * as vacunasCtr from '../../mobileApp/controller/VacunasController';
import * as controller from './../../../core/mpi/controller/paciente';

const router = express.Router();

router.get('/huds/vacunas', (req, res) => {
    const pacienteId = req.query.idPaciente;

    controller.buscarPaciente(pacienteId).then(async data => {
        const pacienteMPI = data.paciente;
        const resultados = await vacunasCtr.getVacunas(pacienteMPI);
        res.json(resultados);
    });
});

export = router;
