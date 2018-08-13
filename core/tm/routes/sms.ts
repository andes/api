import * as express from 'express';
import { sendSms, SmsOptions } from '../../../utils/roboSender/sendSms';

let router = express.Router();

router.get('/sms', async (req, res, next) => {
    let smsOptions: SmsOptions = {
        telefono: req.query.telefono,
        mensaje: req.query.mensaje
    };
    let resultado = await sendSms(smsOptions);
    return res.json(resultado);
});

export = router;
