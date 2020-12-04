import * as express from 'express';
import { EventCore } from '@andes/event-bus';

let router = express.Router();

router.post('/facturaArancelamiento', async (req, res, next) => {
    let turno = req.body;

    if (turno) {
        EventCore.emitAsync('facturacion:factura:buscador', turno);

        res.json({ message: 'Enviado a facturación' });
    } else {
        return next('Arancelamiento sin turno');
    }
});

export = router;
