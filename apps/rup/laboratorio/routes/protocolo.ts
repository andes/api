import * as express from 'express';
import { model as Organizacion } from '../../../../core/tm/schemas/organizacion';
import { getUltimoNumeroProtocolo } from '../controller/protocolo';
import { getResultadosAnteriores } from '../controller/protocolo';

let router = express.Router();

router.get('/protocolo/numero/', async (req, res, next) => {
    const ObjectId = require('mongoose').Types.ObjectId;
    let idEfector = new ObjectId(req.query.idEfector);
    let ultimoNumeroProtocolo = await getUltimoNumeroProtocolo(idEfector);
    let anio = new Date().getFullYear().toString().substr(-2);
    let prefijo;
    try {
        Organizacion.findOne(idEfector).then((organizacion: any) => {
            prefijo = organizacion.prefijosLab.prefijo;
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
    const ObjectId = require('mongoose').Types.ObjectId;
    let idPaciente = new ObjectId(req.query.idPaciente);
    let practicaConceptId = req.query.practicaConceptId;
    let resultadosAnteriores = await getResultadosAnteriores(idPaciente, practicaConceptId);

    res.json(resultadosAnteriores);
});

export = router;
