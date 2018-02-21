import * as express from 'express';
import { sendSms, SmsOptions } from '../../../utils/roboSender/sendSms';
let router = express.Router();
let soap = require('soap');
let libxmljs = require('libxmljs');

let url = 'sms.neuquen.gov.ar';
let urlOperador = 'http://' + url + ':8080/Carrier/carrier?wsdl';
let urlNumero = 'http://' + url + ':8080/MobileOutBackup/MobileOut?wsdl';

router.get('/sms', async function (req, res, next) {

    let argsOperador = { telefono: req.query.telefono };
    let opciones = {
        ignoredNamespaces: {
            namespaces: ['ws'],
            override: true
        }
    };
    let smsOptions: SmsOptions = {
        telefono: req.query.telefono,
        mensaje: req.query.mensaje
    };
    let resultado = await sendSms(smsOptions);
    return res.json(resultado);
});

export = router;
