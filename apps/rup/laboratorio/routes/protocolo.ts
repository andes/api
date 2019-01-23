import * as express from 'express';
import { model as Organizacion } from '../../../../core/tm/schemas/organizacion';
import { model as Prestacion } from '../../../../modules/rup/schemas/prestacion';

import { getUltimoNumeroProtocolo, getResultadosAnteriores, getEjecucionesCobasC311, enviarAutoanalizador } from '../controller/protocolo';
import { Auth } from '../../../../auth/auth.class';
import { Types } from 'mongoose';


let router = express.Router();

router.get('/protocolo/numero/', async (req, res, next) => {
    const ObjectId = require('mongoose').Types.ObjectId;
    let idEfector = new ObjectId(req.query.idEfector);
    let ultimoNumeroProtocolo = await getUltimoNumeroProtocolo(idEfector);
    let anio = new Date().getFullYear().toString().substr(-2);
    let prefijo;
    try {
        Organizacion.findOne(idEfector).then((organizacion: any) => {
            prefijo = organizacion.prefijo;
            ultimoNumeroProtocolo++;
            let nuevoNumeroProtocolo = {
                numeroCompleto: ultimoNumeroProtocolo + '-' + prefijo + anio,
                numero: ultimoNumeroProtocolo
            };
            res.json(nuevoNumeroProtocolo);
        });
    } catch (e) {
        res.json(e);
    }
});

router.get('/practicas/resultadosAnteriores', async (req, res, next) => {
    let idPaciente = Types.ObjectId(req.query.idPaciente);
    let practicaConceptIds = Array.isArray(req.query.practicaConceptIds) ? req.query.practicaConceptIds : [req.query.practicaConceptIds];
    let resultadosAnteriores = await getResultadosAnteriores(idPaciente, practicaConceptIds);

    res.json(resultadosAnteriores);
});

router.get('/practicas/cobasc311', async (req, res, next) => {
    // if (!Auth.check(req, 'laboratorio:analizador:*')) {
    //     return next(403);
    // }
    let practicasCobas = await getEjecucionesCobasC311();
    res.json(practicasCobas);
});

router.get('/practicas/cobasc311/:id', async (req, res, next) => {
    Prestacion.findById(req.params.id, (err, data: any) => {
        if (err) {
            return next(err);
        }
        if (data) {
            res.json(data);
        }
    });
});

router.patch('/practicas/cobasc311/:id', async (req, res, next) => {
    // console.log('req.params:', req.params);
    // console.log('req.body:', req.body.valor.resultado);
    // console.log('req.body._id:', req.body._id);

    Prestacion.findById(req.params.id, (err, data: any) => {
        if (err) {
            return next(err);
        }
        if (data) {

            let id = new Types.ObjectId(req.body._id);
            // console.log('id:', id);
            // console.log(data.ejecucion.registros);
            let index = data.ejecucion.registros.findIndex(x => { return x._id.toString() === id.toString(); });
            // console.log('index: ', index);

            data.ejecucion.registros[index].valor = req.body.valor;
            Auth.audit(data, req);
            data.save();
            return res.json(data);
        }
    });

    // let search = { _id: req.params.id, 'ejecucion.registros._id': req.body._id };
    // let values = {
    //     $set: {
    //         'ejecucion.$.registros': req.body
    //     }
    // };
    // let options = { runValidators: false };

    // return Prestacion.findOneAndUpdate(search, values, options, (err, data: any) => {
    //     if (err) {
    //         return next(err);
    //     }
    //     if (data) {
    //         Auth.audit(data, req);
    //         data.save();
    //         return res.json(data);
    //     }
    // });
});

router.post('/practicas/autoanalizador', async (req, res, next) => {
    enviarAutoanalizador();
    return;
});


export = router;
