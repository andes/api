import * as express from 'express';
import { periodoPadronesProfe } from '../schemas/periodoPadronesProfe';

let router = express.Router();

/**
 * Obtiene los datos del programa Incluir Salud asociada a un paciente
 *
 * @param {any} id
 * @returns
 */
router.get('/periodoPadronesProfe/:id*?', function (req, res, next) {
    if (req.params.id) {
        periodoPadronesProfe.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        if (req.query.desde) {
            periodoPadronesProfe.find({ version: { $gte: req.query.desde } }, function (err, data) {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        } else {
            periodoPadronesProfe.find({}, function (err, data) {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        }
    }
});

module.exports = router;
