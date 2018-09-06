import * as express from 'express';
import * as facturacionAutomaticaModel from './../schemas/configFacturacionAutomatica';

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
        query = facturacionAutomaticaModel.find({});
        query.where('snomed.conceptId').equals(req.query.conceptId);
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        return next('Parámetros incorrectos');
    }
});
export = router;
