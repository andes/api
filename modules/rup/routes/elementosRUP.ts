import * as express from 'express';
import { defaultLimit, maxLimit } from './../../../config';
import { elementoRUP } from '../schemas/elementoRUP';

let router = express.Router();

router.get('/elementoRUP/:id*?', function (req, res, next) {
    let query;
    if (req.params.id) {
        query = elementoRUP.findById(req.params.id);
    } else {
        query = elementoRUP.find({}); // Trae todos
        let redix = 10;
        if (req.query.skip) {
            let skip: number = parseInt(req.query.skip || 0, redix);
            query = query.skip(skip);
        }

        if (req.query.limit) {
            let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, redix), maxLimit);
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
        if (req.query.autonoma) {
            query.where('autonoma').equals(req.query.autonoma);
        }
        query.where('activo').equals(1);
        
    }
    query.populate('frecuentes');
    query.populate('requeridos').sort({ 'nombre': 1 }).exec(function (err, data) {
        if (err) {
            console.log(err);
            next(err);
        };
        res.json(data);
    });
});