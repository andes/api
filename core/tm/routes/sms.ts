import * as express from 'express';
import { sendSms, SmsOptions } from '../../../utils/roboSender/sendSms';

const router = express.Router();

router.get('/sms', async (req, res, next) => {
    const smsOptions: SmsOptions = {
        telefono: req.query.telefono,
        mensaje: req.query.mensaje
    };
    const resultado = await sendSms(smsOptions);
    return res.json(resultado);
});

export = router;
