import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { Paciente } from './paciente.schema';
import * as controller from './paciente.controller';
import * as mongoose from 'mongoose';
import { PatientDuplicate, PatientNotFound } from './paciente.error';

class PacienteResource extends ResourceBase {
    Model = Paciente;
    resourceName = 'paciente';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('mpi:paciente:getbyId'),
        search: Auth.authorize('mpi:paciente:search'),
        post: Auth.authorize('mpi:paciente:postAndes'),
        put: Auth.authorize('mpi:paciente:putAndes'),
        patch: Auth.authorize('mpi:paciente:patchAndes')
    };
    searchFileds = {
        documento: MongoQuery.partialString,
        nombre: MongoQuery.partialString,
        apellido: MongoQuery.partialString,
        sexo: MongoQuery.equalMatch,
        activo: MongoQuery.equalMatch,
        reportarError: MongoQuery.equalMatch,
        search: (value) => {
            return {
                $or: [
                    { documento: MongoQuery.partialString(value) },
                    { nombre: MongoQuery.partialString(value) },
                    { apellido: MongoQuery.partialString(value) },
                    { sexo: MongoQuery.equalMatch(value) }
                ]
            };
        }
    };
}

export const PacienteCtr = new PacienteResource({});
export const PacienteRouter = PacienteCtr.makeRoutes();


PacienteRouter.post('/paciente/match', Auth.authenticate(), async (req: any, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:getMatch')) {
        return next(403);
    }
    let query;
    let resultado;

    switch (req.body.type) {
        case 'multimatch':
            const limit = req.body.limit || 30;
            const skip = req.body.skip || 0;
            const words = req.body.cadenaInput.split(' ');
            const ngSize = (words.length === 1) ? words[0].length : 2;
            resultado = await Paciente.fuzzySearch({ query: req.body.cadenaInput, prefixOnly: true, minSize: ngSize }, { activo: { $eq: true } }).limit(limit).skip(skip);
            if (words.length > 1) {
                words.forEach(word => {
                    resultado = resultado.filter(pac => (pac.nombreCompleto as string).toUpperCase().includes(word.toUpperCase()));
                });
            }
            break;
        case 'suggest':
            query = {
                documento: req.body.documento,
                apellido: req.body.apellido,
                nombre: req.body.nombre,
                sexo: req.body.sexo,
                fechaNacimiento: req.body.fechaNacimiento
            };
            resultado = await controller.suggest(query);
            break;
    }
    resultado = resultado.map(elto => {
        const item = JSON.parse(JSON.stringify(elto));
        delete item.foto;
        item._score = elto._score;
        return item;
    });
    res.json(resultado);
});


PacienteRouter.get('/paciente/:id/foto', Auth.authenticate(), async (req, res, next) => {
    const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);
    }
    try {
        const pacienteBuscado: any = await Paciente.findById(req.params.id);
        if (pacienteBuscado) {
            if (!pacienteBuscado.foto) {
                res.writeHead(200, {
                    'Content-Type': 'image/svg+xml'
                });
                return res.end('<svg version="1.1" id="Layer_4" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="480px" height="535px" viewBox="0 0 480 535" enable-background="new 0 0 480 535" xml:space="preserve"><g id="Layer_3"><linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="240" y1="535" x2="240" y2="4.882812e-04"><stop  offset="0" style="stop-color:#C5C5C5"/><stop  offset="1" style="stop-color:#9A9A9A"/></linearGradient><rect fill="url(#SVGID_1_)" width="480" height="535"/></g><g id="Layer_2"><path fill="#FFFFFF" d="M347.5,250c0,59.375-48.125,107.5-107.5,107.5c-59.375,0-107.5-48.125-107.5-107.5c0-59.375,48.125-107.5,107.5-107.5C299.375,142.5,347.5,190.625,347.5,250z"/><path fill="#FFFFFF" d="M421.194,535C413.917,424.125,335.575,336.834,240,336.834c-95.576,0-173.917,87.291-181.194,198.166H421.194z"/></g></svg>');
            }
            const imagen = pacienteBuscado.foto;
            const match = imagen.match(base64RegExp);
            const mimeType = match[1];
            const data = match[2];
            const imgStream = Buffer.from(data, 'base64');

            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': imgStream.length
            });
            res.end(imgStream);
        } else {
            return next(404);
        }
    } catch (err) {
        return next('Paciente no encontrado');
    }
});


PacienteRouter.post('/paciente/', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:postAndes')) {
        return next(403);
    }
    const body = req.body;
    const sugeridos = await controller.suggest(body);
    if (controller.isMatchingAlto(sugeridos)) {
        throw new PatientDuplicate();
    }
    body.activo = true; // Todo paciente esta activo por defecto
    const paciente = controller.newPaciente(body);
    const pacienteCreado = await controller.storePaciente(paciente, req);
    res.json(pacienteCreado);
});


PacienteRouter.patch('/paciente', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:patchAndes')) {
        return next(403);
    }
    const id = req.params.id;
    const body = req.body;
    let paciente = await Paciente.findOne(id);
    if (paciente) {
        if (body.estado === 'validado') {
            const sugeridos = await controller.suggest(body);
            if (controller.isMatchingAlto(sugeridos)) {
                throw new PatientDuplicate();
            }
        }
        paciente = controller.updatePaciente(paciente, body);
        const updated = await controller.storePaciente(paciente, req);
        return res.json(updated);
    }
    throw new PatientNotFound();
});
