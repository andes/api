import * as express from 'express';
import * as controller from './../../../core/mpi/controller/paciente';
import * as vacunasCtr from '../controller/VacunasController';
import { codes } from '../../../config';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

/**
 * Obtenemos las vacunas del Paciente App
 */

router.get('/vacunas', (req: any, res, next) => {
    const pacienteId = req.user.pacientes[0].id;
    // primero buscar paciente
    controller.buscarPaciente(pacienteId).then(async data => {
        const pacienteMPI = data.paciente;
        const resultados = await vacunasCtr.getVacunas(pacienteMPI);
        res.json(resultados);
    });
});


/**
 * Cantidad de vacunas de un paciente
 */

router.get('/vacunas/count', async (req: any, res, next) => {
    const pacienteId = req.user.pacientes[0].id;
    // primero buscar paciente
    controller.buscarPaciente(pacienteId).then(async data => {
        const count = await vacunasCtr.getCount(data.paciente);
        res.json(count);
    });
});

/**
 * Insertamos una nueva vacuna, verificando previamente que no exista en la base de datos.
 */

router.post('/nomivac', async (req: any, res, next) => {
    if (!Auth.check(req, 'vacunas:nomivac:post')) {
        return next(codes.status.unauthorized);
    }
    try {
        const vacuna = req.body;
        let result = await vacunasCtr.getVacuna(vacuna.idvacuna);
        if (!result) {
            let doc = await vacunasCtr.createVacuna(vacuna);
            return res.json(doc);
        } else {
            return res.json(result);
        }
    } catch (err) {
        return next(err);
    }

});

module.exports = router;
