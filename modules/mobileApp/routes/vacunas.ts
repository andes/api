import * as express from 'express';
import * as controller from './../../../core/mpi/controller/paciente';
import * as vacunasCtr from '../controller/VacunasController';
import { Auth } from '../../../auth/auth.class';
import * as HttpStatus from 'http-status-codes';

const router = express.Router();

/**
 * Obtenemos las vacunas del Paciente App
 */

router.get('/vacunas', Auth.authenticate(), (req: any, res, next) => {
    try {
        const pacienteId = req.user.pacientes[0].id;
        controller.buscarPaciente(pacienteId).then(async data => {
            const pacienteMPI = data.paciente;
            const resultados = await vacunasCtr.getVacunas(pacienteMPI);
            return res.json(resultados);
        });
    } catch (err) {
        // TODO agregar andesLog
        return next(err);
    }
});


/**
 * Cantidad de vacunas de un paciente
 */

router.get('/vacunas/count', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const pacienteId = req.user.pacientes[0].id;
        controller.buscarPaciente(pacienteId).then(async data => {
            const count = await vacunasCtr.getCount(data.paciente);
            return res.json(count);
        });
    } catch (err) {
        // TODO agregar andesLog
        return next(err);
    }
});

/**
 * Insertamos una nueva vacuna, verificando previamente que no exista en la base de datos.
 */

router.post('/nomivac', Auth.authenticate(), async (req: any, res, next) => {
    if (!Auth.check(req, 'vacunas:nomivac:post')) {
        return next(HttpStatus.UNAUTHORIZED);
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
