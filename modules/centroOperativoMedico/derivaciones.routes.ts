import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Organizacion } from '../../core/tm/schemas/organizacion';
import { sendMailComprobanteDerivacion } from './controllers/com.controller';
import { Derivaciones } from './schemas/derivaciones.schema';
import moment = require('moment');

class DerivacionesResource extends ResourceBase {
    Model = Derivaciones;
    resourceName = 'derivaciones';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fecha: MongoQuery.matchDate.withField('fecha'),
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
                    { 'paciente.id': MongoQuery.equalMatch(value) },
                    { 'paciente.numeroIdentificacion': MongoQuery.partialString(value) },
                    { 'paciente.alias': MongoQuery.partialString(value) }
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

DerivacionesRouter.post('/derivaciones/:id/historial', Auth.authenticate(), async (req, res, next) => {
    try {
        const derivacion: any = await Derivaciones.findById(req.params.id);
        if (derivacion) {
            const nuevoEstado = req.body.estado;

            if (nuevoEstado.estado === 'habilitada') {
                const orgCOM = (await Organizacion.find({ esCOM: true }))[0];
                const { id, nombre, direccion } = orgCOM;
                nuevoEstado.organizacionDestino = { id, nombre, direccion };
                delete nuevoEstado.unidadDestino;
            }

            derivacion.historial.push(nuevoEstado);
            if (nuevoEstado.prioridad) {
                derivacion.prioridad = nuevoEstado.prioridad;
            }
            derivacion.dispositivo = (nuevoEstado.dispositivo) ? nuevoEstado.dispositivo : null;

            if (nuevoEstado.estado) {
                const organizacionId = Auth.getOrganization(req);
                const organizacion = await Organizacion.findById(organizacionId);

                if (!organizacion.esCOM && (derivacion.organizacionDestino.id !== organizacionId)) {
                    return next('La derivación ya no está asignada a su organización');
                }
                derivacion.estado = nuevoEstado.estado;

                const isPacienteDestino = derivacion.estado === 'finalizada' && derivacion.organizacionDestino && derivacion.organizacionDestino.id !== derivacion.organizacionOrigen.id;
                if (isPacienteDestino && organizacion.esCOM) {
                    const organizacionDestino = organizacionId !== derivacion.organizacionDestino.id ? await Organizacion.findById(derivacion.organizacionDestino.id) : null;

                    const destinatarios = [];
                    const emailDestino = organizacionDestino?.configuraciones?.emails?.find(e => e.nombre === 'comDerivacionesRecupero')?.email;
                    const emailCOM = organizacion.configuraciones?.emails?.find(e => e.nombre === 'comDerivacionesRecupero')?.email;

                    if (emailDestino) {
                        destinatarios.push(emailDestino);
                    }
                    if (emailCOM) {
                        destinatarios.push(emailCOM);
                    }

                    if (destinatarios.length) {
                        sendMailComprobanteDerivacion(derivacion, destinatarios);
                    }
                }
            }

            if (nuevoEstado.organizacionDestino) {
                derivacion.organizacionDestino = nuevoEstado.organizacionDestino;
            }

            derivacion.unidadDestino = nuevoEstado.unidadDestino;

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
