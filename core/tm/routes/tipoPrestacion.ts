import * as express from 'express';
import { tipoPrestacion } from '../schemas/tipoPrestacion';

let router = express.Router();

router.get('/tiposPrestaciones/:id*?', function (req, res, next) {
    let query;
    if (req.params.id) {
        query = tipoPrestacion.findById(req.params.id);
    } else {
        query = tipoPrestacion.find({}); // Trae todos

    }

    query.sort({ 'term': 1 }).exec(function (err, data) {
        if (err) {
            console.log(err);
            next(err);
        };
        res.json(data);
    });
});

// router.post('/tiposPrestaciones', function (req, res, next) {
//     let tp = new tipoPrestacion(req.body);
//     tp.save((err) => {
//         if (err) {
//             return next(err);
//         }

//         res.json(tp);
//     });
// });

// router.put('/tiposPrestaciones/:id', function (req, res, next) {
//     tipoPrestacion.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(data);
//     });
// });

// router.delete('/tiposPrestaciones/:id', function (req, res, next) {
//     tipoPrestacion.findByIdAndRemove(req.params.id, function (err, data) {
//         if (err) {
//             return next(err);
//         }

//         res.json(data);
//     });
// });

export = router;
