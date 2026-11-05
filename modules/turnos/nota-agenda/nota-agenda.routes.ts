import { CustomError, MongoQuery, ResourceBase, ResourceForbidden, ResourceNotFound } from '@andes/core';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { ServicionIntermedioCtr } from '../../../core/tm/servicio-intermedio.routes';
import { NotaAgenda } from './nota-agenda.schema';

const PERMISO_SERVICIO = 'rup:servicio-intermedio:';

function idOrganizacion(req: any): string {
    const porId = Auth.getOrganization(req);
    if (porId) {
        return String(porId);
    }
    const org = req && req.user && req.user.organizacion;
    if (org && org._id) {
        return String(org._id);
    }
    return null;
}

function idServicio(value: any): string {
    if (Array.isArray(value)) {
        return value.length === 1 ? idServicio(value[0]) : '';
    }
    if (value && typeof value === 'object') {
        return value._id ? String(value._id) : '';
    }
    if (value === undefined || value === null || value === '') {
        return '';
    }
    return String(value);
}

class NotaAgendaController extends ResourceBase {
    Model = NotaAgenda;
    resourceName = 'notas-agenda';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fecha: MongoQuery.matchDate,
        servicioIntermedio: {
            field: 'servicioIntermedio._id',
            fn: MongoQuery.inArray
        },
        organizacion: {
            field: 'organizacion._id',
            fn: MongoQuery.equalMatch
        }
    };
    routesAuthorization = {
        get: (req, res, next) => this.autorizarNota(req, res, next),
        patch: (req, res, next) => this.autorizarNota(req, res, next),
        delete: (req, res, next) => this.autorizarNota(req, res, next)
    };

    public async search(data: any, options: any = {}, req: any = null) {
        const query = { ...(data || {}) };
        query.organizacion = idOrganizacion(req);

        if (query.servicioIntermedio) {
            const servicioId = idServicio(query.servicioIntermedio);
            await this.servicioPermitido(servicioId, req);
            query.servicioIntermedio = servicioId;
        } else {
            delete query.servicioIntermedio;
            const permisos = Auth.getPermissions(req, 'rup:servicio-intermedio:?');
            if (!permisos || !permisos.length) {
                return [];
            }
            if (permisos.indexOf('*') === -1) {
                query.servicioIntermedio = permisos;
            }
        }

        return super.search(query, options, req);
    }

    public async create(dto: any, req: any) {
        const nota = await this.armarNota(dto, req);
        return super.create(nota, req);
    }

    public async update(id: any, data: any, req: any) {
        const nota = await this.armarNota(data, req);
        return super.update(id, nota, req);
    }

    private async servicioPermitido(servicioId: string, req: any) {
        if (!mongoose.Types.ObjectId.isValid(servicioId)) {
            throw new ResourceNotFound();
        }
        if (!Auth.check(req, `${PERMISO_SERVICIO}${servicioId}`)) {
            throw new ResourceForbidden();
        }
        const servicios = await ServicionIntermedioCtr.search({ ids: [servicioId] });
        if (!servicios || !servicios.length) {
            throw new ResourceNotFound();
        }
        return servicios[0];
    }

    private puedeAcceder(document: any, req: any): boolean {
        const sesionId = idOrganizacion(req);
        const docOrg = document.organizacion && document.organizacion._id;
        if (!sesionId || docOrg == null || String(docOrg) !== sesionId) {
            return false;
        }
        const servicioId = idServicio(document.servicioIntermedio);
        if (!servicioId || !mongoose.Types.ObjectId.isValid(servicioId)) {
            return false;
        }
        return Auth.check(req, `${PERMISO_SERVICIO}${servicioId}`);
    }

    private async autorizarNota(req, res, next) {
        try {
            const id = req.params.id;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return next(404);
            }
            const document = await this.findById(id);
            if (!document || !this.puedeAcceder(document, req)) {
                return next(404);
            }
            return next();
        } catch (err) {
            return next(err);
        }
    }

    private async armarNota(body: any, req: any) {
        const textoEntrada = body && body.texto;
        const fecha = body && body.fecha;
        const horaInicio = body && body.horaInicio;
        const horaFin = body && body.horaFin;
        const servicioIntermedio = body && body.servicioIntermedio;

        if (typeof textoEntrada !== 'string' || !fecha || !horaInicio || !horaFin || !servicioIntermedio) {
            throw new CustomError('Faltan datos obligatorios', 400);
        }

        const servicio = await this.servicioPermitido(idServicio(servicioIntermedio), req);

        const orgId = idOrganizacion(req);
        const org = req && req.user && req.user.organizacion;
        if (!orgId) {
            throw new CustomError('No hay organización en la sesión', 400);
        }

        const dia = moment(fecha);
        const inicio = moment(horaInicio);
        const fin = moment(horaFin);
        if (!fin.isAfter(inicio)) {
            throw new CustomError('La hora de fin debe ser posterior a la hora de inicio', 400);
        }
        if (!dia.isSame(inicio, 'day') || !dia.isSame(fin, 'day')) {
            throw new CustomError('La fecha, la hora de inicio y la hora de fin deben ser el mismo día', 400);
        }

        const texto = textoEntrada.trim();
        if (!texto) {
            throw new CustomError('El texto es obligatorio', 400);
        }
        if (texto.length > 500) {
            throw new CustomError('El texto no puede superar los 500 caracteres', 400);
        }

        return {
            texto,
            fecha: moment(fecha).startOf('day').toDate(),
            horaInicio: inicio.toDate(),
            horaFin: fin.toDate(),
            servicioIntermedio: {
                _id: servicio._id,
                nombre: servicio.nombre
            },
            organizacion: {
                _id: orgId,
                nombre: org && org.nombre
            }
        };
    }
}

export const NotaAgendaCtr = new NotaAgendaController({});
export const NotaAgendaRouter = NotaAgendaCtr.makeRoutes();
