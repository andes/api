import * as express from 'express';
import { defaultLimit, maxLimit } from './../../../config';
import { tipoPrestacion } from '../schemas/tipoPrestacion';

let router = express.Router();

router.get('/tiposPrestaciones/:id*?', function (req, res, next) {
    let query;
    if (req.params.id) {
        query = tipoPrestacion.findById(req.params.id);
    } else {
        query = tipoPrestacion.find({}); // Trae todos
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
        if (req.query.turneable) {
            query.where('turneable').equals(req.query.turneable);
        }
        if (req.query.granularidad) {
            query.where('granularidad').equals(req.query.granularidad);
        }
        if (req.query.autonoma) {
            query.where('autonoma').equals(req.query.autonoma);
        }
        query.where('activo').equals(1);
        query.populate({
            path: 'tipoProblemas',
            model: 'tipoProblema'
        });
    }

    query.populate('ejecucion').sort({ 'nombre': 1 }).exec(function (err, data) {
        if (err) {
            console.log(err);
            next(err);
        };
        res.json(data);
    });
});

router.post('/tiposPrestaciones', function (req, res, next) {
    let tp = new tipoPrestacion(req.body);
    tp.save((err) => {
        if (err) {
            return next(err);
        }

        res.json(tp);
    });
});

router.put('/tiposPrestaciones/:id', function (req, res, next) {
    tipoPrestacion.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/tiposPrestaciones/:id', function (req, res, next) {
    tipoPrestacion.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
