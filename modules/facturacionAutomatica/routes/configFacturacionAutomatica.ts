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
router.get('/configFacturacionAutomatica/', async (req, res, next) => {
    const query = {};
    if ((req.query.idPrestacionEjecutada !== 'undefined') && (req.query.idPrestacionEjecutada !== 'null')) {
        query['prestacionSnomed.conceptId'] = req.query.idPrestacionEjecutada;
    }

    if (req.query.idPrestacionTurneable) {
        query['conceptosTurneables.conceptId'] = req.query.idPrestacionTurneable;
    }

    let data = await facturacionAutomaticaModel.find(query);
    res.json(data);
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
