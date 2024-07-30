import * as express from 'express';
import { EventCore } from '@andes/event-bus';
import { sendSms, SmsOptions } from '../../../utils/roboSender/sendSms';

const router = express.Router();

router.get('/sms', async (req, res, next) => {
    const smsOptions: SmsOptions = {
        telefono: req.query.telefono,
        mensaje: req.query.mensaje
    };
    try {
        const resultado = await sendSms(smsOptions);
        return res.json(resultado);
    } catch (error) {
        return res.json('1');
    }
});

router.post('/notificacion', async (req, res, next) => {
    try {
        const body = req.body.params;
        EventCore.emitAsync(body.evento, body.dto);
        return res.json({ resultado: 1 });
    } catch (error) {
        return res.json({ resultado: 0 });
    }
});

export = router;
