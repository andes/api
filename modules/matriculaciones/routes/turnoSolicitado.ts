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
        let solicitud = null;
        if (profesional?._id) {
            req.body._id = profesional._id;
            req.body.profesionalMatriculado = true;
            solicitud = await turnoSolicitado.findOne({ _id: profesional._id });
        }
        // genera otro documento
        if (!solicitud) {
            solicitud = new turnoSolicitado(req.body);
        } else {
            solicitud.set(req.body);
        }
        Auth.audit(solicitud, userScheduler as any);
        const saved = await solicitud.save();
        res.json(saved);
    } catch (err) {
        matriculacionLog.error('matriculaciones:turnoSolicitados', req.body, err.errors);
        return next('error-turno');
    }
});

router.get('/turnoSolicitados/:id', async (req: any, res, next) => {
    const id = req.params.id;
    try {
        const turno = await turnoSolicitado.find({ _id: id });
        res.json(turno[0]);
    } catch (err) {
        matriculacionLog.error('turnoSolicitados:id', req.params.id, err.errors);
        return next(err);
    }
});

export = router;
