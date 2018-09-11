import * as mongoose from 'mongoose';
import * as express from 'express';
import { model as Organizacion } from '../../../core/tm/schemas/organizacion';
import { getUltimoNumeroProtocolo } from '../controller/protocolo';

let router = express.Router();
let async = require('async');

router.get('/protocolo/numero/', async function (req, res, next) {
    const ObjectId = require('mongoose').Types.ObjectId;
    let idEfector = new ObjectId(req.query.idEfector);
    let ultimoNumeroProtocolo = await getUltimoNumeroProtocolo(idEfector);
    ultimoNumeroProtocolo++
    let anio = new Date().getFullYear().toString().substr(-2);
    let prefijo;

    try {
        Organizacion.findOne(idEfector).then((organizacion: any) => {
            prefijo = organizacion.prefijosLab.prefijo;
            let nuevoNumeroProtocolo = ultimoNumeroProtocolo + '-' + prefijo + anio;
            res.json(nuevoNumeroProtocolo);
        });
    } catch (e) {
        res.json(e);
    }
    
});


export = router;
