import { MongoQuery, ResourceBase } from '@andes/core';
import { Derivaciones } from './schemas/derivaciones.schema';
import { Auth } from '../../auth/auth.class';
import { readFile, storeFile } from './controllers/comStore';

class DerivacionesResource extends ResourceBase {
    Model = Derivaciones;
    resourceName = 'derivaciones';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fecha: MongoQuery.equalMatch,
        estado: MongoQuery.equalMatch,
        organizacionOrigen: {
            field: 'organizacionOrigen._id',
            fn: MongoQuery.equalMatch
        },
        organizacionDestino: {
            field: 'organizacionDestino._id',
            fn: MongoQuery.equalMatch
        },
        profesionalSolicitante: {
            field: 'profesionalSolicitante._id',
            fn: MongoQuery.equalMatch
        },
        paciente: (value) => {
            return {
                $or: [
                    { 'paciente.documento': MongoQuery.partialString(value) },
                    { 'paciente.nombre': MongoQuery.partialString(value) },
                    { 'paciente.apellido': MongoQuery.partialString(value) }
                ]
            };
        },
        profesional: (value) => {
            return {
                $or: [
                    { 'profesional.documento': MongoQuery.partialString(value) },
                    { 'profesional.nombre': MongoQuery.partialString(value) },
                    { 'profesional.apellido': MongoQuery.partialString(value) }
                ]
            };
        },
        cancelada: MongoQuery.equalMatch,
    };
}

export const DerivacionesCtr = new DerivacionesResource({});
export const DerivacionesRouter = DerivacionesCtr.makeRoutes();

DerivacionesRouter.get('/store/:id', (req, res, next) => {
    readFile(req.params.id).then((data: any) => {
        res.contentType(data.file.contentType);
        data.stream.on('data', (data2) => {
            res.write(data2);
        });

        data.stream.on('end', () => {
            res.end();
        });
    }).catch(next);
});

DerivacionesRouter.post('/store', (req, res, next) => {
    const file = req.body.file;
    const metadata = req.body.metadata;
    storeFile(file, metadata).then((data) => {
        res.json(data);
    }).catch(next);
});
