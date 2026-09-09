import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { getEstudiosComplementarios } from './estudios-complementarios.controller';

const router = express.Router();

router.get('/paciente/:idPaciente', Auth.authenticate(), async (req: any, res) => {
    try {
        const idPaciente = req.params.idPaciente;
        const options = {
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta
        };
        const resultado = await getEstudiosComplementarios(idPaciente, options);
        return res.json(resultado);
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/:idPaciente', Auth.authenticate(), async (req: any, res) => {
    try {
        const idPaciente = req.params.idPaciente;
        const options = {
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta
        };
        const resultado = await getEstudiosComplementarios(idPaciente, options);
        return res.json(resultado);
    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
});

export const EstudiosComplementariosRouter = router;
