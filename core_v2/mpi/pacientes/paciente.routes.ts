import { Router , Request, Response} from 'express';
import { findById, findPaciente, search, suggest, createPaciente } from './paciente.controller';
import { mpi } from '../../../config';

const router = Router();

export const findPacientes = async (req: Request, res: Response) => {
    const id = req.params.id;
    const options = {
        fields: req.query.fields
    };
    const paciente = await findById(id, options);
    res.json(paciente);
};

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

export const postPacientes = async (req: Request, res: Response, next) => {
    const body = req.body;
    if (body.documento) {
        const sugeridos = await suggest(body);
        if (isMatchingAlto(sugeridos)) {
            return next(422);
        }
    }
    body.activo = true;
    const pacienteCreado = await createPaciente(body, req);
    res.json(pacienteCreado);
};

export const postMatch = (req, res, next) => {

};

export const putPacientes = (req, res, next) => {
    return next(500);
};

export const patchPacientes = (req, res, next) => {

};

export const deletePacientes = (req, res, next) => {

};


router.get('/pacientes', getPacientes);
router.get('/pacientes/:id', findPacientes);

export const Routing = router;
