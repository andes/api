import * as express from 'express';
import { Types } from 'mongoose';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { logPaciente } from '../schemas/logPaciente';

const router = express.Router();

router.get('/paciente', (req, res, next) => {
    let query;
    if ((req.params as any).id) {
        if (Types.ObjectId.isValid((req.params as any).id)) {
            query = logPaciente.findById((req.params as any).id, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        }
    } else {
        query = logPaciente.find({}); // Trae todos
        if (req.query.idPaciente as any) {
            query.where('paciente').equals(Types.ObjectId(req.query.idPaciente as any));
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

router.post('/paciente', (req, res, next) => {
    if (req.body.paciente) {
        const idPaciente = Types.ObjectId(req.body.paciente);
        const log = LoggerPaciente.logReporteError(req, req.body.operacion, idPaciente, req.body.descripcion);
        return res.json(log);
    }
    return next('Ha ocurrido un error en la operación');
});

export = router;

