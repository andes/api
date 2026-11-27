import { asyncHandler } from '@andes/api-tool';
import { CustomError, MongoQuery, ResourceBase, ResourceForbidden } from '@andes/core';
import { Router } from 'express';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { SnomedCtr } from '../../../core/term/controller/snomed.controller';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { MapaAgendaColores } from './mapa-agenda-colores.schema';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const ALCANCES = ['global', 'organizacion', 'profesional'] as const;
const PERMISO_GLOBAL_WRITE = 'tm:mapa-agenda-colores:global:write';
const PERMISO_ORGANIZACION_WRITE = 'turnos:mapa-agenda-colores:organizacion:write';
const PERMISO_PROFESIONAL_WRITE = 'turnos:mapa-agenda-colores:profesional:write';

const PERMISOS_VER_MAPA = [
    'rup:servicio-intermedio:?',
    'rup:tipoPrestacion:?',
    'turnos:planificarAgenda:prestacion:?'
] as const;

type Alcance = typeof ALCANCES[number];

export function puedeVerMapaAgenda(req: any): boolean {
    return PERMISOS_VER_MAPA.some((pattern) => {
        const permisos = Auth.getPermissions(req, pattern);
        return Boolean(permisos && permisos.length);
    });
}

export function autorizarMutacion(req: any, document: any): boolean {
    if (!document || !document.alcance) {
        return false;
    }
    const alcance = document.alcance;
    if (alcance === 'global') {
        return Auth.check(req, PERMISO_GLOBAL_WRITE);
    }
    const sesionOrgId = idOrganizacion(req);
    const docOrgId = document.organizacion && document.organizacion._id != null
        ? String(document.organizacion._id)
        : null;
    if (!sesionOrgId || !docOrgId || sesionOrgId !== docOrgId) {
        return false;
    }
    if (alcance === 'organizacion') {
        return Auth.check(req, PERMISO_ORGANIZACION_WRITE);
    }
    if (alcance === 'profesional') {
        if (Auth.check(req, PERMISO_PROFESIONAL_WRITE)) {
            return true;
        }
        const profSesion = idProfesionalSesion(req);
        const docProfId = document.profesional && document.profesional._id != null
            ? String(document.profesional._id)
            : null;
        return Boolean(profSesion && docProfId && profSesion === docProfId);
    }
    return false;
}

function tieneEscrituraGlobal(req: any): boolean {
    return Auth.check(req, PERMISO_GLOBAL_WRITE);
}

function puedeLeerDocumento(req: any, document: any): boolean {
    if (tieneEscrituraGlobal(req)) {
        return true;
    }
    const alcance = document.alcance;
    if (alcance === 'global') {
        return true;
    }
    const sesionOrgId = idOrganizacion(req);
    const docOrgId = document.organizacion && document.organizacion._id != null
        ? String(document.organizacion._id)
        : null;
    if (!sesionOrgId || !docOrgId || sesionOrgId !== docOrgId) {
        return false;
    }
    if (alcance === 'organizacion') {
        return true;
    }
    if (alcance === 'profesional') {
        const profSesion = idProfesionalSesion(req);
        const docProfId = document.profesional && document.profesional._id != null
            ? String(document.profesional._id)
            : null;
        return Boolean(profSesion && docProfId && profSesion === docProfId);
    }
    return false;
}

function idProfesionalSesion(req: any): string | null {
    const profesional = Auth.getProfesional(req);
    if (!profesional || profesional.id == null || profesional.id === '') {
        return null;
    }
    return String(profesional.id);
}

/**
 * Reglas visibles en mapa para usuarios sin escritura global (precedencia de alcance en resolver, no en listado).
 */
function visibilidadMapaAgendaColores(req: any): { $or: any[] } {
    const orgId = idOrganizacion(req);
    const or: any[] = [{ alcance: 'global' }];
    if (orgId) {
        or.push({
            alcance: 'organizacion',
            'organizacion._id': orgId
        });
        const profId = idProfesionalSesion(req);
        if (profId) {
            or.push({
                alcance: 'profesional',
                'organizacion._id': orgId,
                'profesional._id': profId
            });
        }
    }
    return { $or: or };
}

