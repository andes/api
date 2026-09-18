import { asyncHandler, Request, Response } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Agenda } from './schemas/agenda';
import { listaEspera } from './schemas/listaEspera';
import {
    agregarDemanda,
    armarTurnoResolucion,
    buscarListaEspera,
    buscarTurnoFuturoExistente,
    procesarOperacionAgenda,
} from './listaEspera.controller';

/**
 * Resource base de listaEspera (demanda insatisfecha).
 *
 * La mayoría de los verbos tienen reglas de negocio propias (ver más abajo),
 * por eso sólo se habilita 'delete' con el comportamiento por default de
 * ResourceBase. El resto de las rutas se agregan manualmente sobre el
 * router, siguiendo el mismo patrón que paciente.routes.ts.
 */
class ListaEsperaResource extends ResourceBase {
    Model = listaEspera;
    resourceName = 'listaEspera';
    middlewares = [Auth.authenticate()];
    routesEnable = ['delete'];
    // NOTA: dejo estos dos por si en algún momento se quiere exponer un
    // listado simple sin el aggregate (ej. para otros consumidores internos).
    // El GET principal sigue siendo un aggregate custom (ver `get` abajo)
    // porque necesita el $lookup a paciente, $elemMatch sobre demandas, etc.
    searchFileds = {
        conceptId: MongoQuery.equalMatch.withField('tipoPrestacion.conceptId'),
        estado: MongoQuery.equalMatch,
    };
}

export const ListaEsperaCtr = new ListaEsperaResource({});
export const ListaEsperaRouter = ListaEsperaCtr.makeRoutes();

/**
 * @api {get} /listaEspera/:id Obtiene un registro de lista de espera por id
 */
export const find = async (req: Request, res: Response) => {
    const data = await listaEspera.findById(req.params.id);
    return res.json(data);
};

/**
 * @api {get} /listaEspera Búsqueda de demanda insatisfecha (lista de espera)
 */
export const get = async (req: Request, res: Response) => {
    const data = await buscarListaEspera(req);
    return res.json(data);
};

/**
 * @api {post} /listaEspera Carga de demanda insatisfecha
 *
 * Regla de negocio: si el paciente ya tiene un turno futuro asignado para
 * la misma prestación, no se permite cargar la demanda.
 */
export const post = async (req: Request, res: Response, next) => {
    try {
        const turnoExistente = await buscarTurnoFuturoExistente(req);
        if (turnoExistente) {
            // si existe un turno a futuro, no se debería poder cargar la demanda insatisfecha
            return res.status(422).json({ code: 'turno_existente', data: turnoExistente });
        }

        const listaSaved = await agregarDemanda(req);
        return res.json({ data: { listado: listaSaved } });
    } catch (error) {
        return next(error);
    }
};

/**
 * @api {put} /listaEspera/:id Actualización completa de un registro
 */
export const put = async (req: Request, res: Response, next) => {
    const data: any = await listaEspera.findById(req.params.id);
    if (!data) {
        return next(new Error('No se ha encontrado el registro.'));
    }
    data.set(req.body);
    const updated = await ListaEsperaCtr.update(data._id, data, req);
    return res.json(updated);
};

/**
 * @api {patch} /listaEspera/:id/:datoMod Actualización parcial por sub-recurso
 *
 * `:datoMod` indica qué porción del documento se está modificando:
 * demandas | estado | llamados
 */
export const patch = async (req: Request, res: Response, next) => {
    const data: any = await listaEspera.findById(req.params.id).exec();
    if (!data) {
        return next(new Error('No se ha encontrado el registro.'));
    }

    const datoMod = req.params.datoMod;
    try {
        if (datoMod === 'demandas') {
            data.demandas = req.body;
        } else if (datoMod === 'estado') {
            data.estado = req.body.estado;
            data.resolucion = {
                fecha: req.body.fecha,
                motivo: req.body.motivo,
            };
            if (req.body.observacion) {
                data.resolucion.observacion = req.body.observacion;
            }
            if (req.body.turno) {
                data.resolucion.turno = await armarTurnoResolucion(req.body.turno.idAgenda, req.body.turno.id);
            }
        } else if (datoMod === 'llamados') {
            data.llamados = req.body;
        }
    } catch (error) {
        return next(error);
    }

    const updated = await ListaEsperaCtr.update(data._id, data, req);
    return res.json(updated);
};

/**
 * @api {post} /listaEspera/IdAgenda/:id
 * Envío masivo a lista de espera de los pacientes de una agenda suspendida.
 */
export const postIdAgenda = async (req: Request, res: Response, next) => {
    const agenda: any = await Agenda.findById(req.params.id);
    if (!agenda) {
        return next(new Error('No se ha encontrado la agenda.'));
    }

    await procesarOperacionAgenda(req, agenda);
    return res.json(agenda);
};

ListaEsperaRouter.use(Auth.authenticate());
ListaEsperaRouter.get('/listaEspera', asyncHandler(get));
ListaEsperaRouter.get('/listaEspera/:id', asyncHandler(find));
ListaEsperaRouter.post('/listaEspera', asyncHandler(post));
ListaEsperaRouter.put('/listaEspera/:id', asyncHandler(put));
ListaEsperaRouter.patch('/listaEspera/:id/:datoMod', asyncHandler(patch));
ListaEsperaRouter.post('/listaEspera/IdAgenda/:id', asyncHandler(postIdAgenda));
