import { snomed } from './../../../config.private';
import { model } from './../schemas/configFacturacionAutomatica';
import * as express from 'express';
import * as mongoose from 'mongoose';

let router = express.Router();

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} conceptId
 * @returns
 */
router.get('/configFacturacionAutomatica/', async function (req, res, next) {
    if (req.query.conceptId) {
        let query;
        query = model.find({});
        query.where('snomed.conceptId').equals(req.query.conceptId);
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});
module.exports = router;
