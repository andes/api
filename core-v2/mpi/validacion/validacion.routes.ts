import { Router, Request, Response } from 'express';
import { Auth } from '../../../auth/auth.class';
import { validar as validarPaciente } from './validacion.controller';
import { ValidacionFailed } from './validacion.error';
import { asyncHandler } from '@andes/api-tool';
import { status, checkStatus } from '@andes/fuentes-autenticas';
import { sisa as sisaConfig, busInteroperabilidad } from '../../../config.private';

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

export const renaperStatus = async (req: Request, res: Response) => {
    const response = await status(busInteroperabilidad as any);
    return (response) ? res.json(200) : res.json(500);
};

export const sisaStatus = async (req: Request, res: Response) => {
    try {
        const url = `${sisaConfig.url}&usuario=${sisaConfig.username}&clave=${sisaConfig.password}`;
        const response = await checkStatus(url);
        return res.json(response);
    } catch (error) {
        return res.json(500);
    }
};
const router = Router();
router.use(Auth.authenticate());
/**
 * [TODO] Ver tema de permisos
 */
router.post('/validacion', Auth.authorize('fa:get:renaper'), asyncHandler(postValidar));
router.get('/renaper/status', Auth.authorize('fa:get:renaper'), asyncHandler(renaperStatus));
router.get('/sisa/status', Auth.authorize('fa:get:sisa'), asyncHandler(sisaStatus));


export const Routing = router;
