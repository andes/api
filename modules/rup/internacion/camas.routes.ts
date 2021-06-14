import * as express from 'express';
import * as CamasController from './camas.controller';
import * as SalaComunController from './sala-comun/sala-comun.controller';
import { asyncHandler, Request, Response } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';
import moment = require('moment');
import { Types } from 'mongoose';
import { CamaEstados } from './cama-estados.schema';

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

router.get('/integrity-check-camas', Auth.authenticate(), asyncHandler(async (req: Request, res: Response, next) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const ambito = req.query.ambito;
    const capa = req.query.capa;
    const cama = req.query.cama;
    const from = req.query.desde;
    const to = req.query.hasta;

    const listaInconsistencias = await CamasController.integrityCheck({ organizacion, ambito, capa }, { cama, from, to });
    return res.json(listaInconsistencias);
}));

router.post('/camas', Auth.authenticate(), asyncHandler(async (req: Request, res: Response) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };

    const data = { ...req.body, organizacion };

    const result = await CamasController.store(data, req);

    res.json(result);
}));

// Solo estadistico por ahora!
router.patch('/camas/changeTime/:id', Auth.authenticate(), capaMiddleware, async (req, res, next) => {
    try {
        const organizacion = {
            _id: Auth.getOrganization(req),
            nombre: Auth.getOrganization(req, 'nombre')
        };
        let idCama = req.params.id;
        let capa = req.body.capa;
        let ambito = req.body.ambito;
        let fecha = new Date(req.body.fechaActualizar);
        let nuevafecha = new Date(req.body.nuevaFecha);
        let idInternacion = req.body.idInternacion;

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

router.patch('/camas/:id', Auth.authenticate(), capaMiddleware, asyncHandler(async (req: Request, res: Response, next) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };

    const data = { ...req.body, organizacion, id: req.params.id };

    const result = await CamasController.patch(data, req);

    if (result) {
        return res.json(result);
    } else {
        return next('No se puede realizar el movimiento');
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

    const result = await CamasController.patch(data, req);

    return res.json(result);
}));

export const CamasRouter = router;

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
