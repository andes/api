import { Router, Request, Response } from 'express';
import { findById, findPaciente, search, suggest, newPaciente, updatePaciente, storePaciente, deletePaciente } from './paciente.controller';
import { mpi } from '../../../config';
import { Auth } from '../../../auth/auth.class';
import * as asyncHandler from 'express-async-handler';
import { PatientNotFound, PatientDuplicate } from './paciente.error';
import { ContactoRoutes } from './contactos/contacto.routes';
import { contactoController } from './contactos/contacto.controller';
import { direccionController } from './direcciones/direccion.controller';
import { DireccionRoutes } from './direcciones/direccion.routes';


/**
 * @api {get} /pacientes/:id Requiere datos de un paciente
 * @apiName findPaciente
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificación del paciente.
 *
 * @apiSuccess {IPaciente} Datos del paciente encontrado.
 */

export const findPacientes = async (req: Request, res: Response) => {
    const id = req.params.id;
    const options = {
        fields: req.query.fields
    };
    const paciente = await findById(id, options);
    if (paciente) {
        return res.json(paciente);
    }
    throw new PatientNotFound();
};

/**
 * @api {get} /pacientes Búsqueda de pacientes
 * @apiName getPacientes
 * @apiGroup MPI
 *
 * @apiSuccess {Array} Listado de pacientes.
 */

export const getPacientes = async (req: Request, res: Response) => {
    const options = {
        fields: req.query.fields,
        skip: req.query.skip,
        limit: req.query.limit
    };
    if (req.query.search) {
        const pacientes = await search(req.query.search);
        res.json(pacientes);
    } else {
        const conditions = req.query;
        const pacientes = await findPaciente(conditions, options);
        res.json(pacientes);
    }
};

/**
 * Chequea si hay algún paciente con matching superior a la cota máxima de aceptación.
 */

function isMatchingAlto(sugeridos: any[]) {
    return sugeridos.some((paciente) => paciente._score > mpi.cotaMatchMax);
}

/**
 * @api {post} /pacientes Creación de un paciente
 * @apiName postPacientes
 * @apiGroup MPI
 *
 * @apiSuccess {IPaciente} Paciente creado.
 */

export const postPacientes = async (req: Request, res: Response) => {
    const body = req.body;
    const sugeridos = await suggest(body);
    if (isMatchingAlto(sugeridos)) {
        throw new PatientDuplicate();
    }

    body.activo = true; // Todo paciente esta activo por defecto
    const paciente = newPaciente(body);
    const pacienteCreado = await storePaciente(paciente, req);
    res.json(pacienteCreado);
};

/**
 * @api {post} /pacientes/match Búsqueda de pacientes similares
 * @apiName postMatch
 * @apiGroup MPI
 *
 * @apiSuccess {Array} Listado de pacientes similares.
 */

export const postMatch = async (req: Request, res: Response) => {
    const body = req.body;
    const sugeridos = await suggest(body);
    res.json(sugeridos);
};

/**
 * @api {put} /pacientes/:id Modifica un paciente
 * @apiName putPacientes
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificación del paciente.
 * @apiSuccess {IPaciente} Listado de pacientes similares.
 */

export const putPacientes = (req, res, next) => {
    return next(500);
};

/**
 * @api {patch} /pacientes/:id Actualización de pacientes
 * @apiName patchPacientes
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificación del paciente.
 * @apiSuccess {IPaciente} Paciente modificado.
 */
export const patchPacientes = async (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body;
    let paciente = await findById(id);
    if (paciente) {
        if (body.estado === 'validado') {
            const sugeridos = await suggest(body);
            if (isMatchingAlto(sugeridos)) {
                throw new PatientDuplicate();
            }
        }
        paciente = updatePaciente(paciente, body);
        const updated = await storePaciente(paciente, req);
        return res.json(updated);
    }
    throw new PatientNotFound();
};

/**
 * @api {delte} /pacientes/:id Borra un paciente
 * @apiName deletePacientes
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificación del paciente.
 * @apiSuccess {boolean} true.
 */

export const deletePacientes = async (req: Request, res: Response) => {
    const id = req.params.id;
    const paciente = await findById(id);
    if (paciente) {
        const result = await deletePaciente(paciente, req);
        return res.json(result);
    }
    throw new PatientNotFound();
};

const router = Router();
router.use(Auth.authenticate());
router.get('/pacientes', Auth.authorize('mpi:paciente:elasticSearch'), asyncHandler(getPacientes));
router.post('/pacientes', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(postPacientes));
router.post('/pacientes/match', Auth.authorize('mpi:paciente:elasticSearch'), asyncHandler(postMatch));
router.get('/pacientes/:id', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(findPacientes));
router.patch('/pacientes/:id', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(patchPacientes));
router.put('/pacientes/:id', Auth.authorize('mpi:paciente:putAndes'), asyncHandler(putPacientes));
router.delete('/pacientes/:id', Auth.authorize('mpi:paciente:deleteAndes'), asyncHandler(deletePacientes));


let contactoRouting = new ContactoRoutes(contactoController);
router.use('/pacientes', contactoRouting.getRoutes());

let direccionRouting = new DireccionRoutes(direccionController);
router.use('/pacientes', direccionRouting.getRoutes());

export const Routing = router;
