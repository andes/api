import * as express from 'express';
import { Request, Response, asyncHandler } from '@andes/api-tool';
import { hudsPaciente } from '../../rup/controllers/prestacion';
const router = express.Router();

const getHuds = async (req: Request, res: Response) => {
    if (!req.params.idPaciente) {
        return res.status(404).send('Paciente no encontrado');
    }
    const id = req.params.idPaciente as any;
    const estado = req.query.estado as any || 'validada';
    const idPrestacion = req.query.idPrestacion as any || undefined;
    const deadline = req.query.deadline as any || undefined;
    const expresion = req.query.expresion as any || undefined;
    const valor = req.query.valor as any || undefined;

    const response = await hudsPaciente(id, estado, idPrestacion, deadline, expresion, valor);
    if (!response) {
        return res.status(404).send('Paciente no encontrado');
    }
    return res.json(response);
};

router.get('/prestaciones/huds/:idPaciente', asyncHandler(getHuds));

export = router;

