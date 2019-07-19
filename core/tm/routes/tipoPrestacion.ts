import * as utils from '../../../utils/utils';
import * as express from 'express';
import { tipoPrestacion } from '../schemas/tipoPrestacion';
import * as mongoose from 'mongoose';

const router = express.Router();
const ObjectId = mongoose.Types.ObjectId;

router.get('/tiposPrestaciones/:id*?', (req, res, next) => {
    let query;
    // Búsqueda por un sólo ID
    if (req.params.id) {
        query = tipoPrestacion.findById(req.params.id);
    } else {
        // Búsqueda por tem
        if (req.query.term) {
            query = tipoPrestacion.find({ term: { $regex: utils.makePattern(req.query.term) } });
        } else {
            // temporal, ya que con utils.makePattern no funciona bien en el turnero
            if (req.query.termTurnero) {
                query = tipoPrestacion.find({ term: RegExp('^.*' + req.query.termTurnero + '.*$', 'i') });
            } else {
                // Si no, devuelve todos
                query = tipoPrestacion.find({});
            }
        }
        if (req.query.limit) {
            const limit: number = Number(req.query.limit);
            query = query.limit(limit);
        }


        // Búsqueda por múltiples IDs
        if (req.query.id) {
            if (typeof req.query.id === 'string') {
                req.query.id = [req.query.id];
            }
            let objectIds = req.query.id.map(x => { return ObjectId(x); });
            query.where('_id').in(objectIds);
        }
    }

    // Consultar
    query.sort({ term: 1 }).exec((err, data) => {
        if (err) {
            return next(err);
        }
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