function idOrganizacion(req: any): string | null {
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

function idSubdocumento(value: any): string {
    if (value && typeof value === 'object' && value._id) {
        return String(value._id);
    }
    if (value === undefined || value === null || value === '') {
        return '';
    }
    return String(value);
}

/**
 * Alinea organizacion/profesional con el pre-save del schema (null explícito por alcance).
 */
export function normalizeAmbitoMapaAgendaColores(alcance: Alcance, dto: any) {
    const data = { ...dto };
    if (alcance === 'global') {
        data.organizacion = null;
        data.profesional = null;
    } else if (alcance === 'organizacion') {
        data.profesional = null;
    }
    return data;
}

function normalizeColor(color: string): string {
    if (typeof color !== 'string' || !color.trim()) {
        throw new CustomError('color es obligatorio', 400);
    }
    const trimmed = color.trim();
    if (!HEX_COLOR_REGEX.test(trimmed)) {
        throw new CustomError('color debe ser un hexadecimal #RGB o #RRGGBB', 400);
    }
    return trimmed.toUpperCase();
}

function isMongoDuplicateKey(err: any): boolean {
    return Boolean(err && (err.code === 11000 || err.code === 11001));
}

class MapaAgendaColoresController extends ResourceBase {
    Model = MapaAgendaColores;
    resourceName = 'mapa-agenda-colores';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        search: (req, res, next) => {
            if (!puedeVerMapaAgenda(req)) {
                return next(403);
            }
            return next();
        },
        get: (req, res, next) => this.autorizarLecturaPorId(req, res, next),
        post: (req, res, next) => this.autorizarAlta(req, res, next),
        patch: (req, res, next) => this.autorizarMutacionPorId(req, res, next),
        delete: (req, res, next) => this.autorizarMutacionPorId(req, res, next),
        resolver: (req, res, next) => {
            if (!puedeVerMapaAgenda(req)) {
                return next(403);
            }
            return next();
        }
    };
    searchFileds = {
        conceptId: {
            field: 'concepto.conceptId',
            fn: MongoQuery.equalMatch
        },
        alcance: MongoQuery.equalMatch,
        organizacion: {
            field: 'organizacion._id',
            fn: MongoQuery.equalMatch
        },
        profesional: {
            field: 'profesional._id',
            fn: MongoQuery.equalMatch
        },
        activo: MongoQuery.equalMatch,
        term: {
            field: 'concepto.term',
            fn: MongoQuery.partialString
        },
        search: ['concepto.term', 'concepto.conceptId']
    };

    private async autorizarLecturaPorId(req, res, next) {
        if (!puedeVerMapaAgenda(req)) {
            return next(403);
        }
        try {
            const id = req.params.id;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return next(404);
            }
            const document = await this.findById(id);
            if (!document || !puedeLeerDocumento(req, document)) {
                return next(404);
            }
            return next();
        } catch (err) {
            return next(err);
        }
    }

    private async autorizarMutacionPorId(req, res, next) {
        if (!puedeVerMapaAgenda(req)) {
            return next(403);
        }
        try {
            const id = req.params.id;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return next(404);
            }
            const document = await this.findById(id);
            if (!document) {
                return next(404);
            }
            if (!autorizarMutacion(req, document)) {
                return next(new ResourceForbidden());
            }
            return next();
        } catch (err) {
            return next(err);
        }
    }

    private autorizarAlta(req, res, next) {
        if (!puedeVerMapaAgenda(req)) {
            return next(403);
        }
        const body = req.body || {};
        const alcance = body.alcance;
        if (!alcance || ALCANCES.indexOf(alcance as Alcance) === -1) {
            return next(new CustomError('alcance inválido; use global, organizacion o profesional', 400));
        }
        const documento: any = { alcance, organizacion: null, profesional: null };
        if (alcance !== 'global') {
            const orgId = idOrganizacion(req);
            if (!orgId) {
                return next(new CustomError('No hay organización en la sesión', 400));
            }
            documento.organizacion = { _id: orgId };
        }
        if (alcance === 'profesional') {
            const profId = idSubdocumento(body.profesional);
            documento.profesional = profId ? { _id: profId } : null;
        }
        if (!autorizarMutacion(req, documento)) {
            return next(new ResourceForbidden());
        }
        return next();
    }

    public async presearch(data: any, req: any) {
        if (tieneEscrituraGlobal(req)) {
            return {};
        }
        return visibilidadMapaAgendaColores(req);
    }

    /**
     * Manual: sin escritura global, ?organizacion de otra org no amplía resultados; solo global + org sesión + prof. vinculado.
     * Manual: con escritura global, ?organizacion filtra en todo el catálogo.
     * Manual: conceptId, alcance, activo, term y search acotan dentro del conjunto visible.
     */
    public async search(data: any, options: any = {}, req: any = null) {
        const query = { ...(data || {}) };
        if (!tieneEscrituraGlobal(req)) {
            delete query.organizacion;
        }
        return super.search(query, options, req);
    }

    /**
     * Resuelve color por conceptId con precedencia: profesional > organización > global.
     * Query: conceptId (opcional, uno o varios), profesional (opcional).
     * TODO v2: filtrar por servicioIntermedio cuando venga en query.
     */
    public async resolver(req: any, res: any, next: any) {
        try {
            // TODO v2: restricción por req.query.servicioIntermedio (conceptos del servicio + turneables).
            const orgId = idOrganizacion(req);
            const profQueryId = idSubdocumento(req.query.profesional);
            const conceptIdRaw = req.query.conceptId;
            const tieneFiltroConcepto = conceptIdRaw !== undefined &&
                conceptIdRaw !== null &&
                conceptIdRaw !== '' &&
                !(Array.isArray(conceptIdRaw) && conceptIdRaw.length === 0);

            const select = 'concepto.conceptId color alcance';
            const baseActivo = { activo: true };
            const conceptoClause = tieneFiltroConcepto
                ? { 'concepto.conceptId': MongoQuery.inArray(conceptIdRaw) }
                : {};

            const globalQuery = { ...baseActivo, alcance: 'global', ...conceptoClause };
            const orgQuery = orgId
                ? {
                    ...baseActivo,
                    alcance: 'organizacion',
                    'organizacion._id': orgId,
                    ...conceptoClause
                }
                : null;
            const profQuery = orgId && profQueryId
                ? {
                    ...baseActivo,
                    alcance: 'profesional',
                    'organizacion._id': orgId,
                    'profesional._id': profQueryId,
                    ...conceptoClause
                }
                : null;

            const [globals, organizacion, profesional] = await Promise.all([
                this.Model.find(globalQuery).select(select).lean(),
                orgQuery ? this.Model.find(orgQuery).select(select).lean() : [],
                profQuery ? this.Model.find(profQuery).select(select).lean() : []
            ]);

            type Origen = 'global' | 'organizacion' | 'profesional';
            const resueltos = new Map<string, { color: string; origen: Origen }>();

            const aplicar = (docs: any[], origen: Origen) => {
                docs.forEach((doc) => {
                    const conceptId = doc.concepto && doc.concepto.conceptId;
                    if (!conceptId) {
                        return;
                    }
                    resueltos.set(String(conceptId), { color: doc.color, origen });
                });
            };

            aplicar(globals, 'global');
            aplicar(organizacion, 'organizacion');
            aplicar(profesional, 'profesional');

            const respuesta = Array.from(resueltos.entries()).map(([conceptId, item]) => ({
                conceptId,
                color: item.color,
                origen: item.origen
            }));

            return res.json(respuesta);
        } catch (err) {
            return next(err);
        }
    }

    public async create(dto: any, req: any) {
        try {
            const data = await this.armarDocumento(dto, req, null);
            return await super.create(data, req);
        } catch (err) {
            this.rethrowSaveError(err);
        }
    }

    public async update(id: any, data: any, req: any) {
        try {
            const existing = await this.findById(id);
            if (!existing) {
                return null;
            }
            const payload = await this.armarActualizacion(data, req, existing);
            return await super.update(id, payload, req);
        } catch (err) {
            this.rethrowSaveError(err);
        }
    }

    private rethrowSaveError(err: any): never {
        if (err instanceof CustomError) {
            throw err;
        }
        if (isMongoDuplicateKey(err)) {
            throw new CustomError(
                'Ya existe un color asignado a este concepto SNOMED en el mismo alcance',
                400
            );
        }
        throw err;
    }

    private validarAlcance(alcance: string): Alcance {
        if (ALCANCES.indexOf(alcance as Alcance) === -1) {
            throw new CustomError('alcance inválido; use global, organizacion o profesional', 400);
        }
        return alcance as Alcance;
    }

    private validarCoherenciaAlcance(alcance: Alcance, organizacion: any, profesional: any) {
        if (alcance === 'global') {
            if (organizacion || profesional) {
                throw new CustomError('alcance global no admite organización ni profesional', 400);
            }
            return;
        }
        if (!organizacion || !organizacion._id) {
            throw new CustomError('organización es obligatoria para este alcance', 400);
        }
        if (alcance === 'organizacion' && profesional) {
            throw new CustomError('alcance organizacion no admite profesional', 400);
        }
        if (alcance === 'profesional') {
            if (!profesional || !profesional._id) {
                throw new CustomError('profesional es obligatorio para alcance profesional', 400);
            }
        }
    }

    private async resolverOrganizacion(body: any, req: any, alcance: Alcance) {
        if (alcance === 'global') {
            return null;
        }
        const sesionOrgId = idOrganizacion(req);
        if (!sesionOrgId) {
            throw new CustomError('No hay organización en la sesión', 400);
        }
        const bodyOrgId = body.organizacion ? idSubdocumento(body.organizacion) : '';
        if (bodyOrgId && bodyOrgId !== sesionOrgId) {
            throw new CustomError('La organización del body no coincide con la sesión', 400);
        }
        const org = req && req.user && req.user.organizacion;
        return {
            _id: sesionOrgId,
            nombre: org && org.nombre
        };
    }

    private async resolverProfesional(profesionalEntrada: any): Promise<any> {
        const profId = idSubdocumento(profesionalEntrada);
        if (!profId || !mongoose.Types.ObjectId.isValid(profId)) {
            throw new CustomError('profesional inválido', 400);
        }
        if (
            profesionalEntrada &&
            profesionalEntrada.nombre &&
            profesionalEntrada.apellido
        ) {
            return {
                _id: profId,
                nombre: profesionalEntrada.nombre,
                apellido: profesionalEntrada.apellido
            };
        }
        const profesional = await Profesional.findById(profId).select('nombre apellido');
        if (!profesional) {
            throw new CustomError('Profesional no encontrado', 400);
        }
        return {
            _id: profId,
            nombre: profesional.nombre,
            apellido: profesional.apellido
        };
    }

    private async resolverConcepto(conceptoEntrada: any) {
        if (!conceptoEntrada || !conceptoEntrada.conceptId) {
            throw new CustomError('concepto.conceptId es obligatorio', 400);
        }
        const conceptId = String(conceptoEntrada.conceptId).trim();
        if (!conceptId) {
            throw new CustomError('concepto.conceptId es obligatorio', 400);
        }

        let concepto = {
            conceptId,
            term: conceptoEntrada.term,
            fsn: conceptoEntrada.fsn,
            semanticTag: conceptoEntrada.semanticTag
        };

        const snomed = await SnomedCtr.getConcept(conceptId, '');
        if (!snomed) {
            throw new CustomError('conceptId SNOMED no encontrado', 400);
        }
        concepto = {
            conceptId: snomed.conceptId || conceptId,
            term: concepto.term || snomed.term,
            fsn: concepto.fsn || snomed.fsn,
            semanticTag: concepto.semanticTag || snomed.semanticTag
        };
        if (!concepto.term) {
            throw new CustomError('concepto.term es obligatorio', 400);
        }
        return concepto;
    }

    private async assertUnicidad(documento: any, excludeId?: any) {
        const organizacionId = documento.organizacion && documento.organizacion._id != null
            ? documento.organizacion._id
            : null;
        const profesionalId = documento.profesional && documento.profesional._id != null
            ? documento.profesional._id
            : null;
        const query: any = {
            'concepto.conceptId': documento.concepto.conceptId,
            alcance: documento.alcance,
            'organizacion._id': organizacionId,
            'profesional._id': profesionalId
        };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        const dup = await this.Model.findOne(query).select('_id');
        if (dup) {
            throw new CustomError(
                'Ya existe un color asignado a este concepto SNOMED en el mismo alcance',
                400
            );
        }
    }

    private async armarDocumento(body: any, req: any, excludeId: any) {
        const entrada = body || {};

        const alcance = this.validarAlcance(entrada.alcance);
        const color = normalizeColor(entrada.color);
        const concepto = await this.resolverConcepto(entrada.concepto);

        let organizacion = null;
        let profesional = null;

        if (alcance !== 'global') {
            organizacion = await this.resolverOrganizacion(entrada, req, alcance);
        }
        if (alcance === 'profesional') {
            profesional = await this.resolverProfesional(entrada.profesional);
        }

        this.validarCoherenciaAlcance(alcance, organizacion, profesional);

        const documento: any = {
            concepto,
            color,
            alcance,
            organizacion,
            profesional,
            activo: entrada.activo !== undefined ? Boolean(entrada.activo) : true
        };

        const normalizado = normalizeAmbitoMapaAgendaColores(alcance, documento);
        await this.assertUnicidad(normalizado, excludeId);
        return normalizado;
    }

    private async armarActualizacion(body: any, req: any, existing: any) {
        const entrada = body || {};
        const keys = Object.keys(entrada);
        if (!keys.length) {
            throw new CustomError('No hay campos para actualizar', 400);
        }

        const cambiaAlcance = entrada.alcance !== undefined && entrada.alcance !== existing.alcance;
        const conceptIdEntrada = entrada.concepto && entrada.concepto.conceptId;
        const cambiaConceptId = conceptIdEntrada !== undefined &&
            String(conceptIdEntrada) !== String(existing.concepto && existing.concepto.conceptId);

        const soloColorActivo = keys.every((k) => k === 'color' || k === 'activo');

        if (soloColorActivo && !cambiaAlcance && !cambiaConceptId) {
            const partial: any = {};
            if (entrada.color !== undefined) {
                partial.color = normalizeColor(entrada.color);
            }
            if (entrada.activo !== undefined) {
                partial.activo = Boolean(entrada.activo);
            }
            return partial;
        }

        if (entrada.concepto !== undefined || cambiaAlcance || entrada.profesional !== undefined || entrada.organizacion !== undefined) {
            const merged = {
                concepto: existing.concepto,
                color: existing.color,
                alcance: existing.alcance,
                organizacion: existing.organizacion,
                profesional: existing.profesional,
                activo: existing.activo,
                ...entrada
            };
            if (merged.color !== undefined) {
                merged.color = normalizeColor(merged.color);
            }
            return this.armarDocumento(merged, req, existing._id);
        }

        const patch: any = { ...entrada };
        if (patch.color !== undefined) {
            patch.color = normalizeColor(patch.color);
        }
        return patch;
    }
}

export const MapaAgendaColoresCtr = new MapaAgendaColoresController({});

/**
 * ResourceBase registra GET /:id antes que extrasRoutes en @andes/core (sin fix publicado);
 * `resolver` no es ObjectId y el middleware de get devuelve 404.
 */
function mapaAgendaColoresRouter(): Router {
    const router = Router();
    const ctr = MapaAgendaColoresCtr;
    router.get(
        `/${ctr.resourceName}/resolver`,
        ...ctr.makeMiddleware('resolver'),
        asyncHandler(ctr.resolver.bind(ctr))
    );
    router.use(ctr.makeRoutes());
    return router;
}

export const MapaAgendaColoresRouter = mapaAgendaColoresRouter();
