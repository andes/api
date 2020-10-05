import * as express from 'express';
import { sendSms, SmsOptions } from '../../../utils/roboSender/sendSms';

const router = express.Router();

router.get('/sms', async (req, res, next) => {
    const smsOptions: SmsOptions = {
        prefijo: req.query.prefijo,
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

export = router;
