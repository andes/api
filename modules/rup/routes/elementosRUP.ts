import * as express from 'express';
import * as mongoose from 'mongoose';
import { defaultLimit, maxLimit } from './../../../config';
import { elementoRUP } from '../schemas/elementoRUP';
import { makeMongoQuery } from '../../../core/term/controller/grammar/parser';
import { textIndexModel, snomedModel, textIndexSchema } from '../../../core/term/schemas/snomed';

let router = express.Router();

/**
 * Devueve los grupos sugeridos en la busqueda guiada por prestación.
 */

router.get('/elementosRUP/:id/guiada', function (req, res, next) {
    let prestacion = req.params.id;
    elementoRUP.findOne({
        'conceptos.conceptId': prestacion
    }).then(async (elemento: any) => {

        if (elemento && elemento.busqueda_guiada && elemento.busqueda_guiada.length > 0) {

            let flag = false;
            for (let guia of elemento.busqueda_guiada) {
                if (!guia.conceptIds.length) {
                    let q = makeMongoQuery(guia.query);
                    flag = true;
                    guia.conceptIds = await snomedModel.find(q, { conceptId: 1 }).then((docs: any[]) => {
                        return docs.map(item => item.conceptId);
                    }).catch(next);
                }
            }

            res.json(elemento.busqueda_guiada);
            if (flag) {
                elemento.save();
            }

        } else {
            res.json([]);
        }

    }).catch(next);
});


router.get('/elementosRUP/:id*?', function (req, res, next) {
    let query: mongoose.DocumentQuery<any, mongoose.Document>;
    if (req.params.id) {
        query = elementoRUP.findById(req.params.id);
    } else {
        query = elementoRUP.find({}); // Trae todos
        if (req.query.skip) {
            let skip: number = parseInt(req.query.skip || 0, 10);
            query = query.skip(skip);
        }
        if (req.query.limit) {
            let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, 10), maxLimit);
            query = query.limit(limit);
        }
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        if (req.query.key) {
            query.where('key').equals(RegExp('^.*' + req.query.key + '.*$', 'i'));
        }
        if (req.query.excluir) {
            let ids = req.query.excluir.split(',');
            query.where('_id').nin(ids);
        }
        if (req.query.incluir) {
            let idsIn = req.query.incluir.split(',');
            query.where('_id').in(idsIn);
        }
        if (req.query.granularidad) {
            query.where('tipo').equals(req.query.tipo);
        }
        query.where('activo').equals(true);
    }

    // query.populate('requeridos.elementoRUP');
    query.sort({ 'nombre': 1 }).exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


export = router;
