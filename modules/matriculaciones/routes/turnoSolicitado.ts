import * as express from 'express';
import { turnoSolicitado } from '../schemas/turnoSolicitado';

// import{ profesional } from '../../../core/tm/schemas/profesional'


const router = express.Router();

router.post('/turnoSolicitados', (req, res, next) => {

    // // // if (!Auth.check(req, 'matriculaciones:profesional:postProfesional')) {
    // // //     return next(403);
    // // // }
    const newProfesional = new turnoSolicitado(req.body);
    newProfesional.save((err2) => {
        if (err2) {
            next(err2);
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
