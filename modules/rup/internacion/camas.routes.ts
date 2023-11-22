import * as express from 'express';
import * as CamasController from './camas.controller';
import * as SalaComunController from './sala-comun/sala-comun.controller';
import { asyncHandler, Request, Response } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';
import moment = require('moment');
import { Types } from 'mongoose';
import { CamaEstados } from './cama-estados.schema';
import * as CamasEstadosController from './cama-estados.controller';
import { Camas } from './camas.schema';

const router = express.Router();

const capaMiddleware = (req: Request, res: Response, next: express.NextFunction) => {
    if (req.query?.capa && req.query.capa !== 'estadistica') {
        req.query.capa = 'medica';
    }
    if (req.body?.capa && req.body.capa !== 'estadistica') {
        req.body.capa = 'medica';
    }
    next();
};

router.get('/camas', Auth.authenticate(), capaMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const { capa, fecha } = req.query;

    let salas = [];
    if (capa !== 'estadistica' && !req.query.cama && !req.query.idInternacion) {
        salas = await SalaComunController.listarSalaComun({
            organizacion: organizacion._id,
            fecha: moment(fecha).toDate(),
            ambito: req.query.ambito
        });
        salas = populateSalaComun(salas);
    }

    const camas = await CamasController.search({ organizacion, capa: req.query.capa, ambito: req.query.ambito, }, req.query);

    const result = [...camas, ...salas];

    res.json(result);
}));

router.get('/camas/historial', Auth.authenticate(), capaMiddleware, asyncHandler(async (req: Request, res: Response, next) => {
    const organizacion = Auth.getOrganization(req);
    const ambito = req.query.ambito;
    const capa = req.query.capa;
    const cama = req.query.idCama;
    const internacion = req.query.idInternacion;
    const desde = req.query.desde;
    const hasta = req.query.hasta;
    const esMovimiento = req.query.esMovimiento;

    const result = await CamasController.historial({ organizacion, ambito, capa }, cama, internacion, desde, hasta, esMovimiento);
    return res.json(result);
}));


router.get('/lista-espera', Auth.authenticate(), asyncHandler(async (req: Request, res: Response, next) => {
    const organizacion = Auth.getOrganization(req);
    const ambito = req.query.ambito;
    const capa = req.query.capa;
    const fecha = req.query.fecha;

    const listaEspera = await CamasController.listaEspera({ fecha, organizacion: { _id: organizacion }, ambito, capa });
    return res.json(listaEspera);
}));


router.get('/camas/:id', Auth.authenticate(), capaMiddleware, asyncHandler(async (req: Request, res: Response, next) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };

    const result = await CamasController.findById({ organizacion, ambito: req.query.ambito, capa: req.query.capa }, req.params.id, req.query.fecha);

    if (result) {
        return res.json(result);
    } else {
        return next('No se encontró la cama');
    }
}));


/** Crea un nuevo objeto cama y tambien sus estados según las capas que tenga habilitadas el efector */
router.post('/camas', Auth.authenticate(), asyncHandler(async (req: Request, res: Response, next) => {
    try {
        const organizacion = {
            _id: Auth.getOrganization(req),
            nombre: Auth.getOrganization(req, 'nombre')
        };
        const data = {
            organizacion,
            ...req.body
        };
        let nuevaCama: any = new Camas({
            organizacion,
            ambito: data.ambito,
            unidadOrganizativaOriginal: data.unidadOrganizativa,
            sectores: data.sectores,
            nombre: data.nombre,
            tipoCama: data.tipoCama,
        });
        nuevaCama.audit(req);
        nuevaCama = await nuevaCama.save();
        data._id = nuevaCama._id;
        await CamasController.storeEstados(data, req);
        return res.json(nuevaCama);
    } catch (err) {
        return next('Ocurrió un error guardando la cama');
    }
}));

// Edita un objeto cama (No sus estados)
router.patch('/camas/:id', Auth.authenticate(), capaMiddleware, asyncHandler(async (req: Request, res: Response, next) => {
    try {
        const data = req.body;
        const camaFound: any = await Camas.findById(req.params.id);
        camaFound.set(data);
        camaFound.audit(req);
        const camaUpdated = await camaFound.save();
        return res.json(camaUpdated);
    } catch (err) {
        return next('Ocurrió un error guardando la cama');
    }
}));

