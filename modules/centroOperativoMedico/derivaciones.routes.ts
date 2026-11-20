import * as mongoose from 'mongoose';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Request } from '@andes/api-tool';
import { Auth } from '../../auth/auth.class';
import { Organizacion } from '../../core/tm/schemas/organizacion';
import { updateFinanciador, updateObraSocial } from '../../core-v2/mpi/paciente/paciente.controller';
import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import { sendMailComprobanteDerivacion } from './controllers/com.controller';
import { Derivaciones } from './schemas/derivaciones.schema';
import moment = require('moment');

/**
 * Sincroniza en MPI la cobertura enviada en la derivación (null = sin obra social).
 * Cubre a cualquier cliente que modifique la obra social desde una derivación.
 */
async function sincronizarObraSocialPaciente(idPaciente: any, obraSocial: any, req: Request) {
    if (!idPaciente || obraSocial === undefined) {
        return;
    }

    const paciente: any = await PacienteCtr.findById(idPaciente);
    if (!paciente || paciente.fechaFallecimiento) {
        return;
    }

    const valorOS = obraSocial?.nombre === 'Sin obra social' ? null : obraSocial;
    const nombre = (os: any) => (os?.nombre || os?.financiador || '').toString().trim().toLowerCase();
    const principal = paciente.financiador?.[0] || null;

    if (nombre(principal) === nombre(valorOS) && (principal?.numeroAfiliado || '') === (valorOS?.numeroAfiliado || '')) {
        return;
    }

    const financiadoresBase = await updateObraSocial(paciente);
    let financiador: any[];
    if (valorOS) {
        financiador = updateFinanciador(financiadoresBase, valorOS);
        const index = financiador.findIndex(f => nombre(f) === nombre(valorOS));
        if (index !== -1) {
            const [elegido] = financiador.splice(index, 1);
            financiador.unshift(elegido);
        }
    } else {
        financiador = financiadoresBase.filter(f => f?.origen !== 'ANDES');
    }

    await PacienteCtr.update(paciente.id, { financiador }, req);
}

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
        estrategiaAtencion: {
            field: 'estrategiaAtencion.id',
            fn: (value) => {
                if (!value || value === 'null') {
                    return {
                        $or: [
                            { estrategiaAtencion: null },
                            { estrategiaAtencion: { $exists: false } },
                            { 'estrategiaAtencion.id': { $exists: false } },
                            { 'estrategiaAtencion.id': null }
                        ]
                    };
                }
                return value;
            }
        },

        ambito: (value) => {
            if (!value || value === 'sin-ambito') {
                return {
                    $or: [
                        { ambito: null },
                        { ambito: { $exists: false } },
                        { ambito: '' }
                    ]
                };
            }
            const variantes = {
                internacion: ['internacion', 'Internación', 'Internacion', 'INTERNACIÓN'],
                guardia: ['guardia', 'Guardia', 'GUARDIA']
            };
            return { $in: variantes[value] || [value] };
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
        rangoEtario: (value) => {
            const limiteDate = moment().subtract(14, 'years').toDate();
            const limiteString = moment().subtract(14, 'years').toISOString();
            if (value === 'pediatrico') {
                return {
                    $or: [
                        { 'paciente.fechaNacimiento': { $gt: limiteDate } },
                        { 'paciente.fechaNacimiento': { $gt: limiteString } }
                    ]
                };
            } else if (value === 'adultos') {
                return {
                    $or: [
                        { 'paciente.fechaNacimiento': { $lte: limiteDate } },
                        { 'paciente.fechaNacimiento': { $lte: limiteString } }
                    ]
                };
            }
            return {};
        }
    };

    public async create(dto: any, req: Request) {
        if (dto?.paciente?.obraSocial !== undefined) {
            await sincronizarObraSocialPaciente(dto.paciente.id, dto.paciente.obraSocial, req);
        }
        return super.create(dto, req);
    }
}

export const DerivacionesCtr = new DerivacionesResource({});
export const DerivacionesRouter = DerivacionesCtr.makeRoutes();

DerivacionesRouter.post('/derivaciones/:id/historial', Auth.authenticate(), async (req, res, next) => {
    try {
        const derivacion: any = await Derivaciones.findById(req.params.id);
        if (derivacion) {
            const nuevoEstado = req.body.estado;

            if (nuevoEstado.obraSocial !== undefined) {
                await sincronizarObraSocialPaciente(derivacion.paciente?.id, nuevoEstado.obraSocial, req as Request);
                derivacion.paciente.obraSocial = nuevoEstado.obraSocial;
                derivacion.markModified('paciente');
            }

            if (nuevoEstado.estado === 'habilitada') {
                const orgCOM = (await Organizacion.find({ esCOM: true }))[0];
                const { id, nombre, direccion } = orgCOM;
                nuevoEstado.organizacionDestino = { id, nombre, direccion };
                delete nuevoEstado.unidadDestino;
            }
            if (nuevoEstado.estado === 'rechazada') {
                const orgCOM = await Organizacion.findOne({ esCOM: true });
                if (orgCOM) {
                    const { id, nombre, direccion } = orgCOM;
                    nuevoEstado.organizacionDestino = { id, nombre, direccion };
                    delete nuevoEstado.unidadDestino;
                }
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
