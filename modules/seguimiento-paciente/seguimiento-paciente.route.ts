import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { SeguimientoPaciente } from './schemas/seguimiento-paciente.schema';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
const csv = require('fast-csv');

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
        },
        score: MongoQuery.inArray.withField('score.value')
    };

    // override de update para ignorar actualizacion de seguimiento cerrado por fallecimiento
    async update(id, dto, opt) {
        const query = { _id: id, 'ultimoEstado.clave': { $ne: 'fallecido' } };
        return SeguimientoPaciente.findOneAndUpdate(query, dto, opt);
    }
}

const getListadoCsv = async (req, res, next) => {
    const listado = await SeguimientoPacienteCtr.search(req.body);
    res.set('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', 'attachment; filename=censo-mensual.csv');
    csv.write(listado, {
        headers: true, transform: (row) => {
            const ultimaAsignacion = row.asignaciones.length ? `${row.ultimaAsignacion.profesional.apellido}, ${row.ultimaAsignacion.profesional.nombre}` : '';
            const ultimoEstado = row.ultimoEstado ? `${row.ultimoEstado?.clave} | ${moment(row.ultimoEstado.valor).format('DD/MM/YYYY hh:mm')}` : '';
            return {
                Apellido: row.paciente.apellido,
                Nombre: row.paciente.nombre,
                Documento: row.paciente.documento,
                Telefono: row.paciente.telefonoActual || '',
                'Asignado a': ultimaAsignacion,
                Estado: ultimoEstado
            };
        }
    }).pipe(res);
};

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
export const SeguimientoPacienteRouter = seguimientoPacienteRouter;

seguimientoPacienteRouter.post('/seguimientoPaciente/listadoCsv', Auth.authenticate(), asyncHandler(getListadoCsv));
seguimientoPacienteRouter.post('/seguimientoPaciente/asignaciones', Auth.authenticate(), asyncHandler(patchAsignacion));
