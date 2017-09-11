import * as express from 'express';
import { logPaciente } from '../schemas/logPaciente';
import * as mongoose from 'mongoose';

let router = express.Router();

router.get('/paciente', function (req, res, next) {
    let query;
    if (req.params.id) {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query = logPaciente.findById(req.params.id, function (err, data) {
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
            model: 'paciente',
        });

        query.sort({ 'createdAt': -1 });

        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }

});


export = router;


