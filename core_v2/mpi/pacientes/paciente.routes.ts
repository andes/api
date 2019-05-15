import { Router , Request, Response} from 'express';
import { findById, findPaciente, search, suggest, createPaciente, updatePaciente, savePaciente, deletePaciente } from './paciente.controller';
import { mpi } from '../../../config';
import { Auth } from '../../../auth/auth.class';
import * as asyncHandler from 'express-async-handler';

const router = Router();

/**
 * @api {get} /pacientes/:id Requiere datos de un paciente
 * @apiName findPaciente
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificaion del paciente.
 *
 * @apiSuccess {IPaciente} Datos del paciente encontrado.
 */

export const findPacientes = async (req: Request, res: Response, next) => {
    const id = req.params.id;
    const options = {
        fields: req.query.fields
    };
    const result = await findById(id, options);
    if (result) {
        return res.json(result.paciente);
    }
    return next(400);
};

/**
 * @api {get} /pacientes Busqueda de pacientes
 * @apiName getPacientes
 * @apiGroup MPI
 *
 * @apiSuccess {Array} Listado de pacientes.
 */

export const getPacientes = async (req: Request, res: Response) => {
    const options = {
        fields: req.query.fields
    };
    if (req.query.search) {
        const pacientes = await search(req.query.search);
        res.json(pacientes);
    } else {
        const conditions = req.query;
        const pacientes = await findPaciente(conditions, options.fields);
        res.json(pacientes);
    }
};

/**
 * Chequea si hay algun paciente con maching superior a la cota maxima de aceptacion.
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

export const postPacientes = async (req: Request, res: Response, next) => {
    const body = req.body;
    const sugeridos = await suggest(body);
    if (isMatchingAlto(sugeridos)) {
        return next(422);
    }
    body.activo = true; // Todo paciente esta activo por defecto
    const pacienteCreado = await createPaciente(body, req);
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
 * @apiParam {Number} ID de identificaion del paciente.
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
 * @apiParam {Number} ID de identificaion del paciente.
 * @apiSuccess {IPaciente} Paciente modificado.
 */
export const patchPacientes = async (req: Request, res: Response, next) => {
    const id = req.params.id;
    const body = req.body;
    const queryResult = await findById(id);
    if (queryResult) {
        let { paciente } = queryResult;
        if (body.estado === 'validado') {
            const sugeridos = await suggest(body);
            if (isMatchingAlto(sugeridos)) {
                return next(422);
            }
        }
        paciente = updatePaciente(paciente, body);
        const updated = await savePaciente(paciente, req);
        return res.json(updated);
    }
    return next(422);
};

/**
 * @api {delte} /pacientes/:id Borra un paciente
 * @apiName deletePacientes
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificaion del paciente.
 * @apiSuccess {boolean} true.
 */

export const deletePacientes = async (req: Request, res: Response, next) => {
    const id = req.params.id;
    const queryResult = await findById(id);
    if (queryResult) {
        let { paciente } = queryResult;
        const result = await deletePaciente(paciente, req);
        return res.json(result);
    }
    return next(422);
};

router.use(Auth.authenticate());
router.get('/pacientes', Auth.authorize('mpi:paciente:elasticSearch'), asyncHandler(getPacientes));
router.post('/pacientes', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(postPacientes));
router.post('/pacientes/match', Auth.authorize('mpi:paciente:elasticSearch'), asyncHandler(postMatch));
router.get('/pacientes/:id', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(findPacientes));
router.put('/pacientes/:id', Auth.authorize('mpi:paciente:putAndes'), asyncHandler(putPacientes));
router.patch('/pacientes/:id', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(patchPacientes));
router.delete('/pacientes/:id', Auth.authorize('mpi:paciente:deleteAndes'), asyncHandler(deletePacientes));

export const Routing = router;
