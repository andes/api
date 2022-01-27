import * as express from 'express';
import { EventCore } from '@andes/event-bus';
import { getConfigFacturacionAutomatica } from '../controller/facturacionAutomaticaController';

const router = express.Router();

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} conceptId
 * @returns
 */
router.get('/configFacturacionAutomatica/', async (req, res, next) => {

    const data = await getConfigFacturacionAutomatica(req.query);
    res.json(data);
});

router.post('/facturaArancelamiento', async (req, res, next) => {
    const turno = req.body;

    if (turno) {
        if (turno.financiador === 'SUMAR' || turno.financiador?.financiador === 'SUMAR') {
            EventCore.emitAsync('facturacion:factura:buscador', turno);
        } else {
            EventCore.emitAsync('facturacion:factura:recupero_financiero', turno);
        }


        res.json({ message: 'Enviado a facturación' });
    } else {
        return next('Arancelamiento sin turno');
    }
});

export = router;
