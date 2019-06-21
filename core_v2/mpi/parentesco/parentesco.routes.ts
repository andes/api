
import { asyncHandler, Router, Request, Response } from '@andes/api';
import { ParentescoCtr } from './parentesco.controller';
import { ParentescoNotFound } from './parentesco.error';
import { Auth } from '../../../auth/auth.class';

/**
 * @api {get} /parentesco/:id devuelve un parentesco por ID
 * @apiName find
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificación del paciente.
 *
 * @apiSuccess {object} Datos del paciente encontrado.
 */

export const find = async (req: Request, res: Response) => {
    const id = req.params.id;
    const options = req.apiOptions();
    const paciente = await ParentescoCtr.findById(id, options);
    if (paciente) {
        return res.json(paciente);
    }
    throw new ParentescoNotFound();
};

/**
 * @api {get} /pacientes Búsqueda de parentescos
 * @apiName getPacientes
 * @apiGroup MPI
 *
 * @apiSuccess {Array} Listado de pacientes.
 */

export const get = async (req: Request, res: Response) => {
    const options = req.apiOptions();
    const conditions = req.query;
    const pacientes = await ParentescoCtr.find(conditions, options);
    res.json(pacientes);
};

const router = Router();
router.use(Auth.authenticate());
router.get('/parentescos', asyncHandler(get));
router.get('/parentescos/:id', asyncHandler(find));
export const Routing = router;
