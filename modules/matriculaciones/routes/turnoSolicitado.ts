import { Profesional } from '../../../core/tm/schemas/profesional';
import * as express from 'express';
import { turnoSolicitado } from '../schemas/turnoSolicitado';

const router = express.Router();

router.post('/turnoSolicitados', async (req, res, next) => {
    const doc = req.body.documento;
    const sexo = req.body.sexo;
    const profesional = await Profesional.findOne({ documento: doc, sexo, profesionalMatriculado: false });
    if (profesional && profesional._id) {
        req.body._id = profesional._id;
        req.body.profesionalMatriculado = true;
    }
    const newProfesional = new turnoSolicitado(req.body);
    newProfesional.save((error) => {
        if (error) {
            return next(error);
        }
        res.json(newProfesional);
    });
});

router.get('/turnoSolicitados/traePDni/:dni*?', (req: any, res, next) => {
    const dni = req.params.dni;
    turnoSolicitado.find({ _id: dni }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data[0]);
    });

});

export = router;
