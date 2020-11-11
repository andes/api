import { Router, Request, Response } from 'express';
import { Auth } from '../../../auth/auth.class';
import { validar as validarPaciente } from './validacion.controller';
import { ValidacionFailed } from './validacion.error';
import { asyncHandler } from '@andes/api-tool';

/**
 * @api {post} /validacion/ Requiere datos de un paciente
 * @apiName validacion
 * @apiGroup MPI
 *
 *
 * @apiSuccess {IPaciente} Datos del ciudadano encontrado.
 */

export const postValidar = async (req: Request, res: Response) => {
    const { documento, sexo } = req.body;
    if (documento && sexo) {
        const paciente = await validarPaciente(req.body.documento, req.body.sexo);
        if (paciente) {
            return res.json(paciente);
        }
    }
    throw new ValidacionFailed();
};

const router = Router();
router.use(Auth.authenticate());
/**
 * [TODO] Ver tema de permisos
 */
router.post('/validacion', Auth.authorize('fa:get:renaper'), asyncHandler(postValidar));


export const Routing = router;
