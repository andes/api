import { Profesional } from '../../../core/tm/schemas/profesional';
import * as express from 'express';
import { turnoSolicitado } from '../schemas/turnoSolicitado';
import { Auth } from '../../../auth/auth.class';
import { userScheduler } from '../../../config.private';
import { matriculacionLog } from '../controller/matriculaciones.log';
const router = express.Router();

router.post('/turnoSolicitados', async (req, res, next) => {
    const doc = req.body.documento;
    const sexo = req.body.sexo;
    try {
        const profesional = await Profesional.findOne({ documento: doc, sexo, profesionalMatriculado: false });
        if (profesional?._id) {
            req.body._id = profesional._id;
            req.body.profesionalMatriculado = true;
        }
        const newProfesional = new turnoSolicitado(req.body);
        Auth.audit(newProfesional, userScheduler as any);
        const saved = await newProfesional.save();
        res.json(saved);
    } catch (err) {
        matriculacionLog.error('matriculaciones:turnoSolicitados', req.body, err);
        return next('error-turno');
    }
});

router.get('/turnoSolicitados/traePDni/:dni*?', async (req: any, res, next) => {
    const dni = req.params.dni;
    try {
        const turno = await turnoSolicitado.find({ _id: dni });
        res.json(turno[0]);
    } catch (err) {
        return next(err);
    }
});

export = router;
