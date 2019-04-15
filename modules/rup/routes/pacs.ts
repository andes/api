import { model as Prestacion } from '../schemas/prestacion';
import { handleHttpRequest } from '../../../utils/requestHandler';
import { PacsServer } from '@andes/pacs-server';

import { A04Message, sendMessage, O01Message } from '../controllers/pacs.controller';


import * as express from 'express';

const router = express.Router();

/**
 * Programa un procedimiento en el PACS
 * @param {objectId} prestacionId
 * @param {object} procedimiento Elemento a ejecutar
 */

router.post('/prestaciones/pacs/programar', async (req, res, next) => {
    try {
        const prestacion: any = await Prestacion.findById(req.body.prestacionId);
        prestacion.solicitud.organizacion.nombre = 'HOSPITAL NEUQUEN';

        const a04 = await A04Message(prestacion.paciente, prestacion.solicitud.organizacion);
        const resp = await sendMessage(a04);

        // console.log(a04.charAt(a04.length - 1));
        const o01 = await O01Message(prestacion);
        const resp1 = await sendMessage(o01);
        // console.log(a04);
        // console.log('--------------');
        // console.log(resp);
        // console.log(resp1);
        return res.json(resp1);

    } catch (err) {
        return next(err);
    }
});

export = router;
