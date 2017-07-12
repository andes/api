import * as express from 'express';
import { logPaciente } from '../schemas/logPaciente';

let router = express.Router();

router.get('/logPaciente/:id*?', function (req, res, next) {
    let query;
    if (req.params.id) {
        query = logPaciente.findById(req.params.id);
    } else {
        if (req.query.idPaciente) {
            query.where('paciente.id').equals(req.query.idPaciente);
        }
        if (req.query.operacion) {
            query.where('operacion').equals(req.query.operacion);
        }
    }

    // populamos los datos del paciente
    query.populate({
        path: 'paciente',
        model: 'paciente',
    });

    query.sort({ 'createdAt': -1 });

    query.exec(function (err, data) {
        if (err) {
            res.status(404).json({ message: 'Error en Log de Paciente' });
            next(404);
        };
        res.json(data);
    });
});


export = router;


