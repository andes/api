import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { SeguimientoPaciente } from './schemas/seguimiento-paciente.schema';
import * as mongoose from 'mongoose';

class SeguimientoPacienteResource extends ResourceBase {
    Model = SeguimientoPaciente;
    resourceName = 'seguimientoPaciente';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fechaInicio: MongoQuery.matchDate.withField('fechaInicio'),
        paciente: (value) => {
            return {
                $or: [
                    { 'paciente.documento': MongoQuery.partialString(value) },
                    { 'paciente.nombre': MongoQuery.partialString(value) },
                    { 'paciente.apellido': MongoQuery.partialString(value) }
                ]
            };
        },
        origen: (value) => {
            return {
                $or: [
                    { 'origen.nombre': MongoQuery.partialString(value) },
                    { 'origen.tipo': MongoQuery.partialString(value) },
                    { 'origen.id ': MongoQuery.equalMatch(value) }
                ]
            };
        },
        profesional: {
            field: 'ultimaAsignacion.profesional.id',
            fn: MongoQuery.equalMatch
        },
        estado: MongoQuery.inArray.withField('ultimoEstado.clave'),
        organizacionSisa: {
            field: 'organizacion.codigoSisa',
            fn: MongoQuery.partialString
        },
        organizacionSeguimiento: {
            field: 'organizacionSeguimiento.id',
            fn: MongoQuery.equalMatch
        },
        asignados: {
            field: 'ultimaAsignacion',
            fn: (value) => (value ? { $ne: null } : { $eq: null })
        }
    };
}

const patchAsignacion = async (req, res, next) => {
    try {
        const { seguimientos, profesional } = req.body;
        const result = await SeguimientoPaciente.update(
            { _id: { $in: (seguimientos.length ? seguimientos : [seguimientos]).map(e => mongoose.Types.ObjectId(e)) } },
            {
                $push: { asignaciones: { profesional, fecha: new Date() } },
                $set: { ultimaAsignacion: { profesional, fecha: new Date() } }
            },
            { multi: true }
        );
        res.json(result);
    } catch (e) {
        next(e);
    }
};

export const SeguimientoPacienteCtr = new SeguimientoPacienteResource({});
const seguimientoPacienteRouter = SeguimientoPacienteCtr.makeRoutes();
seguimientoPacienteRouter.post('/seguimientoPaciente/asignaciones', Auth.authenticate(), asyncHandler(patchAsignacion));
export const SeguimientoPacienteRouter = seguimientoPacienteRouter;
