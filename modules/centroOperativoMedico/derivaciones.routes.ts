import { MongoQuery, ResourceBase } from '@andes/core';
import { AndesDrive } from '@andes/drive';
import { Auth } from '../../auth/auth.class';
import { Derivaciones } from './schemas/derivaciones.schema';

class DerivacionesResource extends ResourceBase {
    Model = Derivaciones;
    resourceName = 'derivaciones';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fecha: MongoQuery.equalMatch,
        estado: MongoQuery.equalMatch,
        organizacionOrigen: {
            field: 'organizacionOrigen.id',
            fn: MongoQuery.equalMatch
        },
        organizacionDestino: {
            field: 'organizacionDestino.id',
            fn: MongoQuery.equalMatch
        },
        profesionalSolicitante: {
            field: 'profesionalSolicitante._id',
            fn: MongoQuery.equalMatch
        },
        tipoTraslado: {
            field: 'tipoTraslado',
            fn: (value) => {
                return { $ne: null };
            }
        },
        prioridad: MongoQuery.equalMatch,
        paciente: (value) => {
            return {
                $or: [
                    { 'paciente.documento': MongoQuery.partialString(value) },
                    { 'paciente.nombre': MongoQuery.partialString(value) },
                    { 'paciente.apellido': MongoQuery.partialString(value) },
                    { 'paciente.id': MongoQuery.equalMatch(value) }
                ]
            };
        },
        profesional: (value) => {
            return {
                $or: [
                    { 'profesional.documento': MongoQuery.partialString(value) },
                    { 'profesional.nombre': MongoQuery.partialString(value) },
                    { 'profesional.apellido': MongoQuery.partialString(value) },
                    { 'profesional.id': MongoQuery.equalMatch(value) }
                ]
            };
        },
        cancelada: MongoQuery.equalMatch,
    };
}

export const DerivacionesCtr = new DerivacionesResource({});
export const DerivacionesRouter = DerivacionesCtr.makeRoutes();

DerivacionesRouter.get('/store/:id', async (req, res, next) => {
    const fileDrive = await AndesDrive.find(req.params.id);
    if (fileDrive) {
        const stream1 = await AndesDrive.read(fileDrive);
        res.contentType(fileDrive.mimetype);
        stream1.pipe(res);
    }
});

DerivacionesRouter.post('/derivaciones/:id/historial', Auth.authenticate(), async (req, res, next) => {
    try {
        const derivacion: any = await Derivaciones.findById(req.params.id);
        if (derivacion) {
            const nuevoEstado = req.body.estado;
            derivacion.historial.push(nuevoEstado);
            if (nuevoEstado.prioridad) {
                derivacion.prioridad = nuevoEstado.prioridad;
            }
            if (nuevoEstado.estado) {
                derivacion.estado = nuevoEstado.estado;
            }
            if (nuevoEstado.organizacionDestino) {
                derivacion.organizacionDestino = nuevoEstado.organizacionDestino;
            }

            if (req.body.trasladoEspecial) {
                derivacion.organizacionTraslado = req.body.trasladoEspecial.organizacionTraslado;
                derivacion.tipoTraslado = req.body.trasladoEspecial.tipoTraslado;
            }
            Auth.audit(derivacion, req);
            await derivacion.save();
            return res.json(derivacion);
        }
    } catch (err) {
        return next(err);
    }
});
