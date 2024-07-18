import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';
import { EventCore } from '@andes/event-bus/';
import * as moment from 'moment';
import { Auth } from '../../../../auth/auth.class';
import { IPlanIndicacionesDoc, PlanIndicaciones } from './plan-indicaciones.schema';
class PlanIndicacionesController extends ResourceBase<IPlanIndicacionesDoc> {
    Model = PlanIndicaciones;
    resourceName = 'plan-indicaciones';
    resourceModule = 'internacion';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        organizacion: {
            field: 'organizacion.id',
            fn: MongoQuery.matchString
        },
        paciente: (value) => {
            return {
                $or: [
                    { 'paciente.documento': MongoQuery.partialString(value) },
                    { 'paciente.nombre': MongoQuery.partialString(value) },
                    { 'paciente.apellido': MongoQuery.partialString(value) },
                    { 'paciente.alias': MongoQuery.partialString(value) },
                    { 'paciente.numeroIdentificacion': MongoQuery.partialString(value) }
                ]
            };
        },
        fechaInicio: MongoQuery.matchDate,
        fechaBaja: MongoQuery.matchDate,
        internacion: MongoQuery.equalMatch.withField('idInternacion'),
        prestacion: MongoQuery.equalMatch.withField('idPrestacion'),
        registro: MongoQuery.equalMatch.withField('idRegistro'),
        fechaRango: MongoQuery.matchDate.withField('fechaInicio'),
        rangoFechas: (fecha: Date) => {
            return {
                $or: [
                    { fechaInicio: { $gte: moment(fecha).startOf('day').toDate() } },
                    { fechaInicio: { $lte: moment(fecha).endOf('day').add(1, 'd').toDate() } }
                ]
            };
        },
        excluyeEstado: {
            field: 'estadoActual.tipo',
            fn: (value) => {
                return { $ne: value };
            }
        },
        delDia: () => {
            return {
                $and: [
                    { 'estadoActual.createdAt': { $gte: moment().startOf('day').toDate() } },
                    { 'estadoActual.fecha': { $gte: moment().startOf('day').toDate() } }
                ]
            };
        },
        aceptadas: () => {
            return {
                $or: [
                    { 'estadoActual.tipo': 'bypass' },
                    {
                        $and: [
                            { 'estadoActual.tipo': 'active' },
                            { 'estadoActual.verificacion.estado': 'aceptada' }
                        ]
                    }
                ]
            };
        }
    };
    eventBus = EventCore;
}

export const PlanIndicacionesCtr = new PlanIndicacionesController({});
export const PlanIndicacionesRouter = PlanIndicacionesCtr.makeRoutes();


PlanIndicacionesRouter.patch('/plan-indicaciones/:id/estado', asyncHandler(async (req, res) => {
    const indicacion = await PlanIndicacionesCtr.findById(req.params.id);
    if (indicacion) {
        const estado = req.body;
        if (estado.verificacion) {
            indicacion.estados[indicacion.estados.length - 1] = estado;
        } else {
            indicacion.estados.push(estado);
            if (req.body.continuarIndicacion) {
                indicacion.estadoActual.verificacion = undefined;
            }
        }
        Auth.audit(indicacion, req);
        const indicacionUpdated = await indicacion.save();
        EventCore.emitAsync('internacion:plan-indicaciones:update', indicacionUpdated);
        return res.json(indicacionUpdated);
    }
    throw new ResourceNotFound();
}));

