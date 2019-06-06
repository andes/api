import * as express from 'express';
import { periodoPadronesProfe } from '../schemas/periodoPadronesProfe';

const router = express.Router();

/**
 * Obtiene los datos del programa Incluir Salud asociada a un paciente
 *
 * @param {any} id
 * @returns
 * @deprecated
 */
router.get('/periodoPadronesProfe/:id*?', (req, res, next) => {
    if (req.params.id) {
        periodoPadronesProfe.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        if (req.query.desde) {
            periodoPadronesProfe.find({ version: { $gte: req.query.desde } }, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        } else {
            periodoPadronesProfe.find({}, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        }
    }
});

module.exports = router;
