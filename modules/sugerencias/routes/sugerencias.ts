import * as mongoose from 'mongoose';
import * as express from 'express';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from './../../../../api/config.private';

// Routes
let router = express.Router();

router.post('/', function (req, res, next) {
    let body = req.body;
    let texto: any = req.body.extras;
    let data = {
        from: configPrivate.enviarMail.auth.user,
        to: configPrivate.enviarMail.auth.user,
        subject: body.subject,
        text: body.texto,
        html: ''
    };
    SendEmail.sendMail(data).then(() => res.sendStatus(200), () => res.sendStatus(500));
})

export = router