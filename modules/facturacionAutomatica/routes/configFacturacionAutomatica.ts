import * as express from 'express';
import * as facturacionAutomaticaModel from './../schemas/configFacturacionAutomatica';
import { EventCore } from '@andes/event-bus';

let router = express.Router();

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} conceptId
 * @returns
 */
router.get('/configFacturacionAutomatica/', (req, res, next) => {
    if (req.query.conceptId) {
        let query;
        query = facturacionAutomaticaModel.find({});
        query.where('prestacionSnomed.conceptId').equals(req.query.conceptId);
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

router.post('/facturaArancelamiento', async (req, res, next) => {
    let turno = req.body;

    if (turno) {
        EventCore.emitAsync('facturacion:factura:create', turno);
        res.json({ message: 'Enviado a facturación' });
    } else {
        return next('Arancelamiento sin turno');
    }
});

export = router;
