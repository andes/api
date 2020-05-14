import { Router } from 'express';
import { Types } from 'mongoose';
import { SeguimientoPaciente } from '../schemas/seguimientoPaciente';
import { Auth } from '../../../auth/auth.class';

const router = Router();

router.get('/:id?', async (req, res, next) => {
    try {
        if (Types.ObjectId.isValid(req.params.id)) {
            const seguimiento = await SeguimientoPaciente.findById(req.params.id);
            res.json(seguimiento);
        } else {
            const query = SeguimientoPaciente.find({});
            if (req.query.idPaciente) {
                query.where('paciente._id').equals(Types.ObjectId(req.query.idPaciente));
            }
            if (req.query.idProfesional) {
                query.where('profesional._id').equals(Types.ObjectId(req.query.idProfesional));
            }
            if (req.query.fechaDesde) {
                query.where('fechaDiagnostico').gte(req.query.fechaDesde);
            }
            if (req.query.fechaHasta) {
                query.where('fechaDiagnostico').lte(req.query.fechaHasta);
            }
            if (req.query.skip) {
                query.skip(parseInt(req.query.skip || 0, 10));
            }
            if (req.query.limit) {
                query.limit(parseInt(req.query.limit || 0, 10));
            }
            const seguimientos = await query.exec();
            res.json(seguimientos);
        }
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        let seguimiento = new SeguimientoPaciente(req.body);
        Auth.audit(seguimiento, req);
        seguimiento = await seguimiento.save();
        res.json(seguimiento);
    } catch (err) {
        next(err);
    }
});

export = router;
