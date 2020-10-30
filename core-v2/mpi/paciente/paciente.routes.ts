import { MongoQuery, ResourceBase } from '@andes/core';
import { Request, Response, asyncHandler } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';
import { Paciente } from './paciente.schema';
import { suggest, isMatchingAlto, multimatch, make, findById, set } from './paciente.controller';
import * as mongoose from 'mongoose';
import { PatientDuplicate, PatientNotFound } from './paciente.error';
import { EventCore } from '@andes/event-bus';
import { IPacienteDoc } from './paciente.interface';

class PacienteResource extends ResourceBase<IPacienteDoc> {
    Model = Paciente;
    resourceModule = 'mpi';
    resourceName = 'pacientes';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('mpi:paciente:getbyId'),
        search: Auth.authorize('mpi:paciente:search'),
        post: Auth.authorize('mpi:paciente:postAndes'),
        put: Auth.authorize('mpi:paciente:putAndes'),
        patch: Auth.authorize('mpi:paciente:patchAndes'),
        delete: Auth.authorize('mpi:paciente:deleteAndes')
    };
    searchFileds = {
        ids: MongoQuery.inArray.withField('_id'),
        documento: MongoQuery.partialString,
        nombre: MongoQuery.partialString,
        apellido: MongoQuery.partialString,
        sexo: MongoQuery.equalMatch,
        activo: MongoQuery.equalMatch,
        reportarError: MongoQuery.equalMatch,
        estado: MongoQuery.equalMatch,
        certificadoRenaper: MongoQuery.equalMatch,
        tokens: MongoQuery.partialString,
        identificadores: {
            field: 'identificadores.entidad',
            fn: (value) => {
                return { $in: value };
            }
        },
        identificador: (value) => {
            return MongoQuery.queryArray('contacto', value, 'entidad', 'valor');
        },
        relaciones: (value) => {
            return MongoQuery.queryArray('relaciones', value, 'relacion.nombre', 'referencia');
        },
        barrio: {
            field: 'direccion.ubicacion.barrio.nombre',
            fn: MongoQuery.partialString
        },
        localidad: {
            field: 'direccion.ubicacion.localidad.nombre',
            fn: MongoQuery.partialString
        },
        provincia: {
            field: 'direccion.ubicacion.provincia.nombre',
            fn: MongoQuery.partialString
        },
        pais: {
            field: 'direccion.ubicacion.pais.nombre',
            fn: MongoQuery.partialString
        },
        nacionalidad: MongoQuery.partialString,
        email: (value) => {
            return MongoQuery.queryArray('contacto', [`email|${value}`], 'tipo', 'valor');
        },
        celular: (value) => {
            return MongoQuery.queryArray('contacto', [`celular|${value}`], 'tipo', 'valor');
        },
        fijo: (value) => {
            return MongoQuery.queryArray('contacto', [`fijo|${value}`], 'tipo', 'valor');
        },
        fechaUpdate: {
            field: 'updatedAt',
            fn: (value) => (MongoQuery.matchDate(value))
        },
        fechaNacimiento: {
            field: 'fechaNacimiento',
            fn: (value) => (MongoQuery.matchDate(value))
        },
        search: ['documento', 'nombre', 'apellido', 'sexo', 'certificadoRenaper']
    };
    eventBus = EventCore;
}

export const PacienteCtr = new PacienteResource({});
export const PacienteRouter = PacienteCtr.makeRoutes();

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

export const get = async (req: Request, res: Response) => {
    const options = req.apiOptions();
    if (req.query.search) {
        let conditions = req.query;
        delete conditions.search;
        const pacientes = await multimatch(req.query.search, conditions, options);
        res.json(pacientes);
    } else {
        const conditions = req.query;
        const pacientes = await PacienteCtr.search(conditions, options, req);
        res.json(pacientes);
    }
};

/**
 * @api {get} /pacientes/:id/foto
 * @apiName getPacientesFoto
 * @apiGroup MPI
 *
 * @apiSuccess {String}  Imagen del paciente.
 */


export const getFoto = async (req: Request, res: Response, next) => {
    const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);
    }
    const pacienteBuscado: any = await Paciente.findById(req.params.id);
    if (pacienteBuscado) {
        if (!pacienteBuscado.foto) {
            res.writeHead(200, {
                'Content-Type': 'image/svg+xml'
            });
            return res.end('<svg version="1.1" id="Layer_4" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="480px" height="535px" viewBox="0 0 480 535" enable-background="new 0 0 480 535" xml:space="preserve"><g id="Layer_3"><linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="240" y1="535" x2="240" y2="4.882812e-04"><stop  offset="0" style="stop-color:#C5C5C5"/><stop  offset="1" style="stop-color:#9A9A9A"/></linearGradient><rect fill="url(#SVGID_1_)" width="480" height="535"/></g><g id="Layer_2"><path fill="#FFFFFF" d="M347.5,250c0,59.375-48.125,107.5-107.5,107.5c-59.375,0-107.5-48.125-107.5-107.5c0-59.375,48.125-107.5,107.5-107.5C299.375,142.5,347.5,190.625,347.5,250z"/><path fill="#FFFFFF" d="M421.194,535C413.917,424.125,335.575,336.834,240,336.834c-95.576,0-173.917,87.291-181.194,198.166H421.194z"/></g></svg>');
        }
        const imagen = pacienteBuscado.foto;
        const imageMatch = imagen.match(base64RegExp);
        const mimeType = imageMatch[1];
        const data = imageMatch[2];
        const imgStream = Buffer.from(data, 'base64');

        res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Length': imgStream.length
        });
        res.end(imgStream);
    }

    throw new PatientNotFound();

};

/**
 * @api {post} /pacientes Creación de un paciente
 * @apiName postPacientes
 * @apiGroup MPI
 *
 * @apiSuccess {IPaciente} Paciente creado.
 */

export const post = async (req: Request, res: Response) => {
    const body = req.body;
    const sugeridos = await suggest(body);
    if (isMatchingAlto(sugeridos)) {
        throw new PatientDuplicate();
    }

    body.activo = true; // Todo paciente esta activo por defecto
    const paciente = make(body);
    const pacienteCreado = await PacienteCtr.create(paciente, req);
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
    const sugeridos = await suggest(body);
    res.json(sugeridos);
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
    let paciente = await findById(id);
    if (paciente) {
        paciente = set(paciente, body);
        const updated = await PacienteCtr.update(id, paciente, req);
        return res.json(updated);
    }
    throw new PatientNotFound();
};

PacienteRouter.use(Auth.authenticate());
PacienteRouter.get('/pacientes', Auth.authorize('mpi:paciente:search'), asyncHandler(get));
PacienteRouter.get('/pacientes/:id', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(find));
PacienteRouter.get('/pacientes/:id/foto', Auth.authorize('mpi:paciente:getbyId'), asyncHandler(getFoto));
PacienteRouter.post('/pacientes', Auth.authorize('mpi:paciente:postAndes'), asyncHandler(post));
PacienteRouter.post('/pacientes/match', Auth.authorize('mpi:paciente:search'), asyncHandler(match));
PacienteRouter.patch('/pacientes/:id', Auth.authorize('mpi:paciente:patchAndes'), asyncHandler(patch));
