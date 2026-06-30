import * as express from 'express';
import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { asyncHandler } from '@andes/api-tool';
import { situacionesActivas, antecedentesPersonales, antecedentesFamiliares } from './hudsSituaciones.controller';

const router = express.Router();

router.use(Auth.authenticate());

router.get('/:idPaciente/situacionesActivas', asyncHandler(async (req: any, res) => {
    if (!Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Paciente no encontrado');
    }
    const result = await situacionesActivas(req.params.idPaciente);
    if (!result) {
        return res.status(404).send('Paciente no encontrado');
    }
    res.json(result);
}));

router.get('/:idPaciente/antecedentesPersonales', asyncHandler(async (req: any, res) => {
    if (!Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Paciente no encontrado');
    }
    const result = await antecedentesPersonales(req.params.idPaciente);
    if (!result) {
        return res.status(404).send('Paciente no encontrado');
    }
    res.json(result);
}));

router.get('/:idPaciente/AntecedentesFamiliares', asyncHandler(async (req: any, res) => {
    if (!Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Paciente no encontrado');
    }
    const result = await antecedentesFamiliares(req.params.idPaciente);
    if (!result) {
        return res.status(404).send('Paciente no encontrado');
    }
    res.json(result);
}));

export const HudsSituacionesRouter = router;
