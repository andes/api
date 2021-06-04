import * as express from 'express';
import { logPaciente } from '../schemas/logPaciente';
import * as mongoose from 'mongoose';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';

const router = express.Router();

router.get('/paciente', (req, res, next) => {
    let query;
    if (req.params.id) {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query = logPaciente.findById(req.params.id, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        }
    } else {
        query = logPaciente.find({}); // Trae todos
        if (req.query.idPaciente) {
            query.where('paciente').equals(mongoose.Types.ObjectId(req.query.idPaciente));
        }
        if (req.query.operacion) {
            query.where('operacion').equals(req.query.operacion);
        }
        // populamos los datos del paciente
        query.populate({
            path: 'paciente',
            model: Paciente,
        });

        query.sort({ createdAt: -1 });

        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }

});


export = router;

