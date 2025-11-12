import * as express from 'express';
import { Types } from 'mongoose';
import { ResumenController } from './resumen.controller';

const router = express.Router();

router.get('/:idPaciente', async (req: any, res) => {
    if (!Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Paciente no encontrado');
    }

    const resultado = await ResumenController.contarRegistros(req.params.idPaciente);

    return res.json(resultado);
});

export const ResumenHuds = router;

