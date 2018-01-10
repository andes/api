import * as express from 'express';
import * as vacunasCtr from '../../mobileApp/controller/VacunasController';
import * as controller from './../../../core/mpi/controller/paciente';

let router = express.Router();

router.get('/huds/vacunas', (req, res, next) => {
    let pacienteId = req.query.idPaciente;

    controller.buscarPaciente(pacienteId).then(async data => {
        const pacienteMPI = data.paciente;
        let resultados = await vacunasCtr.getVacunas(pacienteMPI);
        res.json(resultados);
    });
});

export = router;
