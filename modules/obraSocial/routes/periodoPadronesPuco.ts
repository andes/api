import * as express from 'express';
import { periodoPadronesPuco } from '../schemas/periodoPadronesPuco';

const router = express.Router();

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} id
 * @returns
 * @deprecated
 */
router.get('/periodoPadronesPuco/:id*?', (req, res, next) => {
    if (req.params.id) {
        periodoPadronesPuco.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        if (req.query.desde) {
            periodoPadronesPuco.find({ version: { $gte: req.query.desde } }, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        } else {
            periodoPadronesPuco.find({}, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
        }
    }
});

module.exports = router;
