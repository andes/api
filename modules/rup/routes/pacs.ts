import { model as Prestacion } from '../schemas/prestacion';

import { sendMessage, getPacsConfig, ADT04Message, ORM04Message, ORU01Message } from '../controllers/pacs.controller';


import * as express from 'express';

const router = express.Router();

/**
 * Programa un procedimiento en el PACS
 * @param {objectId} prestacionId
 * @param {object} procedimiento Elemento a ejecutar
 */

router.post('/prestaciones/pacs/programar', async (req, res, next) => {
    try {
        const prestacionId = req.body.prestacionId;
        const conceptId = req.body.conceptId;
        const term = req.body.term;

        const prestacion: any = await Prestacion.findById(prestacionId);

        const config = await getPacsConfig(prestacion.solicitud.organizacion, conceptId);

        const a04 = await ADT04Message(config, prestacion.paciente, prestacion.solicitud.organizacion);
        const resp = await sendMessage(config, a04);

        const o01 = await ORM04Message(config, prestacion, { conceptId, term });
        const resp1 = await sendMessage(config, o01);


        // const r01 = await r01Message(prestacion);
        // const resp2 = await sendMessage(config, r01);

        // console.log(a04);
        // console.log('------------');
        // console.log(o01);

        return res.json(resp1);

    } catch (err) {
        return next(err);
    }
});

router.post('/prestaciones/pacs/informar', async (req, res, next) => {
    try {
        const prestacionId = req.body.prestacionId;
        const registroId = req.body.registroId;

        const prestacion: any = await Prestacion.findById(prestacionId);
        const registro = prestacion.ejecucion.registros.id(registroId);

        const config = await getPacsConfig(prestacion.solicitud.organizacion, registro.concepto.conceptId);

        const r01 = await ORU01Message(config, prestacion, registro);
        // console.log(r01);
        const resp = await sendMessage(config, r01);

        return res.json(resp);

    } catch (err) {
        return next(err);
    }
});

export = router;
