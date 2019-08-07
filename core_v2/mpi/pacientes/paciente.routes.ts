import { asyncHandler, Request, Response, Router } from '@andes/api';
import { PacienteCtr } from './paciente.controller';
import { mpi } from '../../../config';
import { Auth } from '../../../auth/auth.class';
import { PatientNotFound, PatientDuplicate } from './paciente.error';
import { ContactoRoutes } from './contactos/contacto.routes';
import { contactoController } from './contactos/contacto.controller';
import { direccionController } from './direcciones/direccion.controller';
import { DireccionRoutes } from './direcciones/direccion.routes';
import { relacionController } from './relaciones/relaciones.controller';
import { RelacionRoutes } from './relaciones/relaciones.routes';


/**
 * @api {get} /pacientes/:id Requiere datos de un paciente
 * @apiName findPaciente
 * @apiGroup MPI
 *
 * @apiParam {Number} ID de identificación del paciente.
 *
 * @apiSuccess {IPaciente} Datos del paciente encontrado.
 */

export const find = async (req: Request, res: Response) => {
    const id = req.params.id;
    const options = req.apiOptions();
    const paciente = await PacienteCtr.findById(id, options);
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

export const get = async (req: Request, res: Response) => {
    const options = req.apiOptions();
    if (req.query.search) {
        const pacientes = await PacienteCtr.search(req.query.search);
        res.json(pacientes);
    } else {
        const conditions = req.query;
        const pacientes = await PacienteCtr.find(conditions, options);
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

export const post = async (req: Request, res: Response) => {
    const body = req.body;
    const sugeridos = await PacienteCtr.suggest(body);
    if (isMatchingAlto(sugeridos)) {
        throw new PatientDuplicate();
    }

    body.activo = true; // Todo paciente esta activo por defecto
    const paciente = PacienteCtr.make(body);
    const pacienteCreado = await PacienteCtr.store(paciente, req);
    res.json(pacienteCreado);
};

/**
 * @api {post} /pacientes/match Búsqueda de pacientes similares
 * @apiName postMatch
 * @apiGroup MPI
 *
 * @apiSuccess {Array} Listado de pacientes similares.
 */

export const match = async (req: Request, res: Response) => {
    const body = req.body;
    const sugeridos = await PacienteCtr.suggest(body);
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

export const put = (req, res, next) => {
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
export const patch = async (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body;
    let paciente = await PacienteCtr.findById(id);
    if (paciente) {
        if (body.estado === 'validado') {
            const sugeridos = await PacienteCtr.suggest(body);
            if (isMatchingAlto(sugeridos)) {
                throw new PatientDuplicate();
            }
        }
        paciente = PacienteCtr.set(paciente, body);
        const updated = await PacienteCtr.store(paciente, req);
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

export const remove = async (req: Request, res: Response) => {
    const id = req.params.id;
    const paciente = await PacienteCtr.findById(id);
    if (paciente) {
        const result = await PacienteCtr.remove(paciente, req);
        return res.json(result);
    }
    throw new PatientNotFound();
};

const router = Router();
router.use(Auth.authenticate());
router.get('/pacientes', Auth.authorize('mpi:paciente:elasticSearch'), asyncHandler(get));
router.post('/pacientes', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(post));
router.post('/pacientes/match', Auth.authorize('mpi:paciente:elasticSearch'), asyncHandler(match));
router.get('/pacientes/:id', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(find));
router.patch('/pacientes/:id', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(patch));
router.put('/pacientes/:id', Auth.authorize('mpi:paciente:putAndes'), asyncHandler(put));
router.delete('/pacientes/:id', Auth.authorize('mpi:paciente:deleteAndes'), asyncHandler(remove));


const contactoRouting = new ContactoRoutes(PacienteCtr, contactoController);
router.use('/pacientes', contactoRouting.getRoutes());

const direccionRouting = new DireccionRoutes(PacienteCtr, direccionController);
router.use('/pacientes', direccionRouting.getRoutes());

const relacionRouting = new RelacionRoutes(PacienteCtr, relacionController);
router.use('/pacientes', relacionRouting.getRoutes());

export const Routing = router;
