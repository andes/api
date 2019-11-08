import * as express from 'express';
import * as CamasController from './camas.controller';
import { asyncHandler } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';
import moment = require('moment');

const router = express.Router();

router.get('/camas', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);

    const result = await CamasController.search({ organizacion, ambito: req.query.ambito, capa: req.query.capa }, req.query);

    res.json(result);
}));

router.get('/camas/:id', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);

    const result = await CamasController.findById({ organizacion, ambito: req.query.ambito, capa: req.query.capa }, req.params.id, req.query.timestamp);

    res.json(result);
}));

router.post('/camas', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const data = { ...req.body, organizacion };

    const result = await CamasController.store(data);

    res.json(result);
}));

router.patch('/camas/:id', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const data = { ...req.body, organizacion, id: req.params.id };

    const result = await CamasController.patch(data);

    res.json(result);
}));

router.delete('/camas/:id', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = {
        _id: Auth.getOrganization(req),
        nombre: Auth.getOrganization(req, 'nombre')
    };
    const estado = {
        fecha: moment().toDate(),
        estado: 'inactiva',
    };
    const data = { ...req.body, organizacion, cama: req.params.id, estado };

    const result = await CamasController.patch(data);

    res.json(result);
}));