/** Edita los estados de una cama */
router.patch('/camaEstados/:idCama', Auth.authenticate(), capaMiddleware, asyncHandler(async (req: Request, res: Response, next) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const data = { ...req.body, organizacion, id: req.params.idCama };
    let result;

    if (req.body.op === 'prestamo-devolucion') {
        const desde = req.body.desde;
        const hasta = req.body.hasta;
        const prestamo = req.body.prestamo;
        const devolucion = req.body.devolucion;
        const capa = req.body.capa;
        const ambito = 'internacion';

        let response = true, response2, response3;
        if (req.body.movimientosIntermedios) {
            // si existen movimientos entre fechaDesde y fechaHasta, se verán afectados por el cambio (Se actualizará su unidadOrganizativa)
            const estadosAfectados = await CamasEstadosController.searchEstados({ desde, hasta, organizacion: organizacion._id, ambito, capa }, { cama: data.id });
            const fechaEstados = estadosAfectados.map(e => e.fecha);
            response = await CamasEstadosController.patch({ organizacion: organizacion._id, ambito, capa, cama: data.id }, desde, hasta, prestamo.unidadOrganizativa, fechaEstados);
        }
        if (response) {
            response2 = await CamasController.patchEstados({ ...prestamo, ambito, capa, fecha: desde, organizacion, id: data.id }, req);
            response3 = await CamasController.patchEstados({ ...devolucion, ambito, capa, fecha: hasta, organizacion, id: data.id }, req);
        }
        result = response && response2 && response3 ? true : false;
    } else {
        result = await CamasController.patchEstados(data, req);
    }
    if (result) {
        return res.json(result);
    } else {
        return next('Ocurrió un problema realizando el movimiento');
    }
}));


router.delete('/camas/:id', Auth.authenticate(), asyncHandler(async (req: Request, res: Response) => {
    if (req.body.capa !== 'estadistica' && req.body.capa !== 'medica') {
        return res.json({ status: true });
    }
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const estado = {
        fecha: moment().toDate(),
        estado: 'inactiva',
    };
    const data = { ...req.body, organizacion, cama: req.params.id, estado };
    const result = await CamasController.patchEstados(data, req);

    return res.json(result);
}));


// Solo estadistico por ahora!
router.patch('/camas/changeTime/:id', Auth.authenticate(), capaMiddleware, async (req, res, next) => {
    try {
        const organizacion = {
            _id: Auth.getOrganization(req),
            nombre: Auth.getOrganization(req, 'nombre')
        };
        const idCama = req.params.id;
        const capa = req.body.capa;
        const ambito = req.body.ambito;
        const fecha = new Date(req.body.fechaActualizar);
        const nuevafecha = new Date(req.body.nuevaFecha);
        const idInternacion = req.body.idInternacion;

        const cambiaEstado = await CamasController.changeTime(
            {
                organizacion: { _id: organizacion._id },
                capa,
                ambito
            },
            idCama,
            fecha,
            nuevafecha,
            idInternacion,
            req
        );

        if (cambiaEstado) {
            const camaActualizada = await CamasController.findById({ organizacion, capa, ambito }, idCama, nuevafecha);
            res.json(camaActualizada);

            await CamaEstados.update(
                {
                    idOrganizacion: Types.ObjectId(organizacion._id),
                    ambito,
                    capa
                },
                {
                    $set: { 'estados.$[elemento].fechaIngreso': nuevafecha }
                },
                {
                    arrayFilters: [{ 'elemento.idInternacion': Types.ObjectId(idInternacion) }],
                    multi: true
                }
            );
        } else {
            return next('No se puede realizar el cambio de estado');
        }
    } catch (err) {
        return next(err);
    }
});


/**
 * Agrega un item extra por sala para que se visualize la sala como desocupada.
 */
function populateSalaComun(salas: any[]) {
    const salasID = salas.reduce((acc, current) => {
        if (!current.paciente) { return acc; }
        return { ...acc, [String(current.id)]: current };
    }, {});

    const salasDisponibles = Object.keys(salasID).map(key => {
        const sala = salasID[key];
        return {
            ...sala,
            paciente: null,
            idInternacion: null,
            extras: null,
            prioridad: null,
            fecha: new Date(),
            fechaIngreso: undefined,
            fechaAtencion: undefined,
        };
    });
    const allSalas = [...salasDisponibles, ...salas].map(sala => {
        return {
            ...sala,
            sala: true,
            unidadOrganizativa: sala.unidadOrganizativas[0],
            estado: sala.paciente ? 'ocupada' : 'disponible'
        };
    });
    return allSalas;
}

export const CamasRouter = router;

