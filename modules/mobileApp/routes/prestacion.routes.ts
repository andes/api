import * as express from 'express';
import { Request, Response, asyncHandler } from '@andes/api-tool';
import { hudsPaciente } from '../../rup/controllers/prestacion';
const router = express.Router();

const getHuds = async (req: Request, res: Response) => {
    if (!req.params.idPaciente) {
        return res.status(404).send('Paciente no encontrado');
    }
    const id = req.params.idPaciente;
    const estado = req.query.estado || 'validada';
    const idPrestacion = req.query.idPrestacion || undefined;
    const deadline = req.query.deadline || undefined;
    const expresion = req.query.expresion || undefined;
    const valor = req.query.valor || undefined;

    const response = await hudsPaciente(id, estado, idPrestacion, deadline, expresion, valor);
    if (!response.prestaciones) {
        return res.status(404).send('Paciente no encontrado');
    }
    return res.json(response.huds);
};

router.get('/prestaciones/huds/:idPaciente', asyncHandler(getHuds));

export = router;

